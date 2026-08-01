import { ethers } from "./globals.js";

/**
 * Obtiene la length del string en bytes, usando ethers.toUtf8Bytes
 * @param str String a obtener su length
 * @returns Length como BigInt
 */
export function getUtf8ByteLength(str: string): bigint {
  return BigInt(ethers.toUtf8Bytes(str).length);
}

/**
 * Obtiene la cantidad del owner y worker para el porcentaje indicado
 *
 * @param amountInWei Cantidad total del contrato
 * @param workerPercent Porcentaje para el worker (de 0 a 100)
 * @returns [workerAmount, ownerAmount]
 */
export function getWorkerAndOwnerAmounts(
  amountInWei: bigint,
  workerPercent = 70n,
): [workerAmount: bigint, ownerAmount: bigint] {
  if (workerPercent < 0n || workerPercent > 100n) {
    throw new RangeError("workerPercent tiene que estar entre 0 y 100");
  }

  const ownerAmount = (amountInWei * (100n - workerPercent)) / 100n;

  return [amountInWei - ownerAmount, ownerAmount];
}
