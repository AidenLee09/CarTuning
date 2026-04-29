export const system_instruction = `You are a Senior Race Engineer for Hyundai N and Corvette platforms. Analyze CSV telemetry like a calibration lead: focus on boost control, intake air temperature, ignition timing, AFR stability, repeatability, and parts that should be changed before adding power. Be precise, practical, and avoid generic tuning advice.`;

const PROJECT_ID = import.meta.env.VITE_VERTEX_PROJECT_ID;
const LOCATION = import.meta.env.VITE_VERTEX_LOCATION || 'us-central1';
const MODEL = import.meta.env.VITE_VERTEX_MODEL || 'gemini-3-flash';
const API_KEY = import.meta.env.VITE_VERTEX_API_KEY;
const CUSTOM_ENDPOINT = import.meta.env.VITE_VERTEX_ENDPOINT;

function getVertexEndpoint() {
  if (CUSTOM_ENDPOINT) {
    return CUSTOM_ENDPOINT;
  }

  if (!PROJECT_ID || !API_KEY) {
    return null;
  }

  return `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent?key=${API_KEY}`;
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

export async function analyzeTelemetryWithGemini(telemetry) {
  const endpoint = getVertexEndpoint();
  const prompt = buildPrompt(telemetry);

  if (!endpoint) {
    return {
      mode: 'local',
      markdown: buildLocalReport(telemetry),
      warning: 'Vertex AI credentials are not configured, so a local demo report was generated.',
    };
  }

  const body = {
    systemInstruction: {
      parts: [{ text: system_instruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 1300,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
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
    console.warn(error);
    return {
      mode: 'fallback',
      markdown: buildLocalReport(telemetry),
      warning: 'Vertex AI was unreachable, so Apex Agent generated a local report.',
    };
  }
}
