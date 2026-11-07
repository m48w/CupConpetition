import type { ReactNode } from "react";
import { GoalsContext, GroupOrdersContext, TeamsContext } from "../teamContext";
import type { Goal, Team } from "../../../types";

const NO_ORDERS: Record<string, string[]> = {};
const NO_GOALS: Goal[] = [];

export function TeamsProvider({
  teams,
  groupOrders = NO_ORDERS,
  goals = NO_GOALS,
  children,
}: {
  teams: Team[];
  groupOrders?: Record<string, string[]>;
  goals?: Goal[];
  children: ReactNode;
}) {
  return (
    <TeamsContext.Provider value={teams}>
      <GroupOrdersContext.Provider value={groupOrders}>
        <GoalsContext.Provider value={goals}>{children}</GoalsContext.Provider>
      </GroupOrdersContext.Provider>
    </TeamsContext.Provider>
  );
}
