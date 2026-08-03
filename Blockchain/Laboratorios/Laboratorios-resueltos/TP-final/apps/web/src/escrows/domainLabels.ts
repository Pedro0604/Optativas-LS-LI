import type { DeadlineKind } from "./EscrowState";
import type { EscrowRole } from "./myEscrows";

export const escrowRoleNames: Record<EscrowRole, string> = {
  owner: "Owner",
  worker: "Worker",
  arbiter: "Árbitro",
};

export const escrowRoleTabLabels: Record<EscrowRole, string> = {
  owner: "Como owner",
  worker: "Como worker",
  arbiter: "Como árbitro",
};

export const escrowActionLabels = {
  accept: "Aceptar",
  cancel: "Cancelar",
  submit: "Enviar trabajo",
  approve: "Aprobar trabajo",
  dispute: "Abrir disputa",
  resolve: "Resolver disputa",
  expireAcceptance: "Finalizar aceptación vencida",
  expireSubmission: "Finalizar entrega vencida",
  expireReview: "Finalizar revisión vencida",
  expireArbitration: "Finalizar arbitraje vencido",
} as const;

export type EscrowActionLabel = (typeof escrowActionLabels)[keyof typeof escrowActionLabels];

export const deadlineLabels: Record<DeadlineKind, string> = {
  acceptance: "Aceptación",
  submission: "Entrega",
  review: "Revisión",
  arbitration: "Arbitraje",
};

export const immutableTextPrivacyWarning =
  "Este texto será público e inmutable. No incluyas datos personales, credenciales ni secretos.";

const knownContractErrors = [
  ["OnlyWorkerAllowed", "Solo el worker puede aceptar este escrow."],
  ["InvalidState", "El escrow ya no está en el estado requerido para esta acción."],
  ["DeadlineAlreadyExpired", "El plazo de esta acción ya venció."],
  ["DeadlineNotExpiredYet", "El plazo todavía no venció."],
  ["OnlyOwnerAllowed", "Solo el owner puede realizar esta acción."],
  ["OnlyArbiterAllowed", "Solo el árbitro puede realizar esta acción."],
  ["ZeroDuration", "Cada duración debe ser mayor a cero."],
  ["NoEthProvided", "El escrow debe financiarse con ETH."],
  ["ZeroAddress", "Las direcciones de participantes no pueden ser cero."],
  ["CannotHireYourself", "El owner no puede ser el worker."],
  ["ArbiterCannotParticipate", "El árbitro no puede participar como owner ni worker."],
  ["EmptyString", "El texto obligatorio no puede estar vacío."],
  ["StringTooLong", "El texto supera la longitud permitida."],
  ["WorkerAmountExceedsEscrow", "El monto asignado al worker excede los fondos del escrow."],
  ["NoFundsToWithdraw", "No hay fondos disponibles para retirar."],
  ["WithdrawalFailed", "No se pudieron transferir los fondos."],
] as const;

export function translateKnownContractError(detail: string): string | undefined {
  return knownContractErrors.find(([name]) =>
    detail.toLowerCase().includes(name.toLowerCase()),
  )?.[1];
}

export function isKnownContractError(detail: string): boolean {
  return translateKnownContractError(detail) !== undefined;
}
