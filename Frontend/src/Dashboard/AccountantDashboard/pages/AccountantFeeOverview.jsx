import { useCallback, useState } from "react";
import { AlertCircle, CalendarClock, ReceiptText, Users, WalletCards } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useFinancePage, rowsOf } from "../accountantData.js";
import { loadFeeOverview } from "../accountantFeeRequests.js";
import { feeCompactMoney, feeDate, feeMoney, feeText, pageOf, readFee, splitFeeSchedules } from "../feeViewData.js";
import { FeeBadge, FeeCard, FeeLoadState, FeeNotice, FeePagination, FeeTable } from "./AccountantFeeUI.jsx";

const overviewTabs = [["overdue", "Overdue Fees", AlertCircle], ["upcoming", "Upcoming Fee Schedules", CalendarClock], ["recent", "Recent Payments", ReceiptText]];
const colors = ["var(--cms-primary)", "var(--cms-green)", "var(--cms-amber)"];
const numeric = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : undefined;
const sum = (rows, key) => rows.length && rows.every((row) => numeric(readFee(row, key)) !== undefined) ? rows.reduce((total, row) => total + Number(readFee(row, key)), 0) : undefined;

function SummaryCard({ icon: Icon, label, value, hint, tone, onClick }) {
  const Tag = onClick ? "button" : "div";
  return <Tag className={`cms-fee-stat tone-${tone} ${onClick ? "is-clickable" : ""}`} type={onClick ? "button" : undefined} onClick={onClick}><span className="cms-fee-stat-icon"><Icon size={16} /></span><div><span className="cms-fee-stat-label">{label}</span><strong className="cms-fee-stat-value">{value}</strong>{hint ? <small>{hint}</small> : null}</div></Tag>;
}

export default function AccountantFeeOverview({ params }) {
  const [tab, setTab] = useState("overdue");
  const [pageNumber, setPageNumber] = useState(1);
  const [group, setGroup] = useState("");
  const load = useCallback((signal) => loadFeeOverview(params, signal), [params]);
  const state = useFinancePage(load);
  const dashboard = state.data?.dashboard;
  const due = state.data?.due ?? (dashboard ? rowsOf(readFee(dashboard, "upcomingSchedules")) : []);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const schedules = splitFeeSchedules(due, today);
  const hasSchedules = state.data?.due != null || readFee(dashboard, "upcomingSchedules") != null;
  const recent = rowsOf(readFee(dashboard, "recentPayments"));
  const chart = rowsOf(readFee(dashboard, "groupWiseCollection"));
  const groupNames = [...new Set(chart.map((row) => readFee(row, "groupName")).filter(Boolean))].sort();
  const selected = group ? chart.filter((row) => readFee(row, "groupName") === group) : chart;
  const chartTotals = ["expected", "collected", "outstanding"].map((key) => ({ name: key[0].toUpperCase() + key.slice(1), value: sum(selected, key), key }));
  const pie = chartTotals.filter((item) => item.value > 0);
  const rows = tab === "recent" ? recent : schedules[tab];
  const page = pageOf(rows, pageNumber);
  const tableError = tab === "recent" ? state.data?.errors.dashboard
    : tab === "overdue" ? state.data?.errors.due
      : !hasSchedules ? state.data?.errors.due || state.data?.errors.dashboard || "Fee schedule data is unavailable." : "";
  const count = (key) => numeric(readFee(dashboard, key));
  const chooseTab = (value) => { setTab(value); setPageNumber(1); };
  const dueColumns = [
    { label: "Student", value: (row) => <strong>{feeText(row, "studentName")}</strong> },
    { label: "Admission No", value: (row) => feeText(row, "admissionNumber") },
    { label: "Group / Section", value: (row) => `${feeText(row, "groupName")} / ${feeText(row, "sectionName")}` },
    { label: "Fee Schedule", value: (row) => feeText(row, "feeSchedule") },
    { label: "Due Date", value: (row) => feeDate(readFee(row, "dueDate")) },
    { label: "Amount", num: true, value: (row) => feeMoney(readFee(row, "balance") ?? readFee(row, "amount")) },
    { label: "Status", value: (row) => <FeeBadge status={readFee(row, "status")} /> },
  ];
  const recentColumns = [
    { label: "Receipt No", value: (row) => <strong>{feeText(row, "receiptNumber")}</strong> },
    { label: "Student", value: (row) => feeText(row, "studentName") },
    { label: "Payment Type", value: (row) => feeText(row, "paymentType") },
    { label: "Amount", num: true, value: (row) => feeMoney(readFee(row, "amount")) },
    { label: "Payment Method", value: (row) => feeText(row, "paymentMethod") },
    { label: "Date", value: (row) => feeDate(readFee(row, "paymentDate")) },
  ];
  return <div className="cms-fee-stack">
    <FeeLoadState state={state} />
    {state.data?.errors.dashboard ? <FeeNotice error>{state.data.errors.dashboard}</FeeNotice> : null}
    {state.data?.errors.due ? <FeeNotice error>{state.data.errors.due}</FeeNotice> : null}
    <div className="cms-fee-stat-grid">
      <SummaryCard icon={Users} tone="blue" label="Total Students" value={count("totalStudents") == null ? "-" : `${count("totalStudents")} Students`} hint="With active fee accounts" />
      <SummaryCard icon={WalletCards} tone="green" label="Total Collected" value={feeCompactMoney(readFee(dashboard, "totalCollected"))} hint={count("collectionPercentage") == null ? undefined : `${count("collectionPercentage").toFixed(1)}% of expected`} onClick={() => chooseTab("recent")} />
      <SummaryCard icon={AlertCircle} tone="red" label="Pending / Overdue" value={count("pendingStudents") == null ? "-" : `${count("pendingStudents")} Students`} hint={count("overdueStudents") == null ? undefined : `${count("overdueStudents")} overdue`} onClick={() => chooseTab("overdue")} />
      <SummaryCard icon={CalendarClock} tone="amber" label="Upcoming Fees" value={state.loading || !hasSchedules ? "-" : `${schedules.upcoming.length} Schedules`} hint="Unpaid schedules due today or later" onClick={() => chooseTab("upcoming")} />
    </div>
    <FeeCard title="Group-wise Collection" action={<label className="cms-fee-chart-filter"><span>Group</span><select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">All Groups</option>{groupNames.map((value) => <option key={value}>{value}</option>)}</select></label>}>
      <div className="cms-fee-chart cms-fee-donut">
        {pie.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} isAnimationActive={false}>{pie.map((item) => <Cell key={item.key} fill={colors[chartTotals.findIndex((total) => total.key === item.key)]} />)}</Pie><Tooltip formatter={(value) => feeMoney(value)} contentStyle={{ borderRadius: 10, border: "1px solid var(--cms-border)", background: "var(--cms-surface)", color: "var(--cms-text)", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer> : <div className="cms-fee-empty-row">{state.loading ? "Loading collection chart..." : "No collection chart data available."}</div>}
        <div className="cms-fee-chart-summary">{chartTotals.map((item) => <span key={item.key}>{item.name}<strong>{feeMoney(item.value)}</strong></span>)}</div>
      </div>
    </FeeCard>
    <FeeCard title="Fee Management Overview" className="cms-fee-overview-card" bodyClass="cms-fee-overview-shell">
      <div className="cms-fee-overview-tabs" aria-label="Fee Management Overview">{overviewTabs.map(([key, label, Icon]) => <button key={key} type="button" aria-current={tab === key ? "page" : undefined} className={`cms-fee-overview-tab ${tab === key ? "is-active" : ""}`} onClick={() => chooseTab(key)}><Icon size={15} />{label}</button>)}</div>
      <div className="cms-fee-overview-content"><FeeTable rows={page.rows} columns={tab === "recent" ? recentColumns : dueColumns} className={tab === "recent" ? "cms-fee-recent-payments-table" : "cms-fee-schedule-list-table"} loading={state.loading} error={tableError} empty={tab === "recent" ? "No recent payments." : tab === "overdue" ? "No overdue fee schedules." : "No pending fee schedules."} />
        {!state.loading && !tableError ? <FeePagination page={page} onPage={setPageNumber} /> : null}
      </div>
    </FeeCard>
  </div>;
}
