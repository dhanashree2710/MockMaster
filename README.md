# MOCKMASTER — AI Interview Preparation Platform

**Practice Smart. Interview Confidently.**

MOCKMASTER (also referred to as Interview Pro AI) is an AI-powered mock interview platform that helps candidates prepare for real interviews using their resume, target job description, and personalized AI coaching.

---

## App flow

```
INTERVIEW PRO AI / MOCKMASTER
            │
            ▼
   User Login / Register
            │
            ▼
      Upload Resume
            │
            ▼
  Temporary File Processing
       ┌────┴────┐
       ▼         ▼
  PDF/DOC     JD Parser
   Parser
       └────┬────┘
            ▼
      AI STRUCTURING
   ┌────────┼────────┐
   ▼        ▼        ▼
Resume   Job Details  Skills
 Data       Data      & Gaps
   └────────┬────────┘
            ▼
         DATABASE
            │
            ▼
  Personalized Preparation
            │
            ▼
    AI MOCK INTERVIEW
            │
            ▼
    Questions + Answers
            │
            ▼
   AI EVALUATION ENGINE
            │
            ▼
     FINAL AI REPORT
```

### Step-by-step user journey

1. **Login / Register** — Create an account or sign in (premium sliding auth UI).
2. **Upload Resume** — PDF or DOC; temporary processing on the server/client.
3. **Parse resume & job description** — PDF/DOC parser + JD parser extract structure.
4. **AI structuring** — Resume data, job details, skills & gaps are normalized.
5. **Persist to database** — Structured profile and job context stored for the session/user.
6. **Personalized preparation** — Plan built from gaps and role requirements.
7. **AI mock interview** — Live Q&A session tailored to the user and role.
8. **Evaluation engine** — Scores answers on clarity, relevance, depth, delivery.
9. **Final AI report** — Actionable feedback, scores, and improvement tips.

---

## Features

- Premium **Login / Sign Up** with large sliding panel animation (desktop) and clean vertical layout (mobile)
- Resume upload & analysis (mock AI ready for real API)
- Job description matching & skill-gap detection
- Personalized preparation plans
- AI mock interview with Q&A flow
- Interview history and progress
- Final evaluation report
- Responsive UI (desktop sidebar / mobile-friendly)
- Demo mode via localStorage (no backend required to try the flow)

---

## Tech stack

| Layer        | Choice                                      |
|-------------|----------------------------------------------|
| Frontend    | HTML5, CSS3, Vanilla JavaScript              |
| UI          | Bootstrap 5.3, Bootstrap Icons, Inter font   |
| Auth UI     | Custom cinematic sliding panel (no React)    |
| State       | localStorage (demo) → ready for real API     |
| Backend     | Optional (Firebase / custom API endpoints)   |

**No React, Vue, Angular, or build step required** for the UI shell.

---

## Project structure

```
interview-pro-ai/
├── index.html                      # Landing
├── pages/
│   ├── login.html                  # Premium auth (MockMaster logo)
│   ├── register.html
│   ├── dashboard.html
│   ├── resume/
│   │   ├── upload-resume.html
│   │   └── resume-analysis.html
│   ├── job/
│   │   ├── job-description.html
│   │   └── resume-job-match.html
│   ├── preparation/
│   │   └── preparation-plan.html
│   ├── interview/
│   │   ├── interview-setup.html
│   │   ├── ai-interview.html
│   │   └── interview-history.html
│   ├── report/
│   │   └── interview-report.html
│   ├── profile.html
│   ├── settings.html
│   └── progress.html
├── assets/
│   ├── css/
│   ├── js/
│   │   ├── config.js               # App config + mock data
│   │   ├── auth-guard.js
│   │   ├── firebase.js
│   │   └── ...
│   └── images/
│       └── mockmaster-logo.png     # Official brand logo
├── backend/                        # Controllers, routes, services (scaffold)
└── README.md
```

---

## How to run

```bash
cd interview-pro-ai

# Option 1
python -m http.server 8080

# Option 2
npx serve .

# Open http://localhost:8080
```

Or open `index.html` / `pages/login.html` directly in a modern browser.

**Standalone login demo:** use `login.html` + `mockmaster-logo.png` in the same folder.

---

## Demo path (success path)

1. Open app → **Get Started** / go to Login  
2. **Sign Up** or **Sign In** (demo accepts any valid-looking credentials)  
3. **Upload Resume** → Analyze (mock AI)  
4. Paste **Job Description** → Analyze  
5. Review **Match Score** & skill gaps  
6. Start **Personalized Preparation**  
7. Start **AI Mock Interview** → answer questions  
8. View **Final AI Report**

After a successful signup attempt in the login UI, a success overlay appears and the user can continue into the app flow (dashboard / resume upload).

---

## Connecting a real backend / AI API

1. Set `APP_CONFIG.apiBase` in `assets/js/config.js`  
2. Replace mock delays with `fetch()` to your API  
3. Keep existing UI states (loading, scores, chat bubbles)  
4. **Never** put secret API keys in frontend code — proxy via backend  

Suggested endpoints:

```
POST /api/auth/register
POST /api/auth/login
POST /api/resume/analyze
POST /api/job/analyze
POST /api/match
POST /api/interview/start
POST /api/interview/answer
POST /api/interview/report
```

---

## Brand & design

- **Name:** MOCKMASTER  
- **Logo:** Running professional with briefcase, laptop, and upward growth arrows (green accent)  
- **Auth palette:** `#9CB080` · `#618764` · `#2B5748` · `#273338`  
- **Product UI:** Indigo / purple / cyan system (see `variables.css`)  
- Clean cards, soft shadows, Inter typography  

---

## README points (product summary)

- AI-powered end-to-end interview prep from resume → report  
- Resume + JD parsing and skill-gap analysis  
- Personalized preparation plan  
- Realistic AI mock interviews with evaluation  
- Final scored report with actionable feedback  
- Premium auth experience and fully responsive UI  
- Works in demo mode offline; production-ready API hooks  

---

## License

Built for educational and product development use.
