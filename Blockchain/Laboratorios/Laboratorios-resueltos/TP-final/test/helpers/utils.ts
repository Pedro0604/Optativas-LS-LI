import { ethers } from "./globals.js";

/**
 * Obtiene la length del string en bytes, usando ethers.toUtf8Bytes
 * @param str String a obtener su length
 * @returns Length como BigInt
 */
export function getUtf8ByteLength(str: string): bigint {
  return BigInt(ethers.toUtf8Bytes(str).length);
}
