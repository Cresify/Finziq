export type PurchaseDecision = "recommended" | "caution" | "not_recommended";

export interface PurchaseEvaluationResult {
  decision: PurchaseDecision;
  freeCapacity: number;
  price: number;
  message: string;
}

export function evaluatePurchase(
  price: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  monthlyDebtPayments: number
): PurchaseEvaluationResult {
  const freeCapacity = monthlyIncome - monthlyExpenses - monthlyDebtPayments;

  if (freeCapacity <= 0) {
    return {
      decision: "not_recommended",
      freeCapacity,
      price,
      message:
        "Hoy no tienes margen mensual disponible. Esta compra no es recomendable por ahora.",
    };
  }

  if (price <= freeCapacity * 0.5) {
    return {
      decision: "recommended",
      freeCapacity,
      price,
      message:
        "La compra parece factible y no debería afectar demasiado tu equilibrio mensual.",
    };
  }

  if (price <= freeCapacity) {
    return {
      decision: "caution",
      freeCapacity,
      price,
      message:
        "Podrías comprarlo, pero reduciría bastante tu margen mensual. Mejor hacerlo con precaución.",
    };
  }

  return {
    decision: "not_recommended",
    freeCapacity,
    price,
    message:
      "Esta compra supera tu margen mensual disponible. No es recomendable en este momento.",
  };
}

export function getPurchaseDecisionLabel(decision: PurchaseDecision) {
  switch (decision) {
    case "recommended":
      return "Sí, es factible";
    case "caution":
      return "Con precaución";
    case "not_recommended":
      return "No recomendable";
    default:
      return "";
  }
}

export function getPurchaseDecisionColor(decision: PurchaseDecision) {
  switch (decision) {
    case "recommended":
      return "text-emerald-600";
    case "caution":
      return "text-amber-600";
    case "not_recommended":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

export function getPurchaseDecisionBg(decision: PurchaseDecision) {
  switch (decision) {
    case "recommended":
      return "bg-emerald-50 border-emerald-200";
    case "caution":
      return "bg-amber-50 border-amber-200";
    case "not_recommended":
      return "bg-red-50 border-red-200";
    default:
      return "bg-background border-border";
  }
}