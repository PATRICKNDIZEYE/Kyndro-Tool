import { useState } from "react";
import { RunList } from "./screens/RunList/RunList";
import { RunDetail } from "./screens/RunDetail/RunDetail";

export function App() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  return selectedRunId ? (
    <RunDetail runId={selectedRunId} onBack={() => setSelectedRunId(null)} />
  ) : (
    <RunList onSelectRun={setSelectedRunId} />
  );
}
