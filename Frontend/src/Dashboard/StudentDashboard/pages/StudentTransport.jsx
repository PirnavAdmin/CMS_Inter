import { useEffect, useState } from "react";
import { Bus, Clock3, MapPin, UserRound } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentStatusBadge from "../components/StudentStatusBadge.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";
import { getStudentAllocationProfile } from "../services/studentAcademicService.js";

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const formatPickupTime = (value) => {
  const time = String(value ?? "").trim();
  if (!time) return "—";
  const match = time.match(/^(\d{1,2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  return match ? match[1] : time;
};
const rows = (data) => { const value = unwrap(data); return Array.isArray(value) ? value : value?.items || value?.Items || value?.records || value?.Records || value?.allocations || value?.Allocations || []; };
const isActive = (record) => !/inactive|cancelled|vacated|rejected/i.test(String(read(record, "status", "Status", "allocationStatus", "AllocationStatus") || "Active"));
const hasHostel = (record) => Boolean(read(record, "hostelId", "HostelId", "allocationId", "AllocationId", "roomId", "RoomId")) && isActive(record);
const hasTransport = (record) => Boolean(read(record, "assignmentId", "AssignmentId", "studentTransportAssignmentId", "StudentTransportAssignmentId", "routeId", "RouteId", "routeName", "RouteName", "vehicleNumber", "VehicleNumber")) && !/not required|hosteller|unassigned/i.test(String(read(record, "status", "Status") || ""));

export default function StudentTransport() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [allocation, setAllocation] = useState(null);
  const [hostelAllocation, setHostelAllocation] = useState(null);
  const [allocationProfile, setAllocationProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!student?.studentId) return;
      setLoading(true); setError("");
      try {
        const [transportResult, hostelResult, profileResult] = await Promise.allSettled([
          apiClient.get(studentApiEndpoints.transport.studentDetails, { params: { studentId: student.studentId, academicYear: student.academicYearName } }),
          apiClient.get(studentApiEndpoints.hostel.studentAllocations, { params: { studentId: student.studentId, status: "Active" } }),
          getStudentAllocationProfile(student),
        ]);
        if (!active) return;
        const transportData = transportResult.status === "fulfilled" ? unwrap(transportResult.value.data) : null;
        const transport = Array.isArray(transportData) ? transportData[0] : transportData?.transport ?? transportData?.Transport ?? transportData?.assignment ?? transportData?.Assignment ?? transportData;
        const hostel = hostelResult.status === "fulfilled" ? rows(hostelResult.value.data).find((item) => String(read(item, "studentId", "StudentId")) === String(student.studentId) && hasHostel(item)) : null;
        setHostelAllocation(hostel || null);
        setAllocationProfile(profileResult.status === "fulfilled" ? profileResult.value : student);
        setAllocation(transport && hasTransport(transport) ? transport : null);
        if (transportResult.status === "rejected") setError(getApiErrorMessage(transportResult.reason));
        else if (hostelResult.status === "rejected") setError(`Hostel allocation could not be checked. ${getApiErrorMessage(hostelResult.reason)}`);
      } catch (requestError) { if (active) setError(getApiErrorMessage(requestError)); }
      finally { if (active) setLoading(false); }
    };
    if (!profileLoading) load();
    return () => { active = false; };
  }, [profileLoading, student]);
  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="form" rows={5}/></div>;
  const profile = allocationProfile || student;
  const studentType = String(read(profile, "studentType", "StudentType", "residentialType", "ResidentialType", "residenceType", "ResidenceType") || "");
  const transportRequired = String(read(profile, "transportRequired", "TransportRequired", "isTransportRequired", "IsTransportRequired", "requiresTransport", "RequiresTransport") ?? "");
  const isResidentialStudent = /^(?:true|2|yes|residential|hostel|hosteller)$/i.test(studentType.trim());
  const hosteller = Boolean(hostelAllocation || read(profile, "hostelAllocation", "HostelAllocation", "hostelId", "HostelId", "hostelBlock", "HostelBlock", "hostelBlockName", "HostelBlockName") || isResidentialStudent);
  const transportNotRequired = !/yes|true|1/i.test(transportRequired) && (hosteller || /no|false|0/i.test(transportRequired));
  const profileTransport = read(profile, "transport", "Transport", "transportDetails", "TransportDetails", "transportAllocation", "TransportAllocation", "studentTransport", "StudentTransport") || {};
  const allocationPickupPoint = read(allocation, "pickupPoint", "PickupPoint", "pickupPointDetails", "PickupPointDetails", "assignedPickupPoint", "AssignedPickupPoint", "pickup", "Pickup");
  const profilePickupPoint = read(profileTransport, "pickupPoint", "PickupPoint", "pickupPointDetails", "PickupPointDetails", "assignedPickupPoint", "AssignedPickupPoint", "pickup", "Pickup");
  const pickupTime = formatPickupTime(
    read(allocationPickupPoint, "pickupTime", "PickupTime", "morningPickupTime", "MorningPickupTime", "arrivalTime", "ArrivalTime")
      ?? read(allocation, "pickupTime", "PickupTime", "morningPickupTime", "MorningPickupTime", "arrivalTime", "ArrivalTime", "morningTripTime", "MorningTripTime")
      ?? read(profilePickupPoint, "pickupTime", "PickupTime", "morningPickupTime", "MorningPickupTime", "arrivalTime", "ArrivalTime"),
  );
  const dropTime = formatPickupTime(
    read(allocationPickupPoint, "dropTime", "DropTime", "eveningDropTime", "EveningDropTime")
      ?? read(allocation, "dropTime", "DropTime", "eveningDropTime", "EveningDropTime", "eveningTripTime", "EveningTripTime")
      ?? read(profilePickupPoint, "dropTime", "DropTime", "eveningDropTime", "EveningDropTime"),
  );
  const profileRoute = read(profile, "route", "Route", "busRoute", "BusRoute") || read(profileTransport, "route", "Route", "busRoute", "BusRoute") || {};
  const hasProfileTransport = /yes|true|1/i.test(transportRequired) && Boolean(read(profile, "routeName", "RouteName", "busRouteName", "BusRouteName", "route", "Route", "busRoute", "BusRoute", "pickupPointName", "PickupPointName", "pickupPoint", "PickupPoint") || read(profileRoute, "routeName", "RouteName", "name", "Name"));
  const showTransportDetails = Boolean(allocation || hasProfileTransport);
  const status = read(allocation, "status", "Status", "assignmentStatus", "AssignmentStatus") || "Active";
  const details = [
    ["Bus Type", read(allocation, "busType", "BusType", "vehicleType", "VehicleType") || read(profile, "busType", "BusType", "vehicleType", "VehicleType", "isAC", "IsAC") || "—", Bus],
    ["Route", read(allocation, "routeName", "RouteName", "route", "Route") || read(profile, "routeName", "RouteName", "busRouteName", "BusRouteName") || read(profileRoute, "routeName", "RouteName", "name", "Name", "routeNumber", "RouteNumber") || "—", MapPin],
    ["Pickup Point", read(allocation, "pickupPointName", "PickupPointName", "pickupName", "PickupName") || read(profile, "pickupPointName", "PickupPointName", "pickupName", "PickupName", "pickupPoint", "PickupPoint") || "—", MapPin],
    ["Pickup Time", pickupTime, Clock3],
    ["Drop Time", dropTime, Clock3],
    ["Vehicle", read(allocation, "vehicleNumber", "VehicleNumber", "busNumber", "BusNumber") || "—", Bus],
    ["Driver", read(allocation, "driverName", "DriverName") || "—", UserRound],
    ["Bus Attendant", read(allocation, "attendantName", "AttendantName", "busAttendant", "BusAttendant") || "—", UserRound],
  ];
  return <div className="sp-page"><StudentPageHeader title="Transport" subtitle="Your current college transport allocation."/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    <StudentCard title="Transport Allocation" action={allocation ? <StudentStatusBadge value={status}/> : null}>
      {transportNotRequired ? <StudentEmptyState icon={Bus} title="Transport not required" text={hosteller ? "Your active hostel allocation means college transport is not required." : "Your student record indicates that school transport is not required."}/> : showTransportDetails ? <><div className="sp-service-hero"><span><Bus size={30}/></span><div><h2>{read(allocation, "routeName", "RouteName", "route", "Route") || read(profile, "routeName", "RouteName", "busRouteName", "BusRouteName") || read(profileRoute, "routeName", "RouteName", "name", "Name") || "Assigned Route"}</h2><p>{read(allocation, "routeCode", "RouteCode") || read(profileRoute, "routeCode", "RouteCode") || ""}{read(allocation, "vehicleNumber", "VehicleNumber") ? ` · ${read(allocation, "vehicleNumber", "VehicleNumber")}` : ""}</p></div></div><div className="sp-detail-grid">{details.map(([label, value, Icon]) => <div key={label}><Icon size={17}/><span>{label}</span><strong>{value}</strong></div>)}</div></> : error ? null : <StudentEmptyState icon={Bus} title="No Transport Allocation" text="No active transport allocation was found for your student record."/>}
    </StudentCard>
  </div>;
}
