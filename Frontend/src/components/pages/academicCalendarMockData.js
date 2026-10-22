// Demo-only academic masters and events. These never represent backend records.
export const calendarMasters = {
  boards: [{ id: 'state', name: 'State Board' }],
  years: [{ id: '2025', name: '2025–2026' }, { id: '2026', name: '2026–2027', isActive: true }],
  levels: [{ id: 'first', name: 'First Year', boardId: 'state' }, { id: 'second', name: 'Second Year', boardId: 'state' }],
};
calendarMasters.groups = calendarMasters.levels.flatMap((level) => ['MPC', 'BiPC', 'CEC', 'MEC'].map((name) => ({ id: `${level.id}-${name.toLowerCase()}`, name, academicLevelId: level.id, boardId: level.boardId })));
calendarMasters.programs = calendarMasters.groups.flatMap((group) => {
  const names = group.name === 'MPC' ? ['Regular', 'IIT JEE Mains', 'EAMCET'] : group.name === 'BiPC' ? ['Regular', 'NEET', 'EAMCET'] : ['Regular'];
  return names.map((name, index) => ({ id: `${group.id}-p${index}`, name, groupId: group.id }));
});
calendarMasters.sections = calendarMasters.programs.flatMap((program) => ['A', 'B', 'C', 'D'].map((name) => ({ id: `${program.id}-${name.toLowerCase()}`, name, programId: program.id })));

const samples = [
  ['Academic Orientation', 'academic', '2026-06-08', '2026-06-08', 'first'],
  ['College Holiday', 'holidays', '2026-06-15', '2026-06-15'],
  ['Unit Test – 1', 'examinations', '2026-07-20', '2026-07-24', 'first', 'mpc'],
  ['Biology Unit Test', 'examinations', '2026-07-22', '2026-07-22', 'second', 'bipc'],
  ['Parent–Teacher Meeting', 'meetings', '2026-08-08', '2026-08-08'],
  ['Economics Assignment Deadline', 'deadlines', '2026-08-21', '2026-08-21', 'first', 'cec'],
  ['Quarterly Examinations', 'examinations', '2026-09-14', '2026-09-19'],
  ['College Holiday — Autumn Break', 'holidays', '2026-10-12', '2026-10-17'],
  ['Revision Classes', 'academic', '2026-10-19', '2026-10-23', 'second', 'mpc', 1, 'a'],
  ['Chemistry Practical', 'practical', '2026-10-22', '2026-10-22', 'first', 'bipc', 1, 'b'],
  ['Commerce Assignment Submission', 'deadlines', '2026-10-22', '2026-10-22', 'second', 'mec'],
  ['College Cultural Fest', 'college', '2026-10-22', '2026-10-23'],
  ['Parent–Teacher Review', 'meetings', '2026-10-22', '2026-10-22', 'first'],
  ['Mathematics Quiz', 'academic', '2026-10-22', '2026-10-22', 'first', 'mpc'],
  ['Sports Day', 'college', '2026-11-14', '2026-11-14'],
  ['NEET Practice Examination', 'examinations', '2026-11-21', '2026-11-21', 'second', 'bipc', 1],
  ['Half-Yearly Examinations', 'examinations', '2026-12-14', '2026-12-19'],
  ['Business Studies Workshop', 'academic', '2027-01-09', '2027-01-09', 'first', 'mec'],
  ['Practical Examinations', 'practical', '2027-02-01', '2027-02-06', 'second', 'bipc'],
  ['Final Examination Preparation', 'academic', '2027-02-15', '2027-02-26', 'second'],
  ['Exam Application Deadline', 'deadlines', '2027-02-20', '2027-02-20'],
  ['Annual College Review', 'college', '2027-03-20', '2027-03-20', 'second', 'cec'],
];

export const initialCalendarEvents = samples.map(([title, type, start, end, level = '', group = '', program, section], index) => {
  const groupId = group ? `${level}-${group}` : '';
  const programId = program === undefined ? '' : `${groupId}-p${program}`;
  return {
    id: `demo-${index + 1}`, title, type, start, end,
    description: `Demo schedule for ${title}. Dates and allocations are illustrative.`,
    allDay: !['meetings', 'practical', 'examinations'].includes(type),
    startTime: ['meetings', 'practical', 'examinations'].includes(type) ? '09:00' : '',
    endTime: ['meetings', 'practical', 'examinations'].includes(type) ? '12:00' : '',
    boardId: 'state', academicYearId: '2026', academicLevelId: level, groupId, programId,
    sectionId: section ? `${programId}-${section}` : '',
    location: type === 'college' ? 'College grounds' : type === 'practical' ? 'Science laboratory' : '',
    status: index === 14 || index === 21 ? 'Draft' : index === 17 ? 'Cancelled' : 'Published', source: 'demo',
  };
});
initialCalendarEvents.push({ ...initialCalendarEvents[0], id: 'demo-previous-year', title: 'Previous Year Orientation', start: '2025-06-09', end: '2025-06-09', academicYearId: '2025' });
