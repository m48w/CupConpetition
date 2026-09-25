import { TournamentRoom } from "./room";

export { TournamentRoom };

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return env.TOURNAMENT.get(env.TOURNAMENT.idFromName("main")).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
