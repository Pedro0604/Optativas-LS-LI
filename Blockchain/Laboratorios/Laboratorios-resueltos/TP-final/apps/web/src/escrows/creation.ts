import { escrowFactoryAbi } from "@escrow/contracts";
import { translateKnownContractError } from "./domainLabels";
import { parseEventLogs, parseEther, zeroAddress, type Address, type Log } from "viem";

export const titleMaxBytes = 64;

export const durationUnits = {
  minutes: { label: "minutos", seconds: 60n },
  hours: { label: "horas", seconds: 3_600n },
  days: { label: "días", seconds: 86_400n },
} as const;

export type DurationUnit = keyof typeof durationUnits;
export type FriendlyDuration = { value: string; unit: DurationUnit };
export type EscrowDraft = {
  title: string;
  amountEth: string;
  worker: string;
  arbiter: string;
  acceptance: FriendlyDuration;
  submission: FriendlyDuration;
  review: FriendlyDuration;
  arbitration: FriendlyDuration;
};

export type CreationRequest = {
  value: bigint;
  args: [Address, Address, bigint, bigint, bigint, bigint, string];
};

type CreationValidation = { ok: true } & CreationRequest;
type CreationInvalid = { ok: false; errors: Partial<Record<keyof EscrowDraft, string>> };

function parseAddress(value: string): Address | undefined {
  if (!/^0x[\da-fA-F]{40}$/.test(value)) return undefined;
  const address = value as Address;
  if (address.toLowerCase() === zeroAddress) return undefined;
  return address;
}

function parseDuration(duration: FriendlyDuration) {
  if (!/^\d+$/.test(duration.value)) return "Ingresá una duración entera.";
  const seconds = BigInt(duration.value) * durationUnits[duration.unit].seconds;
  return seconds === 0n ? "La duración debe ser mayor a cero." : seconds;
}

/** Validates the browser draft with the same invariants as Escrow's constructor. */
export function createEscrowRequest(
  draft: EscrowDraft,
  owner?: Address,
): CreationValidation | CreationInvalid {
  const errors: CreationInvalid["errors"] = {};
  const titleBytes = new TextEncoder().encode(draft.title).length;
  if (!titleBytes) errors.title = "El título es obligatorio.";
  else if (titleBytes > titleMaxBytes)
    errors.title = `El título admite hasta ${titleMaxBytes} bytes (tiene ${titleBytes}).`;

  let value: bigint | undefined;
  try {
    value = parseEther(draft.amountEth);
    if (value <= 0n) errors.amountEth = "El monto debe ser mayor a 0 ETH.";
  } catch {
    errors.amountEth = "Ingresá un monto válido en ETH.";
  }

  const worker = parseAddress(draft.worker);
  const arbiter = parseAddress(draft.arbiter);
  if (!worker)
    errors.worker = /^0x[\da-fA-F]{40}$/.test(draft.worker)
      ? "El worker no puede ser la dirección cero."
      : "El worker debe ser una dirección Ethereum válida.";
  if (!arbiter)
    errors.arbiter = /^0x[\da-fA-F]{40}$/.test(draft.arbiter)
      ? "El árbitro no puede ser la dirección cero."
      : "El árbitro debe ser una dirección Ethereum válida.";
  if (owner && worker && worker.toLowerCase() === owner.toLowerCase())
    errors.worker = "El worker debe ser distinto del owner.";
  if (owner && arbiter && arbiter.toLowerCase() === owner.toLowerCase())
    errors.arbiter = "El árbitro no puede participar como owner.";
  if (worker && arbiter && worker.toLowerCase() === arbiter.toLowerCase())
    errors.arbiter = "El árbitro debe ser distinto del worker.";

  const acceptance = parseDuration(draft.acceptance);
  const submission = parseDuration(draft.submission);
  const review = parseDuration(draft.review);
  const arbitration = parseDuration(draft.arbitration);
  for (const [name, result] of Object.entries({ acceptance, submission, review, arbitration })) {
    if (typeof result === "string") errors[name as keyof EscrowDraft] = result;
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: value!,
    args: [
      worker!,
      arbiter!,
      acceptance as bigint,
      submission as bigint,
      review as bigint,
      arbitration as bigint,
      draft.title,
    ],
  };
}

/** Extracts the canonical address emitted by the configured factory, if present. */
export function decodeCreatedEscrow(logs: readonly Log[], factory: Address) {
  const factoryLogs = logs.filter((log) => log.address.toLowerCase() === factory.toLowerCase());
  const event = parseEventLogs({
    abi: escrowFactoryAbi,
    logs: factoryLogs,
    eventName: "EscrowCreated",
    strict: false,
  })[0];
  return event?.args.escrowAddress;
}

/** Keeps simulation and wallet failures actionable while retaining unknown details for support. */
export function translateCreationError(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  if (/UserRejectedRequest|user rejected|rejected the request/i.test(detail))
    return "La firma fue rechazada en la wallet.";
  return (
    translateKnownContractError(detail) ??
    "No se pudo crear el escrow. Revisá los datos e intentá nuevamente."
  );
}
