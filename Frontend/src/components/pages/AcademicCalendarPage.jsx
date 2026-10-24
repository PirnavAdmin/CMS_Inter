import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Printer, Download, Eye, Pencil, Trash2, RotateCcw, CalendarDays, Clock3, FileText, Sun } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout.jsx';
import { Modal, ConfirmDialog, Toast } from '@/components/common/Ui.jsx';
import { calendarMasters as masters, initialCalendarEvents } from './academicCalendarMockData.js';
import './AcademicCalendarPage.css';

// Date, filtering, and event helpers.
export const EVENT_TYPES = {
  examinations: { label: 'Examinations', color: '#2563eb' },
  holidays: { label: 'Holidays', color: '#dc2626' },
  academic: { label: 'Academic Activities', color: '#15803d' },
  college: { label: 'College Events', color: '#9333ea' },
  meetings: { label: 'Parent–Teacher Meetings', color: '#ea580c' },
  practical: { label: 'Practical Examinations', color: '#0d9488' },
  deadlines: { label: 'Important Deadlines', color: '#b77900' },
};

export function dateKey(value) {
  const key = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const parsed = new Date(`${key}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== key ? '' : key;
}
export const localKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function shiftDay(key, days) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localKey(date);
}
export function calendarRange(anchor, view) {
  const date = new Date(`${anchor}T12:00:00`);
  if (view === 'week') {
    const start = shiftDay(anchor, -date.getDay());
    return { start, end: shiftDay(start, 6) };
  }
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
  return { start: localKey(first), end: localKey(last) };
}
export function rowsOf(response) {
  let data = response;
  for (let i = 0; i < 8; i++) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') break;
    if (data.success === false) throw new Error(data.message || 'The server rejected this request.');
    data = data.data ?? data.items ?? data.Items ?? data.records ?? data.results ?? data.schedules ?? data.examinationSchedules ?? data.$values;
  }
  throw new Error('The server returned an unsupported list response.');
}
const scopeFields = {
  campusId: ['campusId', 'campusIds'], boardId: ['boardId', 'boardIds'],
  academicYearId: ['academicYearId', 'academicYearIds', 'yearId'],
  academicLevelId: ['academicLevelId', 'academicLevelIds', 'levelId', 'levelIds'],
  groupId: ['groupId', 'groupIds'], programId: ['programId', 'programIds'], sectionId: ['sectionId', 'sectionIds'],
};
export function scopeIds(record, field) {
  return (scopeFields[field] || [field]).flatMap((key) => {
    const value = record?.[key];
    return (Array.isArray(value) ? value : [value]).filter((id) => id != null && id !== '').map(String);
  });
}
export function matchesScope(record, filters) {
  return Object.keys(scopeFields).every((key) => {
    const ids = scopeIds(record, key);
    return !filters[key] || !ids.length || ids.includes(String(filters[key]));
  });
}
function event(record, fallback, source, index) {
  const r = { ...fallback, ...record };
  // A schedule's explicit scope takes precedence over its parent exam's scope.
  const scope = Object.fromEntries(Object.keys(scopeFields).map((key) => [key, scopeIds(record, key).length ? scopeIds(record, key) : scopeIds(fallback, key)]));
  // Remove inherited aliases so subsequent filters cannot reintroduce broader parent scope.
  Object.values(scopeFields).flat().forEach((key) => { delete r[key]; });
  const start = dateKey(source === 'holidays' ? r.startDate || r.holidayDate : r.examDate || r.scheduleDate || r.date || r.examScheduleDate || r.startDate);
  const end = dateKey(source === 'holidays' ? r.endDate : record.endDate) || start;
  if (!start || end < start) return null;
  const title = source === 'holidays' ? r.holidayName || r.name : fallback.examName || fallback.examinationName || fallback.name || r.examName || r.name;
  if (!title) return null;
  const type = source === 'holidays' ? 'holidays' : /practical/i.test(`${r.examCategory || ''} ${r.examTypeName || ''} ${r.examType || ''}`) ? 'practical' : 'examinations';
  const parentId = fallback.examinationId ?? fallback.examId ?? fallback.id;
  const recordId = source === 'holidays' ? r.holidayId ?? r.id : record.scheduleId ?? record.examinationScheduleId ?? record.id;
  const subject = r.subjectName || r.patternName;
  const identity = recordId ?? [start, end, title, subject, r.startTime, r.endTime, JSON.stringify(scope)].join('|');
  return { ...r, ...scope, id: `${source}:${parentId ?? ''}:${identity ?? index}`, title: `${title}${subject ? ` · ${subject}` : ''}`, type, start, end, source };
}
export function holidayEvents(records) {
  return records.map((r, i) => event(r, {}, 'holidays', i)).filter(Boolean);
}
export function examEvents(exam, schedules) {
  return schedules.map((r, i) => event(r, exam, 'examinations', i)).filter(Boolean);
}
export const uniqueEvents = (events) => [...new Map(events.map((e) => [e.id, e])).values()].sort((a, b) => a.start.localeCompare(b.start) || String(a.startTime || '').localeCompare(String(b.startTime || '')) || a.title.localeCompare(b.title));
export function filterEvents(events, filters) {
  return events.filter((e) => matchesScope(e, filters)
    && (!filters.type || e.type === filters.type)
    && (!filters.status || e.status === filters.status)
    && (!filters.search || e.title.toLowerCase().includes(filters.search.toLowerCase().trim()))
    && (!filters.from || e.end >= filters.from) && (!filters.to || e.start <= filters.to));
}

export function plannerDays(events, range, includeEmpty = false) {
  const groups = [];
  for (let day = range.start; day <= range.end; day = shiftDay(day, 1)) {
    const entries = events.filter((event) => event.start <= day && event.end >= day);
    if (includeEmpty || entries.length) groups.push({ date: day, events: entries });
  }
  return groups;
}
export const upcomingEvents = (events, today = todayKey()) => events.filter((event) => event.start >= today && event.status !== 'Cancelled').sort((a, b) => a.start.localeCompare(b.start) || String(a.startTime || '').localeCompare(String(b.startTime || '')));



export const CALENDAR_STATUSES = ['Draft', 'Published', 'Cancelled'];

export function validateCalendarEvent(payload, eventTypes = EVENT_TYPES) {
  const errors = {};
  if (!String(payload.title || '').trim()) errors.title = 'Event title is required.';
  if (payload.type === 'other') {
    if (!String(payload.customType || '').trim()) errors.customType = 'Enter an event type.';
  } else if (!Object.hasOwn(eventTypes, payload.type)) errors.type = 'Select an event type.';
  if (!masters.years.some((r) => r.id === payload.academicYearId)) errors.academicYearId = 'Select an academic year.';
  if (!dateKey(payload.start)) errors.start = 'A valid start date is required.';
  if (!dateKey(payload.end)) errors.end = 'A valid end date is required.';
  if (dateKey(payload.start) && dateKey(payload.end) && payload.end < payload.start) errors.end = 'End date cannot be before start date.';
  if (!payload.allDay) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.startTime || '')) errors.startTime = 'Enter a valid start time.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.endTime || '')) errors.endTime = 'Enter a valid end time.';
    if (payload.start === payload.end && payload.endTime < payload.startTime) errors.endTime = 'End time cannot be before start time.';
  }
  if (!masters.boards.some((r) => r.id === payload.boardId)) errors.boardId = 'Select a board.';
  if (payload.academicLevelId && !masters.levels.some((r) => r.id === payload.academicLevelId && r.boardId === payload.boardId)) errors.academicLevelId = 'Academic level must belong to the selected board.';
  if (payload.groupId && !masters.groups.some((r) => r.id === payload.groupId && r.academicLevelId === payload.academicLevelId && r.boardId === payload.boardId)) errors.groupId = 'Group must belong to the selected academic level.';
  if (payload.programId && !masters.programs.some((r) => r.id === payload.programId && r.groupId === payload.groupId)) errors.programId = 'Programme must belong to the selected group.';
  if (payload.sectionId && !masters.sections.some((r) => r.id === payload.sectionId && r.programId === payload.programId)) errors.sectionId = 'Section must belong to the selected programme.';
  if (!CALENDAR_STATUSES.includes(payload.status)) errors.status = 'Select a valid status.';
  return errors;
}

export const CALENDAR_DEMO_STORAGE_KEY = 'pirnav.cms.academic-calendar.demo.v1';
const CUSTOM_TYPE_COLOR = '#64748b';
const normalizedTypeLabel = (label) => String(label).trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN');

// Persist the complete demo snapshot atomically so events and type IDs stay in sync.
export function createAcademicCalendarService(seed = initialCalendarEvents, storageOverride) {
  let collection = structuredClone(seed);
  let eventTypes = structuredClone(EVENT_TYPES);
  let storage = storageOverride;
  let storageError = false;
  try {
    if (storage === undefined) storage = typeof window === 'undefined' ? null : window.localStorage;
    const saved = JSON.parse(storage?.getItem(CALENDAR_DEMO_STORAGE_KEY) || 'null');
    if (saved?.version === 1 && Array.isArray(saved.events) && saved.customTypes && typeof saved.customTypes === 'object') {
      const types = { ...EVENT_TYPES };
      const labels = new Set(Object.values(types).map((type) => normalizedTypeLabel(type.label)));
      for (const [id, type] of Object.entries(saved.customTypes)) {
        if (!id.startsWith('custom-') || typeof type?.label !== 'string' || !type.label.trim() || labels.has(normalizedTypeLabel(type.label))) throw new Error('Invalid saved event types.');
        types[id] = { label: type.label.trim(), color: CUSTOM_TYPE_COLOR };
        labels.add(normalizedTypeLabel(type.label));
      }
      if (saved.events.some((event) => !event.id || event.type === 'other' || Object.keys(validateCalendarEvent(event, types)).length)) throw new Error('Invalid saved demo events.');
      collection = saved.events;
      eventTypes = types;
    }
  } catch (error) {
    // Ignore damaged demo snapshots; a subsequent successful save replaces them.
    storageError = error?.name === 'SecurityError';
  }
  const read = (filters = {}) => structuredClone(uniqueEvents(filterEvents(collection, filters)));
  const commit = (nextEvents, nextTypes = eventTypes) => {
    const customTypes = Object.fromEntries(Object.entries(nextTypes).filter(([id]) => !Object.hasOwn(EVENT_TYPES, id)));
    try {
      if (storageError) throw new Error('Browser storage is unavailable.');
      storage?.setItem(CALENDAR_DEMO_STORAGE_KEY, JSON.stringify({ version: 1, events: nextEvents, customTypes }));
    } catch {
      throw new Error('Could not save the demo in browser storage. Allow local storage or free up space and try again.');
    }
    collection = nextEvents;
    eventTypes = nextTypes;
  };
  const checked = (payload) => {
    const errors = validateCalendarEvent(payload, eventTypes);
    if (Object.keys(errors).length) {
      const error = new Error('Please correct the highlighted fields.');
      error.fieldErrors = errors;
      throw error;
    }
    const nextTypes = { ...eventTypes };
    let type = payload.type;
    if (type === 'other') {
      const label = String(payload.customType).trim();
      type = Object.keys(nextTypes).find((id) => normalizedTypeLabel(nextTypes[id].label) === normalizedTypeLabel(label));
      if (!type) {
        type = `custom-${crypto.randomUUID()}`;
        nextTypes[type] = { label, color: CUSTOM_TYPE_COLOR };
      }
    }
    const { customType: _customType, ...fields } = payload;
    return { event: { ...fields, type, title: payload.title.trim(), ...(payload.allDay ? { startTime: '', endTime: '' } : {}), source: 'demo' }, types: nextTypes };
  };
  const findIndex = (id) => {
    const index = collection.findIndex((event) => event.id === id);
    if (index < 0) throw new Error('This demo event no longer exists.');
    return index;
  };
  return {
    getEventTypes() { return structuredClone(eventTypes); },
    async getCalendarEvents(filters = {}) { return read(filters); },
    async createCalendarEvent(payload) {
      const checkedPayload = checked(payload);
      const event = { ...checkedPayload.event, id: `demo-created-${crypto.randomUUID()}` };
      commit([...collection, event], checkedPayload.types); return structuredClone(event);
    },
    async updateCalendarEvent(id, payload) {
      const index = findIndex(id);
      const checkedPayload = checked(payload);
      const event = { ...checkedPayload.event, id };
      commit(collection.map((existing, i) => i === index ? event : existing), checkedPayload.types);
      return structuredClone(event);
    },
    async deleteCalendarEvent(id) { findIndex(id); commit(collection.filter((event) => event.id !== id)); },
    async publishCalendarEvent(id) { const index = findIndex(id); commit(collection.map((event, i) => i === index ? { ...event, status: 'Published' } : event)); },
    async cancelCalendarEvent(id) { const index = findIndex(id); commit(collection.map((event, i) => i === index ? { ...event, status: 'Cancelled' } : event)); },
    async resetCalendarEvents() { commit(structuredClone(seed), structuredClone(EVENT_TYPES)); return read(); },
  };
}



function AcademicCalendarEventForm({ event, defaults, onClose, onSave, eventTypes }) {
  const [values, setValues] = useState(() => event || { title: '', type: '', description: '', start: todayKey(), end: todayKey(), startTime: '09:00', endTime: '10:00', allDay: true, boardId: 'state', academicYearId: '2026', academicLevelId: '', groupId: '', programId: '', sectionId: '', location: '', status: 'Draft', ...defaults });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape' && !pending.current) onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const pending = useRef(false);
  const formRef = useRef(null);
  const change = (key, value) => {
    setValues((current) => ({ ...current, [key]: value,
      ...(key === 'boardId' ? { academicLevelId: '', groupId: '', programId: '', sectionId: '' } : {}),
      ...(key === 'academicLevelId' ? { groupId: '', programId: '', sectionId: '' } : {}),
      ...(key === 'groupId' ? { programId: '', sectionId: '' } : {}), ...(key === 'programId' ? { sectionId: '' } : {}),
    }));
    setErrors({});
  };
  const save = async (status) => {
    if (pending.current) return;
    const payload = { ...values, status };
    const nextErrors = validateCalendarEvent(payload, eventTypes);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    pending.current = true; setSaving(true);
    try { await onSave(payload, event?.id); }
    catch (error) { setErrors(error.fieldErrors || { form: error.message }); }
    finally { pending.current = false; setSaving(false); }
  };
  const field = (key, label, type = 'text', required = false) => <label className={`cms-field${['title', 'location'].includes(key) ? ' is-wide' : ''}`}><span>{label}{required ? ' *' : ''}</span><input name={key} type={type} value={values[key]} required={required} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `event-error-${key}` : undefined} onChange={(e) => change(key, e.target.value)} /><small className="cms-error" id={`event-error-${key}`}>{errors[key]}</small></label>;
  const select = (key, label, options, disabled = false, placeholder = 'All') => <label className="cms-field"><span>{label}</span><select name={key} value={values[key]} disabled={disabled} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `event-error-${key}` : undefined} onChange={(e) => change(key, e.target.value)}><option value="">{placeholder}</option>{options.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><small className="cms-error" id={`event-error-${key}`}>{errors[key]}</small></label>;
  return <Modal className="academic-calendar-modal" title={event ? 'Edit Demo Event' : 'Add Demo Event'} onClose={saving ? () => {} : onClose} closeOnOverlay={!saving} footer={<>
    <button className="cms-btn cms-btn-ghost" disabled={saving} onClick={onClose}>Cancel</button>
    <button className="cms-btn cms-btn-ghost" disabled={saving} onClick={() => save('Draft')}>Save as Draft</button>
    {event && <button className="cms-btn cms-btn-ghost" disabled={saving} onClick={() => save(values.status)}>Save Changes</button>}
    <button className="cms-btn cms-btn-primary" disabled={saving} onClick={() => save('Published')}>{saving ? 'Saving…' : 'Publish Event'}</button>
  </>}>
    <p className="academic-calendar-note">Demo only. Events and custom types are saved in this browser. Reset Demo restores the original samples.</p>
    <form ref={formRef} className="academic-calendar-form" noValidate onSubmit={(e) => { e.preventDefault(); save(values.status); }}>
      {field('title', 'Event Title', 'text', true)}
      {select('type', 'Event Type *', [...Object.entries(eventTypes).map(([id, type]) => ({ id, name: type.label })), { id: 'other', name: 'Other' }], false, 'Select event type')}
      {select('status', 'Status', CALENDAR_STATUSES.map((id) => ({ id, name: id })), false, 'Select status')}
      {values.type === 'other' && <label className="cms-field is-wide custom-event-type-field"><span>Enter Event Type *</span><input name="customType" value={values.customType || ''} placeholder="e.g., Sports Activities, Workshop, Seminar" required aria-invalid={Boolean(errors.customType)} aria-describedby={errors.customType ? 'event-error-customType' : undefined} onChange={(e) => change('customType', e.target.value)} /><small className="cms-error" id="event-error-customType">{errors.customType}</small></label>}
      <label className="cms-field is-wide"><span>Description</span><textarea value={values.description} onChange={(e) => change('description', e.target.value)} rows={3} /></label>
      {field('start', 'Start Date', 'date', true)}{field('end', 'End Date', 'date', true)}
      <label className="academic-calendar-checkbox is-wide"><input type="checkbox" checked={values.allDay} onChange={(e) => change('allDay', e.target.checked)} />All day</label>
      {!values.allDay && <>{field('startTime', 'Start Time', 'time', true)}{field('endTime', 'End Time', 'time', true)}</>}
      {select('boardId', 'Board *', masters.boards, false, 'Select board')}
      {select('academicYearId', 'Academic Year *', masters.years, false, 'Select academic year')}
      {select('academicLevelId', 'Academic Level', masters.levels.filter((r) => r.boardId === values.boardId), !values.boardId)}
      {select('groupId', 'Group', masters.groups.filter((r) => r.academicLevelId === values.academicLevelId), !values.academicLevelId)}
      {select('programId', 'Programme', masters.programs.filter((r) => r.groupId === values.groupId), !values.groupId)}
      {select('sectionId', 'Section', masters.sections.filter((r) => r.programId === values.programId), !values.programId)}
      {field('location', 'Location')}
      {errors.form && <p role="alert" className="cms-error is-wide">{errors.form}</p>}
    </form>
  </Modal>;
}



const dayDate = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', options);
function DateBadge({ date }) {
  return <span className="academic-planner-date-badge"><strong>{Number(date.slice(8))}</strong><span>{dayDate(date, { month: 'short' })}</span></span>;
}

export function PlannerHeader({ filtered, upcoming, loading, busy, exporting, visible, yearName, openEditor, exportFile, selectedDate }) {
  return <>
    <div className="academic-planner-topline"><span className="academic-planner-demo-label">Demo planner · {yearName}</span><div className="academic-planner-actions"><button className="cms-btn cms-btn-primary" disabled={busy || loading} onClick={() => openEditor(null, selectedDate)}><Plus size={17} />Add Event</button><button className="cms-btn cms-btn-ghost" disabled={loading} onClick={() => window.print()}><Printer size={16} />Print</button><button className="cms-btn cms-btn-ghost" disabled={loading || exporting || !visible.length} onClick={() => exportFile('pdf')}><Download size={16} />PDF</button><button className="cms-btn cms-btn-ghost" disabled={loading || exporting || !visible.length} onClick={() => exportFile('excel')}><Download size={16} />Excel</button></div></div>
    <div className="academic-calendar-summary">{[
      ['Total Events', filtered.length, CalendarDays, 'green'], ['Upcoming Events', upcoming.length, Clock3, 'amber'], ['Examinations', filtered.filter((event) => ['examinations', 'practical'].includes(event.type)).length, FileText, 'blue'], ['Holidays', filtered.filter((event) => event.type === 'holidays').length, Sun, 'red'],
    ].map(([label, count, Icon, color]) => <div key={label}><span className={`academic-planner-summary-icon is-${color}`}><Icon size={24} /></span><div><span>{label}</span><strong>{loading ? '…' : count}</strong></div><span className="academic-summary-bars" aria-hidden="true"><i/><i/><i/><i/><i/></span></div>)}</div>
  </>;
}

export function PlannerNavigation({ view, periodLabel, move, today, changeView }) {
  return <div className="academic-calendar-toolbar"><div className="academic-planner-period">{view !== 'list' && <><button className="academic-planner-nav" aria-label="Previous period" onClick={() => move(-1)}><ChevronLeft size={18} /></button><button className="academic-planner-nav" aria-label="Next period" onClick={() => move(1)}><ChevronRight size={18} /></button></>}<h2>{periodLabel}</h2>{view !== 'list' && <button className="cms-btn cms-btn-ghost" onClick={today}>Today</button>}</div><div className="academic-planner-view-switch" aria-label="Planner view">{['month', 'week', 'list'].map((mode) => <button aria-pressed={view === mode} className={view === mode ? 'is-active' : ''} key={mode} onClick={() => changeView(mode)}>{mode[0].toUpperCase() + mode.slice(1)}</button>)}</div></div>;
}

export function monthCells(anchor, events) {
  const range = calendarRange(anchor, 'month');
  const start = shiftDay(range.start, -new Date(`${range.start}T12:00:00`).getDay());
  const count = Math.max(35, Math.ceil((Number(range.end.slice(8)) + new Date(`${range.start}T12:00:00`).getDay()) / 7) * 7);
  return plannerDays(events, { start, end: shiftDay(start, count - 1) }, true).map((day) => ({ ...day, outside: day.date < range.start || day.date > range.end }));
}

export function PlannerTimeline({ timeline, view, eventButton, openEditor, anchor, events, selectedDate, onSelectDate, onEvent, eventTypes = EVENT_TYPES, actions }) {
  if (view === 'month') {
    const selectedEvents = events.filter((event) => event.start <= selectedDate && event.end >= selectedDate);
    return <>
      <div className="academic-month-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div className="academic-month-weekday" key={day}>{day}</div>)}
        {monthCells(anchor, events).map(({ date, events: entries, outside }) => <div key={date} className={`academic-month-cell${outside ? ' is-outside' : ''}${entries.length ? ' has-events' : ''}${date === todayKey() ? ' is-today' : ''}${date === selectedDate ? ' is-selected' : ''}`}>
          <button className="academic-month-date" aria-label={`Select ${dayDate(date, { dateStyle: 'full' })}`} aria-pressed={date === selectedDate} onClick={() => onSelectDate(date)}><time dateTime={date}>{Number(date.slice(8))}</time>{entries.length > 1 && <span className="academic-month-count">{entries.length}</span>}</button>
          <div className="academic-month-chips">{entries.slice(0, 2).map((event) => <button key={event.id} className="academic-month-chip" style={{ '--event-color': eventTypes[event.type].color }} aria-label={`View ${event.title}`} title={event.title} onClick={() => { onSelectDate(date); onEvent(event); }}><i /><span>{event.title}</span></button>)}</div>
          {entries.length > 2 && <button className="academic-month-more" onClick={() => onSelectDate(date)}>+{entries.length - 2} more</button>}
        </div>)}
      </div>
      <section className="academic-selected-events" aria-live="polite"><div className="academic-selected-heading"><DateBadge date={selectedDate} /><h3>Events on {dayDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}</h3><button className="academic-planner-add-date" aria-label={`Add event on ${selectedDate}`} onClick={() => openEditor(null, selectedDate)}><Plus size={16} /></button></div><div className="academic-selected-cards">{selectedEvents.length ? selectedEvents.map((event) => <div key={event.id} className="academic-selected-card">{eventButton(event)}{actions?.(event)}</div>) : <p className="academic-planner-empty-day">No academic events scheduled for this date.</p>}</div></section>
    </>;
  }
  const selectedEvents = events.filter((event) => event.start <= selectedDate && event.end >= selectedDate);
  return <div className="academic-week-view">
    <div className="academic-week-days" aria-label="Select a day of the week">
      {timeline.map(({ date, events: entries }) => <button key={date} className={`academic-week-tile${entries.length ? " has-events" : ""}${date === selectedDate ? " is-selected" : ""}${date === todayKey() ? " is-today" : ""}`} aria-label={`${dayDate(date, { dateStyle: "full" })}, ${entries.length} events`} aria-pressed={date === selectedDate} onClick={() => onSelectDate(date)}>
        <span className="academic-week-day-name">{dayDate(date, { weekday: "short" })}</span><time dateTime={date}><strong>{Number(date.slice(8))}</strong><small>{dayDate(date, { month: "short" })}</small></time><span className="academic-week-count">{entries.length} {entries.length === 1 ? "event" : "events"}</span>
        <span className="academic-week-indicators">{entries.slice(0, 3).map((event) => <i key={event.id} style={{ background: eventTypes[event.type].color }} />)}{entries.length > 3 && <small>+{entries.length - 3}</small>}</span>
      </button>)}
    </div>
    <section className="academic-selected-events academic-week-selected" aria-live="polite"><div className="academic-selected-heading"><DateBadge date={selectedDate} /><h3>Events on {dayDate(selectedDate, { day: "numeric", month: "long", year: "numeric" })}</h3><button className="academic-planner-add-date" aria-label={`Add event on ${selectedDate}`} onClick={() => openEditor(null, selectedDate)}><Plus size={16} /></button></div><div className="academic-week-event-rows">{selectedEvents.length ? selectedEvents.map((event) => <div className="academic-selected-card" key={event.id}>{eventButton(event)}{actions?.(event)}</div>) : <p className="academic-planner-empty-day">No academic events scheduled for this date.</p>}</div></section>
  </div>;
}

export function PlannerAside({ filtered, upcoming, loading, busy, setDetail, viewAll, reset, eventTypes = EVENT_TYPES }) {
  return <aside className="academic-planner-side" aria-label="Upcoming events and categories">
    <section className="academic-planner-panel"><div className="academic-planner-panel-heading"><h2>Upcoming Events</h2><button onClick={viewAll}>View All</button></div>
      {loading ? <p role="status">Loading events…</p> : upcoming.length ? <div className="academic-planner-upcoming">{upcoming.slice(0, 5).map((event) => <button key={event.id} onClick={() => setDetail(event)} style={{ '--event-color': eventTypes[event.type].color }}><DateBadge date={event.start} /><span className="academic-planner-upcoming-copy"><strong><i />{event.title}</strong><span>{event.allDay ? 'All day' : [event.startTime, event.endTime].filter(Boolean).join(' – ')}</span><small>{eventTypes[event.type].label}</small></span></button>)}</div> : <p className="academic-planner-empty-day">No upcoming events</p>}
    </section>
    <section className="academic-planner-panel"><div className="academic-planner-panel-heading"><h2>Event Types</h2><span>{filtered.length} total</span></div><div className="academic-planner-categories">{Object.entries(eventTypes).map(([key, type]) => <div key={key}><i style={{ background: type.color }} /><span>{type.label}</span><strong>{filtered.filter((event) => event.type === key).length}</strong></div>)}</div></section>
    <div className="academic-planner-demo-note"><span>Demo events and custom types are saved in this browser.</span><button disabled={busy} onClick={reset}><RotateCcw size={13} />Reset Demo</button></div>
  </aside>;
}



const DEFAULT_FILTERS = { boardId: 'state', academicYearId: '2026', academicLevelId: '', groupId: '', programId: '', sectionId: '', type: '', status: '', search: '', from: '', to: '' };
const PAGE_SIZE = 5;
const displayDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const masterName = (key, id) => masters[key].find((r) => r.id === id)?.name || '';
function StatusBadge({ status }) { return <span className={`academic-calendar-status is-${status.toLowerCase()}`}>{status}</span>; }

export default function AcademicCalendarPage() {
  const [service] = useState(createAcademicCalendarService);
  const [events, setEvents] = useState([]);
  const [eventTypes, setEventTypes] = useState(() => service.getEventTypes());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters] = useState(DEFAULT_FILTERS);
  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(todayKey);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [detail, setDetail] = useState(null);
  const [editor, setEditor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [ascending, setAscending] = useState(true);
  const [listSearch, setListSearch] = useState('');
  const [sortKey, setSortKey] = useState('start');
  const mutationLock = useRef(false);

  useEffect(() => {
    let active = true;
    service.getCalendarEvents().then((data) => { if (active) setEvents(data); }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [service]);

  useEffect(() => {
    if (!detail && !confirmation) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape' || busy) return;
      setDetail(null); setConfirmation(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [detail, confirmation, busy]);
  const filtered = useMemo(() => filterEvents(events, filters), [events, filters]);
  const range = calendarRange(anchor, view);
  const periodEvents = filtered.filter((event) => event.start <= range.end && event.end >= range.start);
  // List view shows all filtered dates; month/week show their selected period.
  const upcoming = upcomingEvents(filtered);
  const visible = view === 'list' ? (upcomingOnly ? upcoming : filtered) : periodEvents;
  const timeline = plannerDays(periodEvents, range, true);
  const listEvents = visible.filter((event) => event.title.toLowerCase().includes(listSearch.trim().toLowerCase()));
  const sortValue = (event) => sortKey === 'type' ? eventTypes[event.type].label : sortKey === 'level' ? masterName('levels', event.academicLevelId) : sortKey === 'group' ? masterName('groups', event.groupId) : String(event[sortKey] || '');
  const sorted = [...listEvents].sort((a, b) => (sortValue(a).localeCompare(sortValue(b)) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title)) * (ascending ? 1 : -1));
  const exportEvents = view === "list" ? sorted : visible;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const periodLabel = view === 'list' ? (upcomingOnly ? 'Upcoming events' : 'All events') : view === 'week' ? `${displayDate(range.start)} – ${displayDate(range.end)}` : new Date(`${anchor}T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const yearName = masterName('years', filters.academicYearId) || 'All academic years';
  const selectDate = (date) => { setSelectedDate(date); setAnchor(date); };
  const move = (amount) => {
    if (view === 'week') selectDate(shiftDay(anchor, amount * 7));
    else { const date = new Date(`${anchor}T12:00:00`); date.setDate(1); date.setMonth(date.getMonth() + amount); selectDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`); }
  };
  const openEditor = (event = null, date = '') => {
    setDetail(null);
    setEditor({ event, defaults: { boardId: filters.boardId || 'state', academicYearId: filters.academicYearId || '2026', academicLevelId: filters.academicLevelId, groupId: filters.groupId, programId: filters.programId, sectionId: filters.sectionId, ...(filters.type ? { type: filters.type } : {}), ...(date ? { start: date, end: date } : {}) } });
  };
  const refresh = async () => { setEvents(await service.getCalendarEvents()); setEventTypes(service.getEventTypes()); };
  const saveEvent = async (payload, id) => {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true);
    try {
      if (id) await service.updateCalendarEvent(id, payload); else await service.createCalendarEvent(payload);
      await refresh(); setEditor(null); setPage(1); selectDate(payload.start);
      setToast({ message: `Demo event ${id ? 'updated' : 'created'} as ${payload.status.toLowerCase()}.` });
    } finally { mutationLock.current = false; setBusy(false); }
  };
  const mutate = async (operation, message) => {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true);
    try { await operation(); await refresh(); setDetail(null); setConfirmation(null); setToast({ message }); }
    catch (err) { setToast({ message: err.message, type: 'error' }); }
    finally { mutationLock.current = false; setBusy(false); }
  };
  const confirmDelete = (event) => { setDetail(null); setConfirmation({ event }); };
  const exportFile = async (format) => {
    if (exporting) return;
    setExporting(true);
    try {
      const exportRows = exportEvents.map((e) => ({ Event: e.title, Type: eventTypes[e.type].label, 'Start Date': e.start, 'End Date': e.end, 'Start Time': e.allDay ? 'All day' : e.startTime, 'End Time': e.endTime, 'Academic Year': masterName('years', e.academicYearId), 'Academic Level': masterName('levels', e.academicLevelId) || 'All', Group: masterName('groups', e.groupId) || 'All', Programme: masterName('programs', e.programId) || 'All', Section: masterName('sections', e.sectionId) || 'All', Location: e.location, Status: e.status }));
      if (format === 'excel') {
        const XLSX = await import('xlsx');
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.aoa_to_sheet([['Pirnav College — Academic Calendar (Demo)'], [yearName, periodLabel], []]);
        XLSX.utils.sheet_add_json(sheet, exportRows, { origin: 'A4' });
        XLSX.utils.book_append_sheet(workbook, sheet, 'Academic Calendar');
        XLSX.writeFile(workbook, 'Pirnav_Academic_Calendar_Demo.xlsx');
      } else {
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
        const pdf = new jsPDF({ orientation: 'landscape' });
        pdf.setFontSize(16); pdf.text('Pirnav College | Academic Calendar (Demo)', 14, 16);
        pdf.setFontSize(10); pdf.text(`${yearName.replace('–', '-')} | ${periodLabel.replaceAll('–', '-')}`, 14, 24);
        autoTable(pdf, { startY: 30, head: [['Event', 'Type', 'Dates', 'Time', 'Level / Group', 'Programme / Section', 'Status']], body: exportEvents.map((e) => [e.title.replaceAll('–', '-'), eventTypes[e.type].label.replaceAll('–', '-'), `${e.start}\n${e.end}`, e.allDay ? 'All day' : `${e.startTime} - ${e.endTime}`, `${masterName('levels', e.academicLevelId) || 'All'} / ${masterName('groups', e.groupId) || 'All'}`, `${masterName('programs', e.programId) || 'All'} / ${masterName('sections', e.sectionId) || 'All'}`, e.status]), headStyles: { fillColor: [100, 124, 24] }, styles: { fontSize: 8 } });
        pdf.save('Pirnav_Academic_Calendar_Demo.pdf');
      }
    } catch (err) { setToast({ message: `Export failed: ${err.message}`, type: 'error' }); }
    finally { setExporting(false); }
  };
  const eventButton = (event) => <button key={event.id} className={`academic-planner-event is-${event.status.toLowerCase()}`} style={{ '--event-color': eventTypes[event.type].color }} onClick={() => setDetail(event)}><span className="academic-planner-event-title">{event.title}</span><span className="academic-planner-event-meta"><span className="academic-planner-category"><i />{eventTypes[event.type].label}</span><span><Clock3 size={13} />{event.allDay ? 'All day' : [event.startTime, event.endTime].filter(Boolean).join(' – ')}</span></span><StatusBadge status={event.status} /></button>;
  const actions = (event) => <div className="academic-calendar-row-actions"><button aria-label={`View ${event.title}`} title="View" onClick={() => setDetail(event)}><Eye size={15} /></button><button aria-label={`Edit ${event.title}`} title="Edit" onClick={() => openEditor(event)}><Pencil size={15} /></button><button aria-label={`Delete ${event.title}`} title="Delete" onClick={() => confirmDelete(event)}><Trash2 size={15} /></button></div>;

  return <DashboardLayout title="Academic Calendar" subtitle="Manage academic schedules, examinations, holidays, and college events.">
    <div className="academic-calendar">
      <PlannerHeader filtered={filtered} upcoming={upcoming} loading={loading} busy={busy} exporting={exporting} visible={visible} yearName={yearName} selectedDate={selectedDate} openEditor={openEditor} exportFile={exportFile} />
      <div className="academic-planner-layout">
      <section className="academic-planner-main" aria-label="Academic event planner">
      <PlannerNavigation view={view} periodLabel={periodLabel} move={move} today={() => selectDate(todayKey())} changeView={(mode) => { setView(mode); setUpcomingOnly(false); setPage(1); }} />
      <div className="academic-calendar-print-heading"><h1>Pirnav College — Academic Calendar (Demo)</h1><p>{yearName} | {periodLabel}</p></div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading demo events…</p> : <>
        {!visible.length && <p role="status">No events scheduled for this period.</p>}
        {view === 'list' ? <>
          <div className="academic-calendar-list-toolbar"><label className="academic-calendar-list-search"><span>Search events</span><input type="search" value={listSearch} placeholder="Search event name?" onChange={(event) => { setListSearch(event.target.value); setPage(1); }} /></label><span>{listEvents.length} events</span></div>
          <div className="academic-calendar-table-wrap"><table className="cms-table academic-calendar-table"><thead><tr>{[['title', 'Event Name'], ['type', 'Event Type'], ['start', 'Start Date'], ['end', 'End Date'], ['level', 'Academic Level'], ['group', 'Group'], ['status', 'Status']].map(([key, label]) => <th key={key} aria-sort={sortKey === key ? (ascending ? 'ascending' : 'descending') : 'none'}><button onClick={() => { setSortKey(key); setAscending(sortKey === key ? !ascending : true); setPage(1); }}>{label}{sortKey === key ? (ascending ? ' ?' : ' ?') : ''}</button></th>)}<th>Actions</th></tr></thead><tbody>{sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((event) => <tr key={event.id}><td data-label="Event Name"><button className="academic-calendar-title-button" onClick={() => setDetail(event)}>{event.title}</button></td><td data-label="Event Type"><span className="academic-list-category" style={{ '--event-color': eventTypes[event.type].color }}><i aria-hidden="true"/>{eventTypes[event.type].label}</span></td><td data-label="Start Date">{displayDate(event.start)}</td><td data-label="End Date">{displayDate(event.end)}</td><td data-label="Academic Level">{masterName('levels', event.academicLevelId) || 'All'}</td><td data-label="Group">{masterName('groups', event.groupId) || 'All'}</td><td data-label="Status"><StatusBadge status={event.status} /></td><td data-label="Actions">{actions(event)}</td></tr>)}{!sorted.length && <tr><td colSpan={8}>No events match your search.</td></tr>}</tbody></table></div>
          <footer className="academic-calendar-pagination"><span>Showing {sorted.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length} events</span><div className="academic-calendar-pagination-actions"><button className="cms-btn cms-btn-ghost" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pages}</span><button className="cms-btn cms-btn-ghost" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></footer>
          <div className="academic-calendar-print-list">{exportEvents.map((event) => <p key={event.id}>{event.start} – {event.end} | {event.title} | {event.status}</p>)}</div>
        </> : <PlannerTimeline timeline={timeline} view={view} eventButton={eventButton} openEditor={openEditor} anchor={anchor} events={filtered} selectedDate={selectedDate} onSelectDate={selectDate} onEvent={setDetail} eventTypes={eventTypes} actions={actions} />}
      </>}
      </section>
      <PlannerAside filtered={filtered} upcoming={upcoming} loading={loading} busy={busy} setDetail={setDetail} viewAll={() => { setView("list"); setUpcomingOnly(true); setPage(1); }} reset={() => setConfirmation({ reset: true })} eventTypes={eventTypes} />
      </div>
      {detail && <Modal className="academic-calendar-modal" title={detail.title} onClose={() => setDetail(null)} footer={<>
        <button className="cms-btn cms-btn-ghost" onClick={() => setDetail(null)}>Close</button><button className="cms-btn cms-btn-ghost" disabled={busy} onClick={() => openEditor(detail)}>Edit</button>
        <button className="cms-btn cms-btn-danger" disabled={busy} onClick={() => confirmDelete(detail)}>Delete</button>
        {detail.status !== 'Published' && <button className="cms-btn cms-btn-primary" disabled={busy} onClick={() => mutate(() => service.publishCalendarEvent(detail.id), 'Demo event published.')}>Publish Event</button>}
        {detail.status !== 'Cancelled' && <button className="cms-btn cms-btn-ghost" disabled={busy} onClick={() => mutate(() => service.cancelCalendarEvent(detail.id), 'Demo event cancelled.')}>Cancel Event</button>}
      </>}><dl className="academic-calendar-details">{[
        ['Event Type', eventTypes[detail.type].label], ['Status', detail.status], ['Description', detail.description || detail.reason], ['Remarks', detail.remarks], ['Start Date', displayDate(detail.start)], ['End Date', displayDate(detail.end)], ['Time', detail.allDay ? 'All day' : `${detail.startTime} – ${detail.endTime}`], ['Board', masterName('boards', detail.boardId)], ['Academic Year', masterName('years', detail.academicYearId)], ['Academic Level', masterName('levels', detail.academicLevelId)], ['Group', masterName('groups', detail.groupId)], ['Programme', masterName('programs', detail.programId)], ['Section', masterName('sections', detail.sectionId)], ['Location', detail.location],
      ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Status' ? <StatusBadge status={value} /> : value}</dd></div>)}</dl></Modal>}
      {editor && <AcademicCalendarEventForm event={editor.event} defaults={editor.defaults} onClose={() => setEditor(null)} onSave={saveEvent} eventTypes={eventTypes} />}
      {confirmation && <ConfirmDialog title={confirmation.reset ? 'Reset demo calendar?' : 'Delete demo event?'} message={confirmation.reset ? 'All demo changes will be discarded and the original sample events and event types restored.' : `Delete “${confirmation.event.title}” from this demo?`} onCancel={() => !busy && setConfirmation(null)} loading={busy} confirmLabel={confirmation.reset ? 'Reset Demo' : 'Delete Event'} danger onConfirm={() => confirmation.reset ? mutate(() => service.resetCalendarEvents(), 'Original demo events restored.') : mutate(() => service.deleteCalendarEvent(confirmation.event.id), 'Demo event deleted.')} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  </DashboardLayout>;
}
