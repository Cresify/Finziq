export interface GoalImpactInput {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  is_completed?: boolean;
}

export interface GoalImpactResult {
  affected: boolean;
  goalName?: string;
  delayMonths?: number;
  message: string;
}

function getMonthsLeft(deadline?: string) {
  if (!deadline) return null;

  const today = new Date();
  const endDate = new Date(deadline);

  if (isNaN(endDate.getTime())) return null;

  const yearDiff = endDate.getFullYear() - today.getFullYear();
  const monthDiff = endDate.getMonth() - today.getMonth();

  let monthsLeft = yearDiff * 12 + monthDiff;

  if (endDate.getDate() > today.getDate()) {
    monthsLeft += 1;
  }

  return Math.max(monthsLeft, 1);
}

export function getPurchaseGoalImpact(params: {
  goals: GoalImpactInput[];
  freeCapacity: number;
  monthlyImpact: number;
}) : GoalImpactResult {
  const { goals, freeCapacity, monthlyImpact } = params;

  const activeGoals = goals.filter(
    (goal) =>
      !goal.is_completed &&
      !!goal.deadline &&
      goal.target_amount > goal.current_amount
  );

  if (activeGoals.length === 0) {
    return {
      affected: false,
      message: "No hay metas activas con fecha objetivo para evaluar impacto.",
    };
  }

  const newFreeCapacity = freeCapacity - monthlyImpact;

  let worstGoal: {
    name: string;
    delayMonths: number;
  } | null = null;

  for (const goal of activeGoals) {
    const monthsLeft = getMonthsLeft(goal.deadline);
    if (!monthsLeft) continue;

    const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
    if (remaining <= 0) continue;

    const monthlyNeeded = Math.ceil(remaining / monthsLeft);

    if (newFreeCapacity <= 0) {
      const estimatedMonths = Math.ceil(remaining / Math.max(freeCapacity, 1));
      const delayMonths = Math.max(estimatedMonths - monthsLeft, 1);

      if (!worstGoal || delayMonths > worstGoal.delayMonths) {
        worstGoal = {
          name: goal.name,
          delayMonths,
        };
      }

      continue;
    }

    if (newFreeCapacity < monthlyNeeded) {
      const newMonthsNeeded = Math.ceil(remaining / newFreeCapacity);
      const delayMonths = Math.max(newMonthsNeeded - monthsLeft, 1);

      if (!worstGoal || delayMonths > worstGoal.delayMonths) {
        worstGoal = {
          name: goal.name,
          delayMonths,
        };
      }
    }
  }

  if (!worstGoal) {
    return {
      affected: false,
      message: "Esta compra no debería afectar tus metas actuales.",
    };
  }

  return {
    affected: true,
    goalName: worstGoal.name,
    delayMonths: worstGoal.delayMonths,
    message: `Esta compra podría retrasar tu meta "${worstGoal.name}" en ${worstGoal.delayMonths} mes${worstGoal.delayMonths === 1 ? "" : "es"}.`,
  };
}