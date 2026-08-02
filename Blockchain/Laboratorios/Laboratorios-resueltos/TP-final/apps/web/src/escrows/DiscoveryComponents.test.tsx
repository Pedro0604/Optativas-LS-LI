import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EscrowCard } from "./EscrowCard";
import { EscrowList } from "./EscrowList";
import { EscrowStateFilter } from "./EscrowStateFilter";
import { EscrowState } from "./EscrowState";
import type { EscrowItem, EscrowSummary } from "./discovery";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params }: { children: React.ReactNode; params: { address: string } }) => (
    <a href={`/escrows/${params.address}`}>{children}</a>
  ),
}));

afterEach(cleanup);

const address = "0x0000000000000000000000000000000000000001" as const;
const participant = "0x0000000000000000000000000000000000000002" as const;
const summary: EscrowSummary = {
  address,
  title: "Diseño",
  amount: 1_000_000_000_000_000_000n,
  state: EscrowState.PendingAcceptance,
  owner: participant,
  worker: participant,
  arbiter: participant,
  deadline: 1_800_000_000n,
};

describe("EscrowStateFilter", () => {
  it("reports a typed local state filter", async () => {
    const onChange = vi.fn();
    render(<EscrowStateFilter value="all" onChange={onChange} />);

    const filter = screen.getByRole("combobox", { name: "Estado" });
    await userEvent.click(filter);
    expect(screen.getByRole("option", { name: "Todos en esta página" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: "En arbitraje" }));

    expect(onChange).toHaveBeenCalledWith(EscrowState.PendingArbitration);
  });
});

describe("EscrowCard", () => {
  it("renders the escrow summary, deadline and detail link", () => {
    render(<EscrowCard summary={summary} chainTime={1_799_999_880n} />);

    expect(screen.getByRole("heading", { name: "Diseño" })).toBeInTheDocument();
    expect(screen.getByText("1 ETH")).toBeInTheDocument();
    expect(screen.getByText(/Fecha límite:/)).toBeInTheDocument();
    expect(screen.getByText("Vence en 2 minutos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver detalle" })).toHaveAttribute(
      "href",
      `/escrows/${address}`,
    );
  });

  it("omits the deadline when the summary has none", () => {
    render(<EscrowCard summary={{ ...summary, deadline: 0n }} chainTime={1n} />);

    expect(screen.queryByText(/Fecha límite:/)).not.toBeInTheDocument();
  });

  it("does not render a countdown for a terminal escrow", () => {
    render(
      <EscrowCard
        summary={{ ...summary, state: EscrowState.AcceptanceExpired }}
        chainTime={1_800_000_100n}
      />,
    );

    expect(screen.queryByText(/Venció hace/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fecha límite:/)).not.toBeInTheDocument();
  });
});

describe("EscrowList", () => {
  it("renders its empty state", () => {
    render(<EscrowList items={[]} chainTime={1n} onRetry={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "No hay escrows para mostrar" }),
    ).toBeInTheDocument();
  });

  it("renders successful and failed reads together", async () => {
    const onRetry = vi.fn();
    const items: EscrowItem[] = [
      { kind: "success", address, summary },
      { kind: "error", address: participant, error: "No se pudo leer este escrow." },
    ];
    render(<EscrowList items={items} chainTime={1n} onRetry={onRetry} />);

    expect(screen.getByRole("heading", { name: "Diseño" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lectura fallida" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
