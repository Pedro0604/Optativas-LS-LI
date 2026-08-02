import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, parseAbiParameters } from "viem";
import type { Log } from "viem";
import { escrowFactoryAbi } from "@escrow/contracts";
import {
  createEscrowRequest,
  decodeCreatedEscrow,
  translateCreationError,
  type EscrowDraft,
} from "./creation";

const owner = "0x0000000000000000000000000000000000000001" as const;
const worker = "0x0000000000000000000000000000000000000002" as const;
const arbiter = "0x0000000000000000000000000000000000000003" as const;
const factory = "0x0000000000000000000000000000000000000005" as const;

const draft: EscrowDraft = {
  title: "Diseño de identidad",
  amountEth: "1.25",
  worker,
  arbiter,
  acceptance: { value: "2", unit: "days" },
  submission: { value: "12", unit: "hours" },
  review: { value: "3", unit: "days" },
  arbitration: { value: "48", unit: "hours" },
};

describe("escrow creation", () => {
  it("converts ETH, friendly durations and UTF-8 title into exact contract arguments", () => {
    expect(createEscrowRequest(draft, owner)).toEqual({
      ok: true,
      value: 1_250_000_000_000_000_000n,
      args: [worker, arbiter, 172800n, 43200n, 259200n, 172800n, "Diseño de identidad"],
    });
  });

  it("matches creation invariants including UTF-8 title bytes and participant roles", () => {
    const result = createEscrowRequest(
      {
        ...draft,
        title: "é".repeat(33),
        amountEth: "0",
        worker: owner,
        arbiter: "0x0000000000000000000000000000000000000000",
        review: { value: "0", unit: "hours" },
      },
      owner,
    );

    expect(result).toEqual({
      ok: false,
      errors: expect.objectContaining({
        title: "El título admite hasta 64 bytes (tiene 66).",
        amountEth: "El monto debe ser mayor a 0 ETH.",
        worker: "El worker debe ser distinto del owner.",
        arbiter: "El árbitro no puede ser la dirección cero.",
        review: "La duración debe ser mayor a cero.",
      }),
    });
  });

  it("decodes the factory event and rejects receipts without a creation event", () => {
    const escrow = "0x0000000000000000000000000000000000000004" as const;
    const event = escrowFactoryAbi.find((item) => item.type === "event" && item.name === "EscrowCreated")!;
    const logs = [
      {
        address: factory,
        topics: encodeEventTopics({ abi: [event], eventName: "EscrowCreated", args: { owner, worker, arbiter } }),
        data: encodeAbiParameters(
          parseAbiParameters("address escrowAddress, uint256 amount, uint256 acceptanceDuration, uint256 submissionDuration, uint256 reviewDuration, uint256 arbitrationDuration"),
          [escrow, 1n, 1n, 1n, 1n, 1n],
        ),
      },
    ];
    expect(decodeCreatedEscrow(logs as unknown as Log[], factory)).toBe(escrow);
    expect(decodeCreatedEscrow(logs as unknown as Log[], worker)).toBeUndefined();
    expect(decodeCreatedEscrow([], factory)).toBeUndefined();
  });

  it("translates predictable contract failures", () => {
    expect(translateCreationError(new Error("ZeroDuration"))).toBe(
      "Cada duración debe ser mayor a cero.",
    );
    expect(translateCreationError(new Error("User rejected the request"))).toBe(
      "La firma fue rechazada en la wallet.",
    );
  });
});
