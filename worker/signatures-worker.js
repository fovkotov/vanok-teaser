/**
 * Shared custom-seal catalog. Same shape as serve.py /api/signatures.
 * Bind a KV namespace as SIGNATURES, then set the teaser's fetch URL
 * if it should talk to this worker instead of /api/signatures.
 */
const MAX_ITEMS = 80;
const MAX_SRC = 1_500_000;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function clean(item) {
  if (!item || (item.kind !== "stamp" && item.kind !== "apple")) return null;
  if (typeof item.src !== "string" || item.src.length > MAX_SRC || !item.id) return null;
  return {
    id: String(item.id),
    kind: item.kind,
    src: item.src,
    castHex: Number(item.castHex) || 0,
    colorName: String(item.colorName || ""),
    text: String(item.text || "").slice(0, 160),
    createdAt: Number(item.createdAt) || 0,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }
    if (url.pathname !== "/signatures" && url.pathname !== "/api/signatures") {
      return json({ error: "not found" }, 404);
    }
    const current = (await env.SIGNATURES.get("list", "json")) || [];
    if (request.method === "GET") return json(current);
    if (request.method !== "POST") return json({ error: "method" }, 405);
    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "json" }, 400);
    }
    const item = clean(payload);
    if (!item) return json({ error: "item" }, 400);
    const next = [item, ...current.filter((row) => row.id !== item.id)].slice(0, MAX_ITEMS);
    await env.SIGNATURES.put("list", JSON.stringify(next));
    return json(item);
  },
};
