import { formatEther, type Address } from "viem";
import type { EscrowSnapshot } from "./detail";
import { canWrite } from "../wallet/wallet";

export function pendingWithdrawalFor(snapshot: EscrowSnapshot, account?: Address): bigint {
  if (!account) return 0n;
  const normalized = account.toLowerCase();
  if (normalized === snapshot.owner.toLowerCase()) return snapshot.pendingWithdrawals.owner;
  if (normalized === snapshot.worker.toLowerCase()) return snapshot.pendingWithdrawals.worker;
  return 0n;
}

/** Exact decimal representation: presentation never rounds or changes the submitted wei. */
export function formatPendingWithdrawal(amount: bigint) {
  return `${formatEther(amount)} ETH`;
}

export function canWithdrawFromEscrow(
  snapshot: EscrowSnapshot,
  account?: Address,
  chainId?: number,
) {
  return canWrite(chainId) && pendingWithdrawalFor(snapshot, account) > 0n;
}
