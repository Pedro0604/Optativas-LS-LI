import { parseEscrowState, type StateFilter } from "./EscrowState";

export type DiscoverySearch = { page: number; state: StateFilter };

/** Normaliza los parámetros de búsqueda y usa valores predeterminados cuando son inválidos. */
export function validateDiscoverySearch(search: Record<string, unknown>): DiscoverySearch {
  const page = typeof search.page === "number" ? search.page : Number(search.page ?? 1);
  const rawState = String(search.state ?? "all");
  let state: StateFilter = "all";
  if (rawState !== "all" && /^\d+$/.test(rawState)) {
    try {
      state = parseEscrowState(rawState);
    } catch {
      state = "all";
    }
  }
  return { page: Number.isInteger(page) && page > 0 ? page : 1, state };
}
