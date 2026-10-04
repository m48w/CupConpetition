import { useEffect, useState } from "react";
import { TeamBadge, useTeams } from "../features/tournament";

const EVENT_DATE = new Date("2026-12-19T15:00:00.000Z");

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

export function Overview() {
  const teams = useTeams();
  const [now, setNow] = useState(() => Date.now());
  const countdown = getCountdown(now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      <section className="overview-countdown">
        <div className="eyebrow">NEXT MATCH DAY</div>
        <h1>Countdown to kick-off</h1>
        <p className="countdown-date">Sunday, December 20, 2026</p>
        {countdown.started ? (
          <p className="countdown-started">Tournament day is here!</p>
        ) : (
          <div className="countdown-clock" aria-label="Time until tournament day">
            {(
              [
                ["days", "Days"],
                ["hours", "Hours"],
                ["minutes", "Minutes"],
                ["seconds", "Seconds"],
              ] as const
            ).map(([unit, label]) => (
              <div className="countdown-unit" key={unit}>
                <strong>{String(countdown[unit]).padStart(2, "0")}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overview-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE CLUBS</div>
            <h2>Participating teams</h2>
          </div>
          <span className="muted">{teams.length} teams</span>
        </div>
        <div className="team-logo-strip" aria-label="Participating teams">
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
            <div className="eyebrow">PLAY FAIR</div>
            <h2>Tournament rules</h2>
          </div>
        </div>
        <div className="rules-placeholder">
          <p>The tournament rules will be announced soon.</p>
        </div>
      </section>
    </>
  );
}
