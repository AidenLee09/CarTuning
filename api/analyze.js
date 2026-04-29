const system_instruction = `You are a Senior Race Engineer for Hyundai N and Corvette platforms. Analyze CSV telemetry like a calibration lead: focus on boost control, intake air temperature, ignition timing, AFR stability, repeatability, and parts that should be changed before adding power. Be precise, practical, and avoid generic tuning advice.`;

const VERTEX_TIMEOUT_MS = 25_000;

function getVertexEndpoint() {
  if (!process.env.VERTEX_PROJECT_ID || !process.env.VERTEX_API_KEY) {
    return null;
  }

  return `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${process.env.VERTEX_PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-3-flash-preview:generateContent?key=${process.env.VERTEX_API_KEY}`;
}

function buildPrompt({ fileName, rowCount, summary, sampleRows, missingColumns, roadmap }) {
  return `
Analyze this telemetry upload for Apex Agent.

File: ${fileName}
Rows parsed: ${rowCount}
Missing PIDs: ${missingColumns.length ? missingColumns.join(', ') : 'None'}

Summary:
- Max Boost: ${summary.maxBoost.value} ${summary.maxBoost.unit} at ${summary.maxBoost.rpm} RPM
- Peak IAT: ${summary.peakIat.value} ${summary.peakIat.unit} at ${summary.peakIat.rpm} RPM
- Ignition Timing at Max Boost: ${summary.timingAtMaxBoost.value} ${summary.timingAtMaxBoost.unit}
- Average AFR: ${summary.averageAfr.value}${summary.averageAfr.unit}

Top 20 high-load telemetry rows:
${JSON.stringify(sampleRows, null, 2)}

Initial parts roadmap:
${JSON.stringify(roadmap, null, 2)}

Return Markdown with these sections:
1. Race Engineer Verdict
2. Risks Found
3. Calibration Notes
4. Parts Roadmap
5. Trackside Checklist
`;
}

function buildLocalReport({ summary, sampleRows, missingColumns, roadmap }) {
  const hottestRow = sampleRows.reduce(
    (best, row) => (row.iat > (best?.iat ?? -Infinity) ? row : best),
    null,
  );

  const leanestRow = sampleRows.reduce(
    (best, row) => (row.afr > (best?.afr ?? -Infinity) ? row : best),
    null,
  );

  const timingPressure =
    summary.timingAtMaxBoost.value <= 6
      ? 'Timing is being pulled hard near peak boost. Treat ignition stability as the next constraint.'
      : 'Timing remains usable near peak boost, so thermal repeatability is the next place to look.';

  return `## Race Engineer Verdict

This pull shows **${summary.maxBoost.value} ${summary.maxBoost.unit}** peak boost with **${summary.peakIat.value} ${summary.peakIat.unit}** peak intake temperature. ${timingPressure}

## Risks Found

- **Thermal load:** IAT peaks near ${hottestRow?.rpm ?? summary.peakIat.rpm} RPM, which can reduce repeatable power on back-to-back pulls.
- **Ignition margin:** Timing at peak boost is **${summary.timingAtMaxBoost.value} ${summary.timingAtMaxBoost.unit}**.
- **Fueling:** Average AFR is **${summary.averageAfr.value}${summary.averageAfr.unit}**${leanestRow?.afr ? `, with the leanest high-load row at ${leanestRow.afr}:1.` : '.'}
${missingColumns.length ? `- **Missing PIDs:** ${missingColumns.join(', ')}. Add these channels before final calibration decisions.` : ''}

## Calibration Notes

Hold boost targets steady until IAT is controlled. If this is a Hyundai N or Corvette road-course setup, prioritize repeatability over one-pull peak power: stable charge temps, conservative plug heat range, and clean AFR delivery will make the car easier to trust.

## Parts Roadmap

${roadmap.map((item) => `- **${item.part}:** ${item.reason}`).join('\n')}

## Trackside Checklist

- Re-log a third-gear pull after heat soak.
- Confirm plug condition and gap before adding boost.
- Compare commanded vs actual AFR on the next CSV export.
- Add knock, coolant temp, and throttle angle PIDs if available.`;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  const rawBody = await readRawBody(req);
  return rawBody ? JSON.parse(rawBody) : {};
}

function getTelemetryPayload(body) {
  return body.telemetry || body.csvData || body;
}

function validateTelemetryPayload(telemetry) {
  const required = ['fileName', 'rowCount', 'summary', 'sampleRows', 'missingColumns', 'roadmap'];
  const missing = required.filter((key) => telemetry[key] === undefined);

  if (missing.length) {
    throw new Error(`Missing telemetry fields: ${missing.join(', ')}`);
  }

  if (!Array.isArray(telemetry.sampleRows) || !telemetry.sampleRows.length) {
    throw new Error('Telemetry payload must include sampleRows.');
  }
}

async function callGemini(telemetry) {
  const endpoint = getVertexEndpoint();

  if (!endpoint) {
    return {
      mode: 'local',
      markdown: buildLocalReport(telemetry),
      warning: 'Vertex AI server environment variables are not configured, so a local demo report was generated.',
    };
  }

  let timeoutId;

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), VERTEX_TIMEOUT_MS);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system_instruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt(telemetry) }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1300,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI error response:', errorText);
      throw new Error(`Vertex AI request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const markdown = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('\n\n');

    if (!markdown) {
      throw new Error('Vertex AI returned an empty response.');
    }

    return { mode: 'vertex', markdown };
  } catch (error) {
    console.error(error);
    return {
      mode: 'fallback',
      markdown: buildLocalReport(telemetry),
      warning: 'Vertex AI was unreachable from the serverless function, so Apex Agent generated a local report.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await parseRequestBody(req);
    const telemetry = getTelemetryPayload(body);

    validateTelemetryPayload(telemetry);

    const analysis = await callGemini(telemetry);
    return res.status(200).json(analysis);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message || 'Apex Agent could not analyze this telemetry payload.',
    });
  }
}
