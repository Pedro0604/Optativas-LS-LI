import { describe, expect, it } from "vitest";
import { EscrowState } from "./EscrowState";
import { canAcceptEscrow } from "./acceptance";
import type { EscrowSnapshot } from "./detail";

const snapshot: EscrowSnapshot = {
  address: "0x0000000000000000000000000000000000000001",
  title: "Diseño",
  amount: 1n,
  owner: "0x0000000000000000000000000000000000000002",
  worker: "0x0000000000000000000000000000000000000003",
  arbiter: "0x0000000000000000000000000000000000000004",
  state: EscrowState.PendingAcceptance,
  deadlines: { acceptance: 100n, submission: 0n, review: 0n, arbitration: 0n },
  durations: { submission: 1n, review: 1n, arbitration: 1n },
  submissionReference: "",
  disputeReason: "",
  resolutionReason: "",
};

describe("canAcceptEscrow", () => {
  it("allows only the eligible worker before the deadline on Sepolia", () => {
    expect(canAcceptEscrow(snapshot, snapshot.worker, 99n, 11155111)).toEqual({ ok: true });
  });

  it.each([
    [snapshot.owner, 99n, 11155111, "Solo el worker puede aceptar este escrow."],
    [snapshot.worker, 100n, 11155111, "El plazo de aceptación ya venció."],
    [snapshot.worker, 99n, 1, "Tu wallet debe usar Sepolia para aceptar el escrow."],
  ] as const)("rejects an ineligible acceptance", (account, now, chainId, message) => {
    expect(canAcceptEscrow(snapshot, account, now, chainId)).toEqual({ ok: false, message });
  });

  it("rejects an escrow outside pending acceptance", () => {
    expect(
      canAcceptEscrow(
        { ...snapshot, state: EscrowState.PendingSubmission },
        snapshot.worker,
        99n,
        11155111,
      ),
    ).toEqual({ ok: false, message: "El escrow ya no está pendiente de aceptación." });
  });
});
