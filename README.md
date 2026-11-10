# MyWin

Log small daily wins in one tap, then look back at them.

Built with Next.js, TypeScript, Tailwind CSS and Postgres.

## Run locally

You need [Node.js](https://nodejs.org) 20+ and [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm install
cp .env.example .env.local   # then set MYWIN_TOKEN
docker compose up -d         # start Postgres in the background
npm run dev                  # http://localhost:3000
```

The `wins` table is created automatically on the first request.

### Try the API

```bash
TOKEN=your-token-from-.env.local

# Log a win
curl -X POST http://localhost:3000/api/wins \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "hit 225 on bench", "difficulty": 4}'

# List recent wins
curl http://localhost:3000/api/wins -H "Authorization: Bearer $TOKEN"
```

To stop Postgres: `docker compose down` (your data is kept in a Docker volume).
