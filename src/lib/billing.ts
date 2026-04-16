import "cordova-plugin-purchase";

declare global {
  interface Window {
    store?: any;
    CdvPurchase?: any;
  }
}

export const PREMIUM_PRODUCT_ID = "finziq_premium_monthly";

export function initBilling(options: {
  onPremiumActivated: () => Promise<void> | void;
  onError?: (message: string) => void;
}) {
  const store = window.CdvPurchase?.store || window.store;
  const ProductType = window.CdvPurchase?.ProductType || {
    PAID_SUBSCRIPTION: "paid subscription",
  };
  const Platform = window.CdvPurchase?.Platform || {
    GOOGLE_PLAY: "android-playstore",
  };

  if (!store) {
    options.onError?.("Billing no disponible en este entorno.");
    return;
  }

  store.register([
    {
      id: PREMIUM_PRODUCT_ID,
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.GOOGLE_PLAY,
    },
  ]);

  store.when()
    .approved(async (transaction: any) => {
      try {
        await options.onPremiumActivated();
        transaction.finish();
      } catch {
        options.onError?.("No se pudo activar Premium después de la compra.");
      }
    })
    .verified(async (receipt: any) => {
      try {
        await options.onPremiumActivated();
        receipt.finish?.();
      } catch {
        options.onError?.("No se pudo verificar la compra.");
      }
    });

  store.error((err: any) => {
    options.onError?.(err?.message || "Error de compra.");
  });

  store.initialize?.([
    {
      platform: Platform.GOOGLE_PLAY,
    },
  ]);
}

export async function buyPremium() {
  const store = window.CdvPurchase?.store || window.store;

  if (!store) {
    throw new Error("Billing no disponible.");
  }

  const product = store.get?.(PREMIUM_PRODUCT_ID);

  if (!product) {
    throw new Error("Producto Premium no encontrado.");
  }

  const offer =
    product.getOffer?.() ||
    (Array.isArray(product.offers) ? product.offers[0] : null);

  if (offer?.order) {
    return offer.order();
  }

  if (store.order) {
    return store.order(PREMIUM_PRODUCT_ID);
  }

  throw new Error("No se encontró una oferta disponible para Premium.");
}