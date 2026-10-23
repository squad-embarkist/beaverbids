# BeaverBids Architecture

## 01 Frontend

### Framework

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Next.js 16.4 | Our framework for both the website and the API. The pages and the REST API live in one app. | Free | Our landing page, web app, and API run as one project, so we deploy once on Coolify. Server-side rendering helps us show up on Google and AI search. |
| React 19 | The UI library Next.js is built on. | Free | Every frontend tool we picked (Next.js, shadcn/ui, React Hook Form, and Zustand) is made for React, so all the parts fit together without extra work. |
| TypeScript 6.0 | JavaScript with types. We write the frontend and the API in it. | Free | It catches mistakes while we code. |

### UI

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| shadcn/ui 4.22 | Ready-made components we copy into our code: forms, tables, progress bars, and a multi-step questionnaire. | Free | Most screens are half built already, including the 5-step questionnaire. The code is ours, so we can change anything. |
| Tailwind CSS 4.3 | How we style things. Small classes right in the code, no separate CSS files. | Free | It's what shadcn/ui uses. |

### State management

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Zustand 5.0 | A small shared store for data that many screens use. | Free | It keeps the questionnaire answers while people move through the 5 steps. It's the most used store for React and needs almost no setup. |

### Forms

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| React Hook Form 7.90 | Handles our forms: typing, errors, submit. | Free | shadcn/ui forms are built to work with it, and it stays fast on long forms. |
| Zod 4.6 | Checks what people type, with rules we write once, like "email is required". | Free | The same rules check the form in the browser and the request in our API, so we never write them twice. |

## 02 Backend

### Auth

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Better Auth 1.7.11 | Handles sign up, log in, log out, and password reset, with email and password or Google. | Free | Made for Next.js. For each login, we use a session that is saved in our own database, so we stay in control and can end any login at any time. |

### REST API

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Route handlers 16.4 | Our REST API, built into Next.js. Each endpoint is one small file, like `/api/tenders`. | Free (part of Next.js) | No second server to build or deploy. The API uses the same types and Zod rules as our pages. |

### Database

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| PostgreSQL 18 | Where we keep everything: users, logins, tenders (government projects to bid on), scores, and the job list. | Free | Proven. It holds our data, logins, and job list. |
| Prisma 7.10.1 | Talks to our database for us. We describe our tables once, and it writes the SQL. | Free | Easy to read and learn, and Better Auth works with it out of the box. |

### File storage

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| AWS S3 3.1153 | Stores our files: what users upload, the daily CanadaBuys file, and database backups. | $0.023 per GB a month + $0.005 per 1,000 uploads + $0.0004 per 1,000 downloads | Its own bucket in our company's AWS account, in us-east-1 near our server. Users upload straight to S3 with a short-lived link, so big files never slow down our app. |

### Background jobs

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| pg-boss 12.38 | Our job list. Scraping, AI scoring, and emails run as jobs in a separate worker, not inside page requests. | Free | It keeps the jobs in PostgreSQL, so there's no extra tool to run. It retries failed jobs and can send each user an email of new tenders that match them, on a schedule. |

### Scraping

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| csv-parse 7.0 | Reads the official CanadaBuys tender file. The worker downloads it every morning. | Free | CanadaBuys shares this file for free under an open licence, so we get real federal tenders with no scraping and no legal risk. |
| Cheerio 1.2 (Later) | Reads MERX tender pages. We add it only after MERX gives us written permission. | Free | MERX's terms forbid copying their data today. Their tender list is plain HTML, so a light reader is enough. |
| Lightpanda 1.0 (Later) | A light hidden browser for Bids&Tenders pages. We add it only after written permission. | Free | Their terms ban scraping for business today. Their list loads with JavaScript, and Lightpanda runs it with far less memory than Chrome. |

## 03 DevOps

### Server

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Hetzner CCX13 | Our company's server in Ashburn, Virginia: 2 dedicated CPUs, 8 GB of memory, and an 80 GB disk. | Already paid ($48.59 a month) | We already run it. Its CPUs aren't shared with other Hetzner customers, and Ashburn is next to our S3 bucket in us-east-1. |
| Ubuntu 24.04 | The operating system already installed on our server. | Free | Already set up with Coolify, and it gets security updates until May 2029. |

### Deploy

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Coolify 4.4.6 | Our hosting panel, already installed on the server. It builds and runs the web app, the worker, and the database. | Free | Self-hosted, like having our own Vercel. It's already set up, so BeaverBids is just a new project on it. |
| Docker 29.9 | Packs each part (web app, worker, database) into its own container. | Free | Each part runs the same on a laptop and on the server, and Coolify runs on it under the hood. |

### Version control

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Git 2.56 | Tracks every change to our code on each laptop. We save work in commits and share it through GitHub. | Free | Every developer has the full history, so we can see who changed what and undo a bad change. Our branches (see section 06) are Git branches. |
| GitHub | Where our code lives, with the full history of every change. | Free | Coolify watches our repo, so every push deploys the new version on its own. |

### Runtime

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Node.js 24 | Runs our JavaScript on the server: the Next.js app and the worker. | Free | The newest long-term support version. pg-boss needs 22.12 or newer, so 24 covers it. |

### Network

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Cloudflare | Runs our domain's DNS. Visitors reach Cloudflare first, then our server. | Free | It hides our server's address and blocks attacks. SSL is set to Full (strict), so traffic is encrypted and checked all the way to our server. |

### Backups

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Coolify backups | Every night, Coolify saves a copy of our database and uploads it to S3. | Free (S3 storage costs extra) | If the server dies, we lose at most one day of data. We test a restore now and then, because a backup only counts if it restores. |

## 04 Other tools

### AI

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| MixRoute | One API for many AI models. The worker sends it tender text to summarize for scoring. Used by Backend. | Pay per use, no markup | One key per module, each with its own spending cap, so one module can't use up the whole budget. |

### Email

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Amazon SES 3.1153 | Sends our emails: "forgot password", "confirm your email", and emails of new tenders that match each user. Used by Backend. | $0.10 per 1,000 emails | It runs in our company's AWS account. SES starts in a sandbox that only emails addresses we verify, so we ask AWS early to lift it in us-east-1. Their reply can take 96 hours. |

### Error alerts

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Sentry 11.8 | Catches errors in the web app and the worker, and alerts us right away. Used by Backend and DevOps. | Free (1 user) | Its official Next.js library supports Next.js 16, and it shows the exact line that broke, like a failed CanadaBuys job at 9:02 am. |

### Health checks

| Tool | Description | Cost | Reason |
| --- | --- | --- | --- |
| Sentry Uptime | Visits our site every minute from outside our server. If it gets no answer 3 times in a row, it emails us. Used by DevOps. | Free (1 monitor) | A checker on our own server would go down with it, so it must live outside. It visits `/api/health`, which also checks the database. |
| Sentry Crons | Each morning, the worker tells Sentry when the CanadaBuys job is done. If Sentry hears nothing in time, it emails us. Used by Backend. | Free (1 monitor) | The site can be up while the worker is down, and then no new tenders show up. The uptime check can't see the worker, so the worker checks in instead. |

## 05 Folder organization

### Project folders

```text
beaverbids/
├── src/
│   ├── app/                  landing page + login app + api/ (route handlers)
│   ├── components/           shadcn/ui + our own UI
│   ├── worker/
│   │   ├── index.ts          starts the pg-boss worker
│   │   └── jobs/
│   │       ├── ingest/       canadabuys.ts (merx.ts later)
│   │       ├── scoring/      MixRoute calls
│   │       └── email/        SES sends
│   ├── lib/                  shared by web + worker: db, zod, s3, ses, auth
│   └── generated/prisma/     made by "prisma generate" (not saved in git)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── fixtures/                 seed tenders + golden test set
├── public/                   images, favicon
├── Dockerfile.web            → Coolify: beaverbids-web
├── Dockerfile.worker         → Coolify: beaverbids-worker
├── compose.yaml              laptop only: Postgres 18
├── prisma.config.ts
├── .env.example
└── next.config.ts · package.json · tsconfig.json
```

### Coolify resources

Coolify project: **BeaverBids**

```text
Coolify project: BeaverBids
├── production (deploys main)
│   ├── beaverbids-web              ← Dockerfile.web (landing + login app + API)
│   ├── beaverbids-worker           ← Dockerfile.worker (CanadaBuys, AI scoring, emails)
│   └── beaverbids-db               Postgres 18 (nightly backups to S3)
└── staging (deploys staging)
    ├── beaverbids-web-staging      ← Dockerfile.web
    ├── beaverbids-worker-staging   ← Dockerfile.worker
    └── beaverbids-db-staging       Postgres 18
```

## 06 GitHub repository

### Repository

`github.com/squad-embarkist/beaverbids` — private, starts empty.

### Branches

```text
feature/* ─┐
bugfix/*  ─┼─ PR ► development ── PR ──► staging ── PR ──► main
chore/*   ─┘                      ▲
hotfix/*  ──────────────────────── PR ────────────────────┘
           (then merged back into development)
```

| Branch | Meaning |
| --- | --- |
| `feature/*` | New work, e.g. `feature/canadabuys-ingest` |
| `bugfix/*` | A fix, e.g. `bugfix/login-redirect` |
| `chore/*` | Upkeep, no new feature, e.g. `chore/update-prisma` |
| `hotfix/*` | Urgent fix made from `main`, e.g. `hotfix/email-crash` |
| `development` | Where finished work comes together |
| `staging` | Final check before going live |
| `main` | Production: what users see |

### Deploys (Coolify)

| Branch | Resources |
| --- | --- |
| `staging` | `beaverbids-web-staging` · `beaverbids-worker-staging` · `beaverbids-db-staging` |
| `main` | `beaverbids-web` · `beaverbids-worker` · `beaverbids-db` |
