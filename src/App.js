// src/App.js
import React, { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { getAllTasks, saveTask, deleteTask } from './db';
import { initModel, predictPriority, model } from './ml';
import { applySm2 } from './sm2';
import CalendarView from './CalendarView';
import Analytics from './Analytics';

/**
 * Format a Date into the HTML5 "datetime-local" string,
 * preserving local hours/minutes rather than forcing UTC.
 */
function formatDateTimeLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes())
  );
}

function App() {
  // — State
  const [tasks, setTasks] = useState([]);
  const [plan, setPlan] = useState([]);
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState('');
  const [deadline, setDeadline] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isReview, setIsReview] = useState(false);

  // — Request notification permission once
  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
  }, []);

  // — Load tasks & migrate SM-2 fields, then train ML model
  useEffect(() => {
    (async () => {
      const stored = await getAllTasks();
      const migrated = stored.map(t => ({
        ...t,
        sm2: t.sm2 || {
          rep: 0,
          ef: 2.5,
          interval: 0,
          nextReview: null,
          isReview: false
        }
      }));
      setTasks(migrated);
      await initModel();
    })();
  }, []);

  // — Build & sort the “Recommended Order”
  const updatePlan = ts => {
    const now = Date.now();
    const scored = ts.map(t => {
      const base = predictPriority(t);
      if (
        t.sm2.isReview &&
        t.sm2.nextReview &&
        new Date(t.sm2.nextReview).getTime() <= now
      ) {
        return { ...t, score: 1.1 }; // overdue reviews float to top
      }
      return { ...t, score: base };
    });
    scored.sort((a, b) => b.score - a.score);
    setPlan(scored);
  };

  // — Add new task
  const handleAdd = async e => {
    e.preventDefault();
    if (!subject || !duration || !deadline || !difficulty) return;

    const newTask = {
      id: Date.now(),
      subject,
      duration,
      deadline,
      difficulty: Number(difficulty),
      sm2: { isReview }
    };

    // 1) In‐memory
    setTasks(prev => [...prev, newTask]);
    // 2) Persist
    await saveTask(newTask);
    // 3) Schedule browser notification
    if (Notification.permission === 'granted') {
      const ms = new Date(deadline).getTime() - Date.now();
      if (ms > 0) {
        setTimeout(
          () => new Notification('Study Reminder', { body: `Time to study ${subject}!` }),
          ms
        );
      }
    }
    // 4) Clear form
    setSubject('');
    setDuration('');
    setDeadline('');
    setDifficulty('');
    setIsReview(false);
  };

  // — Delete a task
  const handleDelete = async id => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await deleteTask(id);
  };

  // — Calendar drag-&-drop handler
  const handleMove = async (taskId, newStart) => {
    // format and store as local datetime-local
    const localStr = formatDateTimeLocal(newStart);

    // 1) Update state
    const updatedList = tasks.map(t =>
      t.id === taskId ? { ...t, deadline: localStr } : t
    );
    setTasks(updatedList);

    // 2) Persist
    const moved = updatedList.find(t => t.id === taskId);
    await saveTask(moved);

    // 3) Rebuild plan
    updatePlan(updatedList);

    // 4) Reschedule notification
    if (Notification.permission === 'granted') {
      const ms = new Date(moved.deadline).getTime() - Date.now();
      if (ms > 0) {
        setTimeout(
          () => new Notification('Study Reminder', { body: `Time to study ${moved.subject}!` }),
          ms
        );
      }
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: 'auto' }}>
      <h1>Study Scheduler</h1>

      {/* === New Task Form === */}
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
        <div style={{ marginTop: 8 }}>
          <label>
            <input
              type="checkbox"
              checked={isReview}
              onChange={e => setIsReview(e.target.checked)}
            />{' '}
            Spaced-Repetition Review Task
          </label>
        </div>
        <button type="submit" style={{ marginTop: 10 }}>Add Task</button>
      </form>

      {/* === Generate Plan === */}
      <button onClick={() => updatePlan(tasks)} style={{ margin: '20px 0' }}>
        Generate Plan
      </button>

      {/* === Recommended Order === */}
      {plan.length > 0 && (
        <>
          <h2>Recommended Order</h2>
          <ol>
            {plan.map(t => (
              <li key={t.id}>
                {t.subject} ({t.duration} mins, diff {t.difficulty})
                {t.sm2.isReview && t.sm2.nextReview
                  ? <> — next review {new Date(t.sm2.nextReview).toLocaleDateString()}</>
                  : ''}
                — priority {(t.score * 100).toFixed(0)}%
              </li>
            ))}
          </ol>
        </>
      )}

      {/* === Calendar (drag & drop to reschedule) === */}
      <CalendarView tasks={tasks} onMove={handleMove} />

      {/* === All Tasks & Review/Done Buttons === */}
      <h2>All Tasks</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id} style={{ marginBottom: 10 }}>
            <strong>{task.subject}</strong> — {task.duration} mins — due {task.deadline} — diff {task.difficulty}
            {task.sm2.isReview && task.sm2.nextReview
              ? <> — next review {new Date(task.sm2.nextReview).toLocaleDateString()}</>
              : ''}
            <button onClick={() => handleDelete(task.id)} style={{ marginLeft: 10 }}>
              Delete
            </button>

            {task.sm2.isReview ? (
              <button
                onClick={async () => {
                  const quality = Number(prompt('Recall quality (0–5)?'));
                  if (isNaN(quality) || quality < 0 || quality > 5) return;
                  const updated = { ...task, sm2: applySm2(task.sm2, quality) };
                  await saveTask(updated);
                  setTasks(ts => ts.map(t => t.id === task.id ? updated : t));
                  // schedule next-review notification
                  if (Notification.permission === 'granted' && updated.sm2.nextReview) {
                    const ms = new Date(updated.sm2.nextReview).getTime() - Date.now();
                    if (ms > 0) {
                      setTimeout(
                        () => new Notification('Review Reminder', {
                          body: `Time to review "${updated.subject}"`,
                        }),
                        ms
                      );
                    }
                  }
                }}
                style={{ marginLeft: 10 }}
              >
                Review
              </button>
            ) : (
              <button
                onClick={async () => {
                  const mins = Number(prompt('How many minutes did that take?'));
                  if (!mins || mins <= 0) return;
                  const updated = { ...task };
                  updated.history = updated.history || [];
                  updated.history.push({
                    actual: mins,
                    estimated: Number(task.duration),
                    timestamp: new Date().toISOString()
                  });
                  updated.preferredHour = new Date().getHours();
                  await saveTask(updated);
                  setTasks(ts => ts.map(t => t.id === task.id ? updated : t));

                  // online retraining snippet
                  await initModel();
                  const xs = [], ys = [];
                  tasks.forEach(t => {
                    const hist = t.id === updated.id ? updated.history : t.history;
                    if (hist?.length) {
                      const hoursLeft = (new Date(t.deadline).getTime() - Date.now()) / 3600000;
                      const ratio = hist.reduce((s,h) => s + h.actual/h.estimated, 0) / hist.length;
                      const hourNorm = (t.preferredHour ?? 12) / 23;
                      xs.push([hoursLeft, Number(t.duration), ratio, hourNorm, t.difficulty]);
                      ys.push([ratio]);
                    }
                  });
                  if (xs.length) {
                    const xT = tf.tensor2d(xs);
                    const yT = tf.tensor2d(ys);
                    await model.fit(xT, yT, { epochs: 5, batchSize: 8, shuffle: true });
                    xT.dispose(); yT.dispose();
                  }
                }}
                style={{ marginLeft: 10 }}
              >
                Mark Done
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* === Performance Analytics === */}
      <Analytics tasks={tasks} />
    </div>
  );
}

export default App;
