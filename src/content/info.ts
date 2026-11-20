import type { Lang } from "../i18n/translate";

/**
 * Home の下の「大会情報」の中身。プログラムを読まなくても、このファイルだけ直せばよい。
 *
 * - 英語（en）とミャンマー語（my）を同じ形で書く。
 * - 問い合わせ先（メールなど）が無ければ contact を空の配列 [] にする。Contact には Facebook のリンクだけ出る。
 * - 住所は日本語のまま `addressJa` に書く（タクシーなどで見せられるように）。
 */
export interface InfoContent {
  date: string;
  time: string;
  venue: { name: string; address: string };
  /** 例: { label: "Email", value: "info@example.com" } */
  contact: { label: string; value: string }[];
}

/** 言語に関係なく同じもの。 */
export const venue = {
  addressJa: "〒553-0001 大阪府大阪市福島区海老江８丁目１６",
  mapUrl: "https://maps.app.goo.gl/k6uMpg4X18z44hNT9",
};

/** Contact に出す SNS のリンク（言語に関係なく同じ）。 */
export const social = {
  facebook: "https://www.facebook.com/profile.php?id=61590473070977",
};

export const info: Record<Lang, InfoContent> = {
  en: {
    date: "Sunday, 20 December 2026",
    time: "9:00 – 20:00",
    venue: {
      name: "FUT MESSE Ebie",
      address: "8-16 Ebie, Fukushima-ku, Osaka 553-0001, Japan",
    },
    contact: [],
  },
  my: {
    date: "2026 ဒီဇင်ဘာလ 20 ရက် (တနင်္ဂနွေနေ့)",
    time: "9:00 – 20:00",
    venue: {
      name: "FUT MESSE Ebie (ဧဘီယဲ)",
      address: "8-16 Ebie, Fukushima-ku, Osaka 553-0001, Japan",
    },
    contact: [],
  },
};
