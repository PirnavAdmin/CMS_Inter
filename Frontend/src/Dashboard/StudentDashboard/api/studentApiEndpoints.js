const studentApiEndpoints = {
  profile: {
    me: "/api/v1/students/me",
    update: "/api/v1/students/me/profile",
    photo: "/api/v1/students/me/photo",
    documents: "/api/v1/students/me/documents",
    changePassword: "/api/v1/students/me/change-password",
  },
  examinations: {
    list: "/api/v1/examinations",
    getById: (examinationId) => `/api/v1/examinations/${encodeURIComponent(examinationId)}`,
    schedules: (examinationId) => `/api/v1/examinations/${encodeURIComponent(examinationId)}/schedules`,
  },
  attendance: {
    search: "/api/v1/attendance/search",
  },
  results: {
    studentResult: "/api/v1/results/student-result",
    studentMemo: (studentId) => `/api/v1/results/student/${encodeURIComponent(studentId)}/memo`,
    studentMemoPdf: "/api/v1/results/students/memo",
  },
  certificates: {
    list: "/api/v1/certificates",
    activeTemplates: "/api/v1/certificates/active-templates",
    generate: "/api/v1/certificates/generate",
    download: (id) => `/api/v1/certificates/download/${encodeURIComponent(id)}`,
  },
  holidays: {
    list: "/api/v1/holidays",
  },
  transport: {
    studentDetails: "/api/v1/transport/student/details",
  },
  hostel: {
    studentAllocations: "/api/v1/hostel/student-allocations",
  },
  timetable: {
    weekly: (studentId) => `/api/v1/timetable/student/${encodeURIComponent(studentId)}`,
    daily: (studentId) => `/api/v1/timetable/student/${encodeURIComponent(studentId)}/daily`,
  },
};

export default studentApiEndpoints;
