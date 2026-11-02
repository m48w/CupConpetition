import { useI18n } from "../../i18n/useI18n";
import type { RegistrationStatus } from "./useRegistrationStatus";

/** 「12 / 40 teams registered」と締め切り。満員・締め切り後はその案内。 */
export function RegistrationStatusNote({ status }: { status: RegistrationStatus | null }) {
  const { t } = useI18n();
  if (!status) return null;
  const remaining = Math.max(0, status.capacity - status.registeredTeams);
  return (
    <div className="registration-status" role="status">
      <strong>
        {t("status.count", { count: status.registeredTeams, capacity: status.capacity })}
      </strong>
      {status.teamRegistrationClosed ? (
        <span className="registration-status-closed">{t("status.closed")}</span>
      ) : status.isFull ? (
        <span className="registration-status-closed">{t("status.full")}</span>
      ) : (
        <>
          <span>{t("status.remaining", { count: remaining })}</span>
          <span>{t("status.deadline")}</span>
        </>
      )}
    </div>
  );
}
