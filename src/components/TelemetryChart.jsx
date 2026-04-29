import { useEffect, useMemo, useRef } from 'react';

function metricSeries(rows, key) {
  return rows.map((row) => row[key] ?? null);
}

function TelemetryChart({ rows }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const chartRows = useMemo(() => rows.slice(0, 160), [rows]);

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    let cancelled = false;
    let chart = null;

    const options = {
      chart: {
        type: 'line',
        height: 380,
        background: 'transparent',
        foreColor: '#cbd5e1',
        toolbar: {
          show: true,
          tools: {
            download: false,
            pan: true,
            reset: true,
            selection: false,
            zoom: true,
            zoomin: true,
            zoomout: true,
          },
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 650,
        },
      },
      colors: ['#3b82f6', '#ef4444', '#f59e0b'],
      stroke: {
        curve: 'smooth',
        width: [3, 3, 3],
      },
      series: [
        { name: 'RPM', type: 'line', data: metricSeries(chartRows, 'rpm') },
        { name: 'Boost', type: 'line', data: metricSeries(chartRows, 'boost') },
        { name: 'IAT', type: 'line', data: metricSeries(chartRows, 'iat') },
      ],
      xaxis: {
        categories: chartRows.map((row) => row.label),
        labels: {
          style: { colors: '#94a3b8' },
          rotate: 0,
          trim: true,
        },
        axisBorder: { color: 'rgba(148, 163, 184, 0.2)' },
        axisTicks: { color: 'rgba(148, 163, 184, 0.2)' },
        tooltip: { enabled: false },
      },
      yaxis: [
        {
          seriesName: 'RPM',
          title: { text: 'RPM', style: { color: '#93c5fd' } },
          labels: {
            formatter: (value) => (Number.isFinite(value) ? Math.round(value) : ''),
            style: { colors: '#93c5fd' },
          },
        },
        {
          seriesName: 'Boost',
          opposite: true,
          title: { text: 'Boost psi', style: { color: '#fca5a5' } },
          labels: {
            formatter: (value) => (Number.isFinite(value) ? value.toFixed(1) : ''),
            style: { colors: '#fca5a5' },
          },
        },
        {
          seriesName: 'IAT',
          opposite: true,
          title: { text: 'IAT F', style: { color: '#fcd34d' } },
          labels: {
            formatter: (value) => (Number.isFinite(value) ? Math.round(value) : ''),
            style: { colors: '#fcd34d' },
          },
        },
      ],
      grid: {
        borderColor: 'rgba(148, 163, 184, 0.14)',
        strokeDashArray: 4,
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        labels: { colors: '#e2e8f0' },
        markers: { size: 5 },
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: 'dark',
      },
      markers: {
        size: 0,
        hover: { size: 5 },
      },
    };

    async function renderChart() {
      const ApexCharts = (await import('apexcharts')).default;

      if (cancelled || !chartRef.current) {
        return;
      }

      chart = new ApexCharts(chartRef.current, options);
      chartInstance.current = chart;
      await chart.render();
    }

    renderChart();

    return () => {
      cancelled = true;
      chart?.destroy();
      chartInstance.current = null;
    };
  }, [chartRows]);

  return (
    <article className="glass-card h-full p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Card B
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">Interactive Chart</h2>
        </div>
        <p className="text-sm text-slate-500">RPM vs Boost vs IAT</p>
      </div>
      <div ref={chartRef} className="min-h-[380px] w-full" />
    </article>
  );
}

export default TelemetryChart;
