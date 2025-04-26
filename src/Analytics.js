// src/Analytics.js
import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Analytics({ tasks }) {
  // --- Bar chart: total minutes per subject ---
  const subjects = Array.from(new Set(tasks.map(t => t.subject)));
  const durations = subjects.map(
    s => tasks
      .filter(t => t.subject === s)
      .reduce((sum, t) => sum + Number(t.duration), 0)
  );

  const barData = {
    labels: subjects,
    datasets: [
      {
        label: 'Total Scheduled Minutes',
        data: durations,
      }
    ]
  };

  // --- Line chart: tasks due per day ---
  const dateCounts = tasks.reduce((acc, t) => {
    const day = t.deadline.split('T')[0];
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  const dates = Object.keys(dateCounts).sort();
  const counts = dates.map(d => dateCounts[d]);

  const lineData = {
    labels: dates,
    datasets: [
      {
        label: 'Tasks Due',
        data: counts,
        fill: false,
      }
    ]
  };

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Performance Analytics</h2>
      <div style={{ maxWidth: 600, margin: 'auto' }}>
        <Bar data={barData} />
        <div style={{ height: 20 }} />
        <Line data={lineData} />
      </div>
    </div>
  );
}
