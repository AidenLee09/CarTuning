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

function clampScore(value, fallback = 70) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function buildLocalAnalysis(telemetry) {
  const { summary, missingColumns, roadmap, sensorPeaks } = telemetry;
  const thermal = clampScore(100 - Math.max(0, summary.peakIat.value - 95) * 1.4, 76);
  const fueling = clampScore(94 - Math.abs(summary.averageAfr.value - 11.8) * 13, 84);
  const ignition = clampScore(62 + summary.timingAtMaxBoost.value * 4, 78);
  const health = clampScore((thermal * 0.38) + (fueling * 0.3) + (ignition * 0.32), 78);
  const markdownReport = buildLocalReport(telemetry);

  return {
    health_score: health,
    vitals: { thermal, fueling, ignition },
    lead_verdict:
      health >= 82
        ? 'The pull is generally stable, with the next gains coming from repeatability and better validation channels.'
        : 'The pull needs attention before repeated track use, with thermal load and ignition margin leading the risk profile.',
    sensor_peaks: sensorPeaks,
    anomalies: [
      {
        severity: summary.peakIat.value >= 135 ? 'critical' : 'warning',
        issue: `Peak IAT reached ${summary.peakIat.value}${summary.peakIat.unit}.`,
        fix: summary.peakIat.value >= 115
          ? 'Improve charge-air cooling and re-log after heat soak.'
          : 'Add knock retard, fuel pressure, and throttle angle PIDs for the next validation run.',
      },
    ],
    roadmap: roadmap.map((item, index) => ({
      priority: index + 1,
      part: item.part,
      impact: item.reason,
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
    markdown_report: markdownReport,
  };
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
    const analysis = buildLocalAnalysis(telemetry);

    return {
      mode: 'fallback',
      analysis,
      markdown: analysis.markdown_report,
      warning: 'The serverless analysis API was unreachable, so Apex Agent generated a local report.',
    };
  }
}
