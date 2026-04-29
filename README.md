# Apex Agent

Professional automotive telemetry analytics suite for the Handshake x OpenAI challenge.

## Run

```bash
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd install` and `npm.cmd run dev` if script execution policy blocks `npm.ps1`.

Then upload `public/mock_telemetry.csv` or click the in-app mock telemetry button.

## Vertex AI

The app is wired for Vertex AI through `src/services/apiService.js`. Add the optional variables in `.env.example` to call Gemini 3 Flash. Without credentials, Apex Agent generates a local race-engineer demo report so the dashboard remains testable.

For production, route Vertex AI calls through a backend or serverless proxy instead of exposing credentials in the browser.
