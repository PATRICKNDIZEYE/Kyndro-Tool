import type { Meta, StoryObj } from "@storybook/react";
import { Table } from "../components/Table/Table";
import { StatusChip, type Verdict } from "../components/StatusChip/StatusChip";

interface Row {
  id: string;
  name: string;
  verdict: Verdict;
}

const columns = [
  { key: "name", header: "Obligation", render: (r: Row) => r.name },
  { key: "verdict", header: "Verdict", render: (r: Row) => <StatusChip verdict={r.verdict} /> },
];

const meta: Meta<typeof Table<Row>> = {
  title: "Components/Table",
  component: Table<Row>,
};
export default meta;

type Story = StoryObj<typeof Table<Row>>;

export const Default: Story = {
  args: {
    columns,
    getRowKey: (r: Row) => r.id,
    rows: [
      { id: "1", name: "applyDiscount", verdict: "VERIFIED" },
      { id: "2", name: "checkout", verdict: "FALSIFIED" },
      { id: "3", name: "restock", verdict: "UNKNOWN" },
    ],
  },
};

export const Empty: Story = {
  args: { columns, getRowKey: (r: Row) => r.id, rows: [] },
};
