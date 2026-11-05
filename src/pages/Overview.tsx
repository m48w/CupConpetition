import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isOnPitch, MatchCard, TeamBadge, useTeams } from "../features/tournament";
import { useI18n } from "../i18n/useI18n";
import { MyTeamCard } from "../features/tournament/components/MyTeamCard";
import { useMyTeam } from "../features/tournament/hooks/useMyTeam";
import { TournamentInfoSection } from "../features/info/TournamentInfoSection";
import { RegistrationStatusNote } from "../features/registration/RegistrationStatusNote";
import { useRegistrationStatus } from "../features/registration/useRegistrationStatus";
import type { Match } from "../types";

/** 最初の試合（2026-12-20 9:00 JST）。カウントダウンはここまで。 */
const EVENT_DATE = new Date("2026-12-20T00:00:00.000Z");

function getCountdown(now: number) {
  const remaining = Math.max(0, EVENT_DATE.getTime() - now);
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000),
    started: remaining === 0,
  };
}

const UNITS = [
  ["days", "home.countdown.days"],
  ["hours", "home.countdown.hours"],
  ["minutes", "home.countdown.minutes"],
  ["seconds", "home.countdown.seconds"],
] as const;

export function Overview({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const teams = useTeams();
  const live = matches.filter(isOnPitch);
  const registrationStatus = useRegistrationStatus();
  const { myTeam, chooseMyTeam } = useMyTeam(teams);
  const [now, setNow] = useState(() => Date.now());
  const countdown = getCountdown(now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      {live.length > 0 && (
        <section className="overview-section live-now">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <i className="live-dot" /> {t("home.live.eyebrow")}
              </div>
              <h2>{t("home.live.title")}</h2>
            </div>
            <Link className="outline-button" to="/live">
              {t("home.live.all")}
            </Link>
          </div>
          <div className="list-grid">
            {live.map((match) => (
              <MatchCard match={match} key={match.id} />
            ))}
          </div>
        </section>
      )}
      <MyTeamCard teams={teams} matches={matches} myTeam={myTeam} onChoose={chooseMyTeam} />
      <section className="overview-countdown">
        <h1>{t("home.countdown.title")}</h1>
        <p className="countdown-date">{t("home.countdown.date")}</p>
        {countdown.started ? (
          <p className="countdown-started">{t("home.countdown.started")}</p>
        ) : (
          <div className="countdown-clock" aria-label={t("home.countdown.aria")}>
            {UNITS.map(([unit, label]) => (
              <div className="countdown-unit" key={unit}>
                <strong>{String(countdown[unit]).padStart(2, "0")}</strong>
                <span>{t(label)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overview-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{t("home.teams.eyebrow")}</div>
            <h2>{t("home.teams.title")}</h2>
          </div>
          <Link className="outline-button" to="/teams">
            {t("home.teams.viewAll")}
          </Link>
        </div>
        <RegistrationStatusNote status={registrationStatus} />
        {teams.length === 0 && <p className="muted">{t("home.teams.empty")}</p>}
        <div className="team-logo-strip" aria-label={t("home.teams.title")}>
          {teams.map((team) => (
            <div className="team-logo-tile" key={team.id}>
              <TeamBadge id={team.id} showName={false} />
              <span>{team.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="overview-section rules-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{t("home.rules.eyebrow")}</div>
            <h2>{t("home.rules.title")}</h2>
          </div>
        </div>
        <div className="rules-placeholder">
          <p>{t("home.rules.soon")}</p>
        </div>
      </section>

      <TournamentInfoSection />
    </>
  );
}
