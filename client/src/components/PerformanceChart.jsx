import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const PerformanceChart = ({ fund }) => {
  if (!fund) return null;

  // Prepare comparison data points for available return periods
  const periods = [
    { period: '1Y Return', regular: fund.return1YearRegular, direct: fund.return1YearDirect, benchmark: fund.return1YearBenchmark },
    { period: '3Y Return', regular: fund.return3YearRegular, direct: fund.return3YearDirect, benchmark: fund.return3YearBenchmark },
    { period: '5Y Return', regular: fund.return5YearRegular, direct: fund.return5YearDirect, benchmark: fund.return5YearBenchmark },
    { period: '10Y Return', regular: fund.return10YearRegular, direct: fund.return10YearDirect, benchmark: fund.return10YearBenchmark },
    { period: 'Since Launch', regular: fund.returnSinceLaunchRegular, direct: fund.returnSinceLaunchDirect, benchmark: fund.returnSinceLaunchBenchmarkRegular }
  ];

  // Filter out periods where all 3 are null
  const chartData = periods
    .filter(p => p.regular !== null || p.direct !== null || p.benchmark !== null)
    .map(p => ({
      period: p.period,
      'Regular Plan (%)': p.regular !== null ? Number(p.regular.toFixed(2)) : null,
      'Direct Plan (%)': p.direct !== null ? Number(p.direct.toFixed(2)) : null,
      'Benchmark (%)': p.benchmark !== null ? Number(p.benchmark.toFixed(2)) : null
    }));

  if (chartData.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm italic border border-slate-800 rounded-xl bg-slate-900/50">
        No return data available for performance charting.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 rounded-lg border border-slate-700 shadow-xl text-xs space-y-1.5 min-w-[160px]">
          <p className="font-bold text-slate-200 border-b border-slate-700/80 pb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-semibold text-slate-100">
                {entry.value !== null && entry.value !== undefined ? `${entry.value}%` : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-inner">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-200">Annualized Returns Comparison (%)</h4>
          <p className="text-xs text-slate-400">Regular Plan vs Direct Plan vs Benchmark ({fund.benchmark})</p>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey="period" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
            <Bar dataKey="Regular Plan (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Direct Plan (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Benchmark (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PerformanceChart;
