import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAll, putItem, deleteItem, genId, getCurrentMonth, type Budget, type Category } from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

function getCurrentMonthLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabelLocal(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, (m - 1) + delta, 1); // LOCAL
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export default function ManageBudgets() {
  const navigate = useNavigate();
  const { settings, refresh } = useApp();
  const [month, setMonth] = useState(getCurrentMonthLocal());
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const load = () => {
    getAll<Category>('categories').then(c => setCategories(c.filter(x => x.is_active).sort((a, b) => a.order - b.order)));
    getAll<Budget>('budgets').then(all => setBudgets(all.filter(b => b.month === month)));
  };

  useEffect(load, [month]);

  if (!settings) return null;

  const budgetMap = Object.fromEntries(budgets.map(b => [b.category_id, b]));

  const setBudget = async (categoryId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const existing = budgetMap[categoryId];
    if (existing) {
      if (amount === 0) await deleteItem('budgets', existing.id);
      else await putItem('budgets', { ...existing, amount });
    } else if (amount > 0) {
      await putItem('budgets', { id: genId(), month, category_id: categoryId, amount });
    }
    load(); refresh();
  };

  const copyFromPrev = async () => {
    const prevMonth = shiftMonth(month, -1);
    const prevBudgets = (await getAll<Budget>('budgets')).filter(b => b.month === prevMonth);
    for (const pb of prevBudgets) {
      if (!budgetMap[pb.category_id]) {
        await putItem('budgets', { id: genId(), month, category_id: pb.category_id, amount: pb.amount });
      }
    }
    load(); refresh();
  };

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border py-3 -mx-4 px-4 -mt-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Presupuestos</h1>
      </header>
      <div className="max-w-lg mx-auto pt-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-sm font-semibold capitalize">{formatMonthLabelLocal(month)}</h2>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <button onClick={copyFromPrev} className="text-xs text-primary font-medium mb-4 block">Copiar del mes anterior</button>
        <div className="space-y-3">
          {categories.map(cat => {
            const budget = budgetMap[cat.id];
            return (
              <div key={cat.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <span className="flex-1 text-sm font-medium">{cat.name}</span>
                <div className="w-32">
                  <Input type="number" inputMode="numeric" placeholder="0" defaultValue={budget?.amount || ''} onBlur={e => setBudget(cat.id, e.target.value)} className="h-8 text-sm text-right" />
                </div>
                <span className="text-xs text-muted-foreground w-10">{settings.base_currency}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
