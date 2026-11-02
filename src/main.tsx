import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import {
  EVENT_BASE_PATH,
  REGISTRATION_BASE_PATH,
  getTournamentId,
  setTournamentId,
} from "./config";
import { RegistrationApp } from "./pages/Registration";
import { TestSiteBanner } from "./components/ui/TestSiteBanner";
import { I18nProvider } from "./i18n/I18nProvider";
import "./styles.css";

// サイトルートは大会トップを開く（本番は Worker が 302 で転送する。これは開発サーバー用）。
if (window.location.pathname === "/" || window.location.pathname === "") {
  window.history.replaceState(null, "", `${EVENT_BASE_PATH}/${window.location.search}`);
}

const pathname = window.location.pathname;
const isRegistrationPage = pathname.startsWith(`${REGISTRATION_BASE_PATH}/`);
const tournamentId = getTournamentId(pathname);
// 大会IDは起動時に一度だけ決める。
setTournamentId(tournamentId);
const basename = isRegistrationPage ? REGISTRATION_BASE_PATH : `/${tournamentId}`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <I18nProvider>
        <TestSiteBanner />
        {isRegistrationPage ? <RegistrationApp /> : <App />}
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
