import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";
import { EscrowState } from "./EscrowState";
import {
  fetchEscrowDetail,
  normalizeEscrowAddress,
  projectEscrow,
  resolveEscrowAddress,
  safeSubmissionUrl,
  actionAvailability,
  isLifecycleWriteAction,
  lifecycleWriteDetail,
  type EscrowSnapshot,
} from "./detail";

const snapshot: EscrowSnapshot = {
  address: "0x0000000000000000000000000000000000000001",
  title: "Auditoría",
  amount: 1n,
  owner: "0x0000000000000000000000000000000000000002",
  worker: "0x0000000000000000000000000000000000000003",
  arbiter: "0x0000000000000000000000000000000000000004",
  state: EscrowState.PendingAcceptance,
  deadlines: { acceptance: 100n, submission: 0n, review: 0n, arbitration: 0n },
  durations: { submission: 3_600n, review: 5_400n, arbitration: 183_600n },
  submissionReference: "",
  disputeReason: "",
  resolutionReason: "",
  pendingWithdrawals: { owner: 0n, worker: 0n },
};

describe("escrow detail projection", () => {
  it("treats the exact deadline boundary as elapsed and leaves zero deadlines unstarted", () => {
    const result = projectEscrow(snapshot, 100n);
    expect(result.deadlineElapsed).toBe(true);
    expect(result.availableActions).toEqual(["Finalizar aceptación vencida"]);
    expect(result.timeline[0]).toMatchObject({ status: "current", deadlineElapsed: true });
    expect(
      result.timeline.slice(1).every((stage) => stage.deadline === 0n && stage.status === "future"),
    ).toBe(true);
    expect(result.timeline[1]).toMatchObject({
      duration: 3_600n,
      startsAfter: "la aceptación",
    });
  });

  it.each([
    [EscrowState.PendingAcceptance, 0, ["Aceptar", "Cancelar"]],
    [EscrowState.PendingSubmission, 1, ["Enviar trabajo"]],
    [EscrowState.PendingReview, 2, ["Aprobar trabajo", "Abrir disputa"]],
    [EscrowState.PendingArbitration, 3, ["Resolver disputa"]],
  ] as const)("projects operational state %s", (state, stageIndex, actions) => {
    const deadlines = { acceptance: 100n, submission: 100n, review: 100n, arbitration: 100n };
    const result = projectEscrow({ ...snapshot, state, deadlines }, 1n);
    expect(result.activeDeadline).toBe(100n);
    expect(result.availableActions).toEqual(actions);
    expect(result.timeline.map((stage) => stage.status)).toEqual(
      [0, 1, 2, 3].map((index) =>
        index < stageIndex ? "completed" : index === stageIndex ? "current" : "future",
      ),
    );
  });

  it("derives actions from the connected role and wallet network", () => {
    expect(
      projectEscrow(snapshot, 1n, { account: snapshot.worker, chainId: 11155111 }).availableActions,
    ).toEqual(["Aceptar"]);
    expect(
      projectEscrow(snapshot, 1n, { account: snapshot.owner, chainId: 11155111 }).availableActions,
    ).toEqual(["Cancelar"]);
    expect(
      projectEscrow(snapshot, 1n, { account: snapshot.worker, chainId: 1 }).availableActions,
    ).toEqual([]);
  });

  it("explains why an operational escrow has no available action", () => {
    expect(actionAvailability(projectEscrow(snapshot, 1n, {}))).toEqual({
      kind: "wallet-required",
    });
    expect(
      actionAvailability(projectEscrow(snapshot, 1n, { account: snapshot.owner, chainId: 1 }), {
        account: snapshot.owner,
        chainId: 1,
      }),
    ).toEqual({
      kind: "wrong-network",
    });
    expect(
      actionAvailability(
        projectEscrow(snapshot, 1n, { account: snapshot.arbiter, chainId: 11155111 }),
        {
          account: snapshot.arbiter,
          chainId: 11155111,
        },
      ),
    ).toEqual({ kind: "unavailable" });
    expect(
      actionAvailability(
        projectEscrow(snapshot, 1n, { account: snapshot.worker, chainId: 11155111 }),
        {
          account: snapshot.worker,
          chainId: 11155111,
        },
      ),
    ).toEqual({ kind: "available", actions: ["Aceptar"] });
  });

  it("allows any Sepolia account to finalize an elapsed deadline", () => {
    expect(actionAvailability(projectEscrow(snapshot, 100n, {}))).toEqual({
      kind: "wallet-required",
    });
    expect(
      actionAvailability(
        projectEscrow(snapshot, 100n, { account: snapshot.arbiter, chainId: 11155111 }),
        {
          account: snapshot.arbiter,
          chainId: 11155111,
        },
      ),
    ).toEqual({ kind: "available", actions: ["Finalizar aceptación vencida"] });
  });

  it.each([
    [
      EscrowState.PendingAcceptance,
      "acceptance",
      "Finalizar aceptación vencida",
      "expireAcceptance",
    ],
    [EscrowState.PendingSubmission, "submission", "Finalizar entrega vencida", "expireSubmission"],
    [EscrowState.PendingReview, "review", "Finalizar revisión vencida", "expireReview"],
    [
      EscrowState.PendingArbitration,
      "arbitration",
      "Finalizar arbitraje vencido",
      "expireArbitration",
    ],
  ] as const)(
    "offers permissionless %s expiration exactly at its deadline",
    (state, deadlineKey, action, functionName) => {
      const deadlines = { acceptance: 0n, submission: 0n, review: 0n, arbitration: 0n };
      deadlines[deadlineKey] = 100n;
      const projection = projectEscrow({ ...snapshot, state, deadlines }, 100n, {
        account: snapshot.arbiter,
        chainId: 11155111,
      });
      expect(projection.deadlineElapsed).toBe(true);
      expect(projection.availableActions).toEqual([action]);
      expect(lifecycleWriteDetail(action).functionName).toBe(functionName);
    },
  );

  it("describes the deterministic arbitration-expiration allocation", () => {
    expect(lifecycleWriteDetail("Finalizar arbitraje vencido").consequence).toMatch(/wei impar/i);
  });

  it("shows a terminal outcome instead of an action availability message", () => {
    const projection = projectEscrow({ ...snapshot, state: EscrowState.WorkApproved }, 1n, {
      account: snapshot.worker,
      chainId: 11155111,
    });
    expect(actionAvailability(projection, { account: snapshot.worker, chainId: 11155111 })).toEqual(
      {
        kind: "terminal",
      },
    );
  });

  it.each([
    EscrowState.EscrowCancelled,
    EscrowState.AcceptanceExpired,
    EscrowState.SubmissionExpired,
    EscrowState.WorkApproved,
    EscrowState.ReviewExpired,
    EscrowState.DisputeResolved,
    EscrowState.ArbitrationExpired,
  ])("projects terminal state %s", (state) => {
    const result = projectEscrow({ ...snapshot, state }, 1n);
    expect(result.stateLabel).not.toBe("");
    expect(result.terminalOutcome).toBeTruthy();
    expect(result.availableActions).toEqual([]);
    expect(result.activeDeadline).toBeUndefined();
  });

  it("distinguishes processed expirations from other terminal outcomes", () => {
    const deadlines = { acceptance: 100n, submission: 200n, review: 0n, arbitration: 0n };
    expect(
      projectEscrow({ ...snapshot, state: EscrowState.SubmissionExpired, deadlines }, 220n)
        .timeline[1].status,
    ).toBe("expired");
    expect(
      projectEscrow({ ...snapshot, state: EscrowState.WorkApproved, deadlines }, 220n).timeline[2]
        .status,
    ).toBe("completed");
  });
});

describe("detail address and evidence", () => {
  it("does not classify submission and review actions as lifecycle writes", () => {
    expect(isLifecycleWriteAction("Enviar trabajo")).toBe(false);
    expect(isLifecycleWriteAction("Aprobar trabajo")).toBe(false);
    expect(isLifecycleWriteAction("Abrir disputa")).toBe(false);
    expect(isLifecycleWriteAction("Finalizar revisión vencida")).toBe(true);
  });

  it("rejects malformed addresses and checksums valid ones", () => {
    expect(normalizeEscrowAddress("no-address")).toBeUndefined();
    expect(normalizeEscrowAddress("0xde709f2102306220921060314715629080e2fb77")).toBe(
      "0xde709f2102306220921060314715629080e2fb77",
    );
    expect(resolveEscrowAddress("no-address")).toEqual({ kind: "invalid" });
    expect(resolveEscrowAddress("0x52908400098527886e0f7030069857d2e4169ee7")).toEqual({
      kind: "redirect",
      address: "0x52908400098527886E0F7030069857D2E4169EE7",
    });
  });
  it("links only HTTPS evidence", () => {
    expect(safeSubmissionUrl("https://example.com/work")).toBe("https://example.com/work");
    expect(safeSubmissionUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeSubmissionUrl("plain text")).toBeUndefined();
  });
  it("returns not found without reading a non-factory contract", async () => {
    const multicall = vi.fn();
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(42n),
      readContract: vi.fn().mockResolvedValue(false),
      multicall,
    } as unknown as PublicClient;
    await expect(fetchEscrowDetail(client, snapshot.owner, snapshot.address)).resolves.toEqual({
      kind: "not-found",
    });
    expect(multicall).not.toHaveBeenCalled();
  });
});
