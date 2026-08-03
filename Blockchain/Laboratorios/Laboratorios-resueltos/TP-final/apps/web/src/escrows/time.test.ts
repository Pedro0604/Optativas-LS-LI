import { describe, expect, it } from "vitest";
import { formatDuration, formatDeadlineDistance, formatDurationWithSeconds } from "./time";

describe("escrow time presentation", () => {
  it("combines exact seconds with a readable duration only when useful", () => {
    expect(formatDurationWithSeconds(86_400n)).toBe("86400 segundos (1 día)");
    expect(formatDurationWithSeconds(90_061n)).toBe("90061 segundos (1 día 1 hora)");
    expect(formatDurationWithSeconds(30n)).toBe("30 segundos");
  });

  it.each([
    [60n, "1 minuto"],
    [3_600n, "1 hora"],
    [5_400n, "1 hora 30 minutos"],
    [183_600n, "2 días 3 horas"],
    [3_661n, "1 hora 1 minuto"],
  ])("formats %s seconds with at most two significant units", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it("distinguishes upcoming, exact and elapsed deadlines", () => {
    expect(formatDeadlineDistance(200n, 100n)).toBe("Vence en 1 minuto 40 segundos");
    expect(formatDeadlineDistance(100n, 100n)).toBe("Venció hace 0 segundos");
    expect(formatDeadlineDistance(100n, 220n)).toBe("Venció hace 2 minutos");
  });
});
