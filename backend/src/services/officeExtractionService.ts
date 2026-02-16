import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

type OfficeExtractionInput = {
  buffer: Buffer;
  mimeType: string | null;
};

type OfficeExtractionResult = {
  text: string;
  pages: string[];
};

const normalizeText = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\t ]+\n/g, "\n")
    .trim();

const extractOpenXmlTextWithPython = async (filePath: string, mode: "docx" | "xlsx") => {
  const script = String.raw`
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

path = sys.argv[1]
mode = sys.argv[2]

NS = {
  "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  "s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
}


def collapse(text: str) -> str:
  text = text.replace("\r\n", "\n").replace("\x00", "")
  text = re.sub(r"[\t ]+\n", "\n", text)
  text = re.sub(r"\n{3,}", "\n\n", text)
  return text.strip()


pages = []

with zipfile.ZipFile(path) as zf:
  if mode == "docx":
    document_xml = zf.read("word/document.xml")
    root = ET.fromstring(document_xml)
    paragraphs = []

    for para in root.findall(".//w:p", NS):
      parts = []
      for text_node in para.findall(".//w:t", NS):
        if text_node.text:
          parts.append(text_node.text)
      if parts:
        paragraphs.append("".join(parts))

    text = collapse("\n".join(paragraphs))
    if text:
      pages = [text]

  elif mode == "xlsx":
    shared_strings = []
    if "xl/sharedStrings.xml" in zf.namelist():
      sst_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
      for si in sst_root.findall(".//s:si", NS):
        chunks = []
        for tnode in si.findall(".//s:t", NS):
          if tnode.text:
            chunks.append(tnode.text)
        shared_strings.append("".join(chunks))

    workbook_root = ET.fromstring(zf.read("xl/workbook.xml"))
    rel_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))

    rel_map = {}
    for rel in rel_root.findall("{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"):
      rel_id = rel.attrib.get("Id")
      target = rel.attrib.get("Target")
      if rel_id and target:
        rel_map[rel_id] = target

    sheet_parts = []
    for sheet in workbook_root.findall(".//s:sheets/s:sheet", NS):
      name = sheet.attrib.get("name", "Sheet")
      rel_id = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
      if not rel_id or rel_id not in rel_map:
        continue

      target = rel_map[rel_id]
      if not target.startswith("worksheets/"):
        continue

      sheet_path = f"xl/{target}"
      sheet_root = ET.fromstring(zf.read(sheet_path))
      rows = []
      for row in sheet_root.findall(".//s:sheetData/s:row", NS):
        cells = []
        for cell in row.findall("s:c", NS):
          value_text = ""
          cell_type = cell.attrib.get("t")
          value_node = cell.find("s:v", NS)
          inline_node = cell.find("s:is/s:t", NS)
          if cell_type == "s" and value_node is not None and value_node.text:
            idx = int(value_node.text)
            if 0 <= idx < len(shared_strings):
              value_text = shared_strings[idx]
          elif inline_node is not None and inline_node.text:
            value_text = inline_node.text
          elif value_node is not None and value_node.text:
            value_text = value_node.text
          cells.append(value_text)

        if any(cell.strip() for cell in cells):
          rows.append("\t".join(cells))

      body = collapse("\n".join(rows))
      if body:
        sheet_parts.append(f"[{name}]\n{body}")

    workbook_text = collapse("\n\n".join(sheet_parts))
    if workbook_text:
      pages = [workbook_text]

print(json.dumps({"pages": pages}))
`;

  const { stdout } = await execFileAsync("python3", ["-c", script, filePath, mode], {
    maxBuffer: 10 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout) as { pages?: unknown };
  const pages = Array.isArray(parsed.pages)
    ? parsed.pages.filter((value): value is string => typeof value === "string")
    : [];
  const text = normalizeText(pages.join("\n\n"));
  return { text, pages };
};

const extractBinaryOfficeText = async (filePath: string) => {
  const { stdout } = await execFileAsync("strings", ["-n", "4", filePath], {
    maxBuffer: 10 * 1024 * 1024,
  });
  const text = normalizeText(stdout);
  const pages = text ? [text] : [];
  return { text, pages };
};

export const extractTextFromOfficeBuffer = async ({
  buffer,
  mimeType,
}: OfficeExtractionInput): Promise<OfficeExtractionResult> => {
  if (!mimeType) {
    return { text: "", pages: [] };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "paperworkiq-office-"));
  const filePath = path.join(tmpDir, `${randomUUID()}.bin`);

  try {
    await fs.writeFile(filePath, buffer);

    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return await extractOpenXmlTextWithPython(filePath, "docx");
    }

    if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return await extractOpenXmlTextWithPython(filePath, "xlsx");
    }

    if (mimeType === "application/msword" || mimeType === "application/vnd.ms-excel") {
      return await extractBinaryOfficeText(filePath);
    }

    return { text: "", pages: [] };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};
