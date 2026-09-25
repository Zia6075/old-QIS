// ============================================
// Chart Components - Light Theme
// ============================================

import React from 'react';

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  showLabels?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({ data, size = 180, showLabels = true }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="flex items-center justify-center text-gray-400" style={{ width: size, height: size }}>No data</div>;

  let currentAngle = 0;
  const center = size / 2;
  const radius = size / 2 - 10;

  const createArcPath = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size}>
        {data.map((item, index) => {
          const angle = (item.value / total) * 360;
          const renderAngle = angle >= 359.99 ? 359.99 : angle;
          const path = createArcPath(currentAngle, currentAngle + renderAngle);
          currentAngle += angle;
          return <path key={index} d={path} fill={item.color} className="transition-all duration-300 hover:opacity-80" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />;
        })}
        <circle cx={center} cy={center} r={radius * 0.6} fill="white" />
        <text x={center} y={center} textAnchor="middle" dy="0.3em" className="fill-gray-800 text-2xl font-bold">{total}</text>
      </svg>
      {showLabels && (
        <div className="flex flex-wrap justify-center gap-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-600">{item.label} ({item.value})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, height = 180 }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * (height - 30);
        const color = item.color || '#f97316';
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500">{item.value}</span>
            <div className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80" style={{ height: barHeight, backgroundColor: color, minHeight: item.value > 0 ? 4 : 0 }} />
            <span className="text-xs text-gray-500 truncate max-w-full">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

interface DonutChartProps {
  value: number;
  max: number;
  label: string;
  color: string;
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ value, max, label, color, size = 100 }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-500" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-800">{value}</span>
        </div>
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
};
