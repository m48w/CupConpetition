const ROUTE_PREFIX = "/u/";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function routeKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptRoute(route: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await routeKey(secret),
    new TextEncoder().encode(route),
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return `${ROUTE_PREFIX}${toBase64Url(combined)}`;
}

export async function decryptRoute(token: string, secret: string): Promise<string | null> {
  try {
    const combined = fromBase64Url(token);
    if (combined.length <= 12 + 16) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: combined.slice(0, 12) },
      await routeKey(secret),
      combined.slice(12),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

export function isPublicRoute(route: string): boolean {
  const path = route.split(/[?#]/, 1)[0];
  return (
    path === "/" ||
    path === "/test" ||
    path.startsWith("/test/") ||
    path === "/superadmin" ||
    path === "/subadmin" ||
    path === "/20261220" ||
    path.startsWith("/20261220/") ||
    path === "/registration/20261220" ||
    path.startsWith("/registration/20261220/") ||
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/registration" ||
    path.startsWith("/registration/")
  );
}

export function isEncryptedRoute(pathname: string): boolean {
  return pathname.startsWith(ROUTE_PREFIX) && pathname.length > ROUTE_PREFIX.length;
}
