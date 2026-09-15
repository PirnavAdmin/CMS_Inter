import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { academicLevelGroupSubjectMap, commonSubjectIds, groupSubjectMap, loadSecondLanguages, saveSecondLanguages, secondLanguageOptions, subjectMaster } from "@/data/subjectMasterData.js";
import "./SubjectManagementPage.css";

const types = ["Theory", "Practical", "Language"];
const cloneMap = () => Object.fromEntries(Object.entries(groupSubjectMap).map(([group, ids]) => [group, ids.map((subjectId) => ({ subjectId, overrides: {} }))]));
const empty = () => ({ id: "", name: "", code: "", type: [], marks: { theory: "", practical: "", internal: "", passing: "" } });
const emptyLanguageDraft = () => ({ name: "", code: "", category: "Second Language", marks: { theory: "100", practical: "0", internal: "0", passing: "35" } });
const HIDDEN_LANGUAGE_NAMES_KEY = "cms_subject_management_hidden_language_names";
const loadHiddenLanguageNames = () => { try { const stored = JSON.parse(localStorage.getItem(HIDDEN_LANGUAGE_NAMES_KEY) || "[]"); return Array.isArray(stored) ? stored.filter(Boolean) : []; } catch { return []; } };
const saveHiddenLanguageNames = (names) => { try { localStorage.setItem(HIDDEN_LANGUAGE_NAMES_KEY, JSON.stringify(names)); } catch { /* Retain the in-memory language configuration. */ } };
const get = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null);
const asList = (value) => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.Items) ? value.Items : Array.isArray(value?.records) ? value.records : Array.isArray(value?.results) ? value.results : Array.isArray(value?.$values) ? value.$values : Array.isArray(value?.data) ? value.data : Array.isArray(value?.Data) ? value.Data : [];
const body = (response) => response?.data?.data ?? response?.data?.Data ?? response?.data?.result ?? response?.data?.Result ?? response?.data ?? response ?? {};
const option = (item, idKeys, labelKeys) => ({ value: String(get(item, ...idKeys) ?? ""), label: String(get(item, ...labelKeys) ?? "") });
const groupNameOf = (group) => String(get(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode", "code", "Code") ?? "").trim();
const normalizeGroupName = (value = "") => String(value).trim().toUpperCase().replace(/\s+/g, "");
const academicLevelYear = (level) => {
  const code = String(get(level?.raw, "academicLevelCode", "AcademicLevelCode", "levelCode", "LevelCode", "code", "Code") ?? "");
  const label = String(level?.label ?? "");
  const classify = (value) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (/^(?:2|ii)$/.test(normalized)) return "secondYear";
    if (/^(?:1|i)$/.test(normalized)) return "firstYear";
    if (/(\bsecond\b|\b2nd\b|\bclass\s*12\b|\byear\s*2\b|\binter(?:mediate)?\s*2\b)/.test(normalized)) return "secondYear";
    if (/(\bfirst\b|\b1st\b|\bclass\s*11\b|\byear\s*1\b|\binter(?:mediate)?\s*1\b)/.test(normalized)) return "firstYear";
    return "";
  };
  return classify(code) || classify(label);
};
const displaySubjectName = (name = "") => {
  const value = String(name).trim();
  if (/^physics\s*(?:-\s*)?(?:i|ii)$/i.test(value)) return "Physics";
  if (/^chemistry\s*(?:-\s*)?(?:i|ii)$/i.test(value)) return "Chemistry";
  return value;
};
const displayLanguageName = (name = "") => String(name).trim().replace(/\s*-\s*(?:I|II)$/i, "");
const normalizeSubjectCode = (code = "") => String(code).trim().toUpperCase();
const normalizeDuplicateName = (name = "") => String(name).trim().toLowerCase().replace(/\s+/g, " ");
const SUBJECT_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
const normalizeSubjectName = (name = "") => displaySubjectName(name)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");
const subjectKey = (subject) => String(subject?.code ?? subject?.id ?? "").trim().toUpperCase();
const hasLanguageType = (subject) => (subject?.type ?? []).some((type) => String(type).trim().toLowerCase() === "language");
const markValue = (value) => {
  const raw = value && typeof value === "object" ? value.value ?? value.mark ?? value.marks ?? 0 : value;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
};
const total = (marks = {}) => markValue(marks.theory) + markValue(marks.practical) + markValue(marks.internal);
const editableMarks = (marks = {}) => ({
  theory: String(marks.theory ?? ""),
  practical: String(marks.practical ?? ""),
  internal: String(marks.internal ?? ""),
  passing: String(marks.passing ?? ""),
});
const savedMarks = (marks = {}) => ({
  theory: markValue(marks.theory),
  practical: markValue(marks.practical),
  internal: markValue(marks.internal),
  total: total(marks),
  passing: markValue(marks.passing),
});
const subjectFromApi = (item) => {
  const rawType = String(get(item, "subjectType", "SubjectType") ?? "");
  const type = [
    get(item, "theory", "Theory") ? "Theory" : null,
    get(item, "practical", "Practical") ? "Practical" : null,
    get(item, "language", "Language") ? "Language" : null,
  ].filter(Boolean);
  return {
    id: String(get(item, "subjectId", "SubjectId", "id", "Id") ?? ""),
    name: String(get(item, "subjectName", "SubjectName", "name", "Name") ?? ""),
    code: String(get(item, "subjectCode", "SubjectCode", "code", "Code") ?? ""),
    type: type.length ? type : rawType.split(/[,+/]/).map((value) => value.trim()).filter(Boolean),
    marks: {
      theory: markValue(get(item, "externalMarks", "ExternalMarks", "theoryMarks", "TheoryMarks")),
      practical: markValue(get(item, "practicalMarks", "PracticalMarks")),
      internal: markValue(get(item, "internalMarks", "InternalMarks")),
      total: markValue(get(item, "totalMarks", "TotalMarks")),
      passing: markValue(get(item, "passingMarks", "PassingMarks")),
    },
    raw: item,
  };
};

export const pageConfig = { title: "Subject Management", rows: [], fields: [] };

export default function SubjectManagementPage() {
  const { selectedBoardId: navbarBoardId, selectedAcademicYearId: navbarAcademicYearId } = useAcademicContext();
  const [context, setContext] = useState({ levelId: "", groupId: "" });
  const [subjectView, setSubjectView] = useState("subjects");
  const [levels, setLevels] = useState([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [academicContextValid, setAcademicContextValid] = useState(false);
  const [groups, setGroups] = useState([]);
  const [master, setMaster] = useState(() => subjectMaster.map((item) => ({ ...item, marks: { ...item.marks } })));
  const [mapping, setMapping] = useState(cloneMap);
  const [contextSubjects, setContextSubjects] = useState([]);
  const [contextSubjectsReady, setContextSubjectsReady] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectBusy, setSubjectBusy] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeSubjects, setActiveSubjects] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [toast, setToast] = useState("");
  const languages = secondLanguageOptions;
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  // A Second Language is one common-subject slot with many selectable
  // language options. Keep every selected option rather than a single value.
  const [secondLanguages, setSecondLanguages] = useState(loadSecondLanguages);
  const [hiddenLanguageNames, setHiddenLanguageNames] = useState(loadHiddenLanguageNames);
  const [languageDraft, setLanguageDraft] = useState(emptyLanguageDraft);
  const [languageSelection, setLanguageSelection] = useState("");
  const [selectedLanguageKeys, setSelectedLanguageKeys] = useState([]);
  const [temporarySubjects, setTemporarySubjects] = useState([]);
  const [selectedSubjectKeys, setSelectedSubjectKeys] = useState([]);
  const [configuredSubjects, setConfiguredSubjects] = useState({});
  const [configuring, setConfiguring] = useState(null);
  const [allocationSearch, setAllocationSearch] = useState("");
  const [allocatedSearch, setAllocatedSearch] = useState("");
  const contextRequestSequence = useRef(0);
  // Retain the full backend group object for future API operations. The
  // frontend-only subject map deliberately uses a normalized group name.
  const selectedGroup = useMemo(() => groups.find((group) => group.value === String(context.groupId))?.raw ?? null, [context.groupId, groups]);
  const selectedLevel = useMemo(() => levels.find((level) => level.value === String(context.levelId)) ?? null, [context.levelId, levels]);
  const groupKey = normalizeGroupName(groupNameOf(selectedGroup));
  const levelYear = academicLevelYear(selectedLevel);
  const commonSubjects = useMemo(() => master.filter((subject) => commonSubjectIds.includes(subject.id)), [master]);
  const secondLanguageSubjects = useMemo(() => secondLanguages.map((language) => ({
    ...language,
    id: language.code,
    type: language.type?.length ? language.type : ["Language"],
    marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35, ...(language.marks || {}) },
  })), [secondLanguages]);
  const commonOrLanguageKeys = useMemo(() => new Set([
    ...commonSubjectIds,
    ...commonSubjects.map(subjectKey),
    ...secondLanguageSubjects.map(subjectKey),
  ].map((key) => String(key).trim().toUpperCase())), [commonSubjects, secondLanguageSubjects]);
  const isGroupSubject = useCallback((subject) => !hasLanguageType(subject) && !commonOrLanguageKeys.has(subjectKey(subject)), [commonOrLanguageKeys]);
  const predefinedSubjectCodes = useMemo(() => levelYear ? academicLevelGroupSubjectMap[levelYear]?.[groupKey] || [] : [], [groupKey, levelYear]);
  const predefinedGroupSubjects = useMemo(() => predefinedSubjectCodes
    .map((code) => master.find((subject) => String(subject.code ?? subject.subjectCode ?? subject.id).trim().toUpperCase() === String(code).trim().toUpperCase()))
    .filter(Boolean), [master, predefinedSubjectCodes]);
  const isAlreadyAllocated = useCallback((candidate) => contextSubjects.some((persisted) => {
    const candidateCode = normalizeSubjectCode(candidate.code);
    const persistedCode = normalizeSubjectCode(persisted.code);
    const sameCode = Boolean(candidateCode && persistedCode && candidateCode === persistedCode);
    const sameName = normalizeSubjectName(candidate.name) === normalizeSubjectName(persisted.name);
    return sameCode || sameName;
  }), [contextSubjects]);
  const allocateSubjects = useMemo(() => [...predefinedGroupSubjects, ...temporarySubjects]
    .filter(isGroupSubject)
    .filter((subject) => !isAlreadyAllocated(subject))
    .filter((subject, index, all) => all.findIndex((entry) => subjectKey(entry) === subjectKey(subject)) === index), [isAlreadyAllocated, isGroupSubject, predefinedGroupSubjects, temporarySubjects]);
  const filteredAllocateSubjects = useMemo(() => allocateSubjects.filter((subject) => `${subject.name} ${subject.code}`.toLowerCase().includes(allocationSearch.toLowerCase())), [allocateSubjects, allocationSearch]);
  const allocatedGroupSubjects = useMemo(() => contextSubjects.filter((subject) => subject.id), [contextSubjects]);
  const filteredAllocatedSubjects = useMemo(() => allocatedGroupSubjects.filter((subject) => `${subject.name} ${subject.code}`.toLowerCase().includes(allocatedSearch.toLowerCase())), [allocatedGroupSubjects, allocatedSearch]);
  const languageSubjects = useMemo(() => {
    const byName = new Map();
    const configuredLanguages = [
      ...commonSubjects.filter(hasLanguageType).filter((subject) => subject.id !== "SL1"),
      ...secondLanguageSubjects.filter((subject) => !hiddenLanguageNames.includes(displayLanguageName(subject.name).toLowerCase())),
      ...languages.filter((language) => !hiddenLanguageNames.includes(displayLanguageName(language.name).toLowerCase())).map((language) => ({ id: language.code, name: language.name, code: language.code, type: ["Language"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35, ...(language.marks || {}) } })),
    ];
    configuredLanguages.forEach((subject) => {
      const key = displayLanguageName(subject.name).toLowerCase();
      if (key && !byName.has(key)) byName.set(key, subject);
    });
    return [...byName.values()];
  }, [commonSubjects, hiddenLanguageNames, languages, secondLanguageSubjects]);
  const available = useMemo(() => {
    const source = searchResults.length ? searchResults : activeSubjects.length ? activeSubjects : master;
    return source.filter((subject) => !commonSubjectIds.includes(subject.id) && !contextSubjects.some((item) => item.id === subject.id));
  }, [activeSubjects, contextSubjects, master, searchResults]);
  const languageCandidates = useMemo(() => languageSubjects.filter((language) => !contextSubjects.some((subject) => {
    const sameCode = normalizeSubjectCode(subject.code) === normalizeSubjectCode(language.code);
    const sameName = displayLanguageName(subject.name).toLowerCase() === displayLanguageName(language.name).toLowerCase();
    return sameCode || sameName;
  })).filter((language) => !selectedLanguageKeys.includes(subjectKey(language))), [contextSubjects, languageSubjects, selectedLanguageKeys]);
  const selectedLanguages = useMemo(() => languageSubjects.filter((language) => selectedLanguageKeys.includes(subjectKey(language))), [languageSubjects, selectedLanguageKeys]);
  useEffect(() => {
    setTemporarySubjects([]);
    setSelectedSubjectKeys([]);
    setSelectedLanguageKeys([]);
    setConfiguredSubjects({});
    setAllocationSearch("");
    setAllocatedSearch("");
  }, [context.groupId, context.levelId]);
  useEffect(() => {
    let active = true;
    setAcademicContextValid(false);
    setContext({ levelId: "", groupId: "" });
    setLevels([]);
    setGroups([]);
    if (!navbarBoardId) { setLevelsLoading(false); return undefined; }
    setLevelsLoading(true);
    apiClient.get(apiEndpoints.boards.academicLevels, { params: { boardId: navbarBoardId } }).then((response) => {
      if (!active) return;
      setLevels(asList(body(response)).map((item) => ({ ...option(item, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]), raw: item })).filter((item) => item.value && item.label));
      setAcademicContextValid(true);
      setLevelsLoading(false);
    }).catch(() => { if (active) { setLevels([]); setAcademicContextValid(false); setLevelsLoading(false); setToast("Unable to load valid academic context."); } });
    return () => { active = false; };
  }, [navbarBoardId]);
  useEffect(() => {
    let active = true;
    setContext((current) => ({ ...current, groupId: "" }));
    setGroups([]);
    if (!navbarBoardId || !context.levelId) return undefined;
    const requestParams = { academicYearId: navbarAcademicYearId, academicLevelId: context.levelId, isActive: true };
    const rowsFrom = (response) => {
      const payload = body(response), wrappers = asList(payload);
      return Array.isArray(payload?.groups) ? payload.groups : Array.isArray(payload?.Groups) ? payload.Groups : wrappers.flatMap((item) => Array.isArray(item?.groups) ? item.groups : Array.isArray(item?.Groups) ? item.Groups : Array.isArray(item?.groupList) ? item.groupList : get(item, "groupId", "GroupId", "id", "Id") != null ? [item] : []);
    };
    const normalizeGroups = (rows) => rows.map((item) => ({ ...option(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name", "groupCode", "GroupCode", "code", "Code"]), raw: item })).filter((item) => item.value && item.label);
    const loadGroups = async () => {
      try {
        const direct = await apiClient.get(apiEndpoints.groups.getByBoard(navbarBoardId), { params: requestParams });
        let next = normalizeGroups(rowsFrom(direct));
        // Some backend versions expose the same filtered data through the
        // general list endpoint instead of the board-specific endpoint.
        if (!next.length) {
          const listed = await apiClient.get(apiEndpoints.groups.list, { params: { boardId: navbarBoardId, ...requestParams } });
          next = normalizeGroups(rowsFrom(listed));
        }
        if (active) setGroups(next);
      } catch {
        if (active) setGroups([]);
      }
    };
    loadGroups();
    return () => { active = false; };
  }, [context.levelId, navbarBoardId, navbarAcademicYearId]);
  const loadContextSubjects = useCallback(async () => {
    const requestSequence = ++contextRequestSequence.current;
    if (!navbarBoardId || !context.levelId || !context.groupId) {
      setContextSubjects([]);
      setContextSubjectsReady(false);
      setSubjectsLoading(false);
      return false;
    }
    setSubjectsLoading(true);
    setContextSubjectsReady(false);
    try {
      const response = await apiClient.get(apiEndpoints.subjects.context, { params: { boardId: navbarBoardId, groupId: context.groupId, academicLevelId: context.levelId } });
      if (requestSequence !== contextRequestSequence.current) return false;
      setContextSubjects(asList(body(response)).map(subjectFromApi).filter((subject) => subject.id));
      setContextSubjectsReady(true);
      return true;
    } catch (error) {
      if (requestSequence !== contextRequestSequence.current) return false;
      setContextSubjects([]);
      setContextSubjectsReady(false);
      setToast(getApiErrorMessage(error) || "Unable to load subjects.");
      return false;
    } finally {
      if (requestSequence === contextRequestSequence.current) setSubjectsLoading(false);
    }
  }, [context.groupId, context.levelId, navbarBoardId]);
  useEffect(() => { loadContextSubjects(); }, [loadContextSubjects]);
  useEffect(() => {
    if (!addOpen || !navbarBoardId) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get(apiEndpoints.subjects.search, { params: { search: subjectSearch, boardId: navbarBoardId, groupId: context.groupId || undefined, academicLevelId: context.levelId || undefined, isActive: true } });
        setSearchResults(asList(body(response)).map(subjectFromApi).filter((subject) => subject.id));
      } catch { setSearchResults([]); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [addOpen, context.groupId, context.levelId, navbarBoardId, subjectSearch]);
  useEffect(() => {
    let active = true;
    if (!navbarBoardId || !context.levelId) { setActiveSubjects([]); return undefined; }
    apiClient.get(apiEndpoints.subjects.active).then((response) => {
      if (active) setActiveSubjects(asList(body(response)).map(subjectFromApi).filter((subject) => subject.id));
    }).catch(() => { if (active) setActiveSubjects([]); });
    return () => { active = false; };
  }, [context.levelId, navbarAcademicYearId, navbarBoardId]);
  const editDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const editMark = (key, value) => setDraft((current) => ({ ...current, marks: { ...current.marks, [key]: value } }));
  const toggleType = (type) => setDraft((current) => {
    const next = current.type.includes(type) ? current.type.filter((item) => item !== type) : [...current.type, type];
    return { ...current, type: type === "Language" ? ["Language"] : next.filter((item) => item !== "Language") };
  });
  const configureChoice = (id) => {
    setChoice(id);
    const subject = available.find((item) => item.id === id) ?? master.find((item) => item.id === id);
    setDraft(id === "new" || !subject ? empty() : { ...subject, type: [...subject.type], marks: editableMarks(subject.marks) });
  };
  const valid = (newMaster) => {
    if (!draft.name.trim() || !draft.code.trim()) return "Subject name and subject code are required.";
    if (!draft.type.length) return "Select at least one subject type.";
    if (!SUBJECT_CODE_PATTERN.test(draft.code.trim())) return "Subject code may contain only letters, numbers, underscores, and hyphens.";
    const rawMarks = [draft.marks.theory, draft.marks.practical, draft.marks.internal, draft.marks.passing];
    if (rawMarks.some((value) => String(value).trim() === "" || !Number.isFinite(Number(value)))) return "All marks must be numeric.";
    if (rawMarks.some((value) => Number(value) < 0 || Number(value) > 1000)) return "Marks must be between 0 and 1000.";
    if (total(draft.marks) <= 0) return "Total marks must be greater than zero.";
    if (Number(draft.marks.passing) > total(draft.marks)) return "Passing marks cannot exceed total marks.";
    if (newMaster && master.some((subject) => subject.name.toLowerCase() === draft.name.trim().toLowerCase())) return "Subject already exists. Please select it from the available subjects.";
    if (newMaster && master.some((subject) => subject.code.toLowerCase() === draft.code.trim().toLowerCase())) return "Subject code already exists.";
    return "";
  };
  const subjectPayload = (configuration, academicContext = { boardId: navbarBoardId, groupId: context.groupId, academicLevelId: context.levelId }) => ({
    boardId: Number(academicContext.boardId), groupId: Number(academicContext.groupId), academicLevelId: Number(academicContext.academicLevelId),
    subjectName: configuration.name, subjectCode: configuration.code, subjectType: configuration.type.join(" + "),
    theory: configuration.type.includes("Theory"), practical: configuration.type.includes("Practical"), language: configuration.type.includes("Language"), elective: false,
    externalMarks: configuration.marks.theory, practicalMarks: configuration.marks.practical, internalMarks: configuration.marks.internal,
    totalMarks: configuration.marks.total, passingMarks: configuration.marks.passing, isActive: true,
  });
  const configurationFor = (subject) => configuredSubjects[subjectKey(subject)] ?? {
    name: subject.name,
    code: subject.code,
    type: [...subject.type],
    marks: savedMarks(subject.marks),
  };
  const configurationError = (configuration) => {
    if (!configuration.name.trim() || !configuration.code.trim()) return "Every selected subject needs a name and subject code.";
    if (!configuration.type.length) return `Select at least one type for ${configuration.name}.`;
    if (!SUBJECT_CODE_PATTERN.test(configuration.code.trim())) return `${configuration.code || "Subject code"} may contain only letters, numbers, underscores, and hyphens.`;
    const marks = [configuration.marks.theory, configuration.marks.practical, configuration.marks.internal, configuration.marks.total, configuration.marks.passing];
    if (marks.some((value) => !Number.isFinite(Number(value)))) return `All marks for ${configuration.name} must be numeric.`;
    if (marks.some((value) => Number(value) < 0 || Number(value) > 1000)) return `Marks for ${configuration.name} must be between 0 and 1000.`;
    if (Number(configuration.marks.total) <= 0) return `Total marks for ${configuration.name} must be greater than zero.`;
    if (Number(configuration.marks.total) !== total(configuration.marks)) return `Total marks for ${configuration.name} must equal Theory + Practical + Internal marks.`;
    if (Number(configuration.marks.passing) > Number(configuration.marks.total)) return `Passing marks for ${configuration.name} cannot exceed total marks.`;
    return "";
  };
  const writeContextError = () => !academicContextValid || !contextSubjectsReady || !navbarBoardId || !context.levelId || !context.groupId
    ? "Unable to load valid academic context."
    : "";
  const mutationErrorMessage = (error, fallback) => {
    const backendMessage = getApiErrorMessage(error);
    if (error?.response?.status === 400) return backendMessage || "Invalid subject input.";
    if (error?.response?.status === 404) return backendMessage || "The Subject or academic context no longer exists.";
    if (error?.response?.status === 409) return backendMessage || "The Subject conflicts with an existing record or dependency.";
    return backendMessage || fallback;
  };
  const openConfigure = (subject) => {
    const configuration = configurationFor(subject);
    setConfiguring(subject);
    setDraft({ ...configuration, marks: editableMarks(configuration.marks) });
  };
  const applyConfiguration = () => {
    if (!configuring) return;
    const error = valid(false);
    if (error) return setToast(error);
    const configuration = { name: draft.name.trim(), code: draft.code.trim().toUpperCase(), type: [...draft.type], category: draft.category, marks: savedMarks(draft.marks) };
    if (hasLanguageType(configuration)) return setToast("Language subjects are managed in Common / Language Subjects.");
    setConfiguredSubjects((current) => ({ ...current, [subjectKey(configuring)]: configuration }));
    setSelectedSubjectKeys((current) => current.includes(subjectKey(configuring)) ? current : [...current, subjectKey(configuring)]);
    setConfiguring(null);
  };
  const addOtherSubject = () => {
    const error = valid(false);
    if (error) return setToast(error);
    const configuration = { name: draft.name.trim(), code: draft.code.trim().toUpperCase(), category: draft.category, type: [...draft.type], marks: savedMarks(draft.marks) };
    if (hasLanguageType(configuration)) return setToast("Language subjects are managed in Common / Language Subjects.");
    const existsInAllocation = [...allocateSubjects, ...contextSubjects].some((subject) => subjectKey(subject) === configuration.code || subject.name.trim().toLowerCase() === configuration.name.toLowerCase());
    if (existsInAllocation) return setToast("This subject is already available for the selected group.");
    const temporary = { id: `temporary-${configuration.code}`, ...configuration };
    setTemporarySubjects((current) => [...current, temporary]);
    setConfiguredSubjects((current) => ({ ...current, [subjectKey(temporary)]: configuration }));
    setSelectedSubjectKeys((current) => [...current, subjectKey(temporary)]);
    setAddOpen(false); setChoice(""); setDraft(empty()); setSubjectSearch("");
    setToast("Subject added to the allocation list. Save allocated subjects to persist it.");
  };
  const saveAllocatedSubjects = async () => {
    if (subjectBusy) return;
    const selected = [...allocateSubjects.filter((subject) => selectedSubjectKeys.includes(subjectKey(subject))), ...selectedLanguages];
    if (!selected.length) return setToast("Select at least one subject to save.");
    const contextError = writeContextError();
    if (contextError) return setToast(contextError);
    const saveContext = { boardId: navbarBoardId, groupId: context.groupId, academicLevelId: context.levelId };
    const configurations = selected.map((subject) => ({ subject, configuration: configurationFor(subject) }));
    for (const { configuration } of configurations) {
      const error = configurationError(configuration);
      if (error) return setToast(error);
    }
    const selectedCodes = new Set();
    const selectedNames = new Set();
    for (const { configuration } of configurations) {
      const code = normalizeSubjectCode(configuration.code);
      const name = normalizeDuplicateName(configuration.name);
      if (selectedCodes.has(code)) return setToast(`Duplicate subject code ${configuration.code} is selected.`);
      if (selectedNames.has(name)) return setToast(`Duplicate subject name ${configuration.name} is selected.`);
      selectedCodes.add(code);
      selectedNames.add(name);
      if (contextSubjects.some((subject) => normalizeDuplicateName(subject.name) === name)) return setToast(`${configuration.name} already exists in this academic context.`);
    }
    setSubjectBusy(true);
    const savedKeys = [];
    let postAttempted = false;
    try {
      const duplicateChecks = await Promise.all(configurations.map(({ configuration }) => apiClient.get(apiEndpoints.subjects.checkCode, { params: { subjectCode: configuration.code, boardId: saveContext.boardId, groupId: saveContext.groupId, academicLevelId: saveContext.academicLevelId } })));
      const duplicateIndex = duplicateChecks.findIndex((result) => Boolean(body(result)?.exists));
      if (duplicateIndex >= 0) throw new Error(`${configurations[duplicateIndex].configuration.code} already exists in this academic context.`);
      for (const { subject, configuration } of configurations) {
        postAttempted = true;
        await apiClient.post(apiEndpoints.subjects.create, subjectPayload(configuration, saveContext));
        savedKeys.push(subjectKey(subject));
      }
    } catch (requestError) {
      const remaining = configurations.length - savedKeys.length;
      setToast(savedKeys.length
        ? `${savedKeys.length} of ${configurations.length} subjects saved. ${remaining} remaining subject${remaining === 1 ? " was" : "s were"} not saved. ${mutationErrorMessage(requestError, "")}`.trim()
        : mutationErrorMessage(requestError, "Unable to save allocated subjects."));
    } finally {
      if (savedKeys.length) {
        setSelectedSubjectKeys((current) => current.filter((key) => !savedKeys.includes(key)));
        setSelectedLanguageKeys((current) => current.filter((key) => !savedKeys.includes(key)));
        setTemporarySubjects((current) => current.filter((subject) => !savedKeys.includes(subjectKey(subject))));
        setConfiguredSubjects((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !savedKeys.includes(key))));
      }
      const contextConfirmed = postAttempted ? await loadContextSubjects() : false;
      if (savedKeys.length === configurations.length && contextConfirmed) setToast(`${savedKeys.length} subject${savedKeys.length === 1 ? "" : "s"} saved successfully.`);
      else if (savedKeys.length === configurations.length) setToast(`${savedKeys.length} subject${savedKeys.length === 1 ? "" : "s"} saved, but the allocated list could not be refreshed.`);
      setSubjectBusy(false);
    }
  };
  const save = async () => {
    if (subjectBusy) return;
    const error = valid(false);
    if (error) return setToast(error);
    const configuration = { name: draft.name.trim(), code: draft.code.trim().toUpperCase(), category: draft.category, type: [...draft.type], marks: savedMarks(draft.marks) };
    if (editing.scope === "secondLanguage") {
      const duplicate = secondLanguages.some((language) => language.code !== editing.subject.code && (language.name.toLowerCase() === configuration.name.toLowerCase() || language.code.toLowerCase() === configuration.code.toLowerCase()));
      if (duplicate) return setToast("Language name or code already exists.");
      setSecondLanguages((current) => {
        const exists = current.some((language) => language.code === editing.subject.code);
        const updated = exists ? current.map((language) => language.code === editing.subject.code ? configuration : language) : [...current, configuration];
        saveSecondLanguages(updated);
        return updated;
      });
      setHiddenLanguageNames((current) => {
        const name = displayLanguageName(configuration.name).toLowerCase();
        const updated = current.filter((item) => item !== name);
        saveHiddenLanguageNames(updated);
        return updated;
      });
      setEditing(null); setToast("Second language updated successfully.");
      return;
    }
    if (editing.scope === "common") {
      setMaster((current) => current.map((subject) => subject.id === editing.subject.id ? { ...subject, ...configuration } : subject));
      setEditing(null); setToast("Common subject updated successfully.");
      return;
    }
    const contextError = writeContextError();
    if (contextError) return setToast(contextError);
    const duplicateName = contextSubjects.some((subject) => subject.id !== editing.subject.id && normalizeDuplicateName(subject.name) === normalizeDuplicateName(configuration.name));
    if (duplicateName) return setToast("Subject name already exists in this academic context.");
    setSubjectBusy(true);
    try {
      const codeCheck = await apiClient.get(apiEndpoints.subjects.checkCode, { params: { subjectCode: configuration.code, boardId: navbarBoardId, groupId: context.groupId, academicLevelId: context.levelId, excludeSubjectId: editing.subject.id } });
      if (body(codeCheck)?.exists) return setToast("Subject code already exists in this academic context.");
      await apiClient.put(apiEndpoints.subjects.update(editing.subject.id), subjectPayload(configuration));
      setEditing(null); setToast("Subject updated successfully.");
      await loadContextSubjects();
    } catch (requestError) { setToast(mutationErrorMessage(requestError, "Unable to update subject.")); }
    finally { setSubjectBusy(false); }
  };
  const remove = async () => {
    if (removing.scope === "secondLanguage") {
      setSecondLanguages((current) => {
        const updated = current.filter((language) => language.code !== removing.code);
        saveSecondLanguages(updated);
        return updated;
      });
      setHiddenLanguageNames((current) => {
        const name = displayLanguageName(removing.name).toLowerCase();
        const updated = current.includes(name) ? current : [...current, name];
        saveHiddenLanguageNames(updated);
        return updated;
      });
      setSelectedLanguageKeys((current) => current.filter((key) => key !== subjectKey(removing)));
      setToast(removing.name + " removed from Second Languages."); setRemoving(null);
      return;
    }
    if (removing.scope === "common") {
      setMaster((current) => current.filter((subject) => subject.id !== removing.id));
      setSelectedLanguageKeys((current) => current.filter((key) => key !== subjectKey(removing)));
      setToast(removing.name + " removed from Common Subjects."); setRemoving(null);
      return;
    }
    if (subjectBusy) return;
    const contextError = writeContextError();
    if (contextError) return setToast(contextError);
    setSubjectBusy(true);
    try {
      await apiClient.delete(apiEndpoints.subjects.delete(removing.id));
      setToast(removing.name + " deleted/deactivated successfully."); setRemoving(null);
      await loadContextSubjects();
    } catch (requestError) {
      setToast(mutationErrorMessage(requestError, "Unable to delete/deactivate subject."));
      if (requestError?.response?.status === 409) await loadContextSubjects();
    }
    finally { setSubjectBusy(false); }
  };
  const openEdit = async (subject, scope = "group") => {
    if (subjectBusy) return;
    if (scope !== "group") { setEditing({ subject, scope }); setDraft({ ...subject, category: "Second Language", type: [...subject.type], marks: editableMarks(subject.marks) }); return; }
    setSubjectBusy(true);
    try {
      const response = await apiClient.get(apiEndpoints.subjects.byId(subject.id));
      const latest = subjectFromApi(body(response));
      setEditing({ subject: latest.id ? latest : subject, scope });
      setDraft({ ...(latest.id ? latest : subject), type: [...(latest.type?.length ? latest.type : subject.type)], marks: editableMarks(latest.id ? latest.marks : subject.marks) });
    } catch (requestError) { setToast(getApiErrorMessage(requestError) || "Unable to load subject details."); }
    finally { setSubjectBusy(false); }
  };
  const openConfiguredLanguageEdit = (subject, scope) => {
    setEditing({ subject, scope });
    setDraft({ ...subject, category: "Second Language", type: ["Language"], marks: editableMarks(subject.marks) });
  };
  const selectLanguage = (code) => {
    setLanguageSelection(code);
    if (code === "__other__") return setLanguageDraft(emptyLanguageDraft());
    const language = [{ name: "English", code: "ENG1", category: "Second Language", marks: { theory: 100, practical: 0, internal: 0, passing: 35 } }, ...languages].find((item) => item.code === code);
    if (!language) return setLanguageDraft(emptyLanguageDraft());
    setLanguageDraft({ name: language.name, code: language.code, category: "Second Language", marks: { theory: String(language.marks?.theory ?? 100), practical: String(language.marks?.practical ?? 0), internal: String(language.marks?.internal ?? 0), passing: String(language.marks?.passing ?? 35) } });
  };
  const editLanguageDraftMark = (key, value) => setLanguageDraft((current) => ({ ...current, marks: { ...current.marks, [key]: value } }));
  const addSecondLanguage = () => {
    const configuration = { name: languageDraft.name.trim(), code: languageDraft.code.trim().toUpperCase(), category: languageDraft.category, type: ["Language"], marks: savedMarks(languageDraft.marks) };
    if (!configuration.name || !configuration.code) return setToast("Language and subject code are required.");
    if (Number(languageDraft.marks.passing) > total(languageDraft.marks)) return setToast("Passing marks cannot exceed total marks.");
    if (languageSelection === "__other__" && languageSubjects.some((language) => normalizeSubjectCode(language.code) === configuration.code || displayLanguageName(language.name).toLowerCase() === displayLanguageName(configuration.name).toLowerCase())) return setToast("Language name or subject code already exists.");
    if (/^english$/i.test(displayLanguageName(configuration.name))) {
      setMaster((current) => current.some((subject) => subject.id === "ENG1")
        ? current.map((subject) => subject.id === "ENG1" ? { ...subject, ...configuration } : subject)
        : [...current, { id: "ENG1", ...configuration }]);
    } else {
      setSecondLanguages((current) => {
        const updated = current.some((language) => normalizeSubjectCode(language.code) === configuration.code || displayLanguageName(language.name).toLowerCase() === displayLanguageName(configuration.name).toLowerCase())
          ? current.map((language) => normalizeSubjectCode(language.code) === configuration.code || displayLanguageName(language.name).toLowerCase() === displayLanguageName(configuration.name).toLowerCase() ? configuration : language)
          : [...current, configuration];
        saveSecondLanguages(updated);
        return updated;
      });
    }
    setHiddenLanguageNames((current) => {
      const name = displayLanguageName(configuration.name).toLowerCase();
      const updated = current.filter((item) => item !== name);
      saveHiddenLanguageNames(updated);
      return updated;
    });
    setLanguageModalOpen(false);
    setLanguageDraft(emptyLanguageDraft());
    setLanguageSelection("");
    setToast(`${configuration.name} configured successfully.`);
  };

  const toggleSelectedSubject = (subject) => setSelectedSubjectKeys((current) => current.includes(subjectKey(subject))
    ? current.filter((key) => key !== subjectKey(subject))
    : [...current, subjectKey(subject)]);
  const selectedGroupName = groups.find((group) => group.value === String(context.groupId))?.label || groupKey || "Select Group";
  return <DashboardLayout title="Subject Management" subtitle="Configure and allocate subjects to groups." breadcrumb={["Academics", "Subject Management"]}>
    <main className="subject-screen subject-master-screen subject-allocation-screen">
      {subjectView === "languages" ? <>
        <section className="subject-table-card language-management-toolbar"><header className="subject-table-head"><div><h2>Language Management</h2><p>Configure reusable language subjects.</p></div><button className="cms-btn cms-btn-ghost" type="button" onClick={() => setSubjectView("subjects")}>Back to Subjects</button></header><div className="language-management-controls"><Select label="Academic Level" value={context.levelId} options={levels} disabled={levelsLoading || !navbarBoardId || !levels.length} onChange={(levelId) => setContext({ levelId, groupId: "" })} placeholder={levelsLoading ? "Loading academic levels..." : "Select Academic Level"} /><button className="cms-btn cms-btn-primary" type="button" disabled={!context.levelId} onClick={() => { setLanguageDraft(emptyLanguageDraft()); setLanguageSelection(""); setLanguageModalOpen(true); }}><Plus size={16} /> Add Language</button></div></section>
        <section className="subject-table-card subject-language-list"><header className="subject-table-head"><div><h2>Language Subjects</h2><p>Reusable language records for group-wise allocation.</p></div></header><div className="subject-table-scroll"><table className="subject-table subject-master-table"><thead><tr><th>Language</th><th>Code</th><th>Marks</th><th>Action</th></tr></thead><tbody>{languageSubjects.map((subject) => { const scope = /^english$/i.test(displayLanguageName(subject.name)) ? "common" : "secondLanguage"; return <tr key={subjectKey(subject)}><td>{displayLanguageName(subject.name)}</td><td><b>{subject.code}</b></td><td>{total(subject.marks)}</td><td><div className="subject-master-actions"><button className="cms-action-btn" title="Edit language" onClick={() => openConfiguredLanguageEdit(subject, scope)}><Pencil size={16} /></button><button className="cms-action-btn subject-remove-btn" title="Delete language" onClick={() => setRemoving({ ...subject, scope })}><Trash2 size={16} /></button></div></td></tr>; })}</tbody></table></div></section>
      </> : <>
      <div className="subject-management-language-action"><button className="cms-btn cms-btn-ghost" type="button" onClick={() => setSubjectView("languages")}>Manage Languages</button></div>
      <section className="subject-master-context"><Select label="Academic Level" value={context.levelId} options={levels} disabled={subjectBusy || levelsLoading || !navbarBoardId || !levels.length} onChange={(levelId) => { setContextSubjects([]); setContextSubjectsReady(false); setContext({ levelId, groupId: "" }); }} placeholder={levelsLoading ? "Loading academic levels..." : !navbarBoardId ? "No active boards available" : !levels.length ? "No academic levels available" : "Select Academic Level"} /><GroupCombobox value={context.groupId} options={groups} onChange={(groupId) => { setContextSubjects([]); setContextSubjectsReady(false); setContext((current) => ({ ...current, groupId })); }} disabled={subjectBusy || !context.levelId} /></section>
      <section className="subject-allocation-columns" aria-label="Group subject allocation">
        <section className="subject-table-card subject-allocation-panel">
          <header className="subject-table-head"><div><h2>Allocate Subjects — {selectedGroupName}</h2><p>Available curriculum subjects not yet saved for this group.</p></div></header>
          <div className="subject-panel-search"><Search3DIcon size={17} aria-hidden="true" /><input value={allocationSearch} onChange={(event) => setAllocationSearch(event.target.value)} placeholder={`Search ${selectedGroupName} subjects...`} disabled={!context.groupId} /></div>
          <div className="subject-card-list">
            {!context.groupId ? <p className="subject-panel-empty">Select an Academic Level and Group to allocate subjects.</p> : subjectsLoading ? <p className="subject-panel-empty">Loading allocated subjects…</p> : filteredAllocateSubjects.length ? filteredAllocateSubjects.map((subject) => {
              const configuration = configurationFor(subject);
              return <article className="subject-allocation-row" key={subjectKey(subject)}><label className="subject-select-card"><input type="checkbox" checked={selectedSubjectKeys.includes(subjectKey(subject))} onChange={() => toggleSelectedSubject(subject)} /><span><b>{configuration.name}</b><small>{configuration.code} · {configuration.type.join(" + ")}</small><em>Total: {total(configuration.marks)} · Passing: {markValue(configuration.marks.passing)}</em></span></label><button className="cms-btn cms-btn-ghost" type="button" onClick={() => openConfigure(subject)}>Configure</button></article>;
            }) : <p className="subject-panel-empty">{context.groupId && !levelYear ? "Curriculum mapping not configured for this academic level." : "No additional predefined subjects are available for this group."}</p>}
          </div>
          <div className="subject-language-picker"><label className="subject-master-field"><span>Language</span><select value="" disabled={!context.groupId || !languageCandidates.length} onChange={(event) => { const language = languageCandidates.find((item) => subjectKey(item) === event.target.value); if (language) setSelectedLanguageKeys((current) => [...current, subjectKey(language)]); }}><option value="">{!context.groupId ? "Select a group first" : languageCandidates.length ? "Select Language" : "No languages available"}</option>{languageCandidates.map((language) => <option key={subjectKey(language)} value={subjectKey(language)}>{displayLanguageName(language.name)}</option>)}</select></label>{selectedLanguages.length ? <div className="subject-selected-languages"><span>Selected Languages:</span><div>{selectedLanguages.map((language) => <button key={subjectKey(language)} className="language-chip" type="button" title={`Remove ${displayLanguageName(language.name)}`} onClick={() => setSelectedLanguageKeys((current) => current.filter((key) => key !== subjectKey(language)))}>{displayLanguageName(language.name)} <b aria-hidden="true">×</b></button>)}</div></div> : null}</div>
          <footer className="subject-allocation-footer"><button className="cms-btn cms-btn-ghost" type="button" disabled={!context.groupId} onClick={() => { setChoice("new"); setDraft(empty()); setAddOpen(true); }}><Plus size={16} /> Add Other Subject</button><span>{selectedSubjectKeys.length} Subject{selectedSubjectKeys.length === 1 ? "" : "s"}{selectedLanguageKeys.length ? ` + ${selectedLanguageKeys.length} Language${selectedLanguageKeys.length === 1 ? "" : "s"}` : ""} Selected</span><button className="cms-btn cms-btn-primary" type="button" disabled={(!selectedSubjectKeys.length && !selectedLanguageKeys.length) || subjectBusy} onClick={saveAllocatedSubjects}>{subjectBusy ? "Saving…" : "Save Allocated Subjects"}</button></footer>
        </section>
        <section className="subject-table-card subject-allocation-panel">
          <header className="subject-table-head"><div><h2>Allocated Subjects — {selectedGroupName}</h2><p>{allocatedGroupSubjects.length} Subject{allocatedGroupSubjects.length === 1 ? "" : "s"} Allocated</p></div></header>
          <div className="subject-panel-search"><Search3DIcon size={17} aria-hidden="true" /><input value={allocatedSearch} onChange={(event) => setAllocatedSearch(event.target.value)} placeholder="Search allocated subjects..." disabled={!context.groupId} /></div>
          <div className="subject-card-list">{!context.groupId ? <p className="subject-panel-empty">Select a group to view allocated subjects.</p> : subjectsLoading ? <p className="subject-panel-empty">Loading allocated subjects…</p> : filteredAllocatedSubjects.length ? filteredAllocatedSubjects.map((subject) => <article className="subject-allocation-row is-allocated" key={subject.id}><span><b>{displaySubjectName(subject.name)}</b><small>{subject.code} · {subject.type.join(" + ")}</small><em>Total: {total(subject.marks)} · Passing: {markValue(subject.marks.passing)}</em></span><div className="subject-master-actions"><button className="cms-action-btn" title="Edit subject" disabled={subjectBusy} onClick={() => openEdit(subject)}><Pencil size={16} /></button><button className="cms-action-btn subject-remove-btn" title="Delete/deactivate subject" disabled={subjectBusy} onClick={() => setRemoving(subject)}><Trash2 size={16} /></button></div></article>) : <p className="subject-panel-empty">No subjects have been allocated for this group.</p>}</div>
        </section>
      </section>
      </>}
    </main>
    {addOpen && <Modal title="Add New Subject" className="subject-add-modal" onClose={() => !subjectBusy && setAddOpen(false)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setAddOpen(false)} disabled={subjectBusy}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={addOtherSubject} disabled={subjectBusy}>Add to List</button></>}><div className="subject-modal"><Form draft={draft} editDraft={editDraft} editMark={editMark} toggleType={toggleType} onNameSearch={setSubjectSearch} />{subjectSearch && searchResults.length ? <p className="subject-existing-hint">Existing matches: {searchResults.slice(0, 3).map((subject) => `${subject.name} (${subject.code})`).join(", ")}</p> : null}</div></Modal>}
    {configuring && <Modal title={`Configure ${configuring.name}`} size="sm" onClose={() => setConfiguring(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setConfiguring(null)}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={applyConfiguration}>Apply Changes</button></>}><div className="subject-modal"><Form draft={draft} editDraft={editDraft} editMark={editMark} toggleType={toggleType} /></div></Modal>}
    {editing && <Modal title={(editing.scope === "group" ? "Edit Subject - " : "Edit Language - ") + displaySubjectName(editing.subject.name)} onClose={() => !subjectBusy && setEditing(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setEditing(null)} disabled={subjectBusy}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={save} disabled={subjectBusy}>{subjectBusy ? "Saving..." : "Save Changes"}</button></>}><div className="subject-modal">{editing.scope === "group" ? <Form draft={draft} editDraft={editDraft} editMark={editMark} toggleType={toggleType} /> : <LanguageForm draft={draft} editDraft={editDraft} editMark={editMark} />}</div></Modal>}
    {languageModalOpen && <Modal title="Add Language" className="subject-language-modal" onClose={() => { setLanguageModalOpen(false); setLanguageSelection(""); }} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => { setLanguageModalOpen(false); setLanguageSelection(""); }}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={addSecondLanguage}>Save Language</button></>}><div className="subject-modal"><label className="subject-master-field"><span>Language *</span><select value={languageSelection} onChange={(event) => selectLanguage(event.target.value)}><option value="">Select Language</option><option value="ENG1">English</option>{languages.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}<option value="__other__">Other / Add New Language</option></select></label><LanguageForm draft={languageDraft} editDraft={(key, value) => setLanguageDraft((current) => ({ ...current, [key]: value }))} editMark={editLanguageDraftMark} includeName={languageSelection === "__other__"} /></div></Modal>}
    {removing && <Modal title={removing.scope === "secondLanguage" ? "Delete Language" : removing.scope === "common" ? "Delete Common Subject" : "Delete/Deactivate Subject"} size="sm" onClose={() => !subjectBusy && setRemoving(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setRemoving(null)} disabled={subjectBusy}>Cancel</button><button className="cms-btn cms-btn-danger" onClick={remove} disabled={subjectBusy}>{subjectBusy ? "Processing..." : removing.scope === "common" || removing.scope === "secondLanguage" ? "Delete" : "Delete/Deactivate"}</button></>}>{removing.scope === "secondLanguage" ? <p>Remove <b>{removing.name}</b> from the Second Language options?</p> : removing.scope === "common" ? <p>Delete <b>{removing.name}</b> from Common Subjects?</p> : <p>This action deletes or deactivates the backend Subject record for <b>{removing.name}</b>. If this subject is already used in Timetable, Examination, Marks, faculty allocation, or attendance-related mappings, the backend may reject the operation or existing references may be affected.</p>}</Modal>}
    <Toast message={toast} onClose={() => setToast("")} />
  </DashboardLayout>;
}

function Select({ label, value, options, onChange, placeholder, disabled = false }) { return <label className="subject-master-field"><span>{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder || "Select " + label}</option>{options.map((option) => typeof option === "string" ? <option key={option} value={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function GroupCombobox({ value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(value), [active, setActive] = useState(0);
  const root = useRef(null);
  const selected = options.find((group) => group.value === String(value));
  const matches = options.filter((group) => group.label.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => { setQuery(selected?.label || ""); }, [selected?.label, value]);
  useEffect(() => { const close = (event) => { if (!root.current?.contains(event.target)) { setOpen(false); setQuery(selected?.label || ""); } }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, [selected?.label]);
  const choose = (group) => { onChange(group.value); setQuery(group.label); setOpen(false); setActive(0); };
  const keyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, matches.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && matches[active]) { event.preventDefault(); choose(matches[active]); }
    else if (event.key === "Escape") setOpen(false);
  };
  return <div className="subject-combobox subject-group-combobox" ref={root}><label className="subject-master-field"><span>Group</span><div className="subject-group-input"><Search3DIcon size={17} aria-hidden="true" /><input role="combobox" aria-expanded={open} aria-controls="group-options" aria-autocomplete="list" value={query} disabled={disabled} placeholder="Search or select group..." onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={keyDown} /><ChevronDown size={17} aria-hidden="true" /></div></label>{open && !disabled && <div id="group-options" className="subject-combobox-options" role="listbox">{matches.length ? matches.map((group, index) => <button key={group.value} type="button" role="option" aria-selected={group.value === value} className={index === active ? "is-active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(group)}><strong>{group.label}</strong></button>) : <div className="subject-combobox-empty">No groups found.</div>}</div>}</div>;
}
function SubjectCombobox({ options, value, onChange, newName, onNewName, onSearch }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [active, setActive] = useState(0);
  const root = useRef(null);
  const selected = options.find((subject) => subject.id === value);
  const filtered = options.filter((subject) => (subject.name + " " + subject.code).toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { setQuery(value === "new" ? newName || "" : selected?.name || ""); }, [value, selected?.name, newName]);
  useEffect(() => { const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, []);
  const choose = (item) => { onChange(item.id); setOpen(false); setActive(0); };
  const keyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(Boolean(filtered.length)); setActive((index) => Math.min(index + 1, filtered.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && filtered[active]) { event.preventDefault(); choose(filtered[active]); }
    else if (event.key === "Escape") setOpen(false);
  };
  const type = (event) => {
    const text = event.target.value, matches = options.filter((subject) => (subject.name + " " + subject.code).toLowerCase().includes(text.toLowerCase()));
    setQuery(text); onSearch?.(text); setActive(0);
    if (matches.length) { if (value === "new") onChange(""); setOpen(true); }
    else { onNewName(text); setOpen(false); }
  };
  return <div className="subject-combobox subject-search-wrapper" ref={root}><label className="subject-master-field"><span>{value === "new" ? "Subject *" : "Subject"}</span><input className="subject-search-input" role="combobox" aria-expanded={open && Boolean(filtered.length)} aria-controls="subject-options" aria-autocomplete="list" value={query} placeholder={value === "new" ? "Enter subject name..." : "Search or select subject..."} onFocus={() => filtered.length && setOpen(true)} onChange={type} onKeyDown={keyDown} /></label>{open && filtered.length ? <div id="subject-options" className="subject-combobox-options subject-search-results" role="listbox">{filtered.map((item, index) => <button key={item.id} type="button" role="option" aria-selected={item.id === value} className={"subject-search-option " + (index === active ? "is-active" : "")} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}><strong>{item.name}</strong><span>{item.code + " · " + item.type.join(" + ")}</span></button>)}</div> : null}</div>;
}
function Form({ draft, editDraft, editMark, toggleType, includeSubjectName = true, onNameSearch }) { return <><div className="subject-form-grid">{includeSubjectName ? <Text label="Subject Name *" value={draft.name} onChange={(value) => { editDraft("name", value); onNameSearch?.(value); }} /> : null}<Text label="Subject Code *" value={draft.code} onChange={(value) => editDraft("code", value)} /></div><fieldset className="subject-types"><legend>Subject Type *</legend>{types.map((type) => <label key={type}><input type="checkbox" checked={draft.type.includes(type)} onChange={() => toggleType(type)} /> {type}</label>)}</fieldset><div className="subject-form-grid subject-marks-grid"><MarkNumber label="Theory Marks" value={draft.marks.theory} onChange={(value) => editMark("theory", value)} /><MarkNumber label="Practical Marks" value={draft.marks.practical} onChange={(value) => editMark("practical", value)} /><MarkNumber label="Internal Marks" value={draft.marks.internal} onChange={(value) => editMark("internal", value)} /><Text label="Total Marks" value={total(draft.marks)} type="number" readOnly /><MarkNumber label="Passing Marks *" value={draft.marks.passing} onChange={(value) => editMark("passing", value)} /></div></>; }
function LanguageForm({ draft, editDraft, editMark, includeName = true }) { return <><div className="subject-form-grid">{includeName ? <Text label="Language *" value={draft.name} onChange={(value) => editDraft("name", value)} /> : null}<Text label="Subject Code *" value={draft.code} onChange={(value) => editDraft("code", value)} /></div><div className="subject-form-grid subject-language-marks-grid"><MarkNumber label="Theory Marks" value={draft.marks.theory} onChange={(value) => editMark("theory", value)} /><MarkNumber label="Practical Marks" value={draft.marks.practical} onChange={(value) => editMark("practical", value)} /><MarkNumber label="Internal Marks" value={draft.marks.internal} onChange={(value) => editMark("internal", value)} /><Text label="Total Marks" value={total(draft.marks)} type="number" readOnly /></div><MarkNumber label="Passing Marks *" value={draft.marks.passing} onChange={(value) => editMark("passing", value)} /></>; }
function Text({ label, value, onChange, disabled, readOnly = false, type = "text" }) { return <label className="subject-master-field"><span>{label}</span><input type={type} value={value} disabled={disabled} readOnly={readOnly} onChange={(event) => onChange && onChange(event.target.value)} /></label>; }
function MarkNumber({ label, value, onChange }) { return <label className="subject-master-field"><span>{label}</span><input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
