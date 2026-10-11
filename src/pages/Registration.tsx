import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ApiError, requestJson } from "../utils/http";

const TEAM_KEY = "velocity-registration-team";
const SUMMARY_KEY = "velocity-registration-summary";
const MEMBER_COMPLETE_KEY = "velocity-registration-member-complete";
const CLUB_KEY = "velocity-registration-club";

interface TeamSummary {
  id: string;
  clubId: string;
  clubName: string;
  teamName: string;
  representativeName?: string;
  createdAt: string;
  memberCount: number;
  logoId: string | null;
}

interface Member {
  id: string;
  name: string;
  backNumber: number;
  createdAt: string;
}

interface MemberRegistration {
  teamId: string;
  clubId: string;
  clubName: string;
  teamName: string;
  members: Member[];
  memberCount: number;
  maxMembers: number;
  deadline: string;
  deadlinePassed: boolean;
  logoId: string | null;
}

function RegistrationLayout({ children }: { children: ReactNode }) {
  return (
    <main className="registration-shell">
      <header className="registration-header">
        <img src="/20261220/velocity-fc-logo.png" alt="Velocity FC" />
        <div>
          <strong>VELOCITY CUP 2026</strong>
          <span>TEAM REGISTRATION</span>
        </div>
      </header>
      {children}
      <footer>VELOCITY CUP 2026 · 20 DECEMBER 2026</footer>
    </main>
  );
}

function RegistrationForm() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [multipleTeams, setMultipleTeams] = useState(false);
  const [teamNames, setTeamNames] = useState([""]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const logoPreviewUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.current) URL.revokeObjectURL(logoPreviewUrl.current);
    };
  }, []);

  function selectLogo(file: File | null) {
    if (logoPreviewUrl.current) URL.revokeObjectURL(logoPreviewUrl.current);
    logoPreviewUrl.current = file ? URL.createObjectURL(file) : null;
    setLogoFile(file);
    setLogoPreview(logoPreviewUrl.current);
  }

  async function fileAsBase64(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const logo = form.get("clubLogo");
    const submittedTeamNames = form
      .getAll("teamNames")
      .filter((name): name is string => typeof name === "string")
      .map((name) => name.trim())
      .filter(Boolean);
    const body = Object.fromEntries(
      [...form.entries()].filter(
        ([name]) => name !== "clubLogo" && name !== "teamNames" && name !== "multipleTeams",
      ),
    ) as Record<string, unknown>;
    try {
      body.teamNames = multipleTeams ? submittedTeamNames : submittedTeamNames.slice(0, 1);
      if (!(logo instanceof File) || logo.size === 0) {
        throw new Error("Please choose a club logo before submitting.");
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(logo.type)) {
        throw new Error("Choose a PNG, JPEG, or WebP logo.");
      }
      if (logo.size > 1_000_000) throw new Error("Logo file must be 1 MB or smaller.");
      body.logoContentType = logo.type;
      body.logoDataBase64 = await fileAsBase64(logo);
      const result = await requestJson<{
        registration?: TeamSummary;
        registrations?: TeamSummary[];
      }>("/api/registration/teams", { method: "POST", body: JSON.stringify(body) });
      const registrations =
        result.registrations ?? (result.registration ? [result.registration] : []);
      if (!registrations.length) throw new Error("No teams were returned. Please try again.");
      sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(registrations));
      sessionStorage.setItem(CLUB_KEY, registrations[0].clubName);
      navigate("/complete");
    } catch (reason) {
      setError(
        reason instanceof ApiError || reason instanceof Error
          ? reason.message
          : "Registration could not be saved. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="registration-card">
      <div className="eyebrow">JOIN THE TOURNAMENT</div>
      <h1>Team registration</h1>
      <p>
        Register your club and the team or teams that will compete in Velocity Cup 2026. Use one
        application to enter multiple teams from the same club.
      </p>
      <form className="registration-form" onSubmit={submit}>
        <label>
          Club name
          <input
            name="clubName"
            autoComplete="organization"
            maxLength={120}
            defaultValue={sessionStorage.getItem(CLUB_KEY) ?? ""}
            required
          />
        </label>
        <label className="registration-multiple-toggle">
          <input
            name="multipleTeams"
            type="checkbox"
            checked={multipleTeams}
            onChange={(event) => {
              setMultipleTeams(event.target.checked);
              if (!event.target.checked) setTeamNames((current) => current.slice(0, 1));
            }}
          />
          <span>This club is entering multiple teams</span>
        </label>
        <div className="registration-team-names">
          {teamNames.map((teamName, index) => (
            <label className="registration-team-name" key={index}>
              <span>
                {index === 0 ? "Tournament team name" : `Tournament team name ${index + 1}`}
              </span>
              <div className="registration-team-name-control">
                <input
                  name="teamNames"
                  autoComplete="organization-title"
                  maxLength={120}
                  value={teamName}
                  onChange={(event) =>
                    setTeamNames((current) =>
                      current.map((name, nameIndex) =>
                        nameIndex === index ? event.target.value : name,
                      ),
                    )
                  }
                  required
                />
                {multipleTeams && index === teamNames.length - 1 && teamNames.length < 40 && (
                  <button
                    className="registration-add-team"
                    type="button"
                    aria-label="Add another team name"
                    onClick={() => setTeamNames((current) => [...current, ""])}
                  >
                    +
                  </button>
                )}
                {multipleTeams && teamNames.length > 1 && (
                  <button
                    className="registration-remove-team"
                    type="button"
                    aria-label={`Remove team name ${index + 1}`}
                    onClick={() =>
                      setTeamNames((current) =>
                        current.filter((_, nameIndex) => nameIndex !== index),
                      )
                    }
                  >
                    −
                  </button>
                )}
              </div>
            </label>
          ))}
        </div>
        <label>
          Representative name
          <input name="representativeName" autoComplete="name" maxLength={120} required />
        </label>
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <label>
          Phone number
          <input name="phone" type="tel" autoComplete="tel" required />
        </label>
        <div className="registration-logo-field">
          <div className="registration-logo-heading">
            <span>Club logo</span>
            <small>REQUIRED</small>
          </div>
          <input
            ref={logoInput}
            className="registration-logo-input"
            name="clubLogo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-required="true"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => selectLogo(event.target.files?.[0] ?? null)}
          />
          <div className={`registration-logo-picker${logoFile ? " has-logo" : ""}`}>
            {logoPreview ? (
              <img src={logoPreview} alt="Selected club logo preview" />
            ) : (
              <div className="registration-logo-placeholder" aria-hidden="true">
                <span>＋</span>
              </div>
            )}
            <div className="registration-logo-copy">
              <strong>{logoFile?.name ?? "Add your club logo"}</strong>
              <span>
                {logoFile
                  ? `${(logoFile.size / 1024).toFixed(0)} KB · shared by this club’s teams`
                  : "Required · PNG, JPEG or WebP · up to 1 MB · shared by this club’s teams"}
              </span>
            </div>
            <button
              className="outline-button registration-logo-action"
              type="button"
              onClick={() => logoInput.current?.click()}
            >
              {logoFile ? "Change logo" : "Choose file"}
            </button>
            {logoFile && (
              <button
                className="registration-logo-clear"
                type="button"
                aria-label="Remove selected logo"
                onClick={() => {
                  selectLogo(null);
                  if (logoInput.current) logoInput.current.value = "";
                }}
              >
                ×
              </button>
            )}
          </div>
          <small>
            A logo is required for each application. Existing club logos are not replaced by later
            submissions; organisers can update them.
          </small>
        </div>
        {error && (
          <p className="registration-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" disabled={busy}>
          {busy
            ? "Submitting…"
            : multipleTeams && teamNames.length > 1
              ? "Submit team registrations"
              : "Register team"}
        </button>
      </form>
      <small>
        Already registered? <Link to="/verify">Register your team members</Link>
      </small>
    </section>
  );
}

function RegistrationComplete() {
  const memberComplete = new URLSearchParams(window.location.search).get("member") === "1";
  const summary = (() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(SUMMARY_KEY) ?? "null") as
        TeamSummary[] | TeamSummary | null;
      return Array.isArray(stored) ? stored : stored ? [stored] : null;
    } catch {
      return null;
    }
  })();
  if (memberComplete) {
    const teamId = sessionStorage.getItem(TEAM_KEY);
    if (!teamId || sessionStorage.getItem(MEMBER_COMPLETE_KEY) !== teamId) {
      return <Navigate to="/verify" replace />;
    }
    return (
      <section className="registration-card registration-complete">
        <div className="complete-mark" aria-hidden="true">
          ✓
        </div>
        <div className="eyebrow">MEMBER ADDED</div>
        <h1>Registration complete</h1>
        <p>Your member was added to the team roster.</p>
        <Link
          className="primary-button"
          to="/members"
          onClick={() => sessionStorage.removeItem(MEMBER_COMPLETE_KEY)}
        >
          Return to team members
        </Link>
      </section>
    );
  }
  if (!summary?.length) return <Navigate to="/" replace />;
  const firstTeam = summary[0];
  return (
    <section className="registration-card registration-complete">
      <div className="complete-mark" aria-hidden="true">
        ✓
      </div>
      <div className="eyebrow">REGISTRATION RECEIVED</div>
      <h1>You’re registered</h1>
      <dl>
        <dt>Club</dt>
        <dd>{firstTeam.clubName}</dd>
        <dt>{summary.length > 1 ? "Tournament teams" : "Tournament team"}</dt>
        <dd>{summary.map((team) => team.teamName).join(", ")}</dd>
        <dt>Representative</dt>
        <dd>{firstTeam.representativeName}</dd>
        <dt>Member registration deadline</dt>
        <dd>12 December 2026 · 23:59 JST</dd>
      </dl>
      {firstTeam.logoId && (
        <img
          className="registration-club-logo"
          src={`/api/logos/${encodeURIComponent(firstTeam.logoId)}`}
          alt={`${firstTeam.clubName} club logo`}
        />
      )}
      <Link className="primary-button" to="/verify">
        Register team members
      </Link>
      <Link
        className="outline-button"
        to="/"
        onClick={() => sessionStorage.setItem(CLUB_KEY, firstTeam.clubName)}
      >
        Register another team for this club
      </Link>
    </section>
  );
}

function VerifyContacts() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await requestJson<{ teams: TeamSummary[] }>("/api/registration/verify", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      setTeams(result.teams);
      setSelectedTeamId(result.teams[0]?.id ?? "");
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "Verification failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function continueToMembers() {
    if (!selectedTeamId) return;
    sessionStorage.setItem(TEAM_KEY, selectedTeamId);
    navigate("/members");
  }

  return (
    <section className="registration-card">
      <div className="eyebrow">TEAM MEMBER PORTAL</div>
      <h1>Verify your team</h1>
      <p>Enter the email address and phone number used when your team was registered.</p>
      <form className="registration-form" onSubmit={submit}>
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Phone number
          <input name="phone" type="tel" autoComplete="tel" required />
        </label>
        {error && (
          <p className="registration-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" disabled={busy}>
          {busy ? "Checking…" : "Verify details"}
        </button>
      </form>
      {teams.length > 0 && (
        <div className="registration-team-choice">
          <label>
            Select your team
            <select
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.clubName} — {team.teamName}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" onClick={continueToMembers}>
            Continue to members
          </button>
        </div>
      )}
    </section>
  );
}

function MemberRegistration() {
  const navigate = useNavigate();
  const teamId = sessionStorage.getItem(TEAM_KEY);
  const [registration, setRegistration] = useState<MemberRegistration | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!teamId) return;
    const result = await requestJson<{ registration: MemberRegistration }>(
      `/api/registration/members?teamId=${encodeURIComponent(teamId)}`,
    );
    setRegistration(result.registration);
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    // The state update occurs after the API request resolves; this effect only starts synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((reason: unknown) => {
      setError(
        reason instanceof ApiError && reason.status === 401
          ? "Your verification session expired. Verify your team again."
          : reason instanceof Error
            ? reason.message
            : "Could not load members.",
      );
    });
  }, [load, teamId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId) return;
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const currentForm = event.currentTarget;
    try {
      await requestJson("/api/registration/members", {
        method: "POST",
        body: JSON.stringify({
          teamId,
          name: form.get("name"),
          backNumber: Number(form.get("backNumber")),
        }),
      });
      currentForm.reset();
      await load();
      sessionStorage.setItem(MEMBER_COMPLETE_KEY, teamId);
      navigate("/complete?member=1");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Member could not be registered.");
    } finally {
      setBusy(false);
    }
  }

  async function switchTeam() {
    setError("");
    try {
      await requestJson("/api/registration/verify", { method: "DELETE", body: "{}" });
      sessionStorage.removeItem(TEAM_KEY);
      sessionStorage.removeItem(MEMBER_COMPLETE_KEY);
      navigate("/verify");
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Could not end this verification session. Try again.",
      );
    }
  }

  if (!teamId) return <Navigate to="/verify" replace />;
  if (!registration && !error) return <p className="muted">Loading team registration…</p>;
  return (
    <section className="registration-card">
      <div className="eyebrow">{registration?.clubName}</div>
      <h1>{registration?.teamName}</h1>
      <p>
        Registered members: <strong>{registration?.memberCount} / 11</strong>
      </p>
      <p>Registration deadline: 12 December 2026 · 23:59 JST</p>
      {registration?.logoId && (
        <img
          className="registration-club-logo"
          src={`/api/registration/clubs/${encodeURIComponent(registration.clubId)}/logo`}
          alt={`${registration.clubName} logo`}
        />
      )}
      {error && (
        <p className="registration-error" role="alert">
          {error}
        </p>
      )}
      <div className="registration-members">
        {registration?.members.map((member) => (
          <div key={member.id}>
            <span>#{member.backNumber}</span>
            <strong>{member.name}</strong>
          </div>
        ))}
      </div>
      {registration?.deadlinePassed && (
        <p className="registration-error">Member registration is closed.</p>
      )}
      {registration && !registration.deadlinePassed && registration.memberCount < 11 && (
        <form className="registration-form" onSubmit={submit}>
          <label>
            Player name
            <input name="name" maxLength={120} required />
          </label>
          <label>
            Shirt number
            <input name="backNumber" type="number" min="0" step="1" required />
          </label>
          <button className="primary-button" disabled={busy}>
            {busy ? "Saving…" : "Add member"}
          </button>
        </form>
      )}
      {registration && registration.memberCount >= 11 && <p>Maximum team size reached.</p>}
      <button className="registration-link-button" onClick={() => void switchTeam()}>
        Verify a different team
      </button>
    </section>
  );
}

export function RegistrationApp() {
  return (
    <RegistrationLayout>
      <Routes>
        <Route path="/" element={<RegistrationForm />} />
        <Route path="/complete" element={<RegistrationComplete />} />
        <Route path="/verify" element={<VerifyContacts />} />
        <Route path="/members" element={<MemberRegistration />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RegistrationLayout>
  );
}
