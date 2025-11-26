# Universal Auth SDK - FastAPI Reference Backend

A production-ready reference implementation of the Universal Auth SDK backend using FastAPI.

## Features

- ✅ All 5 required endpoints implemented
- ✅ JWT-based authentication
- ✅ Secure password hashing (bcrypt)
- ✅ Token refresh with rotation
- ✅ SQLAlchemy ORM (works with SQLite, PostgreSQL, MySQL)
- ✅ CORS support
- ✅ Standard response envelope
- ✅ Type-safe with Pydantic

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your SECRET_KEY
```

### 3. Run the Server

```bash
# Development
uvicorn main:app --reload

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 4. View API Documentation

Open `http://localhost:8000/docs` for interactive API documentation (Swagger UI)

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/sign-in/password` | POST | Sign in with email/password |
| `/auth/sign-up` | POST | Create new account |
| `/auth/token/refresh` | POST | Refresh access token |
| `/auth/session` | GET | Get current user session |
| `/auth/session` | DELETE | Sign out (revoke tokens) |

### Discovery

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/auth-plugin-manifest.json` | GET | Plugin capabilities |

## Example Usage

### Sign Up

```bash
curl -X POST http://localhost:8000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "secure123",
    "name": "Alice"
  }'
```

### Sign In

```bash
curl -X POST http://localhost:8000/auth/sign-in/password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "secure123"
  }'
```

### Get Session

```bash
curl http://localhost:8000/auth/session \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token

```bash
curl -X POST http://localhost:8000/auth/token/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

## Database

By default, uses SQLite (`auth.db`). To use PostgreSQL or MySQL:

1. Install the appropriate driver:
   ```bash
   pip install psycopg2-binary  # PostgreSQL
   # or
   pip install pymysql          # MySQL
   ```

2. Update `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost/authdb
   ```

## Security Checklist

- [x] Passwords hashed with bcrypt
- [x] JWT tokens with expiration
- [x] Refresh token rotation
- [x] HTTPS recommended in production
- [x] CORS configured
- [x] Secure secret key required
- [x] SQL injection prevention (ORM)

## Production Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

Set these in production:

- `SECRET_KEY`: Strong random key (use `openssl rand -hex 32`)
- `DATABASE_URL`: Production database connection
- `CORS_ORIGINS`: Your frontend URLs
- `DEBUG=False`

## License

MIT
