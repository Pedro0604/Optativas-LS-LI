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
  PendingAcceptance: 0n,
  Active: 1n,
  PendingReview: 2n,
  Disputed: 3n,

  // Estados finales
  Cancelled: 4n,
  AcceptanceExpired: 5n,
  DeliveryExpired: 6n,
  Approved: 7n,
  ReviewExpired: 8n,
  Resolved: 9n,
  ArbitrationExpired: 10n,
} as const;

/**
 * Tipo que representa todos los valores de State
 */
export type State = (typeof State)[keyof typeof State];
