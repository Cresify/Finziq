import { useState, useEffect } from 'react';
import { getAll, convertToBase, type Transaction, type Category, type CurrencyRate } from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

interface Props {
  month: string;
  baseCurrency: string;
  rates: CurrencyRate[];
}

function monthKeyFromAny(v: any): string {
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // LOCAL
}

export function ExpenseDonut({ month, baseCurrency, rates }: Props) {
  const { refreshFlag } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
  getAll<Transaction>('transactions').then(all =>
    setTransactions(all.filter(t => monthKeyFromAny((t as any).date) === month))
  );
  getAll<Category>('categories').then(c => setCategories(c.sort((a, b) => a.order - b.order)));
}, [month, refreshFlag]);

  const expenses = transactions.filter(t => t.type === 'expense');
  const categoryTotals = categories
    .map(cat => ({
      name: cat.name,
      value: expenses.filter(t => t.category_id === cat.id).reduce((s, t) => s + convertToBase(t.amount, t.currency, rates), 0),
    }))
    .filter(d => d.value > 0);

  const total = categoryTotals.reduce((s, d) => s + d.value, 0);

  if (total === 0) return <p className="text-center text-muted-foreground text-sm py-10">Sin gastos este mes</p>;

  return (
  <div className="animate-fade-in flex flex-col">
    {/* Donut */}
    <div className="w-full h-[160px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categoryTotals}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            dataKey="value"
            stroke="none"
            paddingAngle={2}
          >
            {categoryTotals.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* Leyenda abajo */}
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
      {categoryTotals.map((d, i) => (
        <div key={d.name} className="flex items-center gap-2 text-xs">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: COLORS[i % COLORS.length] }}
          />
          <span className="text-muted-foreground truncate">{d.name}</span>
          <span className="ml-auto font-semibold tabular-nums">
            {Math.round((d.value / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  </div>
);
}
