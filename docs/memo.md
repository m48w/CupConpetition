# 開発メモ

## 目的

Velocity Cup 2026 の大会運営画面を、ブラウザーから確認・操作できる形で構築した。

## 最新更新（2026-10-11）

- 同じクラブから複数チームを参加させる場合、登録フォームのチェックボックスと「＋」ボタンでチーム名を追加し、一度に申請できるようにした。複数チーム申請は全件をまとめて登録する。
- チーム申請時のクラブロゴを必須に変更。PNG・JPEG・WebP、最大1 MBで、画像プレビューを表示する。クラブ内のチームで共有し、既存ロゴの変更はSuper Adminに限定。
- 登録フォームをスマートフォン画面に対応。
- 分割されていた登録仕様とURL仕様を `docs/仕様書.md` に統合。
- 確認：`npm test`（136件）、`npm run typecheck`、`npm run lint`、`npm run format:check`、`npm run build` 成功。

## 最新更新（2026-10-10）

- チーム登録仕様に基づき、クラブ・大会参加チームとメンバーをSQLiteへ保存する独立した登録機能を実装。
- `/registration/20261220/` にチーム登録、連絡先照合、対象チーム選択、最大11名のメンバー追加、完了画面を追加。
- 本人確認はメールアドレスと電話番号の両方をサーバー照合し、IP単位15分5回制限・HttpOnly Cookie・1時間セッションを適用。JSTの2026-12-12 23:59:59までの登録期限もサーバー側で判定。
- 同じクラブの複数チームと連絡先共有、チーム間の背番号再利用、同一チーム内の背番号重複防止に対応。
- Super Admin専用登録管理画面でクラブ・代表者・メンバーを閲覧し、PNG/JPEG/WebP（最大1 MB）のクラブ共通ロゴを管理可能にした。
- 初回チーム登録フォームにクラブロゴの任意アップロードを追加。後続チームで同じクラブ名を使えばロゴが共有され、既存ロゴは置き換えず、変更はSuper Adminに限定。
- 同じクラブの複数チーム登録方法を画面内に案内し、登録完了画面からクラブ名を引き継いで別チームを追加登録できるようにした。
- 登録フォームの直接アクセス、初回ロゴ付き登録、同クラブ名を引き継いだ2チーム目の登録をブラウザーで確認。
- 確認: `npm test`（136件）、`npm run typecheck`、`npm run lint`、`npm run format:check`、`npm run build` 成功。
- WranglerのローカルWorkerを `http://127.0.0.1:5173/` で起動。大会ページ、登録ページ、Worker APIの疎通を確認。
- 受付データは固定の40チーム・試合表から分離し、登録直後に試合枠へ反映しない。仕様書、README、日報を更新。

## 最新更新（2026-10-08）

- 大会アプリの公開URLを `/20261220/` 配下に統一。サイトルート `/` は404とし、`/20261220` は末尾スラッシュ付きURLへ転送。
- Worker が `/20261220/` 配下の画面・静的アセットを配信できるようにし、アセット要求から大会URLのprefixを除去。
- Teams、Groups、試合詳細などの公開ルートと、管理ログイン・ダッシュボード・互換URLを追加。未実装の管理URLは認証後に大会用404を表示。
- `README.md` と `docs/仕様書.md` を現行URL・画面構成に合わせて更新。

## 最新更新（2026-10-04）

- ヘッダー左に添付されたVelocity FCロゴ、中央に「VELOCITY CUP 2026」を表示。「LIVE EVENT」と旧開催日表示は削除。
- Overviewの旧紹介・ライブ試合・直近スケジュールを削除し、2026-12-20（日）のカウントダウン、参加チームの横並びロゴ一覧、大会ルール欄に置き換え。
- チームロゴ素材が未登録の場合はチーム色と頭文字のバッジで代替。大会ルール本文は主催者から後日受領予定。
- 全試合の開始日時を2026-12-20に変更。既存のSQLiteに保存済みの2026-09-26の試合データも一度だけ日付を移すマイグレーションを追加し、試合時刻・状態・スコアは維持する。

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

ブラウザー確認URL（大会ルート）:

- `http://localhost:4173/20261220/`
- `http://localhost:4173/20261220/matches`
- `http://localhost:4173/20261220/live`
- `http://localhost:4173/20261220/knockout`
- `http://localhost:4173/20261220/admin`

## 注意事項

- 認証はサーバー側で行う。パスワードは Cloudflare の Secrets（`SUPERADMIN_PASSWORD`・`SUBADMIN_PASSWORD`・`SESSION_SECRET`）で管理し、ログインに成功すると署名付きの `session` Cookie を発行する。
- 試合・チーム・ロゴのデータは Durable Object の SQLite に保存する。ローカルでは `.wrangler/state/` 以下に置かれる。旧 `TempServerData/matches.json` は削除済み。
- 複数端末間の同期は Durable Object からの WebSocket 配信で実現済み。認証もサーバー側に実装済みである。
- データを初期状態に戻すには、管理ダッシュボード（`/20261220/admin/dashboard`）の「↺ Reset all matches」ボタンを使うのが通常の方法である。プログラムから行う場合は Super-admin として `POST /api/reset` を呼ぶ。

## 次の候補

- 操作履歴・監査ログ。
- 試合結果に応じたノックアウトチームの自動反映。
- オンライン受付チームを既存の40試合枠へ割り当てる管理機能（運用方法の確定後）。
- 試合時間、コート数を管理画面から編集可能にする。
