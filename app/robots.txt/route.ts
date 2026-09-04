const SITE = "https://sorteos.chicken.huertadigital.net.pe";

export async function GET() {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/admin/",
    `Sitemap: ${SITE}/sitemap.xml`,
    `Host: ${SITE}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
