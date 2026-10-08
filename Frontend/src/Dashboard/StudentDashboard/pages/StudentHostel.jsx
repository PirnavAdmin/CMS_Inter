import { useEffect, useState } from "react";
import { Bus, Hotel } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";
import { getStudentAllocationProfile } from "../services/studentAcademicService.js";

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const list = (data) => { const value = unwrap(data); return Array.isArray(value) ? value : value?.items || value?.Items || value?.records || value?.Records || value?.allocations || value?.Allocations || []; };
const active = (record) => !/inactive|cancelled|vacated|rejected/i.test(String(read(record, "status", "Status", "allocationStatus", "AllocationStatus") || "Active"));

export default function StudentHostel() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [allocation, setAllocation] = useState(null);
  const [transport, setTransport] = useState(null);
  const [allocationProfile, setAllocationProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!student?.studentId) return;
      setLoading(true); setError("");
      const [hostelResult, transportResult, profileResult] = await Promise.allSettled([
        apiClient.get(studentApiEndpoints.hostel.studentAllocations, { params: { studentId: student.studentId, status: "Active" } }),
        apiClient.get(studentApiEndpoints.transport.studentDetails, { params: { studentId: student.studentId, academicYear: student.academicYearName } }),
        getStudentAllocationProfile(student),
      ]);
      if (!alive) return;
      const found = hostelResult.status === "fulfilled" ? list(hostelResult.value.data).find((item) => String(read(item, "studentId", "StudentId")) === String(student.studentId) && active(item)) : null;
      const transportData = transportResult.status === "fulfilled" ? unwrap(transportResult.value.data) : null;
      const assignedTransport = Array.isArray(transportData) ? transportData[0] : transportData?.transport ?? transportData?.Transport ?? transportData?.assignment ?? transportData?.Assignment ?? transportData;
      setAllocation(found || null);
      setAllocationProfile(profileResult.status === "fulfilled" ? profileResult.value : student);
      setTransport(assignedTransport && !/not required|hosteller|unassigned/i.test(String(read(assignedTransport, "status", "Status") || "")) && Boolean(read(assignedTransport, "assignmentId", "AssignmentId", "routeId", "RouteId", "routeName", "RouteName", "vehicleNumber", "VehicleNumber")) ? assignedTransport : null);
      if (hostelResult.status === "rejected") setError(getApiErrorMessage(hostelResult.reason));
      else if (transportResult.status === "rejected") setError(`Transport allocation could not be checked. ${getApiErrorMessage(transportResult.reason)}`);
      setLoading(false);
    };
    if (!profileLoading) load();
    return () => { alive = false; };
  }, [profileLoading, student]);
  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="form" rows={5}/></div>;
  const profile = allocationProfile || student;
  const profileHostel = read(profile, "hostel", "Hostel", "hostelDetails", "HostelDetails", "hostelAllocation", "HostelAllocation", "residentialAllocation", "ResidentialAllocation") || {};
  const profileBlockValue = read(profile, "hostelBlock", "HostelBlock", "hostelBlockName", "HostelBlockName", "hostelName", "HostelName") || read(profileHostel, "hostelBlock", "HostelBlock", "block", "Block", "hostelName", "HostelName", "blockName", "BlockName");
  const profileBlock = typeof profileBlockValue === "object" ? read(profileBlockValue, "hostelName", "HostelName", "blockName", "BlockName", "name", "Name", "hostelCode", "HostelCode") : profileBlockValue;
  const profileRoomValue = read(profile, "roomType", "RoomType", "roomTypeName", "RoomTypeName", "hostelRoom", "HostelRoom", "hostelRoomName", "HostelRoomName") || read(profileHostel, "roomType", "RoomType", "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification");
  const profileRoomType = typeof profileRoomValue === "object" ? read(profileRoomValue, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification", "name", "Name") : profileRoomValue;
  const studentType = String(read(profile, "studentType", "StudentType", "residentialType", "ResidentialType", "residenceType", "ResidenceType") || "");
  const transportRequired = String(read(profile, "transportRequired", "TransportRequired", "isTransportRequired", "IsTransportRequired", "requiresTransport", "RequiresTransport") ?? "");
  const residentialStudent = /^(?:true|2|yes|residential|hostel|hosteller)$/i.test(studentType.trim());
  const nonResidentialStudent = /^(?:false|1|0|no|non-residential|non residential|day scholar|dayscholar)$/i.test(studentType.trim());
  const requiresTransport = /^(?:yes|true|1)$/i.test(transportRequired.trim());
  const hasHostel = Boolean(allocation || profileBlock || residentialStudent);
  const hostelInfo = read(allocation, "hostel", "Hostel", "block", "Block") || {};
  const roomInfo = read(allocation, "room", "Room", "roomType", "RoomType") || {};
  const allocationHostelName = read(allocation, "hostelName", "HostelName", "hostelBlockName", "HostelBlockName", "blockName", "BlockName", "hostelBlock", "HostelBlock") || read(hostelInfo, "hostelName", "HostelName", "blockName", "BlockName", "name", "Name") || profileBlock;
  const allocationRoomType = read(allocation, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification") || read(roomInfo, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification", "name", "Name") || profileRoomType;
  return <div className="sp-page"><StudentPageHeader title="Hostel" subtitle="View your hostel allocation information."/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    <StudentCard title="Hostel Allocation">
      {(!hasHostel && (nonResidentialStudent || requiresTransport || transport)) ? <StudentEmptyState icon={Hotel} title="Hostel not required" text="Your student record indicates you are non-residential. No hostel allocation is active for you."/> : hasHostel ? <div className="sp-detail-grid">{[["Hostel Block", allocationHostelName || "—", Hotel], ["Room Type", allocationRoomType || "—", Hotel], ["Room", read(allocation, "roomNumber", "RoomNumber", "roomNo", "RoomNo") || read(student, "hostelRoomNumber", "HostelRoomNumber") || "—", Hotel], ["Bed", read(allocation, "bedNumber", "BedNumber", "bedNo", "BedNo") || "—", Hotel], ["Joining Date", read(allocation, "joiningDate", "JoiningDate", "allocationDate", "AllocationDate") || "—", Hotel], ["Status", read(allocation, "status", "Status", "allocationStatus", "AllocationStatus") || "Active", Hotel]].map(([label, value, Icon]) => <div key={label}><Icon size={17}/><span>{label}</span><strong>{value}</strong></div>)}</div> : error ? null : <StudentEmptyState icon={Hotel} title="No Hostel Allocation" text="No active hostel allocation was found for your student record."/>}
    </StudentCard>
  </div>;
}

