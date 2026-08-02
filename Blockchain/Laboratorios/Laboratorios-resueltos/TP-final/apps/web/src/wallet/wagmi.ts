import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia } from "viem/chains";
import type { AppConfig } from "../config";

/** Wallet transport is used for signatures and writes only; public reads use runtime.publicClient. */
export function createWalletConfig(config: AppConfig) {
  return createConfig({
    chains: [sepolia],
    connectors: [injected({ shimDisconnect: true })],
    transports: { [sepolia.id]: http(config.rpcUrl) },
    multiInjectedProviderDiscovery: true,
  });
}
