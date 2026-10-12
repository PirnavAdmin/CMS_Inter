export const mockPermissions = ["VIEW_DASHBOARD","VIEW_PROFILE","VIEW_TIMETABLE","VIEW_CLASSES","MARK_ATTENDANCE","ENTER_MARKS","VIEW_EXAM_DUTIES","VIEW_SELF_ATTENDANCE","APPLY_LEAVE","VIEW_PAYSLIPS","VIEW_HOLIDAYS"];
export const mockStaff = {
  id: 1042, employeeId: "EMP-1042", firstName: "Ananya", middleName: "", lastName: "Rao",
  fullName: "Dr. Ananya Rao", role: "Faculty", staffType: "Teaching",
  department: "Mathematics", designation: "Assistant Professor", board: "BIEAP",
  academicYear: "2026-27", dateOfJoining: "2026-04-01", gender: "Male",
  dob: "2003-04-29", bloodGroup: "O-", maritalStatus: "Single", nationality: "Indian",
  religion: "Hindu", motherTongue: "Telugu", mobile: "9951604989", altMobile: "",
  email: "gummadi.devendrakumar@pirnav.com", personalEmail: "gummadi.devendrakumar@gmail.com", status: "Active",
  houseNumber: "15-18-387", street: "Brindavan Gardens", city: "Guntur", district: "Guntur",
  state: "Andhra Pradesh", country: "India", pin: "522007",
  address: "15-18-387, Brindavan Gardens",
  employmentType: "Full Time", subjectsTaught: "Computer Science 1, Computer Science 2",
  bankName: "State Bank of India", accountHolder: "Devendra Kumar Gummadi",
  accountNumber: "38920194823482", accountMasked: "XXXXXX3482", ifsc: "SBIN0001234",
  branch: "Guntur Main Branch", accountType: "Salary Account",
  pfNumber: "200982349812", uanNumber: "200982349812", esiNumber: "",
  aadhaar: "243440489147", pan: "EHKPG8558N", photoUrl: "",
  experience: [
    { id: 1, institution: "PIRNAV Software Solutions", designation: "Associate Software Engineer", fromDate: "2024-06-10", toDate: "Present", isCurrent: true, subjectsTeached: "Computer Science 1", totalExp: "1 Year", status: "Active" },
  ],
  documents: [
    { id: "doc-1", name: "Aadhaar Card Copy", type: "Aadhaar Card Copy", format: "PDF", size: "1.2 MB", date: "2026-04-01", status: "Verified" },
    { id: "doc-2", name: "PAN Card Copy", type: "PAN Card Copy", format: "PDF", size: "840 KB", date: "2026-04-01", status: "Verified" },
  ],
};

export const MOCK_TT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MOCK_TT_SLOTS = [
  {
    time: "09:00–10:00 AM",
    Mon: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Tue: null,
    Wed: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" },
    Thu: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Fri: null,
    Sat: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" }
  },
  {
    time: "10:00–11:00 AM",
    Mon: null,
    Tue: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Wed: null,
    Thu: { sub: "Commercial Maths", code: "CM101", cls: "1st Year - Section A", group: "MEC", sectionId: "3", room: "Room 104", floor: "1st Floor", block: "Commerce Block" },
    Fri: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Sat: null
  },
  {
    time: "11:15–12:15 PM",
    Mon: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" },
    Tue: { sub: "Commercial Maths", code: "CM101", cls: "1st Year - Section A", group: "MEC", sectionId: "3", room: "Room 104", floor: "1st Floor", block: "Commerce Block" },
    Wed: { sub: "Mathematics I-A", code: "MATH101", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Thu: null,
    Fri: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" },
    Sat: null
  },
  {
    time: "02:00–03:00 PM",
    Mon: null,
    Tue: { sub: "Mathematics II-A", code: "MATH201", cls: "2nd Year - Section B", group: "MPC", sectionId: "2", room: "Room 205", floor: "2nd Floor", block: "Main Academic Block" },
    Wed: { sub: "Commercial Maths", code: "CM101", cls: "1st Year - Section A", group: "MEC", sectionId: "3", room: "Room 104", floor: "1st Floor", block: "Commerce Block" },
    Thu: null,
    Fri: null,
    Sat: null
  },
  {
    time: "03:00–04:00 PM",
    Mon: { sub: "Tutorial Doubt Clearing", code: "MATH-TUT", cls: "1st Year - Section A", group: "MPC", sectionId: "1", room: "Room 203", floor: "2nd Floor", block: "Main Academic Block" },
    Tue: null,
    Wed: null,
    Thu: null,
    Fri: null,
    Sat: null
  },
];

export const MOCK_ATT_STUDENTS = [
  { studentId: 1, rollNo: "25MPC001", admissionNo: "ADM2025001", name: "Aarav Sharma", morningStatus: "Present", afternoonStatus: "Present", totalClasses: 48, presentCount: 45, attendancePct: 93.8, remarks: "" },
  { studentId: 2, rollNo: "25MPC002", admissionNo: "ADM2025002", name: "Ananya Reddy", morningStatus: "Present", afternoonStatus: "Present", totalClasses: 48, presentCount: 47, attendancePct: 97.9, remarks: "" },
  { studentId: 3, rollNo: "25MPC003", admissionNo: "ADM2025003", name: "Bhavya Rao", morningStatus: "Absent", afternoonStatus: "Absent", totalClasses: 48, presentCount: 34, attendancePct: 70.8, remarks: "Medical" },
  { studentId: 4, rollNo: "25MPC004", admissionNo: "ADM2025004", name: "Devendra Verma", morningStatus: "Present", afternoonStatus: "Present", totalClasses: 48, presentCount: 44, attendancePct: 91.7, remarks: "" },
  { studentId: 5, rollNo: "25MPC005", admissionNo: "ADM2025005", name: "Gautam Krishna", morningStatus: "Half Day", afternoonStatus: "Absent", totalClasses: 48, presentCount: 32, attendancePct: 66.7, remarks: "Sick" },
  { studentId: 6, rollNo: "25MPC006", admissionNo: "ADM2025006", name: "Ishita Nair", morningStatus: "Present", afternoonStatus: "Present", totalClasses: 48, presentCount: 46, attendancePct: 95.8, remarks: "" },
];

export const MOCK_PAYSLIPS = [
  { id: 258, month: "January 2026", year: 2026, ctc: 399996, grossSalary: 33333, totalDeductions: 2470, netSalary: 30863, basicPay: 18000, hra: 7200, da: 3600, specialAllowance: 4533, pf: 2160, pt: 200, tds: 110, generatedOn: "26 Jan 2026", status: "Paid" },
  { id: 257, month: "December 2025", year: 2025, ctc: 399996, grossSalary: 33333, totalDeductions: 2470, netSalary: 30863, basicPay: 18000, hra: 7200, da: 3600, specialAllowance: 4533, pf: 2160, pt: 200, tds: 110, generatedOn: "28 Dec 2025", status: "Paid" },
  { id: 256, month: "November 2025", year: 2025, ctc: 399996, grossSalary: 33333, totalDeductions: 2470, netSalary: 30863, basicPay: 18000, hra: 7200, da: 3600, specialAllowance: 4533, pf: 2160, pt: 200, tds: 110, generatedOn: "29 Nov 2025", status: "Paid" },
  { id: 255, month: "October 2025", year: 2025, ctc: 399996, grossSalary: 33333, totalDeductions: 2470, netSalary: 30863, basicPay: 18000, hra: 7200, da: 3600, specialAllowance: 4533, pf: 2160, pt: 200, tds: 110, generatedOn: "30 Oct 2025", status: "Paid" },
];

export const MOCK_LEAVES = [
  { id: 1, type: "Casual Leave (CL)", fromDate: "2025-05-14", toDate: "2025-05-14", totalDays: 1, reason: "Personal family emergency", appliedOn: "12 May 2025", status: "Approved", approvedBy: "Principal Office" },
  { id: 2, type: "Sick Leave (SL)", fromDate: "2025-04-02", toDate: "2025-04-03", totalDays: 2, reason: "Viral fever", appliedOn: "01 Apr 2025", status: "Approved", approvedBy: "HOD Mathematics" },
];

export const MOCK_DUTIES = [
  {
    id: 1,
    category: "board",
    examName: "BIEAP IPE Board Theory Examination 2026",
    examCode: "BIEAP-IPE-2026",
    dutyType: "Invigilator (Hall Superintendent)",
    subject: "Mathematics Paper I-A",
    date: "25 Sep 2026",
    session: "Morning Session",
    startTime: "09:00 AM",
    endTime: "12:00 PM",
    venue: "Main Block — Hall 204 (2nd Floor)",
    reportingTime: "08:15 AM (Mandatory 45 mins prior)",
    candidates: "30 Candidates (HT: 2601001 – 2601030)",
    status: "Upcoming",
    sops: [
      "Collect sealed Question Paper packets from Chief Superintendent room.",
      "Verify Student Hall Tickets and prohibit mobile phones/smart watches.",
      "Cross-verify candidate signature on Nominal Roll & OMR Barcode.",
      "Hand over signed absentee statement within 30 minutes of start.",
    ],
  },
  {
    id: 2,
    category: "practical",
    examName: "BIEAP Intermediate Practical Examination 2026",
    examCode: "PRAC-PHY-2026",
    dutyType: "External Practical Examiner",
    subject: "Physics Practical Lab - Batch 01",
    date: "28 Sep 2026",
    session: "Morning Session",
    startTime: "09:00 AM",
    endTime: "12:00 PM",
    venue: "Physics Central Lab — Room 102",
    reportingTime: "08:30 AM",
    candidates: "25 Candidates",
    status: "Upcoming",
    sops: [
      "Verify laboratory apparatus calibration and experiment chits.",
      "Conduct viva-voce and evaluate student lab records/observations.",
      "Enter practical marks directly on BIEAP Confidential portal.",
    ],
  },
  {
    id: 3,
    category: "internal",
    examName: "College Pre-Final Examination 2026",
    examCode: "PRE-FINAL-2026",
    dutyType: "Chief Invigilator",
    subject: "MPC & BiPC Common Session",
    date: "02 Oct 2026",
    session: "Afternoon Session",
    startTime: "02:00 PM",
    endTime: "05:00 PM",
    venue: "Academic Block — Auditorium Hall A",
    reportingTime: "01:15 PM",
    candidates: "60 Students",
    status: "Upcoming",
    sops: [
      "Oversee hall invigilators and manage extra main answer booklets.",
      "Maintain exam decorum and check for unauthorized paper slips.",
    ],
  },
  {
    id: 4,
    category: "internal",
    examName: "Unit Test II Central Evaluation Camp",
    examCode: "UT-II-EVAL",
    dutyType: "Answer Script Evaluator",
    subject: "Mathematics II-A (Calculus & Vectors)",
    date: "15 Sep 2026",
    session: "Full Day Evaluation Camp",
    startTime: "10:00 AM",
    endTime: "04:30 PM",
    venue: "Central Evaluation Cell — Room 305",
    reportingTime: "09:45 AM",
    candidates: "90 Answer Scripts",
    status: "Completed",
    sops: [
      "Follow scheme of valuation and sample answer keys strictly.",
      "Total marks re-verification before bundle closure.",
    ],
  },
];

export const MOCK_REIMB = [
  { id: 1, claimId: "CLM250501", type: "Books & Journals", claimed: 1800, approved: 1800, date: "05 May 2025", status: "Approved", proofName: "Receipt_BookStore.pdf" },
  { id: 2, claimId: "CLM250412", type: "Academic Conference", claimed: 3500, approved: 3500, date: "12 Apr 2025", status: "Approved", proofName: "Ticket_Conference.pdf" },
];

export const facultyMockData = {
  user: { ...mockStaff, id: 1042, employeeId: "EMP-1042", fullName: "Dr. Ananya Rao", firstName: "Ananya", lastName: "Rao", role: "Faculty", staffType: "Teaching", designation: "Assistant Professor", department: "Mathematics", academicYear: "2026-27", email: "ananya.rao@example.edu", mobile: "9876543210", accountHolder: "Dr. Ananya Rao" },
  boards: [{ id: "bieap", name: "BIEAP", code: "BIEAP" }], academicYears: [{ id: "2026-27", name: "2026-27", label: "2026-27" }],
  levels: [{id:"1",name:"Intermediate"}], groups: [{id:"1",name:"MPC"}], programs: [{id:"1",name:"Mathematics"}], sections: [{id:"1",name:"Section A"}],
  subjects: ["Mathematics 1A", "Mathematics 1B", "Mathematics 2A", "Mathematics 2B", "Commercial Maths"],
  timetable: MOCK_TT_SLOTS, students: MOCK_ATT_STUDENTS, payslips: MOCK_PAYSLIPS, leaveRequests: MOCK_LEAVES, examDuties: MOCK_DUTIES,
  marks: [
    {examId:"UT2-MATH1A",examName:"Unit Test II",subject:"Mathematics I-A",maxMarks:100,status:"Draft",rejectionReason:"",entries:MOCK_ATT_STUDENTS.map((student,index)=>({studentId:student.studentId,name:student.name,rollNo:student.rollNo,marks:[78,86,0,72,64,91][index],absent:index===2}))},
    {examId:"MID-MATH2A",examName:"Mid Term Examination",subject:"Mathematics II-A",maxMarks:80,status:"Submitted",rejectionReason:"",entries:MOCK_ATT_STUDENTS.map((student,index)=>({studentId:student.studentId,name:student.name,rollNo:student.rollNo,marks:[62,74,0,51,48,70][index],absent:index===2}))},
    {examId:"UT1-MATH1A",examName:"Unit Test I",subject:"Mathematics I-A",maxMarks:50,status:"Approved",rejectionReason:"",entries:MOCK_ATT_STUDENTS.map((student,index)=>({studentId:student.studentId,name:student.name,rollNo:student.rollNo,marks:[40,45,0,39,30,47][index],absent:index===2}))},
    {examId:"UT0-MATH2A",examName:"Practice Assessment",subject:"Mathematics II-A",maxMarks:50,status:"Rejected",rejectionReason:"Please review the absent entries and resubmit the corrected register.",entries:MOCK_ATT_STUDENTS.map((student,index)=>({studentId:student.studentId,name:student.name,rollNo:student.rollNo,marks:[30,44,0,35,27,39][index],absent:index===2}))}
  ],
  holidays: [{date:"2026-10-02",name:"Gandhi Jayanti",type:"National Holiday"},{date:"2026-10-20",name:"Dussehra",type:"Public Holiday"},{date:"2026-11-08",name:"Diwali",type:"Public Holiday"}],
  searchIndex: [
    ...MOCK_TT_SLOTS.flatMap((slot)=>MOCK_TT_DAYS.map((day)=>slot[day] && ({id:"tt-"+day+"-"+slot.time+"-"+slot[day].code,label:slot[day].sub+" ? "+slot[day].cls,group:"TIMETABLE",moduleId:"timetable",keywords:day+" "+slot.time+" "+slot[day].room})).filter(Boolean)),
    ...MOCK_ATT_STUDENTS.map((student)=>({id:"student-"+student.studentId,label:student.name,group:"STUDENTS",moduleId:"attendance",keywords:student.rollNo+" "+student.admissionNo})),
    ...MOCK_TT_SLOTS.flatMap((slot)=>MOCK_TT_DAYS.map((day)=>slot[day] && ({...slot[day],_searchDay:day})).filter(Boolean).map((item)=>({id:"class-"+item.code+"-"+item.cls,label:item.cls,group:"CLASSES",moduleId:"classes",keywords:item.sub}))).filter((item,index,all)=>all.findIndex((row)=>row.label===item.label&&row.keywords===item.keywords)===index)
  ],
};
