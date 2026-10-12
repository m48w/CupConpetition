type SqlStorage = DurableObjectStorage["sql"];

export interface TeamRegistrationInput {
  clubName: string;
  teamName: string;
  representativeName: string;
  email: string;
  phone: string;
  logoContentType?: string;
  logoDataBase64?: string;
}

export interface RegistrationTeamSummary {
  id: string;
  clubId: string;
  clubName: string;
  teamName: string;
  representativeName?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  memberCount: number;
  logoId: string | null;
}

export interface RegistrationVerificationService {
  verify(
    value: unknown,
    ip: string,
    now: number,
  ): Promise<{ token: string; teams: RegistrationTeamSummary[] }>;
}

export interface RegisteredMember {
  id: string;
  name: string;
  backNumber: number;
  createdAt: string;
}

export interface ClubRegistrationSummary {
  id: string;
  name: string;
  logoId: string | null;
  teams: RegistrationTeamSummary[];
}

export interface PublicRegistrationTeam {
  id: string;
  clubId: string;
  clubName: string;
  teamName: string;
  logoId: string | null;
}

interface AdminRegisteredMember {
  id: string;
  name: string;
  backNumber: number;
  createdAt: string;
}

export class RegistrationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RegistrationError";
  }
}

const DEADLINE_MS = Date.parse("2026-12-12T15:00:00.000Z");
const ACCESS_TTL_MS = 60 * 60 * 1000;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 5;

const normalizeName = (value: string) => value.trim().normalize("NFKC");
const normalizeEmail = (value: string) => value.trim().normalize("NFKC").toLowerCase();
const normalizePhone = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  return digits.startsWith("81") ? `0${digits.slice(2)}` : digits;
};
const hash = async (value: string) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

function validateLogoData(contentType: string, dataBase64: string): void {
  if (!["image/png", "image/jpeg", "image/webp"].includes(contentType)) {
    throw new RegistrationError("Logo must be PNG, JPEG, or WebP.", "INVALID_LOGO_TYPE", 400);
  }
  if (dataBase64.length > 1_400_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(dataBase64)) {
    throw new RegistrationError("Logo file is invalid or exceeds 1 MB.", "INVALID_LOGO", 400);
  }
  let decoded: string;
  try {
    decoded = atob(dataBase64);
  } catch {
    throw new RegistrationError("Logo file is invalid.", "INVALID_LOGO", 400);
  }
  if (!decoded.length || decoded.length > 1_000_000) {
    throw new RegistrationError("Logo file must be 1 MB or smaller.", "INVALID_LOGO", 400);
  }
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  const validImage =
    (contentType === "image/png" &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (byte, index) => bytes[index] === byte,
      )) ||
    (contentType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (contentType === "image/webp" &&
      decoded.slice(0, 4) === "RIFF" &&
      decoded.slice(8, 12) === "WEBP");
  if (!validImage) {
    throw new RegistrationError("Logo content does not match its image type.", "INVALID_LOGO", 400);
  }
}

export function isRegistrationDeadlinePassed(now: number): boolean {
  return now >= DEADLINE_MS;
}

export function validateTeamRegistration(value: unknown): TeamRegistrationInput {
  if (!value || typeof value !== "object") {
    throw new RegistrationError("Invalid registration details.", "INVALID_INPUT", 400);
  }
  const input = value as Record<string, unknown>;
  const clubName = typeof input.clubName === "string" ? normalizeName(input.clubName) : "";
  const teamName = typeof input.teamName === "string" ? normalizeName(input.teamName) : "";
  const representativeName =
    typeof input.representativeName === "string" ? normalizeName(input.representativeName) : "";
  const rawEmail = typeof input.email === "string" ? input.email : "";
  const email = normalizeEmail(rawEmail);
  const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
  const phone = normalizePhone(rawPhone);
  if (!clubName || !teamName || !representativeName || !email || !phone) {
    throw new RegistrationError("Complete all required fields.", "REQUIRED_FIELD", 400);
  }
  if ([clubName, teamName, representativeName].some((text) => text.length > 120)) {
    throw new RegistrationError("Names must be 120 characters or fewer.", "INVALID_INPUT", 400);
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RegistrationError("Enter a valid email address.", "INVALID_EMAIL", 400);
  }
  if (
    rawPhone.length > 32 ||
    !/^\+?[0-9\s().-]+$/.test(rawPhone) ||
    phone.length < 10 ||
    phone.length > 15
  ) {
    throw new RegistrationError("Enter a valid phone number.", "INVALID_PHONE", 400);
  }
  const logoContentType =
    typeof input.logoContentType === "string" ? input.logoContentType : undefined;
  const logoDataBase64 =
    typeof input.logoDataBase64 === "string" ? input.logoDataBase64 : undefined;
  if ((logoContentType === undefined) !== (logoDataBase64 === undefined)) {
    throw new RegistrationError(
      "Logo type and image data must be supplied together.",
      "INVALID_LOGO",
      400,
    );
  }
  if (!logoContentType || !logoDataBase64) {
    throw new RegistrationError("A club logo is required.", "REQUIRED_LOGO", 400);
  }
  if (logoContentType && logoDataBase64) validateLogoData(logoContentType, logoDataBase64);
  return {
    clubName,
    teamName,
    representativeName,
    email,
    phone,
    logoContentType,
    logoDataBase64,
  };
}

export class RegistrationStore {
  constructor(
    private readonly sql: SqlStorage,
    private readonly transactionSync: <T>(callback: () => T) => T,
  ) {
    sql.exec(`CREATE TABLE IF NOT EXISTS registration_clubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      logo_id TEXT REFERENCES logos(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS registration_teams (
      id TEXT PRIMARY KEY,
      club_id TEXT NOT NULL REFERENCES registration_clubs(id),
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      representative_name TEXT NOT NULL,
      email TEXT NOT NULL,
      normalized_email TEXT NOT NULL,
      phone TEXT NOT NULL,
      normalized_phone TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS registration_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES registration_teams(id),
      name TEXT NOT NULL,
      back_number INTEGER NOT NULL CHECK (back_number >= 0),
      created_at TEXT NOT NULL,
      UNIQUE(team_id, back_number)
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS registration_access (
      token_hash TEXT PRIMARY KEY,
      team_ids_json TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    sql.exec(`CREATE TABLE IF NOT EXISTS registration_verify_attempts (
      key_hash TEXT PRIMARY KEY,
      window_started_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL
    )`);
  }

  registerTeam(value: unknown, now: number): RegistrationTeamSummary {
    return this.registerTeams(value, now)[0];
  }

  registerTeams(value: unknown, now: number): RegistrationTeamSummary[] {
    if (!value || typeof value !== "object") {
      throw new RegistrationError("Invalid registration details.", "INVALID_INPUT", 400);
    }
    const source = value as Record<string, unknown>;
    const teamNames = Array.isArray(source.teamNames) ? source.teamNames : [source.teamName];
    if (teamNames.length < 1 || teamNames.length > 40) {
      throw new RegistrationError("Enter between 1 and 40 team names.", "INVALID_TEAM_COUNT", 400);
    }
    const inputs = teamNames.map((teamName) => validateTeamRegistration({ ...source, teamName }));
    const normalizedTeamNames = inputs.map((input) => input.teamName.toLocaleLowerCase("en"));
    if (new Set(normalizedTeamNames).size !== normalizedTeamNames.length) {
      throw new RegistrationError(
        "Each team name must be unique in this application.",
        "DUPLICATE_TEAM",
        409,
      );
    }
    const input = inputs[0];
    const normalizedClub = input.clubName.toLocaleLowerCase("en");
    const createdAt = new Date(now).toISOString();
    const ids = inputs.map(() => crypto.randomUUID());
    try {
      this.transactionSync(() => {
        let club = this.sql
          .exec<{ id: string; logo_id: string | null }>(
            "SELECT id, logo_id FROM registration_clubs WHERE normalized_name = ?",
            normalizedClub,
          )
          .toArray()[0];
        if (!club) {
          club = { id: crypto.randomUUID(), logo_id: null };
          this.sql.exec(
            `INSERT INTO registration_clubs (id, name, normalized_name, logo_id, created_at, updated_at)
             VALUES (?, ?, ?, NULL, ?, ?)`,
            club.id,
            input.clubName,
            normalizedClub,
            createdAt,
            createdAt,
          );
        }
        if (input.logoContentType && input.logoDataBase64 && !club.logo_id) {
          this.insertClubLogo(club.id, input.logoContentType, input.logoDataBase64, now);
        }
        inputs.forEach((team, index) => {
          this.sql.exec(
            `INSERT INTO registration_teams
             (id, club_id, tournament_id, name, normalized_name, representative_name, email, normalized_email, phone, normalized_phone, created_at, updated_at)
             VALUES (?, ?, '20261220', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ids[index],
            club.id,
            team.teamName,
            normalizedTeamNames[index],
            team.representativeName,
            team.email,
            normalizeEmail(team.email),
            team.phone,
            normalizePhone(team.phone),
            createdAt,
            createdAt,
          );
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        throw new RegistrationError(
          "A team with this name is already registered. Contact the organiser if this is a mistake.",
          "DUPLICATE_TEAM",
          409,
        );
      }
      throw error;
    }
    const clubId = this.sql
      .exec<{ id: string }>(
        "SELECT id FROM registration_clubs WHERE normalized_name = ?",
        normalizedClub,
      )
      .toArray()[0].id;
    const logoId = this.getClubLogoId(normalizedClub);
    return inputs.map((team, index) => ({
      id: ids[index],
      clubId,
      clubName: team.clubName,
      teamName: team.teamName,
      representativeName: team.representativeName,
      createdAt,
      memberCount: 0,
      logoId,
    }));
  }

  private getClubLogoId(normalizedName: string): string | null {
    return (
      this.sql
        .exec<{ logo_id: string | null }>(
          "SELECT logo_id FROM registration_clubs WHERE normalized_name = ?",
          normalizedName,
        )
        .toArray()[0]?.logo_id ?? null
    );
  }

  async verifyContact(
    value: unknown,
    ip: string,
    now: number,
  ): Promise<{
    token: string;
    teams: RegistrationTeamSummary[];
  }> {
    if (!value || typeof value !== "object") {
      throw new RegistrationError("Enter both registered contact details.", "INVALID_INPUT", 400);
    }
    const input = value as Record<string, unknown>;
    const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
    const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
    const phone = normalizePhone(rawPhone);
    if (!email || !phone) {
      throw new RegistrationError("Enter both registered contact details.", "INVALID_INPUT", 400);
    }
    if (rawPhone.length > 32 || !/^\+?[0-9\s().-]+$/.test(rawPhone)) {
      throw new RegistrationError("Enter both registered contact details.", "INVALID_INPUT", 400);
    }
    const attemptKey = `20261220:${ip}`;
    const attemptKeyHash = await hash(attemptKey);
    this.sql.exec(
      "DELETE FROM registration_verify_attempts WHERE window_started_at <= ?",
      now - VERIFY_WINDOW_MS,
    );
    const row = this.sql
      .exec<{ window_started_at: number; attempts: number }>(
        "SELECT window_started_at, attempts FROM registration_verify_attempts WHERE key_hash = ?",
        attemptKeyHash,
      )
      .toArray()[0];
    if (
      row &&
      now - row.window_started_at < VERIFY_WINDOW_MS &&
      row.attempts >= VERIFY_MAX_ATTEMPTS
    ) {
      throw new RegistrationError("Too many attempts. Try again later.", "TOO_MANY_ATTEMPTS", 429);
    }
    if (!row || now - row.window_started_at >= VERIFY_WINDOW_MS) {
      this.sql.exec(
        `INSERT INTO registration_verify_attempts (key_hash, window_started_at, attempts)
         VALUES (?, ?, 1)
         ON CONFLICT(key_hash) DO UPDATE SET window_started_at = excluded.window_started_at, attempts = 1`,
        attemptKeyHash,
        now,
      );
    } else {
      this.sql.exec(
        "UPDATE registration_verify_attempts SET attempts = attempts + 1 WHERE key_hash = ?",
        attemptKeyHash,
      );
    }

    const matches = this.sql
      .exec<{
        id: string;
        club_id: string;
        club_name: string;
        team_name: string;
        created_at: string;
        member_count: number;
        logo_id: string | null;
      }>(
        `SELECT t.id, c.id AS club_id, c.name AS club_name, t.name AS team_name, t.created_at,
                (SELECT COUNT(*) FROM registration_members m WHERE m.team_id = t.id) AS member_count,
                c.logo_id
         FROM registration_teams t JOIN registration_clubs c ON c.id = t.club_id
         WHERE t.normalized_email = ? AND t.normalized_phone = ?`,
        email,
        phone,
      )
      .toArray();
    if (!matches.length) {
      throw new RegistrationError(
        "The contact details could not be verified. Check them and try again.",
        "CONTACT_NOT_VERIFIED",
        401,
      );
    }

    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const tokenHash = await hash(token);
    this.sql.exec("DELETE FROM registration_access WHERE expires_at <= ?", now);
    this.sql.exec(
      `INSERT INTO registration_access (token_hash, team_ids_json, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
      tokenHash,
      JSON.stringify(matches.map((team) => team.id)),
      now + ACCESS_TTL_MS,
      now,
    );
    return {
      token,
      teams: matches.map((team) => ({
        id: team.id,
        clubId: team.club_id,
        clubName: team.club_name,
        teamName: team.team_name,
        createdAt: team.created_at,
        memberCount: team.member_count,
        logoId: team.logo_id,
      })),
    };
  }

  private async access(token: string | null, teamId: string, now: number) {
    if (!token) {
      throw new RegistrationError(
        "Verify your registered contact details again.",
        "VERIFY_REQUIRED",
        401,
      );
    }
    const access = this.sql
      .exec<{ team_ids_json: string; expires_at: number }>(
        "SELECT team_ids_json, expires_at FROM registration_access WHERE token_hash = ?",
        await hash(token),
      )
      .toArray()[0];
    if (!access || access.expires_at <= now) {
      throw new RegistrationError(
        "Verify your registered contact details again.",
        "VERIFY_REQUIRED",
        401,
      );
    }
    let teamIds: unknown;
    try {
      teamIds = JSON.parse(access.team_ids_json);
    } catch {
      throw new RegistrationError(
        "Verify your registered contact details again.",
        "VERIFY_REQUIRED",
        401,
      );
    }
    const authorized = Array.isArray(teamIds) && teamIds.includes(teamId);
    const teamExists = authorized
      ? this.sql
          .exec<{ id: string }>("SELECT id FROM registration_teams WHERE id = ?", teamId)
          .toArray()[0]
      : undefined;
    if (!teamExists) {
      throw new RegistrationError(
        "This team is not available for this registration session.",
        "FORBIDDEN",
        403,
      );
    }
    return access;
  }

  async listMembers(teamId: string, token: string | null, now: number) {
    await this.access(token, teamId, now);
    const team = this.sql
      .exec<{
        club_id: string;
        club_name: string;
        team_name: string;
        logo_id: string | null;
        member_count: number;
      }>(
        `SELECT c.id AS club_id, c.name AS club_name, t.name AS team_name, c.logo_id,
                (SELECT COUNT(*) FROM registration_members m WHERE m.team_id = t.id) AS member_count
         FROM registration_teams t JOIN registration_clubs c ON c.id = t.club_id WHERE t.id = ?`,
        teamId,
      )
      .toArray()[0];
    if (!team) throw new RegistrationError("Team not found.", "TEAM_NOT_FOUND", 404);
    const members = this.sql
      .exec<{ id: string; name: string; back_number: number; created_at: string }>(
        "SELECT id, name, back_number, created_at FROM registration_members WHERE team_id = ? ORDER BY back_number",
        teamId,
      )
      .toArray()
      .map((member): RegisteredMember => ({
        id: member.id,
        name: member.name,
        backNumber: member.back_number,
        createdAt: member.created_at,
      }));
    return {
      teamId,
      clubId: team.club_id,
      clubName: team.club_name,
      teamName: team.team_name,
      logoId: team.logo_id,
      members,
      memberCount: team.member_count,
      maxMembers: 11,
      deadline: "2026-12-12T23:59:59+09:00",
      deadlinePassed: isRegistrationDeadlinePassed(now),
    };
  }

  async addMember(teamId: string, value: unknown, token: string | null, now: number) {
    const [member] = await this.addMembers(teamId, [value], token, now);
    return member;
  }

  async addMembers(
    teamId: string,
    values: unknown,
    token: string | null,
    now: number,
  ): Promise<RegisteredMember[]> {
    await this.access(token, teamId, now);
    if (isRegistrationDeadlinePassed(now)) {
      throw new RegistrationError(
        "Member registration closed on 12 December 2026 at 23:59 JST.",
        "MEMBER_REGISTRATION_CLOSED",
        403,
      );
    }
    if (!Array.isArray(values) || values.length < 1 || values.length > 11) {
      throw new RegistrationError("Enter between 1 and 11 members.", "INVALID_INPUT", 400);
    }
    const members = values.map((value) => {
      if (!value || typeof value !== "object") {
        throw new RegistrationError("Enter a name and shirt number.", "INVALID_INPUT", 400);
      }
      const input = value as Record<string, unknown>;
      const name = typeof input.name === "string" ? normalizeName(input.name) : "";
      const backNumber = input.backNumber;
      if (
        !name ||
        name.length > 120 ||
        !Number.isSafeInteger(backNumber) ||
        (backNumber as number) < 0
      ) {
        throw new RegistrationError(
          "Enter a valid name and non-negative shirt number.",
          "INVALID_INPUT",
          400,
        );
      }
      return { name, backNumber: backNumber as number, id: crypto.randomUUID() };
    });
    if (new Set(members.map((member) => member.backNumber)).size !== members.length) {
      throw new RegistrationError(
        "Shirt numbers must be unique within the team.",
        "DUPLICATE_BACK_NUMBER",
        409,
      );
    }
    const createdAt = new Date(now).toISOString();
    try {
      return this.transactionSync(() => {
        const validAccess = this.sql
          .exec<{ team_id: string }>(
            `SELECT id AS team_id FROM registration_teams
             WHERE id = ?`,
            teamId,
          )
          .toArray()[0];
        if (!validAccess) throw new RegistrationError("Team not found.", "TEAM_NOT_FOUND", 404);
        const count = this.sql
          .exec<{ count: number }>(
            "SELECT COUNT(*) AS count FROM registration_members WHERE team_id = ?",
            teamId,
          )
          .toArray()[0].count;
        if (count + members.length > 11) {
          throw new RegistrationError(
            "A team can have no more than 11 registered members.",
            "TEAM_FULL",
            409,
          );
        }
        return members.map((member) => {
          this.sql.exec(
            `INSERT INTO registration_members (id, team_id, name, back_number, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            member.id,
            teamId,
            member.name,
            member.backNumber,
            createdAt,
          );
          return { ...member, createdAt };
        });
      });
    } catch (error) {
      if (error instanceof RegistrationError) throw error;
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        throw new RegistrationError(
          "That shirt number is already used by a member of this team.",
          "DUPLICATE_BACK_NUMBER",
          409,
        );
      }
      throw error;
    }
  }

  async revokeAccess(token: string | null) {
    if (token) {
      this.sql.exec("DELETE FROM registration_access WHERE token_hash = ?", await hash(token));
    }
  }

  listClubs(now: number): {
    deadline: string;
    deadlinePassed: boolean;
    clubs: ClubRegistrationSummary[];
  } {
    const clubs = this.sql
      .exec<{ id: string; name: string; logo_id: string | null }>(
        "SELECT id, name, logo_id FROM registration_clubs ORDER BY name COLLATE NOCASE",
      )
      .toArray();
    const results = clubs.map((club) => {
      const teams = this.sql
        .exec<{
          id: string;
          name: string;
          representative_name: string;
          email: string;
          phone: string;
          created_at: string;
          member_count: number;
        }>(
          `SELECT t.id, t.name, t.representative_name, t.email, t.phone, t.created_at,
                  (SELECT COUNT(*) FROM registration_members m WHERE m.team_id = t.id) AS member_count
           FROM registration_teams t WHERE t.club_id = ? ORDER BY t.name COLLATE NOCASE`,
          club.id,
        )
        .toArray();
      return {
        id: club.id,
        name: club.name,
        logoId: club.logo_id,
        teams: teams.map((team) => {
          const members = this.sql
            .exec<{
              id: string;
              name: string;
              back_number: number;
              created_at: string;
            }>(
              "SELECT id, name, back_number, created_at FROM registration_members WHERE team_id = ? ORDER BY back_number",
              team.id,
            )
            .toArray()
            .map((member): AdminRegisteredMember => ({
              id: member.id,
              name: member.name,
              backNumber: member.back_number,
              createdAt: member.created_at,
            }));
          return {
            id: team.id,
            clubId: club.id,
            clubName: club.name,
            teamName: team.name,
            representativeName: team.representative_name,
            email: team.email,
            phone: team.phone,
            createdAt: team.created_at,
            memberCount: team.member_count,
            logoId: club.logo_id,
            members,
          };
        }),
      };
    });
    return {
      deadline: "2026-12-12T23:59:59+09:00",
      deadlinePassed: isRegistrationDeadlinePassed(now),
      clubs: results,
    };
  }

  listPublicTeams(): PublicRegistrationTeam[] {
    return this.sql
      .exec<{
        id: string;
        club_id: string;
        team_name: string;
        club_name: string;
        logo_id: string | null;
      }>(
        `SELECT t.id, c.id AS club_id, t.name AS team_name, c.name AS club_name, c.logo_id
         FROM registration_teams t JOIN registration_clubs c ON c.id = t.club_id
         ORDER BY c.name COLLATE NOCASE, t.name COLLATE NOCASE`,
      )
      .toArray()
      .map((team) => ({
        id: team.id,
        clubId: team.club_id,
        teamName: team.team_name,
        clubName: team.club_name,
        logoId: team.logo_id,
      }));
  }

  updateTeam(id: string, value: unknown, now: number): void {
    if (!value || typeof value !== "object") {
      throw new RegistrationError("Invalid team details.", "INVALID_INPUT", 400);
    }
    const input = value as Record<string, unknown>;
    const teamName = typeof input.teamName === "string" ? normalizeName(input.teamName) : "";
    const representativeName =
      typeof input.representativeName === "string" ? normalizeName(input.representativeName) : "";
    const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
    const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
    const phone = normalizePhone(rawPhone);
    if (
      !teamName ||
      teamName.length > 120 ||
      !representativeName ||
      representativeName.length > 120 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      rawPhone.length > 32 ||
      !/^\+?[0-9\s().-]+$/.test(rawPhone) ||
      phone.length < 10 ||
      phone.length > 15
    ) {
      throw new RegistrationError("Enter valid team and contact details.", "INVALID_INPUT", 400);
    }
    try {
      this.transactionSync(() => {
        const exists = this.sql
          .exec<{ id: string }>("SELECT id FROM registration_teams WHERE id = ?", id)
          .toArray()[0];
        if (!exists) throw new RegistrationError("Team not found.", "TEAM_NOT_FOUND", 404);
        this.sql.exec(
          `UPDATE registration_teams
           SET name = ?, normalized_name = ?, representative_name = ?, email = ?, normalized_email = ?,
               phone = ?, normalized_phone = ?, updated_at = ?
           WHERE id = ?`,
          teamName,
          teamName.toLocaleLowerCase("en"),
          representativeName,
          email,
          email,
          phone,
          phone,
          new Date(now).toISOString(),
          id,
        );
      });
    } catch (error) {
      if (error instanceof RegistrationError) throw error;
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        throw new RegistrationError(
          "A team with this name is already registered.",
          "DUPLICATE_TEAM",
          409,
        );
      }
      throw error;
    }
  }

  updateClub(clubId: string, value: unknown, now: number): void {
    const name =
      value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).name === "string"
        ? normalizeName((value as Record<string, string>).name)
        : "";
    if (!name || name.length > 120) {
      throw new RegistrationError("Enter a valid club name.", "INVALID_INPUT", 400);
    }
    try {
      this.transactionSync(() => {
        const exists = this.sql
          .exec<{ id: string }>("SELECT id FROM registration_clubs WHERE id = ?", clubId)
          .toArray()[0];
        if (!exists) throw new RegistrationError("Club not found.", "CLUB_NOT_FOUND", 404);
        this.sql.exec(
          `UPDATE registration_clubs SET name = ?, normalized_name = ?, updated_at = ? WHERE id = ?`,
          name,
          name.toLocaleLowerCase("en"),
          new Date(now).toISOString(),
          clubId,
        );
      });
    } catch (error) {
      if (error instanceof RegistrationError) throw error;
      if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
        throw new RegistrationError(
          "A club with this name is already registered.",
          "DUPLICATE_CLUB",
          409,
        );
      }
      throw error;
    }
  }

  deleteTeam(teamId: string): void {
    this.transactionSync(() => {
      const team = this.sql
        .exec<{ club_id: string }>("SELECT club_id FROM registration_teams WHERE id = ?", teamId)
        .toArray()[0];
      if (!team) throw new RegistrationError("Team not found.", "TEAM_NOT_FOUND", 404);
      const accessRows = this.sql
        .exec<{ token_hash: string; team_ids_json: string }>(
          "SELECT token_hash, team_ids_json FROM registration_access",
        )
        .toArray();
      for (const access of accessRows) {
        let teamIds: unknown;
        try {
          teamIds = JSON.parse(access.team_ids_json);
        } catch {
          this.sql.exec("DELETE FROM registration_access WHERE token_hash = ?", access.token_hash);
          continue;
        }
        if (!Array.isArray(teamIds) || !teamIds.includes(teamId)) continue;
        const remainingIds = teamIds.filter((id) => id !== teamId);
        if (remainingIds.length === 0) {
          this.sql.exec("DELETE FROM registration_access WHERE token_hash = ?", access.token_hash);
        } else {
          this.sql.exec(
            "UPDATE registration_access SET team_ids_json = ? WHERE token_hash = ?",
            JSON.stringify(remainingIds),
            access.token_hash,
          );
        }
      }
      this.sql.exec("DELETE FROM registration_members WHERE team_id = ?", teamId);
      this.sql.exec("DELETE FROM registration_teams WHERE id = ?", teamId);
      const remainingTeams = this.sql
        .exec<{ count: number }>(
          "SELECT COUNT(*) AS count FROM registration_teams WHERE club_id = ?",
          team.club_id,
        )
        .toArray()[0].count;
      if (remainingTeams === 0) {
        this.sql.exec("DELETE FROM registration_clubs WHERE id = ?", team.club_id);
      }
    });
  }

  setClubLogo(clubId: string, contentType: string, dataBase64: string, now: number) {
    validateLogoData(contentType, dataBase64);
    const exists = this.sql
      .exec<{ id: string }>("SELECT id FROM registration_clubs WHERE id = ?", clubId)
      .toArray()[0];
    if (!exists) throw new RegistrationError("Club not found.", "CLUB_NOT_FOUND", 404);
    this.transactionSync(() => {
      this.insertClubLogo(clubId, contentType, dataBase64, now);
    });
    return this.getClubLogoIdById(clubId)!;
  }

  private insertClubLogo(clubId: string, contentType: string, dataBase64: string, now: number) {
    const logoId = crypto.randomUUID();
    this.sql.exec(
      "INSERT INTO logos (id, content_type, data_base64, created_at) VALUES (?, ?, ?, ?)",
      logoId,
      contentType,
      dataBase64,
      new Date(now).toISOString(),
    );
    this.sql.exec(
      "UPDATE registration_clubs SET logo_id = ?, updated_at = ? WHERE id = ?",
      logoId,
      new Date(now).toISOString(),
      clubId,
    );
  }

  private getClubLogoIdById(clubId: string) {
    return this.sql
      .exec<{ logo_id: string | null }>(
        "SELECT logo_id FROM registration_clubs WHERE id = ?",
        clubId,
      )
      .toArray()[0]?.logo_id;
  }

  readClubLogo(clubId: string) {
    const logo = this.sql
      .exec<{ content_type: string; data_base64: string }>(
        `SELECT l.content_type, l.data_base64
         FROM registration_clubs c JOIN logos l ON l.id = c.logo_id WHERE c.id = ?`,
        clubId,
      )
      .toArray()[0];
    return logo ? { contentType: logo.content_type, dataBase64: logo.data_base64 } : undefined;
  }

  accessCookie(token: string) {
    return `registration_access=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/registration; Max-Age=${ACCESS_TTL_MS / 1000}`;
  }
}

export class ContactPairRegistrationVerification implements RegistrationVerificationService {
  constructor(private readonly registrations: RegistrationStore) {}

  verify(value: unknown, ip: string, now: number) {
    return this.registrations.verifyContact(value, ip, now);
  }
}

export function registrationAccessToken(cookieHeader: string | null): string | null {
  for (const part of (cookieHeader ?? "").split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === "registration_access") return value.join("=");
  }
  return null;
}

export function clearRegistrationAccessCookie() {
  return "registration_access=; HttpOnly; Secure; SameSite=Strict; Path=/api/registration; Max-Age=0";
}
