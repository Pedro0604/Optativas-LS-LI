import { describe, expect, it, vi } from "vitest";
import { fetchDiscovery, reverseIndexes } from "./discovery";
import {
  EscrowState,
  escrowStateMetadata,
  parseEscrowState,
  phaseDeadlineFor,
} from "./EscrowState";
import { validateDiscoverySearch } from "./search";
describe("public discovery pagination", () => {
  it("requests newest indexes first", () =>
    expect(reverseIndexes(25, 1)).toEqual(Array.from({ length: 20 }, (_, i) => BigInt(24 - i))));

  it("requests the remaining final page", () =>
    expect(reverseIndexes(25, 2)).toEqual([4n, 3n, 2n, 1n, 0n]));

  it("retains the phase deadline for terminal states", () => {
    const deadlines = { acceptance: 10n, submission: 20n, review: 30n, arbitration: 40n };
    expect(phaseDeadlineFor(EscrowState.AcceptanceExpired, deadlines)).toBe(10n);
    expect(phaseDeadlineFor(EscrowState.ReviewExpired, deadlines)).toBe(30n);
  });

  it("describes every escrow state", () => {
    expect(escrowStateMetadata[EscrowState.PendingArbitration]).toEqual({
      label: "En arbitraje",
      deadlineKind: "arbitration",
    });
    expect(Object.keys(escrowStateMetadata)).toHaveLength(11);
  });

  it("rejects unknown escrow states", () => {
    expect(parseEscrowState(10)).toBe(EscrowState.ArbitrationExpired);
    expect(() => parseEscrowState(11)).toThrow(/desconocido/i);
  });

  it("validates shareable search params", () => {
    expect(validateDiscoverySearch({ page: "2", state: "3" })).toEqual({
      page: 2,
      state: EscrowState.PendingArbitration,
    });
    expect(validateDiscoverySearch({ page: 3, state: "3a" })).toEqual({ page: 3, state: "all" });
    expect(validateDiscoverySearch({ page: "bbe", state: 4 })).toEqual({
      page: 1,
      state: EscrowState.EscrowCancelled,
    });
    expect(validateDiscoverySearch({ page: "x", state: "99" })).toEqual({ page: 1, state: "all" });
  });
});

describe("public discovery reads", () => {
  const factory = "0x0000000000000000000000000000000000000001" as const;
  const escrow = "0x0000000000000000000000000000000000000002" as const;
  const participant = "0x0000000000000000000000000000000000000003" as const;

  it("returns an empty page", async () => {
    const client = {
      readContract: vi.fn().mockResolvedValue(0n),
      getBlockNumber: vi.fn().mockResolvedValue(10n),
      multicall: vi.fn().mockResolvedValue([]),
    };
    await expect(fetchDiscovery(client as never, factory, 1, "all")).resolves.toMatchObject({
      count: 0,
      items: [],
    });
  });

  it("keeps a failed card next to successful cards and pins both multicalls to one block", async () => {
    const ok = (result: unknown) => ({ status: "success", result });
    const values = [
      "Contrato",
      10n,
      0n,
      participant,
      participant,
      participant,
      100n,
      0n,
      0n,
      0n,
    ].map(ok);
    const client = {
      readContract: vi.fn().mockResolvedValue(2n),
      getBlockNumber: vi.fn().mockResolvedValue(77n),
      multicall: vi
        .fn()
        .mockResolvedValueOnce([escrow, factory])
        .mockResolvedValueOnce([
          ...values,
          { status: "failure", error: new Error("bad") },
          ...values.slice(1),
        ]),
    };
    const result = await fetchDiscovery(client as never, factory, 1, "all");
    expect(result.items[0].card?.title).toBe("Contrato");
    expect(result.items[1].error).toMatch(/leer/);
    expect(client.multicall).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ blockNumber: 77n }),
    );
    expect(client.multicall).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ blockNumber: 77n }),
    );
  });

  it("marks a card as failed when its contract state is unknown", async () => {
    const ok = (result: unknown) => ({ status: "success", result });
    const client = {
      readContract: vi.fn().mockResolvedValue(1n),
      getBlockNumber: vi.fn().mockResolvedValue(77n),
      multicall: vi
        .fn()
        .mockResolvedValueOnce([escrow])
        .mockResolvedValueOnce(
          ["Contrato", 10n, 11n, participant, participant, participant, 0n, 0n, 0n, 0n].map(ok),
        ),
    };

    const result = await fetchDiscovery(client as never, factory, 1, "all");

    expect(result.items[0]).toEqual({ address: escrow, error: "Estado de escrow desconocido: 11" });
  });

  it("surfaces a fatal registry failure", async () => {
    const client = { readContract: vi.fn().mockRejectedValue(new Error("RPC unavailable")) };
    await expect(fetchDiscovery(client as never, factory, 1, "all")).rejects.toThrow(
      "RPC unavailable",
    );
  });
});
