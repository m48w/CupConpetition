import type { ReactNode } from "react";
import { GroupOrdersContext, TeamsContext } from "../teamContext";
import type { Team } from "../../../types";

const NO_ORDERS: Record<string, string[]> = {};

export function TeamsProvider({
  teams,
  groupOrders = NO_ORDERS,
  children,
}: {
  teams: Team[];
  groupOrders?: Record<string, string[]>;
  children: ReactNode;
}) {
  return (
    <TeamsContext.Provider value={teams}>
      <GroupOrdersContext.Provider value={groupOrders}>{children}</GroupOrdersContext.Provider>
    </TeamsContext.Provider>
  );
}
