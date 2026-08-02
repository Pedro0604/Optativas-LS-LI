import { escrowAbi } from "@escrow/contracts";
import type { Address, PublicClient } from "viem";
import {
  parseEscrowState,
  phaseDeadlineFor,
  type EscrowDeadlines,
  type EscrowState,
  type StateFilter,
} from "./EscrowState";

export const PAGE_SIZE = 20;

export type EscrowSummary = {
  address: Address;
  title: string;
  amount: bigint;
  state: EscrowState;
  owner: Address;
  worker: Address;
  arbiter: Address;
  deadline: bigint;
};

export type EscrowItem =
  | { kind: "success"; address: Address; summary: EscrowSummary }
  | { kind: "error"; address: Address; error: string };

export type DiscoveryPage = {
  count: number;
  page: number;
  pageCount: number;
  blockTime: bigint;
  items: EscrowItem[];
};

export type EscrowRegistry = {
  count: (client: PublicClient, factory: Address) => Promise<number>;
  addresses: (
    client: PublicClient,
    factory: Address,
    indexes: bigint[],
    blockNumber: bigint,
  ) => Promise<Address[]>;
};

/** Calcula una página desde el final del registro para mostrar primero los escrows más nuevos. */
export function reverseIndexes(count: number, page: number, size = PAGE_SIZE): bigint[] {
  const start = count - 1 - (page - 1) * size;
  return Array.from({ length: Math.max(0, Math.min(size, start + 1)) }, (_, offset) =>
    BigInt(start - offset),
  );
}

/** Lee una página de un registro de escrows con las multicalls fijadas al mismo bloque. */
export async function fetchEscrowPage(
  client: PublicClient,
  factory: Address,
  page: number,
  registry: EscrowRegistry,
  state?: StateFilter,
): Promise<DiscoveryPage> {
  const count = await registry.count(client, factory);
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const blockNumber = await client.getBlockNumber();
  const blockPromise = client.getBlock({ blockNumber });

  const addresses = await registry.addresses(
    client,
    factory,
    reverseIndexes(count, safePage),
    blockNumber,
  );

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

  const items = addresses
    .map((address, itemIndex): EscrowItem => {
      const values = details.slice(
        itemIndex * functions.length,
        (itemIndex + 1) * functions.length,
      );

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
    })
    .filter(
      (item) =>
        state === undefined ||
        state === "all" ||
        item.kind === "error" ||
        item.summary.state === state,
    );
  const block = await blockPromise;
  return { count, page: safePage, pageCount, blockTime: block.timestamp, items };
}
