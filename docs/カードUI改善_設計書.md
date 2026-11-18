# 設計書: 試合カードの統一・Matches の切り替え・Groups の色・管理画面の次の試合

- **文書バージョン**: 1.0.0（確定・実装済み）
- **作成日**: 2026-11-18
- **関連文書**: `docs/カードUI改善_仕様書.md`

---

## 1. 方針

- サーバーは変えない。画面（`src/`）だけ。
- 試合カードは `FixtureCard` 1つにまとめ、`MatchCard` は消す。

## 2. FixtureCard（`src/features/tournament/components/FixtureCard.tsx`）

- `open`・`onToggle` を渡さないときは、カードの中で開閉の状態を持つ（Home・Live などで使う）。`defaultOpen`（今は使っていない）と `showLink`（詳細ページでは false）も受け取る。
- 選手は `useFixturePlayers()`（新規、`src/features/tournament/hooks/useFixturePlayers.ts`）で取る。`useRegisteredTeams` は**1回だけ通信する**ように、結果をモジュールの中で共有する（カードが多くても `/api/registration/teams` は1回）。
- ゴールは `useGoals()` から、その試合の分だけ取る（`goals` を渡さなくてよい）。
- 真ん中は状態ごとに出し分ける（仕様書 2.2）。アウェイは `fixture-team away`（`flex-direction: row-reverse`）。

置き換える場所:

| ファイル | 今 | 変更 |
|---|---|---|
| `src/pages/Overview.tsx` | `MatchCard`（試合中） | `FixtureCard` |
| `src/features/tournament/components/MyTeamCard.tsx` | `MatchCard compact` | `FixtureCard` |
| `src/pages/Live.tsx` | `MatchCard showScorers` | `FixtureCard` |
| `src/pages/MatchDetail.tsx` | `MatchCard showScorers` | `FixtureCard defaultOpen` |
| `src/pages/Teams.tsx`（TeamDetail） | `MatchCard compact` | `FixtureCard` |
| `src/pages/Groups.tsx`（GroupDetail） | `MatchCard` | `FixtureCard` |

- 試合中の得点者（⚽ 13' #10 名前）は今 `MatchCard` の下に出している。Details の中の ⚽ に一本化する。

## 3. Matches（`src/pages/Matches.tsx`・`fixtures.ts`）

- `const [scope, setScope] = useState<"upcoming" | "all">("upcoming")`。
- `fixtures.ts` に `filterUpcoming(matches)`（`status !== "FINISHED"`）を足してテストする。
- ［Group］の見出しに `data-group` を付け、色は CSS 変数 `--group-bg`・`--group-fg` で出す。Knockout は黒。
- スマホでは `[Upcoming|All matches]` と `[Group|Time]` を1行に並べ、チーム選択を下の行にする。

## 4. Groups

### 4.1 ページ全体の横スクロール（原因と直し方）

- 原因: `.standings-grid` が `grid-template-columns: 1fr` で、グリッドの子（表のカード）は中身の最小幅（スマホでは表の行の幅 約520px）より小さくなれない。そのため表のカードが画面より広がり、ページ全体が横にスクロールする。
- 直し方: `grid-template-columns: minmax(0, 1fr)`、`.table-card` と `.standings-scroll` に `min-width: 0; max-width: 100%`。グループの詳細ページの並びも同じように直す。

### 4.2 1位・2位の緑の線・見出しの色

- `StandingsTable` の行に `qualifies`（index < 2）を付け、順位のセルに `box-shadow: inset 3px 0 0 var(--live)`。
- 見出し（`.table-title`）に `data-group={groupId}`。`[data-group="A"] { --group-bg; --group-fg }` …（薄い背景・濃い文字）。グループの詳細ページの表にも見出しを付けた。
- `.standings-grid` は `minmax(0, 1fr)` の1列（1600px以上は2列）。

## 5. 管理画面（`src/pages/AdminSetup.tsx`）

- `nextMatchOnCourt(matches, finished)` を `src/features/admin/nextMatch.ts`（新規・テストあり）に作る。
- 「■ Finish match」のときに `updateMatch` を呼んだあと、`setSelectedId(next.id)`。

## 6. テスト

| 種類 | 内容 |
|---|---|
| 単体 | `filterUpcoming`、`nextMatchOnCourt`（同じコート・後の時間・無ければ一番早い・終わった試合は選ばない） |
| 画面 | PC・iPhone で全カードの見た目（始まる前・試合中・終了・PK）、Details、Upcoming/All、Groups のページが横スクロールしない（320〜700px）・表の中だけスクロール・緑の線・8色、管理画面で Finish → 次の試合 |
| 相互テスト書 | J・K・M・I・L を直す |
