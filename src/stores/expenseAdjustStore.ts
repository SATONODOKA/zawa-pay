import { create } from "zustand";

/** adjustments[expenseId][toId][fromId] = amountYen */
type Map3 = Record<string, Record<string, Record<string, number>>>;

type State = {
  adjustments: Map3;
  setAmount: (expenseId: string, toId: string, fromId: string, amount: number) => void;
  getGroup: (expenseId: string, toId: string) => Record<string, number> | undefined;
  clearExpense: (expenseId: string) => void;
};

export const useExpenseAdjustStore = create<State>((set, get) => ({
  adjustments: {},
  setAmount: (e, to, from, amt) =>
    set(s => ({
      adjustments: {
        ...s.adjustments,
        [e]: { ...(s.adjustments[e] || {}), [to]: { ...(s.adjustments[e]?.[to] || {}), [from]: amt } },
      },
    })),
  getGroup: (e, to) => get().adjustments[e]?.[to],
  clearExpense: (e) => set(s => { const cp = { ...s.adjustments }; delete cp[e]; return { adjustments: cp }; }),
})); 