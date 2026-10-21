# Play Console → App content → Data safety (answers that match this app)

Data is encrypted in transit: **Yes** (HTTPS to Supabase).
Users can request data deletion: **Yes**. Deletion URL: `https://YOUR-HOST/pages/delete-account.html` (also in-app: Settings → Delete my account & data).
Independent security review: No.

## Does the app COLLECT or SHARE data? → Yes

| Data type (Play category) | Collected | Shared with 3rd parties | Purpose | Optional? |
|---|---|---|---|---|
| Personal info → Name | Yes | No | App functionality, Account management | Required |
| Personal info → Email address | Yes | No | App functionality, Account management | Required |
| Personal info → Phone number | Yes | No | Account management | **Optional** |
| Personal info → User IDs | Yes | No | App functionality | Required |
| Messages → Other in-app messages (interview answers, resume/job text, AI feedback) | Yes | **Yes – Groq (AI processor)** | App functionality | Required for AI features |
| Audio → Voice or sound recordings | **No** (speech-to-text runs on the device's speech service; the app stores only text) | — | — | — |
| App activity → In-app interactions / Other user-generated content (scores, progress, reports) | Yes | No | App functionality, Analytics (own progress only) | Required |
| App info & performance → Diagnostics | No | — | — | — |
| Location, Contacts, Photos, Files, Financial, Health | **No** | — | — | — |
| Device or other IDs / Advertising ID | **No** | — | — | — |

### Notes for the "shared" column
* Groq receives resume summary + job description + your answers **only to generate questions/feedback** and acts as a service provider. Google lets you mark this as *"Data processed by a service provider on your behalf"* — it then does **not** count as "sharing" in the Play sense. Pick whichever matches your agreement with the provider; being conservative (declare as shared) is always safe.
* Supabase is your own backend/processor — not "shared".

## Declarations
* Ads: **No ads.**
* In-app purchases: **No** (credits are free, earned in-app, with no cash value — if you ever sell credits you must use Google Play Billing).
* Financial features, Health apps, Government apps, News apps: **No.**
* **Generative AI:** the app contains AI-generated content; users can report it (interview report → "Report a problem with AI content").
