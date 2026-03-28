import { useEffect, useState } from "react";
import { Plus, Target } from "lucide-react";
import { getAll, type Goal, formatMoney } from "@/db/database";
import { useApp } from "@/contexts/AppContext";

export default function GoalsPage() {
  const { settings, refreshFlag } = useApp();
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    getAll<Goal>("goals").then(setGoals);
  }, [refreshFlag]);

  if (!settings) {
    return <div className="px-4 pt-4 pb-24 text-sm text-muted-foreground">Cargando metas...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Metas</h1>
            <p className="text-muted-foreground text-sm">
              Crea y sigue tus objetivos de ahorro.
            </p>
          </div>

          <button
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm"
            onClick={() => alert("Luego añadiremos el formulario para crear metas.")}
            aria-label="Crear meta"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Aún no tienes metas</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pronto podrás crear metas de ahorro y seguir su progreso.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const progress =
                goal.target_amount > 0
                  ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                  : 0;

              return (
                <div key={goal.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">{goal.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatMoney(goal.current_amount, settings.base_currency)} de{" "}
                        {formatMoney(goal.target_amount, settings.base_currency)}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-primary">
                      {progress.toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {goal.deadline && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Fecha objetivo: {goal.deadline}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}