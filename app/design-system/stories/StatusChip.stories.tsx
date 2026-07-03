import type { Meta, StoryObj } from "@storybook/react";
import { StatusChip } from "../components/StatusChip/StatusChip";

const meta: Meta<typeof StatusChip> = {
  title: "Components/StatusChip",
  component: StatusChip,
};
export default meta;

type Story = StoryObj<typeof StatusChip>;

export const AllVerdicts: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <StatusChip verdict="VERIFIED" />
      <StatusChip verdict="FALSIFIED" />
      <StatusChip verdict="UNKNOWN" />
    </div>
  ),
};

export const VerifiedWithBoundsDisclosure: Story = {
  args: { verdict: "VERIFIED", boundsLabel: "1,000 inputs, seed a1b2c3" },
};
