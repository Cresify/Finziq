import { useEffect, useMemo, useState } from "react";
import { getAll, convertToBase, formatMoney, type Transaction, type CurrencyRate } from "@/db/database";
import { useApp } from "@/contexts/AppContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Mode = "year" | "all";

interface Props {
  month: string; // "YYYY-MM"
  baseCurrency: string;
  rates: CurrencyRate[];
}

const MONTH_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function toLocalMonthKey(v: any): string {
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthToLabel(ym: string) {
  const m = Number(ym.slice(5)) - 1;
  return MONTH_SHORT[m] ?? ym;
}

function compareYM(a: string, b: string) {
  return a.localeCompare(b); // "YYYY-MM" ordena bien
}

export function CapitalAccumulatedChart({ month, baseCurrency, rates }: Props) {
  const { refreshFlag } = useApp();
  const [mode, setMode] = useState<Mode>("year");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    getAll<Transaction>("transactions").then(setTransactions);
  }, [refreshFlag]);

  const data = useMemo(() => {
    // Solo movimientos "Ahorro e inversión" (antes savings_executed)
    const inv = transactions.filter(t => t.type === "savings_executed");

    // total por mes (en moneda base)
    const perMonth = new Map<string, number>();
    for (const t of inv) {
      const ym = toLocalMonthKey((t as any).date);
      const val = convertToBase(t.amount, t.currency, rates); // soporta negativos si los permites
      perMonth.set(ym, (perMonth.get(ym) ?? 0) + val);
    }

    const monthsAll = Array.from(perMonth.keys()).sort(compareYM);
    if (monthsAll.length === 0) return [];

    const selectedYear = month.slice(0, 4);
    const months =
      mode === "year"
        ? monthsAll.filter(ym => ym.startsWith(selectedYear)).sort(compareYM)
        : monthsAll;

    let acc = 0;
    return months.map(ym => {
      acc += perMonth.get(ym) ?? 0;
      return {
        ym,
        label: mode === "year" ? monthToLabel(ym) : ym, // año: "Ene", "Feb"... / histórico: "2025-11"
        Capital: Math.round(acc),
      };
    });
  }, [transactions, rates, mode, month]);

  if (data.length === 0) {
    return <p className="text-center text-muted-foreground text-sm py-6">Sin movimientos de ahorro/inversión</p>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex gap-1.5 mb-3">
        <button
          onClick={() => setMode("year")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${mode === "year" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >
          Año actual
        </button>
        <button
          onClick={() => setMode("all")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${mode === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >
          Histórico
        </button>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: mode === "year" ? 11 : 10 }} stroke="hsl(var(--muted-foreground))" interval={mode === "year" ? 0 : 2} />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => formatMoney(value, baseCurrency)}
          />
          <Line type="monotone" dataKey="Capital" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}