import Papa from 'papaparse';

export const REQUIRED_PIDS = ['rpm', 'boost', 'spark', 'iat', 'afr'];

const PID_LABELS = {
  rpm: 'RPM',
  boost: 'Boost',
  spark: 'Spark',
  iat: 'IAT',
  afr: 'AFR',
};

const PID_ALIASES = {
  time: ['time', 'timestamp', 'seconds', 'sec', 'elapsed time'],
  rpm: ['rpm', 'engine rpm', 'engine speed', 'engine_speed', 'rpm rpm'],
  boost: [
    'boost',
    'boost psi',
    'boost pressure',
    'boost_pressure',
    'map boost',
    'map psi',
    'manifold relative pressure',
  ],
  spark: [
    'spark',
    'spark advance',
    'spark timing',
    'ignition timing',
    'ignition advance',
    'timing',
    'timing advance',
  ],
  iat: [
    'iat',
    'iat f',
    'intake air temp',
    'intake air temperature',
    'intake air temperature f',
    'air intake temp',
    'charge air temp',
    'charge temp',
  ],
  afr: ['afr', 'air fuel ratio', 'a f ratio', 'wideband afr', 'lambda'],
};

const finite = (value) => Number.isFinite(value);

function normalizeHeader(header) {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/[()[\]{}%]/g, ' ')
    .replace(/[^\w.\s/-]/g, ' ')
    .replace(/[_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(value) {
  if (typeof value === 'number') {
    return finite(value) ? value : null;
  }

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(String(value).replace(/,/g, '').replace(/[^\d.+-]/g, ''));
  return finite(parsed) ? parsed : null;
}

function round(value, digits = 2) {
  return finite(value) ? Number(value.toFixed(digits)) : null;
}

function buildColumnMap(headers) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  return Object.entries(PID_ALIASES).reduce((map, [pid, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    const exact = normalizedHeaders.find((header) =>
      normalizedAliases.includes(header.normalized),
    );

    const loose =
      exact ??
      normalizedHeaders.find((header) =>
        normalizedAliases.some((alias) => alias.length > 3 && header.normalized.includes(alias)),
      );

    return loose ? { ...map, [pid]: loose.original } : map;
  }, {});
}

function valueFrom(row, column) {
  if (!column) {
    return null;
  }

  return toNumber(row[column]);
}

function average(values) {
  const clean = values.filter(finite);
  if (!clean.length) {
    return null;
  }

  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function rowWithMax(rows, key) {
  return rows.reduce((best, row) => {
    if (!finite(row[key])) {
      return best;
    }

    if (!best || row[key] > best[key]) {
      return row;
    }

    return best;
  }, null);
}

function rowWithMin(rows, key) {
  return rows.reduce((best, row) => {
    if (!finite(row[key])) {
      return best;
    }

    if (!best || row[key] < best[key]) {
      return row;
    }

    return best;
  }, null);
}

function buildSummary(rows) {
  const maxBoostRow = rowWithMax(rows, 'boost');
  const peakIatRow = rowWithMax(rows, 'iat');
  const timingRow = maxBoostRow && maxBoostRow.spark !== null ? maxBoostRow : rowWithMin(rows, 'spark');

  return {
    maxBoost: {
      value: round(maxBoostRow?.boost ?? 0, 1),
      rpm: round(maxBoostRow?.rpm ?? 0, 0),
      unit: 'psi',
    },
    peakIat: {
      value: round(peakIatRow?.iat ?? 0, 0),
      rpm: round(peakIatRow?.rpm ?? 0, 0),
      unit: 'F',
    },
    timingAtMaxBoost: {
      value: round(timingRow?.spark ?? 0, 1),
      rpm: round(timingRow?.rpm ?? 0, 0),
      unit: 'deg',
    },
    averageAfr: {
      value: round(average(rows.map((row) => row.afr)) ?? 0, 2),
      unit: ':1',
    },
  };
}

function rangeFor(rows, key, unit) {
  const values = rows.filter((row) => finite(row[key]));
  const maxRow = rowWithMax(values, key);
  const minRow = rowWithMin(values, key);

  return {
    max: round(maxRow?.[key] ?? 0, key === 'afr' ? 2 : 1),
    min: round(minRow?.[key] ?? 0, key === 'afr' ? 2 : 1),
    unit,
    maxRpm: round(maxRow?.rpm ?? 0, 0),
    minRpm: round(minRow?.rpm ?? 0, 0),
  };
}

function buildSensorPeaks(rows) {
  return {
    boost: rangeFor(rows, 'boost', 'psi'),
    iat: rangeFor(rows, 'iat', 'F'),
    afr: rangeFor(rows, 'afr', ':1'),
  };
}

function buildContextRows(rows) {
  const rowsWithBoost = rows.filter((row) => finite(row.boost));
  const sourceRows = rowsWithBoost.length
    ? [...rowsWithBoost].sort((a, b) => b.boost - a.boost)
    : rows;

  return sourceRows.slice(0, 20).map((row) => ({
    rpm: round(row.rpm, 0),
    boost: round(row.boost, 1),
    spark: round(row.spark, 1),
    iat: round(row.iat, 0),
    afr: round(row.afr, 2),
  }));
}

function buildRoadmap(summary) {
  const items = [];

  if (summary.peakIat.value >= 135) {
    items.push({
      priority: 'Thermal',
      part: 'Large-core front-mount intercooler',
      reason: `Peak IAT hit ${summary.peakIat.value}${summary.peakIat.unit}; protect timing during repeated pulls.`,
    });
  } else if (summary.peakIat.value >= 115) {
    items.push({
      priority: 'Thermal',
      part: 'Higher-efficiency intercooler and duct sealing',
      reason: `IAT reached ${summary.peakIat.value}${summary.peakIat.unit}; reduce heat soak before chasing boost.`,
    });
  }

  if (summary.timingAtMaxBoost.value <= 6) {
    items.push({
      priority: 'Ignition',
      part: 'One-step-colder spark plugs',
      reason: `Timing fell to ${summary.timingAtMaxBoost.value}${summary.timingAtMaxBoost.unit} near peak boost; stabilize combustion first.`,
    });
  }

  if (summary.averageAfr.value > 12.2) {
    items.push({
      priority: 'Fuel',
      part: 'Fuel pump and injector duty review',
      reason: `Average AFR is ${summary.averageAfr.value}${summary.averageAfr.unit}; verify headroom before more load.`,
    });
  } else if (summary.averageAfr.value < 10.8) {
    items.push({
      priority: 'Calibration',
      part: 'Fueling table cleanup',
      reason: `Average AFR is ${summary.averageAfr.value}${summary.averageAfr.unit}; excess enrichment may be costing response.`,
    });
  }

  if (summary.maxBoost.value >= 21) {
    items.push({
      priority: 'Boost',
      part: 'Boost control solenoid and charge-pipe clamp inspection',
      reason: `Max boost reached ${summary.maxBoost.value}${summary.maxBoost.unit}; confirm control stability before road-course use.`,
    });
  }

  if (!items.length) {
    items.push({
      priority: 'Baseline',
      part: 'Track-day fluids, brake inspection, and tire pressure plan',
      reason: 'The pull is stable enough to prioritize repeatability and driver confidence.',
    });
  }

  return items.slice(0, 4);
}

export function parseTelemetryFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header) => String(header).trim(),
      complete: ({ data, errors, meta }) => {
        const hardErrors = errors.filter((error) => error.type !== 'FieldMismatch');
        if (hardErrors.length) {
          reject(new Error(hardErrors[0].message));
          return;
        }

        const headers = meta.fields ?? [];
        const columnMap = buildColumnMap(headers);
        const missingColumns = REQUIRED_PIDS.filter((pid) => !columnMap[pid]);

        const rows = data
          .map((rawRow, index) => ({
            index,
            label: columnMap.time ? rawRow[columnMap.time] : index + 1,
            rpm: valueFrom(rawRow, columnMap.rpm),
            boost: valueFrom(rawRow, columnMap.boost),
            spark: valueFrom(rawRow, columnMap.spark),
            iat: valueFrom(rawRow, columnMap.iat),
            afr: valueFrom(rawRow, columnMap.afr),
          }))
          .filter((row) => REQUIRED_PIDS.some((pid) => finite(row[pid])));

        if (!rows.length) {
          reject(new Error('No usable telemetry rows were found in that CSV.'));
          return;
        }

        const summary = buildSummary(rows);
        const sampleRows = buildContextRows(rows);
        const sensorPeaks = buildSensorPeaks(rows);

        resolve({
          fileName: file.name,
          rowCount: rows.length,
          rows,
          sampleRows,
          summary,
          sensorPeaks,
          roadmap: buildRoadmap(summary),
          missingColumns: missingColumns.map((pid) => PID_LABELS[pid]),
          columnMap,
        });
      },
      error: (error) => reject(error),
    });
  });
}
