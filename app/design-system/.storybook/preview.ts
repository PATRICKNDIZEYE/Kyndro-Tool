import type { Preview } from "@storybook/react";
import "../tokens/tokens.css";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    a11y: {
      test: "error",
    },
  },
};

export default preview;
