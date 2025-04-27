import * as tf from '@tensorflow/tfjs';
export let model;

function avgRatio(history) {
  if (!history || history.length === 0) return 1;
  const ratios = history.map(h => h.actual / h.estimated);
  return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
}

function generateSyntheticData(n=300) {
  const rawXs = [], rawYs = [];
  for (let i = 0; i < n; i++) {
    const hours = Math.random()*72;
    const dur   = Math.random()*180+10;
    const ratio = Math.random();
    const hourN = Math.random();
    const diff  = Math.floor(Math.random()*5)+1;
    const score =
      0.3*(1-hours/72)+
      0.2*(1-dur/200)+
      0.2*ratio+
      0.2*hourN+
      0.1*(diff/5);
    rawXs.push([hours,dur,ratio,hourN,diff]);
    rawYs.push([Math.min(1,Math.max(0,score))]);
  }
  return { rawXs, rawYs };
}

function buildModel({ lr, units1, units2 }) {
  const m = tf.sequential();
  m.add(tf.layers.dense({ inputShape:[5], units:units1, activation:'relu' }));
  m.add(tf.layers.dense({ units:units2, activation:'relu' }));
  m.add(tf.layers.dense({ units:1, activation:'sigmoid' }));
  m.compile({ optimizer:tf.train.adam(lr), loss:'meanSquaredError' });
  return m;
}

async function tuneHyperparameters() {
  console.log('🧪 Tuning hyperparameters…');
  const lrs     = [0.001,0.01];
  const units1s = [16,32];
  const units2s = [8,16];
  const batches = [16,32];
  const { rawXs, rawYs } = generateSyntheticData(300);
  const split = Math.floor(rawXs.length*0.8);
  const xTrain = tf.tensor2d(rawXs.slice(0,split));
  const yTrain = tf.tensor2d(rawYs.slice(0,split));
  const xVal   = tf.tensor2d(rawXs.slice(split));
  const yVal   = tf.tensor2d(rawYs.slice(split));
  let best = { params:null, loss:Infinity };

  for (const lr of lrs) {
    for (const u1 of units1s) {
      for (const u2 of units2s) {
        for (const batch of batches) {
          const params = { lr, units1:u1, units2:u2, batch };
          const m = buildModel(params);
          await m.fit(xTrain,yTrain,{ epochs:10, batchSize:batch, shuffle:true, verbose:0 });
          const lossTensor = m.evaluate(xVal,yVal);
          const loss = (await lossTensor.data())[0];
          lossTensor.dispose(); m.dispose();
          if (loss < best.loss) best = { params, loss };
        }
      }
    }
  }
  xTrain.dispose(); yTrain.dispose(); xVal.dispose(); yVal.dispose();
  console.log('🏆 Best hyperparams:', best.params, 'val loss:', best.loss.toFixed(4));
  return best.params;
}

export async function initModel() {
  console.log('🔍 Starting model initialization…');
  const { rawXs, rawYs } = generateSyntheticData(300);
  const { lr, units1, units2, batch } = await tuneHyperparameters();
  model = buildModel({ lr, units1, units2 });
  const xAll = tf.tensor2d(rawXs), yAll = tf.tensor2d(rawYs);
  await model.fit(xAll,yAll,{ epochs:30, batchSize:batch, shuffle:true, verbose:0 });
  xAll.dispose(); yAll.dispose();
}

export function predictPriority(task) {
  if (!model) return 0.5;
  const hoursLeft = (new Date(task.deadline).getTime() - Date.now())/3600000;
  const estimated = Number(task.duration);
  const ratio     = avgRatio(task.history);
  const hourNorm  = task.preferredHour!=null ? task.preferredHour/23 : 0.5;
  const difficulty= Number(task.difficulty!=null?task.difficulty:3);
  const input = tf.tensor2d([[hoursLeft,estimated,ratio,hourNorm,difficulty]]);
  const output= model.predict(input);
  const score = output.dataSync()[0];
  input.dispose(); output.dispose();
  return score;
}

window.initModel=initModel;
window.predictPriority=predictPriority;
