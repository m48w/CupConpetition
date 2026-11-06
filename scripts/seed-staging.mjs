// テスト環境に、sample/ のロゴでサンプルの登録チーム（40）と選手（各11人）を入れる。
//
//   node scripts/seed-staging.mjs                 … テスト環境（velocity-cup-staging）に入れる
//   node scripts/seed-staging.mjs http://localhost:5173   … 開発サーバーに入れる
//
// - 本番には入れない（/api/env が "staging" でなければ止まる）。
// - もう登録済みのチーム、選手がいるチームは飛ばすので、何回実行してもよい。
// - 連絡先は架空のもの（sample@example.com / 09000000000）を全チームで共通に使う。
//   本人確認は 15分に5回までなので、1回の確認で全チームの選手を登録するため。
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.argv[2] ?? "https://velocity-cup-staging.komyat-8mk.workers.dev").replace(
  /\/$/,
  "",
);
const TOURNAMENT_ID = "20261220";
const SAMPLE_DIR = fileURLToPath(new URL("../sample/", import.meta.url));
const CONTACT = {
  representativeName: "Sample Representative",
  email: "sample@example.com",
  phone: "09000000000",
};
const PLAYERS_PER_TEAM = 11;

const headers = (extra = {}) => ({
  "content-type": "application/json",
  "x-tournament-id": TOURNAMENT_ID,
  ...extra,
});

async function api(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, { ...init, headers: headers(init.headers) });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

/** 最後の `,` が残っていても読めるようにする（JSON は本来それを許さない）。 */
async function readLogoList() {
  const text = await readFile(join(SAMPLE_DIR, "team_logos.json"), "utf8");
  const list = JSON.parse(text.replace(/,\s*}\s*$/, "}"));
  return Object.entries(list).map(([label, file]) => ({
    name: label.replace(/\s+logo$/i, "").trim(),
    file,
  }));
}

async function main() {
  const env = await api("/api/env", { method: "GET" });
  if (env.body.environment !== "staging") {
    throw new Error(
      `${BASE} はテスト環境ではありません（${JSON.stringify(env.body)}）。止めます。`,
    );
  }

  const teams = await readLogoList();
  console.log(`${teams.length} チームを ${BASE} に登録します。`);

  const existing = await api("/api/registration/teams", { method: "GET" });
  const registered = new Set(
    (existing.body.teams ?? []).map((team) => team.teamName.toLocaleLowerCase("en")),
  );

  let created = 0;
  for (const team of teams) {
    if (registered.has(team.name.toLocaleLowerCase("en"))) {
      console.log(`  - ${team.name}（登録済み）`);
      continue;
    }
    const logo = await readFile(join(SAMPLE_DIR, team.file));
    const { response, body } = await api("/api/registration/teams", {
      method: "POST",
      body: JSON.stringify({
        clubName: team.name,
        teamNames: [team.name],
        ...CONTACT,
        logoContentType: "image/png",
        logoDataBase64: logo.toString("base64"),
      }),
    });
    if (response.ok) {
      created += 1;
      console.log(`  ✓ ${team.name}`);
    } else if (body.code === "DUPLICATE_TEAM" || body.code === "DUPLICATE_CLUB") {
      console.log(`  - ${team.name}（登録済み）`);
    } else if (body.code === "REGISTRATION_FULL" || body.code === "REGISTRATION_CLOSED") {
      console.log(`  ! これ以上チームを登録できません（${body.code}）。選手の登録に進みます。`);
      break;
    } else {
      throw new Error(`${team.name}: ${response.status} ${JSON.stringify(body)}`);
    }
  }
  console.log(`チーム: ${created} 件を新しく登録しました。`);

  // 共通の連絡先で1回だけ本人確認し、全チームに選手を入れる。
  const verify = await api("/api/registration/verify", {
    method: "POST",
    body: JSON.stringify({ email: CONTACT.email, phone: CONTACT.phone }),
  });
  if (!verify.response.ok) {
    throw new Error(`本人確認に失敗: ${verify.response.status} ${JSON.stringify(verify.body)}`);
  }
  const cookie = verify.response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");

  let filled = 0;
  for (const team of verify.body.teams) {
    if (team.memberCount > 0) {
      console.log(`  - ${team.teamName}（選手は登録済み）`);
      continue;
    }
    const members = Array.from({ length: PLAYERS_PER_TEAM }, (_, index) => ({
      name: `${team.teamName} Player ${index + 1}`,
      backNumber: index + 1,
    }));
    const { response, body } = await api("/api/registration/members", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ teamId: team.id, members }),
    });
    if (!response.ok) {
      throw new Error(`${team.teamName} の選手: ${response.status} ${JSON.stringify(body)}`);
    }
    filled += 1;
    console.log(`  ✓ ${team.teamName}: ${PLAYERS_PER_TEAM} 人`);
  }
  console.log(`選手: ${filled} チームに ${PLAYERS_PER_TEAM} 人ずつ登録しました。`);
}

main().catch((error) => {
  console.error(`エラー: ${error.message}`);
  process.exit(1);
});
