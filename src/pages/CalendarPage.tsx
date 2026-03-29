import { useEffect, useMemo, useState } from "react";
import { BellRing, BellOff, CalendarDays, Plus, X, Pencil, Trash2 } from "lucide-react";
import { getAll, putItem, genId, formatMoney, deleteItem, type FinancialEvent } from "@/db/database";
import { useApp } from "@/contexts/AppContext";
import {
  scheduleFinancialEventNotification,
  cancelFinancialEventNotification,
  ensureNotificationPermissions,
  rescheduleAllFinancialEventNotifications,
} from "@/lib/financialNotifications";

function getEventStatus(dayOfMonth: number) {
  const today = new Date().getDate();
  const diff = dayOfMonth - today;

  if (diff === 0) return { label: "Vence hoy", tone: "text-destructive" };
  if (diff > 0 && diff <= 3) return { label: "Próximamente", tone: "text-amber-500" };
  if (diff < 0) return { label: "Ya pasó este mes", tone: "text-muted-foreground" };
  return { label: "Pendiente", tone: "text-primary" };
}

export default function CalendarPage() {
  const { settings, refreshFlag, refresh } = useApp();
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [name, setName] = useState("");
const [amount, setAmount] = useState("");
const [dayOfMonth, setDayOfMonth] = useState("");
const [hour, setHour] = useState("9");
const [minute, setMinute] = useState("0");
const [type, setType] = useState<FinancialEvent["type"]>("bill");
const [note, setNote] = useState(""); 

  useEffect(() => {
  const loadEvents = async () => {
    const items = await getAll<FinancialEvent>("financial_events");

    const sorted = [...items].sort((a, b) => a.day_of_month - b.day_of_month);

    setEvents(sorted);

    await rescheduleAllFinancialEventNotifications(sorted);
  };

  loadEvents();
}, [refreshFlag]);

  useEffect(() => {
  ensureNotificationPermissions();
}, []);

  const resetForm = () => {
  setName("");
  setAmount("");
  setDayOfMonth("");
  setHour("9");
  setMinute("0");
  setType("bill");
  setNote("");
  setEditingEventId(null);
  setShowForm(false);
};

const handleEditEvent = (event: FinancialEvent) => {
  setName(event.name);
  setAmount(String(event.amount));
  setDayOfMonth(String(event.day_of_month));
  setHour(String(event.hour ?? 9));
  setMinute(String(event.minute ?? 0));
  setType(event.type);
  setNote(event.note || "");
  setEditingEventId(event.id);
  setShowForm(true);
};

const handleDeleteEvent = async (eventId: string) => {
  const confirmed = window.confirm("¿Seguro que quieres eliminar este evento?");
  if (!confirmed) return;

  await deleteItem("financial_events", eventId);
  await cancelFinancialEventNotification(eventId);
  refresh();
};

const handleToggleEvent = async (event: FinancialEvent) => {
  const updatedEvent: FinancialEvent = {
    ...event,
    is_active: !event.is_active,
  };

  await putItem("financial_events", updatedEvent);

  if (updatedEvent.is_active) {
    await scheduleFinancialEventNotification(updatedEvent);
  } else {
    await cancelFinancialEventNotification(updatedEvent.id);
  }

  refresh();
};

  const handleCreateEvent = async () => {
  const cleanName = name.trim();
const parsedAmount = Number(amount);
const parsedDay = Number(dayOfMonth);
const parsedHour = Number(hour);
const parsedMinute = Number(minute);

  if (!cleanName) {
    alert("Debes ingresar un nombre.");
    return;
  }

  if (!parsedAmount || parsedAmount <= 0) {
    alert("Debes ingresar un monto válido.");
    return;
  }

  if (!parsedDay || parsedDay < 1 || parsedDay > 31) {
    alert("Debes ingresar un día válido entre 1 y 31.");
    return;
  }

  if (
  Number.isNaN(parsedHour) ||
  parsedHour < 0 ||
  parsedHour > 23 ||
  Number.isNaN(parsedMinute) ||
  parsedMinute < 0 ||
  parsedMinute > 59
) {
  alert("Debes ingresar una hora válida.");
  return;
}

  const eventToSave: FinancialEvent = {
  id: editingEventId || genId(),
  name: cleanName,
  amount: parsedAmount,
  day_of_month: parsedDay,
  hour: parsedHour,
  minute: parsedMinute,
  type,
  note: note.trim() || undefined,
  is_active: true,
  created_at: editingEventId
    ? events.find((e) => e.id === editingEventId)?.created_at || Date.now()
    : Date.now(),
};

  await putItem("financial_events", eventToSave);
  await scheduleFinancialEventNotification(eventToSave);
  refresh();
  resetForm();
};

  const totalMonthly = useMemo(
    () => events.reduce((sum, item) => sum + item.amount, 0),
    [events]
  );

  if (!settings) {
    return <div className="px-4 pt-4 pb-24 text-sm text-muted-foreground">Cargando calendario...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Calendario financiero</h1>
            <p className="text-muted-foreground text-sm">
              Organiza cuentas, suscripciones y pagos recurrentes.
            </p>
          </div>

          <button
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm"
            onClick={() => setShowForm((prev) => !prev)}
            aria-label="Crear evento financiero"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total mensual programado</p>
          <p className="text-xl font-bold mt-1">{formatMoney(totalMonthly, settings.base_currency)}</p>
        </div>

        {showForm && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
  {editingEventId ? "Editar evento" : "Nuevo evento"}
</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configura un pago recurrente mensual.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Netflix"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Monto</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej: 8990"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Día del mes</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  placeholder="Ej: 15"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
  <div>
    <label className="text-sm font-medium block mb-1">Hora</label>
    <input
      type="number"
      inputMode="numeric"
      value={hour}
      onChange={(e) => setHour(e.target.value)}
      placeholder="9"
      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
    />
  </div>

  <div>
    <label className="text-sm font-medium block mb-1">Minuto</label>
    <input
      type="number"
      inputMode="numeric"
      value={minute}
      onChange={(e) => setMinute(e.target.value)}
      placeholder="0"
      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
    />
  </div>
</div>

              <div>
                <label className="text-sm font-medium block mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as FinancialEvent["type"])}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="bill">Cuenta</option>
                  <option value="subscription">Suscripción</option>
                  <option value="debt">Deuda</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Cobro automático"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreateEvent}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                {editingEventId ? "Guardar cambios" : "Guardar evento"}
              </button>

              <button
                onClick={resetForm}
                className="h-11 px-4 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Aún no tienes eventos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primer pago recurrente para organizar mejor tu mes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const status = getEventStatus(event.day_of_month);

              return (
                <div
  key={event.id}
  className={`rounded-2xl border bg-card p-4 shadow-sm ${
    event.is_active ? "" : "opacity-60"
  }`}
>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold truncate">{event.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
  Día {event.day_of_month} a las {String(event.hour ?? 9).padStart(2, "0")}:{String(event.minute ?? 0).padStart(2, "0")} ·{" "}
  {formatMoney(event.amount, settings.base_currency)}
</p>
                    </div>

                    <button
  onClick={() => handleToggleEvent(event)}
  className="shrink-0 p-1 rounded-lg hover:bg-secondary transition-colors"
  aria-label={event.is_active ? "Desactivar recordatorio" : "Activar recordatorio"}
>
  {event.is_active ? (
    <BellRing className="w-5 h-5 text-muted-foreground" />
  ) : (
    <BellOff className="w-5 h-5 text-muted-foreground opacity-50" />
  )}
</button>
                  </div>

                  <div className="mt-3 flex flex-col gap-1 text-xs">
  <span className={event.is_active ? status.tone : "text-muted-foreground"}>
    {event.is_active ? status.label : "Recordatorio desactivado"}
  </span>
  <span className="text-muted-foreground">
    Tipo:{" "}
    {event.type === "bill"
      ? "Cuenta"
      : event.type === "subscription"
      ? "Suscripción"
      : event.type === "debt"
      ? "Deuda"
      : "Otro"}
  </span>
  {event.note && <span className="text-muted-foreground">Nota: {event.note}</span>}
</div>

<div className="mt-4 flex gap-2">
  <button
    onClick={() => handleEditEvent(event)}
    className="flex-1 h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2"
  >
    <Pencil className="w-4 h-4" />
    Editar
  </button>

  <button
    onClick={() => handleDeleteEvent(event.id)}
    className="flex-1 h-10 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 text-destructive"
  >
    <Trash2 className="w-4 h-4" />
    Eliminar
  </button>
</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}