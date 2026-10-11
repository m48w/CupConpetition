import { createContext, useContext } from "react";
import type { Team } from "../../types";

export const TeamsContext = createContext<Team[]>([]);

export const useTeams = () => useContext(TeamsContext);
