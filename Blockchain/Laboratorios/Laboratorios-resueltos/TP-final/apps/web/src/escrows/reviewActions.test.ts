import { describe, expect, it } from "vitest";
import { EscrowState } from "./EscrowState";
import { canApproveWork, canOpenDispute, canSubmitWork, validatePublicText } from "./reviewActions";
import type { EscrowSnapshot } from "./detail";

const snapshot: EscrowSnapshot = {
  address: "0x0000000000000000000000000000000000000001",
  title: "Diseño",
  amount: 1n,
  owner: "0x0000000000000000000000000000000000000002",
  worker: "0x0000000000000000000000000000000000000003",
  arbiter: "0x0000000000000000000000000000000000000004",
  state: EscrowState.PendingSubmission,
  deadlines: { acceptance: 1n, submission: 100n, review: 0n, arbitration: 0n },
  durations: { submission: 1n, review: 1n, arbitration: 1n },
  submissionReference: "",
  disputeReason: "",
  resolutionReason: "",
};

describe("review actions", () => {
  it("measures public text in UTF-8 bytes", () => {
    expect(validatePublicText("", 256)).toContain("obligatorio");
    expect(validatePublicText("á".repeat(128), 256)).toBeUndefined();
    expect(validatePublicText("á".repeat(129), 256)).toContain("256 bytes");
  });

  it("allows the worker to submit only in time on Sepolia", () => {
    expect(canSubmitWork(snapshot, snapshot.worker, 99n, 11155111)).toEqual({ ok: true });
    expect(canSubmitWork(snapshot, snapshot.owner, 99n, 11155111)).toMatchObject({ ok: false });
    expect(canSubmitWork(snapshot, snapshot.worker, 100n, 11155111)).toMatchObject({ ok: false });
  });

  it("allows the owner to approve or dispute only during review", () => {
    const review = {
      ...snapshot,
      state: EscrowState.PendingReview,
      deadlines: { ...snapshot.deadlines, review: 100n },
    };
    expect(canApproveWork(review, review.owner, 99n, 11155111)).toEqual({ ok: true });
    expect(canOpenDispute(review, review.owner, 99n, 11155111)).toEqual({ ok: true });
    expect(canOpenDispute(review, review.worker, 99n, 11155111)).toMatchObject({ ok: false });
  });
});
