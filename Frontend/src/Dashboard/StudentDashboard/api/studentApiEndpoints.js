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
  timetable: {
    weekly: (studentId) => `/api/v1/timetable/student/${encodeURIComponent(studentId)}`,
    daily: (studentId) => `/api/v1/timetable/student/${encodeURIComponent(studentId)}/daily`,
  },
};

export default studentApiEndpoints;
