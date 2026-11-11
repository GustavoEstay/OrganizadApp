import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DEMO_ADDRESS, DEMO_FRIEND } from "@/lib/wallet/demo-source";
import { BalanceCard } from "./balance-card";
import { DemoToggle } from "./demo-toggle";
import { DevnetBadge } from "./devnet-badge";
import { PhantomButton, type PhantomButtonProps } from "./phantom-button";
import { SendForm } from "./send-form";
import { SignMessageCard } from "./sign-message-card";

const meta = {
  title: "Wallet/Header controls",
  component: PhantomButton,
  args: { state: "connected", address: DEMO_ADDRESS },
  argTypes: {
    state: {
      control: "inline-radio",
      options: ["connected", "connecting", "disconnected", "not-installed", "demo"],
    },
  },
} satisfies Meta<typeof PhantomButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Connected: Story = {};
export const Disconnected: Story = { args: { state: "disconnected" } };
export const NotInstalled: Story = { args: { state: "not-installed" } };
export const Demo: Story = { args: { state: "demo" } };

function HeaderRowDemo(args: PhantomButtonProps) {
  const [demo, setDemo] = useState(true);
  return (
    <div className="flex items-center gap-4">
      <DemoToggle checked={demo} onChange={setDemo} />
      <DevnetBadge />
      <PhantomButton {...args} state={demo ? "demo" : "connected"} />
    </div>
  );
}

export const HeaderRow: Story = { render: (args) => <HeaderRowDemo {...args} /> };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function BalanceDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-[360px]">
      <BalanceCard
        balanceSol={12.48}
        onAirdrop={() => undefined}
        sendOpen={open}
        onToggleSend={() => setOpen((v) => !v)}
      >
        {open && (
          <SendForm
            from={DEMO_ADDRESS}
            balanceSol={12.48}
            demo
            onSend={async () => {
              await wait(600);
              return { signature: "5J7s9QmYq1vH2c3p4V6xXkL8tA2bN3gR6uW9yZ1aC4dE7fH8jK" };
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </BalanceCard>
    </div>
  );
}

export const Balance: Story = { render: () => <BalanceDemo /> };

export const BalanceLoading: Story = {
  render: () => (
    <div className="w-[360px]">
      <BalanceCard
        balanceSol={null}
        loading
        onAirdrop={() => undefined}
        sendOpen={false}
        onToggleSend={() => undefined}
      />
    </div>
  ),
};

export const SendFailure: Story = {
  render: () => (
    <div className="w-[360px] rounded-3xl bg-white p-6">
      <SendForm
        from={DEMO_ADDRESS}
        balanceSol={1}
        onSend={async () => {
          await wait(400);
          throw new Error("User rejected the request.");
        }}
      />
      <p className="mt-3 text-xs text-ink-500">Try recipient {DEMO_FRIEND}</p>
    </div>
  ),
};

export const SignMessage: Story = {
  render: () => (
    <div className="w-[360px]">
      <SignMessageCard
        defaultText="OrganizadApp: I control this wallet"
        canSign
        onSign={async (text) => {
          await wait(400);
          return {
            signature: "3vQB7B6MrGQZaxCuFg4oh9b9LhSk2wZXaZJ8nK1pQJ5x",
            verified: true,
            item: {
              id: "local-1",
              type: "signed-message",
              amountSol: null,
              counterparty: null,
              feeSol: null,
              feePayer: null,
              status: "local",
              timestamp: Date.now(),
              message: text,
            },
          };
        }}
      />
    </div>
  ),
};
