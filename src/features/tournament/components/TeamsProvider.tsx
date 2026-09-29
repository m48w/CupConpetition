import type { ReactNode } from "react";
import { TeamsContext } from "../teamContext";
import type { Team } from "../../../types";

export function TeamsProvider({ teams, children }: { teams: Team[]; children: ReactNode }) {
  return <TeamsContext.Provider value={teams}>{children}</TeamsContext.Provider>;
}
