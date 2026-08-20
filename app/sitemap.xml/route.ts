const SITE = "https://sorteos.chicken.huertadigital.net.pe";

export async function GET() {
  const updated = new Date().toISOString();
  const pages = [
    { path: "", priority: "1.0", frequency: "daily" },
    { path: "/bases-legales", priority: "0.5", frequency: "monthly" },
    { path: "/privacidad", priority: "0.3", frequency: "yearly" },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url>
    <loc>${SITE}${page.path}</loc>
    <lastmod>${updated}</lastmod>
    <changefreq>${page.frequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
