import type { Meta, StoryObj } from "@storybook/react";
import { DiffViewerShell } from "../components/DiffViewerShell/DiffViewerShell";

const meta: Meta<typeof DiffViewerShell> = {
  title: "Components/DiffViewerShell",
  component: DiffViewerShell,
};
export default meta;

type Story = StoryObj<typeof DiffViewerShell>;

export const Default: Story = {
  args: {
    filePath: "src/checkout.ts",
    lines: [
      { type: "context", lineNumber: 10, content: "function checkout(cart: Cart) {" },
      { type: "removed", lineNumber: 11, content: "  return applyDiscount(cart, 0.1);" },
      { type: "added", lineNumber: 11, content: "  return applyDiscount(cart, discountRate(cart));" },
      { type: "context", lineNumber: 12, content: "}" },
    ],
  },
};

export const NoChanges: Story = {
  args: { filePath: "src/money.ts", lines: [] },
};
