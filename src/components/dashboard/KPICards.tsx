import { useState, useEffect } from 'react';
import { getAll, convertToBase, formatMoney, type Transaction, type CurrencyRate } from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { TrendingUp, TrendingDown, PiggyBank, Landmark, Wallet } from 'lucide-react';

function monthKeyFromAny(v: any): string {
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // LOCAL
}

function toTs(v: any): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "");
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

interface Props {
  month: string;
  baseCurrency: string;
  rates: CurrencyRate[];
}

export function KPICards({ month, baseCurrency, rates }: Props) {
  const { refreshFlag } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
  getAll<Transaction>('transactions').then((all) => {
    setTransactions(all.filter((t) => monthKeyFromAny((t as any).date) === month));
  });
}, [month, refreshFlag]);

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + convertToBase(t.amount, t.currency, rates), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + convertToBase(t.amount, t.currency, rates), 0);
  const savingsReal = income - expense;
  const savingsExecuted = transactions.filter(t => t.type === 'savings_executed').reduce((s, t) => s + convertToBase(t.amount, t.currency, rates), 0);
  const available = Math.max(0, savingsReal - Math.max(0, savingsExecuted));


  const cards = [
    { label: 'Ingresos', value: income, icon: TrendingUp, colorClass: 'text-success' },
    { label: 'Gastos', value: expense, icon: TrendingDown, colorClass: 'text-destructive' },
    { label: 'Ahorro del mes', value: savingsReal, icon: PiggyBank, colorClass: 'text-primary' },
    { label: 'Ahorro e inversión', value: savingsExecuted, icon: Landmark, colorClass: 'text-info' },
    { label: 'Disponible', value: available, icon: Wallet, colorClass: 'text-card-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-card rounded-xl p-4 border border-border animate-fade-in">
          <div className="flex items-center gap-2 mb-1.5">
            <c.icon className={`w-4 h-4 ${c.colorClass}`} />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{c.label}</span>
          </div>
          <p className={`text-lg font-bold ${c.value < 0 ? 'text-destructive' : 'text-card-foreground'}`}>
            {formatMoney(c.value, baseCurrency)}
          </p>
        </div>
      ))}
    </div>
  );
}
