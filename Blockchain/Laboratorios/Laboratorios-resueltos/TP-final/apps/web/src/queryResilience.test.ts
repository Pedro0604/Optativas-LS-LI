import { describe, expect, it, vi } from "vitest";
import {
  DETAIL_POLL_INTERVAL_MS,
  LIST_POLL_INTERVAL_MS,
  visiblePollingInterval,
} from "./queryResilience";

describe("RPC polling policy", () => {
  it("polls detail more frequently than lists", () => {
    expect(DETAIL_POLL_INTERVAL_MS).toBeLessThan(LIST_POLL_INTERVAL_MS);
  });

  it("pauses while the document is hidden", () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    expect(visiblePollingInterval(1234)()).toBe(false);
    vi.restoreAllMocks();
  });
});
