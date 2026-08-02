import type { Address } from "viem";
import { sepolia } from "viem/chains";

export const SEPOLIA_CHAIN_ID = sepolia.id;
/** Lets a deferred write request open the existing wallet selector without coupling feature modules to wagmi. */
export const walletConnectionRequestEvent = "escrow:request-wallet-connection";

export function canWrite(chainId: number | undefined) {
  return chainId === SEPOLIA_CHAIN_ID;
}

export function shortAddress(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
