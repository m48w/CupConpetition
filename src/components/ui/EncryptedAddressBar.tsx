import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function EncryptedAddressBar({ basePath = "" }: { basePath?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialized = useRef(false);
  const skipNextWrite = useRef(false);
  const writeId = useRef(0);

  const cleanBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  const fullPath = `${cleanBase}${location.pathname.startsWith("/") ? "" : "/"}${location.pathname}`;
  const fullRoute = `${fullPath}${location.search}${location.hash}`;

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const canonicalRoute = (event.state as { __canonicalPath?: string } | null)?.__canonicalPath;
      if (canonicalRoute) {
        writeId.current += 1;
        skipNextWrite.current = true;
        const targetRoute =
          cleanBase && canonicalRoute.startsWith(cleanBase)
            ? canonicalRoute.slice(cleanBase.length) || "/"
            : canonicalRoute;
        navigate(targetRoute, { replace: true });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [cleanBase, navigate]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const currentUrl = window.location.href;
      const state = { __canonicalPath: fullRoute };
      if (window.location.pathname.startsWith("/u/")) {
        window.history.replaceState(state, "", currentUrl);
      } else {
        const id = ++writeId.current;
        void fetch("/api/route-token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ route: fullRoute }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error("Could not encrypt this route.");
            return (await response.json()) as { url: string };
          })
          .then(({ url }) => {
            if (id === writeId.current) window.history.replaceState(state, "", url);
          })
          .catch((error: unknown) => console.error(error));
      }
      return;
    }
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }

    const id = ++writeId.current;
    void fetch("/api/route-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ route: fullRoute }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not encrypt this route.");
        return (await response.json()) as { url: string };
      })
      .then(({ url }) => {
        if (id === writeId.current) {
          window.history.pushState({ __canonicalPath: fullRoute }, "", url);
        }
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [fullRoute]);

  return null;
}
