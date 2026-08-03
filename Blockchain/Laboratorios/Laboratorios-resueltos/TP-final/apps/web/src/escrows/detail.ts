import { escrowAbi, escrowFactoryAbi } from "@escrow/contracts";
import { getAddress, isAddress, type Address, type PublicClient } from "viem";
import { canWrite } from "../wallet/wallet";
import { DETAIL_POLL_INTERVAL_MS, visiblePollingInterval } from "../queryResilience";
import {
  EscrowState,
  escrowStateMetadata,
  parseEscrowState,
  type EscrowDeadlines,
} from "./EscrowState";
import { deadlineLabels, escrowActionLabels, type EscrowActionLabel } from "./domainLabels";

export type EscrowSnapshot = {
  address: Address;
  title: string;
  amount: bigint;
  owner: Address;
  worker: Address;
  arbiter: Address;
  state: EscrowState;
  deadlines: EscrowDeadlines;
  durations: Pick<EscrowDeadlines, "submission" | "review" | "arbitration">;
  submissionReference: string;
  disputeReason: string;
  resolutionReason: string;
  pendingWithdrawals: { owner: bigint; worker: bigint };
};

export type LifecycleStage = {
  key: keyof EscrowDeadlines;
  label: string;
  deadline: bigint;
  duration?: bigint;
  startsAfter?: string;
  status: "completed" | "current" | "future" | "expired";
  deadlineElapsed: boolean;
};

export type EscrowProjection = {
  stateLabel: string;
  terminalOutcome?: string;
  activeDeadline?: bigint;
  deadlineElapsed: boolean;
  availableActions: EscrowActionLabel[];
  timeline: LifecycleStage[];
};

export type EscrowActionContext = { account?: Address; chainId?: number };

export type ActionAvailability =
  | { kind: "available"; actions: EscrowActionLabel[] }
  | { kind: "terminal" }
  | { kind: "wallet-required" }
  | { kind: "wrong-network" }
  | { kind: "unavailable" };

export type LifecycleWriteAction =
  | typeof escrowActionLabels.cancel
  | typeof escrowActionLabels.expireAcceptance
  | typeof escrowActionLabels.expireSubmission
  | typeof escrowActionLabels.expireReview
  | typeof escrowActionLabels.expireArbitration;

const lifecycleWriteDetails: Record<
  LifecycleWriteAction,
  {
    functionName:
      | "cancelEscrow"
      | "expireAcceptance"
      | "expireSubmission"
      | "expireReview"
      | "expireArbitration";
    consequence: string;
  }
> = {
  [escrowActionLabels.cancel]: {
    functionName: "cancelEscrow",
    consequence:
      "El escrow quedará cancelado y el monto completo quedará disponible para retiro del owner.",
  },
  [escrowActionLabels.expireAcceptance]: {
    functionName: "expireAcceptance",
    consequence:
      "La aceptación quedará finalizada por vencimiento y el monto completo quedará disponible para retiro del owner.",
  },
  [escrowActionLabels.expireSubmission]: {
    functionName: "expireSubmission",
    consequence:
      "La entrega quedará finalizada por vencimiento y el monto completo quedará disponible para retiro del owner.",
  },
  [escrowActionLabels.expireReview]: {
    functionName: "expireReview",
    consequence:
      "La revisión quedará finalizada por vencimiento y el monto completo quedará disponible para retiro del worker.",
  },
  [escrowActionLabels.expireArbitration]: {
    functionName: "expireArbitration",
    consequence:
      "El arbitraje quedará finalizado por vencimiento: la mitad para el owner y la otra mitad (con cualquier wei impar adicional) para el worker quedarán disponibles para retiro.",
  },
};

export function lifecycleWriteDetail(action: LifecycleWriteAction) {
  return lifecycleWriteDetails[action];
}

export function isLifecycleWriteAction(action: string): action is LifecycleWriteAction {
  return action in lifecycleWriteDetails;
}

type EscrowDetailResult =
  { kind: "not-found" } | { kind: "success"; blockTime: bigint; snapshot: EscrowSnapshot };

const operationalStates = [
  EscrowState.PendingAcceptance,
  EscrowState.PendingSubmission,
  EscrowState.PendingReview,
  EscrowState.PendingArbitration,
] as const;

const stageDefinitions = [
  { key: "acceptance", label: deadlineLabels.acceptance },
  { key: "submission", label: deadlineLabels.submission, startsAfter: "la aceptación" },
  { key: "review", label: deadlineLabels.review, startsAfter: "la entrega" },
  {
    key: "arbitration",
    label: deadlineLabels.arbitration,
    startsAfter: "la apertura de la disputa",
  },
] as const;

const expirationStates = new Set<EscrowState>([
  EscrowState.AcceptanceExpired,
  EscrowState.SubmissionExpired,
  EscrowState.ReviewExpired,
  EscrowState.ArbitrationExpired,
]);

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

const actionsByState: Record<(typeof operationalStates)[number], EscrowActionLabel[]> = {
  [EscrowState.PendingAcceptance]: [escrowActionLabels.accept, escrowActionLabels.cancel],
  [EscrowState.PendingSubmission]: [escrowActionLabels.submit],
  [EscrowState.PendingReview]: [escrowActionLabels.approve, escrowActionLabels.dispute],
  [EscrowState.PendingArbitration]: [escrowActionLabels.resolve],
};

const expirationActions = [
  escrowActionLabels.expireAcceptance,
  escrowActionLabels.expireSubmission,
  escrowActionLabels.expireReview,
  escrowActionLabels.expireArbitration,
] as const;

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

function actionsForAccount(
  actions: EscrowActionLabel[],
  snapshot: EscrowSnapshot,
  context?: EscrowActionContext,
) {
  if (!context) return actions;
  if (!context.account || !canWrite(context.chainId)) return [];
  const account = context.account.toLowerCase();
  if (actions[0]?.startsWith("Finalizar")) return actions;
  const role =
    account === snapshot.owner.toLowerCase()
      ? "owner"
      : account === snapshot.worker.toLowerCase()
        ? "worker"
        : account === snapshot.arbiter.toLowerCase()
          ? "arbiter"
          : undefined;
  return actions.filter((action) =>
    action === escrowActionLabels.accept || action === escrowActionLabels.submit
      ? role === "worker"
      : action === escrowActionLabels.cancel ||
          action === escrowActionLabels.approve ||
          action === escrowActionLabels.dispute
        ? role === "owner"
        : action === escrowActionLabels.resolve
          ? role === "arbiter"
          : false,
  );
}

export function projectEscrow(
  snapshot: EscrowSnapshot,
  blockTime: bigint,
  context?: EscrowActionContext,
): EscrowProjection {
  const currentIndex = stateStage.get(snapshot.state)!;
  const operational = operationalStates.includes(
    snapshot.state as (typeof operationalStates)[number],
  );
  const activeDeadline = operational
    ? snapshot.deadlines[stageDefinitions[currentIndex].key]
    : undefined;

  const deadlineElapsed =
    activeDeadline !== undefined && activeDeadline > 0n && blockTime >= activeDeadline;
  const timeline = stageDefinitions.map((definition, index): LifecycleStage => {
    const { key, label } = definition;
    const deadline = snapshot.deadlines[key];
    const status: LifecycleStage["status"] =
      index < currentIndex
        ? "completed"
        : index > currentIndex
          ? "future"
          : operational
            ? "current"
            : expirationStates.has(snapshot.state)
              ? "expired"
              : "completed";

    return {
      key,
      label,
      deadline,
      duration: key === "acceptance" ? undefined : snapshot.durations[key],
      startsAfter: "startsAfter" in definition ? definition.startsAfter : undefined,
      status,
      deadlineElapsed: index === currentIndex && deadlineElapsed,
    };
  });

  const baseActions = operational
    ? deadlineElapsed
      ? [expirationActions[currentIndex]]
      : actionsByState[snapshot.state as (typeof operationalStates)[number]]
    : [];

  return {
    stateLabel: escrowStateMetadata[snapshot.state].label,
    terminalOutcome: terminalOutcomes[snapshot.state],
    activeDeadline: activeDeadline && activeDeadline > 0n ? activeDeadline : undefined,
    deadlineElapsed,
    availableActions: actionsForAccount(baseActions, snapshot, context),
    timeline,
  };
}

/** Describe por qué la interfaz puede o no mostrar una acción del ciclo de vida. */
export function actionAvailability(
  projection: EscrowProjection,
  context?: EscrowActionContext,
): ActionAvailability {
  if (projection.terminalOutcome) return { kind: "terminal" };
  if (projection.availableActions.length)
    return { kind: "available", actions: projection.availableActions };
  if (!context?.account) return { kind: "wallet-required" };
  if (!canWrite(context.chainId)) return { kind: "wrong-network" };
  return { kind: "unavailable" };
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
  "submissionDuration",
  "reviewDuration",
  "arbitrationDuration",
  "submissionReference",
  "disputeReason",
  "resolutionReason",
] as const;

export async function fetchEscrowDetail(
  client: PublicClient,
  factory: Address,
  address: Address,
): Promise<EscrowDetailResult> {
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
    submissionDuration,
    reviewDuration,
    arbitrationDuration,
    submissionReference,
    disputeReason,
    resolutionReason,
  ] = values as [
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
    bigint,
    bigint,
    bigint,
    string,
    string,
    string,
  ];

  const [ownerPendingWithdrawal, workerPendingWithdrawal] = await Promise.all([
    client.readContract({
      address,
      abi: escrowAbi,
      functionName: "pendingWithdrawals",
      args: [owner],
      blockNumber,
    }),
    client.readContract({
      address,
      abi: escrowAbi,
      functionName: "pendingWithdrawals",
      args: [worker],
      blockNumber,
    }),
  ]);

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
      durations: {
        submission: submissionDuration,
        review: reviewDuration,
        arbitration: arbitrationDuration,
      },
      submissionReference,
      disputeReason,
      resolutionReason,
      pendingWithdrawals: { owner: ownerPendingWithdrawal, worker: workerPendingWithdrawal },
    },
  };
}

export function escrowDetailQuery(client: PublicClient, factory: Address, address: Address) {
  return {
    queryKey: ["escrow", address] as const,
    queryFn: () => fetchEscrowDetail(client, factory, address),
    refetchInterval: visiblePollingInterval(DETAIL_POLL_INTERVAL_MS),
    refetchIntervalInBackground: false,
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
