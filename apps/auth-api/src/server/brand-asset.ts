/** The upstream wordmark still says OpenBot. Do not publish it as an OpenBotFR asset. */
export function brandAssetResponse(_fileName: string): Response {
  return new Response("Brand exports are unavailable", {
    status: 410,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
