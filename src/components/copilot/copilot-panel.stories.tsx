import type { Meta, StoryObj } from "@storybook/react-vite";
import type { UIMessage } from "ai";
import { explainActivity } from "@/lib/ai/mock/explain";
import { DEMO_ADDRESS, seedDemoActivity } from "@/lib/wallet/demo-source";
import { CopilotPanel } from "./copilot-panel";

const sent = seedDemoActivity(Date.UTC(2026, 10, 11, 15))[1]!;

const conversation: UIMessage[] = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "What was this transaction?" }] },
  {
    id: "a1",
    role: "assistant",
    parts: [{ type: "text", text: explainActivity(sent, DEMO_ADDRESS) }],
  },
];

const meta = {
  title: "Copilot/CopilotPanel",
  component: CopilotPanel,
  args: {
    messages: conversation,
    status: "ready",
    provider: { id: "mock", modelId: "organizadapp-mock-1" },
    selected: sent,
    onSend: () => undefined,
  },
  decorators: [(Story) => <div className="w-[380px]">{Story()}</div>],
} satisfies Meta<typeof CopilotPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExplainingATransaction: Story = {};
export const Empty: Story = { args: { messages: [], selected: null } };
export const Thinking: Story = {
  args: { messages: conversation.slice(0, 1), status: "submitted" },
};
export const Gemini: Story = { args: { provider: { id: "gemini", modelId: "gemini-2.5-flash" } } };
export const RateLimited: Story = { args: { error: new Error("429 Too Many Requests") } };
