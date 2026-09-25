import { exports } from "cloudflare:workers";
import { expect, test } from "vitest";

test("/api/* は Durable Object に届き、未定義のルートには JSON の 404 を返す", async () => {
  const response = await exports.default.fetch("http://localhost/api/nope");
  expect(response.status).toBe(404);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual({ error: "no route for GET /api/nope" });
});
