const SHORT_DAYS = [
  { key: "MON", full: "Monday", dayOfWeek: 1 },
  { key: "TUE", full: "Tuesday", dayOfWeek: 2 },
  { key: "WED", full: "Wednesday", dayOfWeek: 3 },
  { key: "THU", full: "Thursday", dayOfWeek: 4 },
  { key: "FRI", full: "Friday", dayOfWeek: 5 },
  { key: "SAT", full: "Saturday", dayOfWeek: 6 },
];

const periodRows = [
  { key: "period-1", periodNumber: 1, startTime: "09:00:00", endTime: "10:00:00" },
  { key: "period-2", periodNumber: 2, startTime: "10:00:00", endTime: "11:00:00" },
  { key: "period-3", periodNumber: 3, startTime: "11:15:00", endTime: "12:15:00" },
  { key: "period-4", periodNumber: 4, startTime: "12:40:00", endTime: "13:20:00" },
  { key: "period-5", periodNumber: 5, startTime: "13:20:00", endTime: "14:00:00" },
  { key: "period-6", periodNumber: 6, startTime: "14:00:00", endTime: "15:00:00" },
  { key: "period-7", periodNumber: 7, startTime: "15:00:00", endTime: "16:00:00" },
  { key: "period-8", periodNumber: 8, startTime: "16:00:00", endTime: "17:00:00" },
];

const timetableSlots = [
  { id: 6497, dayOfWeek: 1, dayName: 'Monday', periodName: 'Period 1', periodNumber: 1, startTime: '09:00:00', endTime: '10:00:00', subjectName: 'Chemistry - I', sectionName: 'MPC-2A' },
  { id: 6498, dayOfWeek: 1, dayName: 'Monday', periodName: 'Period 3', periodNumber: 3, startTime: '11:15:00', endTime: '12:15:00', subjectName: 'Chemistry - II', sectionName: 'MPC-2A' },
  { id: 6499, dayOfWeek: 1, dayName: 'Monday', periodName: 'Period 5', periodNumber: 5, startTime: '15:00:00', endTime: '16:00:00', subjectName: 'Chemistry - I', sectionName: 'MPC-2A' },
  { id: 6500, dayOfWeek: 2, dayName: 'Tuesday', periodName: 'Period 2', periodNumber: 2, startTime: '10:00:00', endTime: '11:00:00', subjectName: 'Chemistry - I', sectionName: 'MPC-2A' },
  { id: 6502, dayOfWeek: 2, dayName: 'Tuesday', periodName: 'Period 4', periodNumber: 4, startTime: '14:00:00', endTime: '15:00:00', subjectName: 'Chemistry - II', sectionName: 'MPC-2A' },
  { id: 6503, dayOfWeek: 3, dayName: 'Wednesday', periodName: 'Period 1', periodNumber: 1, startTime: '09:00:00', endTime: '10:00:00', subjectName: 'Chemistry - II', sectionName: 'MPC-2A' },
  { id: 6504, dayOfWeek: 3, dayName: 'Wednesday', periodName: 'Period 3', periodNumber: 3, startTime: '11:15:00', endTime: '12:15:00', subjectName: 'Chemistry - I', sectionName: 'MPC-2A' },
  { id: 7121, dayOfWeek: 3, dayName: 'Wednesday', periodName: 'Period 6', periodNumber: 8, startTime: '13:20:00', endTime: '14:00:00', subjectName: 'Chemistry - I', sectionName: 'REG-1' },
  { id: 6506, dayOfWeek: 4, dayName: 'Thursday', periodName: 'Period 1', periodNumber: 1, startTime: '09:00:00', endTime: '10:00:00', subjectName: 'Chemistry - I', sectionName: 'MPC-2A' },
  { id: 7170, dayOfWeek: 4, dayName: 'Thursday', periodName: 'Period 5', periodNumber: 7, startTime: '12:40:00', endTime: '13:20:00', subjectName: 'Chemistry - I', sectionName: 'Reg-1A' },
  { id: 6508, dayOfWeek: 5, dayName: 'Friday', periodName: 'Period 2', periodNumber: 2, startTime: '10:00:00', endTime: '11:00:00', subjectName: 'Chemistry - I', sectionName: 'MPC-2A' },
  { id: 6509, dayOfWeek: 5, dayName: 'Friday', periodName: 'Period 3', periodNumber: 3, startTime: '11:15:00', endTime: '12:15:00', subjectName: 'Chemistry - II', sectionName: 'MPC-2A' },
  { id: 6510, dayOfWeek: 6, dayName: 'Saturday', periodName: 'Period 1', periodNumber: 1, startTime: '09:00:00', endTime: '10:00:00', subjectName: 'Chemistry - II', sectionName: 'MPC-2A' }
];

function testMatrix() {
  const matrix = {};
  const assignedSlotIds = new Set();

  SHORT_DAYS.forEach((d, dayIdx) => {
    matrix[dayIdx] = {};

    const daySlots = (timetableSlots || []).filter((s) => {
      const slotDay = String(s.dayName || "").trim().toLowerCase();
      return slotDay === d.full.toLowerCase() || s.dayOfWeek === d.dayOfWeek;
    });

    // Pass 1: Exact start-time match
    daySlots.forEach((slot) => {
      if (!slot.startTime || assignedSlotIds.has(slot.id)) return;
      const slotStart = String(slot.startTime).slice(0, 5);

      const matchedPeriod = periodRows.find((p) => {
        if (matrix[dayIdx][p.key]) return false;
        const pStart = String(p.startTime).slice(0, 5);
        return slotStart === pStart;
      });

      if (matchedPeriod) {
        matrix[dayIdx][matchedPeriod.key] = slot;
        assignedSlotIds.add(slot.id);
      }
    });

    // Pass 2: Overlapping / closest start time within 60 minutes
    daySlots.forEach((slot) => {
      if (!slot.startTime || assignedSlotIds.has(slot.id)) return;
      const [h, m] = String(slot.startTime).split(":").map(Number);
      const slotMins = (h || 0) * 60 + (m || 0);

      let bestPeriod = null;
      let minDiff = Infinity;

      periodRows.forEach((p) => {
        if (matrix[dayIdx][p.key]) return;
        const [ph, pm] = String(p.startTime).split(":").map(Number);
        const pMins = (ph || 0) * 60 + (pm || 0);
        const diff = Math.abs(slotMins - pMins);
        if (diff < minDiff && diff < 60) {
          minDiff = diff;
          bestPeriod = p;
        }
      });

      if (bestPeriod) {
        matrix[dayIdx][bestPeriod.key] = slot;
        assignedSlotIds.add(slot.id);
      }
    });

    // Pass 3: Fallback by periodNumber
    daySlots.forEach((slot) => {
      if (assignedSlotIds.has(slot.id)) return;
      const matchedPeriod = periodRows.find((p) => {
        if (matrix[dayIdx][p.key]) return false;
        return p.periodNumber === slot.periodNumber;
      });

      if (matchedPeriod) {
        matrix[dayIdx][matchedPeriod.key] = slot;
        assignedSlotIds.add(slot.id);
      }
    });
  });

  console.log('--- VERIFICATION OF MATRIX BY DAY ---');
  let totalRendered = 0;
  SHORT_DAYS.forEach((d, idx) => {
    const slotsInDay = Object.entries(matrix[idx]);
    console.log(`${d.full} (${d.key}): ${slotsInDay.length} periods`);
    slotsInDay.forEach(([pKey, s]) => {
      console.log(`   [${pKey}] Slot ${s.id}: ${s.subjectName} (${s.sectionName}) @ ${s.startTime} - ${s.endTime}`);
      totalRendered++;
    });
  });

  console.log(`\nTotal slots rendered on grid: ${totalRendered} (Original DB count: ${timetableSlots.length})`);
  console.log(`Unique assigned slot IDs: ${assignedSlotIds.size}`);
}

testMatrix();
