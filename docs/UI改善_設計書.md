# 設計書: UI改善（白黒のデザイン・Matches のカード・各画面の調整）

- **文書バージョン**: 0.1.0（レビュー待ち）
- **作成日**: 2026-11-16
- **関連文書**: `docs/UI改善_仕様書.md`（何を作るか）

---

## 1. 方針

- サーバー（Worker・API・データ）は変えない。画面（`src/`）だけを変える。
- 色は CSS 変数にまとめてから白黒に置き換える。今の `src/styles.css` は約3,000行で、色が直接 約240か所に書いてある。

## 2. 色（`src/styles.css`）

### 2.1 変数

`:root` に Matchday XI と同じ考え方の変数を置く。

```css
:root {
  --bg: #f6f6f3;          /* ページの背景 */
  --surface: #ffffff;     /* カード・ヘッダー */
  --subtle: #fafaf8;      /* 選手一覧などの薄い面 */
  --line: #e5e5e0;        /* 区切り線 */
  --line-strong: #d0d0c8;
  --text: #111827;
  --text-2: #52525b;
  --muted: #71717a;
  --ink: #111111;         /* 黒いボタン・選択中 */
  --live: #15803d;        /* 緑: LIVE */
  --danger: #b91c1c;      /* 赤 */
  --warn: #b45309;        /* 黄（文字用） */
  --warn-bg: #fef3c7;
}
```

### 2.2 置き換え

- 直接書いてある色（`#101827`、`#e8edf6`、`rgba(...)` など）を、上の変数に置き換える。暗い背景のグラデーション・影は消す。
- フォントは今のまま（Space Grotesk・DM Mono・Noto Sans Myanmar）。
- `index.html` の `theme-color` と `public/manifest.webmanifest` の `background_color`・`theme_color` を `#ffffff` にする。
- チーム色のバッジ（`TeamBadge` の `style={{ background }}`）はそのまま。

## 3. 共通

| ファイル | 変更 |
|---|---|
| `src/App.tsx` | 左メニューの `.mini-event`（大会名・チーム数・試合数）を消す。フッターを `Copyright © 2026 M48W` だけにする。Live のメニューに `has-live` クラス（`matches.some(isOnPitch)`）を付ける |
| `src/pages/Registration.tsx` | フッターを同じ文にする |
| `src/i18n/messages.ts` | `app.footer`・`reg.footer` を消す（使わなくなる）。フッターは翻訳しない固定文 |
| `src/styles.css` | `.nav-item.has-live span`・`.bottom-nav a.has-live span` を緑 |

## 4. Home（`src/pages/Overview.tsx`）

- `getCountdown(now).started` が true のときは、カウントダウンの `<section>` を描かない。

## 5. Matches

### 5.1 ファイル

| ファイル | 変更 |
|---|---|
| `src/pages/Matches.tsx` | 作り直す。並び替えボタン・チーム選択・一覧（Group / Time） |
| `src/features/tournament/components/FixtureCard.tsx`（新規） | Matchday XI 形のカード。Details の開閉 |
| `src/features/tournament/components/FixturePlayers.tsx`（新規） | Details の中身（両チームの選手） |
| `src/features/tournament/fixtures.ts`（新規） | 並び替え・グループ分けの純粋な関数（`sortByTime`、`groupByGroup`） |
| `src/features/registration/useRegisteredTeams.ts`（新規） | `GET /api/registration/teams` を1回だけ読んで、登録チームID → 選手 の表を返す（Teams 画面と共通にする） |

- 既存の `MatchCard` は Home・Live・試合の詳細で使っているので残す。

### 5.2 状態

```ts
type SortMode = "group" | "time";
const [sort, setSort] = useState<SortMode>(...);          // localStorage "vc.matches.sort"
const [teamId, setTeamId] = useState<string>("ALL");       // localStorage "vc.matches.team"、無ければマイチーム
const [collapsed, setCollapsed] = useState<Set<string>>(); // 折りたたんだグループ
const [openIds, setOpenIds] = useState<Set<string>>();     // Details を開いた試合（並び替え・絞り込みを変えても残す）
```

- `localStorage` は try/catch で読み書きし、使えなくても動くようにする。
- 保存したチームが今のチーム一覧に無ければ「ALL」に戻す。

### 5.3 Details の選手

- 試合用チームの `registrationTeamId` から、登録チームの選手（`#背番号 名前`）を引く。
- 準々決勝からは `useGoals()` で、その試合のゴールを選手ごとに数えて ⚽ を付ける。

### 5.4 アクセシビリティ

- Details は `<button aria-expanded aria-controls>`。グループの見出しも `<button aria-expanded>`。
- カード全体のクリックでも開くが、キーボードは Details のボタンで操作する。
- ボタン・ドロップダウンは高さ44px以上。

## 6. Groups（`StandingsTable.tsx`・`styles.css`）

- スマホのときに `.standings-wide` を隠すのをやめる。
- 表を `overflow-x: auto` の箱に入れ、チーム名の列を `position: sticky; left: 0` にする。数字の列は 36px ほどの固定幅。

## 7. Knockout（`styles.css`）

- R16 の1枠の高さ（今 116px）を広げ、`.bracket-slot` に上下の余白（8px）を付ける。PK の行があるカードでも重ならない高さにする。線（`::before`・`::after`）の位置はそのまま使えることを確認する。

## 8. Teams（`src/pages/Teams.tsx`）

- ダイアログの「Back」ボタンを消す。

## 9. 管理画面（`src/features/admin/components/MatchPicker.tsx`）

- Status の選択肢に `unfinished`（Not finished）を加え、初期値にする。`status !== "FINISHED"` の試合だけ。
- 選んでいる試合が条件に合わなくてもリストに残す、今の動きはそのまま（終わらせた直後もその試合が見える）。

## 10. テスト

| 種類 | 内容 |
|---|---|
| 単体（vitest） | `fixtures.ts`（時間の順・同じ時間はコートの順・グループごと・決勝トーナメントは最後・チームの絞り込み）、`MatchPicker` の Not finished |
| 画面（ブラウザー） | PC・iPad・iPhone で全ページを確認（白黒・文字が読めるか・横スクロールなし・44px）。Matches の並び替え・折りたたみ・Details・チーム選択。Live アイコン。Groups のスマホ全項目。Knockout の R16 の間。Teams の Back なし。管理画面の Not finished |
| 相互テスト書 | `docs/テスト書/相互テスト書_TestCases.md` の J（Matches）・A・E・M・N・K を新しい画面に合わせて直す |

## 11. リスク

| リスク | 対策 |
|---|---|
| 色の置き換え漏れで、白い背景に白い文字が残る | 置き換えたあと、全ページ・全端末のスクリーンショットで確認する。`styles.css` に暗い色が残っていないか検索する |
| Matches の作り直しで、相互テストの J のケースが変わる | テスト書も同時に直す |
| 黒いロゴ画像が白い背景で浮く | ロゴの周りに余白と角丸を付けて、カードのように見せる |
