/** Cloudflare Worker entry point for Sorteos Chicken Huerta. */
import handler from "vinext/server/app-router-entry";

const GOOGLE_VERIFICATION_PATH = "/google6bddcd517b7e1f6a.html";
const GOOGLE_VERIFICATION_BODY =
  "google-site-verification: google6bddcd517b7e1f6a.html";

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === GOOGLE_VERIFICATION_PATH) {
      return new Response(GOOGLE_VERIFICATION_BODY, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

export default worker;
