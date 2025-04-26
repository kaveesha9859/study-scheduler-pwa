// src/App.js
import React, { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { getAllTasks, saveTask, deleteTask } from './db';
import { initModel, predictPriority, model } from './ml';
import Analytics from './Analytics';

function App() {
  const [tasks, setTasks] = useState([]);
  const [plan, setPlan] = useState([]);
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState('');
  const [deadline, setDeadline] = useState('');
  const [difficulty, setDifficulty] = useState('');  // ← new state

  // Ask for notification permission once
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, []);

  // Load tasks from IndexedDB & train the ML model once
  useEffect(() => {
    (async () => {
      const stored = await getAllTasks();
      setTasks(stored);
      await initModel();
    })();
  }, []);

  // Score & sort tasks into a plan
  const updatePlan = ts => {
    const scored = ts.map(t => ({
      ...t,
      score: predictPriority(t)
    }));
    scored.sort((a, b) => b.score - a.score);
    setPlan(scored);
  };

  // Add task handler
  const handleAdd = async e => {
    e.preventDefault();
    if (!subject || !duration || !deadline || !difficulty) return;

    const newTask = {
      id: Date.now(),
      subject,
      duration,
      deadline,
      difficulty: Number(difficulty)      // ← include difficulty
    };
    setTasks(prev => [...prev, newTask]);
    await saveTask(newTask);

    if (Notification.permission === 'granted') {
      const msUntil = new Date(deadline).getTime() - Date.now();
      if (msUntil > 0) {
        setTimeout(() => {
          new Notification('Study Reminder', {
            body: `Time to study ${subject}!`
          });
        }, msUntil);
      }
    }

    // reset form
    setSubject('');
    setDuration('');
    setDeadline('');
    setDifficulty('');                     // ← reset difficulty
  };

  // Delete handler
  const handleDelete = async id => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await deleteTask(id);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: 'auto' }}>
      <h1>Study Scheduler</h1>

      {/* Task Input Form */}
      <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
        <div>
          <label>Subject:</label><br/>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Math"
            required
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label>Duration (mins):</label><br/>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="e.g. 120"
            required
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label>Deadline:</label><br/>
          <input
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label>Difficulty (1–5):</label><br/>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            required
            style={{ width: '100%' }}
          >
            <option value="">Select…</option>
            {[1,2,3,4,5].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button type="submit" style={{ marginTop: 10 }}>
          Add Task
        </button>
      </form>

      {/* Generate Plan */}
      <button onClick={() => updatePlan(tasks)} style={{ margin: '20px 0' }}>
        Generate Plan
      </button>

      {/* Recommended Order */}
      {plan.length > 0 && (
        <>
          <h2>Recommended Order</h2>
          <ol>
            {plan.map(t => (
              <li key={t.id}>
                {t.subject} ({t.duration} mins, diff {t.difficulty}) – due {t.deadline} – priority{' '}
                {(t.score * 100).toFixed(0)}%
              </li>
            ))}
          </ol>
        </>
      )}

      {/* All Tasks List */}
      <h2>All Tasks</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id} style={{ marginBottom: 10 }}>
            <strong>{task.subject}</strong> — {task.duration} mins — due {task.deadline} — diff{' '}
            {task.difficulty}
            <button
              onClick={() => handleDelete(task.id)}
              style={{ marginLeft: 10 }}
            >
              Delete
            </button>
            <button
              onClick={async () => {
                const minutes = prompt('How many minutes did that take?');
                const actual = Number(minutes);
                if (!actual || actual <= 0) return;

                // Update history & preferredHour
                const updated = { ...task };
                updated.history = updated.history || [];
                updated.history.push({
                  actual,
                  estimated: Number(task.duration),
                  timestamp: new Date().toISOString()
                });
                updated.preferredHour = new Date().getHours();

                // Save & update state
                await saveTask(updated);
                setTasks(ts =>
                  ts.map(t => (t.id === task.id ? updated : t))
                );

                // Online retraining
                await initModel();
                const xs = [], ys = [];
                const all = tasks.map(t => t.id === updated.id ? updated : t);
                all.forEach(t => {
                  if (t.history && t.history.length) {
                    const hoursLeft =
                      (new Date(t.deadline).getTime() - Date.now()) / 3600000;
                    const est = Number(t.duration);
                    const ratio =
                      t.history.reduce((sum, h) => sum + h.actual / h.estimated, 0) /
                      t.history.length;
                    const hourNorm =
                      t.preferredHour != null
                        ? t.preferredHour / 23
                        : 0.5;
                    xs.push([hoursLeft, est, ratio, hourNorm, t.difficulty]);
                    ys.push([ratio]);
                  }
                });
                if (xs.length) {
                  const xT = tf.tensor2d(xs);
                  const yT = tf.tensor2d(ys);
                  await model.fit(xT, yT, {
                    epochs: 5,
                    batchSize: 8,
                    shuffle: true
                  });
                  xT.dispose();
                  yT.dispose();
                }
              }}
              style={{ marginLeft: 10 }}
            >
              Mark Done
            </button>
          </li>
        ))}
      </ul>

      {/* Analytics */}
      <Analytics tasks={tasks} />
    </div>
  );
}

export default App;
