import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useDiscardDirtyFormOnWalletChange,
  useResetAccountSensitiveState,
  walletContextChangedEvent,
} from "./accountChange";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("account-change guards", () => {
  it("requires confirmation before a dirty form is discarded", () => {
    const discard = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderHook(() => useDiscardDirtyFormOnWalletChange(true, discard));

    window.dispatchEvent(new CustomEvent(walletContextChangedEvent));
    expect(discard).not.toHaveBeenCalled();
    window.dispatchEvent(new CustomEvent(walletContextChangedEvent));
    expect(discard).toHaveBeenCalledOnce();
  });

  it("resets account-bound pending state after a wallet context change", () => {
    const reset = vi.fn();
    renderHook(() => useResetAccountSensitiveState(reset));
    window.dispatchEvent(new CustomEvent(walletContextChangedEvent));
    expect(reset).toHaveBeenCalledOnce();
  });
});
