import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { EVENT_BASE_PATH, tournamentScopedUrl } from "../config";
import { shrinkLogo } from "../utils/image";
import { EVENT_LOGO_SRC } from "../components/ui/brand";
import { AnnouncementBar } from "../components/ui/AnnouncementBar";
import { LanguageSwitch } from "../components/ui/LanguageSwitch";
import { useAnnouncements } from "../components/ui/useAnnouncements";
import { errorKey } from "../i18n/errors";
import type { MessageKey } from "../i18n/messages";
import { useI18n } from "../i18n/useI18n";
import { RegistrationStatusNote } from "../features/registration/RegistrationStatusNote";
import {
  isAcceptingTeams,
  useRegistrationStatus,
} from "../features/registration/useRegistrationStatus";
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

interface MemberDraft {
  name: string;
  backNumber: string;
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
  const { t } = useI18n();
  const announcements = useAnnouncements();
  return (
    <main className="registration-shell">
      <header className="registration-header">
        <div className="registration-header-left">
          <img src={EVENT_LOGO_SRC} alt="Velocity FC" width="48" height="48" />
          <div>
            <strong>VELOCITY CUP 2026</strong>
            <span>{t("reg.header.sub")}</span>
          </div>
        </div>
        <div className="registration-header-actions">
          <LanguageSwitch />
          <a href={`${EVENT_BASE_PATH}/`} className="admin-toggle registration-back-btn">
            {t("reg.back")}
          </a>
        </div>
      </header>
      <AnnouncementBar announcements={announcements} />
      {children}
      <footer>{t("reg.footer")}</footer>
    </main>
  );
}

function RegistrationForm() {
  const { t } = useI18n();
  const registrationStatus = useRegistrationStatus();
  const accepting = isAcceptingTeams(registrationStatus);
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
    const logoProblem =
      !(logo instanceof File) || logo.size === 0
        ? "reg.err.noLogo"
        : !["image/png", "image/jpeg", "image/webp"].includes(logo.type)
          ? "reg.err.logoType"
          : logo.size > 1_000_000
            ? "reg.err.logoSize"
            : null;
    if (logoProblem || !(logo instanceof File)) {
      setError(t(logoProblem ?? "reg.err.noLogo"));
      setBusy(false);
      return;
    }
    try {
      body.teamNames = multipleTeams ? submittedTeamNames : submittedTeamNames.slice(0, 1);
      const shrunk = await shrinkLogo(logo);
      body.logoContentType = shrunk.contentType;
      body.logoDataBase64 = shrunk.dataBase64;
      const result = await requestJson<{
        registration?: TeamSummary;
        registrations?: TeamSummary[];
      }>("/api/registration/teams", { method: "POST", body: JSON.stringify(body) });
      const registrations =
        result.registrations ?? (result.registration ? [result.registration] : []);
      if (!registrations.length) {
        setError(t("reg.err.noTeams"));
        return;
      }
      sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(registrations));
      sessionStorage.setItem(CLUB_KEY, registrations[0].clubName);
      navigate("/complete");
    } catch (reason) {
      setError(t(errorKey(reason, "reg.err.save")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="registration-card">
      <div className="eyebrow">{t("reg.form.eyebrow")}</div>
      <h1>{t("reg.form.title")}</h1>
      <p>{t("reg.form.intro")}</p>
      <RegistrationStatusNote status={registrationStatus} />
      {accepting && (
        <form className="registration-form" onSubmit={submit}>
          <label>
            {t("reg.clubName")}
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
            <span>{t("reg.multiple")}</span>
          </label>
          <div className="registration-team-names">
            {teamNames.map((teamName, index) => (
              <label className="registration-team-name" key={index}>
                <span>
                  {index === 0 ? t("reg.teamName") : t("reg.teamNameN", { n: index + 1 })}
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
                      aria-label={t("reg.addTeam")}
                      onClick={() => setTeamNames((current) => [...current, ""])}
                    >
                      +
                    </button>
                  )}
                  {multipleTeams && teamNames.length > 1 && (
                    <button
                      className="registration-remove-team"
                      type="button"
                      aria-label={t("reg.removeTeam", { n: index + 1 })}
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
            {t("reg.repName")}
            <input name="representativeName" autoComplete="name" maxLength={120} required />
          </label>
          <label>
            {t("reg.email")}
            <input name="email" type="email" autoComplete="email" maxLength={254} required />
          </label>
          <label>
            {t("reg.phone")}
            <input name="phone" type="tel" autoComplete="tel" required />
          </label>
          <div className="registration-logo-field">
            <div className="registration-logo-heading">
              <span>{t("reg.logo")}</span>
              <small>{t("reg.required")}</small>
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
                <img src={logoPreview} alt={t("reg.logo.previewAlt")} />
              ) : (
                <div className="registration-logo-placeholder" aria-hidden="true">
                  <span>＋</span>
                </div>
              )}
              <div className="registration-logo-copy">
                <strong>{logoFile?.name ?? t("reg.logo.add")}</strong>
                <span>
                  {logoFile
                    ? t("reg.logo.size", { size: (logoFile.size / 1024).toFixed(0) })
                    : t("reg.logo.hint")}
                </span>
              </div>
              <button
                className="outline-button registration-logo-action"
                type="button"
                onClick={() => logoInput.current?.click()}
              >
                {logoFile ? t("reg.logo.change") : t("reg.logo.choose")}
              </button>
              {logoFile && (
                <button
                  className="registration-logo-clear"
                  type="button"
                  aria-label={t("reg.logo.remove")}
                  onClick={() => {
                    selectLogo(null);
                    if (logoInput.current) logoInput.current.value = "";
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <small>{t("reg.logo.note")}</small>
          </div>
          {error && (
            <p className="registration-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" disabled={busy}>
            {busy
              ? t("reg.submitting")
              : multipleTeams && teamNames.length > 1
                ? t("reg.submitMany")
                : t("reg.submitOne")}
          </button>
        </form>
      )}
      <small>
        {t("reg.already")} <Link to="/verify">{t("reg.goMembers")}</Link>
      </small>
    </section>
  );
}

function RegistrationComplete() {
  const { t } = useI18n();
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
        <div className="eyebrow">{t("reg.done.memberEyebrow")}</div>
        <h1>{t("reg.done.title")}</h1>
        <p>{t("reg.done.memberText")}</p>
        <Link
          className="primary-button"
          to="/members"
          onClick={() => sessionStorage.removeItem(MEMBER_COMPLETE_KEY)}
        >
          {t("reg.done.backMembers")}
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
      <div className="eyebrow">{t("reg.done.eyebrow")}</div>
      <h1>{t("reg.done.teamTitle")}</h1>
      <dl>
        <dt>{t("reg.done.club")}</dt>
        <dd>{firstTeam.clubName}</dd>
        <dt>{summary.length > 1 ? t("reg.done.teams") : t("reg.done.team")}</dt>
        <dd>{summary.map((team) => team.teamName).join(", ")}</dd>
        <dt>{t("reg.done.rep")}</dt>
        <dd>{firstTeam.representativeName}</dd>
        <dt>{t("reg.done.deadline")}</dt>
        <dd>{t("reg.deadline.value")}</dd>
      </dl>
      {firstTeam.logoId && (
        <img
          className="registration-club-logo"
          src={tournamentScopedUrl(`/api/logos/${encodeURIComponent(firstTeam.logoId)}`)}
          alt={t("common.logoAlt", { name: firstTeam.clubName })}
        />
      )}
      <Link className="primary-button" to="/verify">
        {t("reg.done.registerMembers")}
      </Link>
      <Link
        className="outline-button"
        to="/"
        onClick={() => sessionStorage.setItem(CLUB_KEY, firstTeam.clubName)}
      >
        {t("reg.done.another")}
      </Link>
    </section>
  );
}

function VerifyContacts() {
  const { t } = useI18n();
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
      setError(t(errorKey(reason, "reg.verify.failed")));
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
      <div className="eyebrow">{t("reg.verify.eyebrow")}</div>
      <h1>{t("reg.verify.title")}</h1>
      <p>{t("reg.verify.intro")}</p>
      <form className="registration-form" onSubmit={submit}>
        <label>
          {t("reg.email")}
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          {t("reg.phone")}
          <input name="phone" type="tel" autoComplete="tel" required />
        </label>
        {error && (
          <p className="registration-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" disabled={busy}>
          {busy ? t("reg.verify.checking") : t("reg.verify.submit")}
        </button>
      </form>
      {teams.length > 0 && (
        <div className="registration-team-choice">
          <label>
            {t("reg.verify.select")}
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
            {t("reg.verify.continue")}
          </button>
        </div>
      )}
    </section>
  );
}

function MemberRegistration() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const teamId = sessionStorage.getItem(TEAM_KEY);
  const [registration, setRegistration] = useState<MemberRegistration | null>(null);
  const [memberRows, setMemberRows] = useState<MemberDraft[]>(() =>
    Array.from({ length: 11 }, () => ({ name: "", backNumber: "" })),
  );
  const [loadError, setLoadError] = useState<MessageKey | null>(null);
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
      // 文ではなくキーを持つ（言語を切り替えたら、その言語で表示するため）。
      setLoadError(
        reason instanceof ApiError && reason.status === 401
          ? "reg.members.expired"
          : errorKey(reason, "reg.members.loadError"),
      );
    });
  }, [load, teamId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId) return;
    setError("");
    setBusy(true);
    const members: { name: string; backNumber: number }[] = [];
    for (const row of memberRows) {
      const name = row.name.trim();
      const backNumber = row.backNumber.trim();
      if (!name && !backNumber) continue;
      if (!name || !backNumber || !Number.isSafeInteger(Number(backNumber))) {
        setError(t("reg.members.bothFields"));
        setBusy(false);
        return;
      }
      members.push({ name, backNumber: Number(backNumber) });
    }
    if (members.length === 0) {
      setError(t("reg.members.atLeastOne"));
      setBusy(false);
      return;
    }
    try {
      await requestJson("/api/registration/members", {
        method: "POST",
        body: JSON.stringify({ teamId, members }),
      });
      setMemberRows(Array.from({ length: 11 }, () => ({ name: "", backNumber: "" })));
      await load();
      sessionStorage.setItem(MEMBER_COMPLETE_KEY, teamId);
      navigate("/complete?member=1");
    } catch (reason) {
      setError(t(errorKey(reason, "reg.members.saveError")));
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
      setError(t(errorKey(reason, "reg.members.endError")));
    }
  }

  if (!teamId) return <Navigate to="/verify" replace />;
  if (!registration && !error && !loadError)
    return <p className="muted">{t("reg.members.loading")}</p>;
  const remainingSlots = Math.max(
    0,
    (registration?.maxMembers ?? 0) - (registration?.memberCount ?? 0),
  );
  return (
    <section className="registration-card">
      <div className="eyebrow">{registration?.clubName}</div>
      <h1>{registration?.teamName}</h1>
      <p>
        {t("reg.members.countLabel")} <strong>{registration?.memberCount} / 11</strong>
      </p>
      <p>{t("reg.members.deadline", { date: t("reg.deadline.value") })}</p>
      {registration?.logoId && (
        <img
          className="registration-club-logo"
          src={tournamentScopedUrl(
            `/api/registration/clubs/${encodeURIComponent(registration.clubId)}/logo`,
          )}
          alt={t("common.logoAlt", { name: registration.clubName })}
        />
      )}
      {(error || loadError) && (
        <p className="registration-error" role="alert">
          {error || (loadError && t(loadError))}
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
        <p className="registration-error">{t("reg.members.closed")}</p>
      )}
      {registration && !registration.deadlinePassed && registration.memberCount < 11 && (
        <form className="registration-form" onSubmit={(event) => void submit(event)}>
          <div className="registration-member-rows">
            {memberRows.map((member, index) => (
              <div className="registration-member-row" key={index}>
                <label>
                  {t("reg.members.playerName")}
                  <input
                    maxLength={120}
                    value={member.name}
                    disabled={index >= remainingSlots}
                    onChange={(event) =>
                      setMemberRows((rows) =>
                        rows.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, name: event.target.value } : row,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  {t("reg.members.backNumber")}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={member.backNumber}
                    disabled={index >= remainingSlots}
                    onChange={(event) =>
                      setMemberRows((rows) =>
                        rows.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, backNumber: event.target.value } : row,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </div>
          <button className="primary-button" disabled={busy}>
            {busy ? t("reg.members.saving") : t("reg.members.submit")}
          </button>
        </form>
      )}
      {registration && registration.memberCount >= 11 && <p>{t("reg.members.full")}</p>}
      <button className="registration-link-button" onClick={() => void switchTeam()}>
        {t("reg.members.switch")}
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
