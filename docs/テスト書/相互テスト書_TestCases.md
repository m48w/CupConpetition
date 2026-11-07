# Velocity Cup 2026 — Cross Test Cases / 相互テスト書

- **Version / 版**: 1.0.0
- **Date / 作成日**: 2026-11-07
- **Target / 対象**: Velocity Cup 2026 web app (public pages, team & player registration, admin console) / 大会Webアプリ（公開ページ・チーム登録・選手登録・管理画面）
- **Related / 関連文書**: `docs/仕様書.md`, `docs/試合進行_仕様書.md`, `docs/得点者_仕様書.md`, `docs/グループ分け_仕様書.md`

---

## 0. Before you start / はじめに

| No. | EN | JA |
|---|---|---|
| 0-1 | Test only on the **test site**. Never use the production site. | **テスト環境だけ**で行う。本番のサイトは使わない。 |
| 0-2 | The yellow bar "TEST SITE — for testing only. Data will be deleted." must be at the top. If it is not there, stop and contact the organiser. | 画面の一番上に黄色い帯「TEST SITE — for testing only. Data will be deleted.」が出ていること。出ていなければ止めて、担当者に連絡する。 |
| 0-3 | **Do not enter real personal data.** Use made-up names, `@example.com` e-mails and numbers like `09000000001`. | **本物の個人情報は入れない。** 名前は架空、メールは `@example.com`、電話番号は `09000000001` のような番号を使う。 |
| 0-4 | Admin passwords are **not** written in this document. The organiser gives them to you separately. Do not share them in chat, e-mail or screenshots. | Admin のパスワードは本書に書かない。担当者から別に受け取る。チャット・メール・スクリーンショットで共有しない。 |
| 0-5 | Everyone shares one test site. **Initialize**, **Save groups**, **Generate schedule**, **Reset all matches** and the **🎲 test buttons** change data for everyone. Run them only in the phase where this document says so, and tell the other testers first. | テスト環境は全員で共有している。**Initialize**・**Save groups**・**Generate schedule**・**Reset all matches**・**🎲 のテストボタン**は全員のデータを変える。本書で指定したフェーズでだけ行い、先にほかのテスターに知らせる。 |
| 0-6 | Write the result in the **Result / 結果** column: `OK`, `NG` (failed), or `Skip` (could not test, write why in the note). | **Result / 結果** 欄に `OK`・`NG`（失敗）・`Skip`（できなかった。理由をメモに書く）を書く。 |
| 0-7 | For every `NG`, fill in a bug report (section 6) with a screenshot or a screen recording. | `NG` のときは、スクリーンショットか画面録画を付けて、不具合報告（6章）を書く。 |

## 1. Test environment / テスト環境

| Item / 項目 | Value / 値 |
|---|---|
| Tournament site / 大会サイト | `https://velocity-cup-staging.komyat-8mk.workers.dev/20261220/` |
| Team registration / チーム登録 | `https://velocity-cup-staging.komyat-8mk.workers.dev/registration/20261220/` |
| Admin sign-in / 管理者ログイン | `https://velocity-cup-staging.komyat-8mk.workers.dev/20261220/admin` |
| Registration limits / 登録の制限 | **Off on the test site.** The 40-team limit and the deadlines are not checked here (production only). / **テスト環境では無効。** 40チームの定員と締め切りは確認しない（本番だけ）。 |

### 1.1 Devices and browsers / 端末とブラウザー

Test each section on at least one device in the table. Write the device in the note. / 各章を、下の表の端末のどれか1つ以上で行う。メモ欄に端末を書く。

| Code | Device / 端末 | Browser / ブラウザー |
|---|---|---|
| PC | Windows or Mac (width 1280px or more) / Windows か Mac（幅1280px以上） | Chrome, Edge, Safari |
| iPad | iPad (portrait and landscape) / iPad（縦・横） | Safari |
| iPhone | iPhone | Safari |
| Android | Android phone / Android スマホ | Chrome |

### 1.2 Accounts / アカウント

| Username / ユーザー名 | Role / 役割 | Court / 担当コート |
|---|---|---|
| `superadmin` | Super Admin | All / 全コート |
| `subadmin1`, `subadmin2` | Sub Admin | Court 1 |
| `subadmin3`, `subadmin4` | Sub Admin | Court 2 |
| `subadmin5`, `subadmin6` | Sub Admin | Court 3 |

## 2. Test phases / テストの順番

Run the phases in this order. Phases 3–5 depend on the data made in earlier phases. / この順番で行う。フェーズ3〜5は、前のフェーズで作ったデータを使う。

| Phase / フェーズ | Sections / 章 | Who / だれが | Data changes / データの変更 |
|---|---|---|---|
| 1 | A, B, C, D, E | All testers / 全員 | Each tester registers their own test team. / 各自テストチームを登録する |
| 2 | F, G | Super Admin tester + Sub Admin testers / Super Admin 担当と Sub Admin 担当 | Edits registrations / 登録データを編集する |
| 3 | H | **Super Admin tester only** / **Super Admin 担当だけ** | Makes groups and the schedule / グループと試合を作る |
| 4 | I, J, K, L, M, N, O | All testers (admin cases: assigned testers) / 全員（管理画面のケースは担当者） | Plays matches / 試合を進める |
| 5 | P, Q, R, S, T, U | Assigned testers / 担当者 | Random results, reset / ランダム結果・リセット |

---

## 3. Public site / 公開ページ

### A. Common layout and navigation / 共通の画面とメニュー

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| A-01 | Open the tournament site URL.<br>大会サイトの URL を開く。 | Home opens. The yellow TEST SITE bar, the Velocity FC logo and "VELOCITY CUP 2026" are shown.<br>Home が開く。黄色の TEST SITE の帯、Velocity FC のロゴ、「VELOCITY CUP 2026」が出る。 | All | | |
| A-02 | Open the site root `https://velocity-cup-staging.komyat-8mk.workers.dev/`.<br>サイトのルート（`/`）を開く。 | You are moved to `/20261220/`.<br>`/20261220/` に移動する。 | PC | | |
| A-03 | (PC) Click each item in the left menu: Home, Matches, Live, Groups, Knockout, Teams.<br>（PC）左のメニューを順に押す。 | Each page opens. The pressed item is highlighted. The address bar shows a normal URL such as `/20261220/matches`.<br>各ページが開く。押した項目が強調される。アドレスバーは `/20261220/matches` のような普通の URL。 | PC | | |
| A-04 | (Phone/iPad) Check the bottom menu.<br>（スマホ・iPad）下のメニューを見る。 | 5 items in this order: Home, Matches, **Live (centre)**, Groups, Knockout. Each opens its page.<br>Home・Matches・**Live（真ん中）**・Groups・Knockout の5つ。押すとそのページが開く。 | iPhone, Android, iPad | | |
| A-05 | (Phone/iPad) Tap ☰ at the top right.<br>（スマホ・iPad）右上の ☰ を押す。 | A menu opens with "Register", the language switch (EN / မြန်မာ) and "Add to home screen".<br>メニューが開き、「Register」・言語切り替え・「Add to home screen」がある。 | iPhone, Android, iPad | | |
| A-06 | Open ☰, then close it by: tapping outside, moving to another page, and (PC keyboard) pressing Esc.<br>☰ を開き、外をタップ・別ページへ移動・（キーボード）Esc で閉じる。 | The menu closes each time.<br>どの方法でもメニューが閉じる。 | iPhone, iPad | | |
| A-07 | Rotate the iPad / make the PC window narrow (about 400px).<br>iPad を回す／PC のウィンドウを狭く（約400px）する。 | The title and the buttons never overlap. No sideways scrolling of the whole page.<br>タイトルとボタンが重ならない。ページ全体が横にスクロールしない。 | iPad, PC | | |
| A-08 | Open `/20261220/this-page-does-not-exist`.<br>存在しない URL を開く。 | The tournament 404 page is shown (not a blank page).<br>大会の 404 ページが出る（真っ白にならない）。 | PC | | |
| A-09 | Open `/20261220/info` and `/20261220/standings`.<br>`/20261220/info` と `/20261220/standings` を開く。 | `/info` moves to Home. `/standings` moves to Groups.<br>`/info` は Home、`/standings` は Groups に移動する。 | PC | | |
| A-10 | Open any page and press the browser's reload button.<br>どのページでもブラウザーの再読み込みを押す。 | The same page opens again (no 404).<br>同じページがもう一度開く（404 にならない）。 | All | | |
| A-11 | (Android Chrome) ☰ → "Add to home screen".<br>（Android Chrome）☰ →「Add to home screen」。 | The install dialog opens. After installing, the app icon opens `/20261220/`.<br>インストール画面が出る。インストール後、アイコンから `/20261220/` が開く。 | Android | | |
| A-12 | (iPhone/iPad Safari) ☰ → "Add to home screen".<br>（iPhone・iPad Safari）☰ →「Add to home screen」。 | Instructions "Share → Add to Home Screen" are shown.<br>「共有 → ホーム画面に追加」の手順が出る。 | iPhone, iPad | | |
| A-13 | Open the site from the installed home-screen icon, then open ☰.<br>ホーム画面のアイコンから開き、☰ を開く。 | It shows that the app is already added.<br>「追加済み」と出る。 | Android, iPhone | | |
| A-14 | (PC) Click "Register" at the top right.<br>（PC）右上の「Register」を押す。 | The team registration page opens.<br>チーム登録画面が開く。 | PC | | |

### B. Language / 言語

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| B-01 | Open the site for the first time (or in a private window).<br>初めて（またはプライベートウィンドウで）開く。 | The site is in English.<br>英語で出る。 | All | | |
| B-02 | Switch to မြန်မာ.<br>မြန်မာ に切り替える。 | The text changes to Myanmar at once. The page does not move. Myanmar letters are not broken (no boxes □).<br>すぐにミャンマー語になる。ページは移動しない。文字化け（□）がない。 | All | | |
| B-03 | In Myanmar, open every public page: Home, Matches, Live, Groups, Knockout, Teams, a match detail.<br>ミャンマー語のまま全ページを開く。 | All labels are in Myanmar. Numbers are 0–9. Team, club and player names are not translated. No English sentence is left (write any you find in the note).<br>ラベルがミャンマー語。数字は 0〜9。チーム名・クラブ名・選手名は翻訳されない。英語の文が残っていない（見つけたらメモに書く）。 | All | | |
| B-04 | Reload the page / close and open the browser again.<br>再読み込み／ブラウザーを開き直す。 | The chosen language is kept.<br>選んだ言語のまま。 | All | | |
| B-05 | In Myanmar, open the team registration and player registration pages.<br>ミャンマー語で登録画面・選手登録画面を開く。 | These pages are also in Myanmar, including error messages (try sending an empty form).<br>この画面もミャンマー語。エラーの文もミャンマー語（空のまま送って確認）。 | All | | |
| B-06 | Switch back to EN.<br>EN に戻す。 | Everything is English again.<br>全部英語に戻る。 | All | | |
| B-07 | Open the admin console in Myanmar mode.<br>ミャンマー語のまま管理画面を開く。 | The admin console stays in English (by design).<br>管理画面は英語のまま（仕様）。 | PC | | |

### C. Team registration / チーム登録

Preconditions: use made-up data only. Prepare a small logo image (PNG/JPEG/WebP, under 1 MB) and one file over 1 MB. / 前提: 架空のデータだけ使う。小さいロゴ画像（PNG・JPEG・WebP、1 MB 未満）と、1 MB を超える画像を用意する。

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| C-01 | Open the team registration page.<br>チーム登録画面を開く。 | The form, the event logo and the registered count (for example "12 / 40 teams registered") are shown.<br>フォーム・大会ロゴ・登録数（例: 「12 / 40 teams registered」）が出る。 | All | | |
| C-02 | Press the submit button with all fields empty.<br>全部空のまま送信する。 | It is not sent. Required fields are shown as errors.<br>送信されない。必須の項目がエラーになる。 | All | | |
| C-03 | Enter an e-mail without "@" (for example `test.example.com`).<br>「@」の無いメールを入れる。 | An error is shown. It is not sent.<br>エラーが出る。送信されない。 | PC | | |
| C-04 | Enter letters in the phone field (for example `abc`).<br>電話番号に文字を入れる。 | An error is shown. It is not sent.<br>エラーが出る。送信されない。 | PC | | |
| C-05 | Choose a logo file over 1 MB, or a PDF/GIF file.<br>1 MB を超える画像、または PDF・GIF を選ぶ。 | It is refused with a message (format or size).<br>メッセージが出て受け付けない（形式・サイズ）。 | PC | | |
| C-06 | Choose a valid logo.<br>正しいロゴを選ぶ。 | A preview of the logo is shown.<br>ロゴのプレビューが出る。 | All | | |
| C-07 | Fill in: Club name `QA Club <your initials>`, one team name, representative name, `<you>@example.com`, phone `0900000xxxx`, logo. Submit.<br>クラブ名 `QA Club <イニシャル>`、チーム名1つ、代表者名、`<名前>@example.com`、電話 `0900000xxxx`、ロゴを入れて送信する。 | The complete page shows the registered team. Write the e-mail and phone in your note (needed in D).<br>完了画面に登録したチームが出る。メールと電話番号をメモしておく（D で使う）。 | All | | |
| C-08 | Register again with the **same team name**.<br>**同じチーム名**でもう一度登録する。 | It is refused: the team name is already registered. Nothing is registered.<br>「登録済み」で断られる。何も登録されない。 | PC | | |
| C-09 | Choose "multiple teams", press "＋" to add 2 more team names (3 in total), and submit with the same club, e-mail and phone.<br>「複数チーム」を選び、「＋」でチーム名を2つ足して（計3つ）、同じクラブ・メール・電話で送信する。 | All 3 teams are shown on the complete page. Only one logo was needed.<br>完了画面に3チームとも出る。ロゴは1つだけで済む。 | PC | | |
| C-10 | Multiple teams: make two of the names the same and submit.<br>複数チームで、チーム名を2つ同じにして送信する。 | It is refused and **none** of the teams is registered.<br>断られて、**どのチームも**登録されない。 | PC | | |
| C-11 | Register a new team under an existing club name with a **different** logo.<br>既にあるクラブ名で、**別の**ロゴを付けて新しいチームを登録する。 | The team is registered. The club logo is **not** replaced by the new image.<br>チームは登録される。クラブのロゴは新しい画像に**変わらない**。 | PC | | |
| C-12 | Enter spaces before/after the e-mail and capital letters (for example `  QA@Example.com `).<br>メールの前後に空白、大文字を入れる。 | Registration succeeds. (In D, verification with `qa@example.com` works.)<br>登録できる（D で `qa@example.com` でも確認できる）。 | PC | | |
| C-13 | Check the Home page and the registration page after registering.<br>登録後に Home と登録画面を見る。 | The registered count has increased.<br>登録数が増えている。 | PC | | |
| C-14 | Enter a 121-character club name.<br>121文字のクラブ名を入れる。 | It is refused (max 120 characters).<br>断られる（120文字まで）。 | PC | | |
| C-15 | Enter `<script>alert(1)</script>` as a team name and register it. Open the Teams page.<br>チーム名に `<script>alert(1)</script>` を入れて登録し、Teams を開く。 | The text is shown as plain text. No pop-up appears.<br>文字としてそのまま出る。ポップアップは出ない。 | PC | | |
| C-16 | (Production only — Skip on test site) 41st team / after 2026-12-06 23:59:59 JST.<br>（本番だけ。テスト環境では Skip）41チーム目・締め切り後。 | "Registration is full" / "Registration is closed" and no form.<br>「満員」「締め切り」と出てフォームが出ない。 | — | Skip | Test site has limits off. / テスト環境は制限なし |

### D. Player registration / 選手登録

Precondition: the team you registered in C-07. / 前提: C-07 で登録したチーム。

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| D-01 | From the registration page, go to player registration (verify page).<br>登録画面から選手登録（確認画面）へ進む。 | "Verify your team" with e-mail and phone fields.<br>「Verify your team」とメール・電話番号の欄が出る。 | All | | |
| D-02 | Enter the right e-mail and a **wrong** phone number.<br>正しいメールと**違う**電話番号を入れる。 | Verification fails. The message does not tell which one was wrong.<br>確認できない。どちらが違うかは出ない。 | PC | | |
| D-03 | Enter the e-mail and phone from C-07.<br>C-07 のメールと電話番号を入れる。 | Verification succeeds and the player page opens for your team. The URL does not contain the e-mail or phone.<br>確認でき、選手登録画面が開く。URL にメールや電話番号が入っていない。 | All | | |
| D-04 | Verify with the contact used for 3 teams (C-09).<br>3チームで使った連絡先（C-09）で確認する。 | "Choose your team" is shown with the 3 teams. Choose one and continue.<br>「Choose your team」に3チーム出る。1つ選んで進める。 | PC | | |
| D-05 | Check the player form.<br>選手の入力欄を見る。 | 11 rows. Player Name and Back Number side by side.<br>11行。Player Name と Back Number が横に並ぶ。 | All | | |
| D-06 | Enter 3 players with back numbers 1, 2, 3 and submit.<br>背番号1・2・3で3人入れて送信する。 | Registration complete. Returning to the page shows 3 registered players and 8 empty rows.<br>完了。戻ると登録済み3人、空き8行。 | All | | |
| D-07 | Enter a player with back number 1 again (same team).<br>同じチームで背番号1をもう一度入れる。 | It is refused (duplicate back number). Nothing is registered.<br>断られる（背番号の重複）。何も登録されない。 | PC | | |
| D-08 | In one submit, enter two new players with the same back number.<br>1回の送信で、同じ背番号の2人を入れる。 | It is refused and **neither** player is registered.<br>断られて、**どちらも**登録されない。 | PC | | |
| D-09 | Enter a negative back number (-1) or a decimal (1.5).<br>マイナス（-1）や小数（1.5）の背番号を入れる。 | It is refused.<br>断られる。 | PC | | |
| D-10 | Fill all remaining rows to reach 11 players.<br>残りの行を全部入れて11人にする。 | 11 players are registered. No more rows can be entered.<br>11人登録できる。もう入力できない。 | PC | | |
| D-11 | Use the same back number in **another** team.<br>**別のチーム**で同じ背番号を使う。 | It is allowed.<br>登録できる。 | PC | | |
| D-12 | Check that registered players cannot be edited or deleted on this page.<br>登録済みの選手をこの画面で直せない・消せないことを見る。 | No edit/delete button for registered players.<br>登録済みの選手に編集・削除のボタンが無い。 | PC | | |
| D-13 | Wrong contact 6 times in a row within 15 minutes (do this **last**, it locks your connection for 15 minutes).<br>15分以内に6回続けて間違える（**最後に**行う。15分間確認できなくなる）。 | The 6th try is refused with a "too many attempts" message.<br>6回目は「試行回数が多すぎる」と断られる。 | PC | | |
| D-14 | Open the Teams page and select your team.<br>Teams を開き、自分のチームを選ぶ。 | The logo, team name and player names with back numbers are shown. **E-mail and phone are not shown.**<br>ロゴ・チーム名・選手名と背番号が出る。**メールと電話番号は出ない。** | All | | |

### E. Teams page / Teams 画面

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| E-01 | Open Teams.<br>Teams を開く。 | Only the "Registered teams" list is shown, with logo and team name cards. (There is no "Competition teams" list.)<br>「Registered teams」の一覧だけが出る。ロゴとチーム名のカード（「Competition teams」は無い）。 | All | | |
| E-02 | Select a team card.<br>チームのカードを押す。 | A dialog opens with the logo, name and registered players (or "no players" text).<br>ダイアログにロゴ・名前・登録選手（いなければその旨）が出る。 | All | | |
| E-03 | Close the dialog with "Back", "×", and (PC) Esc.<br>「Back」・「×」・（PC）Esc で閉じる。 | The dialog closes each time.<br>どれでも閉じる。 | All | | |
| E-04 | A team without a logo, or a broken logo.<br>ロゴの無い・壊れたロゴのチーム。 | A badge ("FC" or the initial) is shown instead.<br>代わりにバッジ（「FC」や頭文字）が出る。 | PC | | |

---

## 4. Admin console / 管理画面

### F. Sign-in and permissions / ログインと権限

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| F-01 | Open the admin sign-in URL.<br>管理者ログインの URL を開く。 | Username and Password fields. No admin button on public pages.<br>ユーザー名とパスワードの欄。公開ページには Admin ボタンが無い。 | PC | | |
| F-02 | Sign in with a wrong password.<br>違うパスワードでログインする。 | "Invalid" message. Not signed in.<br>エラーが出る。ログインできない。 | PC | | |
| F-03 | Same username: wrong password 5 times in a row, then the correct one.<br>同じユーザー名で5回続けて間違え、そのあと正しく入れる。 | Sign-in is blocked for 60 seconds, then works again.<br>60秒間ログインできない。そのあとはできる。 | PC | | |
| F-04 | Sign in as `superadmin`. Try `  SuperAdmin ` (spaces and capitals).<br>`superadmin` でログイン。`  SuperAdmin `（空白・大文字）でも試す。 | Both work. The console shows "ALL COURTS · superadmin".<br>どちらもログインできる。「ALL COURTS · superadmin」と出る。 | PC | | |
| F-05 | Sign in as `subadmin1`.<br>`subadmin1` でログイン。 | "COURT 1 · subadmin1". Only Court 1 matches can be chosen. No group, announcement, reset, test-tool or registration sections.<br>「COURT 1 · subadmin1」。Court 1 の試合だけ選べる。グループ・お知らせ・リセット・テストツール・登録管理は出ない。 | PC, iPad | | |
| F-06 | As `subadmin1`, open `/20261220/admin/registrations`.<br>`subadmin1` で `/20261220/admin/registrations` を開く。 | "Super Admin access required". No contact data is shown.<br>「Super Admin access required」。連絡先は出ない。 | PC | | |
| F-07 | Press "Sign out".<br>「Sign out」を押す。 | Back to the sign-in page. Opening `/20261220/admin/dashboard` again asks you to sign in.<br>ログイン画面に戻る。`/20261220/admin/dashboard` を開くとログインを求められる。 | PC | | |
| F-08 | Open `/20261220/admin/unknown` while signed in, and while signed out.<br>ログイン中・ログアウト中に `/20261220/admin/unknown` を開く。 | Signed in: 404 page. Signed out: sign-in page.<br>ログイン中は 404、ログアウト中はログイン画面。 | PC | | |
| F-09 | Open `/superadmin` and `/subadmin`.<br>`/superadmin` と `/subadmin` を開く。 | Both move to `/20261220/admin`.<br>どちらも `/20261220/admin` に移動する。 | PC | | |

### G. Team registrations (Super Admin) / 登録管理（Super Admin）

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| G-01 | Open "Team registrations" in the side menu.<br>サイドメニューの「Team registrations」を開く。 | Clubs with their teams, representative, e-mail, phone, registered date (JST) and members.<br>クラブとチーム・代表者・メール・電話・登録日時（JST）・選手が出る。 | PC | | |
| G-02 | "Edit team": change the team name and contact, then "Save changes".<br>「Edit team」でチーム名と連絡先を変えて「Save changes」。 | Saved. The new name appears on the Teams page.<br>保存される。Teams に新しい名前が出る。 | PC | | |
| G-03 | "Edit team": change the name to another team's name.<br>「Edit team」で、別のチームと同じ名前にする。 | Refused (already registered).<br>断られる（登録済み）。 | PC | | |
| G-04 | "Edit club name", then "Save club".<br>「Edit club name」→「Save club」。 | Saved.<br>保存される。 | PC | | |
| G-05 | Change the club logo (PNG/JPEG/WebP, max 1 MB).<br>クラブのロゴを変える。 | The new logo is shown here and on the Teams page for **all** teams of the club.<br>このクラブの**全チーム**で、新しいロゴが出る（ここと Teams）。 | PC | | |
| G-06 | "Download CSV". Open it in Excel.<br>「Download CSV」で落とし、Excel で開く。 | Columns: Club, Team, Representative, Email, Phone, Player, Back number, Registered at. 1 row per player. Myanmar/Japanese letters are not broken. A value starting with `=` starts with `'`.<br>列が正しい。1行=1選手。文字化けしない。`=` で始まる値は先頭に `'` が付く。 | PC | | |
| G-07 | "Delete team" on a test team you made (not in a group), then confirm.<br>自分が作ったテストチーム（グループに入っていない）を「Delete team」。 | The team and its players are removed. If it was the last team of the club, the club is removed too.<br>チームと選手が消える。クラブ最後のチームならクラブも消える。 | PC | | |
| G-08 | (After phase 3) "Delete team" on a team that is in a group.<br>（フェーズ3の後）グループに入っているチームを削除する。 | Refused: the team is in a group.<br>断られる（グループに入っている）。 | PC | | |

### H. Groups and schedule (Super Admin only) / グループ分けと試合作成（Super Admin 担当だけ）

Tell the other testers before starting. / 始める前にほかのテスターに知らせる。

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| H-01 | Open the console. Find the group board.<br>管理画面のグループ分けを見る。 | "Registered teams · not in a group" and groups A–H are shown.<br>「Registered teams · not in a group」と A〜H が出る。 | PC | | |
| H-02 | (PC) Drag a team with the mouse into Group A.<br>（PC）マウスでチームを A へドラッグ。 | The team moves into A. "Unsaved" is shown.<br>A に入る。「未保存」と出る。 | PC | | |
| H-03 | (iPad) Drag a team with your finger into Group B.<br>（iPad）指でドラッグして B へ。 | The team moves. The page does not scroll by mistake.<br>チームが動く。ページが勝手にスクロールしない。 | iPad | | |
| H-04 | Tap a team, then "Move here" on Group C.<br>チームをタップ →「Move here」（C）。 | The team moves into C.<br>C に入る。 | iPad, PC | | |
| H-05 | Put 5 teams into one group, then try a 6th.<br>1グループに5チーム入れて、6チーム目を入れる。 | The 6th is not accepted ("Move here" is disabled).<br>6チーム目は入らない（「Move here」が押せない）。 | PC | | |
| H-06 | "Remove from group" on a team.<br>チームの「Remove from group」。 | It goes back to "not in a group".<br>「not in a group」に戻る。 | PC | | |
| H-07 | Make changes, then "Reset to saved".<br>動かしてから「Reset to saved」。 | The board returns to the last saved state.<br>最後に保存した状態に戻る。 | PC | | |
| H-08 | Move a team without saving and try to leave the page.<br>保存せずにページを離れる。 | A confirmation asks before leaving.<br>離れる前に確認が出る。 | PC | | |
| H-09 | Put 5 teams in each of A–H (40 teams). "Save groups".<br>A〜H に5チームずつ（40チーム）入れて「Save groups」。 | Saved. The Groups page shows the teams with logos.<br>保存される。Groups にロゴ付きで出る。 | PC | | |
| H-10 | Leave one group with only 1 team, save, then "Generate schedule".<br>1チームだけのグループを作って保存し、「Generate schedule」。 | Refused: "Group X needs at least 2 teams".<br>断られる（2チーム以上必要）。 | PC | | |
| H-11 | With 8 groups of 5 teams, "Generate schedule".<br>5チーム×8グループで「Generate schedule」。 | 95 matches are made (80 group + 15 knockout). Schedule check: no court clashes, finishing 19:59.<br>95試合（グループ80＋決勝トーナメント15）。Schedule check で重複なし、19:59 終了。 | PC | | |
| H-12 | Start one match (K-03), then try to change the groups.<br>1試合開始（K-03）してから、グループを変える。 | Groups can no longer be changed.<br>グループはもう変えられない。 | PC | | |

### I. Home, My team, countdown / Home・マイチーム・カウントダウン

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| I-01 | Open Home.<br>Home を開く。 | Countdown to 2026-12-20 09:00 (JST) "first match at 9:00" counts down every second.<br>2026-12-20 9:00（JST）までのカウントダウンが1秒ごとに減る。 | All | | |
| I-02 | Check the participating teams list.<br>参加チームの一覧を見る。 | Logos are shown. The list scrolls sideways. "View all teams" opens Teams.<br>ロゴが出る。横にスクロールできる。「View all teams」で Teams が開く。 | All | | |
| I-03 | Check the bottom of Home.<br>Home の一番下を見る。 | Date, time, venue, address (EN/JA), Google Maps button and Contact.<br>日付・時間・会場・住所（英語・日本語）・Google マップのボタン・問い合わせ先。 | All | | |
| I-04 | Choose a team in "My team".<br>「My team」でチームを選ぶ。 | Its next match (time, court, opponent) and its group position are shown.<br>次の試合（時間・コート・相手）とグループの順位が出る。 | All | | |
| I-05 | Reload / reopen the browser.<br>再読み込み／開き直す。 | The chosen team is kept on this device.<br>この端末では選んだチームのまま。 | All | | |
| I-06 | Matches → "My team only".<br>Matches →「My team only」。 | Only the chosen team's matches are shown.<br>そのチームの試合だけが出る。 | All | | |
| I-07 | While the chosen team is playing (LIVE).<br>選んだチームが試合中のとき。 | The live score is shown in "My team".<br>「My team」に試合中のスコアが出る。 | PC | | |

### J. Matches page / Matches 画面

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| J-01 | Open Matches.<br>Matches を開く。 | All 95 matches. Each card: round, group, time or state, teams, score, match ID, court. Knockout teams show TBD until decided.<br>95試合。各カードにラウンド・グループ・時間か状態・チーム・点数・試合ID・コート。決勝トーナメントは決まるまで TBD。 | All | | |
| J-02 | Filter by Round, Team, Group and Court at the same time.<br>Round・Team・Group・Court を同時に絞り込む。 | Only matching matches are shown.<br>条件に合う試合だけ出る。 | PC | | |
| J-03 | "Reset" the filters.<br>フィルターを「Reset」。 | All filters return to All.<br>全部 All に戻る。 | PC | | |
| J-04 | Open a match card (match detail).<br>試合カードを開く（試合の詳細）。 | The detail page `/20261220/matches/<ID>` opens. "All matches" goes back.<br>詳細ページが開く。「All matches」で戻る。 | All | | |

### K. Match control / 試合操作

Assign one tester per court as Sub Admin, and one as Super Admin. / コートごとに Sub Admin 担当を1人、Super Admin 担当を1人決める。

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| K-01 | Super Admin: open the match list in "SELECT MATCH".<br>Super Admin:「SELECT MATCH」の一覧を開く。 | **All** matches (including finished ones) in time order. "x of y matches" is shown.<br>**全試合**（終わった試合も）が時間の順に出る。「x of y matches」が出る。 | PC | | |
| K-02 | Use the Court, Stage and Status filters.<br>Court・Stage・Status で絞り込む。 | The list and the count change. The selected match stays selectable even if it does not match the filter.<br>一覧と数が変わる。選んでいる試合は、条件に合わなくても選べるまま。 | PC | | |
| K-03 | Choose a group match and press "▶ Start match".<br>グループの試合を選び「▶ Start match」。 | State becomes ● LIVE, the timer starts from 00:00. Score +/− become usable.<br>● LIVE になり、タイマーが 00:00 から進む。点数の ＋／− が使える。 | PC, iPad | | |
| K-04 | Before starting, try +/−.<br>開始前に ＋／− を押す。 | Disabled. "Start the match to record goals." is shown.<br>押せない。「Start the match to record goals.」と出る。 | PC | | |
| K-05 | Press + for home twice and − once.<br>ホームの ＋ を2回、− を1回。 | Score 1. The score never goes below 0.<br>1点になる。0より下にならない。 | PC, iPad | | |
| K-06 | "Ⅱ Pause", wait 10 s, "▶ Resume".<br>「Ⅱ Pause」→10秒待つ→「▶ Resume」。 | Paused: timer stops, PAUSED shown. Resume continues from where it stopped.<br>止まっている間はタイマーが止まり PAUSED。再開は止めた所から。 | PC | | |
| K-07 | "■ Finish match".<br>「■ Finish match」。 | ■ Finished. No more control buttons. The match leaves Live.<br>■ Finished。操作ボタンが消える。Live から消える。 | PC | | |
| K-08 | Sub Admin (Court 1): check the court filter.<br>Sub Admin（Court 1）でコートの絞り込みを見る。 | Fixed to Court 1. Only Court 1 matches.<br>Court 1 で固定。Court 1 の試合だけ。 | PC, iPad | | |
| K-09 | Sub Admin (Court 1) operates a Court 1 match.<br>Sub Admin（Court 1）が Court 1 の試合を操作する。 | Works the same as Super Admin.<br>Super Admin と同じように操作できる。 | iPad | | |
| K-10 | Super Admin corrects the score of a finished group match (the next match not started yet).<br>Super Admin が、終わったグループの試合の点数を直す（次の試合はまだ）。 | It can be changed. The standings update.<br>直せる。順位表も変わる。 | PC | | |
| K-11 | Reload the admin page during a LIVE match.<br>試合中に管理画面を再読み込みする。 | The same match, state and timer (not reset to 00:00).<br>同じ試合・状態・タイマー（00:00 に戻らない）。 | iPad | | |

### L. Real-time updates / リアルタイム反映

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| L-01 | Open Live on a phone. On the admin iPad, add a goal.<br>スマホで Live を開き、管理の iPad で得点を入れる。 | The phone shows the new score within about 1–2 seconds without reloading.<br>再読み込みなしで1〜2秒以内に点数が変わる。 | iPhone, Android | | |
| L-02 | Start/Pause/Finish a match while Live, Matches, Groups and Home are open on other devices.<br>ほかの端末で Live・Matches・Groups・Home を開いたまま、開始・停止・終了する。 | All pages update by themselves.<br>どのページも自動で変わる。 | All | | |
| L-03 | Two admins (Super Admin and Sub Admin of the same court) operate the same match.<br>同じ試合を2人（Super Admin と同じコートの Sub Admin）で操作する。 | Both screens show the same score and state.<br>どちらの画面も同じ点数・状態。 | PC, iPad | | |
| L-04 | Check Live page: "On the pitch" and "Coming up".<br>Live の「On the pitch」と「Coming up」を見る。 | LIVE and PAUSED matches are on the pitch with timers. "Coming up" shows the next match for each court.<br>LIVE・PAUSED の試合がタイマー付きで出る。「Coming up」はコートごとに次の1試合。 | All | | |

### M. Group standings and tie decisions / 順位表と同点の順番決め

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| M-01 | Open Groups and one group.<br>Groups とグループ1つを開く。 | Columns: Played, Won, Drawn, Lost, Goal diff., Points (narrow screen: Played, Goal diff., Points). Group page also lists its matches.<br>列が正しい（狭い画面は Played・Goal diff.・Points）。グループのページに試合も出る。 | All | | |
| M-02 | Finish matches with win / draw / loss.<br>勝ち・引き分け・負けで試合を終える。 | Win 3, draw 1, loss 0 points. Only finished matches count.<br>勝ち3・引き分け1・負け0。終わった試合だけ数える。 | PC | | |
| M-03 | Make two teams equal on points but different goal difference.<br>勝ち点は同じで得失点差が違う2チームを作る。 | Better goal difference ranks higher. Then goals scored, then head-to-head.<br>得失点差 → 総得点 → 直接対決の順で上になる。 | PC | | |
| M-04 | Finish a whole group so that teams are still level after head-to-head on 1st/2nd or 2nd/3rd place (for example a 3-team cycle of 1–0 wins).<br>直接対決でも1・2位、2・3位で同じになるようにグループを終える（例: 3チームが1-0 で順番に勝つ）。 | "TIE DECISIONS" appears in the console for that group. The R16 places for that group stay empty (TBD).<br>管理画面にそのグループの「TIE DECISIONS」が出る。その R16 の枠は TBD のまま。 | PC | | |
| M-05 | In Tie decisions, use ↑/↓ and "Save order".<br>↑／↓ で並べ替えて「Save order」。 | Only tied teams can move. After saving, the panel disappears and the top 2 go into R16. The public Groups table shows the same order.<br>同点のチームだけ動かせる。保存すると欄が消え、1・2位が R16 に入る。公開の Groups も同じ順。 | PC | | |
| M-06 | A tie only between 4th and 5th place.<br>4位と5位だけが同点。 | No tie decision is required.<br>順番決めは出ない。 | PC | | |
| M-07 | After saving an order, change a result in that group (R16 not started).<br>順番を保存したあと、そのグループの結果を直す（R16 未開始）。 | The saved order is no longer used. Decide again if still tied.<br>保存した順番は使われない。まだ同点なら決め直す。 | PC | | |
| M-08 | Sub Admin: check the console.<br>Sub Admin で管理画面を見る。 | No tie decision panel (Super Admin only).<br>順番決めは出ない（Super Admin だけ）。 | PC | | |

### N. Knockout, auto-advance and PK / 決勝トーナメント・自動進出・PK

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| N-01 | Finish all matches of one group (others not finished).<br>1グループだけ全試合を終える。 | Its 1st and 2nd go into their R16 places at once (for example A1 vs H2: A1 filled, H2 still TBD).<br>その1・2位がすぐ R16 の枠に入る（例: A1 vs H2 の A1 だけ入る）。 | PC | | |
| N-02 | Open Knockout.<br>Knockout を開く。 | Round of 16 → Quarter-finals → Semi-finals → Final with times, courts and scores. The final is gold.<br>R16 → QF → SF → Final が時間・コート・点数付きで出る。決勝は金色。 | All | | |
| N-03 | Finish an R16 match with a winner.<br>R16 を勝敗ありで終える。 | The winner appears in the QF match.<br>勝者が QF に入る。 | PC | | |
| N-04 | R16 match tied: check the console.<br>R16 で同点にする。 | "Penalty shoot-out" panel appears. "■ Finish match" is disabled until there is a PK winner.<br>「Penalty shoot-out」欄が出る。PK の勝者が決まるまで「■ Finish match」が押せない。 | PC, iPad | | |
| N-05 | Enter PK 4–3 with +/−, then Finish.<br>PK 4–3 を入れて Finish。 | Finished. The PK winner advances. "PK 4–3" appears on Matches, Live, Knockout and Home (My team).<br>終わる。PK の勝者が進む。Matches・Live・Knockout・Home（マイチーム）に「PK 4–3」が出る。 | All | | |
| N-06 | Group matches: check for a PK panel.<br>グループの試合で PK 欄を探す。 | No PK panel in group matches.<br>グループの試合には PK 欄が無い。 | PC | | |
| N-07 | After the next match has started, change the result of the previous match (for example a group match after its R16 started).<br>次の試合が始まったあとで、前の試合の結果を直す（例: R16 開始後のグループの試合）。 | Refused: "The next match has already started. This result can no longer be changed."<br>断られる（次の試合が始まったので直せない）。 | PC | | |
| N-08 | Change an R16 result before its QF starts.<br>QF が始まる前に R16 の結果を直す。 | The QF team changes to the new winner.<br>QF のチームが新しい勝者に変わる。 | PC | | |
| N-09 | Knockout page before the group stage finishes.<br>グループ戦が終わる前の Knockout。 | A note that the knockout is not decided yet.<br>まだ決まっていない旨が出る。 | PC | | |

### O. Goal scorers (from the quarter-finals) / 得点者（準々決勝から）

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| O-01 | Start a QF match. Press + for a team.<br>QF を開始し、チームの ＋ を押す。 | "Who scored?" opens with that team's players (#number name), "Unknown player" and "Cancel".<br>「Who scored?」にそのチームの選手（#背番号 名前）・「Unknown player」・「Cancel」が出る。 | PC, iPad | | |
| O-02 | Choose a player.<br>選手を選ぶ。 | +1 goal. The goal list shows "minute' #number name".<br>1点増える。ゴール一覧に「分' #背番号 名前」が出る。 | PC, iPad | | |
| O-03 | Press +, then "Unknown player".<br>＋ →「Unknown player」。 | +1 goal without a scorer.<br>得点者なしで1点増える。 | PC | | |
| O-04 | Press +, then "Cancel" (and Esc on PC).<br>＋ →「Cancel」（PC は Esc も）。 | Nothing changes.<br>何も変わらない。 | PC | | |
| O-05 | "Change" on a goal in the list and choose another player.<br>ゴール一覧の「Change」で別の選手を選ぶ。 | The scorer changes. The score does not change.<br>得点者だけ変わる。点数は変わらない。 | PC | | |
| O-06 | Press −.<br>− を押す。 | That team's **last** goal is removed and the score goes down by 1.<br>そのチームの**最後の**ゴールが消え、1点減る。 | PC | | |
| O-07 | Double-tap a player quickly.<br>選手を素早く2回押す。 | Only one goal is added.<br>1点だけ増える。 | iPad | | |
| O-08 | A team with no registered players.<br>選手が登録されていないチーム。 | Only "Unknown player" is offered.<br>「Unknown player」だけ出る。 | PC | | |
| O-09 | R16 / group match: press +.<br>R16・グループの試合で ＋。 | No dialog; the score just increases (scorers are from QF only).<br>ダイアログは出ず、点数だけ増える（得点者は QF から）。 | PC | | |
| O-10 | Open the match detail and Live for that QF.<br>その QF の試合の詳細と Live を開く。 | Scorers with minutes are shown under each team (⚽ 13' #10 name).<br>各チームの下に得点者と時間が出る。 | All | | |
| O-11 | Open Knockout → "Top scorers".<br>Knockout の「Top scorers」。 | Ranking of QF/SF/Final goals. Same number of goals = same rank. Unknown player and PK goals are not counted.<br>QF・SF・決勝のゴールのランキング。同じ数は同じ順位。Unknown と PK は数えない。 | All | | |
| O-12 | Sub Admin of another court tries to record a goal in this match.<br>別のコートの Sub Admin がこの試合で得点を入れる。 | Not possible (the match is not in their list).<br>できない（一覧に出ない）。 | PC | | |

---

## 5. Other functions / その他の機能

### P. Test tools (test site only) / テストツール（テスト環境だけ）

**Super Admin tester only. Tell everyone first.** / **Super Admin 担当だけ。先に全員に知らせる。**

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| P-01 | Check the console.<br>管理画面を見る。 | "TEST TOOLS · TEST SITE ONLY" with 🎲 Group stage / Round of 16 / Quarter-finals / Semi-finals / Final.<br>「TEST TOOLS」に5つの 🎲 ボタンがある。 | PC | | |
| P-02 | Press "🎲 Round of 16" before the groups are finished.<br>グループが終わる前に「🎲 Round of 16」。 | "nothing to fill" (teams not decided).<br>「nothing to fill」（チームが決まっていない）。 | PC | | |
| P-03 | Press "🎲 Group stage".<br>「🎲 Group stage」。 | All unfinished group matches finish with random scores. Message shows the number of matches. If Tie decisions appears, save the order.<br>終わっていないグループの試合が全部ランダムの点数で終わる。試合数が出る。Tie decisions が出たら順番を保存する。 | PC | | |
| P-04 | Press R16, QF, SF, Final in order.<br>R16・QF・SF・Final を順に押す。 | Each stage finishes. Draws get a PK result. From QF, scorers are random. The champion appears in the final.<br>各ステージが終わる。同点は PK あり。QF から得点者もランダム。決勝が終わる。 | PC | | |
| P-05 | Press the same button again.<br>同じボタンをもう一度押す。 | "nothing to fill". Finished matches are not changed.<br>「nothing to fill」。終わった試合は変わらない。 | PC | | |
| P-06 | (Production only — organiser checks) The panel is not shown on production.<br>（本番。担当者が確認）本番では出ない。 | Not shown.<br>出ない。 | — | | |

### Q. Announcements / お知らせ

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| Q-01 | Super Admin: ANNOUNCEMENTS → English text, Type Info → "Publish announcement".<br>英語の本文、Info で公開する。 | It appears at once as a banner on public pages and the registration page (other devices without reload).<br>公開ページと登録ページの上にすぐ出る（ほかの端末も再読み込みなし）。 | All | | |
| Q-02 | Publish with Myanmar text too. Switch language.<br>ミャンマー語も入れて公開し、言語を切り替える。 | Myanmar mode shows the Myanmar text. Without Myanmar text, English is shown.<br>ミャンマー語のときはミャンマー語の本文。無ければ英語。 | All | | |
| Q-03 | Type "Warning".<br>種類を Warning にする。 | The banner looks like a warning (different colour).<br>警告の見た目（色が違う）。 | All | | |
| Q-04 | Publish 4 announcements.<br>4件公開する。 | Only the newest 3 are shown.<br>新しい3件だけ出る。 | PC | | |
| Q-05 | Close a banner with × on one device.<br>ある端末で × で閉じる。 | It stays closed on that device only. Other devices still show it.<br>その端末だけ閉じたまま。ほかの端末には出る。 | All | | |
| Q-06 | Hide / show / delete in the console.<br>管理画面で非表示・表示・削除。 | Public pages follow at once.<br>公開ページもすぐ変わる。 | PC | | |
| Q-07 | Empty English text, or 301 characters.<br>英語が空、または301文字。 | Refused.<br>断られる。 | PC | | |
| Q-08 | Text `<b>bold</b><script>alert(1)</script>`.<br>本文に HTML を入れる。 | Shown as plain text. No pop-up.<br>文字のまま出る。ポップアップは出ない。 | PC | | |

### R. Reset / リセット

**Super Admin tester only, at the end. Tell everyone first.** / **最後に Super Admin 担当だけ。先に全員に知らせる。**

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| R-01 | "↺ Reset all matches" → "Cancel".<br>「↺ Reset all matches」→「Cancel」。 | Nothing changes.<br>何も変わらない。 | PC | | |
| R-02 | "↺ Reset all matches" → "Yes, reset".<br>→「Yes, reset」。 | All matches are back to not started, knockout teams are TBD, goals and Top scorers are cleared. Groups and registrations stay.<br>全試合が未開始、決勝トーナメントは TBD、ゴールと Top scorers も消える。グループと登録はそのまま。 | PC | | |
| R-03 | "Seed knockout teams (for testing)" while groups are not finished.<br>グループが終わっていないときに「Seed knockout teams (for testing)」。 | R16 is filled from the current standings.<br>今の順位で R16 が埋まる。 | PC | | |
| R-04 | "Initialize" (confirm).<br>「Initialize」（確認あり）。 | Groups and matches are cleared. Registered teams are kept.<br>グループと試合が消える。登録チームは残る。 | PC | | |

### S. Connection loss / 通信が切れたとき

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| S-01 | Turn on airplane mode / turn off Wi-Fi on the admin iPad.<br>管理の iPad で機内モード／Wi-Fi を切る。 | A "disconnected" banner appears. Admin buttons are disabled. The last data stays on screen.<br>切断の帯が出る。管理のボタンが押せない。最後のデータは表示されたまま。 | iPad | | |
| S-02 | Turn the network on again.<br>通信を戻す。 | It reconnects by itself within about 10 s and shows the latest data.<br>10秒ほどで自動で再接続し、最新のデータになる。 | iPad, iPhone | | |
| S-03 | Lock the phone screen for 2 minutes, then open it.<br>スマホの画面を2分ロックして開く。 | The page shows the latest data (reconnects).<br>最新のデータになる（再接続）。 | iPhone, Android | | |

### T. Display on each device / 端末ごとの表示

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| T-01 | Open every public page on each device.<br>各端末で全公開ページを開く。 | No overlapping text, no cut-off buttons, no sideways page scroll (Knockout bracket may scroll inside its box).<br>文字の重なり・切れたボタン・ページの横スクロールが無い（Knockout の表は枠の中でスクロール可）。 | All | | |
| T-02 | Long team names (30+ characters).<br>長いチーム名（30文字以上）。 | Names wrap and do not cover scores or numbers.<br>折り返して、点数や数字に重ならない。 | iPhone, PC | | |
| T-03 | Buttons on phone and iPad.<br>スマホ・iPad のボタン。 | Easy to tap (about 44px or more). Admin + / − / player buttons are easy to press.<br>押しやすい（約44px以上）。管理の ＋／−・選手ボタンも押しやすい。 | iPhone, iPad | | |
| T-04 | Admin console on iPad (portrait and landscape).<br>iPad（縦・横）で管理画面。 | All controls are usable without zooming.<br>拡大しなくても全部操作できる。 | iPad | | |
| T-05 | Admin console on PC Chrome, Edge and Safari.<br>PC の Chrome・Edge・Safari で管理画面。 | Same behaviour in all browsers.<br>どのブラウザーでも同じ動き。 | PC | | |

### U. Security quick checks / セキュリティの簡単な確認

| ID | Steps / 手順 | Expected / 期待結果 | Device | Result / 結果 | Note / メモ |
|---|---|---|---|---|---|
| U-01 | Signed out, open `/20261220/admin/dashboard` and `/20261220/admin/registrations`.<br>ログアウト中に開く。 | Sign-in page. No admin data is shown.<br>ログイン画面。管理のデータは出ない。 | PC | | |
| U-02 | Look through all public pages for e-mails and phone numbers.<br>公開ページにメール・電話番号が無いか見る。 | No representative contact is shown anywhere public.<br>代表者の連絡先はどこにも出ない。 | PC | | |
| U-03 | After player verification, wait more than 1 hour and submit players.<br>選手登録の確認から1時間以上たってから送信する。 | You are asked to verify again.<br>もう一度確認を求められる。 | PC | | |
| U-04 | Session: sign in as admin, wait more than 12 hours (or next day).<br>管理者ログインから12時間以上たつ（翌日など）。 | You must sign in again.<br>もう一度ログインが必要。 | PC | | |

---

## 6. Bug report / 不具合報告

Copy this table for each `NG`. / `NG` ごとにこの表をコピーして書く。

| Item / 項目 | Write here / 記入 |
|---|---|
| Test ID / テストID | (e.g. K-06) |
| Tester / テスター | |
| Date and time (JST) / 日時（JST） | |
| Device, OS, browser / 端末・OS・ブラウザー | (e.g. iPad 10th gen, iPadOS 18, Safari) |
| Language / 言語 | EN / မြန်မာ |
| Account / アカウント | (e.g. subadmin3 — never write the password / パスワードは書かない) |
| Steps to reproduce / 再現手順 | 1. …<br>2. …<br>3. … |
| Expected / 期待結果 | |
| Actual / 実際の結果 | |
| How often / 頻度 | Always / Sometimes / Once — 毎回／ときどき／1回 |
| Screenshot or video / 画像・動画 | (attach / 添付) |
| Severity / 重要度 | High: blocks the tournament / Medium: wrong but has a workaround / Low: display only — 高: 大会が止まる／中: 回避できる／低: 見た目だけ |

## 7. Result summary / 結果のまとめ

| Section / 章 | Cases / 件数 | OK | NG | Skip | Tester / テスター |
|---|---|---|---|---|---|
| A. Common layout | 14 | | | | |
| B. Language | 7 | | | | |
| C. Team registration | 16 | | | | |
| D. Player registration | 14 | | | | |
| E. Teams page | 4 | | | | |
| F. Sign-in and permissions | 9 | | | | |
| G. Team registrations | 8 | | | | |
| H. Groups and schedule | 12 | | | | |
| I. Home / My team | 7 | | | | |
| J. Matches | 4 | | | | |
| K. Match control | 11 | | | | |
| L. Real-time | 4 | | | | |
| M. Standings / ties | 8 | | | | |
| N. Knockout / PK | 9 | | | | |
| O. Goal scorers | 12 | | | | |
| P. Test tools | 6 | | | | |
| Q. Announcements | 8 | | | | |
| R. Reset | 4 | | | | |
| S. Connection loss | 3 | | | | |
| T. Devices | 5 | | | | |
| U. Security | 4 | | | | |
| **Total / 合計** | **168** | | | | |
