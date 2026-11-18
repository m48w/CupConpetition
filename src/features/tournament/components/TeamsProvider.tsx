import type { ReactNode } from "react";
import { CardsContext, GoalsContext, GroupOrdersContext, TeamsContext } from "../teamContext";
import type { Goal, MatchCard, Team } from "../../../types";

const NO_ORDERS: Record<string, string[]> = {};
const NO_GOALS: Goal[] = [];
const NO_CARDS: MatchCard[] = [];

export function TeamsProvider({
  teams,
  groupOrders = NO_ORDERS,
  goals = NO_GOALS,
  cards = NO_CARDS,
  children,
}: {
  teams: Team[];
  groupOrders?: Record<string, string[]>;
  goals?: Goal[];
  cards?: MatchCard[];
  children: ReactNode;
}) {
  return (
    <TeamsContext.Provider value={teams}>
      <GroupOrdersContext.Provider value={groupOrders}>
        <GoalsContext.Provider value={goals}>
          <CardsContext.Provider value={cards}>{children}</CardsContext.Provider>
        </GoalsContext.Provider>
      </GroupOrdersContext.Provider>
    </TeamsContext.Provider>
  );
}
