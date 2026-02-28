import { useState, useEffect } from 'react';
import { getAll, getCurrentMonth, type CurrencyRate } from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { KPICards } from '@/components/dashboard/KPICards';
import { ExpenseDonut } from '@/components/dashboard/ExpenseDonut';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { TopLeaks } from '@/components/dashboard/TopLeaks';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { CapitalAccumulatedChart } from "@/components/dashboard/CapitalAccumulatedChart";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, (m - 1) + delta, 1); // LOCAL
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  kpi: KPICards,
  donut: ExpenseDonut,
  trend: TrendChart,
  budget: BudgetProgress,
  'top-leaks': TopLeaks,
  capital: CapitalAccumulatedChart,
};

export default function Dashboard() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { settings, updateSettings, refreshFlag } = useApp();
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    getAll<CurrencyRate>('currency_rates').then(setRates);
  }, [refreshFlag]);

  if (!settings || rates.length === 0) return <div className="p-4"><div className="h-48 rounded-xl bg-card animate-pulse" /></div>;

  //const widgets = [...(settings.dashboard_layout || [])].sort((a, b) => a.order - b.order);
  const widgets = [...(settings.dashboard_layout || [])];

if (!widgets.some(w => w.id === 'capital')) {
  widgets.push({ id: 'capital', label: 'Capital acumulado', order: 99, visible: true });
}

widgets.sort((a, b) => a.order - b.order);
  const baseCurrency = settings.base_currency;
  const widgetProps = { month, baseCurrency, rates };

  const toggleWidget = async (id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    await updateSettings({ dashboard_layout: updated });
  };

  return (
    <div className="pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-base font-semibold capitalize">{formatMonthLabel(month)}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={() => setShowConfig(!showConfig)} className="p-2 rounded-lg hover:bg-secondary"><SlidersHorizontal className="w-4 h-4" /></button>
        </div>
      </div>
      {showConfig && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 animate-scale-in">
          <h3 className="text-sm font-semibold mb-3">Configurar dashboard</h3>
          <div className="space-y-2">
            {widgets.map(w => (
              <label key={w.id} className="flex items-center gap-3 text-sm cursor-pointer">
                <input type="checkbox" checked={w.visible} onChange={() => toggleWidget(w.id)} className="rounded accent-[hsl(var(--primary))]" />
                <span>{w.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-5">
        {widgets.filter(w => w.visible).map(w => {
          const Component = WIDGET_COMPONENTS[w.id];
          if (!Component) return null;
          return (
            <section key={w.id}>
              {w.id !== 'kpi' && <h3 className="text-sm font-semibold text-muted-foreground mb-2">{w.label}</h3>}
              {w.id === 'kpi' ? <Component {...widgetProps} /> : (
                <div className="bg-card border border-border rounded-xl p-4"><Component {...widgetProps} /></div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
