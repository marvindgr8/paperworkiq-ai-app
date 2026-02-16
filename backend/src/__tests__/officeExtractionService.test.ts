import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { extractTextFromOfficeBuffer } from "../services/officeExtractionService.js";

const buildZipBuffer = (entries: Record<string, string>) => {
  const payload = JSON.stringify(entries);
  const base64 = execFileSync(
    "python3",
    [
      "-c",
      [
        "import base64, io, json, sys, zipfile",
        "entries = json.loads(sys.argv[1])",
        "buf = io.BytesIO()",
        "with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as zf:",
        "  for path, content in entries.items():",
        "    zf.writestr(path, content)",
        "print(base64.b64encode(buf.getvalue()).decode('ascii'))",
      ].join("\n"),
      payload,
    ],
    { encoding: "utf-8" },
  ).trim();

  return Buffer.from(base64, "base64");
};

describe("extractTextFromOfficeBuffer", () => {
  it("extracts text from DOCX buffers", async () => {
    const docxBuffer = buildZipBuffer({
      "word/document.xml":
        '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello DOCX</w:t></w:r></w:p><w:p><w:r><w:t>Second line</w:t></w:r></w:p></w:body></w:document>',
    });

    const result = await extractTextFromOfficeBuffer({
      buffer: docxBuffer,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(result.text).toContain("Hello DOCX");
    expect(result.text).toContain("Second line");
    expect(result.pages.length).toBe(1);
  });

  it("extracts sheet text from XLSX buffers", async () => {
    const xlsxBuffer = buildZipBuffer({
      "xl/workbook.xml":
        '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Bills" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels":
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/worksheets/sheet1.xml":
        '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Item</t></is></c><c r="B1" t="inlineStr"><is><t>Amount</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Rent</t></is></c><c r="B2"><v>1200</v></c></row></sheetData></worksheet>',
    });

    const result = await extractTextFromOfficeBuffer({
      buffer: xlsxBuffer,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    expect(result.text).toContain("[Bills]");
    expect(result.text).toContain("Rent");
    expect(result.text).toContain("1200");
    expect(result.pages.length).toBe(1);
  });
});
