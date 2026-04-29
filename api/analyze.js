const system_instruction = `You are a Senior Race Engineer for Hyundai N and Corvette platforms. Analyze CSV telemetry like a calibration lead: focus on boost control, intake air temperature, ignition timing, AFR stability, repeatability, and parts that should be changed before adding power. Be precise, practical, and avoid generic tuning advice.`;

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_TIMEOUT_MS = 25_000;

function getGenerativeLanguageEndpoint() {
  if (!process.env.VERTEX_API_KEY) {
    return null;
  }

  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
}

function clampScore(value, fallback = 70) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function cleanString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function topItems(items, count) {
  return Array.isArray(items) ? items.slice(0, count) : [];
}

function clampDelta(value, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(-8, Math.min(18, Math.round(number)));
}

function buildScoreDelta(item = {}) {
  const part = `${item.part ?? ''} ${item.priority ?? ''}`.toLowerCase();

  if (part.includes('intercooler') || part.includes('duct') || part.includes('thermal')) {
    return { health: 7, thermal: 14, fueling: 0, ignition: 3 };
  }

  if (part.includes('spark') || part.includes('plug') || part.includes('ignition')) {
    return { health: 5, thermal: 0, fueling: 0, ignition: 12 };
  }

  if (part.includes('fuel') || part.includes('injector') || part.includes('pump')) {
    return { health: 6, thermal: 0, fueling: 14, ignition: 1 };
  }

  if (part.includes('boost') || part.includes('solenoid') || part.includes('clamp') || part.includes('charge')) {
    return { health: 4, thermal: 2, fueling: 0, ignition: 3 };
  }

  return { health: 3, thermal: 2, fueling: 2, ignition: 2 };
}

function normalizeScoreDelta(rawDelta, fallbackDelta) {
  return {
    health: clampDelta(rawDelta?.health, fallbackDelta.health),
    thermal: clampDelta(rawDelta?.thermal, fallbackDelta.thermal),
    fueling: clampDelta(rawDelta?.fueling, fallbackDelta.fueling),
    ignition: clampDelta(rawDelta?.ignition, fallbackDelta.ignition),
  };
}

function rangeFor(rows, key, unit) {
  const values = rows
    .map((row) => ({
      value: Number(row[key]),
      rpm: Number(row.rpm),
    }))
    .filter((row) => Number.isFinite(row.value));

  if (!values.length) {
    return { max: 0, min: 0, unit, maxRpm: 0, minRpm: 0 };
  }

  const maxRow = values.reduce((best, row) => (row.value > best.value ? row : best), values[0]);
  const minRow = values.reduce((best, row) => (row.value < best.value ? row : best), values[0]);
  const digits = key === 'afr' ? 2 : 1;

  return {
    max: Number(maxRow.value.toFixed(digits)),
    min: Number(minRow.value.toFixed(digits)),
    unit,
    maxRpm: Number.isFinite(maxRow.rpm) ? Math.round(maxRow.rpm) : 0,
    minRpm: Number.isFinite(minRow.rpm) ? Math.round(minRow.rpm) : 0,
  };
}

function getSensorPeaks(telemetry) {
  if (telemetry.sensorPeaks) {
    return telemetry.sensorPeaks;
  }

  const rows = Array.isArray(telemetry.rows) && telemetry.rows.length
    ? telemetry.rows
    : telemetry.sampleRows;

  return {
    boost: rangeFor(rows, 'boost', 'psi'),
    iat: rangeFor(rows, 'iat', 'F'),
    afr: rangeFor(rows, 'afr', ':1'),
  };
}

function buildPrompt({ fileName, rowCount, summary, sampleRows, missingColumns, roadmap, sensorPeaks }) {
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

Deterministic sensor peaks calculated by Apex Agent:
${JSON.stringify(sensorPeaks, null, 2)}

Return ONLY valid JSON. Do not wrap it in Markdown fences.

JSON schema:
{
  "health_score": number from 0 to 100,
  "vitals": {
    "thermal": number from 0 to 100,
    "fueling": number from 0 to 100,
    "ignition": number from 0 to 100
  },
  "lead_verdict": "1-2 sentence technical summary",
  "anomalies": [
    { "severity": "critical" | "warning", "issue": "specific issue", "fix": "specific fix" }
  ],
  "roadmap": [
    {
      "priority": 1,
      "part": "specific part",
      "impact": "specific impact",
      "score_delta": {
        "health": number from -8 to 18,
        "thermal": number from -8 to 18,
        "fueling": number from -8 to 18,
        "ignition": number from -8 to 18
      }
    }
  ],
  "track_prep": [
    "step 1",
    "step 2",
    "step 3",
    "step 4",
    "step 5"
  ],
  "markdown_report": "Short Markdown report with sections: Race Engineer Verdict, Risks Found, Calibration Notes, Parts Roadmap, Trackside Checklist"
}

Scoring guidance:
- Higher scores mean healthier, safer, and more track-ready.
- Penalize thermal score when IAT is high or rises sharply.
- Penalize fueling score when AFR is lean under boost or excessively rich.
- Penalize ignition score when timing is low near peak boost.
- Give each roadmap item a conservative score_delta estimating what would happen if the user applied that fix before the next run.
- Score deltas should be realistic and modest; do not promise a perfect score.
- Keep parts and fixes practical for Hyundai N and Corvette platforms.
`;
}

function buildGeminiPrompt(telemetry) {
  const preparedTelemetry = {
    ...telemetry,
    sensorPeaks: getSensorPeaks(telemetry),
  };

  return `${system_instruction}

${buildPrompt(preparedTelemetry)}`;
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

function buildLocalAnalysis(telemetry) {
  const { summary, missingColumns, roadmap } = telemetry;
  const sensorPeaks = getSensorPeaks(telemetry);
  const thermalScore = clampScore(100 - Math.max(0, summary.peakIat.value - 95) * 1.4, 76);
  const fuelingPenalty = Math.abs(summary.averageAfr.value - 11.8) * 13;
  const fuelingScore = clampScore(94 - fuelingPenalty, 84);
  const ignitionScore = clampScore(62 + summary.timingAtMaxBoost.value * 4, 78);
  const healthScore = clampScore((thermalScore * 0.38) + (fuelingScore * 0.3) + (ignitionScore * 0.32), 78);
  const anomalies = [];

  if (summary.peakIat.value >= 135) {
    anomalies.push({
      severity: 'critical',
      issue: `Peak IAT reached ${summary.peakIat.value}${summary.peakIat.unit}.`,
      fix: 'Upgrade intercooling and verify duct sealing before raising boost.',
    });
  } else if (summary.peakIat.value >= 115) {
    anomalies.push({
      severity: 'warning',
      issue: `IAT climbed to ${summary.peakIat.value}${summary.peakIat.unit}.`,
      fix: 'Improve charge-air cooling and re-log after heat soak.',
    });
  }

  if (summary.timingAtMaxBoost.value <= 6) {
    anomalies.push({
      severity: 'warning',
      issue: `Ignition timing dropped to ${summary.timingAtMaxBoost.value}${summary.timingAtMaxBoost.unit} near peak boost.`,
      fix: 'Inspect plug gap and add knock retard to the next log.',
    });
  }

  if (summary.averageAfr.value > 12.2) {
    anomalies.push({
      severity: 'critical',
      issue: `Average AFR is ${summary.averageAfr.value}${summary.averageAfr.unit} under load.`,
      fix: 'Verify fuel pressure, injector duty, and commanded lambda before another hard pull.',
    });
  }

  if (!anomalies.length) {
    anomalies.push({
      severity: 'warning',
      issue: 'No critical drift detected in the sampled pull.',
      fix: 'Add knock, coolant, throttle angle, and fuel pressure PIDs for the next validation run.',
    });
  }

  return {
    health_score: healthScore,
    vitals: {
      thermal: thermalScore,
      fueling: fuelingScore,
      ignition: ignitionScore,
    },
    lead_verdict:
      healthScore >= 82
        ? 'The pull is generally stable, with the next gains coming from repeatability and better validation channels.'
        : 'The pull needs attention before repeated track use, with thermal load and ignition margin leading the risk profile.',
    sensor_peaks: sensorPeaks,
    anomalies: anomalies.slice(0, 4),
    roadmap: roadmap.map((item, index) => ({
      priority: index + 1,
      part: item.part,
      impact: item.reason,
      score_delta: buildScoreDelta(item),
    })),
    track_prep: [
      'Re-log a third-gear pull after full heat soak.',
      'Inspect spark plug condition and gap.',
      'Verify AFR against commanded lambda under sustained load.',
      'Check charge-pipe clamps and intercooler couplers.',
      missingColumns.length
        ? `Add missing PIDs: ${missingColumns.join(', ')}.`
        : 'Add knock retard, coolant temp, throttle angle, and fuel pressure PIDs.',
    ],
    markdown_report: buildLocalReport(telemetry),
  };
}

function extractJson(text) {
  const trimmed = cleanString(text);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Gemini did not return a JSON object.');
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

function normalizeAnalysis(rawAnalysis, telemetry) {
  const fallback = buildLocalAnalysis(telemetry);
  const rawVitals = rawAnalysis?.vitals ?? {};
  const anomalies = topItems(rawAnalysis?.anomalies, 5).map((item) => ({
    severity: item?.severity === 'critical' ? 'critical' : 'warning',
    issue: cleanString(item?.issue, 'Telemetry anomaly detected.'),
    fix: cleanString(item?.fix, 'Re-log with more validation channels before increasing load.'),
  }));
  const roadmap = topItems(rawAnalysis?.roadmap, 5).map((item, index) => ({
    priority: Number.isFinite(Number(item?.priority)) ? Number(item.priority) : index + 1,
    part: cleanString(item?.part, fallback.roadmap[index]?.part ?? 'Track validation'),
    impact: cleanString(item?.impact, fallback.roadmap[index]?.impact ?? 'Improves confidence in the next run.'),
    score_delta: normalizeScoreDelta(
      item?.score_delta,
      fallback.roadmap[index]?.score_delta ?? buildScoreDelta(item),
    ),
  }));
  const trackPrep = topItems(rawAnalysis?.track_prep, 5).map((step, index) =>
    cleanString(step, fallback.track_prep[index]),
  );

  return {
    health_score: clampScore(rawAnalysis?.health_score, fallback.health_score),
    vitals: {
      thermal: clampScore(rawVitals.thermal, fallback.vitals.thermal),
      fueling: clampScore(rawVitals.fueling, fallback.vitals.fueling),
      ignition: clampScore(rawVitals.ignition, fallback.vitals.ignition),
    },
    lead_verdict: cleanString(rawAnalysis?.lead_verdict, fallback.lead_verdict),
    sensor_peaks: getSensorPeaks(telemetry),
    anomalies: anomalies.length ? anomalies : fallback.anomalies,
    roadmap: roadmap.length ? roadmap.sort((a, b) => a.priority - b.priority) : fallback.roadmap,
    track_prep: trackPrep.length === 5 ? trackPrep : fallback.track_prep,
    markdown_report: cleanString(rawAnalysis?.markdown_report, fallback.markdown_report),
  };
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
  const endpoint = getGenerativeLanguageEndpoint();

  if (!endpoint) {
    const analysis = buildLocalAnalysis(telemetry);

    return {
      mode: 'local',
      analysis,
      markdown: analysis.markdown_report,
      warning: 'Google AI Studio server environment variables are not configured, so a local demo report was generated.',
    };
  }

  let timeoutId;

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.VERTEX_API_KEY,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildGeminiPrompt(telemetry) }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 1400,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;

      try {
        errorMessage = JSON.parse(errorText)?.error?.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      console.error('Google AI Studio error.message:', errorMessage);
      console.error('Google AI Studio status:', response.status, response.statusText);
      throw new Error(`Google AI Studio request failed (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('\n\n');

    if (!rawText) {
      throw new Error('Google AI Studio returned an empty response.');
    }

    const analysis = normalizeAnalysis(extractJson(rawText), telemetry);

    return {
      mode: 'google-ai-studio',
      analysis,
      markdown: analysis.markdown_report,
    };
  } catch (error) {
    console.error(error);

    const safeErrorMessage =
      error.name === 'AbortError'
        ? 'Google AI Studio timed out after 25 seconds.'
        : error.message || 'Unknown Google AI Studio error.';

    const analysis = buildLocalAnalysis(telemetry);

    return {
      mode: 'fallback',
      analysis,
      markdown: analysis.markdown_report,
      warning: `Google AI Studio request failed: ${safeErrorMessage}`,
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
