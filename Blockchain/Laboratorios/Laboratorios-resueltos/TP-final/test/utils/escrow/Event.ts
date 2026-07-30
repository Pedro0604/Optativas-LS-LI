/**
 * Eventos desde el estado PendingAcceptance
 */
const eventsFromPendingAcceptance = {
  /**
   * El escrow fue aceptado por el worker
   *
   * Transiciona a estado PendingSubmission
   *
   * @param submissionDeadline Fecha límite de entrega de trabajo
   */
  EscrowAccepted: "EscrowAccepted",

  /**
   * El período de aceptación expiró
   *
   * Transiciona a estado AcceptanceExpired
   *
   */
  AcceptanceExpire: "AcceptanceExpired",

  /**
   * El escrow fue cancelado por el owner antes de la aceptación
   *
   * Transiciona a estado EscrowCancelled
   */
  EscrowCancelle: "EscrowCancelled",
} as const;

/**
 * Eventos desde el estado PendingSubmission
 */
const eventsFromPendingSubmission = {
  /**
   * El trabajo fue entregado por el worker
   *
   * Transiciona a estado PendingReview
   *
   * @param reviewDeadline Fecha límite de revisión del trabajo
   */
  WorkSubmitted: "WorkSubmitted",

  /**
   * El período de entrega del trabajo expiró
   *
   * Transiciona a estado SubmissionExpired
   */
  SubmissionExpire: "SubmissionExpired",
} as const;

/**
 * Eventos desde el estado PendingReview
 */
const eventsFromPendingReview = {
  /**
   * El trabajo fue aprobado por el owner
   *
   * Transiciona a estado WorkApproved
   */
  WorkApprove: "WorkApproved",

  /**
   * El período de revisión del trabajo expiró
   *
   * Transiciona a estado ReviewExpired
   */
  ReviewExpire: "ReviewExpired",

  /**
   * El trabajo fue disputado por el owner
   *
   * Transiciona a estado PendingArbitration
   *
   * @param arbitrationDeadline Fecha límite de resolución de la disputa
   */
  DisputeOpened: "DisputeOpened",
} as const;

/**
 * Eventos desde el estado PendingArbitration
 */
const eventsFromPendingArbitration = {
  /**
   * La disputa fue resuelta
   *
   * Transiciona a estado DisputeResolved
   *
   * @param ownerAmount Cantidad correspondiente al owner en wei
   * @param workerAmount Cantidad correspondiente al worker en wei
   */
  DisputeResolved: "DisputeResolved",

  /**
   * El período de resolución de la disputa expiró
   *
   * Transiciona a estado ArbitrationExpired
   */
  ArbitrationExpire: "ArbitrationExpired",
} as const;

/**
 * Representación de los eventos definidos en los contratos de Solidity.
 *
 * @warning Si se agregan, elimina o modifican errores en el contrato se debería
 * modificar unicamente acá, si está bien utilizado.
 */
export const Event = {
  /**
   * Se emite cuando se crea un contrato
   * @param owner Dueño del nuevo contrato
   * @param worker Trabajador del nuevo contrato
   * @param arbiter Arbitro del nuevo contrato
   * @param escrowAddress La dirección del nuevo contrato
   * @param amount Cantidad de ETH en wei del nuevo contrato
   * @param acceptanceDuration Duración del período de aceptación del escrow en segundos
   * @param submissionDuration Duración del período de elaboración del trabajo en segundos
   * @param reviewDuration Duración del período de revisión del trabajo en segundos
   * @param arbitrationDuration Duración del período de arbitraje en segundos
   */
  EscrowCreated: "EscrowCreated",

  /**
   * Se retiraron fondos del contrato
   *
   * @param account Cuenta que retira fondos (del worker o del owner)
   * @param amount Cantidad de fondos retirados en wei
   */
  FundsWithdrawn: "FundsWithdrawn",

  ...eventsFromPendingAcceptance,
  ...eventsFromPendingSubmission,
  ...eventsFromPendingReview,
  ...eventsFromPendingArbitration,
} as const;

/**
 * Tipo que representa todos los valores de Event
 */
export type Event = (typeof Event)[keyof typeof Event];
