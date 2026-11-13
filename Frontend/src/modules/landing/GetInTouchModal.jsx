import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Mail,
  MapPin,
  Phone,
  Send,
  X,
  UserRound,
  ListChecks,
  MessageSquareText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import campusImage from "@/assets/campus-hero.jpg";
import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import logo from "@/assets/pirnav-colleges-logo.png";
import enquiryApi from "@/api/enquiryApi.js";
import "./GetInTouchModal.css";

const ENQUIRY_TYPES = [
  "Admissions",
  "Fee Structure & Scholarships",
  "Academic Programmes (MPC, BiPC, CEC, MEC)",
  "Hostel Facility",
  "Transport & Bus Routes",
  "General Enquiry",
  "Other",
];

const emptyValues = {
  fullName: "",
  email: "",
  mobile: "",
  enquiryType: "Admissions",
  subject: "",
  message: "",
};

export function GetInTouchCard({
  contact = {},
  isPageView = false,
  onClose,
  dialogRef,
  fullNameRef,
}) {
  const [config, setConfig] = useState({
    collegeName: contact.collegeName || "Pirnav College",
    contactAddress: contact.contactAddress || "Vijayawada, Andhra Pradesh",
    contactEmail: contact.contactEmail || "support@pirnavcollege.com",
    contactPhone: contact.contactPhone || "+91 9398649798",
    officeHours: "Mon – Sat: 9:00 AM – 5:00 PM",
  });

  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    enquiryApi
      .getPublicContactConfig(contact.campusId)
      .then((data) => {
        if (active && data) {
          setConfig((prev) => ({
            ...prev,
            collegeName: data.collegeName || prev.collegeName,
            contactAddress: data.contactAddress || prev.contactAddress,
            contactEmail: data.contactEmail || prev.contactEmail,
            contactPhone: data.contactPhone || prev.contactPhone,
            officeHours: data.officeHours || prev.officeHours,
          }));
        }
      })
      .catch(() => {
        // Fall back to content defaults
      });

    return () => {
      active = false;
    };
  }, [contact.campusId]);

  const updateField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setErrorMessage("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.fullName.trim() || values.fullName.trim().length < 2) {
      nextErrors.fullName = "Please enter your full name.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }
    const mobileDigits = values.mobile.replace(/\D/g, "");
    if (!/^\+?[\d\s()-]+$/.test(values.mobile.trim()) || mobileDigits.length < 7 || mobileDigits.length > 15) {
      nextErrors.mobile = "Please enter a valid mobile number (7–15 digits).";
    }
    if (!values.enquiryType) {
      nextErrors.enquiryType = "Please select an enquiry category.";
    }
    if (!values.message.trim() || values.message.trim().length < 5) {
      nextErrors.message = "Please write your message or enquiry.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      dialogRef?.current?.querySelector("[aria-invalid='true']")?.focus();
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await enquiryApi.submitEnquiry({
        campusId: contact.campusId ? Number(contact.campusId) : null,
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        mobile: values.mobile.trim(),
        enquiryType: values.enquiryType,
        subject: values.subject.trim() || `${values.enquiryType} Enquiry`,
        message: values.message.trim(),
      });

      setSuccessMessage(
        `Thank you, ${values.fullName.trim()}! Your enquiry has been registered successfully. Our front desk reception team will contact you shortly.`
      );
      setValues(emptyValues);
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message ||
          `Unable to submit your enquiry at this time. Please call our reception directly at ${config.contactPhone}.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={`get-in-touch-dialog${isPageView ? " is-inline-page" : ""}`}
      role={isPageView ? "region" : "dialog"}
      aria-modal={isPageView ? undefined : "true"}
      aria-labelledby="get-in-touch-title"
      aria-describedby="get-in-touch-description"
      ref={dialogRef}
      tabIndex={isPageView ? undefined : -1}
    >
      {!isPageView && onClose ? (
        <button
          className="get-in-touch-close"
          type="button"
          aria-label="Close contact enquiry"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      ) : null}

      {/* Left Aside with Campus visuals & Contact coordinates */}
      <aside className="get-in-touch-aside">
        <CampusBrandImage
          className="get-in-touch-logo"
          slot="headerLogo"
          src={logo}
          alt={`${config.collegeName} logo`}
        />
        <span className="get-in-touch-script">Get in Touch</span>
        <h2 id="get-in-touch-title">
          We're Here to <em>Help You!</em>
        </h2>
        <p id="get-in-touch-description">
          Have questions about admissions, intermediate programmes, fees, or hostel facility?
          Reach out to our front desk team anytime.
        </p>
        <div className="get-in-touch-contact-list">
          <a href={`tel:${config.contactPhone.replace(/[^+\d]/g, "")}`}>
            <span>
              <Phone size={20} />
            </span>
            <span>
              <strong>Call Us</strong>
              <b>{config.contactPhone}</b>
            </span>
          </a>
          <a href={`mailto:${config.contactEmail}`}>
            <span>
              <Mail size={20} />
            </span>
            <span>
              <strong>Email Us</strong>
              <b>{config.contactEmail}</b>
            </span>
          </a>
          <div>
            <span>
              <MapPin size={20} />
            </span>
            <span>
              <strong>Visit Us</strong>
              <b>{config.contactAddress}</b>
            </span>
          </div>
          <div>
            <span>
              <Clock size={20} />
            </span>
            <span>
              <strong>Office Hours</strong>
              <b>{config.officeHours}</b>
            </span>
          </div>
        </div>
        <img
          className="get-in-touch-campus"
          src={campusImage}
          alt="PIRNAV College campus"
        />
      </aside>

      {/* Right Form Panel with Live Enquiry Submission */}
      <div className="get-in-touch-form-panel">
        <div className="get-in-touch-form-heading">
          <span>
            <Send size={22} />
          </span>
          <div>
            <h3>Send Us a Message</h3>
            <p>Fill in your details below and our front desk reception will get back to you promptly.</p>
          </div>
        </div>

        <form className="get-in-touch-form" noValidate onSubmit={handleSubmit}>
          {successMessage ? (
            <div className="get-in-touch-success-banner" role="status">
              <CheckCircle2 size={20} />
              <span>{successMessage}</span>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="get-in-touch-error-banner" role="alert">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="get-in-touch-control">
            <label htmlFor="get-touch-name">
              Full Name <i aria-hidden="true">*</i>
            </label>
            <div className="get-in-touch-field">
              <UserRound size={17} />
              <input
                ref={fullNameRef}
                id="get-touch-name"
                name="fullName"
                autoComplete="name"
                required
                aria-required="true"
                value={values.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                placeholder="e.g. Ramesh Kumar"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "get-touch-name-error" : undefined}
                disabled={submitting}
              />
              {errors.fullName ? (
                <small id="get-touch-name-error" className="get-in-touch-error">
                  {errors.fullName}
                </small>
              ) : null}
            </div>
          </div>

          <div className="get-in-touch-control">
            <label htmlFor="get-touch-mobile">
              Mobile Number <i aria-hidden="true">*</i>
            </label>
            <div className="get-in-touch-field">
              <Phone size={17} />
              <input
                id="get-touch-mobile"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                aria-required="true"
                value={values.mobile}
                onChange={(event) =>
                  updateField("mobile", event.target.value.replace(/[^\d+()\s-]/g, ""))
                }
                placeholder="e.g. +91 9876543210"
                aria-invalid={Boolean(errors.mobile)}
                aria-describedby={errors.mobile ? "get-touch-mobile-error" : undefined}
                disabled={submitting}
              />
              {errors.mobile ? (
                <small id="get-touch-mobile-error" className="get-in-touch-error">
                  {errors.mobile}
                </small>
              ) : null}
            </div>
          </div>

          <div className="get-in-touch-control">
            <label htmlFor="get-touch-email">
              Email Address <i aria-hidden="true">*</i>
            </label>
            <div className="get-in-touch-field">
              <Mail size={17} />
              <input
                id="get-touch-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="e.g. ramesh@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "get-touch-email-error" : undefined}
                disabled={submitting}
              />
              {errors.email ? (
                <small id="get-touch-email-error" className="get-in-touch-error">
                  {errors.email}
                </small>
              ) : null}
            </div>
          </div>

          <div className="get-in-touch-control">
            <label htmlFor="get-touch-type">
              Enquiry Category <i aria-hidden="true">*</i>
            </label>
            <div className="get-in-touch-field">
              <ListChecks size={17} />
              <select
                id="get-touch-type"
                name="enquiryType"
                required
                aria-required="true"
                value={values.enquiryType}
                onChange={(event) => updateField("enquiryType", event.target.value)}
                aria-invalid={Boolean(errors.enquiryType)}
                aria-describedby={errors.enquiryType ? "get-touch-type-error" : undefined}
                disabled={submitting}
              >
                {ENQUIRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.enquiryType ? (
                <small id="get-touch-type-error" className="get-in-touch-error">
                  {errors.enquiryType}
                </small>
              ) : null}
            </div>
          </div>

          <div className="get-in-touch-control is-full">
            <label htmlFor="get-touch-subject">Subject (Optional)</label>
            <div className="get-in-touch-field">
              <MessageSquareText size={17} />
              <input
                id="get-touch-subject"
                name="subject"
                type="text"
                value={values.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="e.g. Admission for MPC 1st Year / Fee details"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="get-in-touch-control is-full">
            <label htmlFor="get-touch-message">
              Message <i aria-hidden="true">*</i>
            </label>
            <div className="get-in-touch-field get-in-touch-message-field">
              <MessageSquareText size={17} />
              <textarea
                id="get-touch-message"
                name="message"
                rows="4"
                required
                aria-required="true"
                value={values.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Enter your enquiry or message here..."
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? "get-touch-message-error" : undefined}
                disabled={submitting}
              />
              {errors.message ? (
                <small id="get-touch-message-error" className="get-in-touch-error">
                  {errors.message}
                </small>
              ) : null}
            </div>
          </div>

          <button className="get-in-touch-submit" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Submitting Enquiry...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Enquiry
              </>
            )}
          </button>
        </form>

        <p className="get-in-touch-direct">
          Or call our reception directly:{" "}
          <a href={`tel:${config.contactPhone.replace(/[^+\d]/g, "")}`}>
            {config.contactPhone}
          </a>
        </p>
      </div>
    </section>
  );
}

export function GetInTouchView({ contact = {}, isPageView = true }) {
  return (
    <div className="get-in-touch-page-wrapper">
      <GetInTouchCard contact={contact} isPageView={isPageView} />
    </div>
  );
}

export default function GetInTouchModal({ contact, open = false, onClose }) {
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);
  const fullNameRef = useRef(null);
  const previousFocusRef = useRef(null);
  const closeTimerRef = useRef(null);
  const closingRef = useRef(false);

  // NOTE: Auto-popup timer is deliberately removed so the modal NEVER pops up on its own.

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => fullNameRef.current?.focus({ preventScroll: true }));

    const close = () => {
      if (closingRef.current) return;
      closingRef.current = true;
      setClosing(true);
      closeTimerRef.current = window.setTimeout(() => {
        if (onClose) onClose();
      }, 190);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...(dialogRef.current?.querySelectorAll(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]"
        ) || []),
      ];
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      const returnTarget = previousFocusRef.current;
      if (returnTarget instanceof HTMLElement && returnTarget.isConnected) returnTarget.focus();
    };
  }, [open, onClose]);

  const dismiss = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      if (onClose) onClose();
    }, 190);
  };

  if (!open) return null;

  return createPortal(
    <div
      className={`get-in-touch-backdrop${closing ? " is-closing" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <GetInTouchCard
        contact={contact}
        isPageView={false}
        onClose={dismiss}
        dialogRef={dialogRef}
        fullNameRef={fullNameRef}
      />
    </div>,
    document.body
  );
}
