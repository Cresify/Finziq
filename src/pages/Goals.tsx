import { useEffect, useMemo, useState } from "react";
import { Plus, Target, X, Pencil, Trash2, Wallet } from "lucide-react";
import { getAll, type Goal, formatMoney, putItem, genId, deleteItem } from "@/db/database";
import { useApp } from "@/contexts/AppContext";

type GoalPlanStatus = "on_track" | "tight" | "behind" | "completed";

function getMonthsLeft(deadline?: string) {
  if (!deadline) return null;

  const today = new Date();
  const endDate = new Date(deadline);

  if (isNaN(endDate.getTime())) return null;

  const yearDiff = endDate.getFullYear() - today.getFullYear();
  const monthDiff = endDate.getMonth() - today.getMonth();

  let monthsLeft = yearDiff * 12 + monthDiff;

  if (endDate.getDate() > today.getDate()) {
    monthsLeft += 1;
  }

  return Math.max(monthsLeft, 1);
}

function getGoalPlan(
  targetAmount: number,
  currentAmount: number,
  deadline?: string,
  currency: string = "CLP"
) {
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);

  if (remainingAmount <= 0) {
    return {
      monthsLeft: 0,
      monthlyNeeded: 0,
      status: "completed" as GoalPlanStatus,
      message: "Meta completada. Ya alcanzaste tu objetivo.",
    };
  }

  const monthsLeft = getMonthsLeft(deadline);

  if (!monthsLeft) {
    return {
      monthsLeft: null,
      monthlyNeeded: null,
      status: "tight" as GoalPlanStatus,
      message: "Agrega una fecha objetivo para ver cuánto deberías ahorrar al mes.",
    };
  }

  const monthlyNeeded = Math.ceil(remainingAmount / monthsLeft);

  let status: GoalPlanStatus = "tight";
  let message = `Debes ahorrar ${formatMoney(monthlyNeeded, currency)} al mes para llegar a tiempo.`;

  if (monthsLeft <= 2) {
    status = "behind";
    message = `Tu meta está muy cerca. Necesitarías ahorrar ${formatMoney(monthlyNeeded, currency)} al mes.`;
  } else if (monthsLeft <= 6) {
    status = "tight";
    message = `Meta exigente. Intenta aportar al menos ${formatMoney(monthlyNeeded, currency)} al mes.`;
  } else {
    status = "on_track";
    message = `Buen ritmo posible. Si aportas ${formatMoney(monthlyNeeded, currency)} al mes, deberías llegar bien.`;
  }

  return {
    monthsLeft,
    monthlyNeeded,
    status,
    message,
  };
}

function getGoalStatusLabel(status: GoalPlanStatus) {
  switch (status) {
    case "completed":
      return "Completada";
    case "on_track":
      return "Vas bien";
    case "tight":
      return "Justo";
    case "behind":
      return "Atrasado";
    default:
      return "";
  }
}

function getGoalStatusColor(status: GoalPlanStatus) {
  switch (status) {
    case "completed":
      return "text-green-600";
    case "on_track":
      return "text-emerald-600";
    case "tight":
      return "text-amber-600";
    case "behind":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

export default function GoalsPage() {
  const { settings, refreshFlag, refresh } = useApp();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [addingToGoalId, setAddingToGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");

  useEffect(() => {
    getAll<Goal>("goals").then((items) => {
      const sorted = [...items].sort((a, b) => b.created_at - a.created_at);
      setGoals(sorted);
    });
  }, [refreshFlag]);

  const resetForm = () => {
  setName("");
  setTargetAmount("");
  setCurrentAmount("");
  setDeadline("");
  setEditingGoalId(null);
  setShowForm(false);
};

const resetContribution = () => {
  setAddingToGoalId(null);
  setContributionAmount("");
};

const handleEditGoal = (goal: Goal) => {
  setName(goal.name);
  setTargetAmount(String(goal.target_amount));
  setCurrentAmount(String(goal.current_amount));
  setDeadline(goal.deadline || "");
  setEditingGoalId(goal.id);
  setShowForm(true);
};

const handleDeleteGoal = async (goalId: string) => {
  const confirmed = window.confirm("¿Seguro que quieres eliminar esta meta?");
  if (!confirmed) return;

  await deleteItem("goals", goalId);
  refresh();
};

const handleOpenContribution = (goalId: string) => {
  setAddingToGoalId(goalId);
  setContributionAmount("");
};

const handleSaveContribution = async (goal: Goal) => {
  const contribution = Number(contributionAmount);

  if (!contribution || contribution <= 0) {
    alert("Debes ingresar un monto válido.");
    return;
  }

  const updatedAmount = goal.current_amount + contribution;

  const updatedGoal: Goal = {
    ...goal,
    current_amount: updatedAmount,
    is_completed: updatedAmount >= goal.target_amount,
  };

  await putItem("goals", updatedGoal);
  refresh();
  resetContribution();
};

  const handleCreateGoal = async () => {
  if (!settings) return;

  const cleanName = name.trim();
  const target = Number(targetAmount);
  const current = Number(currentAmount || "0");

  if (!cleanName) {
    alert("Debes ingresar un nombre para la meta.");
    return;
  }

  if (!target || target <= 0) {
    alert("Debes ingresar un monto objetivo válido.");
    return;
  }

  if (current < 0) {
    alert("El monto ahorrado no puede ser negativo.");
    return;
  }

  const goalToSave: Goal = {
    id: editingGoalId || genId(),
    name: cleanName,
    target_amount: target,
    current_amount: current,
    deadline: deadline || undefined,
    created_at: editingGoalId
      ? goals.find((g) => g.id === editingGoalId)?.created_at || Date.now()
      : Date.now(),
    is_completed: current >= target,
  };

  await putItem("goals", goalToSave);
  refresh();
  resetForm();
};

  const currency = settings?.base_currency || "CLP";

  const totalSaved = useMemo(
    () => goals.reduce((sum, goal) => sum + goal.current_amount, 0),
    [goals]
  );

  if (!settings) {
    return <div className="px-4 pt-4 pb-24 text-sm text-muted-foreground">Cargando metas...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Metas</h1>
            <p className="text-muted-foreground text-sm">
              Crea y sigue tus objetivos de ahorro.
            </p>
          </div>

          <button
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm"
            onClick={() => setShowForm((prev) => !prev)}
            aria-label="Crear meta"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total ahorrado en metas</p>
          <p className="text-xl font-bold mt-1">{formatMoney(totalSaved, currency)}</p>
        </div>

        {showForm && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
  {editingGoalId ? "Editar meta" : "Nueva meta"}
</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresa los datos de tu objetivo de ahorro.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Viaje a Japón"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Monto objetivo</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="Ej: 3000000"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Monto ahorrado actual</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="Ej: 500000"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Fecha objetivo (opcional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreateGoal}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                {editingGoalId ? "Guardar cambios" : "Guardar meta"}
              </button>

              <button
                onClick={resetForm}
                className="h-11 px-4 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Aún no tienes metas</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primera meta y empieza a seguir tu progreso.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const progress =
                goal.target_amount > 0
                  ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                  : 0;

              const remaining = Math.max(goal.target_amount - goal.current_amount, 0);

              const plan = getGoalPlan(
                goal.target_amount,
                goal.current_amount,
                goal.deadline,
                currency
              );

              return (
                <div key={goal.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold truncate">{goal.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatMoney(goal.current_amount, currency)} de{" "}
                        {formatMoney(goal.target_amount, currency)}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-primary shrink-0">
                      {progress.toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
  <span>Te faltan {formatMoney(remaining, currency)}</span>
  {goal.deadline && <span>Fecha objetivo: {goal.deadline}</span>}
  {goal.is_completed && (
    <span className="text-primary font-medium">Meta completada</span>
  )}
</div>

<div className="mt-3 rounded-xl border border-border bg-background p-3">
  <div className="flex items-center justify-between gap-2">
    <span className="text-sm font-medium text-foreground">
      Plan para lograr tu meta
    </span>
    <span className={`text-xs font-semibold ${getGoalStatusColor(plan.status)}`}>
      {getGoalStatusLabel(plan.status)}
    </span>
  </div>

  {plan.monthlyNeeded !== null && (
    <p className="mt-2 text-sm font-medium text-foreground">
      Ahorro mensual necesario: {formatMoney(plan.monthlyNeeded, currency)}
    </p>
  )}

  {plan.monthsLeft !== null && (
    <p className="mt-1 text-xs text-muted-foreground">
      Meses restantes: {plan.monthsLeft}
    </p>
  )}

  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
    {plan.message}
  </p>
</div>

<div className="mt-4 flex gap-2 flex-wrap">
  <button
    onClick={() => handleOpenContribution(goal.id)}
    className="flex-1 min-w-[110px] h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2"
  >
    <Wallet className="w-4 h-4" />
    Aportar
  </button>

  <button
    onClick={() => handleEditGoal(goal)}
    className="flex-1 min-w-[110px] h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2"
  >
    <Pencil className="w-4 h-4" />
    Editar
  </button>

  <button
    onClick={() => handleDeleteGoal(goal.id)}
    className="flex-1 min-w-[110px] h-10 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 text-destructive"
  >
    <Trash2 className="w-4 h-4" />
    Eliminar
  </button>
</div>

{addingToGoalId === goal.id && (
  <div className="mt-3 rounded-xl border border-border bg-background p-3 space-y-3">
    <div>
      <label className="text-sm font-medium block mb-1">Monto a aportar</label>
      <input
        type="number"
        inputMode="decimal"
        value={contributionAmount}
        onChange={(e) => setContributionAmount(e.target.value)}
        placeholder="Ej: 50000"
        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
      />
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => handleSaveContribution(goal)}
        className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
      >
        Guardar aporte
      </button>

      <button
        onClick={resetContribution}
        className="h-10 px-4 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
      >
        Cancelar
      </button>
    </div>
  </div>
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