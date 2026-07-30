/**
 * Representación del enum `Escrow.State` definido en `Escrow.sol`.
 *
 * Los valores deben coincidir exactamente con el orden de declaración del enum,
 * ya que Solidity asigna valores enteros consecutivos a partir del 0.
 *
 * @warning Si se agrega, elimina o reordena el enum `Escrow.State` de `Escrow.sol`,
 * este objeto también debe actualizarse.
 */
export const State = {
  // Estados no finales
  /**
   * El contrato fue creado y está pendiente de aceptación por parte del worker
   */
  PendingAcceptance: 0n,
  /**
   * El contrato fue aceptado por el worker y está pendiente de la entrega del trabajo por parte del worker
   */
  PendingSubmission: 1n,
  /**
   * El trabajo fue entregado y está pendiente de revisión por parte del owner
   */
  PendingReview: 2n,
  /**
   * El contrato fue disputado por el owner y está pendiente del arbitraje
   */
  PendingArbitration: 3n,

  // Estados finales
  /**
   * El contrato fue cancelado por el owner antes de ser aceptado por el worker
   */
  EscrowCancelled: 4n,
  /**
   * El período de aceptación del contrato expiró
   */
  AcceptanceExpired: 5n,
  /**
   * El período de entrega del trabajo expiró
   */
  SubmissionExpired: 6n,
  /**
   * El trabajo entregado fue aprovado por el owner
   */
  WorkApproved: 7n,
  /**
   * El período de revisión del trabajo expiró
   */
  ReviewExpired: 8n,
  /**
   * La disputa fue resuelta por el árbitro
   */
  DisputeResolved: 9n,
  /**
   * El período de arbitraje del contrato expiró
   */
  ArbitrationExpired: 10n,
} as const;

/**
 * Tipo que representa todos los valores de State
 */
export type State = (typeof State)[keyof typeof State];
