import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { walletConnectionRequestEvent } from "../wallet/wallet";
import { EscrowParticipants } from "./EscrowParticipants";

afterEach(cleanup);

const owner = "0x0000000000000000000000000000000000000001" as const;
const worker = "0x0000000000000000000000000000000000000002" as const;
const arbiter = "0x0000000000000000000000000000000000000003" as const;
const outsider = "0x0000000000000000000000000000000000000004" as const;

describe("EscrowParticipants", () => {
  it.each([
    ["Owner", owner],
    ["Worker", worker],
    ["Árbitro", arbiter],
  ] as const)("identifies the connected %s and marks only its address", (role, account) => {
    render(
      <EscrowParticipants account={account} owner={owner} worker={worker} arbiter={arbiter} />,
    );

    expect(screen.getByText(role, { selector: "dd" })).toBeInTheDocument();
    const marker = screen.getByText("Vos");
    expect(marker.closest("div")).toHaveTextContent(account);
    expect(screen.getAllByText("Vos")).toHaveLength(1);
  });

  it("identifies a connected account that is not a participant", () => {
    render(
      <EscrowParticipants account={outsider} owner={owner} worker={worker} arbiter={arbiter} />,
    );

    expect(screen.getByText("No sos participante")).toBeInTheDocument();
    expect(screen.queryByText("Vos")).not.toBeInTheDocument();
  });

  it("offers wallet connection when there is no connected account", () => {
    const listener = vi.fn();
    window.addEventListener(walletConnectionRequestEvent, listener);
    render(<EscrowParticipants owner={owner} worker={worker} arbiter={arbiter} />);

    expect(screen.getByText("Conectá tu wallet para identificarlo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Conectar wallet" }));
    expect(listener).toHaveBeenCalledOnce();
    expect(screen.queryByText("Vos")).not.toBeInTheDocument();
    window.removeEventListener(walletConnectionRequestEvent, listener);
  });
});
