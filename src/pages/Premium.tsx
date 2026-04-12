import { useNavigate, useLocation } from "react-router-dom";
import { Check, Crown, ArrowLeft } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

const premiumFeatures = [
  "Alcanza tus metas más rápido con un plan claro",
  "Sal de tus deudas antes y paga menos intereses",
  "Descubre si una compra realmente te conviene",
  "Recibe recomendaciones basadas en tu situación real",
  "Entiende cómo cada decisión afecta tus metas",
  "Analiza tu estado financiero en segundos",
  "Mejora tus finanzas con sugerencias inteligentes",
];

export default function PremiumPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromFeature = location.state?.from;

  const { settings, updateSettings } = useApp();

  const isPremium = settings?.plan_type === "premium";

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24">
      <div className="max-w-md mx-auto space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>

            <div>
              <h1 className="text-xl font-bold leading-tight">
                    FinzIQ Premium
              </h1>

              {fromFeature && (
               <div className="mt-4 rounded-lg bg-primary/10 p-3 break-words">
                    <p className="text-xs text-primary">
                        Estás intentando acceder a:
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1 leading-snug break-words">
                        {fromFeature}
                    </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Desbloquea las funciones inteligentes para planificar mejor, salir
                antes de tus deudas y tomar mejores decisiones de compra.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900 font-semibold">
              Precio de lanzamiento
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">$1.990/mes</p>
            <p className="text-xs text-amber-800 mt-1">
                Precio de lanzamiento por tiempo limitado
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {premiumFeatures.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{feature}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {isPremium ? (
              <button
                onClick={() => updateSettings({ plan_type: "free" })}
                className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
              >
                Ya tienes Premium activo
              </button>
            ) : (
              <button
                onClick={() => updateSettings({ plan_type: "premium" })}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                Probar Premium ahora
              </button>
            )}

            <button
              onClick={() => navigate(-1)}
              className="w-full h-11 rounded-xl border border-border text-sm font-medium"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}