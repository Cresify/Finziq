import { useNavigate } from "react-router-dom";
import { ChevronRight, Flag, Landmark } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney, getAll, type Debt, type Goal, type Transaction } from "@/db/database";
import {
  evaluatePurchase,
  getPurchaseDecisionBg,
  getPurchaseDecisionColor,
  getPurchaseDecisionLabel,
} from "@/lib/purchaseAdvisor";
import { useApp } from "@/contexts/AppContext";
import { getPurchaseAdvice } from "@/lib/purchaseAdvice";
import { getPurchaseGoalImpact } from "@/lib/purchaseGoalImpact";


export default function Planning() {
const navigate = useNavigate();
const { settings } = useApp();

const [itemName, setItemName] = useState("");
const [itemPrice, setItemPrice] = useState("");
const [transactions, setTransactions] = useState<Transaction[]>([]);
const [debts, setDebts] = useState<Debt[]>([]);
const [goals, setGoals] = useState<Goal[]>([]);
const [showEvaluation, setShowEvaluation] = useState(false);
const [paymentMode, setPaymentMode] = useState<"full" | "installments">("full");
const [installments, setInstallments] = useState("3");

useEffect(() => {
  getAll<Transaction>("transactions").then(setTransactions);
  getAll<Debt>("debts").then((items) => {
    setDebts(items.filter((item) => item.is_active));
  });
  getAll<Goal>("goals").then(setGoals);
}, []);

useEffect(() => {
  setShowEvaluation(false);
}, [itemPrice, itemName]);


const currency = settings?.base_currency || "CLP";

const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

const monthlyIncome = useMemo(() => {
  return transactions
    .filter((tx) => {
      const d = new Date(tx.date);
      return (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        tx.type === "income"
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}, [transactions, currentMonth, currentYear]);

const monthlyExpenses = useMemo(() => {
  return transactions
    .filter((tx) => {
      const d = new Date(tx.date);
      return (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        tx.type === "expense"
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}, [transactions, currentMonth, currentYear]);

const monthlyDebtPayments = useMemo(() => {
  return debts.reduce(
    (sum, debt) => sum + debt.minimum_payment + debt.extra_payment,
    0
  );
}, [debts]);

const parsedPrice = Number(itemPrice || "0");
const parsedInstallments = Number(installments || "1");

const monthlyImpact =
  paymentMode === "installments" && parsedInstallments > 0
    ? parsedPrice / parsedInstallments
    : parsedPrice;

const evaluation =
  monthlyImpact > 0
    ? evaluatePurchase(
        monthlyImpact,
        monthlyIncome,
        monthlyExpenses,
        monthlyDebtPayments
      )
    : null;

    const goalImpact =
  evaluation
    ? getPurchaseGoalImpact({
        goals,
        freeCapacity: evaluation.freeCapacity,
        monthlyImpact,
      })
    : null;

    const advice =
  evaluation
    ? getPurchaseAdvice({
        price: parsedPrice,
        monthlyImpact,
        freeCapacity: evaluation.freeCapacity,
        paymentMode,
        installments: parsedInstallments > 0 ? parsedInstallments : 1,
      })
    : null;


  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Planificación</h1>
          <p className="text-muted-foreground text-sm">
            Aquí estarán tus metas y tu plan para pagar deudas.
          </p>
        </div>
 
        <button
          onClick={() => navigate("/goals")}
          className="w-full rounded-2xl border bg-card p-4 shadow-sm text-left flex items-center justify-between"
        >
          <div className="flex items-start gap-3">
            <Flag className="w-5 h-5 mt-0.5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Metas</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Crea y sigue objetivos de ahorro.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <button
  onClick={() => navigate("/debts")}
  className="w-full rounded-2xl border bg-card p-4 shadow-sm text-left flex items-center justify-between"
>
  <div className="flex items-start gap-3">
    <Landmark className="w-5 h-5 mt-0.5 text-primary" />
    <div>
      <h2 className="text-lg font-semibold">Plan de deudas</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Organiza tus deudas y crea un plan de pago.
      </p>
    </div>
  </div>
  <ChevronRight className="w-5 h-5 text-muted-foreground" />
</button>
<div className="rounded-2xl border bg-card p-4 shadow-sm space-y-4">
  <div>
    <h2 className="text-lg font-semibold">¿Puedo comprar esto?</h2>
    <p className="text-sm text-muted-foreground mt-1">
      Evalúa si una compra calza con tu situación financiera actual.
    </p>
  </div>

  <div className="space-y-3">
    <div>
      <label className="text-sm font-medium block mb-1">Artículo</label>
      <input
        type="text"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="Ej: Sofá, TV, notebook"
        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
      />
    </div>

    <div>
      <label className="text-sm font-medium block mb-1">Valor</label>
      <input
        type="number"
        inputMode="decimal"
        value={itemPrice}
        onChange={(e) => setItemPrice(e.target.value)}
        placeholder="Ej: 250000"
        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
      />
    </div>

    <div>
  <label className="text-sm font-medium block mb-1">Tipo de pago</label>
  <select
    value={paymentMode}
    onChange={(e) => setPaymentMode(e.target.value as "full" | "installments")}
    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
  >
    <option value="full">Pago único</option>
    <option value="installments">En cuotas</option>
  </select>
</div>

{paymentMode === "installments" && (
  <div>
    <label className="text-sm font-medium block mb-1">Número de cuotas</label>
    <input
      type="number"
      value={installments}
      onChange={(e) => setInstallments(e.target.value)}
      placeholder="Ej: 3, 6, 12"
      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
    />
  </div>
)}

    <button
  onClick={() => setShowEvaluation(true)}
  disabled={!parsedPrice || parsedPrice <= 0}
  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
>
      Evaluar compra
    </button>
  </div>

  {showEvaluation && evaluation && (
    <div className={`rounded-xl border p-3 ${getPurchaseDecisionBg(evaluation.decision)}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">
          Resultado
        </span>
        <span className={`text-sm font-semibold ${getPurchaseDecisionColor(evaluation.decision)}`}>
          {getPurchaseDecisionLabel(evaluation.decision)}
        </span>
      </div>

      <p className="mt-2 text-sm font-medium text-foreground">
  {itemName?.trim() ? itemName : "Esta compra"} por {formatMoney(parsedPrice, currency)}
</p>

{paymentMode === "installments" && (
  <p className="mt-1 text-xs text-muted-foreground">
    Impacto mensual:{" "}
    <span className="font-medium text-foreground">
      {formatMoney(monthlyImpact, currency)}
    </span>{" "}
    durante {parsedInstallments} meses
  </p>
)}

{goalImpact && (
  <div className="mt-3 rounded-lg bg-background/70 border border-border p-3">
    <p className="text-xs font-medium text-foreground">
      Impacto en metas
    </p>
    <p className="mt-1 text-xs text-muted-foreground">
      {goalImpact.message}
    </p>
  </div>
)}

      <p className="mt-2 text-xs text-muted-foreground">
        Margen mensual disponible:{" "}
        <span className="font-medium text-foreground">
          {formatMoney(evaluation.freeCapacity, currency)}
        </span>
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
  Esta compra representa{" "}
  <span className="font-medium text-foreground">
    {evaluation.freeCapacity > 0
  ? `${Math.round((monthlyImpact / evaluation.freeCapacity) * 100)}%`
  : "Sin margen disponible"}
  </span>{" "}
  de tu margen mensual
</p>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {evaluation.message}
      </p>
      {advice && (
  <div className="mt-3 rounded-lg bg-background/70 border border-border p-3">
    <p className="text-xs font-medium text-foreground">
      Recomendación accionable
    </p>
    <p className="mt-1 text-xs text-muted-foreground">
      {advice.primary}
    </p>
    {advice.secondary && (
      <p className="mt-1 text-xs text-muted-foreground">
        {advice.secondary}
      </p>
    )}
  </div>
)}
    </div>
  )}
</div>
      </div>
    </div>
  );
}