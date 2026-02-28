import { useState, useEffect } from 'react';
import { getAll, convertToBase, formatMoney, type Transaction, type Subcategory, type CurrencyRate } from '@/db/database';
import { useApp } from '@/contexts/AppContext';

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

export function TopLeaks({ month, baseCurrency, rates }: Props) {
  const { refreshFlag } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    getAll<Transaction>('transactions').then(all => setTransactions(all.filter(t => monthKeyFromAny((t as any).date) === month)));
    getAll<Subcategory>('subcategories').then(setSubcategories);
  }, [month, refreshFlag]);

  const expenses = transactions.filter(t => t.type === 'expense');
  const subMap = Object.fromEntries(subcategories.map(s => [s.id, s.name]));
  const bySubcat: Record<string, number> = {};
  expenses.forEach(t => {
    const key = t.subcategory_id || 'sin-sub';
    bySubcat[key] = (bySubcat[key] || 0) + convertToBase(t.amount, t.currency, rates);
  });

  const sorted = Object.entries(bySubcat)
    .map(([id, total]) => ({ name: subMap[id] || 'Sin subcategoría', total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (sorted.length === 0) return <p className="text-center text-muted-foreground text-sm py-6">Sin datos</p>;
  const max = sorted[0].total;

  return (
    <div className="space-y-2.5 animate-fade-in">
      {sorted.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs font-medium w-28 truncate">{item.name}</span>
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-destructive/70 rounded-full" style={{ width: `${(item.total / max) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-24 text-right">{formatMoney(item.total, baseCurrency)}</span>
        </div>
      ))}
    </div>
  );
}
