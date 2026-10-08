import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="not-found">
      <div className="eyebrow">VELOCITY CUP 2026</div>
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <Link className="outline-button" to="/">
        Back to tournament
      </Link>
    </section>
  );
}
