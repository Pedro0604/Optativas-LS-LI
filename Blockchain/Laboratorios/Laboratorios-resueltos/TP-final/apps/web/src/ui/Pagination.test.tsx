import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("reports adjacent pages and disables unavailable directions", async () => {
    const onPageChange = vi.fn();
    const { rerender } = render(<Pagination page={1} pageCount={3} onPageChange={onPageChange} />);

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(<Pagination page={3} pageCount={3} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
