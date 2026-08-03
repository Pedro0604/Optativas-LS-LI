import { describe, expect, it } from "vitest";
import {
  deadlineLabels,
  escrowActionLabels,
  escrowRoleNames,
  escrowRoleTabLabels,
  immutableTextPrivacyWarning,
  translateKnownContractError,
} from "./domainLabels";

describe("frontend domain labels", () => {
  it("centralizes Spanish roles, actions and deadlines", () => {
    expect(escrowRoleNames.arbiter).toBe("Árbitro");
    expect(escrowRoleTabLabels.arbiter).toBe("Como árbitro");
    expect(escrowActionLabels.expireReview).toBe("Finalizar revisión vencida");
    expect(deadlineLabels.arbitration).toBe("Arbitraje");
  });

  it("centralizes known contract errors and the immutable text warning", () => {
    expect(translateKnownContractError("execution reverted: NoFundsToWithdraw()")).toBe(
      "No hay fondos disponibles para retirar.",
    );
    expect(immutableTextPrivacyWarning).toContain("datos personales, credenciales ni secretos");
  });
});
