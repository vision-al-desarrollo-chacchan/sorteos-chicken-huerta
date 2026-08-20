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

    // Google and older browsers commonly request this exact path.
    // Serve the official Chicken Huerta PNG logo here instead of returning 404.
    if (url.pathname === "/favicon.ico") {
      const faviconUrl = new URL("/favicon.png", url);
      const faviconRequest = new Request(faviconUrl, request);
      const faviconResponse = await handler.fetch(faviconRequest, env, ctx);
      const headers = new Headers(faviconResponse.headers);
      headers.set("cache-control", "public, max-age=86400");

      return new Response(faviconResponse.body, {
        status: faviconResponse.status,
        statusText: faviconResponse.statusText,
        headers,
      });
    }

    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

export default worker;
