export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Calendario financiero</h1>
          <p className="text-muted-foreground text-sm">
            Aquí podrás gestionar pagos, suscripciones y recordatorios.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Próximos pagos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Próximamente podrás programar cuentas y alertas mensuales.
          </p>
        </div>
      </div>
    </div>
  );
}