import { useCallback, useEffect, useState } from "react";

/** Chrome・Edge（Android・PC）が出す「インストールしてよいか」のイベント。 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  /** ボタンを押すとインストール画面が出る（Android Chrome など）。 */
  | "available"
  /** iPhone・iPad の Safari。ボタンでは入れられないので手順を出す。 */
  | "ios"
  /** すでにホーム画面のアプリとして開いている。 */
  | "installed"
  /** ブラウザが対応していない、まだ準備できていない。メニューの手順を出す。 */
  | "manual";

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS の Safari は Mac と名乗るので、タッチの有無で見分ける。
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

/** 「ホーム画面に追加」の状態と、押したときの処理。 */
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // ブラウザが勝手に出す案内を止めて、メニューのボタンから出す。
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    // 一度使ったイベントはもう使えない。
    setPromptEvent(null);
    if (choice.outcome === "accepted") setInstalled(true);
  }, [promptEvent]);

  const state: InstallState = installed
    ? "installed"
    : promptEvent
      ? "available"
      : isIos()
        ? "ios"
        : "manual";

  return { state, install };
}
