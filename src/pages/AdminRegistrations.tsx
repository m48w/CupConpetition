import { useCallback, useEffect, useState } from "react";
import type { SessionInfo } from "../types";
import { ApiError, requestJson } from "../utils/http";

interface AdminTeam {
  id: string;
  teamName: string;
  representativeName: string;
  email: string;
  phone: string;
  createdAt: string;
  memberCount: number;
  logoId: string | null;
  members: AdminMember[];
}

interface AdminMember {
  id: string;
  name: string;
  backNumber: number;
  createdAt: string;
}

interface AdminRegistrationState {
  deadline: string;
  deadlinePassed: boolean;
  clubs: AdminClub[];
}

interface AdminClub {
  id: string;
  name: string;
  logoId: string | null;
  teams: AdminTeam[];
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function AdminRegistrations({ session }: { session: SessionInfo }) {
  const [registrations, setRegistrations] = useState<AdminRegistrationState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyClub, setBusyClub] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await requestJson<AdminRegistrationState>("/api/admin/registrations");
    setRegistrations(result);
  }, []);

  useEffect(() => {
    // The state update occurs after the API request resolves; this effect only starts synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Could not load registrations.");
    });
  }, [load]);

  async function uploadLogo(club: AdminClub, file?: File) {
    if (!file) return;
    setError("");
    setNotice("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_000_000) {
      setError("Choose a PNG, JPEG, or WebP image up to 1 MB.");
      return;
    }
    setBusyClub(club.id);
    try {
      const dataBase64 = encodeBase64(new Uint8Array(await file.arrayBuffer()));
      await requestJson(`/api/admin/registrations/clubs/${encodeURIComponent(club.id)}/logo`, {
        method: "PUT",
        body: JSON.stringify({ contentType: file.type, dataBase64 }),
      });
      await load();
      setNotice(`Logo saved for ${club.name}.`);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Logo could not be saved.");
    } finally {
      setBusyClub(null);
    }
  }

  if (session.role !== "superadmin") {
    return (
      <section className="admin-gate-card">
        <h1>Super Admin access required</h1>
      </section>
    );
  }

  return (
    <section className="registration-admin">
      <div className="page-title">
        <div>
          <div className="eyebrow">TOURNAMENT ADMIN</div>
          <h1>Team registrations</h1>
        </div>
        <span className="muted">{registrations?.clubs.length ?? 0} clubs</span>
      </div>
      <p className="muted">
        Member registration deadline: 12 December 2026 · 23:59 JST
        {registrations && ` · ${registrations.deadlinePassed ? "CLOSED" : "OPEN"}`}
      </p>
      {error && (
        <p className="registration-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="registration-notice" role="status">
          {notice}
        </p>
      )}
      {registrations?.clubs.length === 0 && !error && <p>No teams have registered yet.</p>}
      <div className="registration-admin-list">
        {registrations?.clubs.map((club) => (
          <article className="registration-admin-club" key={club.id}>
            <header>
              {club.logoId ? (
                <img src={`/api/registration/clubs/${encodeURIComponent(club.id)}/logo`} alt="" />
              ) : (
                <span className="team-crest">FC</span>
              )}
              <div>
                <h2>{club.name}</h2>
                <span>{club.teams.length} teams</span>
              </div>
            </header>
            <label className="registration-logo-upload">
              Club logo (PNG, JPEG, WebP · max 1 MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busyClub === club.id}
                onChange={(event) => void uploadLogo(club, event.currentTarget.files?.[0])}
              />
            </label>
            {club.teams.map((team) => (
              <section className="registration-admin-team" key={team.id}>
                <div className="registration-admin-team-title">
                  <h3>{team.teamName}</h3>
                  <span>{team.memberCount} / 11 members</span>
                </div>
                <dl>
                  <dt>Representative</dt>
                  <dd>{team.representativeName}</dd>
                  <dt>Email</dt>
                  <dd>{team.email}</dd>
                  <dt>Phone</dt>
                  <dd>{team.phone}</dd>
                  <dt>Registered</dt>
                  <dd>
                    {new Date(team.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}{" "}
                    JST
                  </dd>
                </dl>
                <h4>Members</h4>
                <ul className="registration-admin-members">
                  {team.members.map((member) => (
                    <li key={member.id}>
                      #{member.backNumber} {member.name} ·{" "}
                      {new Date(member.createdAt).toLocaleString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      })}{" "}
                      JST
                    </li>
                  ))}
                  {team.memberCount === 0 && <li className="muted">No members registered.</li>}
                </ul>
              </section>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
