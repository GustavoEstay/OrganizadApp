import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { seedDemoActivity } from "@/lib/wallet/demo-source";
import { ActivityList, type ActivityListProps } from "./activity-list";

const NOW = Date.UTC(2026, 10, 11, 15);
const items = seedDemoActivity(NOW);

const meta = {
  title: "Activity/ActivityList",
  component: ActivityList,
  args: { items, now: NOW },
  decorators: [(Story) => <div className="w-[400px]">{Story()}</div>],
} satisfies Meta<typeof ActivityList>;

export default meta;
type Story = StoryObj<typeof meta>;

function SelectableList(args: ActivityListProps) {
  const [selected, setSelected] = useState<string | null>(items[1]!.id);
  return <ActivityList {...args} selectedId={selected} onSelect={(i) => setSelected(i.id)} />;
}

export const Default: Story = { render: (args) => <SelectableList {...args} /> };
export const Loading: Story = { args: { items: undefined, loading: true } };
export const Empty: Story = { args: { items: [] } };
export const ErrorState: Story = {
  args: {
    items: undefined,
    error: "Couldn't reach devnet. Try again in a moment.",
    onRetry: () => undefined,
  },
};
export const NotConnected: Story = {
  args: {
    items: undefined,
    placeholder: "Connect Phantom (set to Devnet) to see your test wallet.",
  },
};
