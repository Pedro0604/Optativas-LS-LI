import { escrowAbi, escrowFactoryAbi } from "@escrow/contracts";
import { getAddress, isAddress, type Address, type PublicClient } from "viem";
import {
  EscrowState,
  escrowStateMetadata,
  parseEscrowState,
  type EscrowDeadlines,
} from "./EscrowState";

export type EscrowSnapshot = {
  address: Address;
  title: string;
  amount: bigint;
  owner: Address;
  worker: Address;
  arbiter: Address;
  state: EscrowState;
  deadlines: EscrowDeadlines;
  submissionReference: string;
  disputeReason: string;
  resolutionReason: string;
};

export type LifecycleStage = {
  key: keyof EscrowDeadlines;
  label: string;
  deadline: bigint;
  status: "completed" | "current" | "future" | "elapsed";
};

export type EscrowProjection = {
  stateLabel: string;
  terminalOutcome?: string;
  activeDeadline?: bigint;
  deadlineElapsed: boolean;
  availableActions: string[];
  timeline: LifecycleStage[];
};

const operationalStates = [
  EscrowState.PendingAcceptance,
  EscrowState.PendingSubmission,
  EscrowState.PendingReview,
  EscrowState.PendingArbitration,
] as const;

const stageDefinitions = [
  { key: "acceptance", label: "Aceptación" },
  { key: "submission", label: "Entrega" },
  { key: "review", label: "Revisión" },
  { key: "arbitration", label: "Arbitraje" },
] as const;

const stateStage = new Map<EscrowState, number>([
  [EscrowState.PendingAcceptance, 0],
  [EscrowState.EscrowCancelled, 0],
  [EscrowState.AcceptanceExpired, 0],
  [EscrowState.PendingSubmission, 1],
  [EscrowState.SubmissionExpired, 1],
  [EscrowState.PendingReview, 2],
  [EscrowState.WorkApproved, 2],
  [EscrowState.ReviewExpired, 2],
  [EscrowState.PendingArbitration, 3],
  [EscrowState.DisputeResolved, 3],
  [EscrowState.ArbitrationExpired, 3],
]);

const terminalOutcomes: Partial<Record<EscrowState, string>> = {
  [EscrowState.EscrowCancelled]: "Cancelado por el owner",
  [EscrowState.AcceptanceExpired]: "Aceptación vencida",
  [EscrowState.SubmissionExpired]: "Entrega vencida",
  [EscrowState.WorkApproved]: "Trabajo aprobado",
  [EscrowState.ReviewExpired]: "Revisión vencida",
  [EscrowState.DisputeResolved]: "Disputa resuelta",
  [EscrowState.ArbitrationExpired]: "Arbitraje vencido",
};

const actionsByState: Record<(typeof operationalStates)[number], string[]> = {
  [EscrowState.PendingAcceptance]: ["Aceptar", "Cancelar"],
  [EscrowState.PendingSubmission]: ["Enviar trabajo"],
  [EscrowState.PendingReview]: ["Aprobar trabajo", "Abrir disputa"],
  [EscrowState.PendingArbitration]: ["Resolver disputa"],
};

const expirationActions = [
  "Finalizar aceptación vencida",
  "Finalizar entrega vencida",
  "Finalizar revisión vencida",
  "Finalizar arbitraje vencido",
];

export function normalizeEscrowAddress(value: string): Address | undefined {
  return isAddress(value) ? getAddress(value) : undefined;
}

export function resolveEscrowAddress(
  value: string,
):
  | { kind: "invalid" }
  | { kind: "canonical"; address: Address }
  | { kind: "redirect"; address: Address } {
  const address = normalizeEscrowAddress(value);
  if (!address) return { kind: "invalid" };
  return address === value ? { kind: "canonical", address } : { kind: "redirect", address };
}

export function projectEscrow(snapshot: EscrowSnapshot, blockTime: bigint): EscrowProjection {
  const currentIndex = stateStage.get(snapshot.state)!;
  const operational = operationalStates.includes(
    snapshot.state as (typeof operationalStates)[number],
  );
  const activeDeadline = operational
    ? snapshot.deadlines[stageDefinitions[currentIndex].key]
    : undefined;
  const deadlineElapsed =
    activeDeadline !== undefined && activeDeadline > 0n && blockTime >= activeDeadline;
  const timeline = stageDefinitions.map(({ key, label }, index): LifecycleStage => {
    const deadline = snapshot.deadlines[key];
    let status: LifecycleStage["status"] =
      index < currentIndex ? "completed" : index === currentIndex ? "current" : "future";
    if (index === currentIndex && operational && deadlineElapsed) status = "elapsed";
    return { key, label, deadline, status };
  });
  const actions = operational
    ? deadlineElapsed
      ? [expirationActions[currentIndex]]
      : actionsByState[snapshot.state as (typeof operationalStates)[number]]
    : [];
  return {
    stateLabel: escrowStateMetadata[snapshot.state].label,
    terminalOutcome: terminalOutcomes[snapshot.state],
    activeDeadline: activeDeadline && activeDeadline > 0n ? activeDeadline : undefined,
    deadlineElapsed,
    availableActions: actions,
    timeline,
  };
}

const detailFunctions = [
  "title",
  "amount",
  "owner",
  "worker",
  "arbiter",
  "state",
  "acceptanceDeadline",
  "submissionDeadline",
  "reviewDeadline",
  "arbitrationDeadline",
  "submissionReference",
  "disputeReason",
  "resolutionReason",
] as const;

export async function fetchEscrowDetail(client: PublicClient, factory: Address, address: Address) {
  const blockNumber = await client.getBlockNumber();
  const registered = await client.readContract({
    address: factory,
    abi: escrowFactoryAbi,
    functionName: "isEscrow",
    args: [address],
    blockNumber,
  });
  if (!registered) return { kind: "not-found" as const };
  const [values, block] = await Promise.all([
    client.multicall({
      allowFailure: false,
      blockNumber,
      contracts: detailFunctions.map((functionName) => ({ address, abi: escrowAbi, functionName })),
    }),
    client.getBlock({ blockNumber }),
  ]);
  const [
    title,
    amount,
    owner,
    worker,
    arbiter,
    state,
    acceptance,
    submission,
    review,
    arbitration,
    submissionReference,
    disputeReason,
    resolutionReason,
  ] = values as unknown as [
    string,
    bigint,
    Address,
    Address,
    Address,
    unknown,
    bigint,
    bigint,
    bigint,
    bigint,
    string,
    string,
    string,
  ];
  return {
    kind: "success" as const,
    blockTime: block.timestamp,
    snapshot: {
      address,
      title,
      amount,
      owner,
      worker,
      arbiter,
      state: parseEscrowState(state),
      deadlines: { acceptance, submission, review, arbitration },
      submissionReference,
      disputeReason,
      resolutionReason,
    },
  };
}

export function escrowDetailQuery(client: PublicClient, factory: Address, address: Address) {
  return {
    queryKey: ["escrow", address] as const,
    queryFn: () => fetchEscrowDetail(client, factory, address),
  };
}

export function safeSubmissionUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
