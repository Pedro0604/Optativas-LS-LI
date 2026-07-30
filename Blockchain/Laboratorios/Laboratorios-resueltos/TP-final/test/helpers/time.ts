import { networkHelpers } from "./globals.js";

/**
 * Configura el timestamp del próximo bloque exactamente en el deadline indicado sin minarlo.
 *
 * @param deadlinePromise Promesa que resuelve al deadline en segundos.
 * @returns El deadline resuelto.
 */
export async function setNextBlockAt(
  deadlinePromise: Promise<bigint>,
): Promise<bigint> {
  const deadline = await deadlinePromise;

  await networkHelpers.time.setNextBlockTimestamp(deadline);

  return deadline;
}

/**
 * Configura el timestamp del próximo bloque una cantidad determinada de
 * segundos antes del deadline indicado sin minarlo.
 *
 * @param deadlinePromise Promesa que resuelve al deadline en segundos.
 * @param secondsBefore Cantidad de segundos anteriores al deadline. Por defecto, 1 segundo.
 * @returns El deadline original resuelto, sin restar `secondsBefore`.
 */
export async function setNextBlockBefore(
  deadlinePromise: Promise<bigint>,
  secondsBefore = 1n,
): Promise<bigint> {
  const deadline = await deadlinePromise;

  await networkHelpers.time.setNextBlockTimestamp(deadline - secondsBefore);

  return deadline;
}
