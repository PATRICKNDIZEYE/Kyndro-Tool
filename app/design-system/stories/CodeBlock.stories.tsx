import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "../components/CodeBlock/CodeBlock";

const meta: Meta<typeof CodeBlock> = {
  title: "Components/CodeBlock",
  component: CodeBlock,
};
export default meta;

type Story = StoryObj<typeof CodeBlock>;

export const Default: Story = {
  args: {
    language: "ts",
    caption: "engine/ir/functionInventory.ts",
    code: "export function applyDiscount(cart: Cart, pct: number): Cart {\n  return { ...cart, total: cart.total * (1 - pct) };\n}",
  },
};

export const EmptyContent: Story = {
  args: { code: "", caption: "No source captured for this obligation." },
};
