import { useState, useEffect } from 'react';
import { getAll, convertToBase, formatMoney, type Transaction, type Budget, type Category, type CurrencyRate } from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { AlertTriangle } from 'lucide-react';

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

export function BudgetProgress({ month, baseCurrency, rates }: Props) {
  const { refreshFlag } = useApp();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getAll<Budget>('budgets').then(all => setBudgets(all.filter(b => b.month === month)));
    getAll<Transaction>('transactions').then(all =>
  setTransactions(all.filter(t => monthKeyFromAny((t as any).date) === month))
);
    getAll<Category>('categories').then(setCategories);
  }, [month, refreshFlag]);

  if (budgets.length === 0) return <p className="text-center text-muted-foreground text-sm py-6">Sin presupuestos para este mes</p>;

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const expenses = transactions.filter(t => t.type === 'expense');

  const items = budgets
    .map(b => {
      const spent = expenses.filter(t => t.category_id === b.category_id).reduce((s, t) => s + convertToBase(t.amount, t.currency, rates), 0);
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      return { ...b, catName: catMap[b.category_id] || '?', spent, pct };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-3 animate-fade-in">
      {items.map(it => (
        <div key={it.id}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium flex items-center gap-1">
              {it.catName}
              {it.pct >= 100 && <AlertTriangle className="w-3 h-3 text-destructive" />}
              {it.pct >= 80 && it.pct < 100 && <AlertTriangle className="w-3 h-3 text-warning" />}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {formatMoney(it.spent, baseCurrency)} / {formatMoney(it.amount, baseCurrency)}
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${it.pct >= 100 ? 'bg-destructive' : it.pct >= 80 ? 'bg-warning' : 'bg-primary'}`}
              style={{ width: `${Math.min(it.pct, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
