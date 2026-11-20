# Velocity Cup 2026 — Agent Review & Test Plan / エージェント用レビュー・テスト書

- **Version / 版**: 1.1.0 (2026-11-20: Home/Groups/Knockout text removed, Favorite Team, Facebook button, Matches toolbar in one row, 2nd yellow as one row)
- **Date / 作成日**: 2026-11-19
- **Reader / 読む人**: an AI agent (or developer) who reviews and tests the whole app on a local machine / ローカルでアプリ全体をレビュー・テストする AI エージェント（または開発者）
- **Target / 対象**: commit `e55edd3` or later on `main` / `main` の `e55edd3` 以降
- **Related / 関連文書**: `docs/仕様書.md` (main spec / 統合仕様書), `docs/*_仕様書.md`, `docs/*_設計書.md`, `docs/テスト書/相互テスト書_TestCases.md` (human cross test / 人が行う相互テスト)

This plan has 6 parts. Do them in order. Write every result into the report file (part 7).
本書は6つのパートでできている。順番に行い、結果はすべて報告ファイル（7章）に書く。

| Part / パート | Content / 内容 | IDs |
|---|---|---|
| 1 | Automated checks / 自動チェック | AT-01〜AT-06 |
| 2 | Code review / コードレビュー | CR-01〜CR-40 |
| 3 | Spec vs implementation / 仕様書と実装の違い | SP-01〜SP-30 |
| 4 | API tests / API テスト | API-01〜API-60 |
| 5 | UI function tests / 画面の動作テスト | UI-01〜UI-55 |
| 6 | UI layout on PC, iPad, iPhone / 画面の見た目（PC・iPad・iPhone） | RS-01〜RS-15 |

---

## 0. Rules / ルール（必ず守る）

| No. | EN | JA |
|---|---|---|
| R-1 | **Review and report only.** Do not change source code, docs or config. If you find a bug, write it in the report. (Small scripts for testing go in a scratch folder outside the project.) | **レビューと報告だけ。** ソースコード・文書・設定を変えない。バグは報告に書く。（テスト用の小さなスクリプトはプロジェクトの外の作業フォルダーに置く） |
| R-2 | **Do not commit and do not push.** Exception: the report file and screenshots (part 7) may be left as new files for the owner to commit. | **コミット・プッシュしない。** 例外: 報告ファイルとスクリーンショット（7章）は新しいファイルとして置いておく（コミットはオーナーが行う）。 |
| R-3 | **Local only.** Use `npm run dev` on `localhost`. Never call the staging or production URL. | **ローカルだけ。** `localhost` の `npm run dev` を使う。staging・本番の URL には一切アクセスしない。 |
| R-4 | **Secrets.** Never print, copy or paste the values in `.dev.vars` (passwords, `SESSION_SECRET`). Load them into environment variables without echoing. Do not edit the password lines. If `.dev.vars` is missing, stop and ask the owner. | **秘密の値。** `.dev.vars` の値（パスワード・`SESSION_SECRET`）を表示・コピー・貼り付けしない。表示せずに環境変数に読み込む。パスワードの行は変えない。`.dev.vars` が無ければ止めてオーナーに聞く。 |
| R-5 | **No real personal data.** Use made-up names, `@example.com` e-mails and phone numbers like `09000000001`. | **本物の個人情報は使わない。** 名前は架空、メールは `@example.com`、電話は `09000000001` のような番号。 |
| R-6 | Delete only the temporary files you made. Do not delete `.wrangler/` unless part 1 says so. | 消すのは自分が作った一時ファイルだけ。`.wrangler/` は1章の指示があるときだけ消す。 |
| R-7 | Result values: `OK`, `NG` (failed — add a finding), `Skip` (could not test — write why), `N/A`. | 結果は `OK`・`NG`（失敗。指摘を書く）・`Skip`（できなかった。理由を書く）・`N/A`。 |

---

## 1. Setup / 準備

### 1.1 Start the app / 起動

```bash
# project root / プロジェクトのルート
git log --oneline -1          # write this commit in the report / このコミットを報告に書く
npm ci
test -f .dev.vars || echo "STOP: .dev.vars is missing — ask the owner"   # R-4
rm -rf .wrangler/state        # start from empty local data / ローカルデータを空にする
npm run dev                   # http://localhost:5173
```

- Base URL / 基点: `http://localhost:5173`
- Tournament / 大会: `/20261220/` (registration: `/registration/20261220/`)
- `.dev.vars` has `APP_ENV=staging`, so the yellow "TEST SITE" bar and the 🎲 TEST TOOLS are shown locally. / `.dev.vars` は `APP_ENV=staging` なので、ローカルでも黄色い「TEST SITE」の帯と 🎲 TEST TOOLS が出る。
- `GET /api/env` must return `{"environment":"staging"}`. / `GET /api/env` が `{"environment":"staging"}` を返すこと。

### 1.2 Sample data / サンプルデータ

```bash
# needs the sample/ folder (logos + team_logos.json, not in git). If it is missing, ask the owner.
# sample/ フォルダー（ロゴと team_logos.json。git には無い）が必要。無ければオーナーに聞く。
npm run seed:staging -- http://localhost:5173
```

Result: 40 registered teams, 11 players each (`<Team> Player 1`〜`11`, back numbers 1〜11), contact `sample@example.com` / `09000000000`.
結果: 40チーム登録、各11人（背番号1〜11）、連絡先は `sample@example.com` / `09000000000`。

### 1.3 Sign in from the command line / コマンドでログイン

The `session` cookie has `Secure`, so some HTTP clients do not send it over `http://localhost`. Read the cookie from `set-cookie` and send it yourself as a `cookie` header.
`session` Cookie は `Secure` 付きなので、HTTP クライアントによっては `http://localhost` で送らない。`set-cookie` から取り出して、自分で `cookie` ヘッダーとして送る。

```bash
set -a; . ./.dev.vars; set +a          # loads values without printing them / 表示せずに読み込む
B=http://localhost:5173
T='x-tournament-id: 20261220'
J='content-type: application/json'
login() {  # $1 = username, $2 = password → prints "session=..." / Cookie を出力
  curl -s -i -X POST "$B/api/login" -H "$J" -H "$T" \
    -d "{\"username\":\"$1\",\"password\":\"$2\"}" \
    | grep -i '^set-cookie:' | sed 's/^[^:]*: //; s/;.*//'
}
SUPER=$(login superadmin "$SUPERADMIN_PASSWORD")
SUB1=$(login subadmin1 "$SUBADMIN_PASSWORD")   # Court 1
SUB3=$(login subadmin3 "$SUBADMIN_PASSWORD")   # Court 2
# Do not echo $SUPER / $SUB1 / $SUB3 into the report. / Cookie の値を報告に書かない。
```

In a browser (Playwright/Chromium) the normal login form works on `localhost`.
ブラウザー（Playwright・Chromium）では、`localhost` なら普通のログイン画面で入れる。

### 1.4 Make groups and the schedule / グループと試合を作る

Do this once by API (UI-30〜UI-33 test the same thing on screen later).
API で1回だけ行う（画面での操作は後で UI-30〜UI-33 で確認する）。

```bash
curl -s -X POST "$B/api/initialize" -H "$J" -H "$T" -H "cookie: $SUPER" -d '{}' >/dev/null
IDS=$(curl -s "$B/api/admin/group-draft" -H "$T" -H "cookie: $SUPER" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s).candidates.map(x=>x.id);const g={};"ABCDEFGH".split("").forEach((k,i)=>g[k]=c.slice(i*5,i*5+5));console.log(JSON.stringify({groups:g}))})')
curl -s -X PUT  "$B/api/teams/groups" -H "$J" -H "$T" -H "cookie: $SUPER" -d "$IDS" -o /dev/null -w '%{http_code}\n'   # 200
curl -s -X POST "$B/api/schedule"     -H "$J" -H "$T" -H "cookie: $SUPER" -d '{}' -o /dev/null -w '%{http_code}\n'    # 200
```

Check: `GET /api/state` has 40 teams and 95 matches (80 group + 15 knockout).
確認: `GET /api/state` にチーム40件・試合95件（グループ80＋決勝トーナメント15）。

### 1.5 Viewports / 画面サイズ

| Code | Size | Playwright |
|---|---|---|
| PC | 1280×900 | `{ viewport: { width: 1280, height: 900 } }` |
| PC-wide | 1680×1000 | `{ viewport: { width: 1680, height: 1000 } }` |
| iPad-P | iPad portrait | `devices['iPad (gen 7)']` |
| iPad-L | iPad landscape | `devices['iPad (gen 7) landscape']` |
| iPhone | iPhone 13 | `devices['iPhone 13']` |

Use `deviceScaleFactor: 1` for your own checks. Save screenshots for the report under `docs/テスト書/images/<YYYY-MM-DD>/agent/`.
自分の確認は `deviceScaleFactor: 1` でよい。報告用のスクリーンショットは `docs/テスト書/images/<YYYY-MM-DD>/agent/` に保存する。

Google Fonts may be blocked in a sandbox. Fallback fonts in screenshots are **not** a bug.
サンドボックスでは Google Fonts が読めないことがある。スクリーンショットの代わりのフォントはバグではない。

---

## 2. Part 1 — Automated checks / 自動チェック

| ID | Command / コマンド | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| AT-01 | `npm run lint` | 0 errors, 0 warnings / エラー・警告 0 | | |
| AT-02 | `npm run format:check` | "All matched files use Prettier code style!" | | |
| AT-03 | `npm run typecheck` | No errors / エラーなし | | |
| AT-04 | `npm test` | All tests pass (212 or more at `e55edd3`). Write the numbers. / 全部成功（`e55edd3` で212件以上）。件数を書く | | |
| AT-05 | `npm run build` | Build succeeds. Write the size of the largest JS/CSS file. / 成功。一番大きい JS・CSS のサイズを書く | | |
| AT-06 | `npm audit --omit=dev` | Write the result. High/critical = finding. / 結果を書く。high・critical は指摘にする | | |

---

## 3. Part 2 — Code review / コードレビュー

Read the files and answer each point. For each problem write: file, line, what is wrong, a concrete failure scenario, and a suggested fix.
ファイルを読んで各項目を確認する。問題には、ファイル・行・何が悪いか・具体的に壊れる例・直し方を書く。

**Severity / 重大度**: `High` (data loss, security hole, wrong match result on match day / データが消える・セキュリティの穴・当日に結果が間違う), `Medium` (wrong behaviour in a normal case / 普通の使い方で動きが違う), `Low` (rare case, readability, small UI / まれなケース・読みやすさ・小さな見た目).

### 3.1 Server — security and permissions / サーバー — セキュリティと権限

| ID | Files | Check / 確認すること | Result | Note |
|---|---|---|---|---|
| CR-01 | `worker/index.ts`, `worker/api.ts` | Every write API (`POST`/`PUT`/`PATCH`/`DELETE`) checks login and role before it changes data. List any route that does not. / 全部の書き込み API が、変更の前にログインと役割を確認しているか。していない API を挙げる | | |
| CR-02 | `worker/api.ts` | SubAdmin can change only matches, goals and cards on their own court (`assertCourt`). Check goals/cards found by their own id (`/api/goals/:id`, `/api/cards/:id`) too. / SubAdmin は担当コートの試合・ゴール・カードだけ変えられるか。ID で探すゴール・カードの API も | | |
| CR-03 | `worker/auth.ts`, `worker/login.ts` | Session cookie: signed, `HttpOnly; Secure; SameSite=Strict`, 12 h expiry checked on the server. Timing-safe password compare. / Cookie の署名・属性・12時間の期限をサーバーで確認しているか。パスワード比較は時間で漏れないか | | |
| CR-04 | `worker/attempts.ts`, `worker/login.ts` | 5 failures → 60 s lock per username, counted in the fixed `auth` Durable Object, not per tournament. Unknown usernames are not counted. / 5回失敗で60秒ロック。大会に関係なく数えるか | | |
| CR-05 | `worker/registration.ts` | Verify (e-mail + phone) is limited to 5 per 15 min per IP. The error does not tell whether the contact exists. Access cookie expires in 1 h. / 本人確認は IP ごとに15分5回。連絡先があるか分からないエラーか。Cookie は1時間 | | |
| CR-06 | `worker/http.ts`, `worker/api.ts` | Write requests without `content-type: application/json` get 415. Bad JSON gets 400, not 500. / JSON でない書き込みは415、壊れた JSON は400 | | |
| CR-07 | `worker/index.ts` | Only tournament IDs `20261220` and `test` are allowed; others get 400 and do not create a Durable Object. `/test/` is 404 in production. / 大会 ID の制限 | | |
| CR-08 | `worker/csv.ts` | CSV cells starting with `=`, `+`, `-`, `@` (and tab / CR) get a leading `'`. UTF-8 BOM. / CSV インジェクション対策 | | |
| CR-09 | `worker/api.ts` (logos) | Logo upload: type limited to PNG/JPEG/WebP, size ≤ 1 MB checked on the server (after Base64 decode). `GET /api/logos/:id` sends `X-Content-Type-Options: nosniff`. / ロゴの形式・サイズをサーバーで確認しているか | | |
| CR-10 | `public/_headers`, `worker/http.ts` | Security headers on API and static files (`nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, CSP). Is the CSP strict enough (no `unsafe-eval`)? / セキュリティヘッダーと CSP | | |
| CR-11 | `worker/api.ts` | `POST /api/admin/test/random-results` returns 403 `TEST_ONLY` when `APP_ENV` is production. The 🎲 buttons are hidden there. / テスト用 API が本番で使えないか | | |
| CR-12 | whole repo | No secrets in code, tests, docs or `dist/`. `.dev.vars` and `sample/` are in `.gitignore`. / 秘密の値がコードに無いか | | |

### 3.2 Server — data and logic / サーバー — データとロジック

| ID | Files | Check / 確認すること | Result | Note |
|---|---|---|---|---|
| CR-13 | `worker/store.ts` | Multi-row writes (reset, replace, groups, schedule, goals with score, cards with auto red) run inside one `transactionSync`. / 複数行の書き込みが1つのトランザクションか | | |
| CR-14 | `worker/store.ts` | Migrations (`store_migrations`, `PRAGMA table_info` + `ALTER TABLE`) are safe to run many times and on an old database. Check `match_cards.source_card_id`. / 移行が何度実行しても安全か。古い DB でも動くか | | |
| CR-15 | `worker/store.ts` | `patchMatch` accepts only `status`, scores, timer and PK fields. Types and ranges are checked (no negative score, valid status change). / PATCH できる項目と値の確認 | | |
| CR-16 | `worker/store.ts`, `src/features/tournament/progression.ts` | Auto progression: group winner/runner-up go to R16 when the group is finished; knockout winner (incl. PK) goes to the next match. Editing a result after the next match started → 409 `RESULT_LOCKED`. / 自動進出と結果の固定 | | |
| CR-17 | `src/features/tournament/logic.ts` | Ranking order: points → goal difference → goals for → head-to-head → manual order (`Tie decisions`). Check 3-way ties. / 順位の決め方。3チーム同点も | | |
| CR-18 | `worker/store.ts` | Goals: only from QF; `+` adds a goal and 1 point in one step; `−` removes the last goal of that team; changing the scorer does not change the score; PK goals are not counted. / 得点者のルール | | |
| CR-19 | `worker/store.ts` | Cards: match must be started; registered player only (null → `INVALID_PLAYER`); 2nd yellow of the same player in the same match adds a red with `source_card_id`; 3rd yellow adds no red; deleting the 2nd yellow deletes its red; cards are removed by reset/initialize/regroup and by `pruneCards`. / カードのルール | | |
| CR-20 | `worker/store.ts` | Card minute = `goalMinute(elapsedSeconds(match, now))`. Check PAUSED and LIVE after resume. / カードの分の計算 | | |
| CR-21 | `src/features/tournament/schedule.ts` | 95 matches, no court clash, ≥ 15 min between a team's matches, no Court 3 before 12:15, last match ends 19:59. Works for 16〜40 teams. / スケジュールの制約 | | |
| CR-22 | `worker/registration.ts` | Registration: 40-team limit and deadlines only when `REGISTRATION_LIMITS=on`; batch is all-or-nothing; team name unique; max 11 members; back number ≥ 0 and unique in team; member deadline 2026-12-12 23:59:59 JST. / 登録のルール | | |
| CR-23 | `worker/registration.ts`, `worker/api.ts` | Deleting a registered team that is in a group → 409 `TEAM_IN_GROUP`. Deleting the last team of a club deletes the club. Shared logo is kept. / 登録チームの削除 | | |
| CR-24 | `worker/room.ts` | WebSocket: every change bumps `version` once and sends the full state; ping/pong; hibernation-safe. / WebSocket の配信 | | |

### 3.3 Client / 画面側

| ID | Files | Check / 確認すること | Result | Note |
|---|---|---|---|---|
| CR-25 | `src/features/tournament/hooks/useTournamentState.ts`, `api/socket.ts` | Reconnect 1 s → 10 s backoff, 25 s silence = reconnect, older `version` is ignored, banner shown while offline, admin buttons disabled. / 再接続と古いデータの扱い | | |
| CR-26 | `src/features/tournament/components/FixtureCard.tsx` | One card component everywhere. Row is `role="button"`, Enter/Space work, `aria-expanded`/`aria-controls` correct. Players load once (shared fetch). / 試合カード | | |
| CR-27 | `src/features/admin/components/*` | Pickers (scorer, card): Esc closes, focus is sensible, buttons disabled while saving, errors shown. CardPicker has no "Unknown player". / 選ぶ画面 | | |
| CR-28 | `src/features/tournament/components/BackNumber.tsx`, `CardMark.tsx` | Back number circle and card shape have accessible names. No `#` back numbers left anywhere (`grep -rn '#{' src`). / 背番号の丸・カードの形の読み上げ名。`#` が残っていないか | | |
| CR-29 | `src/i18n/messages.ts`, `src/i18n/errors.ts` | Every key has `en`; Myanmar missing/empty falls back to English; `{placeholders}` match in both languages; no unused keys; every server `code` has a message. / 翻訳の抜け・未使用・`{}` の一致 | | |
| CR-30 | `src/**/*.tsx` | No `dangerouslySetInnerHTML`; announcements are shown as text only. / HTML を直接入れていないか | | |
| CR-31 | `src/**` | `localStorage` keys (`vc.lang`, `vc.myTeam.<id>`, `vc.matches.sort`, `vc.matches.team.<id>`, `vc.dismissed`) are read in `try/catch` and bad values do not crash the page. / `localStorage` が壊れていても落ちないか | | |
| CR-32 | `src/main.tsx`, `src/config.ts` | Tournament ID is decided once at start (`setTournamentId`) and used for API and WebSocket. / 大会 ID の決め方 | | |
| CR-33 | `src/styles.css` | Theme variables used (no stray hard-coded colours except card/LIVE/danger/warn). Touch targets ≥ 44px on phones. No duplicated or dead selectors (e.g. old `.yellow-card-mark`). / CSS 変数・44px・使っていないセレクタ | | |
| CR-34 | `src/pages/*.tsx` | Each page has a hidden heading (`PageTitle` / `.sr-only`). Empty states have a message. / 見えない見出しと空の表示 | | |

### 3.4 General / 全体

| ID | Check / 確認すること | Result | Note |
|---|---|---|---|
| CR-35 | Types: no `any`, no unsafe `as` on data from the network without a check. / 型の安全性 | | |
| CR-36 | Dead code, unused exports, unused files, old components (e.g. removed `MatchCard` component). / 使っていないコード | | |
| CR-37 | Tests: important rules in CR-13〜CR-23 have tests. List rules without tests. / 大事なルールにテストがあるか。無いものを挙げる | | |
| CR-38 | Comments match the code (Japanese comments are OK). / コメントがコードと合っているか | | |
| CR-39 | Performance: `GET /api/state` size with 40 teams, 95 matches, logos (logos must not be inside state). Re-render cost of the Matches page. / 応答サイズと再描画 | | |
| CR-40 | Free plan limits (100k requests/day): count requests one viewer makes in 10 minutes (WebSocket ping does not count as a request). / 無料枠への影響 | | |

---

## 4. Part 3 — Spec vs implementation / 仕様書と実装の違い

For each line, check `docs/仕様書.md` (section in brackets) against the code **and** the running app. Write `Match`, `Differs` (explain), or `Spec unclear`.
各行について `docs/仕様書.md`（かっこの章）とコード・動いているアプリを比べる。`Match`（一致）・`Differs`（違う。説明）・`Spec unclear`（仕様があいまい）を書く。

| ID | Spec point / 仕様 | Where / 章 | Result | Note |
|---|---|---|---|---|
| SP-01 | `/` → 302 to `/20261220/`; `/20261220` → 308 to `/20261220/`; `/superadmin`, `/subadmin` → `/20261220/admin`; `/u/<token>` → 301 or 404 | 3.2, 14 | | |
| SP-02 | Screen list and routes (incl. `/standings` → `/groups`, `/bracket` → `/knockout`, `/info` → `/`, `/admin/setup` → `/admin/dashboard`, unknown `/admin/*` → 404 after login) | 3.2, 14.2 | | |
| SP-03 | Header: logo, title, PC right side language + Register; ≤ 900px ☰ menu with Register, language, Add to home screen; menu closes on navigation, Esc, outside tap | 3.1 | | |
| SP-04 | Colours: white/black, colour only for LIVE (green), errors (red), warnings/PK/test bar (yellow) | 3.1 | | |
| SP-05 | Footer is only `Copyright © 2026 M48W` | 3.1 | | |
| SP-06 | Page headings hidden (`.sr-only`), side buttons/short texts kept | 3.1 | | |
| SP-07 | PC left menu fixed; phone bottom menu Home / Matches / Live / Groups / Knockout; PC menu adds Teams | 3.1 | | |
| SP-08 | Live icon green while a match is LIVE | 3.1, 6 | | |
| SP-09 | PWA: manifest starts at `/20261220/`, `sw.js` caches nothing | 3.1 | | |
| SP-10 | Home: countdown until 2026-12-20 09:00 JST, "first match at 9:00"; info section; teams strip; rules section | 3.3 | | |
| SP-11 | Language EN/Myanmar, saved in `vc.lang`, `<html lang>` changes, admin and names not translated, server errors translated by `code` | 3.4 | | |
| SP-12 | My team (`vc.myTeam.<id>`): next match + group rank; reset if the team no longer exists; Matches team select starts with it | 3.5 | | |
| SP-13 | Announcements: EN required ≤ 300, MY optional ≤ 300, Info/Warning, newest 3 shown, dismiss per device, real-time | 3.5 | | |
| SP-14 | CSV columns and escaping | 3.5 | | |
| SP-15 | Schedule numbers: 80 group + 8 R16 + 4 QF + 2 SF + 1 Final; times in the 4.4 table; durations 15/18/15/15/23 min | 4.2〜4.4 | | |
| SP-16 | Matches page: switches Groups (saved) / All matches (not saved), team select, group colours, collapsible headers | 5 | | |
| SP-17 | Match card centre text for SCHEDULED / LIVE / PAUSED / FINISHED / PK | 5 | | |
| SP-18 | Card opens players (⑩ name), ⚽ from QF, "No players registered.", link to match details | 5 | | |
| SP-19 | Live: LIVE + PAUSED shown, FINISHED removed; next match per court | 6 | | |
| SP-20 | Groups: full column names, phone table scrolls inside, rank/team columns fixed, green line for 1st/2nd, 2 columns ≥ 1600px | 7 | | |
| SP-21 | Knockout: no top text/banner; placeholders before schedule; final highlighted; spacing in R16; Top scorers | 8, 14.2 | | |
| SP-22 | Accounts and courts (superadmin, subadmin1〜6), lock after 5 failures for 60 s | 9.1 | | |
| SP-23 | Permission table (401 / 403 / `WRONG_COURT`) | 9.2 | | |
| SP-24 | Match control buttons per status, big status + timer, filters (Court/Stage/Status), next match after Finish | 9.3 | | |
| SP-25 | Ties, PK required before Finish, `RESULT_LOCKED` | 9.3 | | |
| SP-26 | Scorers from QF and cards on all matches (registered players only, 2nd yellow → red, sent-off players can still get cards) | 9.3, カード記録_仕様書 | | |
| SP-27 | Super Admin setup: Seed knockout, TEST TOOLS, Schedule check text, Reset with confirm | 9.4 | | |
| SP-28 | API table in 10.1 and 15.4 matches the real routes (find routes that exist but are not documented, and the opposite) | 10.1, 15.4 | | |
| SP-29 | Registration form fields, logo resize to 256px WebP, 40-team limit, deadlines, verify, 11 members | 15 | | |
| SP-30 | Initialize, group drag & drop / tap-to-move, Save/Reset to saved, Generate schedule rules (2〜5 teams per group) | 17 | | |

---

## 5. Part 4 — API tests / API テスト

Use the helpers from 1.3. Always send `x-tournament-id: 20261220` unless the case says otherwise. Write the real status and `code`.
1.3 のヘルパーを使う。ケースに書いていなければ `x-tournament-id: 20261220` を付ける。実際のステータスと `code` を書く。

Pick these IDs from `GET /api/state` / `GET /api/state` から選ぶ:
- `M1` = a SCHEDULED group match on Court 1 / Court 1 の未開始グループ戦
- `M2` = a SCHEDULED group match on Court 2 / Court 2 の未開始グループ戦
- `QF` = a quarter-final (after UI-45 or the 🎲 buttons have filled the teams) / 準々決勝（チームが決まった後）

### 5.1 Auth and common rules / ログインと共通ルール

| ID | Request / リクエスト | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| API-01 | `GET /api/env` | 200 `{"environment":"staging"}` | | |
| API-02 | `GET /api/session` without cookie | 200 `{"session":null}` | | |
| API-03 | `POST /api/login` wrong password for `subadmin2` ×5, then the right password | 401 `INVALID_CREDENTIALS` ×5, then 429 `TOO_MANY_ATTEMPTS` with `Retry-After`. After 60 s login works. | | |
| API-04 | `POST /api/login` username `  SuperAdmin ` (spaces, capitals) with the right password | 200 | | |
| API-05 | `POST /api/login` missing fields | 400 `INVALID_LOGIN` | | |
| API-06 | `GET /api/session` with `$SUPER` | role superadmin, all courts | | |
| API-07 | `POST /api/logout` then use the old cookie value? | Logout clears the cookie. Write whether the old signed value still works until expiry (stateless session) — note only. / 古い Cookie が期限まで使えるかをメモ | | |
| API-08 | `PATCH /api/matches/M1` with `content-type: text/plain` | 415 `UNSUPPORTED_MEDIA_TYPE` | | |
| API-09 | `PATCH /api/matches/M1` with body `{bad json` | 400 (not 500) | | |
| API-10 | `GET /api/state` with `x-tournament-id: abc` | 400 `INVALID_TOURNAMENT_ID` | | |
| API-11 | `GET /api/state` with `x-tournament-id: test` | 200 (test tournament on staging/local) | | |
| API-12 | Response headers of any `/api/*` | `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` | | |

### 5.2 Matches / 試合

| ID | Request / リクエスト | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| API-13 | `PATCH /api/matches/M1` `{"status":"LIVE"}` without cookie | 401 `UNAUTHENTICATED` | | |
| API-14 | same with `$SUB3` (Court 2) | 403 `WRONG_COURT` | | |
| API-15 | same with `$SUB1` (Court 1) | 200, status LIVE, `timerServerStartedAt` set, `version` +1 | | |
| API-16 | `PATCH /api/matches/M1` `{"court":2}` | 400 `FIELD_NOT_PATCHABLE` | | |
| API-17 | `PATCH /api/matches/M1` `{"homeScore":"x"}` and `{"homeScore":-1}` | 400 `INVALID_FIELD_VALUE` | | |
| API-18 | `PATCH /api/matches/NOPE` | 404 `UNKNOWN_MATCH` | | |
| API-19 | `PATCH /api/matches/M1` `{"status":"PAUSED"}`, wait 3 s, `{"status":"LIVE"}` | Timer keeps the paused seconds and continues. / 止めた秒から続く | | |
| API-20 | Finish a knockout match with equal score and no PK | 400 `PENALTIES_REQUIRED` | | |
| API-21 | Change a finished match after the next match (that uses its winner) started | 409 `RESULT_LOCKED` | | |
| API-22 | `PUT /api/matches` with `$SUB1` | 403 `FORBIDDEN` | | |
| API-23 | `PUT /api/matches` with duplicated match IDs (`$SUPER`) | 400 `INVALID_MATCHES` | | |
| API-24 | `POST /api/reset` with `$SUB1` / `$SUPER` | 403 / 200 (all 95 matches SCHEDULED, 0–0, goals and cards empty) | | |
| API-25 | `PUT /api/groups/A/order` with team IDs that are not in Group A | 400 `INVALID_ORDER` | | |

### 5.3 Goals and cards / 得点者とカード

| ID | Request / リクエスト | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| API-26 | `GET /api/matches/M1/players` with `$SUB1` | 200 `{home:[11], away:[11]}` sorted by back number | | |
| API-27 | `POST /api/matches/M1/goals` (group match) | 400 `GOALS_NOT_TRACKED` | | |
| API-28 | `POST /api/matches/QF/goals` before start | 400 `MATCH_NOT_STARTED` | | |
| API-29 | QF LIVE: goal with a home player; goal with `memberId:null` | 200 each; score +1 each; goal list has player / Unknown | | |
| API-30 | QF: goal with a player of the other team | 400 `INVALID_PLAYER` | | |
| API-31 | `PATCH /api/goals/:id` `{"memberId": <other player>}` | 200, scorer changed, score unchanged | | |
| API-32 | `DELETE /api/matches/QF/goals/last?team=<home>` twice more than goals | 200 then 400 `NO_GOAL` | | |
| API-33 | `POST /api/matches/M2/cards` (not started) | 400 `MATCH_NOT_STARTED` | | |
| API-34 | M1 LIVE: card `{"memberId":null,"color":"YELLOW"}` | 400 `INVALID_PLAYER` | | |
| API-35 | M1: card `{"color":"GREEN"}` with a player | 400 `INVALID_CARD` | | |
| API-36 | M1: yellow to player P, yellow to player Q, yellow to P again | After the 3rd call: Y(P), Y(Q), Y(P), R(P). The R has `sourceCardId` = id of the 2nd Y(P) and the same minute. | | |
| API-37 | M1: 4th yellow to P | Y added, no new red / レッドは増えない | | |
| API-38 | M1: red to P again (sent off) | 200 (allowed) / 退場後もカードを出せる | | |
| API-39 | `DELETE /api/cards/<2nd Y(P)>` | That Y and its R are both removed; others stay | | |
| API-40 | `DELETE /api/cards/<id>` with `$SUB3` on a Court 1 match | 403 `WRONG_COURT` | | |
| API-41 | `DELETE /api/cards/nope` | 404 `UNKNOWN_CARD` | | |
| API-42 | Card in a match of another team: `teamId` not in the match | 400 `INVALID_PLAYER` | | |

### 5.4 Test tools, groups, schedule / テストツール・グループ・スケジュール

| ID | Request / リクエスト | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| API-43 | `POST /api/admin/test/random-results` `{"stage":"GROUP"}` with `$SUB1` / `$SUPER` | 403 / 200 `{filled:N}`; all group matches FINISHED | | |
| API-44 | same with `{"stage":"X"}` | 400 `INVALID_STAGE` | | |
| API-45 | `GET /api/admin/group-draft` with `$SUB1` | 403 | | |
| API-46 | `PUT /api/teams/groups` with 6 teams in Group A | 400 `INVALID_GROUPS` | | |
| API-47 | `PUT /api/teams/groups` while a match is LIVE/FINISHED | Rejected (write status/code) | | |
| API-48 | `POST /api/schedule` when one group has < 2 teams | Rejected with the group named | | |

### 5.5 Registration and admin registrations / 登録と登録管理

| ID | Request / リクエスト | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| API-49 | `GET /api/registration/status` | count 40, limit 40, deadlines, open/closed flags | | |
| API-50 | `POST /api/registration/teams` with an existing team name | 409 `DUPLICATE_TEAM` (or `DUPLICATE_CLUB`) | | |
| API-51 | `POST /api/registration/teams` with a 2 MB logo / a GIF | 400 (write code) | | |
| API-52 | `POST /api/registration/verify` wrong pair ×6 from one IP | Same error message for "wrong" and "not found"; 6th → 429 | | |
| API-53 | `POST /api/registration/verify` `sample@example.com` / `09000000000` | 200, cookie, list of 40 teams | | |
| API-54 | `POST /api/registration/members` 12 members / duplicate back number / back number −1 | 400 each, nothing saved (all-or-nothing) | | |
| API-55 | `GET /api/registration/members?teamId=<other club's team>` with that cookie | Only teams of this contact are allowed | | |
| API-56 | `GET /api/admin/registrations` with `$SUB1` / `$SUPER` | 403 / 200 with contacts | | |
| API-57 | `GET /api/admin/registrations.csv` (`$SUPER`) | `text/csv`, BOM, 1 row per player, header row as spec | | |
| API-58 | `DELETE /api/admin/registrations/teams/<team in a group>` | 409 `TEAM_IN_GROUP` | | |
| API-59 | `GET /api/registration/teams` (public) | No e-mail / phone / representative name in the response | | |
| API-60 | Announcements: create (EN 301 chars → 400), create 4 visible → `GET /api/announcements` returns newest 3; `$SUB1` create → 403 | as written | | |

---

## 6. Part 5 — UI function tests / 画面の動作テスト

Use Playwright (Chromium) on `http://localhost:5173`. Collect console errors and page errors for every case; any error is a finding (except blocked Google Fonts).
`http://localhost:5173` で Playwright（Chromium）を使う。全ケースでコンソールエラー・ページエラーを集める。エラーは指摘にする（Google Fonts の読み込み失敗は除く）。

### 6.1 Public pages / 公開ページ

| ID | Steps / 手順 | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| UI-01 | Open `/` | Redirect to `/20261220/`; yellow TEST SITE bar | | |
| UI-02 | Home before 2026-12-20 09:00 JST | Countdown, "first match at 9:00", "Favorite Team", teams strip with logos (no "THE CLUBS", no registered count), rules (no "PLAY FAIR"), info, Contact "Facebook" button (new tab), Google Maps button | | |
| UI-03 | Home: choose My team, reload | Next match and group rank shown; kept after reload | | |
| UI-04 | Set `localStorage['vc.myTeam.20261220']='NOPE'`, reload | My team resets, no crash | | |
| UI-05 | Switch to မြန်မာ, go to every page, reload | Myanmar text, `<html lang="my">`, kept after reload; names not translated | | |
| UI-06 | Matches: default | Small switches Groups off (time order), All matches off (unfinished only) and team select in one row on PC and iPhone; no "Team" label | | |
| UI-07 | Matches: Groups on, reload | Group A〜H + Knockout headers with colours; setting kept; headers collapse | | |
| UI-08 | Matches: All matches on, reload | All matches; after reload back to off (not saved) | | |
| UI-09 | Matches: choose a team | Only that team's matches | | |
| UI-10 | Click a card; press Tab to a card and Enter, then Space | Opens/closes; players ⑩ name side by side; "Match details →" link | | |
| UI-11 | Card of a match with cards (after UI-41) | Yellow/red shape (no text), team, minute, ⑩ name; hover title "Yellow card"/"Red card" | | |
| UI-12 | Match details page `/matches/<id>` | Same card, back button; QF shows scorers `⚽ 13' ⑩ name` | | |
| UI-13 | Live with one LIVE and one PAUSED match | Both shown with timer / PAUSED; Next matches per court; Live menu icon green | | |
| UI-14 | Groups page, then a group | No "Top teams go to the knockout stage"; 8 tables; full column names; green line for 1st/2nd; group page has table + matches | | |
| UI-15 | Knockout before schedule (after Initialize) | Placeholder bracket only (no "Schedule pending", no banner) | | |
| UI-16 | Knockout after QF goals | Bracket filled; final highlighted; Top scorers ranking (same goals = same rank, no Unknown, no PK) | | |
| UI-17 | Teams: click a team, press Esc; click again, press × | Dialog with logo, players ⑩ name; closes both ways; no Back button | | |
| UI-18 | Unknown URL `/20261220/xyz` | Tournament 404 page | | |
| UI-19 | Old URLs `/20261220/standings`, `/bracket`, `/info` | Go to Groups / Knockout / Home | | |
| UI-20 | Announcements on public page: dismiss one, reload | That one stays hidden on this device; others visible | | |

### 6.2 Registration / 登録

| ID | Steps / 手順 | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| UI-21 | `/registration/20261220/` when 40 teams are registered | Form hidden, "40 / 40" full message | | |
| UI-22 | (After deleting 1 test team in UI-37) register 1 team with a PNG logo | Logo preview; complete page shows the team | | |
| UI-23 | "Multiple teams" + "＋" | Extra team name fields; one logo for all | | |
| UI-24 | Submit with empty fields / bad e-mail / 2 MB logo | Errors in the current language, nothing saved | | |
| UI-25 | Verify with the contact, choose the team, add 11 members | 11 rows, name + back number side by side; success | | |
| UI-26 | Add members again to a full team | No empty rows; cannot add | | |

### 6.3 Admin / 管理画面

| ID | Steps / 手順 | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| UI-27 | `/20261220/admin`: wrong password, then right password | Error message; then dashboard | | |
| UI-28 | Sign in as `subadmin1` | Only Court 1 matches; no Seed / Reset / setup areas | | |
| UI-29 | Super Admin: tournament ID shown; Sign out | Shown; back to sign-in | | |
| UI-30 | Initialize (confirm) | Teams and matches empty; registrations kept | | |
| UI-31 | Groups: drag teams with the mouse into A〜H; tap a team → "Move here" | Moves; "Unsaved changes"; max 5 per group | | |
| UI-32 | "Reset to saved", then arrange again and "Save groups" | Reset restores; Save creates teams with club logos | | |
| UI-33 | "Generate schedule" with a group of 1 team, then with all valid | Message "Group X needs at least 2 teams"; then 95 matches; Schedule check text "95 matches, no court clashes, finishing 19:59." | | |
| UI-34 | Match select default and filters (Court, Stage, Status) | Not finished only, time order; counts change | | |
| UI-35 | Start → Pause → Resume → Finish | Buttons per status; big status + timer; after Finish the next match on the same court is selected | | |
| UI-36 | ＋/− score before start | Disabled | | |
| UI-37 | Team registrations (Super Admin): edit names, change logo, delete a team not in a group, Download CSV | Works; team in a group cannot be deleted (message) | | |
| UI-38 | Announcements: create EN+MY Warning, hide, show, delete | Public banner updates without reload | | |
| UI-39 | Tie decisions: make a tie with 🎲 or manual scores | "Tie decisions" appears; save order; standings use it | | |
| UI-40 | Yellow/Red card buttons before start / after start | Disabled / enabled, height ≥ 44px | | |
| UI-41 | Yellow card → picker | Only registered players (⑩ name); no "Unknown player"; Esc and Cancel close | | |
| UI-42 | 2nd yellow for the same player | CARDS list: Y, then ONE row with yellow+red overlapped (label "Second yellow card"); public card the same | | |
| UI-43 | Remove that 2nd yellow | Y and its R disappear in admin and on public pages without reload | | |
| UI-44 | Team with no registered players → Yellow card | Message "Cards need a registered player." | | |
| UI-45 | 🎲 Group stage → 🎲 Round of 16 (solve ties first if shown) | Results filled; teams move to R16 / QF automatically | | |
| UI-46 | QF: ＋ → Who scored? → player; Unknown; "Change"; − | Score and goal list correct; ⑩ in the list | | |
| UI-47 | QF draw → Finish | Blocked until PK winner entered; public shows "PK 4–3" | | |
| UI-48 | Change a QF result after its SF started | Error `RESULT_LOCKED` message | | |
| UI-49 | Seed knockout teams; Reset all matches (Cancel, then Yes) | Seed fills R16; Cancel does nothing; Yes resets everything incl. goals/cards | | |

### 6.4 Real time and connection / リアルタイムと接続

| ID | Steps / 手順 | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| UI-50 | Two browser contexts: admin changes score/card; public page open | Public updates within ~1 s without reload | | |
| UI-51 | Stop `npm run dev` for 15 s, start again | Offline banner, admin buttons disabled, last data stays; reconnects and syncs | | |
| UI-52 | Two admins (`superadmin`, `subadmin1`) press ＋ on the same match quickly | Final score = number of presses; no lost update | | |

### 6.5 Accessibility / アクセシビリティ

| ID | Steps / 手順 | Expected / 期待結果 | Result | Note |
|---|---|---|---|---|
| UI-53 | Keyboard only: menu, Matches cards, pickers, dialogs | All reachable; visible focus; Esc closes | | |
| UI-54 | Run axe (e.g. `@axe-core/playwright`, in a scratch folder) on Home, Matches (card open), Groups, Knockout, Teams dialog, Admin dashboard | Write serious/critical violations | | |
| UI-55 | Each page has one hidden `h1` | `document.querySelectorAll('h1').length === 1` | | |

---

## 7. Part 6 — UI layout / 画面の見た目

Do each case on **PC, iPad-P, iPad-L, iPhone** (1.5). Take a screenshot of each page per size.
各ケースを **PC・iPad-P・iPad-L・iPhone** で行う（1.5）。ページごと・サイズごとにスクリーンショットを撮る。

Check script idea / 確認の例:

```js
// no horizontal scroll / 横スクロールなし
await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
// small tap targets on phones / スマホの小さいボタン
await page.evaluate(() => [...document.querySelectorAll('button,a,select,input,[role=button]')]
  .filter(e => e.offsetParent && e.getBoundingClientRect().height < 44)
  .map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)));
```

| ID | Page / ページ | Check / 確認 | PC | iPad-P | iPad-L | iPhone | Note |
|---|---|---|---|---|---|---|---|
| RS-01 | All pages | No horizontal page scroll / ページの横スクロールなし | | | | | |
| RS-02 | All pages (phone) | Buttons, links, selects ≥ 44px tall (list the ones that are not) / 44px 未満を挙げる | | | | | |
| RS-03 | Header | Title and buttons do not overlap; ☰ at ≤ 900px | | | | | |
| RS-04 | PC menu | Left menu stays fixed while scrolling | | | | | |
| RS-05 | Phone menu | Bottom menu 5 items, Live in the middle, does not cover content at the bottom | | | | | |
| RS-06 | Matches | Card: PC logo+name side by side, phone (< 768px) name under logo; long team names wrap, no overflow | | | | | |
| RS-07 | Matches (card open) | Players in 2 columns; ⑩ circles same size for 1 and 2 digits; card shapes aligned | | | | | |
| RS-08 | Groups | Table scrolls inside (≤ 700px), rank/team columns fixed; 2 columns at ≥ 1600px (PC-wide) | | | | | |
| RS-09 | Knockout | Bracket readable; spacing between R16 cards incl. PK line | | | | | |
| RS-10 | Teams dialog | Fits the screen, scrolls inside, × reachable | | | | | |
| RS-11 | Registration form + members | Inputs full width on phone; 11 rows name + number side by side | | | | | |
| RS-12 | Admin dashboard (iPad is the main admin device) | Controls fit; score buttons, card buttons ≥ 44px; pickers fit; CARDS/GOALS lists readable | | | | | |
| RS-13 | Admin groups drag & drop (iPad) | Drag by finger works (`page.touchscreen` or manual note) | | | | | |
| RS-14 | Myanmar language | Longer Myanmar text does not break layouts | | | | | |
| RS-15 | Phone side padding | 16px left/right on phone pages | | | | | |

---

## 8. Report / 報告

Create **`docs/テスト書/エージェントテスト結果_<YYYY-MM-DD>.md`** with this structure. Put screenshots in `docs/テスト書/images/<YYYY-MM-DD>/agent/`.
**`docs/テスト書/エージェントテスト結果_<YYYY-MM-DD>.md`** をこの形で作る。スクリーンショットは `docs/テスト書/images/<YYYY-MM-DD>/agent/`。

```markdown
# Agent Test Result / エージェントテスト結果 (YYYY-MM-DD)

- Commit: <hash>
- Agent / model: <name>
- Environment: OS, Node version, browser version

## Summary / まとめ
| Part | Cases | OK | NG | Skip | N/A |
|---|---|---|---|---|---|
| AT | | | | | |
| CR | | | | | |
| SP | | | | | |
| API | | | | | |
| UI | | | | | |
| RS | | | | | |

## Findings / 指摘（重大度の高い順）
### F-01 [High|Medium|Low] <short title / 短いタイトル>
- Case: <ID>
- Where / 場所: <file:line or URL + viewport>
- What happens / 起きること:
- Expected / 期待:
- Steps to reproduce / 再現手順:
- Evidence / 証拠: <screenshot path, response body without secrets>
- Suggested fix / 直し方の案:

## Spec questions / 仕様の確認事項
- <SP-xx> ...

## Case results / ケースごとの結果
(copy the tables of parts 1–6 with Result and Note filled in / 1〜6章の表を結果・メモ入りで貼る)
```

Write the report in **English and Japanese** (same as this plan). Keep each finding short and concrete. Do not include passwords, cookie values or `SESSION_SECRET`.
報告は本書と同じく**英語と日本語**で書く。指摘は短く具体的に。パスワード・Cookie の値・`SESSION_SECRET` は書かない。

When finished, stop `npm run dev`. Do not delete `.wrangler/state` (the owner may want to look at the data).
終わったら `npm run dev` を止める。`.wrangler/state` は消さない（オーナーがデータを見るかもしれない）。
