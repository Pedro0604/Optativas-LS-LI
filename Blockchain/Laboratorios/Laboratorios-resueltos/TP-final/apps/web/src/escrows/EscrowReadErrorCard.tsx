import type { Address } from "viem";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { AddressDisplay } from "../ui/AddressDisplay";

type EscrowReadErrorCardProps = {
  address: Address;
  error: string;
  onRetry: () => void;
};

export function EscrowReadErrorCard({ address, error, onRetry }: EscrowReadErrorCardProps) {
  return (
    <Panel as="li" className="border-danger/35">
      <AddressDisplay address={address} format="short" />
      <h2 className="my-3 font-display text-xl font-bold">Lectura fallida</h2>
      <p className="text-muted">{error}</p>
      <Button onClick={onRetry}>Reintentar</Button>
    </Panel>
  );
}
