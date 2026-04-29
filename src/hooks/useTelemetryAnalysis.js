import { useCallback, useState } from 'react';
import { parseTelemetryFile } from '../services/csvService.js';
import { analyzeTelemetry } from '../services/apiService.js';

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function useTelemetryAnalysis() {
  const [status, setStatus] = useState('idle');
  const [telemetry, setTelemetry] = useState(null);
  const [report, setReport] = useState('');
  const [notification, setNotification] = useState(null);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const analyzeFile = useCallback(async (file) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotification({
        tone: 'error',
        title: 'CSV required',
        message: 'Upload a .csv telemetry export.',
      });
      return;
    }

    setStatus('processing');
    setNotification(null);

    try {
      const [parsed] = await Promise.all([parseTelemetryFile(file), wait(1500)]);
      const analysis = await analyzeTelemetry(parsed);

      setTelemetry(parsed);
      setReport(analysis.markdown);
      setStatus('complete');

      if (parsed.missingColumns.length) {
        setNotification({
          tone: 'warning',
          title: 'Missing PIDs',
          message: `${parsed.missingColumns.join(', ')} were not found. Apex Agent built the dashboard with available channels.`,
        });
      } else if (analysis.warning) {
        setNotification({
          tone: 'info',
          title: analysis.mode === 'local' ? 'Demo report active' : 'Fallback report active',
          message: analysis.warning,
        });
      } else {
        setNotification({
          tone: 'success',
          title: 'Telemetry analyzed',
          message: 'Dashboard and mechanic report are ready.',
        });
      }
    } catch (error) {
      setStatus('error');
      setNotification({
        tone: 'error',
        title: 'Telemetry parse failed',
        message: error.message || 'Apex Agent could not read that CSV.',
      });
    }
  }, []);

  const loadMockTelemetry = useCallback(async () => {
    try {
      const response = await fetch('/mock_telemetry.csv');
      if (!response.ok) {
        throw new Error('Mock telemetry file was not found.');
      }

      const csv = await response.text();
      const file = new File([csv], 'mock_telemetry.csv', { type: 'text/csv' });
      await analyzeFile(file);
    } catch (error) {
      setNotification({
        tone: 'error',
        title: 'Mock load failed',
        message: error.message,
      });
    }
  }, [analyzeFile]);

  return {
    status,
    telemetry,
    report,
    notification,
    analyzeFile,
    loadMockTelemetry,
    dismissNotification,
  };
}
