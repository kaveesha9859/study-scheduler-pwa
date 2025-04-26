// src/ml.js
import * as tf from '@tensorflow/tfjs';

export let model;  // exported so App.js can call model.fit()

/**
 * Compute the average actual/estimated ratio from a task's history.
 * If no history, assume perfect (ratio = 1).
 */
function avgRatio(history) {
  if (!history || history.length === 0) return 1;
  const ratios = history.map(h => h.actual / h.estimated);
  return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
}

/**
 * Build and compile a small neural network accepting five inputs:
 * [hoursUntilDeadline, estimatedMinutes, avgPerformanceRatio, preferredHourNorm, difficulty]
 */
export async function initModel() {
  model = tf.sequential();
  model.add(tf.layers.dense({
    inputShape: [5],
    units: 16,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: 1,
    activation: 'sigmoid'
  }));
  model.compile({
    optimizer: 'adam',
    loss: 'meanSquaredError'
  });
  // Optionally: pre-train here on synthetic data or historical tasks
}

/**
 * Given a task object, predict a priority score between 0 and 1.
 * Uses five features:
 *  1. hours until deadline (in hours)
 *  2. estimated duration (in minutes)
 *  3. average performance ratio (actual/estimated)
 *  4. normalized preferred hour of day (0–1)
 *  5. difficulty (1–5)
 */
export function predictPriority(task) {
  if (!model) return 0.5;

  // Feature 1: hours until deadline
  const hoursLeft = (new Date(task.deadline).getTime() - Date.now()) / 3600000;

  // Feature 2: estimated minutes
  const estimated = Number(task.duration);

  // Feature 3: average actual/estimated ratio
  const ratio = avgRatio(task.history);

  // Feature 4: preferred hour (0–23) normalized to [0,1]
  const hourNorm = task.preferredHour != null
    ? task.preferredHour / 23
    : 0.5;

  // Feature 5: difficulty (1–5), default to 3 if missing
  const difficulty = Number(task.difficulty != null ? task.difficulty : 3);

  // Assemble input tensor
  const input = tf.tensor2d([[
    hoursLeft,
    estimated,
    ratio,
    hourNorm,
    difficulty
  ]]);

  // Run the model
  const output = model.predict(input);
  const score = Array.from(output.dataSync())[0];

  // Clean up
  input.dispose();
  output.dispose();

  return score;
}

// Expose these for interactive console testing:
window.initModel = initModel;
window.predictPriority = predictPriority;
