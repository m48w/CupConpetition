import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageTitle } from "../components/ui/PageTitle";
import { TeamBadge, useTeams } from "../features/tournament";
import { MatchCard } from "../features/tournament";
import { tournamentScopedUrl } from "../config";
import type { Match } from "../types";
import { requestJson } from "../utils/http";
import { useI18n } from "../i18n/useI18n";
import { NotFound } from "./NotFound";

interface RegisteredTeam {
  id: string;
  clubId: string;
  clubName: string;
  teamName: string;
  logoId: string | null;
  members: { name: string; backNumber: number }[];
}

export function Teams() {
  const { t } = useI18n();
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeam[]>([]);
  const [registrationError, setRegistrationError] = useState<"teams.loadError" | "">("");
  const [selectedTeam, setSelectedTeam] = useState<RegisteredTeam | null>(null);

  useEffect(() => {
    void requestJson<{ teams: RegisteredTeam[] }>("/api/registration/teams")
      .then(({ teams: registrations }) => setRegisteredTeams(registrations))
      .catch(() => setRegistrationError("teams.loadError"));
  }, []);

  useEffect(() => {
    if (!selectedTeam) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTeam(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedTeam]);

  return (
    <>
      <PageTitle eyebrow={t("teams.eyebrow")} title={t("teams.title")} />
      <section className="team-directory-section">
        <div className="section-heading">
          <h2>{t("teams.registered.title")}</h2>
          <span className="muted">{t("common.teams", { count: registeredTeams.length })}</span>
        </div>
        {registrationError ? (
          <p className="registration-error" role="alert">
            {t(registrationError)}
          </p>
        ) : registeredTeams.length ? (
          <div className="team-directory">
            {registeredTeams.map((team) => (
              <button
                className="team-directory-card registered-team-card"
                key={team.id}
                type="button"
                aria-label={t("teams.view", { team: team.teamName })}
                onClick={() => setSelectedTeam(team)}
              >
                {team.logoId ? (
                  <img
                    className="registered-team-logo"
                    src={tournamentScopedUrl(
                      `/api/registration/clubs/${encodeURIComponent(team.clubId)}/logo`,
                    )}
                    alt={t("common.logoAlt", { name: team.clubName })}
                  />
                ) : (
                  <span className="team-crest">FC</span>
                )}
                <strong>{team.teamName}</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-state">{t("teams.none")}</p>
        )}
      </section>
      {selectedTeam && (
        <div className="team-roster-overlay">
          <section
            className="team-roster-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-roster-title"
          >
            <header className="team-roster-header">
              <h2 id="team-roster-title">{selectedTeam.teamName}</h2>
              <div>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                >
                  {t("common.back")}
                </button>
                <button
                  className="team-roster-close"
                  type="button"
                  aria-label={t("teams.closeDetails")}
                  onClick={() => setSelectedTeam(null)}
                >
                  ×
                </button>
              </div>
            </header>
            <div className="team-roster-content">
              {selectedTeam.logoId ? (
                <img
                  className="team-roster-logo"
                  src={tournamentScopedUrl(
                    `/api/registration/clubs/${encodeURIComponent(selectedTeam.clubId)}/logo`,
                  )}
                  alt={t("common.logoAlt", { name: selectedTeam.teamName })}
                />
              ) : (
                <span className="team-crest team-roster-logo">FC</span>
              )}
              <section className="team-roster-list">
                <h3>{t("teams.members.title")}</h3>
                {selectedTeam.members.length ? (
                  <ol>
                    {selectedTeam.members.map((member) => (
                      <li key={`${member.backNumber}-${member.name}`}>
                        <span>#{member.backNumber}</span>
                        <strong>{member.name}</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">{t("teams.members.none")}</p>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function TeamDetail({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const { teamId } = useParams();
  const team = useTeams().find((item) => item.id === teamId);
  if (!team) return <NotFound />;

  const teamMatches = matches.filter(
    (match) => match.homeTeamId === team.id || match.awayTeamId === team.id,
  );
  return (
    <>
      <PageTitle eyebrow={t("common.group", { id: team.groupId })} title={team.name}>
        <Link className="outline-button" to="/teams">
          {t("teams.all")}
        </Link>
      </PageTitle>
      <section className="team-profile">
        <TeamBadge id={team.id} showName={false} />
        <div>
          <h2>{team.name}</h2>
          <p>{t("common.group", { id: team.groupId })}</p>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <h2>{t("teams.matches")}</h2>
        </div>
        <div className="list-grid">
          {teamMatches.map((match) => (
            <Link
              className="match-detail-link"
              key={match.id}
              to={`/matches/${encodeURIComponent(match.id)}`}
            >
              <MatchCard match={match} compact />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
