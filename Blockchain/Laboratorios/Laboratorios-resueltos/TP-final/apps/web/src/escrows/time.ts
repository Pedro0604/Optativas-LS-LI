import { useEffect, useState } from "react";

const units = [
  { seconds: 86_400n, singular: "día", plural: "días" },
  { seconds: 3_600n, singular: "hora", plural: "horas" },
  { seconds: 60n, singular: "minuto", plural: "minutos" },
  { seconds: 1n, singular: "segundo", plural: "segundos" },
] as const;

export function formatDuration(seconds: bigint): string {
  let remaining = seconds < 0n ? -seconds : seconds;
  const parts: string[] = [];

  for (const unit of units) {
    const amount = remaining / unit.seconds;
    if (amount === 0n) continue;
    parts.push(`${amount} ${amount === 1n ? unit.singular : unit.plural}`);
    remaining %= unit.seconds;
    if (parts.length === 2) break;
  }

  return parts.length ? parts.join(" ") : "0 segundos";
}

export function formatDeadlineDistance(deadline: bigint, now: bigint): string {
  return deadline > now
    ? `Vence en ${formatDuration(deadline - now)}`
    : `Venció hace ${formatDuration(now - deadline)}`;
}

export function formatDeadlineDate(timestamp: bigint): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(Number(timestamp) * 1_000);
}

/** Avanza desde el timestamp del bloque observado sin depender del reloj del dispositivo. */
export function useChainTime(chainTime: bigint, deadline?: bigint): bigint {
  const [now, setNow] = useState(chainTime);

  useEffect(() => {
    setNow(chainTime);
    const startedAt = performance.now();
    let timer: number;

    const tick = () => {
      const current = chainTime + BigInt(Math.floor((performance.now() - startedAt) / 1_000));
      setNow(current);
      const distance = deadline === undefined ? undefined : deadline - current;
      const delay = distance !== undefined && distance >= -60n && distance <= 60n ? 1_000 : 60_000;
      timer = window.setTimeout(tick, delay);
    };

    const initialDistance = deadline === undefined ? undefined : deadline - chainTime;
    timer = window.setTimeout(
      tick,
      initialDistance !== undefined && initialDistance >= -60n && initialDistance <= 60n
        ? 1_000
        : 60_000,
    );
    return () => window.clearTimeout(timer);
  }, [chainTime, deadline]);

  return now;
}
