import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAll, putItem, genId, type IncomeSource } from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ManageIncomeSources() {
  const navigate = useNavigate();
  const { refresh } = useApp();
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [newName, setNewName] = useState('');

  const load = () => { getAll<IncomeSource>('income_sources').then(s => setSources(s.sort((a, b) => a.order - b.order))); };
  useEffect(() => { load(); }, []);

  const addSource = async () => {
    if (!newName.trim()) return;
    await putItem('income_sources', { id: genId(), name: newName.trim(), is_active: true, order: sources.length });
    setNewName(''); load(); refresh();
  };

  const rename = async (id: string, currentName: string) => {
    const name = prompt('Nuevo nombre:', currentName);
    if (!name?.trim()) return;
    const item = sources.find(s => s.id === id);
    if (item) { await putItem('income_sources', { ...item, name: name.trim() }); load(); refresh(); }
  };

  const toggleActive = async (id: string) => {
    const item = sources.find(s => s.id === id);
    if (item) { await putItem('income_sources', { ...item, is_active: !item.is_active }); load(); refresh(); }
  };

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border py-3 -mx-4 px-4 -mt-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Fuentes de ingreso</h1>
      </header>
      <div className="max-w-lg mx-auto space-y-2 pt-4">
        {sources.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <span className={`flex-1 text-sm font-medium ${!s.is_active ? 'line-through text-muted-foreground' : ''}`}>{s.name}</span>
            <button onClick={() => rename(s.id, s.name)} className="text-xs text-primary">Editar</button>
            <button onClick={() => toggleActive(s.id)} className={`text-xs ${s.is_active ? 'text-muted-foreground' : 'text-success'}`}>
              {s.is_active ? 'Off' : 'On'}
            </button>
          </div>
        ))}
        <div className="flex gap-2 mt-4">
          <Input placeholder="Nueva fuente" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSource()} />
          <Button onClick={addSource}><Plus className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
