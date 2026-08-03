export type TransactionHash = `0x${string}`;
export type PendingTransaction = {
  escrow: string;
  hash: TransactionHash;
  submittedAt: number;
};

const pendingStorageKey = "pacto:pending-transactions:v1";
export const PROLONGED_TRANSACTION_MS = 60_000;

const knownRevertPattern =
  /OnlyWorkerAllowed|OnlyOwnerAllowed|OnlyArbiterAllowed|InvalidState|DeadlineAlreadyExpired|DeadlineNotExpiredYet|ZeroDuration|NoEthProvided|ZeroAddress|CannotHireYourself|ArbiterCannotParticipate|EmptyString|StringTooLong|WorkerAmountExceedsEscrow|NoFundsToWithdraw|WithdrawalFailed/i;
const pendingEscrows = new Set<string>();

export type TransactionState =
  | { kind: "idle" }
  | { kind: "simulating" }
  | { kind: "wallet" }
  | { kind: "submitted"; hash: TransactionHash }
  | { kind: "prolonged"; hash: TransactionHash }
  | { kind: "replaced"; hash: TransactionHash; replacedHash: TransactionHash }
  | { kind: "confirmed"; hash: TransactionHash }
  | { kind: "rejected"; message: string; detail: string; hash?: TransactionHash }
  | { kind: "reverted"; message: string; detail: string; hash?: TransactionHash }
  | { kind: "unknown-failure"; message: string; detail: string; hash?: TransactionHash };

type RunTransactionInput<Request> = {
  simulate: () => Promise<{ request: Request }>;
  write: (request: Request) => Promise<TransactionHash>;
  wait: (hash: TransactionHash) => Promise<{ status: "success" | "reverted" }>;
  onState?: (state: TransactionState) => void;
};

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function readPendingTransactions(): PendingTransaction[] {
  try {
    const value = JSON.parse(storage()?.getItem(pendingStorageKey) ?? "[]") as unknown;
    return Array.isArray(value) ? (value as PendingTransaction[]) : [];
  } catch {
    return [];
  }
}

function writePendingTransactions(items: PendingTransaction[]) {
  const target = storage();
  if (!target) return;
  if (items.length) target.setItem(pendingStorageKey, JSON.stringify(items));
  else target.removeItem(pendingStorageKey);
}

function rememberPending(escrow: string, hash: TransactionHash) {
  const others = readPendingTransactions().filter(
    (item) => item.escrow.toLowerCase() !== escrow.toLowerCase(),
  );
  writePendingTransactions([...others, { escrow, hash, submittedAt: Date.now() }]);
}

function forgetPending(hash: TransactionHash) {
  writePendingTransactions(readPendingTransactions().filter((item) => item.hash !== hash));
}

export async function recoverPendingTransactions(
  receipt: (hash: TransactionHash) => Promise<{ status: "success" | "reverted" } | null>,
) {
  const recovered = await Promise.all(
    readPendingTransactions().map(async (item) => ({ item, receipt: await receipt(item.hash) })),
  );
  writePendingTransactions(recovered.filter(({ receipt }) => !receipt).map(({ item }) => item));
  return recovered;
}

function errorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function translateTransactionError(error: unknown) {
  const detail = errorDetail(error);
  if (/OnlyWorkerAllowed/i.test(detail)) return "Solo el worker puede aceptar este escrow.";
  if (/InvalidState/i.test(detail))
    return "El escrow ya no está en el estado requerido para esta acción.";
  if (/DeadlineAlreadyExpired/i.test(detail)) return "El plazo de esta acción ya venció.";
  if (/DeadlineNotExpiredYet/i.test(detail)) return "El plazo todavía no venció.";
  if (/OnlyOwnerAllowed/i.test(detail)) return "Solo el owner puede realizar esta acción.";
  if (/OnlyArbiterAllowed/i.test(detail)) return "Solo el árbitro puede realizar esta acción.";
  if (/ZeroDuration/i.test(detail)) return "La duración debe ser mayor a cero.";
  if (/NoEthProvided/i.test(detail)) return "El escrow debe financiarse con ETH.";
  if (/ZeroAddress/i.test(detail)) return "Las direcciones de participantes no pueden ser cero.";
  if (/CannotHireYourself/i.test(detail)) return "El owner no puede ser el worker.";
  if (/ArbiterCannotParticipate/i.test(detail))
    return "El árbitro no puede participar como owner ni worker.";
  if (/EmptyString/i.test(detail)) return "El texto obligatorio no puede estar vacío.";
  if (/StringTooLong/i.test(detail)) return "El texto supera la longitud permitida.";
  if (/WorkerAmountExceedsEscrow/i.test(detail))
    return "El monto asignado al worker excede los fondos del escrow.";
  if (/NoFundsToWithdraw/i.test(detail)) return "No hay fondos disponibles para retirar.";
  if (/WithdrawalFailed/i.test(detail)) return "No se pudieron transferir los fondos.";
  return "No se pudo completar la transacción. Intentá nuevamente.";
}

function failureState(error: unknown, hash?: TransactionHash): TransactionState {
  const detail = errorDetail(error);
  const replacement = (error as { replacement?: { hash?: TransactionHash } } | null)?.replacement
    ?.hash;
  if (hash && replacement) return { kind: "replaced", hash: replacement, replacedHash: hash };
  if (/UserRejectedRequest|user rejected|rejected the request/i.test(detail))
    return { kind: "rejected", message: "La firma fue rechazada en la wallet.", detail };
  if (/revert|reverted/i.test(detail) || knownRevertPattern.test(detail))
    return { kind: "reverted", message: translateTransactionError(error), detail, hash };
  return { kind: "unknown-failure", message: translateTransactionError(error), detail, hash };
}

/** Shared simulation → signature → receipt flow. Consumers own query invalidation after confirmation. */
export async function runTransaction<Request>(
  input: RunTransactionInput<Request>,
): Promise<TransactionState> {
  let hash: TransactionHash | undefined;
  try {
    input.onState?.({ kind: "simulating" });
    const simulation = await input.simulate();
    input.onState?.({ kind: "wallet" });
    hash = await input.write(simulation.request);
    input.onState?.({ kind: "submitted", hash });
    const prolongedTimer = setTimeout(
      () => input.onState?.({ kind: "prolonged", hash: hash! }),
      PROLONGED_TRANSACTION_MS,
    );
    const receipt = await input.wait(hash).finally(() => clearTimeout(prolongedTimer));
    if (receipt.status !== "success") {
      const state: TransactionState = {
        kind: "reverted",
        hash,
        message: "La transacción fue incluida, pero se revirtió on-chain.",
        detail: "Receipt status: reverted",
      };
      input.onState?.(state);
      return state;
    }
    const state: TransactionState = { kind: "confirmed", hash };
    input.onState?.(state);
    return state;
  } catch (error) {
    const state = failureState(error, hash);
    input.onState?.(state);
    return state;
  }
}

export function isTransactionPending(state: TransactionState) {
  return (
    state.kind === "simulating" ||
    state.kind === "wallet" ||
    state.kind === "submitted" ||
    state.kind === "prolonged"
  );
}

export function hasTrackedTransaction(
  state: TransactionState,
): state is Extract<TransactionState, { hash: TransactionHash }> {
  return state.kind === "submitted" || state.kind === "prolonged" || state.kind === "replaced";
}

/** Locks only one escrow while its simulation, signature, or receipt is in flight. */
export async function runEscrowTransaction<Request>(
  escrow: string,
  input: RunTransactionInput<Request>,
): Promise<TransactionState> {
  const key = escrow.toLowerCase();
  if (pendingEscrows.has(key))
    return {
      kind: "unknown-failure",
      message: "Ya hay una transacción pendiente para este escrow.",
      detail: "Duplicate escrow transaction prevented",
    };
  pendingEscrows.add(key);
  try {
    const result = await runTransaction({
      ...input,
      onState: (state) => {
        if (state.kind === "submitted" || state.kind === "prolonged")
          rememberPending(escrow, state.hash);
        if (state.kind === "replaced") {
          forgetPending(state.replacedHash);
          rememberPending(escrow, state.hash);
        }
        if ((state.kind === "confirmed" || state.kind === "reverted") && state.hash)
          forgetPending(state.hash);
        input.onState?.(state);
      },
    });
    return result;
  } finally {
    pendingEscrows.delete(key);
  }
}

export function isEscrowTransactionPending(escrow: string) {
  return pendingEscrows.has(escrow.toLowerCase());
}
