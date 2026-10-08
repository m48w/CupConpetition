import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LoginForm } from "../features/auth";
import type { SessionInfo } from "../types";
import { NotFound } from "./NotFound";

export function AdminEntry({
  loading,
  session,
  signIn,
}: {
  loading: boolean;
  session: SessionInfo | null;
  signIn: (username: string, password: string) => Promise<unknown>;
}) {
  if (loading) return <p className="muted">Checking sign-in…</p>;
  if (session) return <Navigate to="/admin/dashboard" replace />;
  return (
    <LoginForm
      eyebrow="TOURNAMENT ADMIN"
      title="Admin sign in"
      description="Sign in with your Super Admin or Sub-admin account."
      onSubmit={signIn}
    />
  );
}

export function AdminDashboard({
  loading,
  session,
  children,
}: {
  loading: boolean;
  session: SessionInfo | null;
  children: (session: SessionInfo) => ReactNode;
}) {
  if (loading) return <p className="muted">Checking sign-in…</p>;
  if (!session) return <Navigate to="/admin" replace />;
  return children(session);
}

export function ProtectedAdminNotFound({
  loading,
  session,
}: {
  loading: boolean;
  session: SessionInfo | null;
}) {
  if (loading) return <p className="muted">Checking sign-in…</p>;
  if (!session) return <Navigate to="/admin" replace />;
  return <NotFound />;
}
