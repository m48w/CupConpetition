# 開発メモ

## 目的

Velocity Cup 2026 の大会運営画面を、ブラウザーから確認・操作できる形で構築した。

## 最新更新（2026-09-29）

- `TempServerData/matches.json` を削除。試合データの正本は引き続き Durable Object の SQLite。
- SQLite に `teams` と `logos` テーブルを追加。初回作成時に既存の40チームを登録し、チーム行からロゴIDを参照できるようにした。
- `/api/state` と WebSocket の state にチーム情報を含め、各画面で共通のチームデータを使用する。
- チーム表示は、ロゴIDがある場合に `/api/logos/:id` から取得した画像をチーム名の左側に表示する。画像がない、または取得できない場合はチーム色と頭文字のバッジにフォールバックする。
- Matches、Live、Standings、Bracket、管理画面のチーム表示にロゴ表示を適用。
- ロゴ画像の取得 API は実装済み。チーム登録・ロゴのアップロード・更新を行う管理画面/APIは未実装。
- 確認: `npm test`（122件）、`npm run build`、`npm run lint`、`npm run format:check` 成功。SQLite ストア/API の対象テスト34件も成功。
- 開発サーバーの起動確認では、Vite 起動後に外付けボリューム `/Volumes/External-SS` への書き込みが `EACCES` となり、ローカル Workers runtime が停止する事象を確認。起動時の作業ディレクトリ消失（`uv_cwd`）とは別問題で、外付けボリューム上での解決策は未確認。

## ここまでに実装した内容

- React + TypeScript + Vite による大会運営Webアプリを構築。
- ブランド名を `CUPFLOW` から `VELOCITY CUP 2026` に変更。
- Overview、Matches、Live、Standings、Bracket の各画面を実装。
- グループステージの全80試合を一覧表示。
- 試合一覧を以下の条件で絞り込み可能にした。
  - Round
  - Team
  - Group A〜H
  - Court 1〜3
- Live画面のNext MatchesをCourtごとに1試合表示。
- Round of 16、Quarter-finals、Semi-finals、Final のトーナメントブラケットを表示。
- ブラケットをワールドカップ風の青系・ゴールド基調のデザインに変更。
- 管理者ログイン画面を追加。
  - デモ用アクセスキー: `VELOCITY-DEMO-ONLY`（→ `/superadmin`・`/subadmin` でのサーバー側ログインに置き換え済み。現在は非該当）
  - `/admin/setup` への直接アクセスも認証対象。（→ `/superadmin` へのリダイレクトに置き換え済み。現在は非該当）
- 管理画面から試合を操作可能にした。
  - Start / resume
  - Pause
  - Finish
  - ホーム・アウェイのスコア増減
- 試合データをlocalStorageへ保存。（後にサーバー保存へ移行。現在は Durable Object の SQLite を使用）
- 別タブ・別画面でlocalStorageの更新を検知し、試合状態を同期。（後にサーバー配信へ移行。現在は WebSocket で同期）
- グループ試合をCourt 1〜3へ分散。
- React RouterのFuture Flag warningを抑制。
- 試合データの保存先をlocalStorageから `TempServerData/matches.json` へ移行。（後に Cloudflare Durable Object の SQLite へ再移行。2026-09-29 に旧 JSON ファイルを削除）
- Vite開発サーバーにAPIミドルウェアを追加し、SSE（1行JSON）で複数端末へ即時配信。（後に Cloudflare Worker と WebSocket へ移行）
- 全95試合を未開始状態で初期生成するように変更。
- スケジュールを再設計し、コート二重予約15件を解消。09:00〜19:03に短縮（従来は翌日00:15終了）。
- PATCHのエラー応答に `code`（`UNKNOWN_MATCH` / `FIELD_NOT_PATCHABLE`）を追加し、クライアント側で種別判定できるようにした。
- 管理画面に「↺ Reset all matches」ボタンを追加し、確認操作を挟んで全試合をリセットできるようにした。
- 管理画面のSchedule checkを実際のコート重複判定・終了時刻計算に置き換え（従来は固定文言の `0 conflicts detected` 表示だった）。
- vitestを導入し、スケジュール制約とファイルストア・APIをテストで担保（導入当時4ファイル・計35件。現在は Durable Object の SQLite・Worker API を含む）。

## 主な確認内容

- `npm run build` 成功。
- ブラウザーで試合一覧を確認。
- 全95試合の表示を確認。
- Group / Courtフィルターの表示を確認。
- Live画面でCourtごとのNext Matchesを確認。
- ブラウザーで管理者ログインと管理画面を確認。

## 開発サーバー

プロジェクトディレクトリで以下を実行する。

```bash
export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"
npm run dev -- --host 0.0.0.0 --port 4173
```

ブラウザー確認URL:

- `http://localhost:4173/`
- `http://localhost:4173/matches`
- `http://localhost:4173/live`
- `http://localhost:4173/bracket`
- `http://localhost:4173/superadmin`
- `http://localhost:4173/subadmin`

## 注意事項

- 認証はサーバー側で行う。パスワードは Cloudflare の Secrets（`SUPERADMIN_PASSWORD`・`SUBADMIN_PASSWORD`・`SESSION_SECRET`）で管理し、ログインに成功すると署名付きの `session` Cookie を発行する。
- 試合・チーム・ロゴのデータは Durable Object の SQLite に保存する。ローカルでは `.wrangler/state/` 以下に置かれる。旧 `TempServerData/matches.json` は削除済み。
- 複数端末間の同期は Durable Object からの WebSocket 配信で実現済み。認証もサーバー側に実装済みである。
- データを初期状態に戻すには、Super-admin画面（`/superadmin`）の「↺ Reset all matches」ボタンを使うのが通常の方法である。プログラムから行う場合は Super-admin として `POST /api/reset` を呼ぶ。

## 次の候補

- 操作履歴・監査ログ。
- 試合結果に応じたノックアウトチームの自動反映。
- チーム登録・チーム名編集・ロゴ画像アップロードの画面/APIを追加する（SQLite のチーム・ロゴテーブルとロゴ取得 API は用意済み）。
- 試合時間、コート数を管理画面から編集可能にする。
