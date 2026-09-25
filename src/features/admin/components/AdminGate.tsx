import { useState, type FormEvent } from "react";

export function AdminGate({ onUnlock }: { onUnlock: (password: string) => boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onUnlock(password)) {
      setError("Incorrect password.");
      return;
    }
  };

  return (
    <div className="admin-gate">
      <div className="admin-gate-card">
        <div className="eyebrow">RESTRICTED AREA</div>
        <h1>Super Admin required</h1>
        <p>Enter the tournament control password to manage fixtures and live scores.</p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="Password"
          />
          <div className="login-hint">Demo access key: VELOCITY-DEMO-ONLY</div>
          {error && <div className="login-error">{error}</div>}
          <button className="primary-button" type="submit">
            Access console
          </button>
        </form>
      </div>
    </div>
  );
}
