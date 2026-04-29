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

export async function analyzeTelemetry(telemetry) {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ csvData: telemetry }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error || `Analysis API failed (${response.status}).`);
    }

    return response.json();
  } catch (error) {
    console.warn(error);
    return {
      mode: 'fallback',
      markdown: buildLocalReport(telemetry),
      warning: 'The serverless analysis API was unreachable, so Apex Agent generated a local report.',
    };
  }
}
