import { Button, StatusChip, Table, type TableColumn, type Verdict } from "@kyndro/design-system";
import { useApi } from "../../lib/useApi";
import type { Run } from "../../mock/fixtures";

interface RunsPage {
  data: Run[];
  next_cursor: string | null;
}

function overallVerdict(run: Run): Verdict {
  if (run.verdict_counts.falsified > 0) return "FALSIFIED";
  if (run.verdict_counts.unknown > 0) return "UNKNOWN";
  return "VERIFIED";
}

export interface RunListProps {
  onSelectRun: (runId: string) => void;
}

export function RunList({ onSelectRun }: RunListProps) {
  const state = useApi<RunsPage>("/runs");

  if (state.status === "loading") {
    return <p role="status">Loading runs…</p>;
  }
  if (state.status === "error") {
    return <p role="alert">Couldn't load runs: {state.message}</p>;
  }

  const columns: TableColumn<Run>[] = [
    {
      key: "pr",
      header: "Change",
      render: (run) => (run.pr ? `#${run.pr.number} ${run.pr.title}` : run.head_sha.slice(0, 7)),
    },
    {
      key: "status",
      header: "Run status",
      render: (run) => run.status,
    },
    {
      key: "verdict",
      header: "Verdict",
      render: (run) => (
        <StatusChip
          verdict={overallVerdict(run)}
          boundsLabel={`${run.verdict_counts.verified}/${run.obligation_count} obligations verified`}
        />
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (run) => new Date(run.created_at).toLocaleString(),
    },
    {
      key: "actions",
      header: "",
      render: (run) => (
        <Button variant="secondary" onClick={() => onSelectRun(run.id)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h1>Verification runs</h1>
      <Table
        columns={columns}
        rows={state.data.data}
        getRowKey={(run) => run.id}
        emptyMessage="No runs yet — connect a repo to trigger one."
      />
    </div>
  );
}
