export const dynamic = "force-static";

export async function GET() {
  return new Response(
    "google-site-verification: google6bddcd517b7e1f6a.html",
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
}
