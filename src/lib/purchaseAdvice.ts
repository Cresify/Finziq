export interface PurchaseAdviceResult {
  primary: string;
  secondary?: string;
}

export function getPurchaseAdvice(params: {
  price: number;
  monthlyImpact: number;
  freeCapacity: number;
  paymentMode: "full" | "installments";
  installments: number;
}) : PurchaseAdviceResult {
  const { price, monthlyImpact, freeCapacity, paymentMode, installments } = params;

  if (freeCapacity <= 0) {
    return {
      primary: "Hoy no tienes margen mensual disponible.",
      secondary: "Antes de comprar, conviene reducir gastos o aumentar ingresos.",
    };
  }

  if (paymentMode === "full") {
    if (price <= freeCapacity * 0.5) {
      return {
        primary: "La compra al contado parece razonable.",
        secondary: "No debería afectar demasiado tu margen mensual.",
      };
    }

    if (price <= freeCapacity) {
      return {
        primary: "Podrías comprarlo al contado, pero con precaución.",
        secondary: "Te dejaría con poco margen este mes.",
      };
    }

    const monthsToAfford = Math.ceil(price / freeCapacity);

    if (monthsToAfford === 1) {
      return {
        primary: "Hoy no conviene al contado.",
        secondary: "Si esperas 1 mes y mantienes tu margen actual, sería más viable.",
      };
    }

    return {
      primary: "Hoy no conviene al contado.",
      secondary: `Si esperas ${monthsToAfford} meses y mantienes tu margen actual, sería más viable.`,
    };
  }

  if (monthlyImpact <= freeCapacity * 0.5) {
    return {
      primary: `En ${installments} cuotas sí parece manejable.`,
      secondary: "El impacto mensual no debería desordenar demasiado tus finanzas.",
    };
  }

  if (monthlyImpact <= freeCapacity) {
    return {
      primary: `En ${installments} cuotas podría funcionar, pero con precaución.`,
      secondary: "Te consumiría una parte importante del margen mensual.",
    };
  }

  const extraNeeded = Math.ceil(monthlyImpact - freeCapacity);

  return {
    primary: `Ni en ${installments} cuotas se ve cómodo por ahora.`,
    secondary: `Necesitarías liberar aprox. $${extraNeeded.toLocaleString("es-CL")} más al mes para que calce mejor.`,
  };
}