import { differenceInDays, addDays, getDay, isSameDay, isSunday } from 'date-fns';

/** Strip time component so date comparisons are purely calendar-based. */
const stripTime = (d) => { const c = new Date(d); c.setHours(0,0,0,0); return c; };

/**
 * Applies the Weighted Ceil Logic.
 * A_total = ceil( ((A_L * 100) + (A_P * 50) + (A_S * 25)) / TotalWeight )
 */
export const calculateSubjectStatus = (subject) => {
  const L = subject.components?.L || { conducted: 0, attended: 0 };
  const P = subject.components?.P || { conducted: 0, attended: 0 };
  const S = subject.components?.S || { conducted: 0, attended: 0 };
  
  let weightL = L.conducted > 0 ? 100 : 0;
  let weightP = P.conducted > 0 ? 50 : 0;
  let weightS = S.conducted > 0 ? 25 : 0;
  
  // Edge Case: 0 conducted classes
  if (weightL === 0 && weightP === 0 && weightS === 0) {
    return {
      ...subject,
      percentage: 100,
      safe: true,
      condonation: false,
      detained: false,
      isNA: true,
      totalWeight: 0
    };
  }
  
  const totalWeight = weightL + weightP + weightS;
  
  const aL = L.conducted > 0 ? (L.attended / L.conducted) * 100 : 100;
  const aP = P.conducted > 0 ? (P.attended / P.conducted) * 100 : 100;
  const aS = S.conducted > 0 ? (S.attended / S.conducted) * 100 : 100;
  
  const weightedSum = (aL * weightL) + (aP * weightP) + (aS * weightS);
  const finalPercentage = Math.ceil(weightedSum / totalWeight);
  
  return {
    ...subject,
    percentage: finalPercentage,
    safe: finalPercentage >= 85,
    condonation: finalPercentage >= 75 && finalPercentage < 85,
    detained: finalPercentage < 75,
    isNA: false,
    totalWeight
  };
};

/**
 * Projects future attendance given a target date and an array of marked absence dates.
 */
export const projectAttendance = (baselineSubjects, blueprint, targetDate, absenceDates = [], holidays = [], includeToday = true) => {
  const today = stripTime(new Date());
  const target = stripTime(targetDate);
  
  if (differenceInDays(target, today) < 0) {
    return baselineSubjects.map(calculateSubjectStatus);
  }
  
  const projectedSubjects = JSON.parse(JSON.stringify(baselineSubjects));
  const daysDiff = differenceInDays(target, today);
  const startOffset = includeToday ? 0 : 1;
  
  for (let i = startOffset; i <= daysDiff; i++) {
    const currentDate = addDays(today, i);
    const isHoliday = isSunday(currentDate) || holidays.some(h => isSameDay(new Date(h), currentDate));
    if (isHoliday) continue;
    
    const dayOfWeek = getDay(currentDate);
    const classesToday = blueprint[dayOfWeek] || [];
    const isAbsentToday = absenceDates.some(a => isSameDay(new Date(a), currentDate));
    
    classesToday.forEach(cls => {
      if (!cls) return;
      const subject = projectedSubjects.find(s => s.courseCode === cls.courseCode);
      if (subject) {
        if (!subject.components[cls.type]) {
          subject.components[cls.type] = { conducted: 0, attended: 0 };
        }
        subject.components[cls.type].conducted += 1;
        if (!isAbsentToday) {
          subject.components[cls.type].attended += 1;
        }
      }
    });
  }
  
  return projectedSubjects.map(calculateSubjectStatus);
};

/**
 * Enhanced projection that returns per-component deltas alongside the summary.
 * Each entry includes baseline components, projected components, and the diff.
 */
export const projectAttendanceDetailed = (baselineSubjects, blueprint, targetDate, absenceDates = [], holidays = [], includeToday = true) => {
  const today = stripTime(new Date());
  const target = stripTime(targetDate);

  const baseStatuses = baselineSubjects.map(calculateSubjectStatus);

  if (differenceInDays(target, today) < 0) {
    return baseStatuses.map((base) => ({
      ...base,
      basePercentage: base.percentage,
      delta: 0,
      componentDeltas: {},
    }));
  }

  const projectedSubjects = JSON.parse(JSON.stringify(baselineSubjects));
  const daysDiff = differenceInDays(target, today);
  const startOffset = includeToday ? 0 : 1;

  for (let i = startOffset; i <= daysDiff; i++) {
    const currentDate = addDays(today, i);
    const isHoliday = isSunday(currentDate) || holidays.some(h => isSameDay(new Date(h), currentDate));
    if (isHoliday) continue;

    const dayOfWeek = getDay(currentDate);
    const classesToday = blueprint[dayOfWeek] || [];
    const isAbsentToday = absenceDates.some(a => isSameDay(new Date(a), currentDate));

    classesToday.forEach(cls => {
      if (!cls) return;
      const subject = projectedSubjects.find(s => s.courseCode === cls.courseCode);
      if (subject) {
        if (!subject.components[cls.type]) {
          subject.components[cls.type] = { conducted: 0, attended: 0 };
        }
        subject.components[cls.type].conducted += 1;
        if (!isAbsentToday) {
          subject.components[cls.type].attended += 1;
        }
      }
    });
  }

  const projStatuses = projectedSubjects.map(calculateSubjectStatus);

  return projStatuses.map((proj, idx) => {
    const base = baseStatuses[idx];
    const baseSub = baselineSubjects[idx];
    const projSub = projectedSubjects[idx];

    // Build per-component delta object
    const componentDeltas = {};
    for (const compType of ['L', 'P', 'S']) {
      const bc = baseSub.components?.[compType];
      const pc = projSub.components?.[compType];

      // Skip components that don't exist in either baseline or projection
      if ((!bc || bc.conducted === 0) && (!pc || pc.conducted === 0)) continue;

      const baseConducted = bc?.conducted || 0;
      const baseAttended  = bc?.attended  || 0;
      const projConducted = pc?.conducted || 0;
      const projAttended  = pc?.attended  || 0;

      const basePct = baseConducted > 0 ? Math.round((baseAttended / baseConducted) * 100) : 100;
      const projPct = projConducted > 0 ? Math.round((projAttended / projConducted) * 100) : 100;

      componentDeltas[compType] = {
        baseConducted,
        baseAttended,
        projConducted,
        projAttended,
        addedConducted: projConducted - baseConducted,
        addedAttended:  projAttended  - baseAttended,
        basePct,
        projPct,
        deltaPct: projPct - basePct,
      };
    }

    return {
      ...proj,
      basePercentage: base.percentage,
      delta: proj.percentage - base.percentage,
      componentDeltas,
    };
  });
};

/**
 * Panic Mode: Calculate minimum classes needed to hit 75%.
 * We simulate attending all future classes according to the blueprint until the subject hits 75%.
 * Returns the number of consecutive classes needed.
 */
export const calculatePanicMode = (subject, blueprint) => {
  let simSubject = JSON.parse(JSON.stringify(subject));
  let status = calculateSubjectStatus(simSubject);
  
  if (status.percentage >= 75) return 0;
  
  // To avoid infinite loops, we cap it
  let classesNeeded = 0;
  let simulatedDays = 0;
  let currentDate = new Date();
  
  while (status.percentage < 75 && simulatedDays < 100) {
    simulatedDays++;
    currentDate = addDays(currentDate, 1);
    const dayOfWeek = getDay(currentDate);
    const classesToday = blueprint[dayOfWeek] || [];
    
    const subjectClassesToday = classesToday.filter(c => c && c.courseCode === subject.courseCode);
    
    if (subjectClassesToday.length > 0) {
      subjectClassesToday.forEach(cls => {
        if (!simSubject.components[cls.type]) {
           simSubject.components[cls.type] = { conducted: 0, attended: 0 };
        }
        simSubject.components[cls.type].conducted += 1;
        simSubject.components[cls.type].attended += 1;
        classesNeeded += 1;
      });
      status = calculateSubjectStatus(simSubject);
    }
  }
  
  return status.percentage >= 75 ? classesNeeded : ">100";
};

/**
 * Advanced Component Projections (Algebraic)
 * Calculates either the exact number of classes needed to attend to reach the target,
 * OR the number of classes you can afford to skip (Safety Margin).
 */
export const calculateComponentProjections = (subject, target = 85) => {
  const results = {};

  const L = subject.components?.L || { conducted: 0, attended: 0 };
  const P = subject.components?.P || { conducted: 0, attended: 0 };
  const S = subject.components?.S || { conducted: 0, attended: 0 };
  
  let weightL = L.conducted > 0 ? 100 : 0;
  let weightP = P.conducted > 0 ? 50 : 0;
  let weightS = S.conducted > 0 ? 25 : 0;
  const W_total = weightL + weightP + weightS;

  const currentStatus = calculateSubjectStatus(subject);
  const isSafe = currentStatus.percentage >= target;

  ['L', 'P', 'S'].forEach(compType => {
    const comp = subject.components[compType];
    if (!comp || comp.conducted === 0) return;
    
    const W_j = compType === 'L' ? 100 : compType === 'P' ? 50 : 25;
    
    // Sum of other components
    let S_other = 0;
    if (compType !== 'L' && L.conducted > 0) S_other += (L.attended / L.conducted) * 100 * weightL;
    if (compType !== 'P' && P.conducted > 0) S_other += (P.attended / P.conducted) * 100 * weightP;
    if (compType !== 'S' && S.conducted > 0) S_other += (S.attended / S.conducted) * 100 * weightS;
    
    // Epsilon is 0.0001 for Math.ceil wrapping
    const effectiveTarget = target - 0.9999;
    const K = effectiveTarget * W_total - S_other;

    if (isSafe) {
      // CALCULATE SKIPS (Safety Margin)
      if (K <= 0) {
         results[compType] = { type: 'skip', value: 'Infinity' };
      } else {
         const skipNumerator = 100 * W_j * comp.attended - K * comp.conducted;
         let y = Math.floor(skipNumerator / K);
         y = Math.max(0, y);
         results[compType] = { type: 'skip', value: y };
      }
    } else {
      // CALCULATE NEEDS — no Impossible check; denominator can approach large numbers naturally
      const denominator = 100 * W_j - K;
      if (denominator <= 0) {
        // Genuinely impossible: this component alone can never move the needle
        results[compType] = { type: 'need', value: 9999 };
      } else {
        const numerator = K * comp.conducted - 100 * W_j * comp.attended;
        let x = Math.ceil(numerator / denominator);
        x = Math.max(0, x);
        results[compType] = { type: 'need', value: x };
      }
    }
  });

  return results;
};

/**
 * Calculates the weighted attendance "cost" of missing all classes on a given day.
 * Returns an average percentage-point drop across all affected subjects.
 * Used by the Forecast heatmap to colour impact dots.
 */
export const calculateDayImpact = (date, baseline, blueprint) => {
  const dayOfWeek = getDay(date);
  const classesToday = (blueprint[dayOfWeek] || []).filter(c => c !== null);
  if (classesToday.length === 0) return 0;

  let totalDelta = 0;
  let count = 0;

  classesToday.forEach(cls => {
    const subject = baseline.find(s => s.courseCode === cls.courseCode);
    if (!subject || !subject.components[cls.type]) return;

    const current = calculateSubjectStatus(subject).percentage;

    // Simulate absence: conducted+1, attended unchanged
    const sim = JSON.parse(JSON.stringify(subject));
    sim.components[cls.type].conducted += 1;
    const projected = calculateSubjectStatus(sim).percentage;

    totalDelta += (current - projected);
    count++;
  });

  return count > 0 ? totalDelta / count : 0;
};
