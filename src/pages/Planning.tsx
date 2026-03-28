export default function Planning() {
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Planificación</h1>
          <p className="text-muted-foreground text-sm">
            Aquí estarán tus metas y tu plan para pagar deudas.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Metas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crea y sigue objetivos de ahorro.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Plan de deudas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organiza tus deudas y crea un plan de pago.
          </p>
        </div>
      </div>
    </div>
  );
}