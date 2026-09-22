import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast, useForm } from "@/components/common/Ui.jsx";
import { getApiErrorMessage } from "@/api/axios.js";
import { addRow, configFor, getRow, updateRow } from "@/data/store.js";

export default function FormPage({ slug, config, id = null, secondary = false, listPath }) {
  const sectionConfig = configFor(config, secondary);
  const navigate = useNavigate();
  const usesApi = Boolean(sectionConfig?.api);
  const existing = !usesApi && id ? getRow(slug, secondary, id, config) : null;
  const [fields, setFields] = useState(sectionConfig.fields);
  const { values, errors, setValue, validate, setValues, setErrors } = useForm(fields, existing || {});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(usesApi && Boolean(id));
  const [toast, setToast] = useState("");

  const mode = id ? "Edit" : "Add";
  const label = sectionConfig.formLabel || (sectionConfig.addLabel || sectionConfig.title).replace(/^Add\s+/, "").replace(/^Create\s+/, "");
  const submitLabel = id ? sectionConfig.updateLabel || `Update ${label}` : sectionConfig.saveLabel || `Save ${label}`;
  const backLabel = sectionConfig.backLabel || sectionConfig.title;

  useEffect(() => {
    let ignore = false;

    const loadFormData = async () => {
      setLoading(Boolean(id));
      try {
        const [baseFields, loadedRecord] = await Promise.all([
          usesApi && sectionConfig.api.loadFields ? sectionConfig.api.loadFields(sectionConfig.fields) : sectionConfig.fields,
          usesApi && id && sectionConfig.api.fetchRow
            ? sectionConfig.api.fetchRow(id)
            : usesApi && id && sectionConfig.api.getById
              ? sectionConfig.api.getById(id).then((response) => sectionConfig.api.toRow ? sectionConfig.api.toRow(response.data) : response.data)
              : null,
        ]);
        const loadedFields = await Promise.all(baseFields.map(async (field) => {
          if (!field.loadOptions || field.dependsOn) return field;
          try {
            const response = await field.loadOptions();
            const options = field.getOptions ? field.getOptions(response) : response.data;
            return Array.isArray(options) ? { ...field, options } : field;
          } catch {
            // Keep the form usable if one dynamic option source is unavailable.
            return field;
          }
        }));
        if (ignore) return;
        setFields(loadedFields);
        if (loadedRecord) setValues(loadedRecord);
      } catch (error) {
        if (!ignore) setToast(getApiErrorMessage(error));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadFormData();
    return () => { ignore = true; };
  }, [id, sectionConfig, setValues, usesApi]);

  // Reload select options that depend on another form field, such as State
  // after Country changes. These are intentionally separate from the first
  // lookup load because the parent field must resolve first.
  const getDependsOnKeys = (field) => (Array.isArray(field.dependsOn) ? field.dependsOn : [field.dependsOn]);

  const dependentFieldValues = (sectionConfig.fields || [])
    .filter((field) => field.dependsOn)
    .map((field) => getDependsOnKeys(field).map((key) => values[key] ?? "").join("\u0001"))
    .join("\u0000");

  useEffect(() => {
    const dependentFields = (sectionConfig.fields || []).filter((field) => field.dependsOn);
    if (!dependentFields.length) return undefined;

    let ignore = false;
    Promise.all(dependentFields.map(async (field) => {
      const keys = getDependsOnKeys(field);
      const hasAllValues = keys.every((key) => values[key]);
      if (!hasAllValues) return { name: field.name, options: [], autoValue: undefined };
      try {
        const response = await field.loadOptions(values);
        const options = field.getOptions ? field.getOptions(response) : response.data;
        const autoValue = field.autoSelect ? field.autoSelect(values, options) : undefined;
        return { name: field.name, options: Array.isArray(options) ? options : [], autoValue };
      } catch {
        return { name: field.name, options: [], autoValue: undefined };
      }
    })).then((results) => {
      if (ignore) return;
      const optionsByField = Object.fromEntries(results.map(({ name, options }) => [name, options]));
      setFields((current) => current.map((field) => (
        Object.prototype.hasOwnProperty.call(optionsByField, field.name)
          ? { ...field, options: optionsByField[field.name] }
          : field
      )));
      results.forEach(({ name, autoValue }) => {
        if (autoValue !== undefined) setValue(name, autoValue);
      });
    });


    return () => { ignore = true; };
  }, [dependentFieldValues, sectionConfig, values]);

  useEffect(() => {
    if (!sectionConfig.deriveValues) return;
    const derivedValues = sectionConfig.deriveValues(values) || {};
    Object.entries(derivedValues).forEach(([name, value]) => {
      if (String(values[name] ?? "") !== String(value ?? "")) setValue(name, value);
    });
  }, [sectionConfig, setValue, values]);

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (usesApi) {
        if (sectionConfig.api.validateValues) {
          const validationErrors = await sectionConfig.api.validateValues(values, id);
          if (validationErrors && Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            return;
          }
        }
        if (sectionConfig.api.saveRow) {
          await sectionConfig.api.saveRow(values, id);
        } else {
          const payload = sectionConfig.api.toPayload ? sectionConfig.api.toPayload(values) : values;
          if (id && sectionConfig.api.update) await sectionConfig.api.update(id, payload);
          else if (sectionConfig.api.create) await sectionConfig.api.create(payload);
        }
      } else if (id) {
        updateRow(slug, secondary, id, values, config);
      } else {
        addRow(slug, secondary, values, config);
      }
      setToast(`${label} ${id ? "updated" : "created"} successfully`);
      navigate(listPath);
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={`${mode} ${label}`} subtitle={`Fill in the details below and save to ${id ? "update this" : "create a new"} record.`} breadcrumb={[sectionConfig.title]}>
      <div className="cms-form-page">
        <Link to={listPath} className="cms-back-link"><ArrowLeft size={15} /> Back to {backLabel}</Link>
        <form className="cms-card" onSubmit={submit} noValidate>
          <div className="cms-card-body">
            {loading ? (
              <div className="cms-empty">Loading record...</div>
            ) : (
              <div className="cms-form-grid">
                {fields.map((field) => <Field key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={setValue} />)}
              </div>
            )}
            <div className="cms-form-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate(listPath)}>Cancel</button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={saving || loading}>{saving ? "Saving..." : submitLabel}</button>
            </div>
          </div>
        </form>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}