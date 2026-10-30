import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Printer, Download, Eye, Pencil, Trash2, RotateCcw, CalendarDays, Clock3, FileText, Sun } from 'lucide-react';
import DashboardLayout from '@/shared/layouts/DashboardLayout/DashboardLayout.jsx';
import { Modal, ConfirmDialog, Toast, Skeleton, SkeletonCard, SkeletonTable } from '@/shared/components/Ui.jsx';
import apiClient, { getApiErrorMessage } from '@/api/axios.js';
import { apiEndpoints } from '@/api/apiEndpoints.js';
import { useAcademicContext } from '@/context/AcademicContext.jsx';
import { useCampusContext } from '@/context/CampusContext.jsx';
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
    data = data.data ?? data.Data ?? data.items ?? data.Items ?? data.records ?? data.results ?? data.schedules ?? data.examinationSchedules ?? data.$values;
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
  const type = source === 'holidays' ? 'holidays' : /practical/i.test(`${r.examCategory || ''} ${r.examMode || ''} ${r.examTypeName || ''} ${r.examType || ''}`) ? 'practical' : 'examinations';
  const parentId = fallback.examinationId ?? fallback.examId ?? fallback.id;
  const recordId = source === 'holidays' ? r.holidayId ?? r.id : record.examScheduleId ?? record.scheduleId ?? record.examinationScheduleId ?? record.id;
  const subject = source === 'examinations' ? record.subjectName || record.patternName : '';
  const identity = recordId ?? [start, end, title, subject, r.startTime, r.endTime, JSON.stringify(scope)].join('|');
  return { ...r, ...scope, allDay: source === 'holidays', startTime: String(r.startTime || '').slice(0, 5), endTime: String(r.endTime || '').slice(0, 5), status: r.status || fallback.status || 'Scheduled', examinationId: source === 'examinations' ? parentId : undefined, examScheduleId: source === 'examinations' ? recordId : undefined, holidayId: source === 'holidays' ? recordId : undefined, location: r.location || r.hall || '', id: `${source}:${parentId ?? ''}:${identity ?? index}`, title: `${title}${subject ? ` · ${subject}` : ''}`, type, start, end, source };
}
export function holidayEvents(records) {
  return records.filter((r) => !/^(inactive|cancelled|deleted)$/i.test(r.status || '')).map((r, i) => event(r, {}, 'holidays', i)).filter(Boolean);
}
export function examEvents(exam, schedules) {
  if (/^(draft|cancelled|deleted)$/i.test(exam.status || '')) return [];
  return schedules.filter((r) => r.isActive !== false && !/^(draft|cancelled|deleted)$/i.test(r.status || '')).map((r, i) => event(r, exam, 'examinations', i)).filter(Boolean);
}
// Cross-module duplicates require explicit source identifiers, never just matching titles.
export function uniqueEvents(events) {
  const external = events.filter((e) => e.source && e.source !== 'calendar');
  const linked = (e) => external.some((other) =>
    (e.holidayId != null && String(e.holidayId) === String(other.holidayId)) ||
    (e.examScheduleId != null && String(e.examScheduleId) === String(other.examScheduleId) && String(e.examinationId) === String(other.examinationId)));
  return [...new Map(events.filter((e) => e.source !== 'calendar' || !linked(e)).map((e) => [e.source + ':' + e.id, e])).values()]
    .sort((a, b) => a.start.localeCompare(b.start) || String(a.startTime || '').localeCompare(String(b.startTime || '')) || a.title.localeCompare(b.title));
}
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
export const upcomingEvents = (events, today = todayKey()) => events.filter((event) => event.end >= today && !/^(draft|cancelled|inactive|deleted)$/i.test(event.status)).sort((a, b) => a.start.localeCompare(b.start) || String(a.startTime || '').localeCompare(String(b.startTime || '')));



export const CALENDAR_STATUSES = ['Draft', 'Published', 'Cancelled'];

export function validateCalendarEvent(payload, eventTypes = EVENT_TYPES, masters = { years: [], boards: [], levels: [], groups: [], programs: [], sections: [] }) {
  const errors = {};
  Object.keys(scopeFields).forEach((key) => { if (payload[key] && (!Number.isInteger(Number(payload[key])) || Number(payload[key]) <= 0 || Number(payload[key]) > 2147483647)) errors[key] = 'Select a valid academic ID.'; });
  if (!String(payload.title || '').trim()) errors.title = 'Event title is required.';
  else if (payload.title.trim().length > 200) errors.title = 'Use no more than 200 characters.';
  if (String(payload.location || '').length > 200) errors.location = 'Use no more than 200 characters.';
  if (String(payload.type === 'other' ? payload.customType || '' : eventTypes[payload.type]?.label || payload.type || '').trim().length > 50) errors.type = 'Event type must be no more than 50 characters.';
  if (payload.type === 'other') {
    if (!String(payload.customType || '').trim()) errors.customType = 'Enter an event type.';
  } else if (!Object.hasOwn(eventTypes, payload.type)) errors.type = 'Select an event type.';
  if (!Number.isInteger(Number(payload.academicYearId)) || Number(payload.academicYearId) <= 0) errors.academicYearId = 'Select an academic year.';
  if (!dateKey(payload.start)) errors.start = 'A valid start date is required.';
  if (!dateKey(payload.end)) errors.end = 'A valid end date is required.';
  if (dateKey(payload.start) && dateKey(payload.end) && payload.end < payload.start) errors.end = 'End date cannot be before start date.';
  if (!payload.allDay) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.startTime || '')) errors.startTime = 'Enter a valid start time.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.endTime || '')) errors.endTime = 'Enter a valid end time.';
    if (payload.start === payload.end && payload.endTime < payload.startTime) errors.endTime = 'End time cannot be before start time.';
  }
  if (!Number.isInteger(Number(payload.boardId)) || Number(payload.boardId) <= 0) errors.boardId = 'Select a board.';
  if (payload.academicLevelId && !masters.levels.some((r) => r.id === payload.academicLevelId && (!r.boardId || r.boardId === payload.boardId))) errors.academicLevelId = 'Academic level must belong to the selected board.';
  if (payload.groupId && (!payload.academicLevelId || !masters.groups.some((r) => r.id === payload.groupId && r.boardId === payload.boardId && (!r.academicYearId || r.academicYearId === payload.academicYearId)))) errors.groupId = 'Select an eligible group for the selected board and academic year.';
  if (payload.programId && !masters.programs.some((r) => r.id === payload.programId && r.groupId === payload.groupId)) errors.programId = 'Programme must belong to the selected group.';
  if (payload.sectionId && !masters.sections.some((r) => r.id === payload.sectionId && r.programId === payload.programId)) errors.sectionId = 'Section must belong to the selected programme.';
  if (!CALENDAR_STATUSES.includes(payload.status)) errors.status = 'Select a valid status.';
  return errors;
}

const CUSTOM_TYPE_COLOR = '#64748b';
const unpackCalendar = (response) => {
  const data = response?.data ?? response;
  if (data?.success === false) throw new Error(data.message || 'Calendar request failed.');
  return data?.data ?? data;
};
const typeKey = (label) => Object.keys(EVENT_TYPES).find((key) => key === label || EVENT_TYPES[key].label.toLowerCase() === String(label).toLowerCase()) || String(label || 'Other');
export function normalizeCalendarEvent(record) {
  const row = Object.fromEntries(Object.entries(record).map(([key, value]) => [key[0].toLowerCase() + key.slice(1), value]));
  const start = dateKey(row.startDate), end = dateKey(row.endDate) || start;
  const id = row.id ?? row.eventId ?? row.academicCalendarEventId ?? row.calendarEventId;
  if (id == null || !start || !end || end < start || !row.title) throw new Error('The server returned an invalid calendar event.');
  return { ...row, source: 'calendar', id, title: row.title, start, end, type: typeKey(row.eventType), apiEventType: row.eventType,
    allDay: row.isAllDay === true, startTime: String(row.startTime || '').slice(0, 5), endTime: String(row.endTime || '').slice(0, 5),
    status: CALENDAR_STATUSES.find((status) => status.toLowerCase() === String(row.status).toLowerCase()) || 'Draft',
    ...Object.fromEntries(Object.keys(scopeFields).map((key) => [key, row[key] == null ? '' : String(row[key])])) };
}
export function calendarEventPayload(values, types = EVENT_TYPES) {
  return { title: values.title.trim(), eventType: values.type === 'other' ? values.customType.trim() : values.apiEventType || types[values.type]?.label || values.type,
    description: values.description || null, startDate: values.start + 'T00:00:00', endDate: values.end + 'T00:00:00',
    isAllDay: Boolean(values.allDay), startTime: values.allDay ? null : values.startTime, endTime: values.allDay ? null : values.endTime,
    status: values.status, location: values.location || null,
    ...Object.fromEntries(Object.keys(scopeFields).map((key) => [key, values[key] ? Number(values[key]) : null])) };
}
export function createAcademicCalendarService() {
  const endpoints = apiEndpoints.academicCalendar;
  return {
    async getCalendarEvents(params = {}, signal) {
      const events = [];
      let previousLastId = null;
      const maxPages = params.Page ? 1 : 20;
      for (let page = params.Page || 1; page <= maxPages; page++) {
        const response = await apiClient.get(endpoints.list, { params: { ...params, Page: page, PageSize: params.PageSize || 100 }, signal });
        const data = response.data;
        const batch = rowsOf(data);
        if (!batch.length) break;
        const lastId = batch[batch.length - 1]?.eventId ?? batch[batch.length - 1]?.id;
        if (lastId && lastId === previousLastId) break;
        previousLastId = lastId;
        events.push(...batch.map(normalizeCalendarEvent));
        const totalPages = Number(data.totalPages ?? data.data?.totalPages);
        if (totalPages > 0 ? page >= totalPages : batch.length < (params.PageSize || 100)) break;
        if (params.Page) break;
      }
      return uniqueEvents(events);
    },
    async getHolidays(params, signal) {
      const records = [];
      let previousLastId = null;
      for (let page = 1; page <= 20; page++) {
        const { data } = await apiClient.get(apiEndpoints.holidays.list, { params: { ...params, Page: page, PageSize: 100 }, signal });
        const batch = rowsOf(data);
        if (!batch.length) break;
        const lastId = batch[batch.length - 1]?.holidayId ?? batch[batch.length - 1]?.id;
        if (lastId && lastId === previousLastId) break;
        previousLastId = lastId;
        records.push(...batch);
        const pages = Number(data.totalPages);
        if (pages > 0 ? page >= pages : batch.length < 100) break;
      }
      return holidayEvents(records);
    },
    async getExaminations(params, signal) {
      const exams = [...new Map(rowsOf((await apiClient.get(apiEndpoints.examinations.list, { params, signal })).data)
        .filter((exam) => !/^(draft|cancelled|deleted)$/i.test(exam.status || ''))
        .map((exam) => [exam.examinationId ?? exam.examId, exam])).values()];
      const events = [], errors = []; let next = 0;
      // One schedule request per examination per refresh, with bounded concurrency.
      await Promise.all(Array.from({ length: Math.min(4, exams.length) }, async () => {
        while (next < exams.length && !signal.aborted) {
          const exam = exams[next++];
          try {
            const schedules = rowsOf((await apiClient.get(apiEndpoints.examinations.schedules(exam.examinationId ?? exam.examId), { signal })).data);
            events.push(...examEvents(exam, schedules));
          } catch (error) { if (!signal.aborted) errors.push(exam.examName + ': ' + getApiErrorMessage(error)); }
        }
      }));
      return { events, errors };
    },
    async getRange(params, signal) { return rowsOf((await apiClient.get(endpoints.range, { params, signal })).data).map(normalizeCalendarEvent); },
    async getMetrics(params, signal) { return unpackCalendar(await apiClient.get(endpoints.metrics, { params, signal })); },
    async getUpcoming(params, signal) { return rowsOf((await apiClient.get(endpoints.upcoming, { params: { ...params, count: 5 }, signal })).data).map(normalizeCalendarEvent); },
    async getEvent(id) { return normalizeCalendarEvent(unpackCalendar(await apiClient.get(endpoints.byId(id)))); },
    async createCalendarEvent(payload) { return unpackCalendar(await apiClient.post(endpoints.create, payload)); },
    async updateCalendarEvent(id, payload) { return unpackCalendar(await apiClient.put(endpoints.byId(id), payload)); },
    async deleteCalendarEvent(id) { return unpackCalendar(await apiClient.delete(endpoints.byId(id))); },
    async publishCalendarEvent(id) { return unpackCalendar(await apiClient.post(endpoints.publish(id))); },
  };
}

export function normalizeCalendarMaster(record, kind, inherited = {}) {
  const row = Object.fromEntries(Object.entries(record).map(([key, value]) => [key[0].toLowerCase() + key.slice(1), value]));
  return { ...inherited, ...row, id: String(row[kind + 'Id'] ?? row.id ?? ''),
    name: row[kind + 'Name'] || row.levelName || row.programmeName || row.yearName || row.name || '',
    ...Object.fromEntries(['campusId', 'boardId', 'academicYearId', 'academicLevelId', 'groupId', 'programId'].map((key) => [key, String(row[key] ?? inherited[key] ?? '')])) };
}
export async function loadCalendarMasters(scope, signal) {
  const empty = { levels: [], groups: [], programs: [], sections: [] };
  if (!scope.boardId || !scope.academicYearId) return empty;
  const params = { boardId: scope.boardId, academicYearId: scope.academicYearId, isActive: true };
  const [levels, groups, sections] = await Promise.all([
    apiClient.get(apiEndpoints.boards.academicLevels, { params: { boardId: scope.boardId }, signal }),
    apiClient.get(apiEndpoints.groups.list, { params, signal }),
    apiClient.get(apiEndpoints.sections.list, { params: { ...params, campusId: scope.campusId || undefined }, signal }),
  ]);
  const active = (row) => row.isActive !== false && !/^(inactive|deleted)$/i.test(String(row.status || ''));
  const groupRows = rowsOf(groups.data).map((row) => normalizeCalendarMaster(row, 'group')).filter((row) => active(row) && matchesScope(row, scope));
  const programs = await Promise.all(groupRows.map(async (group) => rowsOf((await apiClient.get(apiEndpoints.groups.programs(group.id), { signal })).data)
    .map((row) => normalizeCalendarMaster(row, 'program', { groupId: group.id, boardId: group.boardId, academicYearId: group.academicYearId, academicLevelId: group.academicLevelId })).filter(active)));
  return { levels: rowsOf(levels.data).map((row) => normalizeCalendarMaster(row, 'academicLevel', { boardId: scope.boardId })),
    groups: groupRows, programs: programs.flat(), sections: rowsOf(sections.data).map((row) => normalizeCalendarMaster(row, 'section')).filter((row) => active(row) && matchesScope(row, scope)) };
}

function AcademicCalendarEventForm({ event, defaults, onClose, onSave, eventTypes, masters: baseMasters }) {
  const [values, setValues] = useState(() => event || { title: '', type: '', description: '', start: todayKey(), end: todayKey(), startTime: '09:00', endTime: '10:00', allDay: true, boardId: '', academicYearId: '', academicLevelId: '', groupId: '', programId: '', sectionId: '', location: '', status: 'Draft', ...defaults });
  const [lookups, setLookups] = useState({ levels: [], groups: [], programs: [], sections: [] });
  const [years, setYears] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState('');
  const [yearsLoading, setYearsLoading] = useState(true);
  const [yearsError, setYearsError] = useState('');
  const masters = { ...baseMasters, ...lookups, years };
  useEffect(() => {
    let active = true; const request = new AbortController();
    setYears([]); setYearsLoading(true); setYearsError('');
    // The active-years endpoint has no Board query parameter; filter its returned scope.
    apiClient.get(apiEndpoints.academicYears.active, { signal: request.signal }).then((response) => {
      if (!active) return;
      setYears(rowsOf(response.data).map((row) => normalizeCalendarMaster(row, 'academicYear')).filter((row) => !row.boardId || row.boardId === values.boardId));
    }).catch((error) => { if (active) setYearsError(getApiErrorMessage(error)); }).finally(() => { if (active) setYearsLoading(false); });
    return () => { active = false; request.abort(); };
  }, [values.boardId]);
  useEffect(() => {
    let active = true; const request = new AbortController();
    setLookups({ levels: [], groups: [], programs: [], sections: [] }); setLookupLoading(true); setLookupError('');
    loadCalendarMasters({ campusId: values.campusId, boardId: values.boardId, academicYearId: values.academicYearId }, request.signal)
      .then((data) => { if (active) setLookups(data); })
      .catch((error) => { if (active) setLookupError(getApiErrorMessage(error)); })
      .finally(() => { if (active) setLookupLoading(false); });
    return () => { active = false; request.abort(); };
  }, [values.campusId, values.boardId, values.academicYearId]);
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
      ...(key === 'type' ? { apiEventType: undefined } : {}),
      ...(key === 'boardId' ? { academicYearId: '', academicLevelId: '', groupId: '', programId: '', sectionId: '' } : {}),
      ...(key === 'academicYearId' ? { academicLevelId: '', groupId: '', programId: '', sectionId: '' } : {}),
      ...(key === 'academicLevelId' ? { groupId: '', programId: '', sectionId: '' } : {}),
      ...(key === 'groupId' ? { programId: '', sectionId: '' } : {}), ...(key === 'programId' ? { sectionId: '' } : {}),
    }));
    setErrors({});
  };
  const save = async (status) => {
    if (pending.current || lookupLoading || yearsLoading || lookupError || yearsError) return;
    const payload = { ...values, status };
    const nextErrors = validateCalendarEvent(payload, eventTypes, masters);
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
  return <Modal className="academic-calendar-modal" title={event ? 'Edit Event' : 'Add Event'} onClose={saving ? () => {} : onClose} closeOnOverlay={!saving} footer={<>
    <button className="cms-btn cms-btn-ghost" disabled={saving} onClick={onClose}>Cancel</button>
    <button className="cms-btn cms-btn-ghost" disabled={saving || lookupLoading || yearsLoading || Boolean(lookupError || yearsError)} onClick={() => save('Draft')}>Save as Draft</button>
    {event && <button className="cms-btn cms-btn-ghost" disabled={saving || lookupLoading || yearsLoading || Boolean(lookupError || yearsError)} onClick={() => save(values.status)}>Save Changes</button>}
    <button className="cms-btn cms-btn-primary" disabled={saving || lookupLoading || yearsLoading || Boolean(lookupError || yearsError)} onClick={() => save('Published')}>{saving ? 'Saving…' : 'Publish Event'}</button>
  </>}>
    <p className="academic-calendar-note">Events are saved to the academic calendar. Publishing sends notifications to the selected audience.</p>
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
      {select('academicYearId', 'Academic Year *', masters.years, yearsLoading || !values.boardId, 'Select academic year')}
      {select('academicLevelId', 'Academic Level', masters.levels.filter((r) => !r.boardId || r.boardId === values.boardId), lookupLoading || !values.boardId || !values.academicYearId)}
      {select('groupId', 'Group', masters.groups.filter((r) => r.boardId === values.boardId), lookupLoading || !values.academicLevelId)}
      {select('programId', 'Programme', masters.programs.filter((r) => r.groupId === values.groupId), lookupLoading || !values.groupId)}
      {select('sectionId', 'Section', masters.sections.filter((r) => r.programId === values.programId && r.groupId === values.groupId && r.academicLevelId === values.academicLevelId), lookupLoading || !values.programId)}
      {field('location', 'Location')}
      {(lookupLoading || yearsLoading) && <div className="is-wide"><Skeleton style={{ width: '100%', height: 36 }} ariaLabel="Loading academic options" /></div>}
      {(lookupError || yearsError) && <p role="alert" className="cms-error is-wide">{lookupError || yearsError}</p>}
      {errors.form && <p role="alert" className="cms-error is-wide">{errors.form}</p>}
    </form>
  </Modal>;
}



const dayDate = (date, options) => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', options);
function DateBadge({ date }) {
  return <span className="academic-planner-date-badge"><strong>{Number(date.slice(8))}</strong><span>{dayDate(date, { month: 'short' })}</span></span>;
}

// Print in a separate document so other modules' global print rules cannot hide the calendar.
export function calendarPrintDocument({ events, title, subtitle, eventTypes, masterName }) {
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const rows = events.map((event) => '<tr>' + [event.title, eventTypes[event.type]?.label || event.type, event.start + (event.end !== event.start ? ' - ' + event.end : ''), event.allDay ? 'All day' : [event.startTime, event.endTime].filter(Boolean).join(' - '), masterName('levels', event.academicLevelId) || event.academicLevelName || 'All', masterName('groups', event.groupId) || event.groupName || 'All', masterName('programs', event.programId) || event.programName || 'All', masterName('sections', event.sectionId) || event.sectionName || 'All', event.status].map((value) => '<td>' + escape(value) + '</td>').join('') + '</tr>').join('');
  return '<!doctype html><html><head><meta charset="utf-8"><title>Academic Calendar</title><style>' +
    '@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;font:11px Arial,sans-serif;color:#182646;background:white}h1{font-size:20px;margin:0 0 6px}p{margin:0 0 14px}.month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid #cbd5c1;border-left:1px solid #cbd5c1;margin-bottom:16px}.weekday,.day{border-right:1px solid #cbd5c1;border-bottom:1px solid #cbd5c1;padding:6px}.weekday{background:#edf3de;text-align:center;font-weight:bold}.day{min-height:65px;break-inside:avoid}.outside{color:#7b8490}.chip{margin-top:4px;padding:3px;background:#eef4fd;border-left:2px solid #647c18;overflow-wrap:anywhere;font-size:9px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #ccd3c3;padding:6px;text-align:left;overflow-wrap:anywhere}th{background:#edf3de}thead{display:table-header-group}tr{break-inside:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '</style></head><body><h1>' + escape(title) + '</h1><p>' + escape(subtitle) + '</p><table><thead><tr>' + ['Event', 'Type', 'Dates', 'Time', 'Academic Level', 'Group', 'Programme', 'Section', 'Status'].map((label) => '<th>' + label + '</th>').join('') + '</tr></thead><tbody>' + (rows || '<tr><td colspan="9">No events scheduled for this period.</td></tr>') + '</tbody></table></body></html>';
}

function CalendarLoadingSkeleton({ view }) {
  if (view === 'list') return <SkeletonTable columns={8} rows={5} />;
  return <div className="academic-month-grid" role="status" aria-label="Loading calendar">
    {Array.from({ length: 7 }, (_, index) => <div className="academic-month-weekday" key={'heading-' + index}><Skeleton style={{ width: '50%', margin: '0 auto' }} /></div>)}
    {Array.from({ length: view === 'week' ? 7 : 35 }, (_, index) => <div className="academic-month-cell" key={index} aria-hidden="true">
      <Skeleton style={{ width: 22, height: 14, marginBottom: 16 }} />
      <Skeleton style={{ width: '85%', height: 14, marginBottom: 8 }} />
      <Skeleton style={{ width: '65%', height: 14 }} />
    </div>)}
  </div>;
}

export function PlannerHeader({ filtered, upcoming, loading, busy, exporting, visible, yearName, openEditor, exportFile, selectedDate, metrics, onPrint }) {
  return <>
    <div className="academic-planner-topline"><span className="academic-planner-context-label">Academic planner · {yearName}</span><div className="academic-planner-actions"><button className="cms-btn cms-btn-primary" disabled={busy || loading} onClick={() => openEditor(null, selectedDate)}><Plus size={17} />Add Event</button><button className="cms-btn cms-btn-ghost" disabled={loading} onClick={onPrint}><Printer size={16} />Print</button><button className="cms-btn cms-btn-ghost" disabled={loading || exporting || !visible.length} onClick={() => exportFile('pdf')}><Download size={16} />PDF</button><button className="cms-btn cms-btn-ghost" disabled={loading || exporting || !visible.length} onClick={() => exportFile('excel')}><Download size={16} />Excel</button></div></div>
    <div className="academic-calendar-summary">{[
      ['Total Events', metrics?.totalEvents ?? metrics?.totalCount ?? metrics?.total ?? filtered.length, CalendarDays, 'green'], ['Upcoming Events', metrics?.upcomingEvents ?? metrics?.upcomingCount ?? metrics?.upcoming ?? upcomingEvents(filtered).length, Clock3, 'amber'], ['Examinations', metrics?.examinations ?? metrics?.examinationsCount ?? metrics?.examsCount ?? metrics?.exams ?? filtered.filter((event) => ['examinations', 'practical'].includes(event.type)).length, FileText, 'blue'], ['Holidays', metrics?.holidays ?? metrics?.holidaysCount ?? filtered.filter((event) => event.type === 'holidays').length, Sun, 'red'],
    ].map(([label, count, Icon, color]) => <div key={label}><span className={`academic-planner-summary-icon is-${color}`}><Icon size={24} /></span><div><span>{label}</span><strong>{loading ? <Skeleton style={{ width: 48, height: 28 }} /> : count}</strong></div><span className="academic-summary-bars" aria-hidden="true"><i/><i/><i/><i/><i/></span></div>)}</div>
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

export function PlannerAside({ filtered, upcoming, loading, busy, setDetail, viewAll, reset, eventTypes = EVENT_TYPES, metrics }) {
  return <aside className="academic-planner-side" aria-label="Upcoming events and categories">
    <section className="academic-planner-panel"><div className="academic-planner-panel-heading"><h2>Upcoming Events</h2><button onClick={viewAll}>View All</button></div>
      {loading ? <div aria-label="Loading upcoming events">{Array.from({ length: 5 }, (_, index) => <SkeletonCard key={index} lines={2} />)}</div> : upcoming.length ? <div className="academic-planner-upcoming">{upcoming.slice(0, 5).map((event) => <button key={event.id} onClick={() => setDetail(event)} style={{ '--event-color': eventTypes[event.type].color }}><DateBadge date={event.start} /><span className="academic-planner-upcoming-copy"><strong><i />{event.title}</strong><span>{event.allDay ? 'All day' : [event.startTime, event.endTime].filter(Boolean).join(' – ')}</span><small>{eventTypes[event.type].label}</small></span></button>)}</div> : <p className="academic-planner-empty-day">No upcoming events</p>}
    </section>
    <section className="academic-planner-panel"><div className="academic-planner-panel-heading"><h2>Event Types</h2><span>{loading ? <Skeleton style={{ width: 40 }} /> : <>{metrics?.totalEvents ?? metrics?.total ?? filtered.length} total</>}</span></div><div className="academic-planner-categories" tabIndex={0} role="region" aria-label="Event types">{Object.entries(eventTypes).map(([key, type]) => <div key={key}><i style={{ background: type.color }} /><span>{type.label}</span><strong>{loading ? <Skeleton style={{ width: 20 }} /> : (Array.isArray(metrics?.categories) ? metrics.categories : []).find((category) => typeKey(category.eventType ?? category.type ?? category.name) === key)?.count ?? filtered.filter((event) => event.type === key).length}</strong></div>)}</div></section>

  </aside>;
}



const DEFAULT_FILTERS = { boardId: '', academicYearId: '', academicLevelId: '', groupId: '', programId: '', sectionId: '', type: '', status: '', search: '', from: '', to: '' };
const PAGE_SIZE = 5;
const displayDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function StatusBadge({ status }) { return <span className={`academic-calendar-status is-${status.toLowerCase()}`}>{status}</span>; }
const validNavigationDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(Date.parse(date)) ? date : todayKey();

export default function AcademicCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigationParams = useRef(searchParams);
  navigationParams.current = searchParams;
  const updateNavigation = useCallback((changes) => {
    const params = new URLSearchParams(navigationParams.current);
    Object.entries(changes).forEach(([key, value]) => { if (value == null || value === '') params.delete(key); else params.set(key, String(value)); });
    if (params.toString() !== navigationParams.current.toString()) { navigationParams.current = params; setSearchParams(params); }
  }, [setSearchParams]);
  const dialog = searchParams.get('modal');
  const eventId = searchParams.get('eventId') || '';
  const eventSource = searchParams.get('source') || 'calendar';
  const navigateDialog = useCallback((modal, event, date) => updateNavigation({ modal, eventId: event?.id, source: event?.source, eventDate: date }), [updateNavigation]);
  const { boards, academicYears, selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const { selectedCampusId } = useCampusContext();
  const [masterLists, setMasterLists] = useState({ levels: [], groups: [], programs: [], sections: [] });
  const masters = useMemo(() => ({ ...masterLists, boards, years: academicYears }), [masterLists, boards, academicYears]);
  const masterName = (key, id) => (Array.isArray(id) ? id : [id]).map((value) => masters[key].find((row) => String(row.id) === String(value))?.name).filter(Boolean).join(', ');
  const [reload, setReload] = useState(0);
  const [rangeEvents, setRangeEvents] = useState([]);
  const [sidebarEvents, setSidebarEvents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [widgetsError, setWidgetsError] = useState('');
  const [service] = useState(createAcademicCalendarService);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const filters = useMemo(() => ({ ...DEFAULT_FILTERS, campusId: selectedCampusId ? String(selectedCampusId) : '', boardId: selectedBoardId ? String(selectedBoardId) : '', academicYearId: selectedAcademicYearId ? String(selectedAcademicYearId) : '' }), [selectedCampusId, selectedBoardId, selectedAcademicYearId]);
  const view = ['month', 'week', 'list'].includes(searchParams.get('view')) ? searchParams.get('view') : 'month';
  const anchor = validNavigationDate(searchParams.get('date'));
  const selectedDate = anchor;
  const [dialogData, setDialogData] = useState(null);
  const [dialogError, setDialogError] = useState('');
  const dialogKey = JSON.stringify([dialog, eventId, eventSource, filters]);
  const dialogEvent = dialogData?.key === dialogKey ? dialogData.event : null;
  const detail = dialog === 'details' ? dialogEvent : null;
  const editor = useMemo(() => dialog === 'add' || (dialog === 'edit' && dialogEvent) ? { event: dialog === 'edit' ? dialogEvent : null, defaults: { ...filters, ...(searchParams.get('eventDate') ? { start: validNavigationDate(searchParams.get('eventDate')), end: validNavigationDate(searchParams.get('eventDate')) } : {}) } } : null, [dialog, dialogEvent, filters, searchParams]);
  const confirmation = useMemo(() => dialog === 'delete' && dialogEvent ? { event: dialogEvent } : null, [dialog, dialogEvent]);
  const setDetail = useCallback((event) => navigateDialog(event ? 'details' : null, event), [navigateDialog]);
  const setEditor = () => navigateDialog(null);
  const setConfirmation = useCallback(() => navigateDialog(null), [navigateDialog]);
  const upcomingOnly = searchParams.get('upcoming') === 'true';
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [ascending, setAscending] = useState(true);
  const [listSearch, setListSearch] = useState('');
  const [sortKey, setSortKey] = useState('start');
  const mutationLock = useRef(false);
  const detailRequest = useRef(0);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const eventTypes = useMemo(() => {
    const types = { ...EVENT_TYPES };
    [...events, ...rangeEvents, ...sidebarEvents, ...(detail ? [detail] : []), ...(editor?.event ? [editor.event] : [])].forEach((event) => { if (!types[event.type]) types[event.type] = { label: event.apiEventType || event.type, color: CUSTOM_TYPE_COLOR }; });
    (Array.isArray(metrics?.categories) ? metrics.categories : []).forEach((category) => {
      const label = category.eventType ?? category.type ?? category.name;
      if (label && !types[typeKey(label)]) types[typeKey(label)] = { label, color: CUSTOM_TYPE_COLOR };
    });
    return types;
  }, [events, rangeEvents, sidebarEvents, detail, editor, metrics]);

  useEffect(() => {
    const request = new AbortController(); let active = true;
    detailRequest.current += 1; setLoading(true); setError(''); setEvents([]); setRangeEvents([]); setSidebarEvents([]); setMetrics(null); setPage(1);
    const scope = Object.fromEntries(['campusId', 'boardId', 'academicYearId'].filter((key) => filters[key]).map((key) => [key, Number(filters[key])]));
    const listScope = Object.fromEntries(Object.entries(scope).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value]));
    setWidgetsError('');
    Promise.allSettled([service.getCalendarEvents(listScope, request.signal), service.getHolidays(listScope, request.signal), service.getExaminations(listScope, request.signal)])
      .then((results) => {
        if (!active) return;
        const labels = ['Calendar', 'Holidays', 'Examinations'];
        const combined = [], errors = [];
        results.forEach((result, index) => {
          if (result.status === 'rejected') errors.push(labels[index] + ': ' + getApiErrorMessage(result.reason));
          else if (index === 2) { combined.push(...result.value.events); errors.push(...result.value.errors); }
          else combined.push(...result.value);
        });
        setEvents(uniqueEvents(combined)); setError(errors.join(' ')); setLoading(false);
      });
    return () => { active = false; request.abort(); };
  }, [service, filters, reload]);
  useEffect(() => {
    if (view === 'list') { setRangeError(''); return; }
    let active = true; const request = new AbortController();
    const range = calendarRange(anchor, view);
    const cells = view === 'month' ? monthCells(anchor, []) : null;
    const scope = Object.fromEntries(['campusId', 'boardId', 'academicYearId'].filter((key) => filters[key]).map((key) => [key, Number(filters[key])]));
    setRangeEvents([]); setRangeLoading(true); setRangeError('');
    service.getRange({ ...scope, start: (cells ? cells[0].date : range.start) + 'T00:00:00', end: (cells ? cells[cells.length - 1].date : range.end) + 'T23:59:59' }, request.signal)
      .then((data) => { if (active) setRangeEvents(data); }).catch((err) => { if (active) setRangeError(getApiErrorMessage(err)); }).finally(() => { if (active) setRangeLoading(false); });
    return () => { active = false; request.abort(); };
  }, [service, filters, anchor, view, reload]);
  useEffect(() => {
    let active = true; const request = new AbortController();
    setMasterLists({ levels: [], groups: [], programs: [], sections: [] });
    loadCalendarMasters(filters, request.signal).then((data) => { if (active) setMasterLists(data); })
      .catch((error) => { if (active) setWidgetsError(getApiErrorMessage(error)); });
    return () => { active = false; request.abort(); };
  }, [filters, reload]);

  useEffect(() => {
    if (!detail && !confirmation) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape' || busy) return;
      setDetail(null); setConfirmation(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [detail, confirmation, busy, setDetail, setConfirmation]);
  const filtered = useMemo(() => filterEvents(events, filters), [events, filters]);
  const range = calendarRange(anchor, view);
  const combinedRangeEvents = uniqueEvents([...events, ...rangeEvents]);
  const periodEvents = filterEvents(combinedRangeEvents, filters).filter((event) => event.start <= range.end && event.end >= range.start);
  // List view shows all filtered dates; month/week show their selected period.
  const upcoming = upcomingEvents(filtered);
  const visible = view === 'list' ? (upcomingOnly ? upcomingEvents(filtered) : filtered) : periodEvents;
  const timeline = plannerDays(periodEvents, range, true);
  const listEvents = visible.filter((event) => event.title.toLowerCase().includes(listSearch.trim().toLowerCase()));
  const sortValue = (event) => sortKey === 'type' ? eventTypes[event.type].label : sortKey === 'level' ? masterName('levels', event.academicLevelId) : sortKey === 'group' ? masterName('groups', event.groupId) : String(event[sortKey] || '');
  const sorted = [...listEvents].sort((a, b) => (sortValue(a).localeCompare(sortValue(b)) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title)) * (ascending ? 1 : -1));
  const exportEvents = view === "list" ? sorted : visible;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const periodLabel = view === 'list' ? (upcomingOnly ? 'Upcoming events' : 'All events') : view === 'week' ? `${displayDate(range.start)} – ${displayDate(range.end)}` : new Date(`${anchor}T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const yearName = masterName('years', filters.academicYearId) || 'All academic years';
  const selectDate = (date) => updateNavigation({ date });
  const move = (amount) => {
    if (view === 'week') selectDate(shiftDay(anchor, amount * 7));
    else { const date = new Date(`${anchor}T12:00:00`); date.setDate(1); date.setMonth(date.getMonth() + amount); selectDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`); }
  };
  const openEditor = (event = null, date = '') => {
    if (event?.source && event.source !== 'calendar') return;
    navigateDialog(event ? 'edit' : 'add', event, date);
  };
  const refresh = async () => { setReload((value) => value + 1); };
  const saveEvent = async (payload, id) => {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true);
    try {
      if (id) await service.updateCalendarEvent(id, calendarEventPayload(payload, eventTypes)); else await service.createCalendarEvent(calendarEventPayload(payload, eventTypes));
      await refresh(); updateNavigation({ modal: null, eventId: null, source: null, eventDate: null, date: payload.start }); setPage(1);
      setToast({ message: `Event ${id ? 'updated' : 'created'} as ${payload.status.toLowerCase()}.` });
    } finally { mutationLock.current = false; setBusy(false); }
  };
  const mutate = async (operation, message) => {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true);
    try { await operation(); await refresh(); setDetail(null); setConfirmation(null); setToast({ message }); }
    catch (err) { setToast({ message: err.message, type: 'error' }); }
    finally { mutationLock.current = false; setBusy(false); }
  };
  const showDetail = (event) => setDetail(event);
  const confirmDelete = (event) => { if (event.source !== 'calendar') return; navigateDialog('delete', event); };
  const externalDialogEvent = eventSource !== 'calendar' ? events.find((event) => String(event.id) === eventId && event.source === eventSource) : null;
  useEffect(() => {
    if (!['edit', 'details', 'delete'].includes(dialog)) return;
    let active = true;
    setDialogError('');
    if (eventSource !== 'calendar' && loading) return;
    const restore = async () => {
      try {
        if (!eventId || (dialog !== 'details' && eventSource !== 'calendar')) throw new Error('Event is unavailable.');
        const event = eventSource === 'calendar' ? await service.getEvent(eventId) : externalDialogEvent;
        if (!event?.id || !filterEvents([event], filters).length) throw new Error('Event is unavailable in the current context.');
        if (active) setDialogData({ key: dialogKey, event });
      } catch (error) { if (active) setDialogError(getApiErrorMessage(error) || 'Unable to load event.'); }
    };
    restore();
    return () => { active = false; };
  }, [dialog, eventId, eventSource, dialogKey, filters, service, externalDialogEvent, loading]);
  const exportFile = async (format) => {
    if (exporting) return;
    setExporting(true);
    try {
      if (format === 'excel') {
        const XLSX = await import('xlsx');
        const rows = exportEvents.map((e) => ({ Event: e.title, Source: e.source, Type: eventTypes[e.type].label, 'Start Date': e.start, 'End Date': e.end,
          Time: e.allDay ? 'All day' : e.startTime + ' - ' + e.endTime, 'Academic Level': masterName('levels', e.academicLevelId) || e.academicLevelName || '',
          Group: masterName('groups', e.groupId) || e.groupName || '', Programme: masterName('programs', e.programId) || e.programName || '',
          Section: masterName('sections', e.sectionId) || e.sectionName || '', Status: e.status, Description: e.description || '' }));
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Academic Calendar');
        XLSX.writeFile(book, 'Academic_Calendar.xlsx');
      } else {
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
        const pdf = new jsPDF({ orientation: 'landscape' });
        pdf.setFontSize(16); pdf.text('Pirnav College | Academic Calendar ', 14, 16);
        pdf.setFontSize(10); pdf.text(`${yearName.replace('–', '-')} | ${periodLabel.replaceAll('–', '-')}`, 14, 24);
        autoTable(pdf, { startY: 30, head: [['Event', 'Type', 'Dates', 'Time', 'Level / Group', 'Programme / Section', 'Status']], body: exportEvents.map((e) => [e.title.replaceAll('–', '-'), eventTypes[e.type].label.replaceAll('–', '-'), `${e.start}\n${e.end}`, e.allDay ? 'All day' : `${e.startTime} - ${e.endTime}`, `${masterName('levels', e.academicLevelId) || 'All'} / ${masterName('groups', e.groupId) || 'All'}`, `${masterName('programs', e.programId) || 'All'} / ${masterName('sections', e.sectionId) || 'All'}`, e.status]), headStyles: { fillColor: [100, 124, 24] }, styles: { fontSize: 8 } });
        pdf.save('Pirnav_Academic_Calendar.pdf');
      }
    } catch (err) { setToast({ message: `Export failed: ${err.message}`, type: 'error' }); }
    finally { setExporting(false); }
  };
  const printCalendar = () => {
    const frame = document.createElement('iframe');
    frame.title = 'Academic Calendar print preview';
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', width: '1px', height: '1px', left: '-10000px', border: '0' });
    frame.onload = () => {
      const target = frame.contentWindow;
      if (!target) { frame.remove(); return; }
      target.addEventListener('afterprint', () => frame.remove(), { once: true });
      // Let the isolated document finish layout before opening the print dialog.
      target.requestAnimationFrame(() => target.requestAnimationFrame(() => {
        try { target.focus(); target.print(); }
        catch (error) { frame.remove(); setToast({ message: 'Print failed: ' + error.message, type: 'error' }); }
      }));
    };
    frame.srcdoc = calendarPrintDocument({ events: exportEvents,
      title: 'Pirnav College - Academic Calendar', subtitle: yearName + ' | ' + periodLabel, eventTypes, masterName });
    document.body.appendChild(frame);
  };
  const eventButton = (event) => <button key={event.id} className={`academic-planner-event is-${event.status.toLowerCase()}`} style={{ '--event-color': eventTypes[event.type].color }} onClick={() => showDetail(event)}><span className="academic-planner-event-title">{event.title}</span><span className="academic-planner-event-meta"><span className="academic-planner-category"><i />{eventTypes[event.type].label}</span><span><Clock3 size={13} />{event.allDay ? 'All day' : [event.startTime, event.endTime].filter(Boolean).join(' – ')}</span></span><StatusBadge status={event.status} /></button>;
  const actions = (event) => <div className="academic-calendar-row-actions"><button aria-label={`View ${event.title}`} title="View" onClick={() => showDetail(event)}><Eye size={15} /></button>{event.source === 'calendar' && <><button aria-label={`Edit ${event.title}`} title="Edit" onClick={() => openEditor(event)}><Pencil size={15} /></button><button aria-label={`Delete ${event.title}`} title="Delete" onClick={() => confirmDelete(event)}><Trash2 size={15} /></button></>}</div>;

  return <DashboardLayout title="Academic Calendar" subtitle="Manage academic schedules, examinations, holidays, and college events.">
    <div className="academic-calendar">
      <PlannerHeader filtered={filtered} upcoming={upcoming} loading={loading} busy={busy} exporting={exporting} visible={visible} yearName={yearName} selectedDate={selectedDate} metrics={null} onPrint={printCalendar} openEditor={openEditor} exportFile={exportFile} />
      <div className="academic-planner-layout">
      <section className="academic-planner-main" aria-label="Academic event planner">
      <PlannerNavigation view={view} periodLabel={periodLabel} move={move} today={() => selectDate(todayKey())} changeView={(mode) => { updateNavigation({ view: mode, upcoming: null }); setPage(1); }} />
      <div className="academic-calendar-print-heading"><h1>Pirnav College — Academic Calendar </h1><p>{yearName} | {periodLabel}</p></div>
      {(error || widgetsError || rangeError) && <p role="alert">{error || widgetsError || rangeError}</p>}
      {loading || (view !== 'list' && rangeLoading) ? <CalendarLoadingSkeleton view={view} /> : <>
        {!visible.length && <p role="status">No events scheduled for this period.</p>}
        {view === 'list' ? <>
          <div className="academic-calendar-list-toolbar"><label className="academic-calendar-list-search"><span>Search events</span><input type="search" value={listSearch} placeholder="Search event name..." onChange={(event) => { setListSearch(event.target.value); setPage(1); }} /></label><span>{listEvents.length} events</span></div>
          <div className="academic-calendar-table-wrap"><table className="cms-table academic-calendar-table"><thead><tr>{[['title', 'Event Name'], ['type', 'Event Type'], ['start', 'Start Date'], ['end', 'End Date'], ['level', 'Academic Level'], ['group', 'Group'], ['status', 'Status']].map(([key, label]) => <th key={key} aria-sort={sortKey === key ? (ascending ? 'ascending' : 'descending') : 'none'}><button onClick={() => { setSortKey(key); setAscending(sortKey === key ? !ascending : true); setPage(1); }}>{label}</button></th>)}<th>Actions</th></tr></thead><tbody>{sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((event) => <tr key={event.id}><td data-label="Event Name"><button className="academic-calendar-title-button" onClick={() => showDetail(event)}>{event.title}</button></td><td data-label="Event Type"><span className="academic-list-category" style={{ '--event-color': eventTypes[event.type].color }}><i aria-hidden="true"/>{eventTypes[event.type].label}</span></td><td data-label="Start Date">{displayDate(event.start)}</td><td data-label="End Date">{displayDate(event.end)}</td><td data-label="Academic Level">{masterName('levels', event.academicLevelId) || 'All'}</td><td data-label="Group">{masterName('groups', event.groupId) || 'All'}</td><td data-label="Status"><StatusBadge status={event.status} /></td><td data-label="Actions">{actions(event)}</td></tr>)}{!sorted.length && <tr><td colSpan={8}>No events match your search.</td></tr>}</tbody></table></div>
          <footer className="academic-calendar-pagination"><span>Showing {sorted.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length} events</span><div className="academic-calendar-pagination-actions"><button className="cms-btn cms-btn-ghost" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pages}</span><button className="cms-btn cms-btn-ghost" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></footer>
          <div className="academic-calendar-print-list">{exportEvents.map((event) => <p key={event.id}>{event.start} – {event.end} | {event.title} | {event.status}</p>)}</div>
        </> : <PlannerTimeline timeline={timeline} view={view} eventButton={eventButton} openEditor={openEditor} anchor={anchor} events={combinedRangeEvents} selectedDate={selectedDate} onSelectDate={selectDate} onEvent={showDetail} eventTypes={eventTypes} actions={actions} />}
      </>}
      </section>
      <PlannerAside filtered={filtered} upcoming={upcoming} loading={loading} busy={busy} setDetail={showDetail} viewAll={() => { updateNavigation({ view: 'list', upcoming: 'true' }); setPage(1); }} reset={refresh} eventTypes={eventTypes} metrics={null} />
      </div>
      {['edit', 'details', 'delete'].includes(dialog) && !dialogEvent && <Modal className="academic-calendar-modal" title={dialog === 'edit' ? 'Edit Event' : dialog === 'delete' ? 'Delete event?' : 'Event Details'} onClose={() => navigateDialog(null)}><p role={dialogError ? 'alert' : 'status'}>{dialogError || 'Loading event...'}</p></Modal>}
      {detail && <Modal className="academic-calendar-modal" title={detail.title} onClose={() => setDetail(null)} footer={<>
        <button className="cms-btn cms-btn-ghost" onClick={() => setDetail(null)}>Close</button>{detail.source === 'calendar' && <><button className="cms-btn cms-btn-ghost" disabled={busy} onClick={() => openEditor(detail)}>Edit</button>
        <button className="cms-btn cms-btn-danger" disabled={busy} onClick={() => confirmDelete(detail)}>Delete</button>
        {detail.status !== 'Published' && <button className="cms-btn cms-btn-primary" disabled={busy} onClick={() => mutate(() => service.publishCalendarEvent(detail.id), 'Event published.')}>Publish Event</button>}
        {detail.status !== 'Cancelled' && <button className="cms-btn cms-btn-ghost" disabled={busy} onClick={() => mutate(() => service.updateCalendarEvent(detail.id, calendarEventPayload({ ...detail, status: 'Cancelled' }, eventTypes)), 'Event cancelled.')}>Cancel Event</button>}</>}
      </>}><dl className="academic-calendar-details">{[
        ['Source', detail.source === 'calendar' ? 'Academic Calendar' : detail.source === 'holidays' ? 'Holiday Management (read-only)' : 'Examination Management (read-only)'], ['Holiday Type', detail.holidayType], ['Subject', detail.subjectName], ['Event Type', eventTypes[detail.type].label], ['Status', detail.status], ['Description', detail.description || detail.reason], ['Remarks', detail.remarks], ['Start Date', displayDate(detail.start)], ['End Date', displayDate(detail.end)], ['Time', detail.allDay ? 'All day' : `${detail.startTime} – ${detail.endTime}`], ['Board', masterName('boards', detail.boardId)], ['Academic Year', masterName('years', detail.academicYearId)], ['Academic Level', masterName('levels', detail.academicLevelId) || detail.academicLevelName || detail.academicLevel], ['Group', masterName('groups', detail.groupId) || detail.groupName], ['Programme', masterName('programs', detail.programId) || detail.programName], ['Section', masterName('sections', detail.sectionId) || detail.sectionName], ['Location', detail.location],
      ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Status' ? <StatusBadge status={value} /> : value}</dd></div>)}</dl></Modal>}
      {editor && <AcademicCalendarEventForm key={`${dialog}:${eventId}:${searchParams.get('eventDate') || ''}`} event={editor.event} defaults={editor.defaults} onClose={() => setEditor(null)} onSave={saveEvent} eventTypes={eventTypes} masters={masters} />}
      {confirmation && <ConfirmDialog title="Delete event?" message={`Delete "${confirmation.event.title}" from the academic calendar?`} onCancel={() => !busy && setConfirmation(null)} loading={busy} confirmLabel="Delete Event" danger onConfirm={() => mutate(() => service.deleteCalendarEvent(confirmation.event.id), 'Event deleted.')} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  </DashboardLayout>;
}
