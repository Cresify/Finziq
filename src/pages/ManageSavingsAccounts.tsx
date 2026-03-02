import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAll, putItem, genId, type SavingsAccount } from "@/db/database";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ManageSavingsAccounts() {
  const navigate = useNavigate();
  const { refresh } = useApp();

  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [newName, setNewName] = useState("");

  const load = () => {
    getAll<SavingsAccount>("savings_accounts").then((a) =>
      setAccounts(a.sort((x, y) => x.order - y.order))
    );
  };

  useEffect(() => {
    load();
  }, []);

  const addAccount = async () => {
    if (!newName.trim()) return;
    await putItem("savings_accounts", {
      id: genId(),
      name: newName.trim(),
      is_active: true,
      order: accounts.length,
    });
    setNewName("");
    load();
    refresh();
  };

  const rename = async (id: string, currentName: string) => {
    const name = prompt("Nuevo nombre:", currentName);
    if (!name?.trim()) return;
    const item = accounts.find((a) => a.id === id);
    if (!item) return;
    await putItem("savings_accounts", { ...item, name: name.trim() });
    load();
    refresh();
  };

  const toggleActive = async (id: string) => {
    const item = accounts.find((a) => a.id === id);
    if (!item) return;
    await putItem("savings_accounts", { ...item, is_active: !item.is_active });
    load();
    refresh();
  };

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border py-3 -mx-4 px-4 -mt-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Cuentas (ahorro / inversión)</h1>
      </header>

      <div className="max-w-lg mx-auto space-y-2 pt-4">
        {accounts.map((a) => (
          <div
            key={a.id}
            className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <span
              className={`flex-1 text-sm font-medium ${
                !a.is_active ? "line-through text-muted-foreground" : ""
              }`}
            >
              {a.name}
            </span>

            <button onClick={() => rename(a.id, a.name)} className="text-xs text-primary">
              Editar
            </button>

            <button
              onClick={() => toggleActive(a.id)}
              className={`text-xs ${a.is_active ? "text-muted-foreground" : "text-success"}`}
            >
              {a.is_active ? "Off" : "On"}
            </button>
          </div>
        ))}

        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Nueva cuenta"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAccount()}
          />
          <Button onClick={addAccount}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}