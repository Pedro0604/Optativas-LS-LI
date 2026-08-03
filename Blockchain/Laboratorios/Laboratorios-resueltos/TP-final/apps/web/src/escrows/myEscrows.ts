import { escrowFactoryAbi } from "@escrow/contracts";
import type { Address, PublicClient } from "viem";
import { fetchEscrowPage, type DiscoveryPage } from "./escrowPage";
import { LIST_POLL_INTERVAL_MS, visiblePollingInterval } from "../queryResilience";

export const escrowRoles = ["owner", "worker", "arbiter"] as const;
export type EscrowRole = (typeof escrowRoles)[number];
export type MyEscrowsSearch = { role: EscrowRole; page: number };

const registryByRole = {
  owner: { count: "getEscrowCountByOwner", registry: "escrowsByOwner" },
  worker: { count: "getEscrowCountByWorker", registry: "escrowsByWorker" },
  arbiter: { count: "getEscrowCountByArbiter", registry: "escrowsByArbiter" },
} as const;

export function validateMyEscrowsSearch(search: Record<string, unknown>): MyEscrowsSearch {
  const role = escrowRoles.includes(search.role as EscrowRole)
    ? (search.role as EscrowRole)
    : "owner";
  const rawPage = typeof search.page === "number" ? search.page : Number(search.page ?? 1);
  return { role, page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1 };
}

/** Reads only one participant registry page, newest first, at a single block. */
export async function fetchMyEscrows(
  client: PublicClient,
  factory: Address,
  account: Address,
  role: EscrowRole,
  page: number,
): Promise<DiscoveryPage> {
  const registry = registryByRole[role];
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
            functionName: registry.count,
            args: [account],
          } as never),
        ),
      addresses: async (pageClient, pageFactory, indexes, blockNumber) =>
        (await pageClient.multicall({
          allowFailure: false,
          blockNumber,
          contracts: indexes.map((index) => ({
            address: pageFactory,
            abi: escrowFactoryAbi,
            functionName: registry.registry,
            args: [account, index],
          })),
        })) as Address[],
    },
    undefined,
    account,
  );
}

export function myEscrowsQuery(
  client: PublicClient,
  factory: Address,
  account: Address,
  role: EscrowRole,
  page: number,
) {
  return {
    queryKey: ["my-escrows", account, role, page] as const,
    queryFn: () => fetchMyEscrows(client, factory, account, role, page),
    refetchInterval: visiblePollingInterval(LIST_POLL_INTERVAL_MS),
    refetchIntervalInBackground: false,
  };
}
