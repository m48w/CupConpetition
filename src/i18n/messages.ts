/**
 * 画面の文（英語とミャンマー語）。
 *
 * 翻訳の確認・修正はこのファイルだけで行う。
 * - `en` は必須。`my` が無い・空のときは英語を表示する。
 * - `{count}` のような部分はプログラムが値を入れる。訳でも `{...}` はそのまま残す。
 * - 数字（時刻、スコア、日付）は 0〜9 で書く。
 * - 管理画面の文はここに入れない（管理画面は英語のみ）。
 */
export const messages = {
  // ===== 共通 =====
  "app.register": { en: "Register", my: "စာရင်းသွင်းရန်" },
  "app.footer": {
    en: "Tournament operations platform",
    my: "ပြိုင်ပွဲ စီမံခန့်ခွဲမှု",
  },
  "app.hub": { en: "TOURNAMENT HUB", my: "ပြိုင်ပွဲ" },
  "lang.label": { en: "Language", my: "ဘာသာစကား" },
  "common.group": { en: "Group {id}", my: "အုပ်စု {id}" },
  "common.court": { en: "Court {court}", my: "ကွင်း {court}" },
  "common.teams": { en: "{count} teams", my: "အသင်း {count} သင်း" },
  "app.matchCount": { en: "{count} matches", my: "ပွဲ {count} ပွဲ" },
  "common.back": { en: "Back", my: "နောက်သို့" },
  "common.close": { en: "Close", my: "ပိတ်ရန်" },
  "common.logoAlt": { en: "{name} logo", my: "{name} လိုဂို" },
  "common.backToTournament": { en: "Back to tournament", my: "ပြိုင်ပွဲ စာမျက်နှာသို့" },

  // ===== メニュー =====
  "nav.home": { en: "Home", my: "ပင်မ" },
  "nav.matches": { en: "Matches", my: "ပွဲစဉ်များ" },
  "nav.groups": { en: "Groups", my: "အုပ်စုများ" },
  "nav.knockout": { en: "Knockout", my: "ရှုံးထွက်" },
  "nav.teams": { en: "Teams", my: "အသင်းများ" },
  "nav.live": { en: "Live", my: "တိုက်ရိုက်" },
  "nav.info": { en: "Info", my: "အချက်အလက်" },

  // ===== 接続 =====
  "conn.connecting": {
    en: "Connecting to the match server…",
    my: "ပွဲစဉ်ဆာဗာနှင့် ချိတ်ဆက်နေသည်…",
  },
  "conn.offline": {
    en: "Connection lost — showing the last data we received",
    my: "ချိတ်ဆက်မှု ပြတ်နေသည် — နောက်ဆုံးရရှိထားသော အချက်အလက်ကို ပြသနေသည်",
  },

  // ===== Home =====
  "home.live.eyebrow": { en: "LIVE NOW", my: "ယခု တိုက်ရိုက်" },
  "home.live.title": { en: "Matches on the pitch", my: "ကစားနေသော ပွဲများ" },
  "home.live.all": { en: "All live matches", my: "တိုက်ရိုက်ပွဲ အားလုံး" },
  "home.countdown.eyebrow": { en: "", my: "" },
  "home.countdown.title": { en: "Countdown to kick-off", my: "ပြိုင်ပွဲရောက်ရန်" },
  "home.countdown.date": {
    en: "Sunday, 20 December 2026",
    my: "2026 ဒီဇင်ဘာလ 20 ရက် (တနင်္ဂနွေနေ့)",
  },
  "home.countdown.started": { en: "Tournament day is here!", my: "ပြိုင်ပွဲနေ့ ရောက်ပါပြီ!" },
  "home.countdown.aria": { en: "Time until tournament day", my: "ပြိုင်ပွဲနေ့အထိ ကျန်ချိန်" },
  "home.countdown.days": { en: "Days", my: "ရက်" },
  "home.countdown.hours": { en: "Hours", my: "နာရီ" },
  "home.countdown.minutes": { en: "Minutes", my: "မိနစ်" },
  "home.countdown.seconds": { en: "Seconds", my: "စက္ကန့်" },
  "home.teams.eyebrow": { en: "THE CLUBS", my: "အသင်းများ" },
  "home.teams.title": { en: "Teams", my: "ပါဝင်သော အသင်းများ" },
  "home.teams.viewAll": { en: "View all teams", my: "အသင်းအားလုံး ကြည့်ရန်" },
  "home.teams.empty": {
    en: "Teams will appear here after the groups are decided.",
    my: "အုပ်စုများ သတ်မှတ်ပြီးနောက် အသင်းများကို ဤနေရာတွင် ပြသပါမည်။",
  },
  "home.rules.eyebrow": { en: "PLAY FAIR", my: "တရားမျှတစွာ ကစားပါ" },
  "home.rules.title": { en: "Competition rules", my: "ပြိုင်ပွဲ စည်းမျဉ်းများ" },
  "home.rules.soon": {
    en: "The Competition rules will be announced soon.",
    my: "ပြိုင်ပွဲ စည်းမျဉ်းများကို မကြာမီ ကြေညာပါမည်။",
  },

  // ===== Teams =====
  "teams.eyebrow": { en: "THE CLUBS", my: "အသင်းများ" },
  "teams.title": { en: "Teams", my: "ပါဝင်သော အသင်းများ" },
  "teams.summary": {
    en: "{competing} competing · {registered} registered",
    my: "ယှဉ်ပြိုင်မည် {competing} · စာရင်းသွင်းပြီး {registered}",
  },
  "teams.registered.title": { en: "Registered teams", my: "စာရင်းသွင်းထားသော အသင်းများ" },
  "teams.loadError": {
    en: "Could not load the registered teams.",
    my: "စာရင်းသွင်းထားသော အသင်းများကို ဖွင့်၍ မရပါ။",
  },
  "teams.view": {
    en: "View {team} and its players",
    my: "{team} နှင့် ကစားသမားများကို ကြည့်ရန်",
  },
  "teams.none": { en: "No teams have registered yet.", my: "စာရင်းသွင်းထားသော အသင်း မရှိသေးပါ။" },
  "teams.competition.title": { en: "Competition teams", my: "ယှဉ်ပြိုင်မည့် အသင်းများ" },
  "teams.members.title": { en: "Registered players", my: "စာရင်းသွင်းထားသော ကစားသမားများ" },
  "teams.members.none": {
    en: "No players have registered yet.",
    my: "စာရင်းသွင်းထားသော ကစားသမား မရှိသေးပါ။",
  },
  "teams.closeDetails": { en: "Close team details", my: "အသင်း အသေးစိတ်ကို ပိတ်ရန်" },
  "teams.all": { en: "All teams", my: "အသင်းအားလုံး" },
  "teams.matches": { en: "Matches", my: "ပွဲစဉ်များ" },

  // ===== 試合 =====
  "stage.GROUP": { en: "Group stage", my: "အုပ်စုအဆင့်" },
  "stage.R16": { en: "Round of 16", my: "16 သင်းအဆင့်" },
  "stage.QF": { en: "Quarter-final", my: "ကွာတားဖိုင်နယ်" },
  "stage.SF": { en: "Semi-final", my: "ဆီမီးဖိုင်နယ်" },
  "stage.FINAL": { en: "Final", my: "ဗိုလ်လုပွဲ" },
  "match.live": { en: "LIVE", my: "တိုက်ရိုက်" },
  "match.paused": { en: "PAUSED", my: "ခဏရပ်" },
  "match.finished": { en: "FULL TIME", my: "ပွဲပြီး" },
  "match.footer": { en: "Match {id} · Court {court}", my: "ပွဲစဉ် {id} · ကွင်း {court}" },
  "match.tbd": { en: "TBD", my: "မသတ်မှတ်ရသေး" },
  "matches.eyebrow": { en: "FULL TOURNAMENT SCHEDULE", my: "ပြိုင်ပွဲ အချိန်ဇယား" },
  "matches.title": { en: "All matches", my: "ပွဲစဉ်အားလုံး" },
  "matches.shown": { en: "{count} shown", my: "{count} ပွဲ ပြသထားသည်" },
  "matches.empty": {
    en: "The match schedule will be published soon.",
    my: "ပွဲစဉ်ဇယားကို မကြာမီ ထုတ်ပြန်ပါမည်။",
  },
  "matches.showing": {
    en: "Showing {shown} of {total} matches",
    my: "ပွဲ {total} ပွဲအနက် {shown} ပွဲ ပြသထားသည်",
  },
  "filter.round": { en: "Round · All", my: "အဆင့် · အားလုံး" },
  "filter.team": { en: "Team · All", my: "အသင်း · အားလုံး" },
  "filter.group": { en: "Group · All", my: "အုပ်စု · အားလုံး" },
  "filter.court": { en: "Court · All", my: "ကွင်း · အားလုံး" },
  "filter.reset": { en: "Reset", my: "ပြန်စရန်" },
  "matchDetail.eyebrow": { en: "MATCH CENTRE", my: "ပွဲစဉ် အသေးစိတ်" },
  "matchDetail.title": { en: "Match {id}", my: "ပွဲစဉ် {id}" },
  "matchDetail.all": { en: "All matches", my: "ပွဲစဉ်အားလုံး" },

  // ===== Groups =====
  "groups.eyebrow": { en: "GROUP STAGE", my: "အုပ်စုအဆင့်" },
  "groups.title": { en: "Groups", my: "အုပ်စုများ" },
  "groups.note": {
    en: "Top teams go to the knockout stage",
    my: "ထိပ်ဆုံးအသင်းများ အပိုင်းထွက်အဆင့်သို့ တက်မည်",
  },
  "groups.empty": {
    en: "Groups will be announced after registration closes.",
    my: "စာရင်းသွင်းချိန် ပြီးဆုံးပြီးနောက် အုပ်စုများကို ကြေညာပါမည်။",
  },
  "groups.all": { en: "All groups", my: "အုပ်စုအားလုံး" },
  "groups.matches": { en: "Group {id} matches", my: "အုပ်စု {id} ပွဲစဉ်များ" },
  "standings.team": { en: "Team", my: "အသင်း" },
  "standings.played": { en: "Played", my: "ကစား" },
  "standings.won": { en: "Won", my: "နိုင်" },
  "standings.drawn": { en: "Drawn", my: "သရေ" },
  "standings.lost": { en: "Lost", my: "ရှုံး" },
  "standings.goalDiff": { en: "Goal diff.", my: "ဂိုးကွာ" },
  "standings.points": { en: "Points", my: "အမှတ်" },
  "standings.playedHint": { en: "Matches played", my: "ကစားပြီးသော ပွဲအရေအတွက်" },
  "standings.goalDiffHint": {
    en: "Goals scored minus goals conceded",
    my: "သွင်းဂိုး နုတ် ပေးဂိုး",
  },

  // ===== Live =====
  "live.eyebrow": { en: "REAL-TIME CENTRE", my: "တိုက်ရိုက် ရလဒ်များ" },
  "live.title": { en: "Live matches", my: "တိုက်ရိုက် ပွဲစဉ်များ" },
  "live.realtime": { en: "Updates in real time", my: "အချိန်နှင့်တပြေးညီ ပြောင်းလဲပါသည်" },
  "live.onPitch": { en: "On the pitch", my: "ကစားနေသော ပွဲများ" },
  "live.active": { en: "{count} playing", my: "{count} ပွဲ ကစားနေသည်" },
  "live.empty": {
    en: "No matches are being played right now.",
    my: "ယခု ကစားနေသော ပွဲ မရှိပါ။",
  },
  "live.next.eyebrow": {
    en: "NEXT MATCHES · ONE PER COURT",
    my: "နောက်ပွဲများ · ကွင်းတစ်ခုလျှင် တစ်ပွဲ",
  },
  "live.next.title": { en: "Coming up", my: "လာမည့်ပွဲများ" },
  "live.next.empty": {
    en: "The next matches will appear here.",
    my: "နောက်ပွဲများကို ဤနေရာတွင် ပြသပါမည်။",
  },

  // ===== Knockout =====
  "bracket.eyebrow": { en: "KNOCKOUT STAGE", my: "အပိုင်းထွက်အဆင့်" },
  "bracket.title": { en: "Road to the final", my: "ဗိုလ်လုပွဲဆီသို့" },
  "bracket.pending": {
    en: "15 matches · Schedule coming soon",
    my: "ပွဲ 15 ပွဲ · အချိန်ဇယား မကြာမီ",
  },
  "bracket.ready": { en: "15 matches · One champion", my: "ပွဲ 15 ပွဲ · ချန်ပီယံ တစ်သင်း" },
  "bracket.notDecided": {
    en: "Knockout teams are decided after the group stage.",
    my: "အုပ်စုအဆင့် ပြီးဆုံးပြီးနောက် ရှုံးထွက်အဆင့်အသင်းများကို သတ်မှတ်ပါမည်။",
  },
  "bracket.tagline": {
    en: "Every match. Every moment. One champion.",
    my: "ပွဲတိုင်း။ အချိန်တိုင်း။ ချန်ပီယံ တစ်သင်း။",
  },
  "bracket.round.R16": { en: "Round of 16", my: "16 သင်းအဆင့်" },
  "bracket.round.QF": { en: "Quarter-finals", my: "ကွာတားဖိုင်နယ်" },
  "bracket.round.SF": { en: "Semi-finals", my: "ဆီမီးဖိုင်နယ်" },
  "bracket.round.FINAL": { en: "Final", my: "ဗိုလ်လုပွဲ" },
  "bracket.winner": { en: "Winner {match}", my: "{match} နိုင်သူ" },
  "bracket.when": { en: "{time} · Court {court}", my: "{time} · ကွင်း {court}" },

  // ===== Info =====
  "info.eyebrow": { en: "TOURNAMENT INFO", my: "ပြိုင်ပွဲ အချက်အလက်" },
  "info.title": { en: "Tournament information", my: "ပြိုင်ပွဲ သတင်းအချက်အလက်" },
  "info.date": { en: "Date", my: "ရက်စွဲ" },
  "info.time": { en: "Time", my: "အချိန်" },
  "info.venue": { en: "Venue", my: "ပြိုင်ပွဲ နေရာ" },
  "info.address": { en: "Address", my: "လိပ်စာ" },
  "info.addressJa": { en: "Address in Japanese", my: "ဂျပန်ဘာသာ လိပ်စာ" },
  "info.map": { en: "Open in Google Maps", my: "Google Maps တွင် ဖွင့်ရန်" },
  "info.gettingThere": { en: "Getting there", my: "သွားရောက်ပုံ" },
  "info.schedule": { en: "Schedule of the day", my: "ပြိုင်ပွဲနေ့ အချိန်ဇယား" },
  "info.rules": { en: "Rules", my: "စည်းမျဉ်းများ" },
  "info.bring": { en: "What to bring", my: "ယူဆောင်ရမည့် ပစ္စည်းများ" },
  "info.contact": { en: "Contact", my: "ဆက်သွယ်ရန်" },
  "info.faq": { en: "Questions and answers", my: "မေးလေ့ရှိသော မေးခွန်းများ" },
  "info.tba": { en: "To be announced", my: "နောက်မှ ကြေညာပါမည်" },
  "home.rules.link": { en: "See tournament information", my: "ပြိုင်ပွဲ အချက်အလက် ကြည့်ရန်" },

  // ===== 登録状況 =====
  "status.count": {
    en: "{count} / {capacity} teams registered",
    my: "အသင်း {capacity} သင်းအနက် {count} သင်း စာရင်းသွင်းပြီး",
  },
  "status.deadline": {
    en: "Team registration closes on 6 December 2026 at 23:59 (Japan time).",
    my: "အသင်း စာရင်းသွင်းချိန် 2026 ဒီဇင်ဘာ 6 · 23:59 (ဂျပန်စံတော်ချိန်) တွင် ပိတ်ပါမည်။",
  },
  "status.memberDeadline": {
    en: "Player registration closes on 12 December 2026 at 23:59 (Japan time).",
    my: "ကစားသမား စာရင်းသွင်းချိန် 2026 ဒီဇင်ဘာ 12 · 23:59 (ဂျပန်စံတော်ချိန်) တွင် ပိတ်ပါမည်။",
  },
  "status.full": {
    en: "Registration is full. We cannot accept more teams.",
    my: "စာရင်းသွင်းမှု ပြည့်သွားပါပြီ။ အသင်းများ ထပ်မံ လက်မခံနိုင်ပါ။",
  },
  "status.closed": {
    en: "Team registration is closed.",
    my: "အသင်း စာရင်းသွင်းချိန် ပြီးဆုံးပါပြီ။",
  },
  "status.remaining": { en: "{count} places left", my: "နေရာ {count} ခု ကျန်သည်" },

  // ===== お知らせ =====
  "announce.close": { en: "Close this notice", my: "ဤကြေညာချက်ကို ပိတ်ရန်" },
  "announce.label": { en: "Notice", my: "ကြေညာချက်" },

  // ===== マイチーム =====
  "myTeam.eyebrow": { en: "MY TEAM", my: "ကျွန်ုပ်၏ အသင်း" },
  "myTeam.choose": { en: "Choose my team", my: "ကျွန်ုပ်၏ အသင်းကို ရွေးရန်" },
  "myTeam.change": { en: "Change", my: "ပြောင်းရန်" },
  "myTeam.clear": { en: "Remove my team", my: "ကျွန်ုပ်၏ အသင်းကို ဖယ်ရှားရန်" },
  "myTeam.hint": {
    en: "Choose your team to see its next match, court and group position here.",
    my: "သင့်အသင်းကို ရွေးပါက နောက်ပွဲ၊ ကွင်းနှင့် အုပ်စုအဆင့်ကို ဤနေရာတွင် ပြသပါမည်။",
  },
  "myTeam.pickerTitle": { en: "Choose your team", my: "သင့်အသင်းကို ရွေးပါ" },
  "myTeam.next": { en: "Next match", my: "နောက်ပွဲ" },
  "myTeam.now": { en: "Playing now", my: "ယခု ကစားနေသည်" },
  "myTeam.noNext": { en: "No more matches scheduled.", my: "စီစဉ်ထားသော ပွဲ မရှိတော့ပါ။" },
  "myTeam.vs": { en: "vs {team}", my: "{team} နှင့်" },
  "myTeam.when": { en: "{time} · Court {court}", my: "{time} · ကွင်း {court}" },
  "myTeam.position": {
    en: "Group {group} · Position {position} of {total}",
    my: "အုပ်စု {group} · {total} သင်းအနက် အဆင့် {position}",
  },
  "myTeam.points": { en: "{points} points", my: "{points} မှတ်" },
  "myTeam.filter": { en: "My team only", my: "ကျွန်ုပ်၏ အသင်းသာ" },

  // ===== 404 =====
  "notFound.title": { en: "Page not found", my: "စာမျက်နှာ မတွေ့ပါ" },

  // ===== 空ページ =====
  "empty.default": { en: "Nothing to show yet.", my: "ပြသရန် မရှိသေးပါ။" },

  // ===== 登録: 共通 =====
  "reg.header.sub": { en: "TEAM REGISTRATION", my: "အသင်း စာရင်းသွင်းခြင်း" },
  "reg.back": { en: "← Back to tournament", my: "← ပြိုင်ပွဲ စာမျက်နှာသို့" },
  "reg.footer": {
    en: "VELOCITY CUP 2026 · 20 DECEMBER 2026",
    my: "VELOCITY CUP 2026 · 2026 ဒီဇင်ဘာ 20",
  },
  "reg.deadline.value": {
    en: "12 December 2026 · 23:59 (Japan time)",
    my: "2026 ဒီဇင်ဘာ 12 · 23:59 (ဂျပန်စံတော်ချိန်)",
  },
  "reg.email": { en: "Email address", my: "အီးမေးလ်" },
  "reg.phone": { en: "Phone number", my: "ဖုန်းနံပါတ်" },

  // ===== 登録: チーム登録フォーム =====
  "reg.form.eyebrow": { en: "JOIN THE TOURNAMENT", my: "ပြိုင်ပွဲတွင် ပါဝင်ရန်" },
  "reg.form.title": { en: "Team registration", my: "အသင်း စာရင်းသွင်းခြင်း" },
  "reg.form.intro": {
    en: "Register your club and your team (or teams) for Velocity Cup 2026. You can enter several teams from the same club in one form.",
    my: "Velocity Cup 2026 အတွက် သင့်ကလပ်နှင့် အသင်း(များ)ကို စာရင်းသွင်းပါ။ ကလပ်တစ်ခုတည်းမှ အသင်းများစွာကို ဖောင်တစ်ခုတည်းဖြင့် စာရင်းသွင်းနိုင်ပါသည်။",
  },
  "reg.clubName": { en: "Club name", my: "ကလပ်အမည်" },
  "reg.multiple": {
    en: "This club is entering more than one team",
    my: "ဤကလပ်မှ အသင်းတစ်သင်းထက် ပို၍ ပါဝင်မည်",
  },
  "reg.teamName": { en: "Team name", my: "အသင်းအမည်" },
  "reg.teamNameN": { en: "Team name {n}", my: "အသင်းအမည် {n}" },
  "reg.addTeam": { en: "Add another team name", my: "အသင်းအမည် ထပ်ထည့်ရန်" },
  "reg.removeTeam": { en: "Remove team name {n}", my: "အသင်းအမည် {n} ကို ဖယ်ရှားရန်" },
  "reg.repName": { en: "Representative name", my: "ကိုယ်စားလှယ် အမည်" },
  "reg.logo": { en: "Club logo", my: "ကလပ် လိုဂို" },
  "reg.required": { en: "REQUIRED", my: "မဖြစ်မနေ" },
  "reg.logo.previewAlt": { en: "Selected club logo", my: "ရွေးထားသော ကလပ် လိုဂို" },
  "reg.logo.add": { en: "Add your club logo", my: "ကလပ် လိုဂို ထည့်ရန်" },
  "reg.logo.hint": {
    en: "Required · PNG, JPEG or WebP · up to 1 MB · used by all teams in this club",
    my: "မဖြစ်မနေ · PNG, JPEG သို့မဟုတ် WebP · 1 MB အထိ · ကလပ်ရှိ အသင်းအားလုံး အတူသုံးမည်",
  },
  "reg.logo.size": {
    en: "{size} KB · used by all teams in this club",
    my: "{size} KB · ကလပ်ရှိ အသင်းအားလုံး အတူသုံးမည်",
  },
  "reg.logo.change": { en: "Change logo", my: "လိုဂို ပြောင်းရန်" },
  "reg.logo.choose": { en: "Choose file", my: "ဖိုင် ရွေးရန်" },
  "reg.logo.remove": { en: "Remove selected logo", my: "ရွေးထားသော လိုဂိုကို ဖယ်ရှားရန်" },
  "reg.logo.note": {
    en: "Each form needs a logo. If your club already has a logo, it will not be changed. The organisers can change it.",
    my: "ဖောင်တိုင်းတွင် လိုဂို လိုအပ်ပါသည်။ ကလပ်တွင် လိုဂို ရှိပြီးသားဖြစ်ပါက မပြောင်းလဲပါ။ စီစဉ်သူများက ပြောင်းလဲပေးနိုင်ပါသည်။",
  },
  "reg.submitting": { en: "Sending…", my: "ပို့နေသည်…" },
  "reg.submitMany": { en: "Register teams", my: "အသင်းများ စာရင်းသွင်းရန်" },
  "reg.submitOne": { en: "Register team", my: "အသင်း စာရင်းသွင်းရန်" },
  "reg.already": { en: "Already registered?", my: "စာရင်းသွင်းပြီးပြီလား?" },
  "reg.goMembers": { en: "Register your players", my: "ကစားသမားများ စာရင်းသွင်းရန်" },
  "reg.err.noLogo": { en: "Please choose a club logo.", my: "ကလပ် လိုဂို ရွေးပါ။" },
  "reg.err.logoType": {
    en: "Choose a PNG, JPEG, or WebP logo.",
    my: "PNG, JPEG သို့မဟုတ် WebP လိုဂိုကို ရွေးပါ။",
  },
  "reg.err.logoSize": {
    en: "The logo file must be 1 MB or smaller.",
    my: "လိုဂိုဖိုင်သည် 1 MB ထက် မကြီးရပါ။",
  },
  "reg.err.noTeams": {
    en: "No teams were saved. Please try again.",
    my: "အသင်း မသိမ်းရသေးပါ။ ပြန်ကြိုးစားပါ။",
  },
  "reg.err.save": {
    en: "Registration could not be saved. Please try again.",
    my: "စာရင်းသွင်း၍ မရပါ။ ပြန်ကြိုးစားပါ။",
  },

  // ===== 登録: 完了 =====
  "reg.done.memberEyebrow": { en: "PLAYERS ADDED", my: "ကစားသမားများ ထည့်ပြီး" },
  "reg.done.title": { en: "Registration complete", my: "စာရင်းသွင်းမှု ပြီးပါပြီ" },
  "reg.done.memberText": {
    en: "Your players were added to the team.",
    my: "ကစားသမားများကို အသင်းထဲ ထည့်ပြီးပါပြီ။",
  },
  "reg.done.backMembers": { en: "Back to team players", my: "အသင်း ကစားသမားများ စာမျက်နှာသို့" },
  "reg.done.eyebrow": { en: "REGISTRATION RECEIVED", my: "စာရင်းသွင်းမှု လက်ခံရရှိပြီး" },
  "reg.done.teamTitle": { en: "You’re registered", my: "စာရင်းသွင်းပြီးပါပြီ" },
  "reg.done.club": { en: "Club", my: "ကလပ်" },
  "reg.done.team": { en: "Team", my: "အသင်း" },
  "reg.done.teams": { en: "Teams", my: "အသင်းများ" },
  "reg.done.rep": { en: "Representative", my: "ကိုယ်စားလှယ်" },
  "reg.done.deadline": {
    en: "Player registration deadline",
    my: "ကစားသမား စာရင်းသွင်းရန် နောက်ဆုံးရက်",
  },
  "reg.done.registerMembers": { en: "Register players", my: "ကစားသမားများ စာရင်းသွင်းရန်" },
  "reg.done.another": {
    en: "Register another team for this club",
    my: "ဤကလပ်အတွက် အခြားအသင်း စာရင်းသွင်းရန်",
  },

  // ===== 登録: 代表者確認 =====
  "reg.verify.eyebrow": { en: "PLAYER REGISTRATION", my: "ကစားသမား စာရင်းသွင်းခြင်း" },
  "reg.verify.title": { en: "Verify your team", my: "သင့်အသင်းကို အတည်ပြုပါ" },
  "reg.verify.intro": {
    en: "Enter the email address and phone number you used when you registered your team.",
    my: "အသင်း စာရင်းသွင်းစဉ်က အသုံးပြုခဲ့သော အီးမေးလ်နှင့် ဖုန်းနံပါတ်ကို ထည့်ပါ။",
  },
  "reg.verify.checking": { en: "Checking…", my: "စစ်ဆေးနေသည်…" },
  "reg.verify.submit": { en: "Verify", my: "အတည်ပြုရန်" },
  "reg.verify.select": { en: "Choose your team", my: "သင့်အသင်းကို ရွေးပါ" },
  "reg.verify.continue": { en: "Continue", my: "ဆက်သွားရန်" },
  "reg.verify.failed": {
    en: "We could not verify your team. Please try again.",
    my: "သင့်အသင်းကို အတည်ပြု၍ မရပါ။ ပြန်ကြိုးစားပါ။",
  },

  // ===== 登録: メンバー登録 =====
  "reg.members.expired": {
    en: "Your session has ended. Please verify your team again.",
    my: "အချိန်ကုန်သွားပါပြီ။ သင့်အသင်းကို ထပ်မံ အတည်ပြုပါ။",
  },
  "reg.members.loadError": {
    en: "Could not load your players.",
    my: "ကစားသမားများကို ဖွင့်၍ မရပါ။",
  },
  "reg.members.bothFields": {
    en: "Enter both the name and the shirt number for each player.",
    my: "ကစားသမားတိုင်းအတွက် အမည်နှင့် အင်္ကျီနံပါတ် နှစ်ခုလုံး ထည့်ပါ။",
  },
  "reg.members.atLeastOne": {
    en: "Enter at least one player.",
    my: "ကစားသမား အနည်းဆုံး တစ်ဦး ထည့်ပါ။",
  },
  "reg.members.saveError": {
    en: "The players could not be registered.",
    my: "ကစားသမားများကို စာရင်းသွင်း၍ မရပါ။",
  },
  "reg.members.endError": {
    en: "Could not end this session. Please try again.",
    my: "ဤအကြိမ်ကို ပိတ်၍ မရပါ။ ပြန်ကြိုးစားပါ။",
  },
  "reg.members.loading": { en: "Loading your team…", my: "သင့်အသင်းကို ဖွင့်နေသည်…" },
  "reg.members.countLabel": { en: "Registered players:", my: "စာရင်းသွင်းပြီး ကစားသမား:" },
  "reg.members.deadline": { en: "Deadline: {date}", my: "နောက်ဆုံးရက်: {date}" },
  "reg.members.closed": {
    en: "Player registration is closed.",
    my: "ကစားသမား စာရင်းသွင်းချိန် ပြီးဆုံးပါပြီ။",
  },
  "reg.members.playerName": { en: "Player name", my: "ကစားသမား အမည်" },
  "reg.members.backNumber": { en: "Shirt number", my: "အင်္ကျီနံပါတ်" },
  "reg.members.saving": { en: "Saving…", my: "သိမ်းနေသည်…" },
  "reg.members.submit": { en: "Register players", my: "ကစားသမားများ စာရင်းသွင်းရန်" },
  "reg.members.full": {
    en: "This team has the maximum number of players (11).",
    my: "ဤအသင်းတွင် ကစားသမား အများဆုံး (11 ဦး) ပြည့်ပါပြီ။",
  },
  "reg.members.switch": { en: "Verify a different team", my: "အခြားအသင်းကို အတည်ပြုရန်" },

  // ===== サーバーのエラー（code ごと） =====
  "err.generic": {
    en: "Something went wrong. Please try again.",
    my: "တစ်ခုခု မှားယွင်းနေပါသည်။ ပြန်ကြိုးစားပါ။",
  },
  "err.network": {
    en: "Could not reach the server. Check your connection and try again.",
    my: "ဆာဗာနှင့် ချိတ်ဆက်၍ မရပါ။ အင်တာနက်ကို စစ်ဆေးပြီး ပြန်ကြိုးစားပါ။",
  },
  "err.INVALID_INPUT": {
    en: "Some details are not valid. Please check and try again.",
    my: "အချက်အလက် အချို့ မမှန်ကန်ပါ။ စစ်ဆေးပြီး ပြန်ကြိုးစားပါ။",
  },
  "err.REQUIRED_FIELD": {
    en: "Please fill in all required fields.",
    my: "လိုအပ်သော အကွက်အားလုံး ဖြည့်ပါ။",
  },
  "err.INVALID_EMAIL": { en: "Enter a valid email address.", my: "မှန်ကန်သော အီးမေးလ် ထည့်ပါ။" },
  "err.INVALID_PHONE": { en: "Enter a valid phone number.", my: "မှန်ကန်သော ဖုန်းနံပါတ် ထည့်ပါ။" },
  "err.INVALID_TEAM_COUNT": {
    en: "Enter between 1 and 40 team names.",
    my: "အသင်းအမည် 1 မှ 40 အထိ ထည့်ပါ။",
  },
  "err.REQUIRED_LOGO": { en: "A club logo is required.", my: "ကလပ် လိုဂို လိုအပ်ပါသည်။" },
  "err.INVALID_LOGO_TYPE": {
    en: "The logo must be PNG, JPEG, or WebP.",
    my: "အသင်း Logo Fileသည် PNG, JPEG သို့မဟုတ် WebP ဖြစ်ရပါမည်။",
  },
  "err.INVALID_LOGO": {
    en: "The logo file is not valid or is larger than 1 MB.",
    my: "အသင်း Logo File မမှန်ကန်ပါ သို့မဟုတ် 1 MB ထက် ကြီးနေပါသည်။",
  },
  "err.DUPLICATE_TEAM": {
    en: "A team with this name is already registered. Please use a different name.",
    my: "ဤအမည်ဖြင့် အသင်း စာရင်းသွင်းပြီးဖြစ်သည်။ အခြားအမည် သုံးပါ။",
  },
  "err.DUPLICATE_CLUB": {
    en: "A club with this name is already registered.",
    my: "ဤအမည်ဖြင့် ကလပ် စာရင်းသွင်းပြီးဖြစ်သည်။",
  },
  "err.TOO_MANY_ATTEMPTS": {
    en: "Too many tries. Please wait 15 minutes and try again.",
    my: "သတ်မှတ်ထားသည့် အကြိမ်အရေအတွက်ထက်ကျော်လွန်သွားပါသဖြင့် နောက် ၁၅ မိနစ် စောင့်ပြီး ပြန်ကြိုးစားပါ။",
  },
  "err.CONTACT_NOT_VERIFIED": {
    en: "We could not find a team with this email and phone number. Please check them.",
    my: "ဤအီးမေးလ်နှင့် ဖုန်းနံပါတ်ဖြင့် အသင်း မတွေ့ပါ။ ပြန်လည်စစ်ဆေးပါ။",
  },
  "err.VERIFY_REQUIRED": {
    en: "Please verify your team again.",
    my: "သင့်အသင်းကို ထပ်မံ အတည်ပြုပါ။",
  },
  "err.FORBIDDEN": {
    en: "You cannot change this team. Please verify again.",
    my: "ဤအသင်းကို ပြောင်းလဲ၍ မရပါ။ ထပ်မံ အတည်ပြုပါ။",
  },
  "err.TEAM_NOT_FOUND": { en: "The team was not found.", my: "အသင်း မတွေ့ပါ။" },
  "err.CLUB_NOT_FOUND": { en: "The club was not found.", my: "ကလပ် မတွေ့ပါ။" },
  "err.TEAM_FULL": {
    en: "A team can have up to 11 players.",
    my: "အသင်းတစ်သင်းတွင် ကစားသမား 11 ဦးအထိသာ ရှိနိုင်သည်။",
  },
  "err.DUPLICATE_BACK_NUMBER": {
    en: "Each player needs a different shirt number.",
    my: "ကစားသမားတိုင်း အင်္ကျီနံပါတ် မတူညီရပါ။",
  },
  "err.REGISTRATION_FULL": {
    en: "Registration is full, or there are not enough places for all your teams.",
    my: "စာရင်းသွင်းမှု ပြည့်နေပါသည်",
  },
  "err.REGISTRATION_CLOSED": {
    en: "Team registration closed on 6 December 2026 at 23:59.",
    my: "2026 ဒီဇင်ဘာ 6 · 23:59 အထိသာ အသင်းစာရင်ပေးသွင်းနိုင်မည်ဖြစ်ပါသည်",
  },
  "err.MEMBER_REGISTRATION_CLOSED": {
    en: "Player registration closed on 12 December 2026 at 23:59 .",
    my: "ကစားသမား စာရင်းသွင်းချိန် 2026 ဒီဇင်ဘာ 12 · 23:59 အထိသာစာရင်းပေးသွင်းနိုင်ပါမည်ဖြစ်ပါသည်",
  },
} as const satisfies Record<string, { en: string; my?: string }>;

export type MessageKey = keyof typeof messages;
