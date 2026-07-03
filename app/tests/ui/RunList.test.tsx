import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { RunList } from "../../screens/RunList/RunList";
import { API_BASE } from "../../mock/handlers";
import { server } from "../../mock/node";
import { runDetail } from "../../mock/fixtures";

describe("RunList", () => {
  it("renders the run from the mock fixture once loaded", async () => {
    render(<RunList onSelectRun={() => {}} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading runs");

    await waitFor(() => {
      expect(screen.getByText(`#${runDetail.pr!.number} ${runDetail.pr!.title}`)).toBeInTheDocument();
    });
  });

  it("shows an empty state when the mock returns no runs", async () => {
    server.use(
      http.get(`${API_BASE}/runs`, () => HttpResponse.json({ data: [], next_cursor: null })),
    );

    render(<RunList onSelectRun={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/no runs yet/i)).toBeInTheDocument();
    });
  });

  it("shows an error state when the API rejects the request", async () => {
    server.use(
      http.get(`${API_BASE}/runs`, () =>
        HttpResponse.json({ error: { code: "UNAUTHORIZED", message: "Missing bearer token." } }, { status: 401 }),
      ),
    );

    render(<RunList onSelectRun={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Missing bearer token.");
    });
  });
});
