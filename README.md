# Apex Agent

Professional automotive telemetry analytics suite for the Handshake x OpenAI challenge.

## Run

```bash
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd install` and `npm.cmd run dev` if script execution policy blocks `npm.ps1`.

Then upload `public/mock_telemetry.csv` or click the in-app mock telemetry button.

Use `vercel dev` when you want to test the `/api/analyze` serverless route locally with real environment variables. Plain `npm run dev` runs the Vite frontend only.

## Vertex AI

The app is wired for Vertex AI through the Vercel Serverless Function at `api/analyze.js`. Add the variables in `.env.example` to Vercel as server-side environment variables to call Gemini 3 Flash. Without credentials, Apex Agent generates a local race-engineer demo report so the dashboard remains testable.

Do not prefix the API key with `VITE_`. The browser posts parsed CSV telemetry to `/api/analyze`, and only the serverless function reads `process.env.VERTEX_API_KEY`.
