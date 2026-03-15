import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export default function StatsChart({ type = 'line', data = { labels: [], data: [] }, label = '' }) {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        label,
        data: data.data || [],
        backgroundColor: type === 'bar' ? 'rgba(47,95,215,0.7)' : 'rgba(88,129,233,0.3)',
        borderColor: 'rgba(47,95,215,1)',
        borderWidth: 2,
        fill: type !== 'bar'
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { ticks: { color: '#64748b' } },
      y: { beginAtZero: true, ticks: { color: '#64748b' } }
    }
  };

  if (type === 'bar') return <Bar options={options} data={chartData} />;
  return <Line options={options} data={chartData} />;
}
