import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAll, putItem, genId, type Category, type Subcategory } from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ManageCategories() {
  const navigate = useNavigate();
  const { refresh } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const load = () => {
    getAll<Category>('categories').then(c => setCategories(c.sort((a, b) => a.order - b.order)));
    getAll<Subcategory>('subcategories').then(s => setSubcategories(s.sort((a, b) => a.order - b.order)));
  };

  useEffect(load, []);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await putItem('categories', { id: genId(), name: newCatName.trim(), is_active: true, order: categories.length });
    setNewCatName(''); load(); refresh();
  };

  const addSubcategory = async (categoryId: string) => {
    if (!newSubName.trim()) return;
    const count = subcategories.filter(s => s.category_id === categoryId).length;
    await putItem('subcategories', { id: genId(), category_id: categoryId, name: newSubName.trim(), is_active: true, order: count });
    setNewSubName(''); load(); refresh();
  };

  const toggleActive = async (table: string, id: string, items: any[]) => {
    const item = items.find(i => i.id === id);
    if (item) { await putItem(table, { ...item, is_active: !item.is_active }); load(); refresh(); }
  };

  const rename = async (table: string, id: string, currentName: string, items: any[]) => {
    const name = prompt('Nuevo nombre:', currentName);
    if (!name?.trim()) return;
    const item = items.find(i => i.id === id);
    if (item) { await putItem(table, { ...item, name: name.trim() }); load(); refresh(); }
  };

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border py-3 -mx-4 px-4 -mt-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Categorías</h1>
      </header>
      <div className="max-w-lg mx-auto space-y-3 pt-4">
        {categories.map(cat => {
          const subs = subcategories.filter(s => s.category_id === cat.id);
          const isExp = expanded === cat.id;
          return (
            <div key={cat.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3">
                <button onClick={() => setExpanded(isExp ? null : cat.id)} className="text-muted-foreground">
                  {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <span className={`flex-1 text-sm font-medium ${!cat.is_active ? 'line-through text-muted-foreground' : ''}`}>{cat.name}</span>
                <button onClick={() => rename('categories', cat.id, cat.name, categories)} className="text-xs text-primary">Editar</button>
                <button onClick={() => toggleActive('categories', cat.id, categories)} className={`text-xs ${cat.is_active ? 'text-muted-foreground' : 'text-success'}`}>
                  {cat.is_active ? 'Off' : 'On'}
                </button>
              </div>
              {isExp && (
                <div className="border-t border-border px-4 py-2 space-y-1.5 bg-secondary/30">
                  {subs.map(sub => (
                    <div key={sub.id} className="flex items-center gap-2 py-1">
                      <span className={`flex-1 text-sm ${!sub.is_active ? 'line-through text-muted-foreground' : ''}`}>{sub.name}</span>
                      <button onClick={() => rename('subcategories', sub.id, sub.name, subcategories)} className="text-xs text-primary">Editar</button>
                      <button onClick={() => toggleActive('subcategories', sub.id, subcategories)} className={`text-xs ${sub.is_active ? 'text-muted-foreground' : 'text-success'}`}>
                        {sub.is_active ? 'Off' : 'On'}
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Input placeholder="Nueva subcategoría" value={newSubName} onChange={e => setNewSubName(e.target.value)} className="h-8 text-sm" onKeyDown={e => e.key === 'Enter' && addSubcategory(cat.id)} />
                    <Button size="sm" onClick={() => addSubcategory(cat.id)} className="h-8"><Plus className="w-3 h-3" /></Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="flex gap-2 mt-4">
          <Input placeholder="Nueva categoría" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
          <Button onClick={addCategory}><Plus className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
