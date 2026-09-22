export const student = {
  name: "Nikhitha",
  firstName: "Nikhitha",
  lastName: "Reddy",
  initials: "NR",
  studentId: "STU-2026-001",
  admissionNo: "ADM-2026-001",
  admissionDate: "12-Jun-2026",
  admissionType: "Regular",
  admissionQuota: "Merit",
  rollNo: "24",
  academicYear: "2026-2027",
  academicLevel: "First Year",
  board: "Board of Intermediate Education, Andhra Pradesh",
  group: "MPC",
  programme: "Regular",
  section: "MPC-A",
  medium: "English",
  secondLanguage: "Sanskrit",
  status: "Active",
  studentType: "Non-Residential",
  transportRequired: "Yes",
  gender: "Female",
  dateOfBirth: "18-Aug-2009",
  bloodGroup: "B+",
  aadhaar: "XXXX XXXX 4821",
  mobile: "98765 43210",
  email: "nikhitha.student@pirnav.edu.in",
  religion: "Hindu",
  caste: "General",
  address: { house: "4-18", street: "MG Road", town: "Vijayawada", district: "NTR", state: "Andhra Pradesh", pincode: "520010" },
  parents: { fatherName: "Ramesh Reddy", fatherOccupation: "Business", fatherMobile: "98765 41010", motherName: "Lakshmi Reddy", motherOccupation: "Teacher", motherMobile: "98765 42020", guardianName: "Ramesh Reddy", guardianMobile: "98765 41010", annualIncome: "₹8,00,000" },
  previousSchool: { name: "Sri Chaitanya School", board: "State Board", passingYear: "2026", marks: "9.4 GPA", hallTicket: "APSSC2601842" },
};

export const attendance = { percentage: 92, present: 92, absent: 8, workingDays: 100 };
export const fees = { total: 60000, paid: 55000, due: 5000, nextDueDate: "15-Oct-2026", paymentPlan: "Two Installments" };

export const todaySchedule = [
  ["1", "08:30 - 09:20", "Mathematics", "Dr. S. Rao", "R-201", "Completed"],
  ["2", "09:20 - 10:10", "Physics", "Ms. P. Lakshmi", "Lab-1", "Completed"],
  ["3", "10:20 - 11:10", "Chemistry", "Mr. K. Nagaraj", "Lab-2", "Current"],
  ["4", "11:10 - 12:00", "English", "Mrs. Swathi", "R-201", "Upcoming"],
  ["5", "12:50 - 13:40", "Mathematics", "Dr. S. Rao", "R-201", "Upcoming"],
  ["6", "13:40 - 14:30", "Sanskrit", "Mrs. Anitha", "R-201", "Upcoming"],
  ["7", "14:40 - 15:30", "Computer Lab", "Mr. Ibrahim", "Lab-3", "Upcoming"],
];

const subjects = ["Mathematics", "Physics", "Chemistry", "English", "Sanskrit", "Computer Lab", "Study Hour"];
export const weeklyTimetable = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, dayIndex) => ({
  day,
  periods: todaySchedule.map((period, index) => ({ period: index + 1, time: period[1], subject: subjects[(index + dayIndex) % subjects.length], faculty: ["Dr. S. Rao", "Ms. P. Lakshmi", "Mr. K. Nagaraj", "Mrs. Swathi"][index % 4], room: index === 1 || index === 5 ? "Lab-1" : "R-201" })),
}));

export const subjectAttendance = [
  ["Mathematics", 22, 21, 1, "95%", "Good"], ["Physics", 20, 18, 2, "90%", "Good"],
  ["Chemistry", 21, 19, 2, "90%", "Good"], ["English", 18, 16, 2, "89%", "Good"],
  ["Sanskrit", 19, 17, 2, "89%", "Good"],
];

export const monthlyAttendance = [["June", 18, 17, 1, "94%"], ["July", 25, 23, 2, "92%"], ["August", 24, 22, 2, "92%"], ["September", 20, 18, 2, "90%"]];
export const exams = [
  ["Quarterly Examination", "Mathematics", "28-Sep-2026", "09:30 AM", "3 Hours", "Hall A", 100],
  ["Quarterly Examination", "Physics", "30-Sep-2026", "09:30 AM", "3 Hours", "Hall A", 100],
  ["Quarterly Examination", "Chemistry", "03-Oct-2026", "09:30 AM", "3 Hours", "Hall A", 100],
];
export const resultSubjects = [["Mathematics", 18, 20, 65, 103, 120, "A", "Pass"], ["Physics", 17, 19, 58, 94, 120, "A", "Pass"], ["Chemistry", 18, 18, 60, 96, 120, "A", "Pass"], ["English", 19, 0, 69, 88, 100, "A", "Pass"], ["Sanskrit", 18, 0, 67, 85, 100, "A", "Pass"]];
export const results = [["Unit Test I", "87%", "A", "Published"], ["Monthly Test - August", "84%", "A", "Published"]];
export const feeBreakdown = [["Admission Fee", 10000, 10000, 0], ["Tuition Fee", 45000, 40000, 5000], ["Laboratory Fee", 5000, 5000, 0]];
export const paymentHistory = [["RCPT-260041", "12-Jun-2026", "₹30,000", "UPI", "Paid"], ["RCPT-260184", "14-Aug-2026", "₹25,000", "Bank Transfer", "Paid"]];
export const transport = { route: "Vijayawada Central", routeCode: "RT-04", pickupPoint: "Benz Circle", pickupTime: "07:20 AM", dropTime: "04:40 PM", vehicle: "AP 16 TZ 4821", driver: "Ramesh Kumar", attendant: "S. Devi", status: "Active" };
export const certificates = [["CERT-26012", "Bonafide Certificate", "02-Sep-2026", "Bank scholarship", "Ready"], ["CERT-26018", "Study Certificate", "14-Sep-2026", "Education loan", "Processing"]];
export const holidays = [["Gandhi Jayanti", "02-Oct-2026", "Friday", "National", "Upcoming"], ["Dussehra", "19-Oct-2026", "Monday", "Festival", "Upcoming"], ["Diwali", "08-Nov-2026", "Sunday", "Festival", "Upcoming"], ["Christmas", "25-Dec-2026", "Friday", "Festival", "Upcoming"]];
