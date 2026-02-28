import { useState, useEffect, useMemo } from 'react';
import { getAll, convertToBase, formatMoney, type Transaction, type CurrencyRate } from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  month: string;
  baseCurrency: string;
  rates: CurrencyRate[];
}

function dayKeyFromAny(v: any): string {
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // LOCAL
}

function monthKeyFromAny(v: any): string {
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // LOCAL
}

type Range = 'month' | '3m' | '12m';

function getDaysInMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return `${month}-${day}`;
  });
}

function getMonthsBack(month: string, n: number): string[] {
  const [y, m] = month.split('-').map(Number);
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 'month', label: 'Este mes' },
  { value: '3m', label: '3 meses' },
  { value: '12m', label: '12 meses' },
];

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function TrendChart({ month, baseCurrency, rates }: Props) {
  const { refreshFlag } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [range, setRange] = useState<Range>('month');

  useEffect(() => {
    getAll<Transaction>('transactions').then(setTransactions);
  }, [refreshFlag]);

  const data = useMemo(() => {
    if (range === 'month') {
      const days = getDaysInMonth(month);
      return days.map(day => {
        const dayTx = transactions.filter(t => dayKeyFromAny((t as any).date) === day);
        const income = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + convertToBase(t.amount, t.currency, rates), 0);
        const expense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + convertToBase(t.amount, t.currency, rates), 0);
        return { label: String(parseInt(day.slice(8))), Ingresos: Math.round(income), Gastos: Math.round(expense), Ahorro: Math.round(income - expense) };
      });
    } else {
      const n = range === '3m' ? 3 : 12;
      const months = getMonthsBack(month, n);
      return months.map(m => {
        const mTx = transactions.filter(t => monthKeyFromAny((t as any).date) === m);
        const income = mTx.filter(t => t.type === 'income').reduce((s, t) => s + convertToBase(t.amount, t.currency, rates), 0);
        const expense = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + convertToBase(t.amount, t.currency, rates), 0);
        const mIdx = parseInt(m.slice(5)) - 1;
        return { label: MONTH_SHORT[mIdx], Ingresos: Math.round(income), Gastos: Math.round(expense), Ahorro: Math.round(income - expense) };
      });
    }
  }, [transactions, month, range, rates]);

  return (
    <div className="animate-fade-in">
      <div className="flex gap-1.5 mb-3">
        {RANGE_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setRange(opt.value)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${range === opt.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
            {opt.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: range === 'month' ? 9 : 11 }} stroke="hsl(var(--muted-foreground))" interval={range === 'month' ? 4 : 0} />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(value: number) => formatMoney(value, baseCurrency)} />
          <Line type="monotone" dataKey="Ingresos" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Gastos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Ahorro" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
