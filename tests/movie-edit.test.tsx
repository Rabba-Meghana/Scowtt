/**
 * tests/movie-edit.test.tsx
 *
 * Tests for the movie edit flow in DashboardClient covering:
 *  - Entering and exiting edit mode
 *  - Optimistic UI update (movie shown immediately before server response)
 *  - Revert when server returns an error
 *  - Validation: empty movie name blocked
 *  - Cancel restores the original value
 *  - Fact cache invalidated on successful save
 *  - Keyboard shortcuts (Enter to save, Escape to cancel)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardClient from "@/components/DashboardClient";
import * as api from "@/lib/api";

// ── Mock next-auth/react ──────────────────────────────────────────────────────
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// ── Mock next/image ───────────────────────────────────────────────────────────
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// ── Default test user ─────────────────────────────────────────────────────────
const BASE_USER = {
  id:            "user_1",
  name:          "Anna Smith",
  email:         "anna@example.com",
  image:         null,
  favoriteMovie: "Inception",
  onboarded:     true,
};

const SAMPLE_FACT: api.FactResponse = {
  factText:    "Inception was filmed across 6 countries.",
  generatedAt: new Date().toISOString(),
  cached:      false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderDashboard(movieOverride?: string | null) {
  const user = { ...BASE_USER, favoriteMovie: movieOverride ?? BASE_USER.favoriteMovie };
  return render(<DashboardClient user={user} />);
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  api.invalidateFactCache();

  // Default: getFact succeeds
  vi.spyOn(api, "getFact").mockResolvedValue({
    ok:   true,
    data: SAMPLE_FACT,
  });

  // Default: updateMovie succeeds
  vi.spyOn(api, "updateMovie").mockResolvedValue({
    ok:   true,
    data: { favoriteMovie: "The Matrix" },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("dashboard rendering", () => {
  it("displays the user name", () => {
    renderDashboard();
    expect(screen.getByText(/Anna/)).toBeInTheDocument();
  });

  it("displays the favourite movie", () => {
    renderDashboard();
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("displays the user email in the profile section", () => {
    renderDashboard();
    expect(screen.getByText("anna@example.com")).toBeInTheDocument();
  });

  it("shows a fallback when no movie is set", () => {
    renderDashboard(null);
    expect(screen.getByText("No movie set")).toBeInTheDocument();
  });

  it("displays the fact once loaded", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(SAMPLE_FACT.factText)).toBeInTheDocument();
    });
  });
});

// ── Edit mode ─────────────────────────────────────────────────────────────────

describe("entering / exiting edit mode", () => {
  it("shows an input field when Edit is clicked", async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByPlaceholderText(/enter movie name/i)).toBeInTheDocument();
  });

  it("pre-fills the input with the current movie", async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByDisplayValue("Inception")).toBeInTheDocument();
  });

  it("hides the edit button while in edit mode", async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it("shows Save and Cancel buttons in edit mode", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });
});

// ── Cancel ────────────────────────────────────────────────────────────────────

describe("cancel edit", () => {
  it("restores the original movie title on cancel", async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const input = screen.getByDisplayValue("Inception");
    await userEvent.clear(input);
    await userEvent.type(input, "The Matrix");

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByText("Inception")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("The Matrix")).not.toBeInTheDocument();
  });

  it("closes the edit form on cancel", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByPlaceholderText(/enter movie name/i)).not.toBeInTheDocument();
  });

  it("cancels on Escape key", async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByPlaceholderText(/enter movie name/i);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByPlaceholderText(/enter movie name/i)).not.toBeInTheDocument();
  });
});

// ── Optimistic update ─────────────────────────────────────────────────────────

describe("optimistic UI update", () => {
  it("shows the new movie title immediately before server responds", async () => {
    // Make updateMovie hang so we can observe the optimistic state
    vi.spyOn(api, "updateMovie").mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const input = screen.getByDisplayValue("Inception");
    await userEvent.clear(input);
    await userEvent.type(input, "The Matrix");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Optimistic update: new title shown immediately
    expect(screen.getByText("The Matrix")).toBeInTheDocument();
    expect(screen.queryByText("Inception")).not.toBeInTheDocument();
  });
});

// ── Successful save ───────────────────────────────────────────────────────────

describe("successful save", () => {
  it("keeps the new movie after a successful server response", async () => {
    vi.spyOn(api, "updateMovie").mockResolvedValue({
      ok:   true,
      data: { favoriteMovie: "The Matrix" },
    });

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const input = screen.getByDisplayValue("Inception");
    await userEvent.clear(input);
    await userEvent.type(input, "The Matrix");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("The Matrix")).toBeInTheDocument();
    });
  });

  it("saves on Enter key", async () => {
    const spy = vi.spyOn(api, "updateMovie").mockResolvedValue({
      ok:   true,
      data: { favoriteMovie: "Dune" },
    });

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const input = screen.getByDisplayValue("Inception");
    await userEvent.clear(input);
    await userEvent.type(input, "Dune");
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(spy).toHaveBeenCalledWith("Dune"));
  });

  it("invalidates the fact cache when movie is saved", async () => {
    const invalidateSpy = vi.spyOn(api, "invalidateFactCache");

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const input = screen.getByDisplayValue("Inception");
    await userEvent.clear(input);
    await userEvent.type(input, "The Matrix");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
  });
});

// ── Revert on failure ─────────────────────────────────────────────────────────

describe("revert on server failure", () => {
  it("reverts to the original movie when server returns an error", async () => {
    vi.spyOn(api, "updateMovie").mockResolvedValue({
      ok:    false,
      error: { status: 500, message: "Database error" },
    });

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const input = screen.getByDisplayValue("Inception");
    await userEvent.clear(input);
    await userEvent.type(input, "The Matrix");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("Inception")).toBeInTheDocument();
    });
  });

  it("shows the error message when server returns 422", async () => {
    vi.spyOn(api, "updateMovie").mockResolvedValue({
      ok:    false,
      error: { status: 422, message: "Movie name cannot be empty." },
    });

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const input = screen.getByDisplayValue("Inception");
    await userEvent.clear(input);
    await userEvent.type(input, " ");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/cannot be empty/i)).toBeInTheDocument();
    });
  });
});

// ── Client-side validation ────────────────────────────────────────────────────

describe("client-side validation", () => {
  it("shows error and does not call API when saving an empty movie name", async () => {
    const spy = vi.spyOn(api, "updateMovie");

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const input = screen.getByDisplayValue("Inception");
    await userEvent.clear(input);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });

    expect(screen.getByText(/cannot be empty/i)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("disables the Save button when input is empty", async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const input = screen.getByDisplayValue("Inception");
    await userEvent.clear(input);

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });
});
