import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../components/Button/Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { variant: "primary", children: "Re-run verification" },
};

export const LongLabelDisabled: Story = {
  args: {
    variant: "secondary",
    disabled: true,
    children: "Approve pull request for merge into the protected main branch",
  },
};
