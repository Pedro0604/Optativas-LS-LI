import { networkHelpers } from "./globals.js";

/**
 * Configura el timestamp del próximo bloque aplicando un desplazamiento
 * respecto del deadline indicado, sin minar el bloque.
 *
 * @param deadlinePromise Promesa que resuelve al deadline en segundos.
 * @param offset Desplazamiento en segundos respecto del deadline. Puede ser
 * positivo, negativo o cero.
 * @returns El deadline original resuelto, sin aplicar el desplazamiento.
 */
async function setNextBlockRelativeTo(
  deadlinePromise: Promise<bigint>,
  offset = 0n,
): Promise<bigint> {
  const deadline = await deadlinePromise;

  await networkHelpers.time.setNextBlockTimestamp(deadline + offset);

  return deadline;
}

/**
 * Configura el timestamp del próximo bloque exactamente en el deadline indicado sin minarlo.
 *
 * @param deadlinePromise Promesa que resuelve al deadline en segundos.
 * @returns El deadline resuelto.
 */
export function setNextBlockAt(
  deadlinePromise: Promise<bigint>,
): Promise<bigint> {
  return setNextBlockRelativeTo(deadlinePromise);
}

/**
 * Configura el timestamp del próximo bloque una cantidad determinada de
 * segundos antes del deadline indicado sin minarlo.
 *
 * @param deadlinePromise Promesa que resuelve al deadline en segundos.
 * @param secondsBefore Cantidad de segundos anteriores al deadline. Por defecto, 1 segundo.
 * @returns El deadline original resuelto, sin restar `secondsBefore`.
 */
export function setNextBlockBefore(
  deadlinePromise: Promise<bigint>,
  secondsBefore = 1n,
): Promise<bigint> {
  if (secondsBefore < 0n) {
    throw new RangeError("secondsBefore debe ser mayor o igual a cero");
  }

  return setNextBlockRelativeTo(deadlinePromise, -secondsBefore);
}

/**
 * Configura el timestamp del próximo bloque una cantidad determinada de
 * segundos después del deadline indicado sin minarlo.
 *
 * @param deadlinePromise Promesa que resuelve al deadline en segundos.
 * @param secondsAfter Cantidad de segundos posteriores al deadline. Por defecto, 1 segundo.
 * @returns El deadline original resuelto, sin sumar `secondsAfter`.
 */
export function setNextBlockAfter(
  deadlinePromise: Promise<bigint>,
  secondsAfter = 1n,
): Promise<bigint> {
  if (secondsAfter < 0n) {
    throw new RangeError("secondsAfter debe ser mayor o igual a cero");
  }
  return setNextBlockRelativeTo(deadlinePromise, secondsAfter);
}
