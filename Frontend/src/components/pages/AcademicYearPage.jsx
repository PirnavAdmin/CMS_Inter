import * as data from "@/data/mockData.js";
import ListPage from "@/components/pages/ListPage.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./AcademicYearPage.css";

const o = data.options;
const MODULE_SLUG = "academic-years";

const unwrapList = (d) => (Array.isArray(d) ? d : d?.data || d?.items || []);

const mapRow = (r) => ({
  id: r.id ?? r.academicYearId,
  name: r.name ?? r.academicYearName,
  start: r.startDate ?? r.start,
  end: r.endDate ?? r.end,
  admissionStart: r.admissionStartDate ?? r.admissionStart,
  admissionEnd: r.admissionEndDate ?? r.admissionEnd,
  status: r.isActive === false ? "Inactive" : "Active",
});

export const pageConfig = {
  title: "Academic Year",
  subtitle: "Define academic sessions and admission windows.",
  breadcrumb: ["Academics"],
  addLabel: "Add Academic Year",
  rows: data.academicYears,
  columns: [
    { key: "name", label: "Academic Year", strong: true },
    { key: "start", label: "Start Date" },
    { key: "end", label: "End Date" },
    { key: "admissionStart", label: "Admission Start" },
    { key: "admissionEnd", label: "Admission End" },
    { key: "status", label: "Status", badge: true },
  ],
  fields: [
    { name: "name", label: "Academic Year Name", required: true, placeholder: "2025-2026" },
    { name: "start", label: "Start Date", type: "date", required: true },
    { name: "end", label: "End Date", type: "date", required: true },
    { name: "admissionStart", label: "Admission Start Date", type: "date", required: true },
    { name: "admissionEnd", label: "Admission End Date", type: "date", required: true },
    { name: "status", label: "Active", type: "select", options: o.status, required: true },
  ],
  api: {
    fetchRows: async () => {
      const res = await apiClient.get(apiEndpoints.academicYears.getAll);
      return unwrapList(res.data).map(mapRow);
    },
    fetchRow: async (id) => {
      const res = await apiClient.get(apiEndpoints.academicYears.getById(id));
      return mapRow(res.data?.data ?? res.data); // unwrap nested "data" from API envelope
    },
    deleteRow: (id) => apiClient.delete(apiEndpoints.academicYears.delete(id)),
    saveRow: async (values, id) => {
      const payload = {
        academicYearName: values.name,
        startDate: values.start,
        endDate: values.end,
        admissionStartDate: values.admissionStart,
        admissionEndDate: values.admissionEnd,
        isActive: values.status === "Active" || values.status === true,
      };
      if (id) return apiClient.put(apiEndpoints.academicYears.getById(id), payload);
      return apiClient.post(apiEndpoints.academicYears.create, payload);
    },
  },
};

export default function AcademicYearPage() {
  return <ListPage slug={MODULE_SLUG} config={pageConfig} />;
}