import { describe, expect, it } from "vitest";
import { EscrowState } from "./EscrowState";
import {
  allocationFromOwnerSlider,
  allocationFromWorkerSlider,
  canResolveDispute,
  complementAllocationPercent,
  formatAllocationEth,
  formatAllocationPercent,
  parseAllocationPercent,
  parseOwnerAllocation,
  parseWorkerAllocation,
} from "./resolution";
import type { EscrowSnapshot } from "./detail";
import { validatePublicText } from "./reviewActions";

const snapshot: EscrowSnapshot = {
  address: "0x0000000000000000000000000000000000000001",
  title: "Diseño",
  amount: 5n,
  owner: "0x0000000000000000000000000000000000000002",
  worker: "0x0000000000000000000000000000000000000003",
  arbiter: "0x0000000000000000000000000000000000000004",
  state: EscrowState.PendingArbitration,
  deadlines: { acceptance: 1n, submission: 2n, review: 3n, arbitration: 100n },
  durations: { submission: 1n, review: 1n, arbitration: 1n },
  submissionReference: "",
  disputeReason: "",
  resolutionReason: "",
  pendingWithdrawals: { owner: 0n, worker: 0n },
};

describe("dispute resolution", () => {
  it("keeps worker allocation authoritative and owner allocation as the exact remainder", () => {
    expect(allocationFromWorkerSlider(3, 5n)).toBe(0n);
    expect(allocationFromWorkerSlider(10_000, 5n)).toBe(5n);
    expect(allocationFromWorkerSlider(5_000, 5n)).toBe(2n);
    expect(allocationFromOwnerSlider(5_000, 5n)).toBe(3n);
    expect(formatAllocationEth(3n, 5n)).toEqual({
      worker: "0.000000000000000003",
      owner: "0.000000000000000002",
    });
  });

  it("accepts only an exact, non-negative ETH allocation no greater than escrow", () => {
    expect(parseWorkerAllocation("0.000000000000000005", 5n)).toEqual({
      ok: true,
      workerAmountWei: 5n,
    });
    expect(parseWorkerAllocation("", 5n)).toMatchObject({ ok: false });
    expect(parseWorkerAllocation("-1", 5n)).toMatchObject({ ok: false });
    expect(parseWorkerAllocation("0.0000000000000000001", 5n)).toMatchObject({ ok: false });
    expect(parseWorkerAllocation("0.000000000000000006", 5n)).toMatchObject({ ok: false });
    expect(parseWorkerAllocation("1e-18", 5n)).toMatchObject({ ok: false });
    expect(parseOwnerAllocation("0.000000000000000003", 5n)).toEqual({
      ok: true,
      workerAmountWei: 2n,
    });
  });

  it("parses either party percentage and gives rounding dust to the other party", () => {
    expect(parseAllocationPercent("10", "worker", 11n)).toEqual({
      ok: true,
      workerAmountWei: 1n,
    });
    expect(parseAllocationPercent("10,5", "owner", 11n)).toEqual({
      ok: true,
      workerAmountWei: 10n,
    });
    expect(parseAllocationPercent("33.33", "worker", 10n)).toEqual({
      ok: true,
      workerAmountWei: 3n,
    });
    expect(parseAllocationPercent("", "worker", 10n)).toMatchObject({ ok: false });
    expect(parseAllocationPercent("10.001", "worker", 10n)).toMatchObject({ ok: false });
    expect(parseAllocationPercent("101", "worker", 10n)).toMatchObject({ ok: false });
    expect(complementAllocationPercent("10,5")).toBe("89.5");
    expect(complementAllocationPercent("33.33")).toBe("66.67");
    expect(complementAllocationPercent("101")).toBeUndefined();
  });

  it("formats exact amounts as complementary percentages rounded to two decimals", () => {
    expect(formatAllocationPercent(1n, 3n)).toEqual({ worker: "33.33", owner: "66.67" });
    expect(formatAllocationPercent(1n, 2n)).toEqual({ worker: "50", owner: "50" });
    expect(formatAllocationPercent(0n, 0n)).toEqual({ worker: "0", owner: "100" });
  });

  it("requires a non-empty, byte-limited public resolution reason", () => {
    expect(validatePublicText("", 256)).toContain("obligatorio");
    expect(validatePublicText("á".repeat(128), 256)).toBeUndefined();
    expect(validatePublicText("á".repeat(129), 256)).toContain("256 bytes");
  });

  it("allows only the arbiter to resolve an active arbitration on Sepolia", () => {
    expect(canResolveDispute(snapshot, snapshot.arbiter, 99n, 11155111)).toEqual({ ok: true });
    expect(canResolveDispute(snapshot, snapshot.worker, 99n, 11155111)).toMatchObject({
      ok: false,
    });
    expect(canResolveDispute(snapshot, snapshot.arbiter, 100n, 11155111)).toMatchObject({
      ok: false,
    });
    expect(canResolveDispute(snapshot, snapshot.arbiter, 99n, 1)).toMatchObject({ ok: false });
    expect(
      canResolveDispute(
        { ...snapshot, state: EscrowState.PendingReview },
        snapshot.arbiter,
        99n,
        11155111,
      ),
    ).toMatchObject({ ok: false });
  });
});
