import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Announcement, AnnouncementLevel } from "../../../types";
import { ApiError, requestJson } from "../../../utils/http";

/** Super Admin のお知らせ管理（英語のみの管理画面）。変更は WebSocket で全員にすぐ届く。 */
export function AnnouncementsPanel({ disabled }: { disabled: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [bodyEn, setBodyEn] = useState("");
  const [bodyMy, setBodyMy] = useState("");
  const [level, setLevel] = useState<AnnouncementLevel>("info");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const body = await requestJson<{ announcements: Announcement[] }>("/api/admin/announcements");
    setItems(body.announcements);
  }, []);

  useEffect(() => {
    // The state update occurs after the API request resolves; this effect only starts loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => setError("Could not load announcements."));
  }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setError("");
    setBusy(true);
    try {
      await action();
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "The change could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await run(() =>
      requestJson("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ bodyEn, bodyMy, level }),
      }),
    );
    if (saved) {
      setBodyEn("");
      setBodyMy("");
      setLevel("info");
    }
  };

  const patch = (id: string, change: Partial<Announcement>) =>
    run(() =>
      requestJson(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(change),
      }),
    );

  const remove = (item: Announcement) => {
    if (!window.confirm(`Delete this announcement?\n\n${item.bodyEn}`)) return;
    void run(() =>
      requestJson(`/api/admin/announcements/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        body: "{}",
      }),
    );
  };

  const off = disabled || busy;
  return (
    <section className="admin-panel announcements-panel">
      <label>ANNOUNCEMENTS</label>
      <p className="muted">
        Shown at the top of the public pages (newest 3). Myanmar text is optional — English is shown
        if it is empty.
      </p>
      <form className="announcement-form" onSubmit={(event) => void create(event)}>
        <label className="login-field">
          <span>English (required)</span>
          <textarea
            value={bodyEn}
            maxLength={300}
            rows={2}
            required
            onChange={(event) => setBodyEn(event.target.value)}
          />
        </label>
        <label className="login-field">
          <span>Myanmar</span>
          <textarea
            lang="my"
            value={bodyMy}
            maxLength={300}
            rows={2}
            onChange={(event) => setBodyMy(event.target.value)}
          />
        </label>
        <label className="login-field">
          <span>Type</span>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value as AnnouncementLevel)}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
          </select>
        </label>
        <button className="primary-button" type="submit" disabled={off || !bodyEn.trim()}>
          Publish announcement
        </button>
      </form>
      {error && <div className="login-error">{error}</div>}
      <ul className="announcement-admin-list">
        {items.map((item) => (
          <li key={item.id} className={item.active ? "" : "inactive"}>
            <div>
              <strong>{item.level === "warning" ? "Warning" : "Info"}</strong>
              {!item.active && <span className="muted"> · hidden</span>}
              <p>{item.bodyEn}</p>
              {item.bodyMy && <p lang="my">{item.bodyMy}</p>}
            </div>
            <div className="announcement-admin-actions">
              <button
                type="button"
                className="outline-button"
                disabled={off}
                onClick={() => void patch(item.id, { active: !item.active })}
              >
                {item.active ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                className="outline-button"
                disabled={off}
                onClick={() => remove(item)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="muted">No announcements yet.</li>}
      </ul>
    </section>
  );
}
