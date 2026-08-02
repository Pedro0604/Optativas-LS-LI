import type { Address } from "viem";
import { Button } from "../ui/Button";
import { shortAddress } from "./discovery";

type EscrowReadErrorCardProps = {
  address: Address;
  error: string;
  onRetry: () => void;
};

export function EscrowReadErrorCard({ address, error, onRetry }: EscrowReadErrorCardProps) {
  return (
    <li className="card">
      <p className="eyebrow">{shortAddress(address)}</p>
      <h2>Lectura fallida</h2>
      <p>{error}</p>
      <Button onClick={onRetry}>Reintentar</Button>
    </li>
  );
}
