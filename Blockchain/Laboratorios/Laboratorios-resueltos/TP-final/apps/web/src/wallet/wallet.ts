import type { Address } from "viem";
import { sepolia } from "viem/chains";

export const SEPOLIA_CHAIN_ID = sepolia.id;

export function canWrite(chainId: number | undefined) {
  return chainId === SEPOLIA_CHAIN_ID;
}

export function shortAddress(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
