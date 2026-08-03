import { describe, expect, it, vi } from "vitest";
import {
  readPendingTransactions,
  recoverPendingTransactions,
  runEscrowTransaction,
  runTransaction,
  translateTransactionError,
} from "./coordinator";

describe("transaction coordinator", () => {
  it("persists submitted metadata and recovers receipt tracking after reload", async () => {
    localStorage.clear();
    let finish!: (receipt: { status: "success" }) => void;
    const pending = runEscrowTransaction("0xescrow", {
      simulate: vi.fn().mockResolvedValue({ request: {} }),
      write: vi
        .fn()
        .mockResolvedValue("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      wait: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    await vi.waitFor(() => expect(readPendingTransactions()).toHaveLength(1));
    const recovered = await recoverPendingTransactions(vi.fn().mockResolvedValue(null));
    expect(recovered[0].item.escrow).toBe("0xescrow");
    finish({ status: "success" });
    await pending;
    expect(readPendingTransactions()).toEqual([]);
  });
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

  it("distinguishes a replaced transaction and keeps both hashes", async () => {
    const original = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
    const replacement =
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as const;
    await expect(
      runTransaction({
        simulate: vi.fn().mockResolvedValue({ request: {} }),
        write: vi.fn().mockResolvedValue(original),
        wait: vi
          .fn()
          .mockRejectedValue(
            Object.assign(new Error("replaced"), { replacement: { hash: replacement } }),
          ),
      }),
    ).resolves.toEqual({ kind: "replaced", hash: replacement, replacedHash: original });
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
