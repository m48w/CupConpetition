import { DurableObject } from "cloudflare:workers";
import { jsonResponse } from "./http";

export class TournamentRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    return jsonResponse(404, { error: `no route for ${request.method} ${url.pathname}` });
  }
}
