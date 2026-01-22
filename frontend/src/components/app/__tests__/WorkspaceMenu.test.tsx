import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import WorkspaceMenu from "@/components/app/WorkspaceMenu";
import { signOut } from "@/lib/auth";

const navigateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const renderMenu = () =>
  render(
    <MemoryRouter>
      <WorkspaceMenu />
    </MemoryRouter>
  );

describe("WorkspaceMenu", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("opens and closes the menu", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /workspace menu/i }));
    expect(screen.getByText("Personal workspace")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Personal workspace")).not.toBeInTheDocument();
  });

  it("signs out and navigates away", async () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: /workspace menu/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith("/");
    });
  });
});
