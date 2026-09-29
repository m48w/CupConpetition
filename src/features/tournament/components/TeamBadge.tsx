import { useState } from "react";
import { findTeam } from "../data";
import { useTeams } from "../teamContext";

export function TeamBadge({ id, showName = true }: { id: string; showName?: boolean }) {
  const teams = useTeams();
  const team = teams.find((candidate) => candidate.id === id) ?? findTeam(id);
  const [failedLogoId, setFailedLogoId] = useState<string | null>(null);
  const logoId = team?.logoId ?? null;
  return (
    <span className="team-badge">
      {logoId && failedLogoId !== logoId ? (
        <img
          src={`/api/logos/${encodeURIComponent(logoId)}`}
          alt=""
          aria-hidden="true"
          onError={() => setFailedLogoId(logoId)}
        />
      ) : (
        <i className="team-crest" style={{ background: team?.color }}>
          {team?.name.slice(0, 2).toUpperCase() ?? "?"}
        </i>
      )}
      {showName && <span>{team?.name ?? "TBD"}</span>}
    </span>
  );
}
