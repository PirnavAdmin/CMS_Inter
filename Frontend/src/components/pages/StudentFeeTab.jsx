import { useEffect, useState } from "react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { SkeletonTable } from "@/components/common/Ui.jsx";
import { formatCurrency, formatDate } from "@/data/feeManagementData.js";

import "./StudentAdmissionPage.css";

const COURSE_PAYMENT_PLANS = ["Full Payment", "Installment Payment"];

const getObject = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (data?.data && !Array.isArray(data.data)) return data.data;
  if (data?.Data && !Array.isArray(data.Data)) return data.Data;
  if (data && !Array.isArray(data)) return data;
  return {};
};

const read = (item, ...keys) => {
  const key = keys.find(
    (candidate) =>
      item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "",
  );
  return key ? item[key] : undefined;
};

const isSchemaPlaceholder = (value) => {
  if (typeof value !== "string") return false;
  return ["string", "number", "integer", "object", "array", "boolean"].includes(
    value.trim().toLowerCase(),
  );
};

const readText = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "" || isSchemaPlaceholder(value))
    return "";
  if (typeof value === "object") return "";
  return String(value);
};

const readNumber = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "" || isSchemaPlaceholder(value))
    return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const getFeeTypeName = (item) => {
  const directName = readText(
    item,
    "feeTypeName",
    "FeeTypeName",
    "feeName",
    "FeeName",
    "name",
    "Name",
    "displayName",
    "DisplayName",
    "label",
    "Label",
  );
  if (directName) return directName;

  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  if (typeof feeType === "string") return isSchemaPlaceholder(feeType) ? "" : feeType;
  if (!feeType || typeof feeType !== "object") return "";

  return readText(
    feeType,
    "feeTypeName",
    "FeeTypeName",
    "name",
    "Name",
    "displayName",
    "DisplayName",
    "label",
    "Label",
    "title",
    "Title",
  );
};

const getNestedRows = (item, ...keys) => {
  const value = read(item, ...keys);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.Data)) return value.Data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.Items)) return value.Items;
  return [];
};

const feeTypeIdentity = (item) => {
  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  return [
    getFeeTypeName(item),
    readText(item, "feeTypeCode", "FeeTypeCode", "code", "Code"),
    readText(feeType, "feeTypeCode", "FeeTypeCode", "code", "Code"),
  ]
    .join(" ")
    .toLowerCase();
};

const isFacilityFeeItem = (item) => {
  const identity = feeTypeIdentity(item);
  return identity.includes("hostel") || identity.includes("transport");
};

const normalizeCoursePaymentPlan = (source, hasInstallments = false) => {
  const value =
    typeof source === "object" && source !== null
      ? read(
          source,
          "planName",
          "PlanName",
          "name",
          "Name",
          "paymentPlanName",
          "PaymentPlanName",
          "paymentPlan",
          "PaymentPlan",
        )
      : source;
  const text = typeof value === "object" ? "" : String(value || "").trim();
  const normalized = text.toLowerCase();
  if (normalized.includes("installment") || normalized.includes("schedule"))
    return "Installment Payment";
  if (normalized.includes("full")) return "Full Payment";
  if (COURSE_PAYMENT_PLANS.includes(text)) return text;
  return hasInstallments ? "Installment Payment" : "";
};

const persistedFeeSources = (payload) => {
  const root = getObject(payload);
  return [
    root,
    read(
      root,
      "studentFee",
      "StudentFee",
      "feeDetails",
      "FeeDetails",
      "feeAccount",
      "FeeAccount",
      "admissionFeeSelection",
      "AdmissionFeeSelection",
      "feeSelection",
      "FeeSelection",
      "assignment",
      "Assignment",
    ),
  ].filter((source) => source && typeof source === "object");
};

const STUDENT_FEE_COMPONENT_KEYS = [
  "feeItems",
  "FeeItems",
  "selectedFeeItems",
  "SelectedFeeItems",
  "admissionFeeItems",
  "AdmissionFeeItems",
  "selectedFeeComponents",
  "SelectedFeeComponents",
  "selectedComponents",
  "SelectedComponents",
  "selectedFeeStructureComponents",
  "SelectedFeeStructureComponents",
  "feeBreakdown",
  "FeeBreakdown",
  "breakdown",
  "Breakdown",
  "lineItems",
  "LineItems",
  "feeDetails",
  "FeeDetails",
  "feeComponents",
  "FeeComponents",
  "components",
  "Components",
];
const STUDENT_FEE_SCHEDULE_KEYS = [
  "installments",
  "Installments",
  "schedules",
  "Schedules",
  "scheduledFees",
  "ScheduledFees",
  "courseSchedules",
  "CourseSchedules",
  "feeSchedules",
  "FeeSchedules",
  "paymentSchedules",
  "PaymentSchedules",
];

const componentKeys = [...STUDENT_FEE_COMPONENT_KEYS, "items", "Items"];
const scheduleKeys = STUDENT_FEE_SCHEDULE_KEYS;
const money = (row, ...keys) => {
  const amount = readNumber(row, ...keys);
  return amount === null ? "—" : formatCurrency(amount);
};
const amountColumns = [
  [
    "Original Amount",
    [
      "originalAmount",
      "OriginalAmount",
      "amount",
      "Amount",
      "feeAmount",
      "FeeAmount",
      "totalAmount",
      "TotalAmount",
      "baseAmount",
      "BaseAmount",
    ],
  ],
  [
    "Concession",
    [
      "concessionAmount",
      "ConcessionAmount",
      "discountAmount",
      "DiscountAmount",
      "concession",
      "Concession",
      "discount",
      "Discount",
      "scholarshipAmount",
      "ScholarshipAmount",
    ],
  ],
  [
    "Payable Amount",
    [
      "payableAmount",
      "PayableAmount",
      "netPayable",
      "NetPayable",
      "netAmount",
      "NetAmount",
      "payable",
      "Payable",
      "finalAmount",
      "FinalAmount",
    ],
  ],
  [
    "Paid Amount",
    [
      "paidAmount",
      "PaidAmount",
      "amountPaid",
      "AmountPaid",
      "totalPaid",
      "TotalPaid",
      "paid",
      "Paid",
    ],
  ],
  [
    "Balance",
    [
      "balanceAmount",
      "BalanceAmount",
      "remainingBalance",
      "RemainingBalance",
      "balance",
      "Balance",
      "outstandingBalance",
      "OutstandingBalance",
      "outstandingAmount",
      "OutstandingAmount",
      "dueAmount",
      "DueAmount",
      "pendingAmount",
      "PendingAmount",
    ],
  ],
];
const status = (row) => readText(row, "paymentStatus", "PaymentStatus", "status", "Status") || "—";
function ComponentsTable({ title, rows }) {
  if (!rows.length) return null;
  return (
    <section className="cms-fee-block">
      <h3>{title}</h3>
      <div className="cms-fee-scroll">
        <table className="cms-fee-table">
          <thead>
            <tr>
              <th>Fee Type</th>
              {amountColumns.map(([label]) => (
                <th className="num" key={label}>
                  {label}
                </th>
              ))}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>{getFeeTypeName(row) || "—"}</td>
                {amountColumns.map(([label, keys]) => (
                  <td className="num" key={label}>
                    {money(row, ...keys)}
                  </td>
                ))}
                <td>{status(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const facilityRows = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  return Array.isArray(data)
    ? data
    : getNestedRows(data, "items", "Items", "$values", "data", "Data", "results", "Results");
};
const facilityActive = (row) =>
  ![false, 0, "false", "0", "inactive", "disabled"].includes(
    typeof (row.isActive ?? row.IsActive ?? row.status ?? row.Status) === "string"
      ? String(row.isActive ?? row.IsActive ?? row.status ?? row.Status).toLowerCase()
      : (row.isActive ?? row.IsActive ?? row.status ?? row.Status),
  );
const facilityMatches = (selected, ...candidates) =>
  Boolean(selected) &&
  candidates.some(
    (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase() === String(selected).trim().toLowerCase(),
  );
async function loadFacilityFee(studentId) {
  const response = await apiClient.get(apiEndpoints.students.getById(studentId), {
    skipGlobalLoader: true,
  });
  const record = getObject(response.data);
  const nested = record.student ?? record.Student ?? record;
  const allocation = nested.allocation ?? nested.Allocation ?? nested.residentialAllocation ?? {};
  const transport = nested.transport ?? nested.Transport ?? nested.transportDetails ?? {};
  const hostel = nested.hostel ?? nested.Hostel ?? nested.hostelDetails ?? {};
  const sources = [nested, record, allocation, transport, hostel,
    nested.route ?? nested.Route ?? transport.route ?? transport.Route,
    nested.pickupPoint ?? nested.PickupPoint ?? transport.pickupPoint ?? transport.PickupPoint,
    nested.hostelBlock ?? nested.HostelBlock ?? hostel.block ?? hostel.Block,
    nested.hostelRoom ?? nested.HostelRoom ?? hostel.room ?? hostel.Room,
  ].filter((row) => row && typeof row === "object");
  const text = (...keys) => sources.map((row) => readText(row, ...keys)).find(Boolean) || "";
  const type = text(
    "studentType",
    "StudentType",
    "residentialType",
    "ResidentialType",
    "isResidential",
    "IsResidential",
  ).toLowerCase();
  if (["residential", "hostel", "hosteller", "true", "2"].includes(type)) {
    const result = await apiClient.get(apiEndpoints.hostel.fees, { skipGlobalLoader: true });
    const block = text(
      "hostelId",
      "HostelId",
      "hostelBlock",
      "HostelBlock",
      "hostelName",
      "HostelName",
      "hostelBlockName",
      "HostelBlockName",
    );
    const room = text(
      "roomTypeId",
      "RoomTypeId",
      "hostelRoomTypeId",
      "HostelRoomTypeId",
      "hostelRoom",
      "HostelRoom",
      "roomTypeName",
      "RoomTypeName",
      "hostelRoomName",
      "HostelRoomName",
    );
    const fee = facilityRows(result.data).find(
      (row) =>
        facilityActive(row) &&
        facilityMatches(block, row.hostelId, row.HostelId, row.hostelName, row.HostelName) &&
        facilityMatches(
          room,
          row.roomTypeId,
          row.RoomTypeId,
          row.roomTypeName,
          row.RoomTypeName,
          row.roomTypeSpecification,
          row.RoomTypeSpecification,
        ),
    );
    if (!fee)
      return { error: "No hostel fee is configured for this student's hostel and room type." };
    const amount = readNumber(fee, "hostelFeeAmount", "HostelFeeAmount", "feeAmount", "FeeAmount");
    const deposit = readNumber(fee, "securityDeposit", "SecurityDeposit");
    const total =
      readNumber(fee, "totalFee", "TotalFee") ||
      (amount !== null || deposit !== null ? (amount ?? 0) + (deposit ?? 0) : null);
    return {
      fee: {
        type: "Hostel Fee",
        amount: total,
        plan: readText(fee, "feeFrequency", "FeeFrequency") || "Monthly",
        detail: [
          readText(fee, "hostelName", "HostelName"),
          readText(fee, "roomTypeName", "RoomTypeName"),
          amount !== null ? "Hostel Fee: " + formatCurrency(amount) : "",
          deposit !== null ? "Security Deposit: " + formatCurrency(deposit) : "",
        ]
          .filter(Boolean)
          .join(" | "),
      },
    };
  }
  if (
    ![
      "non-residential",
      "non residential",
      "day scholar",
      "dayscholar",
      "false",
      "1",
      "0",
    ].includes(type) ||
    !["yes", "true", "1"].includes(
      text(
        "transportRequired",
        "TransportRequired",
        "isTransportRequired",
        "IsTransportRequired",
      ).toLowerCase(),
    )
  )
    return {};
  const campusId = text("campusId", "CampusId");
  const result = await apiClient.get(apiEndpoints.transport.pickupPoints, {
    params: { ...(campusId ? { CampusId: campusId } : {}), PageNumber: 1, PageSize: 1000 },
    skipGlobalLoader: true,
  });
  const pickup = text(
    "pickupPointId",
    "PickupPointId",
    "pickupPoint",
    "PickupPoint",
    "pickupPointName",
    "PickupPointName",
  );
  const route = text(
    "routeId",
    "RouteId",
    "busRouteId",
    "BusRouteId",
    "busRoute",
    "BusRoute",
    "routeName",
    "RouteName",
    "busRouteName",
    "BusRouteName",
  );
  const point = facilityRows(result.data).find(
    (row) =>
      facilityActive(row) &&
      facilityMatches(
        pickup,
        row.pickupPointId,
        row.PickupPointId,
        row.stopName,
        row.StopName,
        row.pickupPointName,
        row.PickupPointName,
      ) &&
      (!route ||
        !(row.routeId ?? row.RouteId ?? row.routeName ?? row.RouteName) ||
        facilityMatches(route, row.routeId, row.RouteId, row.routeName, row.RouteName)),
  );
  if (!point)
    return { error: "No transport fee is configured for this student's route and pickup point." };
  return {
    fee: {
      type: "Transport Fee",
      amount: readNumber(point, "monthlyFee", "MonthlyFee", "fare", "Fare"),
      plan: "Monthly",
      detail: readText(point, "stopName", "StopName", "pickupPointName", "PickupPointName"),
    },
  };
}

export default function StudentFeeTab({ student }) {
  const studentId = student.studentId;
  const [state, setState] = useState({ loading: true, payload: null, error: "" });
  const [retry, setRetry] = useState(0);
  const [facility, setFacility] = useState({ loading: true });
  useEffect(() => {
    let active = true;
    setFacility({ loading: true });
    loadFacilityFee(studentId)
      .then((result) => {
        if (active) setFacility(result);
      })
      .catch((error) => {
        if (active)
          setFacility({ error: getApiErrorMessage(error, "Unable to load facility fees.") });
      });
    return () => {
      active = false;
    };
  }, [studentId, retry]);
  useEffect(() => {
    let active = true;
    setState({ loading: true, payload: null, error: "" });
    apiClient
      .get(apiEndpoints.fee.studentFeeDetailsByStudent(studentId), { skipGlobalLoader: true })
      .then(({ data }) => {
        if (active) setState({ loading: false, payload: data, error: "" });
      })
      .catch((error) => {
        if (active)
          setState({
            loading: false,
            payload: null,
            error:
              error?.response?.status === 404
                ? ""
                : getApiErrorMessage(error, "Unable to load student fee details."),
          });
      });
    return () => {
      active = false;
    };
  }, [studentId, retry]);
  const sources = persistedFeeSources(state.payload);
  const account = Object.assign({}, ...sources.slice().reverse());
  const components =
    sources.map((source) => getNestedRows(source, ...componentKeys)).find((rows) => rows.length) ||
    [];
  const planSource =
    account.paymentPlan ??
    account.PaymentPlan ??
    account.planName ??
    account.PlanName ??
    account.paymentPlanName ??
    account.PaymentPlanName ??
    account.feePaymentPlan ??
    account.FeePaymentPlan ??
    account.plan ??
    account.Plan;
  const schedules =
    [planSource, ...sources]
      .map((source) => getNestedRows(source, ...scheduleKeys))
      .find((rows) => rows.length) || [];
  const plan = normalizeCoursePaymentPlan(planSource, schedules.length > 0);
  const scholarship =
    account.scholarship ??
    account.Scholarship ??
    account.concessionDetails ??
    account.ConcessionDetails ??
    account.concession ??
    account.Concession;
  const concession = {
    ...account,
    ...(scholarship && typeof scholarship === "object" ? scholarship : {}),
  };
  const scholarshipName = readText(
    concession,
    "scholarshipName",
    "ScholarshipName",
    "concessionName",
    "ConcessionName",
    "schemeName",
    "SchemeName",
  );
  const concessionAmount = readNumber(
    concession,
    "concessionAmount",
    "ConcessionAmount",
    "discountAmount",
    "DiscountAmount",
  );
  const hasAccount =
    components.length ||
    schedules.length ||
    readText(
      account,
      "studentFeeAssignmentId",
      "StudentFeeAssignmentId",
      "studentFeeId",
      "StudentFeeId",
      "feeAccountId",
      "FeeAccountId",
      "assignmentId",
      "AssignmentId",
    ) ||
    amountColumns.some(([, keys]) => readNumber(account, ...keys) !== null) ||
    readNumber(
      account,
      "totalPayable",
      "TotalPayable",
      "originalFee",
      "OriginalFee",
      "totalFee",
      "TotalFee",
    ) !== null;
  const context = [
    ["Student", student.name],
    ["Admission No", student.admissionNo],
    ["Academic Year", student.academicYear],
    ["Board", readText(student, "boardName", "BoardName", "board")],
    ["Academic Level", student.level],
    ["Group", student.group],
    ["Program", student.programme],
    ["Section", student.section],
  ];
  return (
    <div
      className="cms-fee-step student-profile-fee"
      role="tabpanel"
      id="student-fee-panel"
      aria-labelledby="student-fee-tab"
    >
      <div className="cms-fee-context">
        {context.map(([label, text]) => (
          <div className="cms-fee-context-item" key={label}>
            <span>{label}</span>
            <strong>
              {typeof text === "string" || typeof text === "number" ? text || "—" : "—"}
            </strong>
          </div>
        ))}
      </div>
      {facility.loading ? (
        <SkeletonTable columns={4} rows={1} />
      ) : facility.error ? (
        <section className="cms-fee-block" role="alert">
          <p>{facility.error}</p>
          <button
            type="button"
            className="cms-btn cms-btn-secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry
          </button>
        </section>
      ) : facility.fee &&
        !components.some(
          (row) =>
            isFacilityFeeItem(row) &&
            getFeeTypeName(row)
              .toLowerCase()
              .includes(facility.fee.type.toLowerCase().split(" ")[0]),
        ) ? (
        <section className="cms-fee-block">
          <h3>Applicable Facility Fees</h3>
          <div className="cms-fee-scroll">
            <table className="cms-fee-table">
              <thead>
                <tr>
                  <th>Fee Type</th>
                  <th>Plan</th>
                  <th>Details</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{facility.fee.type}</td>
                  <td>{facility.fee.plan}</td>
                  <td>{facility.fee.detail || "?"}</td>
                  <td className="num">
                    {facility.fee.amount === null ? "?" : formatCurrency(facility.fee.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {state.loading ? (
        <SkeletonTable columns={7} rows={4} />
      ) : state.error ? (
        <section className="cms-fee-block" role="alert">
          <p>{state.error}</p>
          <button
            className="cms-btn cms-btn-secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry
          </button>
        </section>
      ) : !hasAccount ? (
        <section className="cms-fee-block">
          <p className="cms-fee-empty">No fee details are assigned to this student.</p>
        </section>
      ) : (
        <>
          <ComponentsTable
            title="Applicable Fee Structure"
            rows={components.filter((item) => !isFacilityFeeItem(item))}
          />
          <ComponentsTable
            title="Applicable Facility Fees"
            rows={components.filter(isFacilityFeeItem)}
          />
          {scholarshipName ||
          concessionAmount > 0 ||
          readText(concession, "discountType", "DiscountType") ? (
            <section className="cms-fee-block">
              <h3>Scholarship / Concession</h3>
              <div className="cms-fee-kv-grid">
                <div>
                  <span>Name</span>
                  <strong>{scholarshipName || "—"}</strong>
                </div>
                <div>
                  <span>Discount Type</span>
                  <strong>{readText(concession, "discountType", "DiscountType") || "—"}</strong>
                </div>
                <div>
                  <span>Discount Value</span>
                  <strong>
                    {readText(concession, "discountType", "DiscountType")
                      .toLowerCase()
                      .includes("percent")
                      ? `${readNumber(concession, "discountValue", "DiscountValue") ?? "—"}%`
                      : money(concession, "discountValue", "DiscountValue")}
                  </strong>
                </div>
                <div>
                  <span>Concession Amount</span>
                  <strong>
                    {money(
                      concession,
                      "concessionAmount",
                      "ConcessionAmount",
                      "discountAmount",
                      "DiscountAmount",
                    )}
                  </strong>
                </div>
                <div>
                  <span>Fee After Concession</span>
                  <strong>
                    {money(
                      account,
                      "payableAmount",
                      "PayableAmount",
                      "netPayable",
                      "NetPayable",
                      "totalPayable",
                      "TotalPayable",
                    )}
                  </strong>
                </div>
              </div>
            </section>
          ) : null}
          <section className="cms-fee-block">
            <h3>Course Fee Payment Plan</h3>
            <strong>
              {plan === "Full Payment"
                ? "Full Course Payment"
                : plan === "Installment Payment"
                  ? "Course Fee Schedule"
                  : "Not provided"}
            </strong>
          </section>
          {plan === "Installment Payment" && schedules.length > 0 ? (
            <section className="cms-fee-block">
              <h3>Course Fee Schedule</h3>
              <div className="cms-fee-scroll">
                <table className="cms-fee-table student-profile-fee-schedule">
                  <colgroup>
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "17%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Schedule</th>
                      <th>Due Date</th>
                      <th className="num">Amount</th>
                      <th className="num">Paid Amount</th>
                      <th className="num">Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((row, index) => (
                      <tr key={index}>
                        <td>
                          {readText(
                            row,
                            "no",
                            "No",
                            "installmentNo",
                            "InstallmentNo",
                            "scheduleNo",
                            "ScheduleNo",
                          ) || index + 1}
                        </td>
                        <td>
                          {formatDate(readText(row, "dueDate", "DueDate", "date", "Date")) || "—"}
                        </td>
                        <td className="num">
                          {money(
                            row,
                            "amount",
                            "Amount",
                            "installmentAmount",
                            "InstallmentAmount",
                            "scheduledAmount",
                            "ScheduledAmount",
                            "dueAmount",
                            "DueAmount",
                          )}
                        </td>
                        <td className="num">{money(row, ...amountColumns[3][1])}</td>
                        <td className="num">{money(row, ...amountColumns[4][1])}</td>
                        <td>{status(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          <section className="cms-fee-block">
            <h3>Fee Summary</h3>
            <div className="cms-fee-summary">
              {[
                [
                  "Original Fee",
                  [
                    "totalAmount",
                    "TotalAmount",
                    "originalFee",
                    "OriginalFee",
                    "originalAmount",
                    "OriginalAmount",
                    "totalFee",
                    "TotalFee",
                  ],
                ],
                ["Concession", amountColumns[1][1]],
                [
                  "Net Payable",
                  [
                    "payableAmount",
                    "PayableAmount",
                    "netPayable",
                    "NetPayable",
                    "totalPayable",
                    "TotalPayable",
                  ],
                ],
                ["Paid", amountColumns[3][1]],
                ["Balance", amountColumns[4][1]],
              ].map(([label, keys]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{money(account, ...keys)}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
