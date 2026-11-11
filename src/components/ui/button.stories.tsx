import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Airdrop", variant: "primary", size: "lg" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "outline", "ghost"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg", "icon"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary", children: "Send" } };
export const Outline: Story = { args: { variant: "outline", children: "Sign message" } };
export const Loading: Story = { args: { loading: true, children: "Airdrop" } };
export const Disabled: Story = { args: { disabled: true } };

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">
        Airdrop
      </Button>
      <Button {...args} variant="secondary">
        Send
      </Button>
      <Button {...args} variant="outline">
        Sign message
      </Button>
      <Button {...args} variant="ghost">
        Cancel
      </Button>
    </div>
  ),
};
