import { readConfig } from "./config.js";
import { handleGet } from "./http.js";
import { handlePost } from "./interactions.js";

export default {
  async fetch(request, env, ctx) {
    const config = readConfig(env);
    if (request.method === "GET") return handleGet(request, config);
    if (request.method === "POST") return handlePost(request, config, ctx);
    return new Response("method", { status: 405 });
  },
};
