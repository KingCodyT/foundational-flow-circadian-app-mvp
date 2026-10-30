/** Only fixed diagnostic labels may leave this module; never return provider text. */
export async function qstashErrorCategory(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "unclassified";
  const chunks: Uint8Array[] = [];
  let length = 0;
  const deadline = setTimeout(() => { void reader.cancel().catch(() => {}); }, 1000);
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) return "response_too_large";
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let payload: unknown;
    try { payload = JSON.parse(new TextDecoder().decode(bytes)); } catch { return "unclassified"; }
    if (!payload || typeof payload !== "object" || !("error" in payload) || typeof payload.error !== "string") return "unclassified";
    const message = payload.error.toLowerCase();
    // These are hints from provider wording, not proof of the root cause.
    if (/deduplication|deduplication-id/.test(message)) return "deduplication_rejected";
    if (/not-before|delay|scheduled time/.test(message)) return "schedule_rejected";
    if (/destination|invalid url|url group/.test(message)) return "destination_rejected";
    if (/quota|rate limit|daily limit|message limit/.test(message)) return "limit_reached";
    if (/unauthorized|authentication|invalid token/.test(message)) return "authentication_rejected";
    if (/header/.test(message)) return "header_rejected";
    return "unclassified";
  } catch { return "unclassified"; }
  finally { clearTimeout(deadline); void reader.cancel().catch(() => {}); }
}
