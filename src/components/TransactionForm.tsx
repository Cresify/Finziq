import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAll, getById, putItem, genId, getLocalDateStr, type Transaction, type Category, type Subcategory, type IncomeSource, type CurrencyRate, type SavingsAccount } from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

interface Props { editId?: string; }

function toTs(v: any): number {
  if (typeof v === "number") return v;

  const s = String(v ?? "");
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    return new Date(yy, mm - 1, dd).getTime(); // LOCAL
  }

  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

function ymdLocalFromTs(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // LOCAL
}

const TYPE_OPTIONS = [
  { value: 'expense' as const, label: 'Gasto', color: 'bg-destructive' },
  { value: 'income' as const, label: 'Ingreso', color: 'bg-success' },
  { value: 'savings_executed' as const, label: 'Ahorro', color: 'bg-info' },
];

export default function TransactionForm({ editId }: Props) {
  const navigate = useNavigate();
  const { settings, refresh } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);

  const [type, setType] = useState<Transaction['type']>('expense');
  const [amount, setAmount] = useState('');
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [currency, setCurrency] = useState('');
  const [date, setDate] = useState(ymdLocalFromTs(Date.now()));
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [incomeSourceId, setIncomeSourceId] = useState('');
  const [note, setNote] = useState('');
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [savingsAccountId, setSavingsAccountId] = useState('');

  useEffect(() => {
    getAll<Category>('categories').then(c => setCategories(c.filter(x => x.is_active).sort((a, b) => a.order - b.order)));
    getAll<Subcategory>('subcategories').then(s => setSubcategories(s.filter(x => x.is_active).sort((a, b) => a.order - b.order)));
    getAll<IncomeSource>('income_sources').then(s => setIncomeSources(s.filter(x => x.is_active).sort((a, b) => a.order - b.order)));
    getAll<CurrencyRate>('currency_rates').then(setCurrencyRates);
    getAll<SavingsAccount>('savings_accounts').then(a =>
  setSavingsAccounts(a.filter(x => x.is_active).sort((a,b)=>a.order-b.order))
);
  }, []);

  useEffect(() => { if (settings) setCurrency(prev => prev || settings.base_currency); }, [settings]);

  useEffect(() => {
    if (editId) {
      getById<Transaction>('transactions', editId).then(tx => {
        if (!tx) return;
        setType(tx.type);
setCurrency(tx.currency);
setSavingsAccountId((tx as any).savings_account_id || "");

const rawAmount = Number(tx.amount) || 0;

// Si es ahorro, mostramos el valor absoluto y marcamos retiro si era negativo
if (tx.type === "savings_executed") {
  setIsWithdrawal(rawAmount < 0);
  setAmount(String(Math.abs(rawAmount)));
} else {
  setIsWithdrawal(false);
  setAmount(String(Math.abs(rawAmount)));
}
        setDate(ymdLocalFromTs(toTs((tx as any).date)));; setCategoryId(tx.category_id || '');
        setSubcategoryId(tx.subcategory_id || ''); setIncomeSourceId(tx.income_source_id || '');
        setNote(tx.note || '');
      });
    }
  }, [editId]);

  const filteredSubs = subcategories.filter(s => s.category_id === categoryId);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const parsed = parseFloat(amount) || 0;

  // Por defecto todo positivo
  const baseAmount = Math.abs(parsed);

  // Si es ahorro y está en “Retiro”, lo guardamos negativo
  const finalAmount =
    type === "savings_executed" && isWithdrawal ? -baseAmount : baseAmount;

  const tx: Transaction = {
    id: editId || genId(),
    type,
    date: toTs(date),
    amount: finalAmount,
    currency: currency || settings?.base_currency || "CLP",
    note: note || undefined,
    category_id: type === "expense" ? categoryId || undefined : undefined,
    subcategory_id: type === "expense" ? subcategoryId || undefined : undefined,
    income_source_id: type === "income" ? incomeSourceId || undefined : undefined,
    savings_account_id: type === "savings_executed" ? (savingsAccountId || undefined) : undefined,
  };

  await putItem("transactions", tx);
  refresh();
  navigate(-1);
};

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">{editId ? 'Editar' : 'Nueva'} transacción</h1>
      </header>
      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="flex gap-2">
          {TYPE_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setType(opt.value)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${type === opt.value ? `${opt.color} text-primary-foreground shadow-sm` : 'bg-secondary text-secondary-foreground'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
  <div className="flex-1">
    <Label className="text-xs text-muted-foreground">Monto</Label>

    <div className="flex gap-2 mt-1">
      {type === "savings_executed" && (
        <button
          type="button"
          onClick={() => setIsWithdrawal(v => !v)}
          className={`h-14 px-3 rounded-lg border border-input text-sm font-semibold ${
            isWithdrawal
              ? "bg-destructive text-destructive-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
          title="Alternar depósito / retiro"
        >
          {isWithdrawal ? "Retiro" : "Depósito"}
        </button>
      )}

      <Input
        type="number"
        inputMode="numeric"
        step="1"
        placeholder="Ej: 10000"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="text-2xl font-bold h-14"
        required
        autoFocus
      />
    </div>
  </div>

  {/* Moneda queda aquí como ya la tenías */}
  <div className="w-24">
    <Label className="text-xs text-muted-foreground">Moneda</Label>
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className="w-full h-14 mt-1 rounded-lg border border-input bg-background px-3 text-sm"
    >
      {currencyRates.map(r => (
        <option key={r.currency_code} value={r.currency_code}>
          {r.currency_code}
        </option>
      ))}
    </select>
  </div>
</div>
        <div>
          <Label className="text-xs text-muted-foreground">Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
        </div>

        {type === "savings_executed" && (
  <div>
    <Label className="text-xs text-muted-foreground">Cuenta (ahorro / inversión)</Label>
    <select
      value={savingsAccountId}
      onChange={(e) => setSavingsAccountId(e.target.value)}
      className="w-full h-10 mt-1 rounded-lg border border-input bg-background px-3 text-sm"
      required
    >
      <option value="">Seleccionar...</option>
      {savingsAccounts.map(a => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  </div>
)}
        {type === 'expense' && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">Categoría</Label>
              <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setSubcategoryId(''); }} className="w-full h-10 mt-1 rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Seleccionar...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {filteredSubs.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Subcategoría</Label>
                <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} className="w-full h-10 mt-1 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Seleccionar...</option>
                  {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        {type === 'income' && (
          <div>
            <Label className="text-xs text-muted-foreground">Fuente de ingreso</Label>
            <select value={incomeSourceId} onChange={e => setIncomeSourceId(e.target.value)} className="w-full h-10 mt-1 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Seleccionar...</option>
              {incomeSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <Label className="text-xs text-muted-foreground">Nota (opcional)</Label>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: Almuerzo con equipo" className="mt-1" />
        </div>
        <Button type="submit" className="w-full h-12 text-base font-semibold mt-6">{editId ? 'Guardar' : 'Registrar'}</Button>
        {editId && (
          <Button type="button" variant="destructive" className="w-full" onClick={async () => {
            const { deleteItem } = await import('@/db/database');
            await deleteItem('transactions', editId);
            refresh();
            navigate(-1);
          }}>Eliminar</Button>
        )}
      </form>
    </div>
  );
}
