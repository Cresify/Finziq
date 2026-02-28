import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAll,
  getCurrentMonth,
  convertToBase,
  formatMoney,
  deleteItem,
  type Transaction,
  type Category,
  type Subcategory,
  type IncomeSource,
  type CurrencyRate,
} from "@/db/database";
import { useApp } from "@/contexts/AppContext";
import { ChevronLeft, ChevronRight, Search, Pencil, Trash2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { genId, putItem } from "@/db/database";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, (m - 1) + delta, 1); // LOCAL
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function toTs(v: any): number {
  // Soporta: number timestamp, string ISO, string YYYY-MM-DD
  if (typeof v === "number") return v;

  const s = String(v ?? "");
  // Si viene "YYYY-MM-DD", fuerza fecha LOCAL (no UTC)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    return new Date(yy, mm - 1, dd).getTime(); // LOCAL midnight
  }

  // ISO u otra cosa parseable
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function monthKeyFromTs(ts: number): string {
  const d = new Date(ts); // LOCAL
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function dayKeyFromTs(ts: number): string {
  const d = new Date(ts); // LOCAL
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Transactions() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const navigate = useNavigate();
  const { settings, refreshFlag, refresh } = useApp();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [rates, setRates] = useState<CurrencyRate[]>([]);

  useEffect(() => {
    getAll<Transaction>("transactions").then((all) => {
      // Filtra por mes usando FECHA LOCAL
      const monthTx = all.filter((t) => monthKeyFromTs(toTs((t as any).date)) === month);
      setTransactions(monthTx);
    });

    getAll<Category>("categories").then(setCategories);
    getAll<Subcategory>("subcategories").then(setSubcategories);
    getAll<IncomeSource>("income_sources").then(setIncomeSources);
    getAll<CurrencyRate>("currency_rates").then(setRates);
  }, [month, refreshFlag]);

  if (!settings) return null;

  const monthLabel = useMemo(() => {
    const [yy, mm] = month.split("-").map(Number);
    return new Date(yy, mm - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  }, [month]);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const subMap = useMemo(() => Object.fromEntries(subcategories.map((s) => [s.id, s.name])), [subcategories]);
  const srcMap = useMemo(() => Object.fromEntries(incomeSources.map((s) => [s.id, s.name])), [incomeSources]);

  let filtered = transactions;

  if (filterType !== "all") filtered = filtered.filter((t) => (t as any).type === filterType);
  if (search) filtered = filtered.filter((t) => String((t as any).note || "").toLowerCase().includes(search.toLowerCase()));

  filtered.sort((a, b) => toTs((b as any).date) - toTs((a as any).date));

  const grouped: Record<string, Transaction[]> = {};
  filtered.forEach((t) => {
    const key = dayKeyFromTs(toTs((t as any).date));
    (grouped[key] ||= []).push(t);
  });

  const duplicate = async (t: Transaction) => {
    // Copia con "ahora" como timestamp (LOCAL no importa, es un instante)
    await putItem("transactions", { ...(t as any), id: genId(), date: Date.now() });
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteItem("transactions", id);
    refresh();
  };

  const typeLabel = (type: string) => (type === "income" ? "Ingreso" : type === "expense" ? "Gasto" : "Ahorro");
  //const typeColor = (type: string) => (type === "income" ? "text-success" : type === "expense" ? "text-destructive" : "text-info");
  
  const amountColor = (t: Transaction) => {
  if (t.type === "expense") return "text-destructive";
  if (t.type === "income") return "text-success";
  // savings_executed
  return t.amount < 0 ? "text-destructive" : "text-info";
};

const sign = (t: Transaction) => {
  if (t.type === "expense") return "-";
  if (t.type === "income") return "+";
  return t.amount < 0 ? "-" : "+";
};

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-2 rounded-lg hover:bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-base font-semibold capitalize">{monthLabel}</h2>

        <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="p-2 rounded-lg hover:bg-secondary">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto">
        {["all", "expense", "income", "savings_executed"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterType === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {t === "all" ? "Todos" : typeLabel(t)}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nota..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-10">Sin transacciones</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([day, txs]) => (
            <div key={day}>
              <p className="text-xs text-muted-foreground font-medium mb-2">
                {new Date(day + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
              </p>

              <div className="space-y-2">
                {txs.map((t) => {
                  const tt: any = t;
                  const label =
                    tt.type === "expense"
                      ? catMap[tt.category_id || ""] || "Sin categoría"
                      : tt.type === "income"
                      ? srcMap[tt.income_source_id || ""] || "Sin fuente"
                      : "Ahorro e inversión";

                  const sub = tt.subcategory_id ? subMap[tt.subcategory_id] : undefined;
                  
                   return (
                    <div key={tt.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
                        {tt.note && <p className="text-xs text-muted-foreground truncate mt-0.5">{tt.note}</p>}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${amountColor(tt)}`}>
                          {sign(tt)}
                          {formatMoney(Math.abs(tt.amount), tt.currency)}
                        </p>

                        {tt.currency !== settings.base_currency && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            ≈ {formatMoney(convertToBase(tt.amount, tt.currency, rates), settings.base_currency)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <button onClick={() => navigate(`/edit/${tt.id}`)} className="p-1.5 rounded hover:bg-secondary">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => duplicate(t)} className="p-1.5 rounded hover:bg-secondary">
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(tt.id)} className="p-1.5 rounded hover:bg-secondary">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}