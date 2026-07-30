/**
 * Representación de los errores de los contratos de Solidity.
 *
 * @warning Si se agregan, elimina o modifican errores en el contrato se debería
 * modificar unicamente acá, si está bien utilizado.
 */
export const Error = {
  InvalidState: "InvalidState",
  OnlyOwnerAllowed: "OnlyOwnerAllowed",
  OnlyWorkerAllowed: "OnlyWorkerAllowed",
  OnlyAllowedAfterTime: "OnlyAllowedAfterTime",
  OnlyAllowedBeforeTime: "OnlyAllowedBeforeTime",
  NoEthProvided: "NoEthProvided",
  ZeroAddress: "ZeroAddress",
  CannotHireYourself: "CannotHireYourself",
  ZeroDuration: "ZeroDuration",
  EmptyTitle: "EmptyTitle",
  TitleTooLong: "TitleTooLong",
} as const;

/**
 * Tipo que representa todos los valores de Error
 */
export type Error = (typeof Error)[keyof typeof Error];
