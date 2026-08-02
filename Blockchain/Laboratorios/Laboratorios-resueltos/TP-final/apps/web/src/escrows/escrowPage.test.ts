import { describe, expect, it, vi } from "vitest";
import { fetchEscrowPage } from "./escrowPage";

const factory = "0x0000000000000000000000000000000000000001" as const;
const escrow = "0x0000000000000000000000000000000000000002" as const;
const participant = "0x0000000000000000000000000000000000000003" as const;

describe("fetchEscrowPage", () => {
  it("uses the supplied registry and preserves failed escrows when filtering", async () => {
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(77n),
      getBlock: vi.fn().mockResolvedValue({ timestamp: 70n }),
      multicall: vi.fn().mockResolvedValue([
        { status: "success", result: "Contrato" },
        { status: "success", result: 10n },
        { status: "success", result: 0n },
        { status: "success", result: participant },
        { status: "success", result: participant },
        { status: "success", result: participant },
        { status: "success", result: 0n },
        { status: "success", result: 0n },
        { status: "success", result: 0n },
        { status: "success", result: 0n },
        { status: "failure", error: new Error("bad") },
      ]),
    };
    const count = vi.fn().mockResolvedValue(2);
    const addresses = vi.fn().mockResolvedValue([escrow, factory]);

    const result = await fetchEscrowPage(client as never, factory, 1, {
      count,
      addresses,
    });

    expect(count).toHaveBeenCalledWith(client, factory);
    expect(addresses).toHaveBeenCalledWith(client, factory, [1n, 0n], 77n);
    expect(result.items).toEqual([
      expect.objectContaining({ kind: "success", address: escrow }),
      expect.objectContaining({ kind: "error", address: factory }),
    ]);
  });
});
