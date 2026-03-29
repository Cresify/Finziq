import { useNavigate } from "react-router-dom";
import { ChevronRight, Flag, Landmark } from "lucide-react";

export default function Planning() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Planificación</h1>
          <p className="text-muted-foreground text-sm">
            Aquí estarán tus metas y tu plan para pagar deudas.
          </p>
        </div>

        <button
          onClick={() => navigate("/goals")}
          className="w-full rounded-2xl border bg-card p-4 shadow-sm text-left flex items-center justify-between"
        >
          <div className="flex items-start gap-3">
            <Flag className="w-5 h-5 mt-0.5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Metas</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Crea y sigue objetivos de ahorro.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <button
  onClick={() => navigate("/debts")}
  className="w-full rounded-2xl border bg-card p-4 shadow-sm text-left flex items-center justify-between"
>
  <div className="flex items-start gap-3">
    <Landmark className="w-5 h-5 mt-0.5 text-primary" />
    <div>
      <h2 className="text-lg font-semibold">Plan de deudas</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Organiza tus deudas y crea un plan de pago.
      </p>
    </div>
  </div>
  <ChevronRight className="w-5 h-5 text-muted-foreground" />
</button>
      </div>
    </div>
  );
}