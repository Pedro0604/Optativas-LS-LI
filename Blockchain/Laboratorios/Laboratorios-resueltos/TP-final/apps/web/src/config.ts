import { getAddress, isAddress } from "viem";
import { sepoliaChain } from "@escrow/contracts";

export type AppConfig = Readonly<{
  rpcUrl: string;
  chainId: typeof sepoliaChain.id;
  factoryAddress: `0x${string}`;
  explorerUrl: string;
}>;

export class ConfigurationError extends Error {}

export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  const errors: string[] = [];
  let rpc: URL | undefined;
  let explorer: URL | undefined;
  try {
    rpc = new URL(env.VITE_SEPOLIA_RPC_URL ?? "");
  } catch {
    errors.push("VITE_SEPOLIA_RPC_URL debe ser una URL HTTP(S) válida.");
  }
  try {
    explorer = new URL(env.VITE_EXPLORER_URL ?? "");
  } catch {
    errors.push("VITE_EXPLORER_URL debe ser una URL HTTP(S) válida.");
  }

  if (rpc && !["http:", "https:"].includes(rpc.protocol))
    errors.push("VITE_SEPOLIA_RPC_URL debe usar HTTP(S).");

  if (explorer && !["http:", "https:"].includes(explorer.protocol))
    errors.push("VITE_EXPLORER_URL debe usar HTTP(S).");

  if (env.VITE_CHAIN_ID !== String(sepoliaChain.id))
    errors.push(`VITE_CHAIN_ID debe ser ${sepoliaChain.id} (Sepolia).`);

  if (!isAddress(env.VITE_FACTORY_ADDRESS ?? ""))
    errors.push("VITE_FACTORY_ADDRESS debe ser una dirección Ethereum válida.");

  if (errors.length) throw new ConfigurationError(errors.join(" "));

  return {
    rpcUrl: rpc!.toString(),
    chainId: sepoliaChain.id,
    factoryAddress: getAddress(env.VITE_FACTORY_ADDRESS!) as `0x${string}`,
    explorerUrl: explorer!.toString().replace(/\/$/, ""),
  };
}
