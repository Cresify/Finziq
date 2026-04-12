import { openDB, type IDBPDatabase } from 'idb';

// ─── Types ───────────────────────────────────────
export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'savings_executed';
  date: number;
  amount: number;
  currency: string; 
  note?: string;
  income_source_id?: string;
  category_id?: string;
  subcategory_id?: string;
  savings_account_id?: string;
}

export interface Category {
  id: string;
  name: string;
  is_active: boolean;
  order: number;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  is_active: boolean;
  order: number;
}

export interface IncomeSource {
  id: string;
  name: string;
  is_active: boolean;
  order: number;
}

export interface Budget {
  id: string;
  month: string;
  category_id: string;
  subcategory_id?: string;
  amount: number;
}

export interface CurrencyRate {
  id: string;
  currency_code: string;
  rate_to_base: number;
}

export interface DashboardWidget {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface AppSettings {
  id: string;
  base_currency: string;
  theme_mode: 'light' | 'dark';
  accent_color: string;
  dashboard_layout: DashboardWidget[];
  plan_type: "free" | "premium";
}

export type SavingsAccount = {
  id: string;
  name: string;
  order: number;
  is_active: boolean;
};

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  created_at: number;
  is_completed: boolean;
}

export interface FinancialEvent {
  id: string;
  name: string;
  amount: number;
  day_of_month: number;
  hour: number;
  minute: number;
  type: 'bill' | 'subscription' | 'debt' | 'other';
  note?: string;
  is_active: boolean;
  created_at: number;
}

export interface Debt {
  id: string;
  name: string;
  balance: number;
  interest_rate: number;
  minimum_payment: number;
  extra_payment: number;
  strategy: 'snowball' | 'avalanche';
  is_active: boolean;
  created_at: number;
}

// ─── Database ────────────────────────────────────
let dbInstance: IDBPDatabase | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB('GastosApp', 5, {
  upgrade(db, oldVersion) {
    // v1
    if (oldVersion < 1) {
      db.createObjectStore('transactions', { keyPath: 'id' });
      db.createObjectStore('categories', { keyPath: 'id' });
      db.createObjectStore('subcategories', { keyPath: 'id' });
      db.createObjectStore('income_sources', { keyPath: 'id' });
      db.createObjectStore('budgets', { keyPath: 'id' });
      db.createObjectStore('currency_rates', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'id' });
    }

    // v2
    if (oldVersion < 2) {
      if (!db.objectStoreNames.contains('savings_accounts')) {
        db.createObjectStore('savings_accounts', { keyPath: 'id' });
      }
    }

    if (oldVersion < 3) {
  if (!db.objectStoreNames.contains('goals')) {
    db.createObjectStore('goals', { keyPath: 'id' });
  }
}

if (oldVersion < 4) {
  if (!db.objectStoreNames.contains('financial_events')) {
    db.createObjectStore('financial_events', { keyPath: 'id' });
  }
}

if (oldVersion < 5) {
  if (!db.objectStoreNames.contains('debts')) {
    db.createObjectStore('debts', { keyPath: 'id' });
  }
}

  },
});
  return dbInstance;
}

// ─── Helpers ─────────────────────────────────────
export function convertToBase(amount: number, currency: string, rates: CurrencyRate[]): number {
  const rate = rates.find(r => r.currency_code === currency);
  return amount * (rate?.rate_to_base || 1);
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function genId(): string {
  return crypto.randomUUID();
}

export function getLocalMonthStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function shiftMonthLocal(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return getLocalMonthStr(d);
}


// ─── Accent presets ──────────────────────────────
export const ACCENT_PRESETS: Record<string, { h: number; s: number; l: number; name: string }> = {
  emerald: { h: 158, s: 64, l: 42, name: 'Esmeralda' },
  blue: { h: 217, s: 91, l: 60, name: 'Azul' },
  violet: { h: 263, s: 70, l: 50, name: 'Violeta' },
  rose: { h: 350, s: 89, l: 60, name: 'Rosa' },
  amber: { h: 38, s: 92, l: 50, name: 'Ámbar' },
  cyan: { h: 192, s: 91, l: 36, name: 'Cian' },
};

// ─── Generic DB operations ──────────────────────
export async function getAll<T>(store: string): Promise<T[]> {
  const db = await getDB();
  return db.getAll(store);
}

export async function getById<T>(store: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(store, id);
}

export async function putItem<T>(store: string, item: T): Promise<void> {
  const db = await getDB();
  await db.put(store, item);
}

export async function deleteItem(store: string, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

export const BACKUP_STORES = [
  'transactions',
  'categories',
  'subcategories',
  'income_sources',
  'budgets',
  'currency_rates',
  'settings',
  'savings_accounts',
] as const;

export type BackupStoreName = typeof BACKUP_STORES[number];

export async function clearStore(store: BackupStoreName): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function clearAllBackupStores(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(BACKUP_STORES, 'readwrite');

  for (const store of BACKUP_STORES) {
    await tx.objectStore(store).clear();
  }

  await tx.done;
}

export async function bulkPutItems<T>(store: BackupStoreName, items: T[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');

  for (const item of items) {
    await tx.objectStore(store).put(item);
  }

  await tx.done;
}

// ─── Seed data ───────────────────────────────────
export async function seedDatabase() {
  const db = await getDB();
  
  // ✅ Asegura cuentas de ahorro/inversión (aunque settings ya exista)
try {
  const existingAccounts = await db.getAll('savings_accounts');
  if (!existingAccounts || existingAccounts.length === 0) {
    const accTx = db.transaction(['savings_accounts'], 'readwrite');
    const store = accTx.objectStore('savings_accounts');

    await store.add({ id: 'sav-corriente', name: 'Cuenta corriente', is_active: true, order: 0 });
    await store.add({ id: 'sav-ahorro', name: 'Cuenta ahorro', is_active: true, order: 1 });
    await store.add({ id: 'sav-broker', name: 'Inversiones', is_active: true, order: 2 });

    await accTx.done;
  }
} catch {
  // si el store todavía no existe (version antigua), no hacemos nada
}
  
  const categories: Category[] = [
    { id: 'cat-fixed', name: 'Gastos fijos', is_active: true, order: 0 },
    { id: 'cat-food', name: 'Comida', is_active: true, order: 1 },
    { id: 'cat-transport', name: 'Transporte', is_active: true, order: 2 },
    { id: 'cat-leisure', name: 'Ocio', is_active: true, order: 3 },
    { id: 'cat-health', name: 'Salud', is_active: true, order: 4 },
    { id: 'cat-education', name: 'Educación', is_active: true, order: 5 },
    { id: 'cat-home', name: 'Hogar', is_active: true, order: 6 },
    { id: 'cat-debt', name: 'Deudas', is_active: true, order: 7 },
    { id: 'cat-subs', name: 'Suscripciones', is_active: true, order: 8 },
    { id: 'cat-other', name: 'Otros', is_active: true, order: 9 },
  ];

  const subcategories: Subcategory[] = [
    { id: 'sub-rent', category_id: 'cat-fixed', name: 'Arriendo', is_active: true, order: 0 },
    { id: 'sub-utilities', category_id: 'cat-fixed', name: 'Servicios básicos', is_active: true, order: 1 },
    { id: 'sub-insurance', category_id: 'cat-fixed', name: 'Seguros', is_active: true, order: 2 },
    { id: 'sub-grocery', category_id: 'cat-food', name: 'Supermercado', is_active: true, order: 0 },
    { id: 'sub-restaurant', category_id: 'cat-food', name: 'Restaurantes', is_active: true, order: 1 },
    { id: 'sub-delivery', category_id: 'cat-food', name: 'Delivery', is_active: true, order: 2 },
    { id: 'sub-fuel', category_id: 'cat-transport', name: 'Combustible', is_active: true, order: 0 },
    { id: 'sub-public', category_id: 'cat-transport', name: 'Transporte público', is_active: true, order: 1 },
    { id: 'sub-car-maint', category_id: 'cat-transport', name: 'Mantenimiento', is_active: true, order: 2 },
    { id: 'sub-entertainment', category_id: 'cat-leisure', name: 'Entretenimiento', is_active: true, order: 0 },
    { id: 'sub-travel', category_id: 'cat-leisure', name: 'Viajes', is_active: true, order: 1 },
    { id: 'sub-hobbies', category_id: 'cat-leisure', name: 'Hobbies', is_active: true, order: 2 },
    { id: 'sub-meds', category_id: 'cat-health', name: 'Medicamentos', is_active: true, order: 0 },
    { id: 'sub-consult', category_id: 'cat-health', name: 'Consultas', is_active: true, order: 1 },
    { id: 'sub-gym', category_id: 'cat-health', name: 'Gimnasio', is_active: true, order: 2 },
    { id: 'sub-courses', category_id: 'cat-education', name: 'Cursos', is_active: true, order: 0 },
    { id: 'sub-books', category_id: 'cat-education', name: 'Libros', is_active: true, order: 1 },
    { id: 'sub-cleaning', category_id: 'cat-home', name: 'Limpieza', is_active: true, order: 0 },
    { id: 'sub-furniture', category_id: 'cat-home', name: 'Muebles', is_active: true, order: 1 },
    { id: 'sub-repairs', category_id: 'cat-home', name: 'Reparaciones', is_active: true, order: 2 },
    { id: 'sub-credit', category_id: 'cat-debt', name: 'Tarjeta de crédito', is_active: true, order: 0 },
    { id: 'sub-loan', category_id: 'cat-debt', name: 'Préstamos', is_active: true, order: 1 },
    { id: 'sub-streaming', category_id: 'cat-subs', name: 'Streaming', is_active: true, order: 0 },
    { id: 'sub-software', category_id: 'cat-subs', name: 'Software', is_active: true, order: 1 },
    { id: 'sub-membership', category_id: 'cat-subs', name: 'Membresías', is_active: true, order: 2 },
    { id: 'sub-other', category_id: 'cat-other', name: 'Otros', is_active: true, order: 0 },
  ];

  const incomeSources: IncomeSource[] = [
    { id: 'inc-salary', name: 'Sueldo', is_active: true, order: 0 },
    { id: 'inc-freelance', name: 'Freelance', is_active: true, order: 1 },
    { id: 'inc-sales', name: 'Ventas', is_active: true, order: 2 },
    { id: 'inc-gifts', name: 'Regalos', is_active: true, order: 3 },
    { id: 'inc-other', name: 'Otros', is_active: true, order: 4 },
  ];

  const rates: CurrencyRate[] = [
    { id: 'rate-clp', currency_code: 'CLP', rate_to_base: 1 },
    { id: 'rate-usd', currency_code: 'USD', rate_to_base: 950 },
    { id: 'rate-eur', currency_code: 'EUR', rate_to_base: 1030 },
  ];

  const defaultWidgets: DashboardWidget[] = [
    { id: 'kpi', label: 'Resumen KPI', visible: true, order: 0 },
    { id: 'donut', label: 'Distribución gastos', visible: true, order: 1 },
    { id: 'trend', label: 'Evolución mensual', visible: true, order: 2 },
    { id: 'budget', label: 'Presupuestos', visible: true, order: 3 },
    { id: 'top-leaks', label: 'Top fugas', visible: true, order: 4 },
  ];

  const settings: AppSettings = {
    id: 'singleton',
    base_currency: 'CLP',
    theme_mode: 'light',
    accent_color: 'emerald',
    dashboard_layout: defaultWidgets,
    plan_type: "free",
  };

  const savingsAccounts: SavingsAccount[] = [
  { id: 'sav-corriente', name: 'Cuenta corriente', is_active: true, order: 0 },
  { id: 'sav-ahorro', name: 'Cuenta de ahorro', is_active: true, order: 1 },
  { id: 'sav-broker', name: 'Broker / Inversiones', is_active: true, order: 2 },
];

    // Categorías
  const existingCategories = await db.getAll('categories');
  if (!existingCategories || existingCategories.length === 0) {
    const tx = db.transaction('categories', 'readwrite');
    for (const c of categories) await tx.store.add(c);
    await tx.done;
  }

  // Subcategorías
  const existingSubcategories = await db.getAll('subcategories');
  if (!existingSubcategories || existingSubcategories.length === 0) {
    const tx = db.transaction('subcategories', 'readwrite');
    for (const s of subcategories) await tx.store.add(s);
    await tx.done;
  }

  // Fuentes de ingreso
  const existingIncomeSources = await db.getAll('income_sources');
  if (!existingIncomeSources || existingIncomeSources.length === 0) {
    const tx = db.transaction('income_sources', 'readwrite');
    for (const i of incomeSources) await tx.store.add(i);
    await tx.done;
  }

  // Tasas de cambio
  const existingRates = await db.getAll('currency_rates');
  if (!existingRates || existingRates.length === 0) {
    const tx = db.transaction('currency_rates', 'readwrite');
    for (const r of rates) await tx.store.add(r);
    await tx.done;
  }

  // Settings
  const existingSettings = await db.get('settings', 'singleton');
  if (!existingSettings) {
    const tx = db.transaction('settings', 'readwrite');
    await tx.store.add(settings);
    await tx.done;
  }

  // Cuentas de ahorro / inversión
  const existingSavingsAccounts = await db.getAll('savings_accounts');
  if (!existingSavingsAccounts || existingSavingsAccounts.length === 0) {
    const tx = db.transaction('savings_accounts', 'readwrite');
    for (const a of savingsAccounts) await tx.store.add(a);
    await tx.done;
  }
}
