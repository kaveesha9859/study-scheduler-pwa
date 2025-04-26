// src/db.js
import { openDB } from 'idb';

const DB_NAME = 'study-scheduler-db';
const STORE = 'tasks';

// Initialize (or upgrade) the DB
export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    }
  });
}

// Fetch all tasks
export async function getAllTasks() {
  const db = await initDB();
  return db.getAll(STORE);
}

// Add or update a task (with ML-related fields)
export async function saveTask(task) {
  const db = await initDB();
  // —— Initialize ML fields if missing ——
  if (!('history' in task)) {
    task.history = [];
  }
  if (!('preferredHour' in task)) {
    task.preferredHour = null;
  }
  // —— Initialize difficulty if missing ——
  if (!('difficulty' in task)) {
    task.difficulty = 3;  // default mid-scale (1–5)
  }
  // ———————————————————————————————
  return db.put(STORE, task);
}

// Delete a task by ID
export async function deleteTask(id) {
  const db = await initDB();
  return db.delete(STORE, id);
}
