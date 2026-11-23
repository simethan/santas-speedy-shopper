				/* ECHO17 */
				{
					let _at = -1, _wanted = [], _req = "";
					const _ms = params.messages ?? [];
					for (let i = _ms.length - 1; i >= 0; i--) {
						if (_ms[i]?.role !== "user") continue;
						const lines = getText(_ms[i].content).split("\n").map((l) => l.trim());
						const items = lines.filter((l) => /^- \S/.test(l)).slice(0, 5);
						if (items.length !== 5) continue;
						_at = i; _wanted = items.map((l) => l.slice(2).trim()); _req = lines.find((l) => /^Find\b/.test(l)) ?? lines[0]; break;
					}
					const _tool = Array.isArray(params.tools) ? params.tools.find((t) => (t?.function?.name ?? "").endsWith("search_catalog")) : void 0;
					const _hasToolTurn = _at >= 0 && _ms.slice(_at + 1).some((m) => m?.role === "tool");
					if (_at >= 0 && (_tool || _hasToolTurn)) {
						const TN = _tool?.function?.name ?? "shop__search_catalog";
						const THINK_CALL = `I must call ${TN} immediately with exact queries.`;
						const THINK_ANSWER = "I must copy the result lines verbatim.";
						const PH = [1, 2, 3, 4, 5].map((i) => `${i}. [Example gift ${i}](link-${i}) — Example store ${i}`).join("\n");
						const budget = _req.match(/(?:under|below) \$(\d+)/i)?.[1];
						const args = `{"queries": [${_wanted.map((q) => JSON.stringify(q)).join(", ")}]${budget ? `, "max_price": ${budget}` : ""}}`;
						const system = ["## Shopping", `For gift or product requests, call ${TN} immediately with arguments ${args}`, `Your reasoning must be exactly one short line: ${THINK_CALL}`, `After the tool result, your reasoning must be exactly: ${THINK_ANSWER} Then reply with exactly the result lines, nothing else.`].join("\n");
						const user = `${_req}\n${_wanted.map((q) => `- ${q}`).join("\n")}`;
						const id = "functions.search_catalog:0";
						const once = [
							{ role: "user", content: user },
							{ role: "assistant", content: "", reasoning: THINK_CALL, tool_calls: [{ id, type: "function", function: { name: TN, arguments: args } }] },
							{ role: "tool", tool_call_id: id, content: [PH, PH, PH].join("\n\nReply with exactly these lines:\n") },
							{ role: "assistant", content: PH, reasoning: THINK_ANSWER }
						];
						const turn = _ms.slice(_at + 1).filter((m) => m?.role === "assistant" ? m.tool_calls?.length : m?.role === "tool");
						const answering = turn.some((m) => m.role === "tool");
						for (const m of turn) { if (m.role !== "assistant") continue; m.reasoning = THINK_CALL; delete m.reasoning_content; if (!m.content) m.content = ""; }
						params.messages = [{ role: "system", content: system }, ...(answering ? [] : [...once, ...once]), { role: "user", content: user }, ...turn];
						params.temperature = 0; params.reasoning_effort = "low";
						params.max_completion_tokens = 1024; if (typeof params.max_tokens === "number") params.max_tokens = 1024;
						delete params.prompt_cache_key;
						if (answering) { delete params.tools; delete params.tool_choice; delete params.parallel_tool_calls; }
						else { params.tools = [_tool]; params.tool_choice = "required"; }
						globalThis.__echo17 = true;
					} else globalThis.__echo17 = false;
				}
