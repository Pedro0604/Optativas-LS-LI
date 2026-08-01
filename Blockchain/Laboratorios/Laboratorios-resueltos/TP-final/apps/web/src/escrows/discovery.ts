import { escrowAbi, escrowFactoryAbi, sepoliaChain } from "@escrow/contracts";
import {
  createPublicClient,
  defineChain,
  formatEther,
  http,
  type Address,
  type PublicClient,
} from "viem";
import type { AppConfig } from "../config";
import {
  parseEscrowState,
  phaseDeadlineFor,
  type EscrowDeadlines,
  type EscrowState,
  type StateFilter,
} from "./EscrowState";

export const PAGE_SIZE = 20;

export type EscrowCard = {
  address: Address;
  title: string;
  amount: bigint;
  state: EscrowState;
  owner: Address;
  worker: Address;
  arbiter: Address;
  deadline: bigint;
};

export type EscrowItem = { address: Address; card?: EscrowCard; error?: string };

export type DiscoveryPage = { count: number; page: number; pageCount: number; items: EscrowItem[] };

export function reverseIndexes(count: number, page: number, size = PAGE_SIZE): bigint[] {
  const start = count - 1 - (page - 1) * size;
  return Array.from({ length: Math.max(0, Math.min(size, start + 1)) }, (_, offset) =>
    BigInt(start - offset),
  );
}

export function createSepoliaClient(config: AppConfig) {
  const chain = defineChain({ ...sepoliaChain, rpcUrls: { default: { http: [config.rpcUrl] } } });
  return createPublicClient({ chain, transport: http(config.rpcUrl) });
}

export async function fetchDiscovery(
  client: PublicClient,
  factory: Address,
  page: number,
  state: StateFilter,
): Promise<DiscoveryPage> {
  const count = Number(
    await client.readContract({
      address: factory,
      abi: escrowFactoryAbi,
      functionName: "getEscrowCount",
    }),
  );

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const blockNumber = await client.getBlockNumber();
  const indexes = reverseIndexes(count, safePage);

  const addressResults = await client.multicall({
    allowFailure: false,
    blockNumber,
    contracts: indexes.map((index) => ({
      address: factory,
      abi: escrowFactoryAbi,
      functionName: "allEscrows",
      args: [index],
    })),
  });

  const addresses = addressResults as unknown as Address[];

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

      const failed = values.find((result) => result.status === "failure");
      if (failed) return { address, error: "No se pudo leer este escrow." };

      const [
        title,
        amount,
        escrowState,
        owner,
        worker,
        arbiter,
        acceptance,
        submission,
        review,
        arbitration,
      ] = values.map((result) => (result.status === "success" ? result.result : undefined));

      let stateValue: EscrowState;
      try {
        stateValue = parseEscrowState(escrowState);
      } catch (error) {
        return { address, error: error instanceof Error ? error.message : "Estado desconocido" };
      }

      // Objeto con los 4 deadlines
      const deadlines = { acceptance, submission, review, arbitration } as EscrowDeadlines;
      // Deadline de interés para el estado actual
      const deadline = phaseDeadlineFor(stateValue, deadlines);

      return {
        address,
        card: {
          address,
          title: title as string,
          amount: amount as bigint,
          state: stateValue,
          owner: owner as Address,
          worker: worker as Address,
          arbiter: arbiter as Address,
          deadline,
        },
      };
    })
    .filter((item) => state === "all" || item.error || item.card?.state === state);
  return { count, page: safePage, pageCount, items };
}

export const shortAddress = (address: Address) => `${address.slice(0, 6)}…${address.slice(-4)}`;
export const displayEth = (amount: bigint) => `${formatEther(amount)} ETH`;

export function discoveryQuery(
  client: PublicClient,
  factory: Address,
  page: number,
  state: StateFilter,
) {
  return {
    queryKey: ["escrows", page, state] as const,
    queryFn: () => fetchDiscovery(client, factory, page, state),
  };
}
