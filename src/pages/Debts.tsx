import { useEffect, useMemo, useState } from "react";
import { Landmark, Plus, X, Pencil, Trash2 } from "lucide-react";
import { getAll, putItem, deleteItem, genId, formatMoney, type Debt } from "@/db/database";
import { useApp } from "@/contexts/AppContext";

function getPriorityLabel(debt: Debt) {
  if (debt.strategy === "snowball") {
    return "Prioridad por saldo menor";
  }
  return "Prioridad por interés mayor";
}

function getStrategyDescription(strategy: Debt["strategy"]) {
  if (strategy === "snowball") {
    return "Pagas primero la deuda más pequeña para ganar impulso.";
  }

  return "Pagas primero la deuda con mayor interés para ahorrar más dinero.";
}

function simulateDebt(
  balance: number,
  annualRate: number,
  monthlyPayment: number
) {
  let debt = balance;
  const monthlyRate = annualRate / 100 / 12;

  let months = 0;
  let totalInterest = 0;

  while (debt > 0 && months < 600) {
    const interest = debt * monthlyRate;
    totalInterest += interest;

    debt = debt + interest - monthlyPayment;

    if (debt < 0) debt = 0;

    months++;
  }

  return {
    months,
    totalInterest,
  };
}

export default function DebtsPage() {
  const { settings, refreshFlag, refresh } = useApp();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [extraPayment, setExtraPayment] = useState("");
  const [strategy, setStrategy] = useState<Debt["strategy"]>("snowball");

  useEffect(() => {
    getAll<Debt>("debts").then((items) => {
      const sorted = [...items]
        .filter((item) => item.is_active)
        .sort((a, b) => {
          if (a.strategy !== b.strategy) return a.strategy.localeCompare(b.strategy);
          if (a.strategy === "snowball") return a.balance - b.balance;
          return b.interest_rate - a.interest_rate;
        });

      setDebts(sorted);
    });
  }, [refreshFlag]);

  const resetForm = () => {
    setName("");
    setBalance("");
    setInterestRate("");
    setMinimumPayment("");
    setExtraPayment("");
    setStrategy("snowball");
    setEditingDebtId(null);
    setShowForm(false);
  };

  const handleEditDebt = (debt: Debt) => {
    setName(debt.name);
    setBalance(String(debt.balance));
    setInterestRate(String(debt.interest_rate));
    setMinimumPayment(String(debt.minimum_payment));
    setExtraPayment(String(debt.extra_payment));
    setStrategy(debt.strategy);
    setEditingDebtId(debt.id);
    setShowForm(true);
  };

  const handleDeleteDebt = async (debtId: string) => {
    const confirmed = window.confirm("¿Seguro que quieres eliminar esta deuda?");
    if (!confirmed) return;

    await deleteItem("debts", debtId);
    refresh();
  };

  const handlePayDebt = async (debt: Debt) => {
  const input = prompt("¿Cuánto quieres abonar?");
  if (!input) return;

  const amount = Number(input);

  if (isNaN(amount) || amount <= 0) {
    alert("Monto inválido");
    return;
  }

  const newBalance = debt.balance - amount;

  const updatedDebt: Debt = {
    ...debt,
    balance: newBalance <= 0 ? 0 : newBalance,
  };

  await putItem("debts", updatedDebt);
  refresh();
};

  const handleSaveDebt = async () => {
    const cleanName = name.trim();
    const parsedBalance = Number(balance);
    const parsedInterest = Number(interestRate);
    const parsedMinimum = Number(minimumPayment);
    const parsedExtra = Number(extraPayment || "0");

    if (!cleanName) {
      alert("Debes ingresar un nombre para la deuda.");
      return;
    }

    if (!parsedBalance || parsedBalance <= 0) {
      alert("Debes ingresar un saldo válido.");
      return;
    }

    if (parsedInterest < 0) {
      alert("La tasa no puede ser negativa.");
      return;
    }

    if (!parsedMinimum || parsedMinimum <= 0) {
      alert("Debes ingresar un pago mínimo válido.");
      return;
    }

    if (parsedExtra < 0) {
      alert("El pago extra no puede ser negativo.");
      return;
    }

    const debtToSave: Debt = {
      id: editingDebtId || genId(),
      name: cleanName,
      balance: parsedBalance,
      interest_rate: parsedInterest,
      minimum_payment: parsedMinimum,
      extra_payment: parsedExtra,
      strategy,
      is_active: true,
      created_at: editingDebtId
        ? debts.find((d) => d.id === editingDebtId)?.created_at || Date.now()
        : Date.now(),
    };

    await putItem("debts", debtToSave);
    refresh();
    resetForm();
  };

  const totalDebt = useMemo(
    () => debts.reduce((sum, debt) => sum + debt.balance, 0),
    [debts]
  );

  const totalMonthlyPayment = useMemo(
    () => debts.reduce((sum, debt) => sum + debt.minimum_payment + debt.extra_payment, 0),
    [debts]
  );

  const currency = settings?.base_currency || "CLP";

  if (!settings) {
    return <div className="px-4 pt-4 pb-24 text-sm text-muted-foreground">Cargando deudas...</div>;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Plan de deudas</h1>
            <p className="text-muted-foreground text-sm">
              Organiza tus deudas y define una estrategia de pago.
            </p>
          </div>

          <button
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm"
            onClick={() => setShowForm((prev) => !prev)}
            aria-label="Crear deuda"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Deuda total</p>
            <p className="text-xl font-bold mt-1">{formatMoney(totalDebt, currency)}</p>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Pago mensual estimado</p>
            <p className="text-xl font-bold mt-1">{formatMoney(totalMonthlyPayment, currency)}</p>
          </div>
        </div>

        {showForm && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                {editingDebtId ? "Editar deuda" : "Nueva deuda"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresa los datos principales de la deuda.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Tarjeta Visa"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Saldo total</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="Ej: 1200000"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Tasa anual (%)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="Ej: 28"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Pago mínimo mensual</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={minimumPayment}
                  onChange={(e) => setMinimumPayment(e.target.value)}
                  placeholder="Ej: 60000"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Pago extra mensual</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(e.target.value)}
                  placeholder="Ej: 25000"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Estrategia</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as Debt["strategy"])}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="snowball">Bola de nieve</option>
                  <option value="avalanche">Avalancha</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveDebt}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                {editingDebtId ? "Guardar cambios" : "Guardar deuda"}
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

        {debts.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <Landmark className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Aún no tienes deudas</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Agrega tus deudas para priorizarlas y empezar a ordenarlas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {debts.map((debt) => {
 const totalPayment = debt.minimum_payment + debt.extra_payment;

const suggestedExtra = Math.max(
  10000,
  Math.round(totalPayment * 0.2 / 1000) * 1000
);

const simulation = simulateDebt(
  debt.balance,
  debt.interest_rate,
  totalPayment
);

const fasterSimulation = simulateDebt(
  debt.balance,
  debt.interest_rate,
  totalPayment + suggestedExtra
);

const monthsSaved = simulation.months - fasterSimulation.months;
const interestSaved = simulation.totalInterest - fasterSimulation.totalInterest;
  

  return (
              <div key={debt.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold truncate">{debt.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatMoney(debt.balance, currency)}
                    </p>
                  </div>

                  <span className="text-xs font-medium text-primary text-right">
                    {getPriorityLabel(debt)}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>Tasa: {debt.interest_rate}% anual</span>
                  <span>Pago mínimo: {formatMoney(debt.minimum_payment, currency)}</span>
                  <span>Pago extra: {formatMoney(debt.extra_payment, currency)}</span>
                  <span>
                    Pago total sugerido:{" "}
                    {formatMoney(debt.minimum_payment + debt.extra_payment, currency)}
                  </span>
                  <div className="mt-2">
                  <span className="font-medium">
                    Estrategia: {debt.strategy === "snowball" ? "Bola de nieve" : "Avalancha"}
                  </span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {getStrategyDescription(debt.strategy)}
                    </p>
                    </div>
                </div>

<div className="mt-3 rounded-xl border border-border bg-background p-3">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-foreground">
      Plan de salida
    </span>
    <span className="text-xs font-semibold text-primary">
      {simulation.months} meses
    </span>
  </div>

  <p className="mt-2 text-xs text-muted-foreground">
    Terminarías de pagar en aproximadamente{" "}
    <span className="font-medium text-foreground">
      {simulation.months} meses
    </span>
  </p> 

  <p className="mt-1 text-xs text-muted-foreground">
    Intereses estimados:{" "}
    <span className="font-medium text-foreground">
      {formatMoney(Math.round(simulation.totalInterest), currency)}
    </span>
  </p>

  <div className="mt-2 text-xs text-muted-foreground">
    <p>
      Si aumentas tu pago en{" "}
      <span className="font-medium text-foreground">
        {formatMoney(suggestedExtra, currency)}
      </span>
      :
    </p>
    <p className="mt-1">
      • Terminas {monthsSaved} meses antes
    </p>
    <p>
      • Ahorras{" "}
      <span className="font-medium text-foreground">
        {formatMoney(Math.round(interestSaved), currency)}
      </span>{" "}
      en intereses
    </p>
  </div>
</div>

                <div className="mt-4 flex gap-2">
                <button
                onClick={() => handlePayDebt(debt)}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                Abonar
                </button>

                <button
                  onClick={() => handleEditDebt(debt)}
                  className="flex-1 h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2"
                >
                <Pencil className="w-4 h-4" />
                  Editar
                </button>

                <button
                  onClick={() => handleDeleteDebt(debt.id)}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 text-destructive"
                >
                <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}