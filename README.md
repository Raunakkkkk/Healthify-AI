# Health — Personal Calorie & Nutrition Tracker


NutriTrack is a full-stack web application that lets users log meals, set health goals, visualise nutritional trends, extract nutrition from food photos using AI, and interact with a conversational AI assistant — all with per-user data isolation.

---

## What it does

| Feature | Description |
|---|---|
| **Meal Logging** | Add food entries grouped by meal type (Breakfast, Lunch, Dinner, Snack) with calories, macros (protein, carbs, fat), and flexible micronutrients |
| **Goal Setting** | Create daily calorie and macro targets with optional weight goal and date ranges; the app resolves the active goal for any given date |
| **Dashboard** | At-a-glance rings for today's calorie and macro progress against the active goal, plus a calorie sparkline |
| **Reports** | Weekly calorie trend, macronutrient breakdown by day, micronutrient summary, and goal-vs-actual comparison — all rendered with Recharts |
| **AI Image Extraction** | Upload a photo (nutrition label or food plate); a two-stage LLM pipeline identifies food names then estimates per-serving nutrition, pre-filling the entry form |
| **AI Chat** | Conversational assistant powered by a LangGraph ReAct agent; understands natural language to log meals, query intake, update goals, and summarise nutrition |
| **Multi-User Auth** | JWT-based signup/login; all data (entries, goals, chat history, images) is strictly scoped to the authenticated user |

---

## How it works

### Architecture

```
Browser (React + Vite)
        │  HTTP / SSE  (Vite dev proxy: /api → :5000)
        ▼
Express API Server (Node.js + TypeScript)
        │
        ├── MongoDB (Mongoose) — persistent data store
        ├── Cloudinary           — image storage
        └── Ollama (local LLMs)  — AI features
```

The frontend **never touches the database directly**. All business logic and data access live in the backend; the React app communicates exclusively via REST APIs and Server-Sent Events.

---

### Frontend (`src/`)

Built with **React 19 + Vite + TypeScript**.

| Path | Purpose |
|---|---|
| `pages/` | `DashboardPage`, `MealsPage`, `GoalsPage`, `ReportsPage`, `ProfilePage`, `LoginPage`, `SignupPage` |
| `components/layout/` | Sidebar, Header, shared Layout wrapper |
| `components/dashboard/` | Calorie ring, macro rings, sparkline chart |
| `components/meals/` | Meal timeline, meal card, food-entry form, image-upload widget |
| `components/reports/` | All chart and table components |
| `components/goals/` | Goal form |
| `components/chat/` | Chat panel (streams SSE responses) |
| `store/` | Zustand stores for auth, entries, and goals |
| `lib/` | Axios API client, utilities, Zod validators |
| `types/` | Shared TypeScript interfaces |

**State management:** Zustand. **Routing:** React Router v7. **UI primitives:** shadcn/ui (Radix). **Charts:** Recharts.

---

### Backend (`server/src/`)

Built with **Express 4 + TypeScript**, served on port 5000.

| Path | Purpose |
|---|---|
| `models/` | Mongoose schemas — `User`, `Goal`, `FoodEntry`, `ChatMessage`, `ImageUpload` |
| `routes/` | `auth`, `goals`, `entries`, `reports`, `ai` |
| `controllers/` | Request handlers for each resource |
| `services/` | Report aggregation (MongoDB aggregation pipelines) |
| `middleware/` | JWT auth guard, Zod request validation, error handler, rate limiter |
| `ai/` | `ollamaVision.ts` (two-stage image extraction), `agent.ts` (LangGraph chat agent) |
| `config/` | MongoDB connection |

**Security:** Helmet headers, CORS, express-rate-limit, bcrypt password hashing.

---

### Data Model (MongoDB)

| Collection | Key fields |
|---|---|
| `User` | `name`, `email`, `passwordHash` |
| `Goal` | `userId`, `startDate`, `endDate`, `targetDate`, `calorieTarget`, `proteinTarget`, `carbsTarget`, `fatTarget`, `weightGoal` |
| `FoodEntry` | `userId`, `mealType`, `foodName`, `quantity`, `unit`, `calories`, `macros{protein,carbs,fats}`, `micronutrients` (Map), `timestamp`, `source` (manual \| ai), `imageId?` |
| `ChatMessage` | `userId`, `role` (user \| assistant), `content`, `metadata` |
| `ImageUpload` | `userId`, `imageUrl`, `extractedNutrition`, `confidenceScore` |

All collections are indexed on `userId` + relevant date/type fields for efficient per-user queries.

---

### AI: Image Nutrition Extraction (two-stage pipeline)

1. **Stage 1 — Vision (`qwen3-vl:8b`):** The uploaded image URL (stored on Cloudinary) is sent to Ollama via LangChain `ChatOllama` as a multimodal message. The model returns a comma-separated list of food/product names visible in the image.

2. **Stage 2 — Structured text (`qwen2.5:7b`):** The food names are passed to a second LangChain `ChatOllama` call with `withStructuredOutput` bound to a **Zod schema**. The model acts as a nutrition expert and returns a validated JSON object: `{ name, calories, protein, carbs, fats, quantity, unit, confidence }`. No image is sent in this stage, keeping latency low.

The structured output is returned directly to the frontend; the meal form is pre-filled for user review and editing. Saved entries are tagged `source: "ai"`.

**API:** `POST /api/ai/extract-nutrition` (multipart/form-data)

---

### AI: Conversational Chat (LangGraph ReAct agent)

The chat backend runs as a **LangGraph.js `StateGraph`** with two nodes:

- **`agent` node** — `ChatOllama` with tools bound via `bindTools`. Receives the conversation history plus a system prompt containing the user's current date, today's intake summary, and active goals.
- **`ToolNode`** — Executes whichever tools the model invokes against the live database.

A **`shouldContinue` conditional edge** routes back to `ToolNode` when the model emits tool calls, or terminates the graph otherwise. A `recursionLimit: 16` prevents runaway loops.

**Available tools (Zod-typed):**

| Tool | What it does |
|---|---|
| `logMeal` | Creates a `FoodEntry` for the authenticated user |
| `getTodayEntries` | Fetches all entries for today, grouped by meal |
| `getEntriesByDate` | Fetches entries for any date |
| `getWeeklySummary` | Aggregates calorie/macro totals for the last 7 days |
| `getCurrentGoals` | Returns the user's active goal |
| `updateGoal` | Edits calorie/macro targets |
| `deleteGoal` | Removes a goal |
| `editEntry` | Updates a food entry |
| `deleteEntry` | Deletes a food entry |

**Streaming:** The server streams responses as **Server-Sent Events** (text deltas + tool-result events). The React client consumes them with a custom `useNutriChat` hook — no SDK required.

**API:** `POST /api/ai/chat` (streaming SSE), `GET /api/ai/chat/history`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript |
| UI / Styling | Tailwind CSS, shadcn/ui (Radix UI) |
| Charts | Recharts |
| State | Zustand |
| Backend | Node.js, Express 4, TypeScript |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcrypt |
| AI — Image | LangChain `ChatOllama` (`qwen3-vl:8b` vision + `qwen2.5:7b` text with `withStructuredOutput`) |
| AI — Chat | LangGraph.js `StateGraph` ReAct agent, LangChain `ChatOllama` (`qwen2.5:7b`) |
| Image Storage | Cloudinary |
| Validation | Zod (frontend + backend) |
| LLM Runtime | Ollama (local) |

---

## API Reference

All routes under `/api/goals`, `/api/entries`, `/api/reports`, and `/api/ai` require a valid JWT in the `Authorization: Bearer <token>` header.

| Area | Method | Endpoint | Description |
|---|---|---|---|
| Auth | POST | `/api/auth/signup` | Register a new user |
| Auth | POST | `/api/auth/login` | Login, receive JWT |
| Goals | GET | `/api/goals?date=&page=&limit=` | List goals (paginated); resolves active goal for `date` |
| Goals | POST | `/api/goals` | Create a goal |
| Goals | PUT | `/api/goals/:id` | Update a goal |
| Entries | GET | `/api/entries?start=&end=&meal=&page=&limit=&sort=` | List entries (paginated, filterable) |
| Entries | POST | `/api/entries` | Create a food entry |
| Entries | PUT | `/api/entries/:id` | Update a food entry |
| Entries | DELETE | `/api/entries/:id` | Delete a food entry |
| Reports | GET | `/api/reports/weekly-calories?start=&end=` | Daily calorie totals for date range |
| Reports | GET | `/api/reports/macros?start=&end=` | Daily macro breakdown |
| Reports | GET | `/api/reports/micronutrients?start=&end=` | Aggregated micronutrient totals |
| Reports | GET | `/api/reports/goal-vs-actual?start=&end=` | Goal targets vs actual intake |
| AI | POST | `/api/ai/extract-nutrition` | Upload food image, get nutrition JSON |
| AI | POST | `/api/ai/chat` | Send message, stream SSE reply |
| AI | GET | `/api/ai/chat/history` | Retrieve chat history |

Paginated list responses include a `pagination` object: `{ page, limit, total, pages }`.

---

## Project Structure

```
typeface-assignment/          # Repo root
├── src/                      # React frontend
│   ├── components/
│   │   ├── ui/               # shadcn/ui base components
│   │   ├── layout/           # Sidebar, Header, Layout wrapper
│   │   ├── dashboard/        # CalorieRing, MacroRings, Sparkline
│   │   ├── meals/            # MealTimeline, MealCard, FoodEntryForm, ImageUpload
│   │   ├── reports/          # Charts and summary tables
│   │   ├── goals/            # GoalForm
│   │   └── chat/             # ChatPanel (SSE streaming)
│   ├── pages/                # Route-level page components
│   ├── store/                # Zustand stores (auth, entries, goals, theme)
│   ├── lib/                  # Axios client, utilities, validators
│   └── types/                # Shared TypeScript interfaces
├── server/                   # Express backend
│   └── src/
│       ├── models/           # Mongoose schemas
│       ├── routes/           # Express routers
│       ├── controllers/      # Request handlers
│       ├── services/         # MongoDB aggregation / report logic
│       ├── middleware/       # Auth guard, validation, error handler
│       ├── ai/               # ollamaVision.ts, agent.ts (LangGraph)
│       └── config/           # DB connection
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## Setup

### Prerequisites

- **Node.js 18+**
- **MongoDB** — local instance or [MongoDB Atlas](https://cloud.mongodb.com)
- **Ollama** — running locally at `http://localhost:11434` with the following models pulled:
  ```bash
  ollama pull qwen3-vl:8b    # vision model for image extraction
  ollama pull qwen2.5:7b     # text model for nutrition estimation and chat
  ```
- **Cloudinary** account — for image storage ([cloudinary.com](https://cloudinary.com))

### 1. Install dependencies

```bash
# Backend
cd server && npm install

# Frontend (from repo root)
npm install
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | — |
| `JWT_SECRET` | Random secret for signing tokens | — |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_VISION_MODEL` | Vision model name | `qwen3-vl:8b` |
| `OLLAMA_TEXT_MODEL` | Text model for nutrition estimation | `qwen2.5:7b` |
| `OLLAMA_CHAT_MODEL` | Text model for chat agent | `qwen2.5:7b` |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard | — |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard | — |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard | — |

### 3. Run

```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)**. Vite proxies all `/api` requests to the backend automatically.
