import { useI18n } from "../../../i18n/useI18n";
import type { ConnectionState } from "../hooks/useTournamentState";

export function ConnectionBanner({
  connection,
  error,
}: {
  connection: ConnectionState;
  error: string | null;
}) {
  const { t } = useI18n();
  if (connection === "live" && !error) return null;

  const tone = error ? "error" : connection;
  const message = error ?? (connection === "connecting" ? t("conn.connecting") : t("conn.offline"));

  return <div className={`connection-banner ${tone}`}>{message}</div>;
}
