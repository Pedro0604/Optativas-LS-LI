import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";
import { EscrowState } from "./EscrowState";
import {
  fetchEscrowDetail,
  normalizeEscrowAddress,
  projectEscrow,
  resolveEscrowAddress,
  safeSubmissionUrl,
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
  submissionReference: "",
  disputeReason: "",
  resolutionReason: "",
};

describe("escrow detail projection", () => {
  it("treats the exact deadline boundary as elapsed and leaves zero deadlines unstarted", () => {
    const result = projectEscrow(snapshot, 100n);
    expect(result.deadlineElapsed).toBe(true);
    expect(result.availableActions).toEqual(["Finalizar aceptación vencida"]);
    expect(result.timeline[0].status).toBe("elapsed");
    expect(
      result.timeline.slice(1).every((stage) => stage.deadline === 0n && stage.status === "future"),
    ).toBe(true);
  });

  it.each(Object.values(EscrowState).filter((value) => typeof value === "number"))(
    "projects state %s",
    (state) => {
      const result = projectEscrow({ ...snapshot, state }, 1n);
      expect(result.stateLabel).not.toBe("");
      expect(result.timeline).toHaveLength(4);
      if (state >= EscrowState.EscrowCancelled) expect(result.terminalOutcome).toBeTruthy();
    },
  );
});

describe("detail address and evidence", () => {
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
