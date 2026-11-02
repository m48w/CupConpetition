/** Excel で開いたときに式として動かないよう、先頭がこれらの文字なら ' を付ける（CSVインジェクション対策）。 */
const FORMULA_START = /^[=+\-@\t\r]/;

/** CSV の1つの値。`,` `"` 改行を含むときは "..." で囲み、`"` は `""` にする。 */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** 行の配列を CSV にする。Excel で文字化けしないよう先頭に BOM を付け、改行は CRLF。 */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export interface CsvTeam {
  clubName: string;
  teamName: string;
  representativeName: string;
  email: string;
  phone: string;
  createdAt: string;
  members: { name: string; backNumber: number }[];
}

export const REGISTRATION_CSV_HEADER = [
  "Club",
  "Team",
  "Representative",
  "Email",
  "Phone",
  "Player",
  "Back number",
  "Registered at",
];

/** 1行 = 1選手。選手がいないチームは1行（選手の列は空）。 */
export function registrationRows(teams: CsvTeam[]): (string | number)[][] {
  const rows: (string | number)[][] = [REGISTRATION_CSV_HEADER];
  for (const team of teams) {
    const base = [team.clubName, team.teamName, team.representativeName, team.email, team.phone];
    if (team.members.length === 0) {
      rows.push([...base, "", "", team.createdAt]);
      continue;
    }
    for (const member of team.members) {
      rows.push([...base, member.name, member.backNumber, team.createdAt]);
    }
  }
  return rows;
}
