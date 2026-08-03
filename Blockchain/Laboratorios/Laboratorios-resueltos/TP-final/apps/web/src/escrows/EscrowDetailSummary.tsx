import type { ReactNode } from "react";
import { Panel } from "../ui/Panel";

type Props = {
  amount: string;
  participants: ReactNode;
  pendingBalance?: string;
  guidance: string;
  interaction?: ReactNode;
};

export function EscrowDetailSummary({
  amount,
  participants,
  pendingBalance,
  guidance,
  interaction,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel as="section">
        <p className="text-sm font-semibold text-muted">Fondos en custodia</p>
        <p className="my-2 font-display text-4xl font-bold text-primary-strong">{amount}</p>
        <dl className="grid gap-4">{participants}</dl>
        {pendingBalance && (
          <p className="mt-5 border-t border-line pt-4 text-sm">
            Tu saldo pendiente: <strong className="font-mono">{pendingBalance}</strong>
          </p>
        )}
      </Panel>
      <aside className="rounded-xl border border-primary/40 bg-primary/10 p-5">
        <p className="text-xs font-bold tracking-widest text-primary uppercase">Tu próximo paso</p>
        <p className="mt-3 text-lg font-semibold">{guidance}</p>
        {interaction}
      </aside>
    </div>
  );
}
