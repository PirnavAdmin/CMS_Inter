const mockCampuses = [
  { value: "mock-njc", label: "Narayana Junior College (NJC)", match: /narayana|\bnjc\b/i },
  { value: "mock-kpc", label: "Kadapa Campus (KPC)", match: /kadapa|\bkpc\b/i },
  { value: "mock-vsp", label: "Visakhapatnam Campus (VSP)", match: /visakhapatnam|\bvsp\b/i },
  { value: "mock-trp", label: "Tirupati Campus (TRP)", match: /tirupati|\btrp\b/i },
];

// Bind sample records to existing campus IDs where available; never add campuses to context.
export function createAdmissionRequestsMockData(campusOptions) {
  const main = campusOptions.find((campus) => /main|\bhq\b/i.test(campus.label)) || campusOptions[0];
  if (!main) return [];
  const others = mockCampuses.map((mock) => (
    campusOptions.find((campus) => campus.value !== main.value && mock.match.test(campus.label)) || mock
  ));
  const samples = [
    ["NJC-0001", "Siva", "Kumar", 0, "outgoing", "09/06/2026", "11:30 AM", "Pending"],
    ["KPC-0142", "Priyanka", "Reddy", 1, "outgoing", "08/06/2026", "11:00 AM", "Pending"],
    ["VSP-0078", "Rahul", "Verma", 2, "outgoing", "07/06/2026", "09:45 AM", "Approved"],
    ["TRP-0033", "Anjali", "Sharma", 3, "incoming", "06/06/2026", "10:15 AM", "Pending"],
    ["NJC-0105", "Lokesh", "", 0, "incoming", "05/06/2026", "10:30 AM", "Pending"],
    ["KPC-0214", "Meena", "Reddy", 1, "incoming", "04/06/2026", "02:00 PM", "Approved"],
    ["VSP-0099", "Arjun", "Nair", 2, "incoming", "03/06/2026", "03:20 PM", "Rejected"],
    ["TRP-0041", "Divya", "Rao", 3, "incoming", "02/06/2026", "09:00 AM", "Pending"],
  ];
  return samples.map(([id, firstName, lastName, otherIndex, direction, submittedOn, time, status], index) => ({
    id,
    admissionNumber: id,
    studentName: `${firstName} ${lastName}`.trim(),
    fromCampus: direction === "outgoing" ? main : others[otherIndex],
    toCampus: direction === "outgoing" ? others[otherIndex] : main,
    submittedOn,
    submittedAt: `${submittedOn}, ${time}`,
    status,
    remarks: id === "TRP-0033" ? "Please approve at the earliest." : "-",
    student: {
      firstName,
      lastName: lastName || "-",
      gender: ["Priyanka", "Anjali", "Meena", "Divya"].includes(firstName) ? "Female" : "Male",
      dateOfBirth: "15/08/2009",
      bloodGroup: index % 2 ? "O+" : "B+",
      aadhaar: "XXXX XXXX 1234",
      mobile: "-",
      email: "-",
    },
    history: [
      { label: "Request Submitted", date: `${submittedOn}, ${time}`, status: "Pending" },
      ...(status === "Pending" ? [] : [{ label: `Request ${status}`, date: `${submittedOn}, 04:00 PM`, status }]),
    ],
  }));
}
