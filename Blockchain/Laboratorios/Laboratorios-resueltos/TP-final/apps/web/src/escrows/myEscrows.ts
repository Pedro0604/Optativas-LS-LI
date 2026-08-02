import { escrowAbi, escrowFactoryAbi } from "@escrow/contracts";
import type { Address, PublicClient } from "viem";
import { PAGE_SIZE, reverseIndexes, type DiscoveryPage, type EscrowItem } from "./discovery";
import {
  parseEscrowState,
  phaseDeadlineFor,
  type EscrowDeadlines,
  type EscrowState,
} from "./EscrowState";

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
  const count = Number(
    await client.readContract({
      address: factory,
      abi: escrowFactoryAbi,
      functionName: registry.count,
      args: [account],
    } as never),
  );
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const blockNumber = await client.getBlockNumber();
  const blockPromise = client.getBlock({ blockNumber });
  const indexes = reverseIndexes(count, safePage);
  const addresses = (await client.multicall({
    allowFailure: false,
    blockNumber,
    contracts: indexes.map((index) => ({
      address: factory,
      abi: escrowFactoryAbi,
      functionName: registry.registry,
      args: [account, index],
    })),
  } as never)) as unknown as Address[];

  const functions = [
    "title",
    "amount",
    "state",
    "owner",
    "worker",
    "arbiter",
    "acceptanceDeadline",
    "submissionDeadline",
    "reviewDeadline",
    "arbitrationDeadline",
  ] as const;
  const details = await client.multicall({
    allowFailure: true,
    blockNumber,
    contracts: addresses.flatMap((address) =>
      functions.map((functionName) => ({ address, abi: escrowAbi, functionName })),
    ),
  });

  const items = addresses.map((address, itemIndex): EscrowItem => {
    const values = details.slice(itemIndex * functions.length, (itemIndex + 1) * functions.length);
    if (values.some((result) => result.status === "failure"))
      return { kind: "error", address, error: "No se pudo leer este escrow." };
    const [
      title,
      amount,
      state,
      owner,
      worker,
      arbiter,
      acceptance,
      submission,
      review,
      arbitration,
    ] = values.map((result) => (result.status === "success" ? result.result : undefined));
    let parsedState: EscrowState;
    try {
      parsedState = parseEscrowState(state);
    } catch (error) {
      return {
        kind: "error",
        address,
        error: error instanceof Error ? error.message : "Estado desconocido",
      };
    }
    const deadline = phaseDeadlineFor(parsedState, {
      acceptance,
      submission,
      review,
      arbitration,
    } as EscrowDeadlines);
    return {
      kind: "success",
      address,
      summary: {
        address,
        title: title as string,
        amount: amount as bigint,
        state: parsedState,
        owner: owner as Address,
        worker: worker as Address,
        arbiter: arbiter as Address,
        deadline,
      },
    };
  });
  const block = await blockPromise;
  return { count, page: safePage, pageCount, blockTime: block.timestamp, items };
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
    refetchInterval: 30_000,
  };
}
