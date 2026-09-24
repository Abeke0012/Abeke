/**
 * dashboard.js — web control panel for the agent (served at "/").
 *
 * Everything here sits behind HTTP Basic auth (DASHBOARD_USER / DASHBOARD_PASSWORD).
 * The WhatsApp webhook and /health are mounted separately in server.js and are
 * NOT affected by this auth.
 *
 *   GET  /                          Dashboard UI (public/index.html)
 *   GET  /api/overview              Status, stats, recent activity
 *   GET  /api/settings              Current settings + effective system prompt
 *   PUT  /api/settings              Update settings (persisted to SETTINGS_FILE_PATH)
 *   POST /api/prompt-preview        System prompt for unsaved (draft) settings
 *   GET  /api/conversations         Contacts with last message
 *   GET  /api/conversations/:phone  Full thread for one contact
 *   POST /api/send                  Operator (manual) reply to a contact
 *   POST /api/test                  Test chat: run the AI without WhatsApp or Excel
 *   GET  /api/events                Server-Sent Events: live activity + connection state
 *   GET  /api/export                Download the Excel workbook
 */

import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import { buildSystemPrompt, INTENTS, normalizePhone, SETTINGS_LIMITS, validateSettings } from "./agent.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const RECENT_EVENTS = 200;
const SUGGESTED_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "gpt-5-mini", "gpt-5"];

/**
 * @param {import("express").Express} app
 * @param {object} deps
 * @param {object} deps.config          Server config (mode, auth, paths).
 * @param {import("./agent.js").SettingsStore} deps.settings
 * @param {import("./agent.js").AgentPipeline} deps.pipeline
 * @param {import("./agent.js").ExcelStore} deps.excel
 * @param {import("./agent.js").AIAgent} deps.ai
 * @param {{name:string, send:Function, chatIdForPhone:(digits:string)=>string}} deps.transport
 * @param {import("node:events").EventEmitter & {snapshot:()=>object}} deps.connection
 */
export function mountDashboard(app, { config, settings, pipeline, excel, ai, transport, connection }) {
  const router = express.Router();
  const startedAt = new Date().toISOString();

  // ---- live activity ring buffer + SSE fan-out ----
  const recent = [];
  const clients = new Set();
  const broadcast = (event, data) => {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(frame);
  };
  pipeline.on("activity", (evt) => {
    recent.push(evt);
    if (recent.length > RECENT_EVENTS) recent.shift();
    broadcast("activity", evt);
  });
  connection.on("change", (state) => broadcast("connection", state));
  settings.on("change", (values) => broadcast("settings", { settings: values, updatedAt: settings.updatedAt }));

  router.use(basicAuth(config.dashboardUser, config.dashboardPassword));
  router.use(express.static(PUBLIC_DIR, { index: "index.html" }));

  // Mutating requests must carry a custom header. Browsers can't add one to a
  // cross-site form post, so this blocks CSRF even though Basic auth is ambient.
  router.use("/api", (req, res, next) => {
    if (req.method !== "GET" && req.get("x-dashboard") !== "1") return res.status(403).json({ error: "Missing X-Dashboard header" });
    next();
  });

  /* ---------------- overview ---------------- */

  router.get("/api/overview", async (_req, res, next) => {
    try {
      const rows = await excel.readRows();
      res.json({
        agent: {
          mode: config.mode,
          transport: transport.name,
          connection: connection.snapshot(),
          startedAt,
          uptimeSec: Math.round(process.uptime()),
          excelFile: excel.filePath,
          settingsFile: settings.filePath,
          settingsUpdatedAt: settings.updatedAt,
        },
        settings: settings.get(),
        stats: computeStats(rows),
        runtime: pipeline.stats,
        recent: recent.slice(-50).reverse(),
      });
    } catch (err) {
      next(err);
    }
  });

  /* ---------------- settings ---------------- */

  const settingsPayload = () => ({
    settings: settings.get(),
    updatedAt: settings.updatedAt,
    limits: SETTINGS_LIMITS,
    suggestedModels: SUGGESTED_MODELS,
    systemPrompt: buildSystemPrompt(settings.get()),
  });

  router.get("/api/settings", (_req, res) => res.json(settingsPayload()));

  router.put("/api/settings", async (req, res) => {
    try {
      await settings.update(req.body ?? {});
      console.log(`[DASHBOARD] Settings updated: ${Object.keys(req.body ?? {}).join(", ")}`);
      res.json(settingsPayload());
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post("/api/prompt-preview", (req, res) => {
    try {
      const draft = { ...settings.get(), ...validateSettings(req.body ?? {}) };
      res.json({ systemPrompt: buildSystemPrompt(draft) });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /* ---------------- conversations ---------------- */

  router.get("/api/conversations", async (_req, res, next) => {
    try {
      const rows = await excel.readRows();
      const byPhone = new Map();
      for (const r of rows) {
        const key = normalizePhone(r.phone);
        if (!key) continue;
        const c = byPhone.get(key) ?? { phone: r.phone, name: "", count: 0, lastAt: "", lastText: "", lastIntent: "", needsReply: false };
        c.count++;
        if (r.name) c.name = r.name;
        c.lastAt = r.timestamp;
        c.lastText = r.incoming || r.response;
        if (r.intent && r.intent !== "Manual") c.lastIntent = r.intent;
        c.needsReply = isUnanswered(r);
        byPhone.set(key, c);
      }
      res.json([...byPhone.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1)));
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/conversations/:phone", async (req, res, next) => {
    try {
      const key = normalizePhone(req.params.phone);
      const rows = (await excel.readRows()).filter((r) => normalizePhone(r.phone) === key);
      res.json({ phone: `+${key}`, name: rows.findLast((r) => r.name)?.name ?? "", rows });
    } catch (err) {
      next(err);
    }
  });

  /* ---------------- manual reply ---------------- */

  router.post("/api/send", async (req, res) => {
    const digits = normalizePhone(req.body?.phone);
    const text = String(req.body?.text ?? "").trim();
    if (!digits) return res.status(400).json({ error: "Не указан номер" });
    if (!text) return res.status(400).json({ error: "Пустое сообщение" });
    if (text.length > 4096) return res.status(400).json({ error: "Сообщение длиннее 4096 символов" });

    const chatId = pipeline.chatIdFor(digits) ?? transport.chatIdForPhone(digits);
    try {
      await transport.send(chatId, text);
    } catch (err) {
      console.error(`[DASHBOARD] Manual reply to +${digits} failed: ${err.message}`);
      return res.status(502).json({ error: `WhatsApp не принял сообщение: ${err.message}` });
    }

    pipeline.rememberManualReply(digits, text);
    const known = (await excel.readRows().catch(() => [])).findLast((r) => normalizePhone(r.phone) === digits && r.name);
    const row = {
      timestamp: new Date().toISOString(),
      phone: `+${digits}`,
      name: known?.name ?? "",
      incoming: "",
      response: text,
      intent: "Manual",
      summary: "Manual reply by operator",
    };
    await excel.appendRow(row);
    pipeline.emit("activity", { at: row.timestamp, type: "manual", phone: row.phone, name: row.name, reply: text });
    console.log(`[DASHBOARD] Manual reply sent to +${digits}.`);
    res.json({ ok: true, row });
  });

  /* ---------------- test chat ---------------- */

  router.post("/api/test", async (req, res) => {
    const text = String(req.body?.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "Пустое сообщение" });
    if (text.length > 4000) return res.status(400).json({ error: "Сообщение слишком длинное" });

    let overrides;
    try {
      overrides = validateSettings(req.body?.settings ?? {});
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    const history = (Array.isArray(req.body?.history) ? req.body.history : [])
      .filter((t) => (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string")
      .slice(-20)
      .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }));

    const started = Date.now();
    try {
      const result = await ai.analyze({ text, name: String(req.body?.name ?? "").slice(0, 80) || undefined, history }, overrides);
      res.json({ ...result, ms: Date.now() - started });
    } catch (err) {
      res.status(502).json({ error: `Ошибка ИИ: ${err.message}`, ms: Date.now() - started });
    }
  });

  /* ---------------- live events (SSE) ---------------- */

  router.get("/api/events", (req, res) => {
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.flushHeaders();
    res.write(`event: connection\ndata: ${JSON.stringify(connection.snapshot())}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 25_000);
    req.on("close", () => {
      clearInterval(ping);
      clients.delete(res);
    });
  });

  /* ---------------- export ---------------- */

  router.get("/api/export", async (_req, res) => {
    await excel.flush();
    res.download(excel.filePath, path.basename(excel.filePath));
  });

  app.use(router);
  return { closeStreams: () => clients.forEach((res) => res.end()) };
}

/* ------------------------------------------------------------------------ */

function isUnanswered(row) {
  return row.response.startsWith("[AUTO-REPLY PAUSED]") || row.response.startsWith("[NOT SENT]");
}

/** Aggregate Excel rows into dashboard numbers. "Today" uses the server's local date. */
function computeStats(rows) {
  const dayKey = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const today = dayKey(new Date().toISOString());
  const intents = Object.fromEntries(INTENTS.map((i) => [i, 0]));
  const intentsToday = Object.fromEntries(INTENTS.map((i) => [i, 0]));
  const contacts = new Set();
  const perDay = new Map();
  for (let i = 6; i >= 0; i--) perDay.set(dayKey(new Date(Date.now() - i * 86_400_000).toISOString()), 0);

  let messages = 0;
  let messagesToday = 0;
  let unanswered = 0;
  let manual = 0;
  for (const r of rows) {
    contacts.add(normalizePhone(r.phone));
    if (r.intent === "Manual") {
      manual++;
      continue;
    }
    messages++;
    const day = dayKey(r.timestamp);
    if (perDay.has(day)) perDay.set(day, perDay.get(day) + 1);
    if (r.intent in intents) intents[r.intent]++;
    if (day === today) {
      messagesToday++;
      if (r.intent in intentsToday) intentsToday[r.intent]++;
    }
    if (isUnanswered(r)) unanswered++;
  }

  return {
    messages,
    messagesToday,
    contacts: contacts.size,
    unanswered,
    manual,
    intents,
    intentsToday,
    last7Days: [...perDay].map(([day, count]) => ({ day, count })),
  };
}

function basicAuth(user, password) {
  const expected = Buffer.from(`${user}:${password}`);
  return (req, res, next) => {
    const header = req.get("authorization") || "";
    const given = header.startsWith("Basic ") ? Buffer.from(header.slice(6), "base64") : Buffer.alloc(0);
    if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return next();
    res.set("WWW-Authenticate", 'Basic realm="AI Agent Dashboard", charset="UTF-8"');
    res.status(401).send("Authentication required");
  };
}
