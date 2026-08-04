import type { Address } from "viem";
import { AddressDisplay } from "../ui/AddressDisplay";
import { Badge } from "../ui/Badge";

type Props = {
  title: string;
  address: Address;
  state: string;
  deadlineElapsed: boolean;
};

export function EscrowStateHeader({ title, address, state, deadlineElapsed }: Props) {
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
        {deadlineElapsed && (
          <Badge className="border-accent/40 bg-accent/10 text-accent">
            Plazo vencido · sin finalizar
          </Badge>
        )}
      </aside>
    </header>
  );
}
