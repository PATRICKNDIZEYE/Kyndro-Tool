import { Button, CodeBlock, StatusChip, Table, type TableColumn } from "@kyndro/design-system";
import { useApi } from "../../lib/useApi";
import type { Obligation, RunDetail as RunDetailData } from "../../mock/fixtures";

interface ObligationsPage {
  data: Obligation[];
  next_cursor: string | null;
}

function obligationDetail(obligation: Obligation): string {
  if (obligation.verdict === "VERIFIED" && obligation.verified) {
    return `${obligation.verified.inputs_tested} inputs tested\nbounds: ${obligation.verified.bounds}\nseed: ${obligation.verified.seed}`;
  }
  if (obligation.verdict === "FALSIFIED" && obligation.counterexample) {
    const cex = obligation.counterexample;
    return [
      `property: ${cex.property}`,
      `expected: ${cex.expected}`,
      `actual:   ${cex.actual}`,
      `replay:   ${cex.replay.command}`,
    ].join("\n");
  }
  if (obligation.verdict === "UNKNOWN" && obligation.unknown_reason) {
    return `${obligation.unknown_reason.code}: ${obligation.unknown_reason.message}`;
  }
  return "";
}

export interface RunDetailProps {
  runId: string;
  onBack: () => void;
}

export function RunDetail({ runId, onBack }: RunDetailProps) {
  const runState = useApi<RunDetailData>(`/runs/${runId}`);
  const obligationsState = useApi<ObligationsPage>(`/runs/${runId}/obligations`);

  return (
    <div>
      <Button variant="secondary" onClick={onBack}>
        ← Back to runs
      </Button>

      {runState.status === "loading" && <p role="status">Loading run…</p>}
      {runState.status === "error" && <p role="alert">Couldn't load run: {runState.message}</p>}
      {runState.status === "success" && (
        <>
          <h1>
            {runState.data.pr ? `#${runState.data.pr.number} ${runState.data.pr.title}` : runState.data.id}
          </h1>
          <p>
            {runState.data.status} · {runState.data.head_sha.slice(0, 7)} over{" "}
            {runState.data.base_sha.slice(0, 7)}
          </p>
          {runState.data.analysis && (
            <CodeBlock
              caption="Analysis"
              code={[
                `${runState.data.analysis.files_changed} file(s) changed`,
                "",
                "changed functions:",
                ...runState.data.analysis.functions_changed.map(
                  (fn) => `  ${fn.name} (${fn.file}) — ${fn.change_kind}`,
                ),
                "",
                "blast radius:",
                ...runState.data.analysis.blast_radius.map(
                  (fn) => `  ${fn.name} (${fn.file}) — ${fn.reason}`,
                ),
              ].join("\n")}
            />
          )}
        </>
      )}

      {obligationsState.status === "loading" && <p role="status">Loading obligations…</p>}
      {obligationsState.status === "error" && (
        <p role="alert">Couldn't load obligations: {obligationsState.message}</p>
      )}
      {obligationsState.status === "success" && (
        <ObligationsTable obligations={obligationsState.data.data} />
      )}
    </div>
  );
}

function ObligationsTable({ obligations }: { obligations: Obligation[] }) {
  const columns: TableColumn<Obligation>[] = [
    {
      key: "target",
      header: "Target",
      render: (o) => `${o.target.name} (${o.target.file}:${o.target.line})`,
    },
    {
      key: "verdict",
      header: "Verdict",
      render: (o) => <StatusChip verdict={o.verdict} />,
    },
    {
      key: "detail",
      header: "Detail",
      render: (o) => <CodeBlock code={obligationDetail(o)} />,
    },
  ];

  return (
    <Table
      columns={columns}
      rows={obligations}
      getRowKey={(o) => o.id}
      emptyMessage="No obligations for this run yet."
    />
  );
}
