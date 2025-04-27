import { openDB } from 'idb';

const DB_NAME = 'study-scheduler-db';
const STORE   = 'tasks';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    }
  });
}

export async function getAllTasks() {
  const db = await initDB();
  return db.getAll(STORE);
}

export async function saveTask(task) {
  const db = await initDB();

  // — ML fields —
  if (!('history' in task))      task.history      = [];
  if (!('preferredHour' in task)) task.preferredHour = null;
  if (!('difficulty' in task))    task.difficulty    = 3;

  // — SM-2 fields —
  if (!('sm2' in task)) {
    task.sm2 = {
      rep: 0,
      ef: 2.5,
      interval: 0,
      nextReview: null,
      isReview: false
    };
  }

  return db.put(STORE, task);
}

export async function deleteTask(id) {
  const db = await initDB();
  return db.delete(STORE, id);
}
