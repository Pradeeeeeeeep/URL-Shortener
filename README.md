# 🔗 Pingalo — Modern URL Shortener

A high-performance, full-stack URL Shortener built with **FastAPI**, **PostgreSQL (Neon)**, **Redis Cache**, and a responsive frontend interface. Deployed serverless on **Vercel**.

🌐 **Live Demo:** [https://url-shortener-phi-liart.vercel.app](https://url-shortener-phi-liart.vercel.app)

---

## ✨ Features

- **⚡ Blazing Fast Redirections**: Redis caching layer provides sub-millisecond URL resolution with graceful fallback to PostgreSQL.
- **📊 Real-Time Click Analytics**: Asynchronous background click tracking increments metrics without adding latency to redirects.
- **⏳ Flexible Expiration**: Set link lifespans (2 days, 7 days, 30 days, or permanent non-expiring links).
- **🛡️ Collision-Safe Short Codes**: Cryptographically secure 6-character base62 tokens with automatic retry handling.
- **🎨 Premium UI Dashboard**: Modern sage/mint aesthetic with real-time KPI cards (Total Links, Total Clicks, Added This Month, Active Links).
- **📋 One-Click Copy & Share**: Native clipboard integration and Web Share API support.
- **📈 Analytics Modal**: View detailed per-link statistics, creation timestamp, expiry countdown, and status.
- **🚀 Serverless Ready**: Configured for instant deployment on Vercel with automated table creation.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (Hosted on [Neon](https://neon.tech/)) |
| **ORM** | [SQLAlchemy 2.0](https://www.sqlalchemy.org/) |
| **Cache Layer** | [Redis](https://redis.io/) / [Upstash](https://upstash.com/) |
| **Data Validation** | [Pydantic v2](https://docs.pydantic.dev/) |
| **Frontend** | Vanilla HTML5, Modern CSS3 (Custom Design System), ES6+ JavaScript |
| **Deployment** | [Vercel](https://vercel.com/) (Serverless Python runtime) |

---

## 📁 Project Structure

```text
URL-Shortener/
├── api/                   # Vercel Serverless entrypoints
│   ├── index.py           # FastAPI application & routing middleware
│   ├── database.py        # SQLAlchemy engine & session manager
│   ├── models.py          # PostgreSQL URL table model
│   ├── redis_client.py    # Redis cache client with safe error handling
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── utils.py           # Collision-safe short code generator
│   └── routes/
│       └── urls.py        # Core API endpoints (/urls, /{code}, stats)
├── frontend/              # Frontend source code
│   ├── index.html         # Application markup & UI layout
│   ├── style.css          # Design system, KPI cards, and responsive styles
│   └── app.js             # API integration, state management, and modal logic
├── public/                # Static assets served at root on Vercel
├── backend/               # Local backend environment and scripts
├── vercel.json            # Vercel deployment and routing rules
├── requirements.txt       # Python dependencies
└── README.md
```

---

## 🔌 API Endpoints

### 1. Create Short URL
- **Method:** `POST`
- **Path:** `/urls`
- **Request Body:**
  ```json
  {
    "original_url": "https://example.com/very/long/url",
    "expires_at": "2026-09-05T00:00:00Z"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "id": 1,
    "short_code": "ISdylp",
    "original_url": "https://example.com/very/long/url",
    "created_at": "2026-08-30T05:00:00Z",
    "expires_at": "2026-09-05T00:00:00Z",
    "click_count": 0
  }
  ```

---

### 2. Redirect to Original URL
- **Method:** `GET`
- **Path:** `/{short_code}`
- **Response:** `307 Temporary Redirect` -> Redirects directly to `original_url`.

---

### 3. Get Link Analytics & Stats
- **Method:** `GET`
- **Path:** `/urls/{short_code}`
- **Response (`200 OK`):**
  ```json
  {
    "id": 1,
    "short_code": "ISdylp",
    "original_url": "https://example.com/very/long/url",
    "created_at": "2026-08-30T05:00:00Z",
    "expires_at": "2026-09-05T00:00:00Z",
    "click_count": 42,
    "is_expired": false
  }
  ```

---

### 4. Health Check
- **Method:** `GET`
- **Path:** `/health`
- **Response (`200 OK`):**
  ```json
  {
    "status": "ok"
  }
  ```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- Python 3.9+
- Redis (Optional, application gracefully falls back to DB if offline)
- PostgreSQL database URL (e.g. from Neon or local Postgres)

### 1. Clone Repository
```bash
git clone https://github.com/Pradeeeeeeeep/URL-Shortener.git
cd URL-Shortener
```

### 2. Set Up Virtual Environment & Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
REDIS_URL=redis://localhost:6379
```

### 4. Start Local Development Server
```bash
uvicorn api.index:app --reload --host 127.0.0.1 --port 8000
```

Open your browser at **`http://127.0.0.1:8000/`** to use the application.

---

## ☁️ Deploying to Vercel

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Login to your Vercel account:
   ```bash
   vercel login
   ```
3. Set your PostgreSQL connection string in Vercel:
   ```bash
   vercel env add DATABASE_URL production
   ```
4. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
