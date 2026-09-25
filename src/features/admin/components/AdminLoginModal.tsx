import { useState, type FormEvent } from "react";

export function AdminLoginModal({ onClose, onUnlock }: { onClose: () => void; onUnlock: (password: string) => boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onUnlock(password)) {
      setError("Invalid password. Please try again.");
      return;
    }
  };

  return (
    <div className="admin-login-overlay" onClick={onClose}>
      <div className="admin-login-card" onClick={(event) => event.stopPropagation()}>
        <div className="login-header">
          <div>
            <div className="eyebrow">SUPER ADMIN ACCESS</div>
            <h2>Control room login</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Enter admin password" autoFocus />
          <div className="login-hint">Demo access key: VELOCITY-DEMO-ONLY</div>
          {error && <div className="login-error">{error}</div>}
          <button className="primary-button login-submit" type="submit">Unlock admin panel</button>
        </form>
      </div>
    </div>
  );
}
