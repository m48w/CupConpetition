import { useEffect, useState } from "react";

const ADMIN_PASSWORD = "VELOCITY-DEMO-ONLY";
const ADMIN_STORAGE_KEY = "cupflow-admin-authed";

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(
    () => localStorage.getItem(ADMIN_STORAGE_KEY) === "true",
  );

  useEffect(() => {
    localStorage.setItem(ADMIN_STORAGE_KEY, String(isAdmin));
  }, [isAdmin]);

  const login = (password: string) => {
    if (password !== ADMIN_PASSWORD) {
      return false;
    }

    setIsAdmin(true);
    return true;
  };

  const logout = () => {
    setIsAdmin(false);
  };

  return { isAdmin, login, logout };
}
