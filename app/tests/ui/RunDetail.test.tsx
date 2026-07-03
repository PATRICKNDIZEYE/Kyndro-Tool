import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { RunDetail } from "../../screens/RunDetail/RunDetail";
import { API_BASE } from "../../mock/handlers";
import { server } from "../../mock/node";
import { runDetail } from "../../mock/fixtures";

describe("RunDetail", () => {
  it("renders run analysis and obligations from the mock fixture", async () => {
    render(<RunDetail runId={runDetail.id} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(`#${runDetail.pr!.number} ${runDetail.pr!.title}`)).toBeInTheDocument();
    });

    expect(await screen.findByText("VERIFIED")).toBeInTheDocument();
    expect(await screen.findByText("FALSIFIED")).toBeInTheDocument();
    expect(await screen.findByText("UNKNOWN")).toBeInTheDocument();
  });

  it("shows a 404 error state for an unknown run id", async () => {
    render(<RunDetail runId="run_doesnotexist" onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getAllByRole("alert")[0]).toHaveTextContent("No run with that id.");
    });
  });

  it("shows an empty state when a run has no obligations yet", async () => {
    server.use(
      http.get(`${API_BASE}/runs/:runId/obligations`, () =>
        HttpResponse.json({ data: [], next_cursor: null }),
      ),
    );

    render(<RunDetail runId={runDetail.id} onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/no obligations for this run yet/i)).toBeInTheDocument();
    });
  });
});
