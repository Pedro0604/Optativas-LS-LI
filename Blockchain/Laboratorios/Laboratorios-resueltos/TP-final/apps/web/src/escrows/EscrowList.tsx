import type { EscrowItem } from "./discovery";
import { EscrowCard } from "./EscrowCard";
import { EscrowReadErrorCard } from "./EscrowReadErrorCard";
import { Panel } from "../ui/Panel";

type EscrowListProps = {
  items: EscrowItem[];
  chainTime: bigint;
  onRetry: () => void;
};

export function EscrowList({ items, chainTime, onRetry }: EscrowListProps) {
  if (items.length === 0) {
    return (
      <Panel className="px-4 py-16 text-center">
        <h2>No hay escrows para mostrar</h2>
        <p>Cuando se cree el primero aparecerá acá.</p>
      </Panel>
    );
  }

  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,310px),1fr))] gap-4 p-0">
      {items.map((item) =>
        item.kind === "success" ? (
          <EscrowCard key={item.address} summary={item.summary} chainTime={chainTime} />
        ) : (
          <EscrowReadErrorCard
            key={item.address}
            address={item.address}
            error={item.error}
            onRetry={onRetry}
          />
        ),
      )}
    </ul>
  );
}
