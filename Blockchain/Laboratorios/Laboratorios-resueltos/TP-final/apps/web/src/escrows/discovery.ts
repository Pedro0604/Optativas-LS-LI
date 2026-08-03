import { escrowFactoryAbi } from "@escrow/contracts";
import {
  createPublicClient,
  defineChain,
  formatEther,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { sepolia } from "viem/chains";
import type { AppConfig } from "../config";
import { LIST_POLL_INTERVAL_MS, visiblePollingInterval } from "../queryResilience";
import type { StateFilter } from "./EscrowState";
import { fetchEscrowPage } from "./escrowPage";

export {
  PAGE_SIZE,
  reverseIndexes,
  type DiscoveryPage,
  type EscrowItem,
  type EscrowSummary,
} from "./escrowPage";

export function createSepoliaClient(config: AppConfig) {
  const chain = defineChain({ ...sepolia, rpcUrls: { default: { http: [config.rpcUrl] } } });
  return createPublicClient({ chain, transport: http(config.rpcUrl) });
}

/** Lee una página del registro público de escrows. */
export async function fetchDiscovery(
  client: PublicClient,
  factory: Address,
  page: number,
  state: StateFilter,
  account?: Address,
) {
  return fetchEscrowPage(
    client,
    factory,
    page,
    {
      count: async (pageClient, pageFactory) =>
        Number(
          await pageClient.readContract({
            address: pageFactory,
            abi: escrowFactoryAbi,
            functionName: "getEscrowCount",
          }),
        ),
      addresses: async (pageClient, pageFactory, indexes, blockNumber) =>
        (await pageClient.multicall({
          allowFailure: false,
          blockNumber,
          contracts: indexes.map((index) => ({
            address: pageFactory,
            abi: escrowFactoryAbi,
            functionName: "allEscrows",
            args: [index],
          })),
        })) as unknown as Address[],
    },
    state,
    account,
  );
}

export const displayEth = (amount: bigint) => `${formatEther(amount)} ETH`;

export function discoveryQuery(
  client: PublicClient,
  factory: Address,
  page: number,
  state: StateFilter,
  account?: Address,
) {
  return {
    queryKey: ["escrows", account ?? "disconnected", page, state] as const,
    queryFn: () => fetchDiscovery(client, factory, page, state, account),
    refetchInterval: visiblePollingInterval(LIST_POLL_INTERVAL_MS),
    refetchIntervalInBackground: false,
  };
}
