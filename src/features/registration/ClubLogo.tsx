import { useState } from "react";
import { tournamentScopedUrl } from "../../config";

/**
 * 登録チームのクラブロゴ。ロゴが無いとき・読み込めないときは「FC」のバッジにする。
 */
export function ClubLogo({
  clubId,
  logoId,
  alt,
  className,
}: {
  clubId: string;
  logoId: string | null;
  alt: string;
  /** 画像とバッジの両方に付けるクラス（大きさの指定など）。 */
  className: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!logoId || failed === logoId) {
    return <span className={`team-crest ${className}`}>FC</span>;
  }
  return (
    <img
      className={className}
      src={tournamentScopedUrl(`/api/registration/clubs/${encodeURIComponent(clubId)}/logo`)}
      alt={alt}
      onError={() => setFailed(logoId)}
    />
  );
}
