import type { EscrowItem } from "./discovery";
import { EscrowCard } from "./EscrowCard";
import { EscrowReadErrorCard } from "./EscrowReadErrorCard";

type EscrowListProps = {
  items: EscrowItem[];
  onRetry: () => void;
};

export function EscrowList({ items, onRetry }: EscrowListProps) {
  if (items.length === 0) {
    return (
      <div className="panel empty">
        <h2>No hay escrows para mostrar</h2>
        <p>Cuando se cree el primero aparecerá acá.</p>
      </div>
    );
  }

  return (
    <ul className="grid">
      {items.map((item) =>
        item.kind === "success" ? (
          <EscrowCard key={item.address} summary={item.summary} />
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
