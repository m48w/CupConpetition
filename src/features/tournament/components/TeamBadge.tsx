import { useState } from "react";
import { tournamentScopedUrl } from "../../../config";
import { useI18n } from "../../../i18n/useI18n";
import { useTeams } from "../teamContext";

export function TeamBadge({ id, showName = true }: { id: string; showName?: boolean }) {
  const { t } = useI18n();
  const teams = useTeams();
  const team = teams.find((candidate) => candidate.id === id);
  const [failedLogoId, setFailedLogoId] = useState<string | null>(null);
  const logoId = team?.logoId ?? null;
  return (
    <span className="team-badge">
      {logoId && failedLogoId !== logoId ? (
        <img
          src={tournamentScopedUrl(`/api/logos/${encodeURIComponent(logoId)}`)}
          alt=""
          aria-hidden="true"
          onError={() => setFailedLogoId(logoId)}
        />
      ) : (
        <i className="team-crest" style={{ background: team?.color }}>
          {team
            ? (/^Team\d+$/.test(team.name) ? team.id : team.name.slice(0, 2)).toUpperCase()
            : "?"}
        </i>
      )}
      {showName && <span>{team?.name ?? t("match.tbd")}</span>}
    </span>
  );
}
