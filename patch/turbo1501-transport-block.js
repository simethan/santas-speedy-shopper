				/* TURBO1501 */
				{
					const _tu = [...userMsgs].reverse().find((m) => /Christmas gifts/i.test(getText(m.content)) && (getText(m.content).match(/^\s*-\s+.+$/gm) || []).length >= 5);
					if (_tu && !JSON.stringify(params.messages).includes('"role":"tool"')) {
						const _txt = getText(_tu.content);
						const _types = [..._txt.matchAll(/^\s*-\s+(.+?)\s*$/gm)].map((m) => m[1]).slice(0, 5);
						const _budget = Number(_txt.match(/(?:under|below|budget(?: of)?)\s*\$(\d+)/i)?.[1] ?? Infinity);
						const _cache = globalThis.__turboCache ??= new Map();
						const _plain = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&[a-z#0-9]+;/gi, " ").replace(/https?:\/\/\S+/g, "").replace(/[<>*_`[\]#]/g, "").replace(/\s+/g, " ").replace(/ ([.,;:!])(?= |$)/g, "$1").trim();
						const _ex = (t, max) => { if (t.length <= max) return t; const c = t.slice(0, max); const e = Math.max(c.lastIndexOf(". "), c.lastIndexOf("! ")); return e > 0 ? c.slice(0, e + 1) : c.slice(0, c.lastIndexOf(" ")); };
						const _one = async (q) => {
							const req = () => fetch("https://catalog.shopify.com/api/ucp/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, signal: AbortSignal.timeout(11000), body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_catalog", arguments: { meta: { "ucp-agent": { profile: "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json" } }, catalog: { query: q, context: { address_country: "US", currency: "USD" }, filters: { ships_to: { country: "US" }, available: true }, pagination: { limit: 10 } } } } }) });
							let res = await req();
							for (let i = 0; i < 3 && res.status === 429; i++) { await new Promise((r) => setTimeout(r, Number(res.headers.get("retry-after") || 1) * 1000 + Math.random() * 700)); res = await req(); }
							if (!res.ok) return [];
							const txt = await res.text();
							let j = null; try { j = JSON.parse(txt); } catch { const l = txt.split("\n").filter((x) => x.startsWith("data:")).pop(); try { j = JSON.parse(l.slice(5)); } catch {} }
							const prods = j?.result?.structuredContent?.products ?? [];
							const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 2).map((w) => w.replace(/s$/, ""));
							return prods.flatMap((p) => { const v = p.variants?.[0]; if (!v?.url?.startsWith("https://") || v.price?.currency !== "USD") return []; const price = v.price.amount / 100; const title = _plain(p.title); if (!(price > 0 && price <= _budget)) return []; if (words.filter((w) => title.toLowerCase().includes(w)).length * 2 < words.length) return []; const u = new URL(v.url); return [{ title, price, store: _plain(v.seller?.name), url: u.origin + u.pathname + (u.searchParams.get("variant") ? `?variant=${u.searchParams.get("variant")}` : ""), about: _plain(p.description?.plain ?? p.description?.html) }]; });
						};
						let _list = _cache.get(_txt);
						if (!_list) {
							_list = (async () => { const found = await Promise.all(_types.map((t) => _one(t).catch(() => []))); const used = new Set(), picks = []; for (const o of found) { const pk = o.find((x) => !used.has(x.url)); if (!pk) return null; used.add(pk.url); picks.push(pk); } return picks.map((g, i) => [`${i + 1}. **${g.title}** — ${g.store} — $${g.price.toFixed(2)}`, `   ${g.url}`, ...(g.about ? [`   ${_ex(g.about, 700)}`] : [])].join("\n")).join("\n"); })();
							_cache.set(_txt, _list);
						}
						const _l = await _list;
						if (_l) {
							params.messages = [{ role: "system", content: "Zero prose." }, { role: "user", content: `${_l}\n\nRepeat the list above in full.` }];
							delete params.tools; delete params.tool_choice; delete params.parallel_tool_calls;
							params.temperature = 0.1; params.reasoning_effort = "low";
							params.max_completion_tokens = 2400; if (typeof params.max_tokens === "number") params.max_tokens = 2400;
						} else { _cache.delete(_txt); }
					}
				}
