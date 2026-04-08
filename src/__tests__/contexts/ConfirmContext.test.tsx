import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmProvider, useConfirm } from "@/contexts/ConfirmContext";

function TriggerButton({
  opts,
  onResult,
}: {
  opts: Parameters<ReturnType<typeof useConfirm>["confirm"]>[0];
  onResult: (result: boolean) => void;
}) {
  const { confirm } = useConfirm();
  return (
    <button
      onClick={async () => {
        const result = await confirm(opts);
        onResult(result);
      }}
    >
      open
    </button>
  );
}

function renderWithProvider(
  opts: Parameters<ReturnType<typeof useConfirm>["confirm"]>[0],
  onResult: (result: boolean) => void
) {
  return render(
    <ConfirmProvider>
      <TriggerButton opts={opts} onResult={onResult} />
    </ConfirmProvider>
  );
}

const defaultOpts = {
  title: "Are you sure?",
  description: "This cannot be undone",
  confirmLabel: "Yes",
  cancelLabel: "No",
};

describe("ConfirmContext", () => {
  it("1. confirm() resolves true when confirm button is clicked", async () => {
    const user = userEvent.setup();
    let result: boolean | undefined;
    renderWithProvider(defaultOpts, (r) => { result = r; });
    await user.click(screen.getByText("open"));
    await user.click(screen.getByText("Yes"));
    await waitFor(() => expect(result).toBe(true));
  });

  it("2. confirm() resolves false when cancel button is clicked", async () => {
    const user = userEvent.setup();
    let result: boolean | undefined;
    renderWithProvider(defaultOpts, (r) => { result = r; });
    await user.click(screen.getByText("open"));
    await user.click(screen.getByText("No"));
    await waitFor(() => expect(result).toBe(false));
  });

  it("3. confirm() resolves false when Escape key pressed", async () => {
    const user = userEvent.setup();
    let result: boolean | undefined;
    renderWithProvider(defaultOpts, (r) => { result = r; });
    await user.click(screen.getByText("open"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(result).toBe(false));
  });

  it("4. confirm() resolves true when Enter key pressed", async () => {
    const user = userEvent.setup();
    let result: boolean | undefined;
    renderWithProvider(defaultOpts, (r) => { result = r; });
    await user.click(screen.getByText("open"));
    await user.keyboard("{Enter}");
    await waitFor(() => expect(result).toBe(true));
  });

  it("5. confirm() resolves false when backdrop is clicked", async () => {
    const user = userEvent.setup();
    let result: boolean | undefined;
    renderWithProvider(defaultOpts, (r) => { result = r; });
    await user.click(screen.getByText("open"));
    // The backdrop is the absolute positioned div with bg-black/70
    const backdrop = document.querySelector(".absolute.inset-0") as HTMLElement;
    expect(backdrop).toBeTruthy();
    await user.click(backdrop);
    await waitFor(() => expect(result).toBe(false));
  });

  it("6. variant danger → confirm button has bg-red-500 class", async () => {
    const user = userEvent.setup();
    renderWithProvider(
      { ...defaultOpts, variant: "danger", confirmLabel: "Delete" },
      () => {}
    );
    await user.click(screen.getByText("open"));
    const btn = screen.getByText("Delete");
    expect(btn.className).toContain("bg-red-500");
  });

  it("7. variant warning → confirm button has bg-amber-400 class", async () => {
    const user = userEvent.setup();
    renderWithProvider(
      { ...defaultOpts, variant: "warning", confirmLabel: "Warn" },
      () => {}
    );
    await user.click(screen.getByText("open"));
    const btn = screen.getByText("Warn");
    expect(btn.className).toContain("bg-amber-400");
  });

  it("8. variant info → confirm button has bg-green-500 class", async () => {
    const user = userEvent.setup();
    renderWithProvider(
      { ...defaultOpts, variant: "info", confirmLabel: "Proceed" },
      () => {}
    );
    await user.click(screen.getByText("open"));
    const btn = screen.getByText("Proceed");
    expect(btn.className).toContain("bg-green-500");
  });

  it("9. detail prop renders label and value", async () => {
    const user = userEvent.setup();
    renderWithProvider(
      {
        ...defaultOpts,
        detail: { label: "Group name", value: "My Group" },
      },
      () => {}
    );
    await user.click(screen.getByText("open"));
    expect(screen.getByText("Group name")).toBeInTheDocument();
    expect(screen.getByText("My Group")).toBeInTheDocument();
  });

  it("10. useConfirm outside provider → throws error", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    function BadComponent() {
      useConfirm();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow(
      "useConfirm must be used within ConfirmProvider"
    );
    consoleError.mockRestore();
  });

  it("11. Modal is removed from DOM after closing", async () => {
    const user = userEvent.setup();
    renderWithProvider(defaultOpts, () => {});
    await user.click(screen.getByText("open"));
    // Modal is visible
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    // Close it
    await user.click(screen.getByText("No"));
    // Modal should be gone
    await waitFor(() =>
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument()
    );
  });
});
