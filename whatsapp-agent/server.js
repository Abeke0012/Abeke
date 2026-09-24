/**
 * ============================================================================
 *  WhatsApp AI Agent — server.js
 *  Answers WhatsApp customer messages with OpenAI and logs every conversation
 *  to an Excel workbook.
 * ============================================================================
 *
 *  QUICK START
 *  -----------
 *  1. Install (Node.js 18.17+):
 *
 *       npm install
 *
 *     `whatsapp-web.js` + `qrcode-terminal` are optional dependencies; they are
 *     only needed for WHATSAPP_MODE=webjs. On a Cloud-API-only server you can
 *     skip the Chromium download with:  npm install --omit=optional
 *
 *  2. Configure:
 *
 *       cp .env.example .env      # then fill in the values
 *
 *     Required for both modes:  OPENAI_API_KEY
 *     Optional:                 PORT (3000), EXCEL_FILE_PATH (./whatsapp_leads.xlsx),
 *                               OPENAI_MODEL (gpt-4o-mini), BUSINESS_CONTEXT
 *
 *  3. Choose how to connect to WhatsApp (WHATSAPP_MODE):
 *
 *     A) WHATSAPP_MODE=cloud — official WhatsApp Cloud API (recommended for production)
 *        - In Meta for Developers create an app, add the "WhatsApp" product and copy
 *          WHATSAPP_TOKEN (use a permanent System User token), PHONE_NUMBER_ID and
 *          the app's APP_SECRET into .env. Pick any random string for WEBHOOK_VERIFY_TOKEN.
 *        - Start the server, expose it over HTTPS (e.g. `ngrok http 3000`), then in
 *          App Dashboard -> WhatsApp -> Configuration set:
 *              Callback URL:  https://<your-domain>/webhook
 *              Verify token:  <WEBHOOK_VERIFY_TOKEN>
 *          and subscribe to the "messages" webhook field.
 *
 *     B) WHATSAPP_MODE=webjs — whatsapp-web.js (logs in as a normal WhatsApp account)
 *        - Run `npm start`; a QR code is printed in the terminal.
 *        - On the phone: WhatsApp -> Settings -> Linked devices -> Link a device, scan it.
 *        - The session is persisted in WWEBJS_SESSION_DIR (default ./.wwebjs_auth), so
 *          you only scan once. Delete that folder to log out / switch accounts.
 *        - Note: this automates WhatsApp Web, which is not an official API and can get
 *          a number banned. Use mode A for business-critical traffic.
 *
 *  4. Run:
 *
 *       npm start          # or `npm run dev` to restart on file changes
 *
 *  5. Open the control panel:  http://localhost:3000
 *
 *     Log in with DASHBOARD_USER / DASHBOARD_PASSWORD (if no password is set, a
 *     random one is generated and printed at startup). From the panel you can see
 *     live activity and stats, read every conversation and reply by hand, pause
 *     auto-replies, edit the business info / rules / model, and try the agent in a
 *     test chat. In webjs mode the login QR code is also shown there.
 *     Settings are saved to SETTINGS_FILE_PATH (default ./agent-settings.json) and
 *     override the matching .env values from then on.
 *
 *     GET /health returns status JSON. Every processed message prints:
 *       [WHATSAPP AGENT] Processed message from +XXXXX. Intent: Lead. Reply Sent.
 *     and is appended to the "Leads & Conversations" sheet in EXCEL_FILE_PATH.
 *
 *     Close the workbook in Excel while the agent is running when you can: writes
 *     to a locked file are retried 3x (2s apart) and then parked in
 *     <file>.pending.jsonl, which is replayed automatically on the next write.
 * ============================================================================
 */

import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import dotenv from "dotenv";
import express from "express";

import { AgentPipeline, AIAgent, ExcelStore, normalizePhone, SettingsStore } from "./agent.js";
import { mountDashboard } from "./dashboard.js";

dotenv.config({ quiet: true });

/* ---------------------------------------------------------------------------
 * Configuration
 * ------------------------------------------------------------------------- */

const config = {
  port: Number(process.env.PORT) || 3000,
  mode: (process.env.WHATSAPP_MODE || "cloud").toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  businessContext: process.env.BUSINESS_CONTEXT || "",
  excelFilePath: process.env.EXCEL_FILE_PATH || "./whatsapp_leads.xlsx",
  batchWindowMs: Number(process.env.MESSAGE_BATCH_WINDOW_MS) || 3000,
  settingsFilePath: process.env.SETTINGS_FILE_PATH || "./agent-settings.json",

  // Control panel login
  dashboardUser: process.env.DASHBOARD_USER || "admin",
  dashboardPassword: process.env.DASHBOARD_PASSWORD || "",

  // Cloud API
  whatsappToken: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  verifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
  appSecret: process.env.APP_SECRET,
  graphApiVersion: process.env.GRAPH_API_VERSION || "v23.0",
  graphApiBaseUrl: (process.env.GRAPH_API_BASE_URL || "https://graph.facebook.com").replace(/\/+$/, ""),

  // whatsapp-web.js
  sessionDir: process.env.WWEBJS_SESSION_DIR || "./.wwebjs_auth",

  // Extra number(s) that must never be answered (comma separated).
  agentPhoneNumbers: (process.env.AGENT_PHONE_NUMBER || "").split(",").map((s) => s.trim()).filter(Boolean),
};

function validateConfig() {
  const missing = [];
  if (!config.openaiApiKey) missing.push("OPENAI_API_KEY");
  if (!["cloud", "webjs"].includes(config.mode)) {
    throw new Error(`WHATSAPP_MODE must be "cloud" or "webjs" (got "${config.mode}")`);
  }
  if (config.mode === "cloud") {
    for (const key of ["WHATSAPP_TOKEN", "PHONE_NUMBER_ID", "WEBHOOK_VERIFY_TOKEN"]) {
      if (!process.env[key]) missing.push(key);
    }
    if (!config.appSecret) {
      console.warn("[CONFIG] APP_SECRET is not set — webhook signatures will NOT be verified. Set it in production.");
    }
  }
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (!config.dashboardPassword) {
    config.dashboardPassword = crypto.randomBytes(9).toString("base64url");
    console.warn(
      `[DASHBOARD] DASHBOARD_PASSWORD is not set. Generated one for this run:\n` +
        `            user: ${config.dashboardUser}   password: ${config.dashboardPassword}\n` +
        `            Set DASHBOARD_PASSWORD in .env to keep it fixed.`,
    );
  }
}

/* ---------------------------------------------------------------------------
 * Connection state (shown live in the dashboard)
 * ------------------------------------------------------------------------- */

class ConnectionState extends EventEmitter {
  constructor() {
    super();
    this.state = { status: "starting", detail: "", qr: null, since: new Date().toISOString() };
  }
  /** status: starting | waiting | qr | connected | disconnected | error */
  set(status, detail = "", extra = {}) {
    this.state = { status, detail, qr: null, since: new Date().toISOString(), ...extra };
    this.emit("change", this.snapshot());
  }
  snapshot() {
    return { ...this.state };
  }
}

const connection = new ConnectionState();

/* ---------------------------------------------------------------------------
 * Transport A: WhatsApp Cloud API (webhook in, Graph API out)
 * ------------------------------------------------------------------------- */

function createCloudTransport(app) {
  const messagesUrl = `${config.graphApiBaseUrl}/${config.graphApiVersion}/${config.phoneNumberId}/messages`;
  let businessNumber = null; // learned from webhook metadata, used by the loop guard

  // GET /webhook — Meta's one-time verification handshake.
  app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && typeof token === "string" && safeEqual(token, config.verifyToken)) {
      console.log("[WEBHOOK] Verified by Meta.");
      if (connection.state.status !== "connected") connection.set("waiting", "Webhook verified by Meta, waiting for messages");
      return res.status(200).type("text/plain").send(String(challenge ?? ""));
    }
    console.warn("[WEBHOOK] Verification failed (wrong verify token).");
    return res.sendStatus(403);
  });

  // POST /webhook — inbound events. Always answer 200 fast; Meta retries otherwise.
  app.post("/webhook", (req, res) => {
    if (config.appSecret && !hasValidSignature(req)) {
      console.warn("[WEBHOOK] Rejected request with invalid X-Hub-Signature-256.");
      return res.sendStatus(401);
    }
    res.sendStatus(200);

    try {
      for (const entry of req.body?.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value ?? {};
          if (value.metadata?.display_phone_number && !businessNumber) {
            businessNumber = normalizePhone(value.metadata.display_phone_number);
            pipeline.addSelfNumber(businessNumber);
          }
          if (connection.state.status !== "connected") {
            connection.set("connected", `Webhook receiving events${businessNumber ? ` for +${businessNumber}` : ""}`);
          }
          const names = new Map((value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));

          // `statuses` (sent/delivered/read receipts) are ignored; only `messages` matter.
          for (const m of value.messages ?? []) {
            const text = extractCloudText(m);
            if (!text) {
              console.log(`[WEBHOOK] Skipped non-text message (${m.type}) from +${m.from}.`);
              continue;
            }
            pipeline.receive({ id: m.id, from: m.from, name: names.get(m.from), text, chatId: m.from });
          }
        }
      }
    } catch (err) {
      console.error(`[WEBHOOK] Could not parse payload: ${err.message}`);
    }
  });

  async function send(to, text) {
    const res = await fetch(messagesUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.whatsappToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: text },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Graph API ${res.status}: ${body.slice(0, 300)}`);
    }
  }

  return {
    name: "WhatsApp Cloud API",
    send,
    chatIdForPhone: (digits) => digits,
    async start() {
      console.log(`[WHATSAPP] Cloud API mode. Webhook endpoint: POST/GET /webhook (port ${config.port}).`);
      connection.set("waiting", "Waiting for the first webhook event from Meta");
    },
    async stop() {},
  };
}

/** Text from a Cloud API message: plain text, button replies and list replies. */
function extractCloudText(m) {
  switch (m.type) {
    case "text":
      return m.text?.body;
    case "button":
      return m.button?.text;
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
    default:
      return null;
  }
}

function hasValidSignature(req) {
  const header = req.get("x-hub-signature-256") || "";
  if (!header.startsWith("sha256=") || !req.rawBody) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", config.appSecret).update(req.rawBody).digest("hex");
  return safeEqual(header, expected);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/* ---------------------------------------------------------------------------
 * Transport B: whatsapp-web.js (QR login, persisted session)
 * ------------------------------------------------------------------------- */

async function createWebJsTransport() {
  let wweb;
  let qrcode;
  try {
    wweb = await import("whatsapp-web.js");
    qrcode = (await import("qrcode-terminal")).default;
  } catch {
    throw new Error("WHATSAPP_MODE=webjs needs the optional packages: npm install whatsapp-web.js qrcode-terminal");
  }
  // Optional: render the QR as an image for the dashboard too.
  const qrImage = await import("qrcode").then((m) => m.default ?? m).catch(() => null);
  const { Client, LocalAuth } = wweb.default ?? wweb;

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: config.sessionDir }),
    puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  });

  client.on("qr", async (qr) => {
    console.log("\n[WHATSAPP] Scan this QR code: WhatsApp -> Settings -> Linked devices -> Link a device\n");
    qrcode.generate(qr, { small: true });
    const image = qrImage ? await qrImage.toDataURL(qr, { margin: 1, width: 280 }).catch(() => null) : null;
    connection.set("qr", "Scan the QR code with WhatsApp -> Linked devices", { qr: image });
  });
  client.on("authenticated", () => {
    console.log(`[WHATSAPP] Authenticated. Session saved in ${config.sessionDir}.`);
    connection.set("starting", "Authenticated, loading chats…");
  });
  client.on("auth_failure", (msg) => {
    console.error(`[WHATSAPP] Authentication failed: ${msg}. Delete ${config.sessionDir} and scan again.`);
    connection.set("error", `Authentication failed: ${msg}`);
  });
  client.on("disconnected", (reason) => {
    console.warn(`[WHATSAPP] Disconnected: ${reason}`);
    connection.set("disconnected", String(reason));
  });
  client.on("ready", () => {
    const own = client.info?.wid?.user;
    if (own) pipeline.addSelfNumber(own);
    console.log(`[WHATSAPP] Client ready as +${own ?? "unknown"}.`);
    connection.set("connected", `Logged in as +${own ?? "unknown"}`);
  });

  // `message` only fires for messages we RECEIVE (unlike `message_create`),
  // and we also check `fromMe` explicitly as a second loop guard.
  client.on("message", async (msg) => {
    try {
      if (msg.fromMe || msg.isStatus || msg.broadcast) return;
      if (msg.from.endsWith("@g.us")) return; // group chats are out of scope
      if (msg.type !== "chat" || !msg.body) {
        console.log(`[WHATSAPP] Skipped non-text message (${msg.type}) from ${msg.from}.`);
        return;
      }

      let name = msg._data?.notifyName;
      let phone = msg.from;
      try {
        const contact = await msg.getContact();
        name = contact.pushname || contact.name || name;
        if (contact.number) phone = contact.number; // resolves privacy "@lid" ids to a real number when possible
      } catch {
        /* contact lookup is best-effort */
      }

      pipeline.receive({ id: msg.id?._serialized, from: phone, name, text: msg.body, chatId: msg.from });
    } catch (err) {
      console.error(`[WHATSAPP] Error handling incoming message: ${err.message}`);
    }
  });

  return {
    name: "whatsapp-web.js",
    send: async (chatId, text) => {
      await client.sendMessage(chatId, text);
    },
    chatIdForPhone: (digits) => `${digits}@c.us`,
    async start() {
      console.log("[WHATSAPP] Starting whatsapp-web.js client (first run downloads/launches Chromium)…");
      await client.initialize();
    },
    async stop() {
      await client.destroy().catch(() => {});
    },
  };
}

/* ---------------------------------------------------------------------------
 * Bootstrap
 * ------------------------------------------------------------------------- */

let pipeline; // assigned in main(); transports reference it lazily

async function main() {
  validateConfig();

  const excel = new ExcelStore({ filePath: config.excelFilePath });
  await excel.init();

  const app = express();
  app.disable("x-powered-by");
  // Keep the raw body: Meta signs the exact bytes it sent.
  app.use(express.json({ limit: "1mb", verify: (req, _res, buf) => (req.rawBody = buf) }));

  const transport = config.mode === "cloud" ? createCloudTransport(app) : await createWebJsTransport();

  // .env values are the defaults; anything saved from the dashboard overrides them.
  const settings = new SettingsStore({
    filePath: config.settingsFilePath,
    defaults: {
      model: config.openaiModel,
      businessContext: config.businessContext,
      batchWindowMs: config.batchWindowMs,
    },
  });
  await settings.load();
  const getSettings = () => settings.get();

  const ai = new AIAgent({ apiKey: config.openaiApiKey, getSettings });

  pipeline = new AgentPipeline({
    ai,
    excel,
    send: transport.send,
    getSettings,
    selfNumbers: config.agentPhoneNumbers,
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", mode: config.mode, model: settings.get().model, excel: excel.filePath, uptime: process.uptime() });
  });

  // Control panel (Basic auth). Mounted after /webhook and /health so those stay public.
  const dashboard = mountDashboard(app, { config, settings, pipeline, excel, ai, transport, connection });

  // Malformed JSON and other request errors: log and answer without crashing.
  app.use((err, _req, res, _next) => {
    console.error(`[HTTP] ${err.status || 500} ${err.message}`);
    res.sendStatus(err.status || 500);
  });

  const server = app.listen(config.port, () => {
    console.log(`[SERVER] Listening on http://localhost:${config.port} (mode: ${config.mode}, model: ${settings.get().model})`);
    console.log(`[DASHBOARD] Control panel: http://localhost:${config.port}  (user: ${config.dashboardUser})`);
  });

  await transport.start();

  // Graceful shutdown: answer buffered messages, finish Excel writes, then exit.
  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`\n[SERVER] ${signal} received — finishing in-flight messages…`);
    dashboard.closeStreams();
    server.close();
    const force = setTimeout(() => process.exit(1), 30_000);
    force.unref();
    try {
      await pipeline.drain();
      await transport.stop();
    } finally {
      console.log("[SERVER] Shutdown complete.");
      process.exit(0);
    }
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (err) => console.error("[FATAL] Unhandled rejection:", err));

main().catch((err) => {
  console.error(`[STARTUP] ${err.message}`);
  process.exit(1);
});
