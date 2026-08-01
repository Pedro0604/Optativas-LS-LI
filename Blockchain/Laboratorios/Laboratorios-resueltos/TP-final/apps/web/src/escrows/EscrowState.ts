/** Representación numérica del enum `Escrow.State` de `Escrow.sol`. */
export const EscrowState = {
  PendingAcceptance: 0,
  PendingSubmission: 1,
  PendingReview: 2,
  PendingArbitration: 3,
  EscrowCancelled: 4,
  AcceptanceExpired: 5,
  SubmissionExpired: 6,
  WorkApproved: 7,
  ReviewExpired: 8,
  DisputeResolved: 9,
  ArbitrationExpired: 10,
} as const;

export type EscrowState = (typeof EscrowState)[keyof typeof EscrowState];
export type DeadlineKind = "acceptance" | "submission" | "review" | "arbitration";
export type StateFilter = "all" | EscrowState;
export type EscrowDeadlines = Readonly<Record<DeadlineKind, bigint>>;

type StateMetadata = { label: string; deadlineKind: DeadlineKind };

export const escrowStateMetadata = {
  [EscrowState.PendingAcceptance]: { label: "Pendiente de aceptación", deadlineKind: "acceptance" },
  [EscrowState.PendingSubmission]: { label: "Pendiente de entrega", deadlineKind: "submission" },
  [EscrowState.PendingReview]: { label: "Pendiente de revisión", deadlineKind: "review" },
  [EscrowState.PendingArbitration]: { label: "En arbitraje", deadlineKind: "arbitration" },
  [EscrowState.EscrowCancelled]: { label: "Cancelado", deadlineKind: "acceptance" },
  [EscrowState.AcceptanceExpired]: { label: "Aceptación vencida", deadlineKind: "acceptance" },
  [EscrowState.SubmissionExpired]: { label: "Entrega vencida", deadlineKind: "submission" },
  [EscrowState.WorkApproved]: { label: "Trabajo aprobado", deadlineKind: "review" },
  [EscrowState.ReviewExpired]: { label: "Revisión vencida", deadlineKind: "review" },
  [EscrowState.DisputeResolved]: { label: "Disputa resuelta", deadlineKind: "arbitration" },
  [EscrowState.ArbitrationExpired]: { label: "Arbitraje vencido", deadlineKind: "arbitration" },
} satisfies Record<EscrowState, StateMetadata>;

export const escrowStates = Object.values(EscrowState);

export function parseEscrowState(value: unknown): EscrowState {
  const state = typeof value === "number" ? value : Number(value);
  if (Number.isInteger(state) && escrowStates.includes(state as EscrowState)) {
    return state as EscrowState;
  }
  throw new Error(`Estado de escrow desconocido: ${String(value)}`);
}

export function phaseDeadlineFor(state: EscrowState, deadlines: EscrowDeadlines): bigint {
  return deadlines[escrowStateMetadata[state].deadlineKind];
}
