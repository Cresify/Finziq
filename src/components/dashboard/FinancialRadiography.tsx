import { useEffect, useMemo, useState } from "react";
import {
  getAll,
  convertToBase,
  formatMoney,
  type Transaction,
  type CurrencyRate,
  type Goal,
  type Debt,
} from "@/db/database";
import PremiumLockCard from "@/components/PremiumLockCard";
import { useApp } from "@/contexts/AppContext";

interface Props {
  month: string; // YYYY-MM
  baseCurrency: string;
  rates: CurrencyRate[];
}

function toTs(v: any): number {
  if (typeof v === "number") return v;

  const s = String(v ?? "");
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);

  if (m) {
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    return new Date(yy, mm - 1, dd).getTime();
  }

  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function monthKeyFromTs(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function calculateScore({
  income,
  expenses,
  savings,
  debt,
}: {
  income: number;
  expenses: number;
  savings: number;
  debt: number;
}) {
  let score = 50;

  if (income > 0) {
    const savingsRate = savings / income;
    const expenseRate = expenses / income;

    if (savingsRate >= 0.2) score += 20;
    else if (savingsRate >= 0.1) score += 10;
    else if (savingsRate < 0) score -= 15;

    if (expenseRate <= 0.7) score += 15;
    else if (expenseRate > 1) score -= 15;
  }

  if (debt === 0) score += 15;
  else if (income > 0 && debt / (income * 12) > 1) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getDiagnosis(score: number, savings: number) {
  if (score >= 80) {
    return "Tu situación financiera se ve fuerte. Mantén el ritmo.";
  }

  if (score >= 60) {
    return savings >= 0
      ? "Vas bien, pero todavía hay espacio para mejorar tu ahorro y control."
      : "Tienes buena base, pero este mes cerraste en negativo.";
  }

  if (score >= 40) {
    return "Tu situación financiera necesita más orden y seguimiento.";
  }

  return "Tu situación financiera está débil. Prioriza control de gastos y reducción de deudas.";
}

function getRecommendations({
  income,
  expenses,
  savings,
  debt,
  activeGoals,
}: {
  income: number;
  expenses: number;
  savings: number;
  debt: number;
  activeGoals: number;
}) {
  const recommendations: string[] = [];

  if (income === 0 && expenses > 0) {
    recommendations.push("Este mes registraste gastos pero no ingresos. Revisa si te falta registrar entradas de dinero.");
  }

  if (savings < 0) {
    recommendations.push("Tu balance del mes está en negativo. Reduce gastos no esenciales o ajusta tu presupuesto.");
  }

  if (income > 0 && expenses / income > 0.8) {
    recommendations.push("Tus gastos están consumiendo gran parte de tus ingresos. Intenta bajar gastos variables este mes.");
  }

  if (debt > 0 && income > 0 && debt / (income * 12) > 1) {
    recommendations.push("Tu nivel de deuda es alto en relación con tus ingresos. Prioriza pagos y evita nuevas deudas.");
  }

  if (debt > 0 && savings > 0) {
    recommendations.push("Tienes ahorro positivo este mes. Puedes destinar una parte a acelerar el pago de deudas.");
  }

  if (activeGoals > 0 && savings > 0) {
    recommendations.push("Tienes metas activas y un balance positivo. Considera aportar una parte de tu ahorro a tus metas.");
  }

  if (savings >= 0 && debt === 0 && activeGoals === 0) {
    recommendations.push("Tu situación se ve estable. Podrías crear una meta nueva para aprovechar mejor tu ahorro.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Mantén el seguimiento mensual. Tu radiografía no muestra alertas críticas por ahora.");
  }

  return recommendations.slice(0, 3);
}

export function FinancialRadiography({ month, baseCurrency, rates }: Props) {
  const { settings } = useApp();
  const isPremium = settings?.plan_type === "premium";
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  useEffect(() => {
    getAll<Transaction>("transactions").then(setTransactions);
    getAll<Goal>("goals").then(setGoals);
    getAll<Debt>("debts").then(setDebts);
  }, [month]);

  const data = useMemo(() => {
    const monthTx = transactions.filter(
      (t) => monthKeyFromTs(toTs((t as any).date)) === month
    );

    const income = monthTx
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, rates), 0);

    const expenses = monthTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + convertToBase(t.amount, t.currency, rates), 0);

    const savings = income - expenses;

    const totalDebt = debts
      .filter((d) => d.is_active)
      .reduce((sum, d) => sum + d.balance, 0);

    const activeGoals = goals.filter((g) => !g.is_completed).length;

    const score = calculateScore({
      income,
      expenses,
      savings,
      debt: totalDebt,
    });

    return {
  income,
  expenses,
  savings,
  totalDebt,
  activeGoals,
  score,
  diagnosis: getDiagnosis(score, savings),
  recommendations: getRecommendations({
    income,
    expenses,
    savings,
    debt: totalDebt,
    activeGoals,
  }),
};

  }, [transactions, debts, goals, month, rates]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Radiografía financiera</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Resumen general de tu salud financiera del mes.
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="text-xl font-bold text-primary">{data.score}/100</p>
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${data.score}%` }}
          />
        </div>

        <p className="text-sm text-muted-foreground mt-3">{data.diagnosis}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Ingresos"
          value={formatMoney(data.income, baseCurrency)}
        />
        <MetricCard
          label="Gastos"
          value={formatMoney(data.expenses, baseCurrency)}
        />
        <MetricCard
          label="Ahorro neto"
          value={formatMoney(data.savings, baseCurrency)}
          positive={data.savings >= 0}
        /> 
        <MetricCard
          label="Deuda total"
          value={formatMoney(data.totalDebt, baseCurrency)}
        />
      </div>

      {isPremium ? (
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h4 className="text-sm font-semibold mb-2">Lectura rápida</h4>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Metas activas: {data.activeGoals}</p>
          <p>
            Balance del mes:{" "}
            <span className={data.savings >= 0 ? "text-primary font-medium" : "text-destructive font-medium"}>
              {data.savings >= 0 ? "positivo" : "negativo"}
            </span>
          </p>
          <p>
            Nivel de deuda:{" "}
            <span className="font-medium">
              {data.totalDebt === 0
                ? "sin deuda"
                : data.totalDebt < data.income * 3
                ? "moderado"
                : "alto"}
            </span>
          </p>
        </div>
      </div>
      ) : (
  <PremiumLockCard
    compact
    title="Lectura rápida avanzada"
    description="Desbloquea insights automáticos sobre tu balance, nivel de deuda y estado de tus metas."
  />
)}

      {isPremium ? (
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h4 className="text-sm font-semibold mb-2">Recomendaciones</h4>
        <div className="space-y-2">
          {data.recommendations.map((item, index) => (
        <div
        key={index}
        className="text-sm text-muted-foreground rounded-xl bg-background border border-border px-3 py-2"
        >
        {item}
        </div>
        ))}
        </div>
      </div> 
      ) : (
  <PremiumLockCard
    compact
    title="Recomendaciones inteligentes"
    description="Desbloquea recomendaciones personalizadas para mejorar tu salud financiera cada mes."
  />
)}
    </div>
  );
}

function MetricCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-base font-bold mt-1 ${
          positive === undefined
            ? ""
            : positive
            ? "text-primary"
            : "text-destructive"
        }`}
      >
        {value}
      </p>
    </div>
  );
}