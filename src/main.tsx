import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { EVENT_BASE_PATH, REGISTRATION_BASE_PATH, getTournamentId } from "./config";
import { RegistrationApp } from "./pages/Registration";
import { EncryptedAddressBar } from "./components/ui/EncryptedAddressBar";
import "./styles.css";

const appRoute = (window as Window & { __APP_ROUTE__?: string }).__APP_ROUTE__;
let rawRoute =
  appRoute ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
let pathname = appRoute
  ? new URL(appRoute, window.location.origin).pathname
  : window.location.pathname;

if (pathname === "/" || pathname === "") {
  pathname = `${EVENT_BASE_PATH}/`;
  rawRoute = `${EVENT_BASE_PATH}/`;
}

const isRegistrationPage = pathname.startsWith(`${REGISTRATION_BASE_PATH}/`);
const tournamentBasePath = `/${getTournamentId(pathname)}`;
const currentBase = isRegistrationPage
  ? REGISTRATION_BASE_PATH
  : tournamentBasePath || EVENT_BASE_PATH;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter
      initialEntries={[rawRoute]}
      basename={currentBase}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <EncryptedAddressBar basePath={currentBase} />
      {isRegistrationPage ? <RegistrationApp /> : <App />}
    </MemoryRouter>
  </StrictMode>,
);
