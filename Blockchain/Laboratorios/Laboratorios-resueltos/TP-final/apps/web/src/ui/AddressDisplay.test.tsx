import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressDisplay } from "./AddressDisplay";

const address = "0x1234567890abcdef1234567890abcdef1234abcd" as const;
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AddressDisplay", () => {
  it("renders its requested responsive format", () => {
    const { rerender } = render(<AddressDisplay address={address} format="short" />);

    expect(screen.getByText("0x1234…abcd")).toBeInTheDocument();

    rerender(<AddressDisplay address={address} format="long" />);
    expect(screen.getByTestId("address-mobile")).toHaveClass("md:hidden");
    expect(screen.getByTestId("address-mobile")).toHaveTextContent("0x1234…abcd");
    expect(screen.getByTestId("address-desktop")).toHaveClass("hidden", "md:inline");
    expect(screen.getByTestId("address-desktop")).toHaveTextContent(address);
  });

  it("uses a Radix tooltip with a configurable side", () => {
    render(<AddressDisplay address={address} format="short" tooltipSide="bottom" />);
    const value = screen.getByLabelText(`Mostrar dirección completa: ${address}`);

    fireEvent.focus(value);

    expect(screen.getByRole("tooltip")).toHaveTextContent(address);
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-side", "bottom");
  });

  it("copies the full address and reports success temporarily", async () => {
    render(<AddressDisplay address={address} format="short" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar dirección" }));

    expect(writeText).toHaveBeenCalledWith(address);
    await act(async () => undefined);
    expect(screen.getAllByText("Copiada")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Dirección copiada" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.queryAllByText("Copiada")).toHaveLength(0);
  });

  it("reports clipboard failures", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    render(<AddressDisplay address={address} format="short" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar dirección" }));

    await act(async () => undefined);
    expect(screen.getAllByText("No se pudo copiar")).toHaveLength(2);

    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.queryAllByText("No se pudo copiar")).toHaveLength(0);
  });
});
