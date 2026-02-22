# NutriTrack — Personal Calorie Tracker

**typeface-assignment** by **Raunak Agarwal**

A full-stack application that helps users **monitor, manage, and understand their daily nutritional intake**. Users can log meals (breakfast, lunch, dinner, snacks), set personalized health goals, view macro/micro trends and reports, extract nutrition from photos via AI, and use a conversational chat to log meals, check goals, and get summaries. Multiple users can sign up, log in, and keep their data private.

---

## Assignment Requirements → Implementation

This section maps each requirement from the assignment to how the app implements it.

### 1. Goal Setting

**Requirement:** Ability to set and manage personal health goals (e.g., daily calorie target, protein/carb/fat targets, weight goal) through the web app.

**Implementation:**

- **Goals page** (`/goals`): Create and edit goals with:
  - **Daily calorie target**
  - **Macro targets:** protein, carbs, fat (grams)
  - **Weight goal** (optional)
  - **Date range:** start date, optional end date, optional target date
- Goals are **per-user** and stored in the database. The app resolves the “active” goal for a given date (e.g., today) and uses it for dashboard rings and Reports.

---

### 2. Meal Entry

**Requirement:** Ability to create food entries grouped by meal type (Breakfast, Lunch, Dinner, Snacks) with fields for food item name, quantity, and nutritional values (calories, macros, micros).

**Implementation:**

- **Meals page** (`/meals`): Add and edit food entries with:
  - **Meal type:** Breakfast, Lunch, Dinner, Snack
  - **Food name**, **quantity**, **unit**
  - **Calories**
  - **Macros:** protein, carbs, fats (grams)
  - **Micronutrients:** flexible key-value pairs (e.g., vitamin C, iron, sodium)
- Entries can be created **manually** or **from AI extraction** (see below). Each entry is stored with a `source` of `manual` or `ai`.

---

### 3. Time-Range Listing

**Requirement:** List all food entries in a specified time range through the web app, filterable by date and meal type.

**Implementation:**

- **Entries list API:** `GET /api/entries?start=&end=&meal=&page=&limit=&sort=`
  - **start / end:** ISO date range for the entries.
  - **meal:** filter by `breakfast`, `lunch`, `dinner`, or `snack`.
  - **page / limit:** pagination (required for all list APIs per assignment).
  - **sort:** e.g. by `timestamp` (default descending).
- **Meals page UI:** Users pick a date (or “today”) and optionally a meal filter. The timeline shows entries for that date/meal; pagination is used when fetching more entries.

---

### 4. Nutrition Reports & Graphs

**Requirement:** Display visual reports including: weekly calorie intake trend, macronutrient breakdown (protein, carbs, fat) by day/week, micronutrient summary (vitamins, minerals), and goal vs. actual comparison charts.

**Implementation:**

- **Reports page** (`/reports`) exposes:
  1. **Weekly calorie intake trend** — line or bar chart of total calories per day for the selected week.
  2. **Macronutrient breakdown** — stacked bar chart of protein, carbs, and fat by day (or week).
  3. **Micronutrient summary** — table/list of vitamins and minerals with totals and/or daily averages (e.g., progress bars).
  4. **Goal vs. actual comparison** — chart comparing daily (or weekly) calorie and macro targets to actual intake.
- **APIs (all protected):**
  - `GET /api/reports/weekly-calories?start=&end=`
  - `GET /api/reports/macros?start=&end=`
  - `GET /api/reports/micronutrients?start=&end=`
  - `GET /api/reports/goal-vs-actual?start=&end=`
- Frontend uses **Recharts** for graphs; data is fetched from the backend only via these APIs.

---

### 5. AI-Powered Calorie Extraction

**Requirement:** Ability to upload a photo (product nutrition label or a plate of food) and automatically extract and pre-fill calorie and nutritional information using AI image analysis.

**Implementation:**

- **Image upload flow** (on Meals page or in the meal entry form):
  1. User uploads an image (nutrition label or plate of food).
  2. Image is stored on **Cloudinary**; the backend fetches the URL and runs the **AI extraction pipeline** (see *Approach for AI features* below).
  3. The API returns extracted foods with: name, calories, protein, carbs, fats, quantity, unit, and a confidence score.
  4. The UI **pre-fills** the meal form with this data; user can edit and then save. Saved entry is stored with `source: "ai"` and optional `imageId`.
- **API:** `POST /api/ai/extract-nutrition` (multipart image upload). Response includes extracted nutrition and confidence.
- All processing is done in the **backend**; frontend only calls this API and displays/edits the result.

---

### 6. Conversational Chat Interface

Users can perform app actions through natural language (logging meals, checking goals, nutritional questions, weekly summaries) via a chat panel, without using the traditional UI.

- **Chat panel** in the app: users send messages in natural language.
- Backend uses an **LLM with tool calling**: the model has access to tools (e.g. log meal, get today’s entries, weekly summary, get/update goals, edit/delete entries). It decides when to call which tool and with what arguments; tools run against the database and return data; the model turns that into a natural-language reply.
- Users can say things like: “I had 2 rotis and dal for dinner”, “How many calories did I eat today?”, “Set my calorie target to 2000”, “Give me a weekly summary.” The approach is described in *Approach for AI features* below.
- **APIs:** `POST /api/ai/chat` (send message, optionally streamed), `GET /api/ai/chat/history`. Chat history is stored per user in the database.

---

### 7. Multi-User Support

Multiple independent users can sign up, log in, and maintain their own private data.

- **Auth:** Sign up and login via **JWT** (tokens) and **bcrypt** for password hashing.
- **APIs:** `POST /api/auth/signup`, `POST /api/auth/login`. Protected routes use a middleware that validates the JWT and attaches the current user.
- **Data isolation:** All stored data is **user-scoped:** FoodEntry, Goal, User, ChatMessage, ImageUpload (and any other user data) include `userId`. All list/read/write operations filter by the authenticated user. Each user sees only their own goals, entries, reports, and chat history.

---

## Approach for AI Features

### Image-based nutrition extraction

- **Two-stage pipeline** (runs entirely in the backend):
  1. **Stage 1 — Vision model:** The uploaded image (after storage on Cloudinary) is sent to **Ollama** using the vision model **qwen3-vl:8b**. The prompt asks only for a comma-separated list of food or product names visible in the image (nutrition label or plate). This keeps the vision step fast and focused.
  2. **Stage 2 — Text model:** The food names from stage 1 are sent to **Ollama** using the text model **llama3.2:3b** with a structured prompt. The model acts as a “nutrition expert” and returns a **single JSON object** with estimated per-serving values: `name`, `calories`, `protein`, `carbs`, `fats`, `quantity`, `unit`, plus an overall `confidence` and optional `rawText`. No image is sent in stage 2, which keeps latency and cost lower.
- **Output handling:** The backend parses and normalizes the JSON (e.g. coercing numbers, fixing common model mistakes like fractions or units in numeric fields), then returns the list of foods and confidence to the frontend. The UI pre-fills the meal form; the user can correct and save. Saved entries are tagged `source: "ai"` and can store an `imageId` reference.

### Conversational chat

- **Tool-augmented LLM:** The chat uses an **LLM** (e.g. Ollama, configurable via `OLLAMA_CHAT_MODEL`) with the **Vercel AI SDK** (`streamText`). The model is given a **system prompt** that includes the user’s current context (today’s intake, goals, today’s entries by meal) and a list of **capabilities** implemented as **tools** (function calling).
- **Tools** include: log a meal (`logMeal`), get today’s entries (`getTodayEntries`), get weekly summary (`getWeeklySummary`), get/update/delete goals (`getCurrentGoals`, `updateGoal`, `deleteGoal`), get entries by date (`getEntriesByDate`), and edit/delete entries (`editEntry`, `deleteEntry`). Each tool is defined with a Zod schema; the model chooses when to call a tool and with what arguments.
- **Flow:** User message → model may call one or more tools → backend executes tools against the database (with the authenticated user’s ID) → tool results are passed back to the model → model produces a natural-language reply. Responses can be **streamed** to the frontend. The model is instructed to ask for missing info (e.g. meal type or quantity) before logging food, and to answer “what did I eat for lunch?” from the context or by calling `getTodayEntries` when needed.
- **Alternative (intent-routing):** The codebase also includes an optional path using **LangGraph** and **Gemini**: the user message is first classified into an intent (e.g. log_food, query_stats, update_goal, general_qa), then routed to a dedicated handler that calls Gemini with the appropriate prompt and, for log_food/query_stats/update_goal, performs the corresponding DB actions. The main chat UI uses the **tool-calling** approach above; the intent-routing path can be used where a separate orchestration graph is preferred.

---

## Data Model & Programming Choices

- **Data model:** MongoDB with Mongoose. Five collections:
  - **User:** `name`, `email`, `passwordHash`; timestamps. Passwords are hashed with bcrypt before save.
  - **Goal:** `userId` (ref User), `name`, `startDate`, `endDate`, `targetDate`, `calorieTarget`, `proteinTarget`, `carbsTarget`, `fatTarget`, `weightGoal` (optional); timestamps. Indexed by `userId` + `startDate`, and `userId` + `endDate`.
  - **FoodEntry:** `userId` (ref User), `mealType` (enum: breakfast | lunch | dinner | snack), `foodName`, `quantity`, `unit`, `calories`, `macros` (object: `protein`, `carbs`, `fats`), `micronutrients` (Map of string → number), `timestamp`, `source` (enum: manual | ai), `imageId` (ref ImageUpload, optional); timestamps. Indexed by `userId` + `timestamp`, and `userId` + `mealType` + `timestamp`.
  - **ChatMessage:** `userId` (ref User), `role` (user | assistant), `content`, optional `metadata` (intent, actionTaken, entriesCreated); timestamps. Indexed by `userId` + `createdAt`.
  - **ImageUpload:** `userId` (ref User), `imageUrl`, `extractedText`, `extractedNutrition` (object with `foods` array: each item has `name`, `calories`, `protein`, `carbs`, `fats`, `quantity`, `unit`), `confidenceScore` (0–1); timestamps.
- **APIs separate from frontend:** All business logic and data access live in the **backend** (Node.js + Express + TypeScript). The **frontend** (React + Vite + TypeScript) talks to the backend **only via HTTP APIs**; no database or server code in the frontend.
- **Persistence:** All food entries, goals, and user-related data are persisted in the database. Reports are computed from stored entries and goals (no client-side-only storage for core data).
- **Pagination:** List APIs support pagination:
  - **Entries:** `GET /api/entries?page=&limit=`
  - **Goals:** `GET /api/goals?page=&limit=` (when listing goals)
  - Responses include a `pagination` object (e.g. `page`, `limit`, `total`, `pages`) and an `entries` (or similar) array.

---

## Tech Stack


| Layer         | Technology                                                         |
| ------------- | ------------------------------------------------------------------ |
| Frontend      | React 19 + Vite + TypeScript                                       |
| Styling       | Tailwind CSS + shadcn/ui                                           |
| Charts        | Recharts                                                           |
| State         | Zustand                                                            |
| Backend       | Node.js + Express + TypeScript                                     |
| Database      | MongoDB + Mongoose                                                 |
| Auth          | JWT + bcrypt                                                       |
| AI (image)    | Ollama: vision model (e.g. qwen3-vl) + text model                  |
| AI (chat)     | Vercel AI SDK + Ollama (tool calling); optional LangGraph + Gemini |
| Image storage | Cloudinary                                                         |
| Validation    | Zod (frontend + backend)                                           |


---

## Project Structure

```
typrface/
├── typeface-assignment/           # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui base components
│   │   │   ├── layout/            # Sidebar, Header, Layout
│   │   │   ├── dashboard/         # CalorieRing, MacroRings, Sparkline
│   │   │   ├── meals/             # MealTimeline, MealCard, FoodEntryForm, ImageUpload
│   │   │   ├── reports/           # Charts and tables
│   │   │   ├── goals/             # GoalForm
│   │   │   └── chat/              # ChatPanel
│   │   ├── pages/                 # Dashboard, Meals, Goals, Reports
│   │   ├── store/                 # Zustand (entries, goals, auth)
│   │   ├── lib/                   # API client, utils, validators
│   │   └── types/                 # TypeScript interfaces
│   └── ...
├── typeface-assignment/server/    # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── models/                # User, Goal, FoodEntry, ChatMessage, ImageUpload
│   │   ├── routes/                # auth, goals, entries, reports, ai
│   │   ├── controllers/           # Request handlers
│   │   ├── services/              # Report aggregation logic
│   │   ├── middleware/            # Auth, validation, error handling
│   │   ├── ai/                    # Gemini + LangGraph (extract-nutrition, chat)
│   │   └── config/                # Database connection
│   └── ...
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Ollama (local) with a vision model (e.g. qwen3-vl:8b) and a text model (e.g. llama3.2:3b) for AI extraction and chat; optional: Gemini API key if using the LangGraph path
- Cloudinary account (for image uploads)

### 1. Install dependencies

```bash
# Backend
cd typeface-assignment/server
npm install

# Frontend
cd ../typeface-assignment
npm install
```

### 2. Environment

```bash
cd typeface-assignment/server
cp .env.example .env
```

Configure:

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Secure random string
- `OLLAMA_BASE_URL` — Optional; defaults to `http://localhost:11434`
- `OLLAMA_VISION_MODEL` — Optional; e.g. `qwen3-vl:8b` for image extraction
- `OLLAMA_TEXT_MODEL` —  `llama3.2:3b` for nutrition estimation
- `OLLAMA_CHAT_MODEL` —  `llama3.2:3b` for chat
- `CLOUDINARY_*` — From Cloudinary dashboard

### 3. Run

```bash
# Terminal 1 — Backend
cd typeface-assignment/server
npm run dev

# Terminal 2 — Frontend
cd typeface-assignment
npm run dev
```

- Frontend: **[http://localhost:5173](http://localhost:5173)**
- Backend: **[http://localhost:5000](http://localhost:5000)**  
(Vite proxies `/api` to the backend.)

---

## API Summary


| Area    | Method | Endpoint                                            | Description                     |
| ------- | ------ | --------------------------------------------------- | ------------------------------- |
| Auth    | POST   | `/api/auth/signup`                                  | Register                        |
| Auth    | POST   | `/api/auth/login`                                   | Login                           |
| Goals   | GET    | `/api/goals?date=&page=&limit=`                     | Get/list goals (paginated)      |
| Goals   | POST   | `/api/goals`                                        | Create goal                     |
| Goals   | PUT    | `/api/goals/:id`                                    | Update goal                     |
| Entries | GET    | `/api/entries?start=&end=&meal=&page=&limit=&sort=` | List entries (paginated)        |
| Entries | POST   | `/api/entries`                                      | Create entry                    |
| Entries | PUT    | `/api/entries/:id`                                  | Update entry                    |
| Entries | DELETE | `/api/entries/:id`                                  | Delete entry                    |
| Reports | GET    | `/api/reports/weekly-calories`                      | Weekly calorie trend            |
| Reports | GET    | `/api/reports/macros`                               | Macro breakdown                 |
| Reports | GET    | `/api/reports/micronutrients`                       | Micronutrient summary           |
| Reports | GET    | `/api/reports/goal-vs-actual`                       | Goal vs actual                  |
| AI      | POST   | `/api/ai/extract-nutrition`                         | Upload image, extract nutrition |
| AI      | POST   | `/api/ai/chat`                                      | Send chat message               |
| AI      | GET    | `/api/ai/chat/history`                              | Chat history                    |


All routes under goals, entries, reports, and AI are **protected** (require valid JWT).

---

