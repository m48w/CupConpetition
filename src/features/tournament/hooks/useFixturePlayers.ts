import { useCallback, useMemo } from "react";
import { useRegisteredTeams } from "../../registration/useRegisteredTeams";
import { useTeams } from "../teamContext";

/** Details に出す選手（登録チームの選手）。 */
export interface FixturePlayer {
  name: string;
  backNumber: number;
}

/** 試合用チームID → 登録チームの選手。カードがたくさんあっても通信は1回。 */
export function useFixturePlayers() {
  const teams = useTeams();
  const { teams: registered } = useRegisteredTeams();
  const byRegistration = useMemo(
    () => new Map((registered ?? []).map((team) => [team.id, team.members])),
    [registered],
  );
  return useCallback(
    (id: string): FixturePlayer[] | undefined => {
      const registrationId = teams.find((team) => team.id === id)?.registrationTeamId;
      return registrationId ? byRegistration.get(registrationId) : undefined;
    },
    [teams, byRegistration],
  );
}
