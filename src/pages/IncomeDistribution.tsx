import { useEffect, useState } from "react";
import {
  formatMoney,
  getAll,
  putItem,
  type IncomeDistribution,
} from "@/db/database";
import { useApp } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom"; 

export default function IncomeDistributionPage() {
  const { settings } = useApp();
  const isPremium = settings?.plan_type === "premium";
  const navigate = useNavigate();
  const currency = settings?.base_currency || "CLP";
  const [goals, setGoals] = useState([]);

const [income, setIncome] = useState(0);

const [distribution, setDistribution] = useState([
  { id: "needs", name: "Gastos fijos", percent: 50 },
  { id: "savings", name: "Ahorro / inversión", percent: 20 },
  { id: "lifestyle", name: "Disfrutar", percent: 30 },
]);

const [isLoaded, setIsLoaded] = useState(false);
const [saveMessage, setSaveMessage] = useState("");

  const calculateAmount = (percent: number) => {
    return (income * percent) / 100;
  };

  const getInsights = () => {
  if (!Array.isArray(distribution)) return [];

  const needs =
    distribution.find((item) => item.id === "needs")?.percent || 0;

  const savings =
    distribution.find((item) => item.id === "savings")?.percent || 0;

  const insights: { type: "good" | "warning" | "info"; text: string }[] = [];

  if (needs > 60) {
    insights.push({
      type: "warning",
      text: "Tus gastos fijos son muy altos. Podrías tener poco margen financiero.",
    });
  } else if (needs > 50) {
    insights.push({
      type: "warning",
      text: "Tus gastos fijos están por encima de lo recomendado.",
    });
  }

  if (savings < 10) {
    insights.push({
      type: "warning",
      text: "Tu ahorro es muy bajo. Estás en riesgo financiero.",
    });
  } else if (savings < 20) {
    insights.push({
      type: "info",
      text: "Podrías aumentar tu ahorro para mejorar tu estabilidad futura.",
    });
  } else {
    insights.push({
      type: "good",
      text: "Buen nivel de ahorro. Vas por buen camino.",
    });
  }

  if (needs <= 50 && savings >= 20) {
    insights.push({
      type: "good",
      text: "Tu distribución está bien equilibrada.",
    });
  }

  if (totalPercent !== 100) {
    insights.push({
      type: "warning",
      text: "Tu distribución no suma 100%. Ajusta los porcentajes.",
    });
  }

  if (goals.length > 0 && savings < 20) {
  insights.push({
    type: "warning",
    text: "Tu nivel de ahorro podría no ser suficiente para cumplir tus metas.",
  });
}

  return insights;
};

const getActionableRecommendations = () => {
  if (!Array.isArray(distribution)) return [];

  const needs =
    distribution.find((item) => item.id === "needs")?.percent || 0;

  const savings =
    distribution.find((item) => item.id === "savings")?.percent || 0;

  const recommendations: string[] = [];

  // Caso 1: gastos altos
  if (needs > 50) {
    const exceso = needs - 50;

    recommendations.push(
      `Reduce tus gastos fijos en ${Math.round(
        exceso
      )}% para mejorar tu margen financiero.`
    );
  }

  // Caso 2: ahorro bajo
  if (savings < 20) {
    const falta = 20 - savings;

    recommendations.push(
      `Aumenta tu ahorro en al menos ${Math.round(
        falta
      )}% para mejorar tu estabilidad futura.`
    );
  }

  // Caso 3: proyección de ahorro
  const ahorroMensual = calculateAmount(savings);

  if (ahorroMensual > 0) {
    recommendations.push(
      `Si mantienes este nivel de ahorro, en 6 meses acumularías ${formatMoney(
        ahorroMensual * 6,
        currency
      )}.`
    );
  }

  return recommendations;
};

const handleAutoAdjust = () => {
  setDistribution((prev) => {
    return prev.map((item) => {
      if (item.id === "needs") return { ...item, percent: 50 };
      if (item.id === "savings") return { ...item, percent: 20 };

      // lo restante se reparte
      return { ...item, percent: 30 / (prev.length - 2) };
    });
  });
};

const totalPercent = Array.isArray(distribution)
  ? distribution.reduce((sum, item) => sum + item.percent, 0)
  : 0;


useEffect(() => {
  const loadDistribution = async () => {
    try {
      const savedGoals = await getAll("goals");
        setGoals(savedGoals);
      const saved = await getAll<any>("income_distributions");
      const current = saved.find((item) => item.id === "default");

      if (current) {
        setIncome(Number(current.monthly_income || 0));

        // Formato nuevo
        if (Array.isArray(current.items) && current.items.length > 0) {
          setDistribution(current.items);
        }
        // Formato antiguo
        else if (
          typeof current.needs_percent === "number" &&
          typeof current.savings_percent === "number" &&
          typeof current.lifestyle_percent === "number"
        ) {
          setDistribution([
            { id: "needs", name: "Gastos fijos", percent: current.needs_percent },
            { id: "savings", name: "Ahorro / inversión", percent: current.savings_percent },
            { id: "lifestyle", name: "Disfrutar", percent: current.lifestyle_percent },
          ]);
        }
      }

      setIsLoaded(true);
    } catch (error) {
      console.error("Error cargando distribución:", error);
      setIsLoaded(true);
    }
  };

  loadDistribution();
}, []);

const handleSaveDistribution = async () => {
  const item: IncomeDistribution = {
  id: "default",
  monthly_income: income,
  items: distribution,
  updated_at: Date.now(),
};

  await putItem("income_distributions", item);
  setSaveMessage("Distribución guardada correctamente");

  setTimeout(() => {
    setSaveMessage("");
  }, 2000);
};

const handleResetDistribution = () => {
  setDistribution([
    { id: "needs", name: "Gastos fijos", percent: 50 },
    { id: "savings", name: "Ahorro / inversión", percent: 20 },
    { id: "lifestyle", name: "Disfrutar", percent: 30 },
  ]);
};

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Distribución de ingresos</h1>

    <div className="bg-card p-3 rounded-lg border">
        <p className="text-xs text-muted-foreground">
            Recomendación base: 50% gastos fijos, 20% ahorro o inversión y 30% disfrutar.
        </p>
    </div>

      {/* Ingreso */}
      <div>
        <label className="text-sm">Ingreso mensual</label>
        <input
          type="number"
          className="w-full border rounded-lg p-2 mt-1"
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
        />
      </div>

      {/* Bloques */}
      <div className="space-y-3">
        {Array.isArray(distribution) &&
            distribution.map((item) => (
  <div key={item.id} className="bg-card p-3 rounded-lg border space-y-3">
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={item.name}
        onChange={(e) =>
          setDistribution((prev) =>
            prev.map((entry) =>
              entry.id === item.id
                ? { ...entry, name: e.target.value }
                : entry
            )
          )
        }
        className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm"
      />

      {distribution.length > 1 && (
        <button
          onClick={() =>
            setDistribution((prev) => prev.filter((entry) => entry.id !== item.id))
          }
          className="h-10 px-3 rounded-lg border border-border text-sm text-destructive"
        >
          Eliminar
        </button>
      )}
    </div>

    <input
      type="range"
      min={0}
      max={100}
      value={item.percent}
      onChange={(e) =>
        setDistribution((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, percent: Number(e.target.value) }
              : entry
          )
        )
      }
    />

    <p className="text-xs text-muted-foreground">
      {item.percent}% → {formatMoney(calculateAmount(item.percent), currency)}
    </p>

    <div className="w-full h-2 bg-secondary rounded-full mt-1 overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${item.percent}%` }}
      />
    </div>
  </div>
))}
      </div>

      <button
  onClick={() =>
    setDistribution((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "Nueva categoría",
        percent: 0,
      },
    ])
  }
  className="w-full h-11 rounded-xl border border-dashed border-border text-sm font-medium"
>
  + Agregar categoría
</button>

      <div className="bg-card p-4 rounded-lg border">
  <p className="text-sm">
    Total:{" "}
    <span
      className={
        totalPercent === 100
          ? "text-green-600 font-medium"
          : "text-red-500 font-medium"
      }
    >
      {totalPercent}%
    </span>
  </p>

  {totalPercent !== 100 && (
    <p className="text-xs text-red-500 mt-1">
      La distribución debe sumar 100%
    </p>
  )}
</div>

<div className="space-y-2">
  <div className="flex gap-2">
    <button
      onClick={handleResetDistribution}
      className="flex-1 h-11 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
    >
      Restablecer base
    </button>

    <button
      onClick={handleSaveDistribution}
      disabled={!isLoaded || totalPercent !== 100}
      className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
    >
      Guardar distribución
    </button>
  </div>
{isPremium ? (
  <button
    onClick={handleAutoAdjust}
    className="w-full h-11 rounded-xl border border-primary text-primary text-sm font-medium"
  >
    Ajustar a recomendación
  </button>
) : (
  <button
    onClick={() => navigate("/premium")}
    className="w-full h-11 rounded-xl border border-amber-300 text-amber-700 text-sm font-medium"
  >
    🔒 Ajuste automático (Premium)
  </button>
)}

  {saveMessage && (
    <p className="text-xs text-green-600 text-center">{saveMessage}</p>
  )}
</div>

      {/* Fondo de emergencia */}
      <div className="bg-card p-4 rounded-lg border">
        <p className="text-sm font-medium">Fondo de emergencia (6 meses)</p>
        <p className="text-xs text-muted-foreground mt-1">
            Basado en tus gastos fijos mensuales
        </p>
        <p className="text-lg font-semibold mt-2">
            {formatMoney(
            calculateAmount(
                distribution.find((item) => item.id === "needs")?.percent || 0
            ) * 6,
                currency
            )}
        </p>
      </div>
      {/* Insights */}
        <div className="bg-card p-4 rounded-lg border space-y-2">
        <p className="text-sm font-medium">Análisis de tu distribución</p>

            {isPremium ? (
  getInsights().map((item, index) => (
    <p
      key={index}
      className={`text-xs ${
        item.type === "good"
          ? "text-green-600"
          : item.type === "warning"
          ? "text-red-500"
          : "text-muted-foreground"
      }`}
    >
      • {item.text}
    </p>
  ))
) : (
  <div className="text-xs text-muted-foreground">
    Desbloquea el análisis inteligente para entender mejor tu situación financiera.
  </div>
)}

    {isPremium ? (
  getActionableRecommendations().map((text, index) => (
    <p key={index} className="text-xs text-primary">
      • {text}
    </p>
  ))
) : (
  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs">
    🔒 Las recomendaciones inteligentes están disponibles en Premium
  </div>
)}
</div>      
    </div>
  );
}