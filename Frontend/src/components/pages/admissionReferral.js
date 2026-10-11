const campusId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const mapAdmissionReferral = (values, currentCampusId, isReferral, targetCampusId, campusOptions) => {
  const sourceId = campusId(currentCampusId);
  if (!sourceId) throw new Error("Select the current campus before submitting the admission.");
  if (!isReferral) return { ...values, isReferral: false, campus: sourceId, sourceCampusId: null };
  const targetId = campusId(targetCampusId);
  if (!targetId || targetId === sourceId || !campusOptions.some((option) => campusId(option.value) === targetId)) {
    throw new Error("Select an available target campus different from the current campus.");
  }
  return { ...values, isReferral: true, campus: targetId, sourceCampusId: sourceId, admissionNo: null };
};

export const appendReferralFields = (formData, values) => {
  formData.set("IsReferral", String(Boolean(values.isReferral)));
  if (values.isReferral) {
    formData.set("CampusId", String(values.campus));
    formData.set("SourceCampusId", String(values.sourceCampusId));
    // Empty multipart text binds to the nullable admission number; never send "null".
    formData.set("AdmissionNo", "");
  }
};
