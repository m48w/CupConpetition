import { createContext, useContext } from "react";
import type { Team } from "../../types";

export const TeamsContext = createContext<Team[]>([]);

export const useTeams = () => useContext(TeamsContext);

/** 同点のとき Super Admin が手で決めた順番（グループID → チームIDの並び）。 */
export const GroupOrdersContext = createContext<Record<string, string[]>>({});

export const useGroupOrders = () => useContext(GroupOrdersContext);
