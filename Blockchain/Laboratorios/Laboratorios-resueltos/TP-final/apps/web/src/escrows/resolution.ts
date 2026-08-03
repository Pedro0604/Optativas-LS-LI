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

function formatBasisPoints(value: bigint) {
  const whole = value / 100n;
  const fraction = value % 100n;
  return fraction === 0n
    ? whole.toString()
    : `${whole}.${fraction.toString().padStart(2, "0").replace(/0$/, "")}`;
}

export function formatAllocationPercent(workerAmountWei: bigint, amount: bigint) {
  const workerBasisPoints = amount
    ? (workerAmountWei * allocationSliderSteps + amount / 2n) / amount
    : 0n;
  return {
    worker: formatBasisPoints(workerBasisPoints),
    owner: formatBasisPoints(allocationSliderSteps - workerBasisPoints),
  };
}

type AllocationParseResult = { ok: true; workerAmountWei: bigint } | { ok: false; message: string };

function parseEthAllocation(
  value: string,
  party: "worker" | "owner",
  amount: bigint,
): AllocationParseResult {
  const partyLabel = party === "worker" ? "worker" : "owner";
  const normalized = value.trim();
  if (!normalized) return { ok: false, message: `Ingresá el monto asignado al ${partyLabel}.` };
  if (normalized.startsWith("-"))
    return { ok: false, message: "La asignación no puede ser negativa." };
  if (!/^\d+(?:\.\d{1,18})?$/.test(normalized))
    return { ok: false, message: "Ingresá un monto ETH exacto de hasta 18 decimales." };
  try {
    const partyAmountWei = parseEther(normalized);
    if (partyAmountWei > amount)
      return {
        ok: false,
        message: `La asignación al ${partyLabel} no puede superar el monto del escrow.`,
      };
    return {
      ok: true,
      workerAmountWei: party === "worker" ? partyAmountWei : amount - partyAmountWei,
    };
  } catch {
    return { ok: false, message: "Ingresá un monto ETH exacto de hasta 18 decimales." };
  }
}

export function parseWorkerAllocation(value: string, amount: bigint): AllocationParseResult {
  return parseEthAllocation(value, "worker", amount);
}

export function parseOwnerAllocation(value: string, amount: bigint): AllocationParseResult {
  return parseEthAllocation(value, "owner", amount);
}

export function parseAllocationPercent(
  value: string,
  party: "worker" | "owner",
  amount: bigint,
): AllocationParseResult {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return { ok: false, message: `Ingresá el porcentaje del ${party}.` };
  const basisPoints = parsePercentBasisPoints(normalized);
  if (basisPoints === undefined)
    return { ok: false, message: "Ingresá un porcentaje de hasta 2 decimales." };
  if (basisPoints > allocationSliderSteps)
    return { ok: false, message: "El porcentaje debe estar entre 0 y 100." };

  const partyAmountWei = (amount * basisPoints) / allocationSliderSteps;
  return {
    ok: true,
    workerAmountWei: party === "worker" ? partyAmountWei : amount - partyAmountWei,
  };
}

function parsePercentBasisPoints(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(normalized)) return undefined;
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function complementAllocationPercent(value: string) {
  const basisPoints = parsePercentBasisPoints(value);
  if (basisPoints === undefined || basisPoints > allocationSliderSteps) return undefined;
  return formatBasisPoints(allocationSliderSteps - basisPoints);
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
