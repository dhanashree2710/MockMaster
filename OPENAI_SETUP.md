# MockMaster — AI setup (safe for GitHub)

## How keys work (multi-device)

1. **`assets/js/config.js`** — keep `groqApiKey`, `geminiApiKey`, `openaiApiKey` **empty** (safe to push).
2. **Settings page** — each user pastes a free key once.
3. Key is stored in **browser localStorage only** on that phone/PC.
4. AI questions work the same as before on that device.

## Free key (recommended)

1. Open https://console.groq.com/keys → create key (no credit card).
2. In the app: **Settings → AI Interview Engine → paste key → Save**.
3. Start a mock interview — status should show “Preparing AI questions…”.

## Without a key

App falls back to built-in question banks (still usable).

## Production (optional)

Set `apiBase` to your backend and keep the real key in server environment variables only.
