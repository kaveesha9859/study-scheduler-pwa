// src/sm2.js
export function applySm2(sm2, quality) {
    let { rep, ef, interval } = sm2;
  
    if (quality < 3) {
      rep = 0; interval = 1;
    } else {
      rep += 1;
      interval = rep === 1 ? 1 : rep === 2 ? 6 : Math.round(interval * ef);
      ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    }
  
    const next = new Date();
    next.setDate(next.getDate() + interval);
  
    return { rep, ef, interval, nextReview: next.toISOString(), isReview: true };
  }
  