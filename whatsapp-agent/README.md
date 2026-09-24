# WhatsApp AI Agent → Excel

An Express server that answers WhatsApp customer messages with OpenAI (`gpt-4o-mini` by default) and appends every conversation to an Excel workbook.

```
WhatsApp ──► server.js (Cloud API webhook  or  whatsapp-web.js client)
                 │
                 ▼
             agent.js  dedup → 3s burst batching → OpenAI (JSON) → send reply → Excel row → console
                 │
                 ▼
          dashboard.js + public/index.html   web control panel (live feed, conversations, settings, test chat)
```

## Setup

```bash
npm install                 # add --omit=optional if you only use the Cloud API (skips Chromium)
cp .env.example .env        # fill in OPENAI_API_KEY and your WhatsApp settings
npm start
```

Full setup steps for both connection modes are in the comment block at the top of [`server.js`](./server.js):

- **`WHATSAPP_MODE=cloud`**: the official Meta WhatsApp Cloud API. Expose `/webhook` over HTTPS and register it in the Meta App Dashboard. Recommended for production.
- **`WHATSAPP_MODE=webjs`**: whatsapp-web.js. Scan the QR code printed in the terminal once; the session is saved in `.wwebjs_auth/`.

## Control panel

Open **http://localhost:3000** and log in with `DASHBOARD_USER` / `DASHBOARD_PASSWORD`. The interface is in Russian.

| Tab | What you can do |
|---|---|
| **Обзор** (Overview) | Connection status, today's numbers, the message pipeline with its current settings, intent breakdown, a 7-day chart, a live activity feed, and Excel download. In webjs mode the login QR code also appears here. |
| **Диалоги** (Conversations) | Every customer and their full thread with intents and summaries. Reply manually as the operator; the reply goes to WhatsApp and is logged as `Manual`. |
| **Настройки** (Settings) | Edit business info, extra rules and tone, model, creativity (temperature), batch wait time, fallback reply, and the auto-reply switch. Changes apply instantly without a restart and are saved to `agent-settings.json`. Shows the exact system prompt the model receives. |
| **Тест-чат** (Test chat) | Chat with the agent as if you were a customer, using the current (even unsaved) settings. Nothing is sent to WhatsApp or written to Excel. |

The header switch pauses auto-replies. While paused, incoming messages are still logged, and you answer them from **Диалоги**.

Security: every dashboard route requires the password, and changes additionally need a custom header, which blocks cross-site (CSRF) requests. `/webhook` and `/health` stay public, as Meta requires. If you expose the server publicly (e.g. via ngrok for the webhook), set a strong `DASHBOARD_PASSWORD` and use HTTPS.

## Excel output

Sheet **Leads & Conversations** in `EXCEL_FILE_PATH`:

| Timestamp (ISO) | Sender Phone Number | Sender Name | Incoming Message | AI Agent Response | Detected Intent / Action Item | Summary |
|---|---|---|---|---|---|---|

- The file is saved after every row. Each save writes to a temp file and then renames it over the workbook, so a crash can't leave a half-written `.xlsx`.
- If the workbook is open in Excel (locked), the write is retried 3 times, 2 seconds apart. After that the row is parked in `<file>.pending.jsonl` and written into the workbook on the next successful save.
- The file is re-read before each write, so notes or formatting you add in Excel are kept.

## Behaviour

- **Burst batching**: several messages from one person arriving less than 3 seconds apart get a single reply (capped at 10 seconds of waiting).
- **Duplicate protection**: re-delivered message IDs (Meta webhook retries) are ignored.
- **Loop guard**: the agent never answers its own number (from `AGENT_PHONE_NUMBER`, the webhook metadata, or the logged-in whatsapp-web.js account). In webjs mode it also skips `fromMe`, group, and status messages.
- **AI failure**: if OpenAI fails, the customer gets a polite holding reply, and the row is flagged `[AI ERROR]` for manual follow-up.
- **Send failure**: the row is still logged, with the response prefixed `[NOT SENT]`.
- **Memory**: the last 10 turns per customer are kept in memory for context and forgotten after 30 minutes idle.
- **Shutdown**: Ctrl+C / SIGTERM answers any buffered messages and finishes Excel writes before exiting.
