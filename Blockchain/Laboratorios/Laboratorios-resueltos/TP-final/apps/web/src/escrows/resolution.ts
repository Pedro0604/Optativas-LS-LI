import { formatEther, parseEther, type Address } from "viem";
import { canWrite } from "../wallet/wallet";
import { EscrowState } from "./EscrowState";
import type { EscrowSnapshot } from "./detail";
import type { ReviewActionEligibility } from "./reviewActions";

export const allocationSliderSteps = 10_000n;

export function allocationFromWorkerSlider(value: number, amount: bigint) {
  return (amount * BigInt(value)) / allocationSliderSteps;
}

export function allocationFromOwnerSlider(value: number, amount: bigint) {
  return amount - allocationFromWorkerSlider(value, amount);
}

export function formatAllocationEth(workerAmountWei: bigint, amount: bigint) {
  return { worker: formatEther(workerAmountWei), owner: formatEther(amount - workerAmountWei) };
}

export function parseWorkerAllocation(
  value: string,
  amount: bigint,
): { ok: true; workerAmountWei: bigint } | { ok: false; message: string } {
  const normalized = value.trim();
  if (!normalized) return { ok: false, message: "Ingresá el monto asignado al worker." };
  if (normalized.startsWith("-"))
    return { ok: false, message: "La asignación no puede ser negativa." };
  if (!/^\d+(?:\.\d{1,18})?$/.test(normalized))
    return { ok: false, message: "Ingresá un monto ETH exacto de hasta 18 decimales." };
  try {
    const workerAmountWei = parseEther(normalized);
    if (workerAmountWei > amount)
      return {
        ok: false,
        message: "La asignación al worker no puede superar el monto del escrow.",
      };
    return { ok: true, workerAmountWei };
  } catch {
    return { ok: false, message: "Ingresá un monto ETH exacto de hasta 18 decimales." };
  }
}

export function canResolveDispute(
  snapshot: EscrowSnapshot,
  account: Address | undefined,
  blockTime: bigint,
  chainId: number | undefined,
): ReviewActionEligibility {
  if (!account || account.toLowerCase() !== snapshot.arbiter.toLowerCase())
    return { ok: false, message: "Solo el árbitro puede resolver esta disputa." };
  if (!canWrite(chainId))
    return { ok: false, message: "Tu wallet debe usar Sepolia para resolver la disputa." };
  if (snapshot.state !== EscrowState.PendingArbitration)
    return { ok: false, message: "El escrow ya no permite resolver la disputa." };
  if (blockTime >= snapshot.deadlines.arbitration)
    return { ok: false, message: "El plazo para resolver la disputa ya venció." };
  return { ok: true };
}
