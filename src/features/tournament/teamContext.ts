import { createContext, useContext } from "react";
import { teams as initialTeams } from "./data";
import type { Team } from "../../types";

export const TeamsContext = createContext<Team[]>(initialTeams);

export const useTeams = () => useContext(TeamsContext);
