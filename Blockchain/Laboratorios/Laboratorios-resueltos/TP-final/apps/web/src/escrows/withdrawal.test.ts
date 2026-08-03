import { describe, expect, it } from "vitest";
import { EscrowState } from "./EscrowState";
import type { EscrowSnapshot } from "./detail";
import { canWithdrawFromEscrow, formatPendingWithdrawal, pendingWithdrawalFor } from "./withdrawal";
import { runEscrowTransaction } from "../transactions/coordinator";
import { vi } from "vitest";

const owner = "0x0000000000000000000000000000000000000001" as const;
const worker = "0x0000000000000000000000000000000000000002" as const;
const snapshot = {
  address: "0x0000000000000000000000000000000000000003",
  title: "Entrega",
  amount: 10n,
  owner,
  worker,
  arbiter: "0x0000000000000000000000000000000000000004",
  state: EscrowState.DisputeResolved,
  deadlines: { acceptance: 0n, submission: 0n, review: 0n, arbitration: 0n },
  durations: { submission: 1n, review: 1n, arbitration: 1n },
  submissionReference: "",
  disputeReason: "",
  resolutionReason: "",
  pendingWithdrawals: { owner: 1n, worker: 9n },
} satisfies EscrowSnapshot;

describe("escrow withdrawal", () => {
  it("selects only the connected owner's balance", () => {
    expect(pendingWithdrawalFor(snapshot, owner)).toBe(1n);
  });

  it("selects only the connected worker's balance", () => {
    expect(pendingWithdrawalFor(snapshot, worker)).toBe(9n);
  });

  it("does not expose a balance to unrelated or disconnected accounts", () => {
    expect(pendingWithdrawalFor(snapshot)).toBe(0n);
    expect(pendingWithdrawalFor(snapshot, "0x0000000000000000000000000000000000000005")).toBe(0n);
  });

  it("offers withdrawal only to a funded beneficiary on Sepolia", () => {
    expect(canWithdrawFromEscrow(snapshot, owner, 11155111)).toBe(true);
    expect(canWithdrawFromEscrow(snapshot, worker, 11155111)).toBe(true);
    expect(canWithdrawFromEscrow(snapshot, owner, 1)).toBe(false);
    expect(canWithdrawFromEscrow(snapshot, undefined, 11155111)).toBe(false);
  });

  it("formats every wei exactly without rounding", () => {
    expect(formatPendingWithdrawal(1n)).toBe("0.000000000000000001 ETH");
    expect(formatPendingWithdrawal(1_234_567_890_123_456_789n)).toBe("1.234567890123456789 ETH");
  });

  it.each([
    ["owner", owner],
    ["worker", worker],
  ])(
    "withdraws for the %s beneficiary and reports a repeated no-balance attempt",
    async (_role, account) => {
      expect(pendingWithdrawalFor(snapshot, account)).toBeGreaterThan(0n);
      const transactionOperations = {
        simulate: vi.fn().mockResolvedValue({ request: { functionName: "withdraw" } }),
        write: vi.fn().mockResolvedValue("0x01" as const),
        wait: vi.fn().mockResolvedValue({ status: "success" as const }),
      };

      await expect(
        runEscrowTransaction(snapshot.address, transactionOperations),
      ).resolves.toMatchObject({
        kind: "confirmed",
      });
      transactionOperations.simulate.mockRejectedValueOnce(new Error("NoFundsToWithdraw"));
      await expect(
        runEscrowTransaction(snapshot.address, transactionOperations),
      ).resolves.toMatchObject({
        kind: "reverted",
        message: "No hay fondos disponibles para retirar.",
      });
      expect(transactionOperations.write).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["wallet rejection", new Error("UserRejectedRequest"), "rejected"],
    ["no-balance race", new Error("NoFundsToWithdraw"), "reverted"],
    ["transfer rejection", new Error("WithdrawalFailed"), "reverted"],
    ["contract revert", new Error("execution reverted"), "reverted"],
  ])("reports %s distinctly", async (_label, error, kind) => {
    const result = await runEscrowTransaction(snapshot.address, {
      simulate: vi.fn().mockRejectedValue(error),
      write: vi.fn(),
      wait: vi.fn(),
    });
    expect(result.kind).toBe(kind);
    if (result.kind === "rejected" || result.kind === "reverted") {
      const expected =
        _label === "wallet rejection"
          ? "La firma fue rechazada en la wallet."
          : _label === "no-balance race"
            ? "No hay fondos disponibles para retirar."
            : _label === "transfer rejection"
              ? "No se pudieron transferir los fondos."
              : "No se pudo completar la transacción. Intentá nuevamente.";
      expect(result.message).toBe(expected);
    }
  });
});
