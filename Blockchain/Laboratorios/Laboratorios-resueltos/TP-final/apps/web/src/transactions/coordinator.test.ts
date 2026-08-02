import { describe, expect, it, vi } from "vitest";
import { runEscrowTransaction, runTransaction, translateTransactionError } from "./coordinator";

describe("transaction coordinator", () => {
  it("reports simulation, wallet, submission, and confirmation in order", async () => {
    const states: string[] = [];
    await expect(
      runTransaction({
        simulate: vi.fn().mockResolvedValue({ request: { to: "0x1" } }),
        write: vi
          .fn()
          .mockResolvedValue("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
        wait: vi.fn().mockResolvedValue({ status: "success" }),
        onState: (state) => states.push(state.kind),
      }),
    ).resolves.toEqual({
      kind: "confirmed",
      hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(states).toEqual(["simulating", "wallet", "submitted", "confirmed"]);
  });

  it("keeps the hash when an on-chain receipt is reverted", async () => {
    await expect(
      runTransaction({
        simulate: vi.fn().mockResolvedValue({ request: {} }),
        write: vi
          .fn()
          .mockResolvedValue("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
        wait: vi.fn().mockResolvedValue({ status: "reverted" }),
      }),
    ).resolves.toMatchObject({
      kind: "reverted",
      hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
  });

  it("distinguishes a rejected wallet request and translates known contract errors", async () => {
    await expect(
      runTransaction({
        simulate: vi.fn().mockResolvedValue({ request: {} }),
        write: vi.fn().mockRejectedValue(new Error("UserRejectedRequest")),
        wait: vi.fn(),
      }),
    ).resolves.toMatchObject({ kind: "rejected" });
    expect(translateTransactionError(new Error("OnlyWorkerAllowed"))).toBe(
      "Solo el worker puede aceptar este escrow.",
    );
  });

  it("locks only the escrow with a pending transaction", async () => {
    let resolve!: (value: { request: {} }) => void;
    const simulation = new Promise<{ request: {} }>((done) => {
      resolve = done;
    });
    const first = runEscrowTransaction("0x01", {
      simulate: () => simulation,
      write: vi.fn(),
      wait: vi.fn(),
    });
    await expect(
      runEscrowTransaction("0x01", { simulate: vi.fn(), write: vi.fn(), wait: vi.fn() }),
    ).resolves.toMatchObject({
      message: "Ya hay una transacción pendiente para este escrow.",
    });
    resolve({ request: {} });
    await first;
  });
});
