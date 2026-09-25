export const TOURNAMENT_TIME_ZONE = "Asia/Tokyo";

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: TOURNAMENT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
