import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InviteClient from "@/app/invite/[token]/InviteClient";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const validPreview = {
  id: "inv-1",
  group_id: "grp-1",
  group_name: "Pelada das Sextas",
  token: "abc123",
  status: "active",
  is_valid: true,
  is_expired: false,
  is_exhausted: false,
  max_uses: 10,
  current_uses: 2,
  expires_at: "2027-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

describe("InviteClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. Renders invite information from props", () => {
    render(
      <InviteClient
        token="abc123"
        preview={validPreview}
        error={null}
        isLoggedIn={true}
      />
    );
    expect(screen.getByText("Pelada das Sextas")).toBeInTheDocument();
    expect(screen.getByText("Convite para grupo")).toBeInTheDocument();
  });

  it("2. Accept button calls POST /api/invitations/[token]/accept", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ group_id: "grp-1" }),
    });
    render(
      <InviteClient
        token="abc123"
        preview={validPreview}
        error={null}
        isLoggedIn={true}
      />
    );
    await user.click(screen.getByText("Entrar no grupo"));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/invitations/abc123/accept",
        expect.objectContaining({ method: "POST" })
      )
    );
  });

  it("3. Shows loading state during submission", async () => {
    const user = userEvent.setup();
    // Keep the promise pending so we can see the loading state
    let resolvePromise!: (v: unknown) => void;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );
    render(
      <InviteClient
        token="abc123"
        preview={validPreview}
        error={null}
        isLoggedIn={true}
      />
    );
    await user.click(screen.getByText("Entrar no grupo"));
    // Button should now be disabled (spinner visible)
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    // Resolve to prevent open handles
    resolvePromise({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ group_id: "grp-1" }),
    });
  });

  it("4. Redirects after successful accept", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ group_id: "grp-1" }),
    });
    render(
      <InviteClient
        token="abc123"
        preview={validPreview}
        error={null}
        isLoggedIn={true}
      />
    );
    await user.click(screen.getByText("Entrar no grupo"));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/grupos/grp-1")
    );
  });
});
