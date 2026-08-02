import type { Address } from "viem";
import { EscrowState } from "./EscrowState";
import type { EscrowSnapshot } from "./detail";
import { canWrite } from "../wallet/wallet";

export type AcceptanceEligibility = { ok: true } | { ok: false; message: string };

/** Mirrors acceptEscrow's role, state, deadline and network prerequisites before simulation. */
export function canAcceptEscrow(
  snapshot: EscrowSnapshot,
  account: Address | undefined,
  blockTime: bigint,
  chainId: number | undefined,
): AcceptanceEligibility {
  if (!account || account.toLowerCase() !== snapshot.worker.toLowerCase())
    return { ok: false, message: "Solo el worker puede aceptar este escrow." };
  if (!canWrite(chainId))
    return { ok: false, message: "Tu wallet debe usar Sepolia para aceptar el escrow." };
  if (snapshot.state !== EscrowState.PendingAcceptance)
    return { ok: false, message: "El escrow ya no está pendiente de aceptación." };
  if (blockTime >= snapshot.deadlines.acceptance)
    return { ok: false, message: "El plazo de aceptación ya venció." };
  return { ok: true };
}
