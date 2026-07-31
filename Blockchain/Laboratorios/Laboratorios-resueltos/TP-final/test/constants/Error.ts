/**
 * Representación de los errores de los contratos de Solidity.
 *
 * @warning Si se agregan, elimina o modifican errores en el contrato se debería
 * modificar unicamente acá, si está bien utilizado.
 */
export const Error = {
  // Errores de estado y permisos
  /**
   * Estado inválido.
   *
   * @param currentState Estado actual
   * @param expectedState Estado esperado
   */
  InvalidState: "InvalidState",
  /**
   * Solo el dueño puede realizar la función
   */
  OnlyOwnerAllowed: "OnlyOwnerAllowed",
  /**
   * Solo el worker puede realizar la función
   */
  OnlyWorkerAllowed: "OnlyWorkerAllowed",
  /**
   * Solo el arbitro puede realizar la función
   */
  OnlyArbiterAllowed: "OnlyArbiterAllowed",

  // Errores de tiempo
  /**
   * Solo se permite interactuar con esta función después del tiempo definido
   *
   * @param allowedAfterTime Tiempo a partir del cual se puede interactuar con la función
   */
  OnlyAllowedAfterTime: "OnlyAllowedAfterTime",
  /**
   * Solo se permite interactuar con esta función antes del tiempo definido
   *
   * @param allowedBeforeTime Tiempo hasta el cual se puede interactuar con la función
   */
  OnlyAllowedBeforeTime: "OnlyAllowedBeforeTime",

  /**
   * La deadline ya expiró
   *
   * @param deadline Deadline expirada
   */
  DeadlineAlreadyExpired: "DeadlineAlreadyExpired",

  /**
   * La deadline aún no expiró
   *
   * @param deadline Deadline no expirada
   */
  DeadlineNotExpiredYet: "DeadlineNotExpiredYet",

  /**
   * La duración no puede ser 0
   */
  ZeroDuration: "ZeroDuration",

  // Errores de validación durante la creación
  /**
   * No se proveyó nada de ETH para realizar la creación de un nuevo contrato
   */
  NoEthProvided: "NoEthProvided",
  /**
   * La dirección indicada es la address(0)
   */
  ZeroAddress: "ZeroAddress",
  /**
   * No se puede contratarse a uno mismo
   */
  CannotHireYourself: "CannotHireYourself",
  /**
   * El árbitro no puede ser owner ni worker
   */
  ArbiterCannotParticipate: "ArbiterCannotParticipate",

  // Errores de strings
  /**
   * El string no puede estar vacío
   */
  EmptyString: "EmptyString",
  /**
   * El string no puede superar `maxLength` bytes (caracteres utf-8 ocupan 1 byte, caracteres con tilde, emojis y otros tipos de caracteres ocupan más de 1 byte)
   *
   * @param currentLength Longitud del string provisto
   * @param maxLength Longitud máxima permitida
   */
  StringTooLong: "StringTooLong",

  // Errores de resolución de disputa
  /**
   * La cantidad en wei indicada para el worker excede la cantidad del contrato
   *
   * @param workerAmount La cantidad indicada para el worker
   * @param escrowAmount La cantidad del escrow
   */
  WorkerAmountExceedsEscrow: "WorkerAmountExceedsEscrow",

  // Errores de withdraws
  /**
   * No hay fondos para retirar
   */
  NoFundsToWithdraw: "NoFundsToWithdraw",
  /**
   * El retiro falló
   */
  WithdrawalFailed: "WithdrawalFailed",
} as const;

/**
 * Tipo que representa todos los valores de Error
 */
export type Error = (typeof Error)[keyof typeof Error];
