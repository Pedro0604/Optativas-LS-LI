import type { Address } from "viem";
import { AddressDisplay } from "../ui/AddressDisplay";
import { formatDeadlineDate, formatDeadlineDistance } from "./time";

type Props = {
  title: string;
  address: Address;
  state: string;
  deadlineElapsed: boolean;
  deadline?: bigint;
  now: bigint;
};

export function EscrowStateHeader({
  title,
  address,
  state,
  deadlineElapsed,
  deadline,
  now,
}: Props) {
  return (
    <header className="grid gap-6 border-b border-line pb-6 md:grid-cols-[1.6fr_.55fr] md:items-start">
      <div>
        <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">Escrow</p>
        <h1 className="my-3 font-display text-[clamp(2.4rem,7vw,5rem)] leading-none font-bold">
          {title}
        </h1>
        <AddressDisplay address={address} format="long" />
      </div>
      <aside className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <p className="text-xs font-bold tracking-widest text-muted uppercase">Estado actual</p>
        <p className="my-3 font-display text-2xl font-bold text-primary-strong">{state}</p>
        {deadline !== undefined && (
          <div className="mt-4 border-t border-primary/20 pt-4">
            <p className={`text-sm font-bold ${deadlineElapsed ? "text-accent" : "text-ink"}`}>
              {formatDeadlineDistance(deadline, now)}
              {deadlineElapsed ? " · sin finalizar" : ""}
            </p>
            <p className="mt-1 text-xs text-muted">Fecha límite: {formatDeadlineDate(deadline)}</p>
          </div>
        )}
      </aside>
    </header>
  );
}
