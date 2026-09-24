# 開発メモ

## 目的

Velocity Cup 2026 の大会運営画面を、ブラウザーから確認・操作できる形で構築した。

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
  - デモ用アクセスキー: `VELOCITY-DEMO-ONLY`
  - `/admin/setup` への直接アクセスも認証対象。
- 管理画面から試合を操作可能にした。
  - Start / resume
  - Pause
  - Finish
  - ホーム・アウェイのスコア増減
- 試合データをlocalStorageへ保存。（→ 後述のとおり `TempServerData/matches.json` への移行で置き換え済み。現在は非該当）
- 別タブ・別画面でlocalStorageの更新を検知し、試合状態を同期。（→ 同上。現在はSSEで同期しており非該当）
- グループ試合をCourt 1〜3へ分散。
- React RouterのFuture Flag warningを抑制。
- 試合データの保存先をlocalStorageから `TempServerData/matches.json` へ移行。
- Vite開発サーバーにAPIミドルウェアを追加し、SSE（1行JSON）で複数端末へ即時配信。
- 全95試合を未開始状態で初期生成するように変更。
- スケジュールを再設計し、コート二重予約15件を解消。09:00〜19:03に短縮（従来は翌日00:15終了）。
- PATCHのエラー応答に `code`（`UNKNOWN_MATCH` / `FIELD_NOT_PATCHABLE`）を追加し、クライアント側で種別判定できるようにした。
- 管理画面に「↺ Reset all matches」ボタンを追加し、確認操作を挟んで全試合をリセットできるようにした。
- 管理画面のSchedule checkを実際のコート重複判定・終了時刻計算に置き換え（従来は固定文言の `0 conflicts detected` 表示だった）。
- vitestを導入し、スケジュール制約とファイルストア・APIをテストで担保（4ファイル・計35件）。

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
- `http://localhost:4173/admin/setup`

## 注意事項

- 現在の認証はフロントエンド内の簡易認証であり、本番用の安全な認証ではない。公開用コードではデモ専用キーを使用している。
- 試合データは `TempServerData/matches.json` に保存する。開発サーバーが起動している間だけ読み書きできる。
- 複数端末間の同期はSSEで実現済みだが、認証のサーバー側実装や永続化されたDBなど、本番運用に必要な要素は未整備。
- データを初期状態に戻すには、管理画面（`/admin/setup`）の「↺ Reset all matches」ボタンを使うのが通常の方法である。プログラムから行う場合は `POST /api/reset` を呼ぶ。手動での復旧がどうしても必要な場合に限り、`TempServerData/matches.json` を削除して開発サーバーを再起動する。

## 次の候補

- 永続化されたデータベースへの移行（現在はJSONファイル保存）。
- 管理者権限のサーバー側認証。
- 操作履歴・監査ログ。
- 試合結果に応じたノックアウトチームの自動反映。
- チーム名、ロゴ、試合時間、コート数を管理画面から編集可能にする。
