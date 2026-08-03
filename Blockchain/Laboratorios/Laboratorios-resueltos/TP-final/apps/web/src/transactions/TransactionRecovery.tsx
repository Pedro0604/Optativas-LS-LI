import { useEffect, useState } from "react";
import { config, publicClient } from "../runtime";
import {
  readPendingTransactions,
  recoverPendingTransactions,
  type PendingTransaction,
} from "./coordinator";

type Recovered = PendingTransaction & { status: "pending" | "confirmed" | "reverted" };

export function TransactionRecovery() {
  const [transactions, setTransactions] = useState<Recovered[]>(() =>
    readPendingTransactions().map((item) => ({ ...item, status: "pending" })),
  );

  useEffect(() => {
    if (!transactions.length) return;
    const recover = () =>
      void recoverPendingTransactions(async (hash) => {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash });
          return { status: receipt.status };
        } catch {
          return null;
        }
      }).then((results) =>
        setTransactions(
          results.map(({ item, receipt }) => ({
            ...item,
            status: receipt?.status === "success" ? "confirmed" : (receipt?.status ?? "pending"),
          })),
        ),
      );
    recover();
    const timer = window.setInterval(recover, 12_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!transactions.length) return null;
  return (
    <aside
      className="mx-auto mt-3 w-[min(1120px,calc(100%-2rem))] rounded-lg border border-line bg-surface-raised p-3 text-sm"
      aria-label="Transacciones recuperadas"
    >
      {transactions.map((transaction) => (
        <p key={transaction.hash} role="status">
          {transaction.status === "pending"
            ? "Transacción prolongada, aún pendiente"
            : transaction.status === "confirmed"
              ? "Transacción confirmada"
              : "Transacción revertida"}
          {": "}
          <a
            className="text-primary underline"
            href={`${config.explorerUrl}/tx/${transaction.hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {transaction.hash}
          </a>
        </p>
      ))}
    </aside>
  );
}
