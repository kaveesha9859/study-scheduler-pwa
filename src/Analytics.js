// src/Analytics.js
import React, { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Analytics({ tasks }) {
  // 1) Line chart: average Estimated vs Actual duration per day
  const historyByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      (t.history || []).forEach(h => {
        const day = new Date(h.timestamp).toLocaleDateString();
        if (!map[day]) map[day] = { totalEst: 0, totalAct: 0, count: 0 };
        map[day].totalEst += h.estimated;
        map[day].totalAct += h.actual;
        map[day].count += 1;
      });
    });
    const labels = Object.keys(map).sort((a, b) => new Date(a) - new Date(b));
    return {
      labels,
      datasets: [
        {
          label: 'Estimated (avg)',
          data: labels.map(d => Math.round(map[d].totalEst / map[d].count)),
          tension: 0.4
        },
        {
          label: 'Actual (avg)',
          data: labels.map(d => Math.round(map[d].totalAct / map[d].count)),
          tension: 0.4
        }
      ]
    };
  }, [tasks]);

  // 2) Bar chart: number of tasks by difficulty
  const difficultyData = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    tasks.forEach(t => {
      const d = t.difficulty;
      if (counts[d] != null) counts[d] += 1;
    });
    const labels = ['1','2','3','4','5'];
    return {
      labels,
      datasets: [
        {
          label: 'Tasks by Difficulty',
          data: labels.map(l => counts[Number(l)])
        }
      ]
    };
  }, [tasks]);

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Performance Analytics</h2>
      <div style={{ maxWidth: 600, margin: 'auto' }}>
        {/* Line Chart */}
        <div style={{ marginBottom: 40 }}>
          <h3>Estimated vs. Actual Duration (avg per day)</h3>
          <Line data={historyByDate} />
        </div>

        {/* Bar Chart */}
        <div>
          <h3>Tasks by Difficulty Level</h3>
          <Bar data={difficultyData} />
        </div>
      </div>
    </div>
  );
}
