import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { EVENT_BASE_PATH, REGISTRATION_BASE_PATH, getTournamentId } from "./config";
import { RegistrationApp } from "./pages/Registration";
import "./styles.css";

const isRegistrationPage = window.location.pathname.startsWith(`${REGISTRATION_BASE_PATH}/`);
const tournamentBasePath = `/${getTournamentId(window.location.pathname)}`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter
      basename={isRegistrationPage ? REGISTRATION_BASE_PATH : tournamentBasePath || EVENT_BASE_PATH}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {isRegistrationPage ? <RegistrationApp /> : <App />}
    </BrowserRouter>
  </StrictMode>,
);
