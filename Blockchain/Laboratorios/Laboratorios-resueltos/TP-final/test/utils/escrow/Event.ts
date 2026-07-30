/**
 * Representación de los eventos definidos en los contratos de Solidity.
 *
 * @warning Si se agregan, elimina o modifican errores en el contrato se debería
 * modificar unicamente acá, si está bien utilizado.
 */
export const Event = {
  EscrowCreated: "EscrowCreated",
  // Eventos desde el estado PendingAcceptance
  /**
   * El Escrow fue aceptado por el worker
   *
   * Transiciona a estado Active
   */
  Accepted: "Accepted",
  /**
   * El período de aceptación expiró
   *
   * Transiciona a estado AcceptanceExpired
   */
  AcceptanceExpired: "AcceptanceExpired",
  /**
   * El escrow fue cancelado por el owner antes de la aceptación
   *
   * Transiciona a estado Cancelled
   */
  Cancelled: "Cancelled",

  // Eventos desde el estado Active
  /**
   * El trabajo fue entregado por el worker
   *
   * Transiciona a estado PendingReview
   */
  WorkSubmitted: "WorkSubmitted",
  /**
   * El período de entrega del trabajo expiró
   *
   * Transiciona a estado DeliveryExpired
   */
  DeliveryExpired: "DeliveryExpired",

  // Eventos desde el estado PendingReview
  /**
   * El trabajo fue aprobado por el owner
   *
   * Transiciona a estado Approved
   */
  WorkApproved: "WorkApproved",
  /**
   * El período de revisión del trabajo expiró
   *
   * Transiciona a estado ReviewExpired
   */
  ReviewExpired: "ReviewExpired",
  /**
   * El trabajo fue disputado por el owner
   *
   * Transiciona a estado Disputed
   */
  DisputeOpened: "DisputeOpened",

  // Eventos desde el estado Disputed
  /**
   * La disputa fue resuelta
   *
   * Transiciona a estado Resolved
   */
  DisputeResolved: "DisputeResolved",
  /**
   * El período de resolución de la disputa expiró
   *
   * Transiciona a estado ArbitrationExpired
   */
  ArbitrationExpired: "ArbitrationExpired",
  /**
   * Se retiraron fondos del contrato
   */
  FundsWithdrawn: "FundsWithdrawn",
};

/**
 * Tipo que representa todos los valores de Event
 */
export type Event = (typeof Event)[keyof typeof Event];
