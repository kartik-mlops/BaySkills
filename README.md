# BaySkills

An AI skill-gap analyser that follows the project abstract: profile → target role → skill test → skill gaps →
matching roles → live vacancies → apply and track.

## Run it
```bash
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # Windows: copy .env.example .env
# open .env and paste your GROQ_API_KEY
uvicorn app:app --reload
```
Open http://127.0.0.1:8000

## Tabs
| Tab | What it does |
|---|---|
| Overview | Readiness score, **"Where to focus first"** ranking, and you-vs-typical-professional radar |
| Flowchart | Type any role (e.g. Data Scientist). Every required skill is a node in a flowchart. Click a node for free YouTube playlists, mark skills as learned |
| Profile | GitHub + pasted LinkedIn text / LinkedIn PDF: the evidence the AI uses to rate your skills |
| Skill test | 15-question AI quiz (Beginner 5, Intermediate 10, Advanced 13) |
| Roadmap / Planner | Phased learning plan and a tick-off weekly planner |
| Vacancies | Roles you fit now (matched / missing skills) + live openings scored against your skills |
| Applications | Saved → Applied → Interview → Offer / Rejected board, follow-up reminders, response rate, skills to prepare |

## Notes
- **Peer comparison**: the "typical professional" level is an AI estimate of what job postings expect for the role.
  Reading other people's LinkedIn profiles is blocked by LinkedIn and against its terms, so nothing is scraped.
- **YouTube playlists**: with no key, each node links to YouTube's search filtered to playlists. With `YOUTUBE_API_KEY`
  the top playlists appear as cards in the panel (results are cached 7 days; API search costs 100 quota units of 10,000/day).
- **Vacancies**: fit % only counts skills the posting actually names. Without Adzuna keys the source is Remotive (remote jobs only).
  Adzuna returns a short description, so fit is based on that snippet.
- The Groq key lives only in `.env` on the server. Never commit `.env`.
- Removed in this version: LinkedIn OAuth/posting, post drafts, and the profile Auto-fix tab.
- Before deploying publicly, rate-limit `/api/analyze` and `/api/quiz/generate`. Flow, vacancies, playlists, chat, roadmap and planner calls are already limited per user.
