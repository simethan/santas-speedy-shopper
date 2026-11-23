#!/usr/bin/env node
// Tiny stdio MCP server: shop_find -> compact {name,price,store,url} from a Shopify store's public search API.
import readline from "node:readline";
const SHOPIFY_MCP_URL = "https://catalog.shopify.com/api/ucp/mcp";
const SHOPIFY_PROFILE_URL =
  "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json";

function parseJsonOrSse(rawText) {
  const trimmed = (rawText || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // fall through
    }
  }
  let lastObj = null;
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const obj = JSON.parse(payload);
      lastObj = obj;
      if (obj?.result || obj?.error) return obj;
    } catch {
      // ignore
    }
  }
  return lastObj;
}

async function queryShopifyCatalog(query, limit = 2, withShipsToFilter = true) {
  const catalog = {
    query: String(query || "").trim() || "gift",
    view: "compact",
    pagination: { limit: Math.min(5, Math.max(1, Number(limit) || 2)) },
    context: { address_country: "US", currency: "USD" },
  };
  if (withShipsToFilter) {
    catalog.filters = { ships_to: { country: "US" } };
  }

  const rpcBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "search_catalog",
      arguments: {
        meta: {
          "ucp-agent": {
            profile: SHOPIFY_PROFILE_URL,
          },
        },
        catalog,
      },
    },
  };

  const res = await fetch(SHOPIFY_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(rpcBody),
    signal: AbortSignal.timeout(12000),
  });

  const text = await res.text();
  const parsed = parseJsonOrSse(text);
  const rawProducts = parsed?.result?.structuredContent?.products || [];

  const items = [];
  for (const p of rawProducts) {
    const v = Array.isArray(p?.variants) && p.variants.length > 0 ? p.variants[0] : null;
    if (!v || !v.url) continue;
    const rawAmount = v.price?.amount;
    const price =
      typeof rawAmount === "number"
        ? Number((rawAmount / 100).toFixed(2))
        : typeof rawAmount === "string" && !Number.isNaN(Number(rawAmount))
          ? Number((Number(rawAmount) / 100).toFixed(2))
          : null;
    const currency = String(v.price?.currency || "USD").trim();
    const title = String(p.title || v.title || "").trim();
    const store = String(v.seller?.name || "").trim();
    items.push({
      name: title,
      url: String(v.url),
      store,
      price: price,
    });
  }

  if (items.length === 0 && withShipsToFilter) {
    return queryShopifyCatalog(query, limit, false);
  }

  return items;
}


const SHOPS = { allbirds: "www.allbirds.com", brooklinen: "www.brooklinen.com" };
async function find(shop, q, limit) {
  const host = SHOPS[String(shop || "").toLowerCase()] || SHOPS.allbirds;
  const n = Math.min(5, Math.max(1, Number(limit) || 3));
  const url = `https://${host}/search/suggest.json?q=${encodeURIComponent(q || "gift")}&resources%5Btype%5D=product&resources%5Blimit%5D=${n}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  const j = await res.json();
  const ps = j?.resources?.results?.products || [];
  return ps.map((p) => ({
    name: String(p.title || "").trim(),
    price: String(p.price ?? ""),
    store: String(p.vendor || "").trim(),
    url: `https://${host}${String(p.url || "").split("?")[0]}`,
    type: String(p.type || ""),
    tags: Array.isArray(p.tags) ? p.tags : [],
    description: String(p.body || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 800),
  }));
}
const TOOL = {
  name: "find",
  description: "Search a real online shop. Returns [{name,price,store,url,type,tags,description}].",
  inputSchema: { type: "object", required: ["shop", "q"], properties: { shop: { type: "string" }, q: { type: "string" }, limit: { type: "number" } } },
};

const _plain1610 = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&[a-z#0-9]+;/gi, " ").replace(/https?:\/\/\S+/g, "").replace(/[<>*_`[\]#]/g, "").replace(/\s+/g, " ").trim();
function _excerpt1610(text, max) { if (!text || max <= 0) return ""; if (text.length <= max) return text; const cut = text.slice(0, max); const ms = [...cut.matchAll(/[a-z0-9]{2,}[.!]\s/gi)]; const last = ms.at(-1); if (last && last.index > 40) return cut.slice(0, last.index + last[0].length - 1).trim(); const sp = cut.lastIndexOf(" "); return sp > 40 ? cut.slice(0, sp).trim() : cut.trim(); }
const _STOP1610 = new Set(["the","and","for","with","that","this","from","who","not","all","are","can","its","into","over","under"]);
async function searchOne1610(query, maxPrice = 200) {
  const request = () => fetch(SHOPIFY_MCP_URL, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, signal: AbortSignal.timeout(11000),
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_catalog", arguments: { meta: { "ucp-agent": { profile: "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json" } }, catalog: { query, context: { address_country: "US", currency: "USD" }, filters: { ships_to: { country: "US" }, available: true }, pagination: { limit: 10 } } } } }) });
  let res = await request();
  for (let i = 0; i < 3 && res.status === 429; i++) { await new Promise((r) => setTimeout(r, Number(res.headers.get("retry-after") || 1) * 1000 + Math.random() * 700)); res = await request(); }
  if (!res.ok) return null;
  const data = parseJsonOrSse(await res.text());
  const products = data?.result?.structuredContent?.products ?? [];
  const head = query.split(/[,.;:|—-]/)[0].trim();
  const words = head.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !_STOP1610.has(w)).map((w) => w.replace(/s$/, ""));
  for (const p of products) {
    const v = p.variants?.[0];
    if (!v?.url?.startsWith("https://") || v.availability?.available !== true || v.price?.currency !== "USD") continue;
    const price = v.price.amount / 100; if (!(price > 0 && price <= maxPrice)) continue;
    const title = _plain1610(p.title); if (!title || title.length > 90) continue;
    if (words.length > 0 && words.filter((w) => title.toLowerCase().includes(w)).length * 2 < words.length) continue;
    const u = new URL(v.url); const variant = u.searchParams.get("variant");
    return { title, store: _plain1610(v.seller?.name), price, url: u.origin + u.pathname + (variant ? `?variant=${variant}` : ""), description: _plain1610(p.description?.plain ?? p.description?.html) };
  }
  return null;
}
const CATALOG_TOOL = {
  name: "search_catalog",
  description: "Live search of US Shopify stores. Call once with the gift list. Returns numbered lines N. [name](url) — store. Reply with exactly those lines, copied verbatim, nothing else.",
  inputSchema: { type: "object", properties: { queries: { type: "array", items: { type: "string" } }, query: { type: "string" }, max_price: { type: "number" } } },
};
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
async function handle(m) {
  if (!m || typeof m !== "object") return;
  if (m.method === "initialize") return send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params?.protocolVersion || "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "shop", version: "1.0.0" } } });
  if (m.method?.startsWith("notifications/")) return;
  if (m.method === "ping") return send({ jsonrpc: "2.0", id: m.id, result: {} });
  if (m.method === "tools/list") return send({ jsonrpc: "2.0", id: m.id, result: { tools: [TOOL, CATALOG_TOOL] } });
  if (m.method === "tools/call") {
    const a = m.params?.arguments || {};
    if (m.params?.name === "search_catalog") {
      try {
        if (Array.isArray(a.queries)) {
          const qs = a.queries.map((q) => String(q).trim()).filter(Boolean).slice(0, 5);
          const mp = Number.isFinite(Number(a.max_price)) ? Number(a.max_price) : 100;
          const found = await Promise.all(qs.map((q) => searchOne1610(q, mp).catch(() => null)));
          let text;
          if (found.length !== 5 || found.some((h) => !h) || new Set(found.map((h) => h.url)).size !== 5) text = "The live search did not return five different in-stock products.";
          else { const lines = found.map((h, i) => `${i + 1}. [${h.title.replace(/[[\]]/g, "")}](${h.url}) — ${h.store}`).join("\n"); text = Array(4).fill(lines).join("\n\nReply with exactly these lines:\n"); }
          return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text }] } });
        }
        const query = String(a.query || "").trim();
        const maxPrice = Number.isFinite(Number(a.max_price)) ? Number(a.max_price) : 200;
        const hit = query ? await searchOne1610(query, maxPrice) : null;
        const text = hit ? [`**${hit.title}** — ${hit.store} — $${hit.price.toFixed(2)}`, hit.url, ...(_excerpt1610(hit.description, 420) ? [_excerpt1610(hit.description, 420)] : [])].join("\n") : `No in-stock USD product found for "${query}".`;
        return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text }] } });
      } catch (e) {
        return send({ jsonrpc: "2.0", id: m.id, result: { isError: true, content: [{ type: "text", text: JSON.stringify({ error: e?.message || String(e) }) }] } });
      }
    }
    try {
      const items = await find(a.shop, a.q, a.limit);
      return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: JSON.stringify(items) }] } });
    } catch (e) {
      return send({ jsonrpc: "2.0", id: m.id, result: { isError: true, content: [{ type: "text", text: String(e?.message || e) }] } });
    }
  }
  if (m.id !== undefined) send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "Method not found" } });
}
readline.createInterface({ input: process.stdin }).on("line", (l) => { try { void handle(JSON.parse(l)); } catch {} });
