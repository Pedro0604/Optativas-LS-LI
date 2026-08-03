import type { Address } from "viem";
import { canWrite } from "../wallet/wallet";
import { EscrowState } from "./EscrowState";
import type { EscrowSnapshot } from "./detail";

export type ReviewActionEligibility = { ok: true } | { ok: false; message: string };

export function validatePublicText(value: string, maxBytes: number): string | undefined {
  const bytes = new TextEncoder().encode(value).length;
  if (bytes === 0) return "Este campo es obligatorio.";
  if (bytes > maxBytes) return `El texto no puede superar ${maxBytes} bytes UTF-8.`;
  return undefined;
}

function eligibility(
  snapshot: EscrowSnapshot,
  account: Address | undefined,
  blockTime: bigint,
  chainId: number | undefined,
  role: "owner" | "worker",
  state: EscrowState,
  deadline: "submission" | "review",
  action: string,
): ReviewActionEligibility {
  if (!account || account.toLowerCase() !== snapshot[role].toLowerCase())
    return { ok: false, message: `Solo el ${role} puede ${action} este escrow.` };
  if (!canWrite(chainId))
    return { ok: false, message: `Tu wallet debe usar Sepolia para ${action} el escrow.` };
  if (snapshot.state !== state) return { ok: false, message: `El escrow ya no permite ${action}.` };
  if (blockTime >= snapshot.deadlines[deadline])
    return { ok: false, message: `El plazo para ${action} ya venció.` };
  return { ok: true };
}

export function canSubmitWork(
  snapshot: EscrowSnapshot,
  account: Address | undefined,
  blockTime: bigint,
  chainId: number | undefined,
) {
  return eligibility(
    snapshot,
    account,
    blockTime,
    chainId,
    "worker",
    EscrowState.PendingSubmission,
    "submission",
    "enviar trabajo",
  );
}

export function canApproveWork(
  snapshot: EscrowSnapshot,
  account: Address | undefined,
  blockTime: bigint,
  chainId: number | undefined,
) {
  return eligibility(
    snapshot,
    account,
    blockTime,
    chainId,
    "owner",
    EscrowState.PendingReview,
    "review",
    "aprobar",
  );
}

export function canOpenDispute(
  snapshot: EscrowSnapshot,
  account: Address | undefined,
  blockTime: bigint,
  chainId: number | undefined,
) {
  return eligibility(
    snapshot,
    account,
    blockTime,
    chainId,
    "owner",
    EscrowState.PendingReview,
    "review",
    "abrir una disputa en",
  );
}
