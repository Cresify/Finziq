import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  getAll,
  putItem,
  ACCENT_PRESETS,
  clearAllBackupStores,
  bulkPutItems,
  type CurrencyRate,
} from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { Moon, Sun, ChevronRight, Palette, DollarSign, Tags, Download, Upload } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, refresh } = useApp();
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getAll<CurrencyRate>('currency_rates').then(setCurrencyRates);
  }, []);

  if (!settings) return null;

  const handleAddCurrency = async () => {
    const code = prompt('Código de moneda (ej: ARS, BRL):')?.toUpperCase().trim();
    if (!code || code.length !== 3) return;
    const rateStr = prompt(`Tasa: 1 ${code} = ? ${settings.base_currency}`);
    const rate = parseFloat(rateStr || '0');
    if (!rate) return;
    await putItem('currency_rates', { id: `rate-${code.toLowerCase()}`, currency_code: code, rate_to_base: rate });
    getAll<CurrencyRate>('currency_rates').then(setCurrencyRates);
    refresh();
  };

  const handleEditRate = async (id: string, code: string) => {
    const rateStr = prompt(`Nueva tasa: 1 ${code} = ? ${settings.base_currency}`);
    const rate = parseFloat(rateStr || '0');
    if (!rate) return;
    const existing = currencyRates.find(r => r.id === id);
    if (existing) await putItem('currency_rates', { ...existing, rate_to_base: rate });
    getAll<CurrencyRate>('currency_rates').then(setCurrencyRates);
    refresh();
  };

  const handleExportBackup = async () => {
  try {
    const settingsData = await getAll('settings');
    const transactions = await getAll('transactions');
    const categories = await getAll('categories');
    const subcategories = await getAll('subcategories');
    const budgets = await getAll('budgets');
    const currencyRatesData = await getAll('currency_rates');
    const savingsAccounts = await getAll('savings_accounts');
    const incomeSources = await getAll('income_sources');

    const backup = {
      settings: settingsData,
      transactions,
      categories,
      subcategories,
      budgets,
      currencyRates: currencyRatesData,
      savingsAccounts,
      incomeSources,
      exportedAt: new Date().toISOString(),
      app: 'Finziq',
      version: 1,     
    };

    const json = JSON.stringify(backup, null, 2);
    const fileName = `finziq-backup-${new Date().toISOString().slice(0, 10)}.json`;

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      const result = await Filesystem.writeFile({
        path: `Finziq/${fileName}`,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      try {
        await Share.share({
          title: 'Backup de Finziq',
          text: 'Aquí está tu backup de Finziq',
          url: result.uri,
          dialogTitle: 'Compartir backup',
        });
      } catch {
        alert(`Backup guardado correctamente.\n\nArchivo: ${fileName}`);
      }
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      alert('Backup exportado. Revisa tu carpeta de descargas.');
    }
  } catch (error) {
    console.error('Error exportando backup:', error);
    alert('Error al exportar el backup.');
  }
};

const handleImportBackupClick = () => {
  importInputRef.current?.click();
};

const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (backup?.app !== 'Finziq' || backup?.version !== 1) {
      alert('El archivo no parece ser un backup válido de Finziq.');
      event.target.value = '';
      return;
    }

    const confirmed = window.confirm(
      'Esto reemplazará todos los datos actuales de la app por los del backup. ¿Deseas continuar?'
    );

    if (!confirmed) {
      event.target.value = '';
      return;
    }

    await clearAllBackupStores();

    await bulkPutItems('settings', backup.settings ?? []);
    await bulkPutItems('transactions', backup.transactions ?? []);
    await bulkPutItems('categories', backup.categories ?? []);
    await bulkPutItems('subcategories', backup.subcategories ?? []);
    await bulkPutItems('income_sources', backup.incomeSources ?? []);
    await bulkPutItems('budgets', backup.budgets ?? []);
    await bulkPutItems('currency_rates', backup.currencyRates ?? []);
    await bulkPutItems('savings_accounts', backup.savingsAccounts ?? []);

    refresh();

    alert('Backup importado correctamente. La app se actualizará con los nuevos datos.');
    window.location.reload();
  } catch (error) {
    console.error('Error importando backup:', error);
    alert('No se pudo importar el backup.');
  } finally {
    event.target.value = '';
  }
};

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Ajustes</h1>
      <Section title="Apariencia" icon={<Palette className="w-4 h-4" />}>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm">Modo oscuro</span>
          <button onClick={() => updateSettings({ theme_mode: settings.theme_mode === 'dark' ? 'light' : 'dark' })}
            className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${settings.theme_mode === 'dark' ? 'bg-primary' : 'bg-secondary'}`}>
            <div className={`w-5 h-5 rounded-full bg-primary-foreground flex items-center justify-center transition-transform ${settings.theme_mode === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}>
              {settings.theme_mode === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
            </div>
          </button>
        </div>
        <div className="py-3">
          <span className="text-sm block mb-2">Color de acento</span>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(ACCENT_PRESETS).map(([key, { h, s, l, name }]) => (
              <button key={key} onClick={() => updateSettings({ accent_color: key })}
                className={`w-9 h-9 rounded-full border-2 transition-transform ${settings.accent_color === key ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ background: `hsl(${h}, ${s}%, ${l}%)` }} title={name} />
            ))}
          </div>
        </div>
      </Section>
      <Section title="Monedas" icon={<DollarSign className="w-4 h-4" />}>
        <div className="py-3">
          <span className="text-sm block mb-2">Moneda base</span>
          <select value={settings.base_currency} onChange={e => updateSettings({ base_currency: e.target.value })}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
            {currencyRates.map(r => <option key={r.currency_code} value={r.currency_code}>{r.currency_code}</option>)}
          </select>
        </div>
        <div className="py-3">
          <span className="text-sm block mb-2">Tasas de cambio</span>
          <div className="space-y-2">
            {currencyRates.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.currency_code}</span>
                <button onClick={() => handleEditRate(r.id, r.currency_code)} className="text-muted-foreground hover:text-foreground">
                  1 {r.currency_code} = {r.rate_to_base} {settings.base_currency}
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleAddCurrency} className="mt-2 text-sm text-primary font-medium">+ Agregar moneda</button>
        </div>
      </Section>
      <Section title="Gestión" icon={<Tags className="w-4 h-4" />}>
        <NavRow label="Categorías y subcategorías" onClick={() => navigate('/categories')} />
        <NavRow label="Fuentes de ingreso" onClick={() => navigate('/income-sources')} />
        <NavRow label="Cuentas (ahorro / inversión)" onClick={() => navigate('/savings-accounts')} />
        <NavRow label="Presupuestos mensuales" onClick={() => navigate('/budgets')} />
      </Section>
      
      <Section title="Respaldo" icon={<Download className="w-4 h-4" />}>
  <button
    onClick={handleExportBackup}
    className="w-full flex items-center justify-between py-3 text-sm"
  >
    <span>Exportar backup</span>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </button>

  <button
    onClick={handleImportBackupClick}
    className="w-full flex items-center justify-between py-3 text-sm"
  >
    <span>Importar backup</span>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </button>

  <input
    ref={importInputRef}
    type="file"
    accept="application/json,.json"
    className="hidden"
    onChange={handleImportBackup}
  />
</Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">{icon}<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2></div>
      <div className="bg-card border border-border rounded-xl px-4 divide-y divide-border">{children}</div>
    </div>
  );
}

function NavRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-3 text-sm">
      <span>{label}</span><ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
