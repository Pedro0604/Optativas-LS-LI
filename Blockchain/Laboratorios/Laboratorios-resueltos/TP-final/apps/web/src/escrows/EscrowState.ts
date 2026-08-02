/**
 * Representación numérica del enum `Escrow.State` de Solidity.
 *
 * Si ese enum cambia, este objeto y `escrowStateMetadata` deben actualizarse juntos.
 */
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

/** Identifica cuál de los cuatro plazos corresponde a una fase del escrow. */
export const DeadlineKind = {
  Acceptance: "acceptance",
  Submission: "submission",
  Review: "review",
  Arbitration: "arbitration",
} as const;

export type DeadlineKind = (typeof DeadlineKind)[keyof typeof DeadlineKind];
export type StateFilter = "all" | EscrowState;

/** Plazos registrados por el escrow para cada fase de su ciclo de vida. */
export type EscrowDeadlines = Readonly<Record<DeadlineKind, bigint>>;

type StateMetadata = { label: string; deadlineKind: DeadlineKind };

/** Catálogo exhaustivo con la etiqueta visible y el plazo asociado a cada estado. */
export const escrowStateMetadata = {
  [EscrowState.PendingAcceptance]: {
    label: "Pendiente de aceptación",
    deadlineKind: DeadlineKind.Acceptance,
  },
  [EscrowState.PendingSubmission]: {
    label: "Pendiente de entrega",
    deadlineKind: DeadlineKind.Submission,
  },
  [EscrowState.PendingReview]: {
    label: "Pendiente de revisión",
    deadlineKind: DeadlineKind.Review,
  },
  [EscrowState.PendingArbitration]: {
    label: "En arbitraje",
    deadlineKind: DeadlineKind.Arbitration,
  },
  [EscrowState.EscrowCancelled]: {
    label: "Cancelado",
    deadlineKind: DeadlineKind.Acceptance,
  },
  [EscrowState.AcceptanceExpired]: {
    label: "Aceptación vencida",
    deadlineKind: DeadlineKind.Acceptance,
  },
  [EscrowState.SubmissionExpired]: {
    label: "Entrega vencida",
    deadlineKind: DeadlineKind.Submission,
  },
  [EscrowState.WorkApproved]: {
    label: "Trabajo aprobado",
    deadlineKind: DeadlineKind.Review,
  },
  [EscrowState.ReviewExpired]: {
    label: "Revisión vencida",
    deadlineKind: DeadlineKind.Review,
  },
  [EscrowState.DisputeResolved]: {
    label: "Disputa resuelta",
    deadlineKind: DeadlineKind.Arbitration,
  },
  [EscrowState.ArbitrationExpired]: {
    label: "Arbitraje vencido",
    deadlineKind: DeadlineKind.Arbitration,
  },
} satisfies Record<EscrowState, StateMetadata>;

export const escrowStates = Object.values(EscrowState);

/** Convierte un valor externo a `EscrowState`; lanza un error si no pertenece al enum. */
export function parseEscrowState(value: unknown): EscrowState {
  const state = typeof value === "number" ? value : Number(value);
  if (Number.isInteger(state) && escrowStates.includes(state as EscrowState)) {
    return state as EscrowState;
  }
  throw new Error(`Estado de escrow desconocido: ${String(value)}`);
}

/**
 * Devuelve el plazo de la fase asociada al estado.
 * En estados terminales conserva el plazo de la fase que produjo el resultado.
 */
export function phaseDeadlineFor(state: EscrowState, deadlines: EscrowDeadlines): bigint {
  return deadlines[escrowStateMetadata[state].deadlineKind];
}
