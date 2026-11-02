import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, MapPin, Phone, Send, ShieldCheck, X, UserRound, ListChecks, MessageSquareText } from "lucide-react";
import campusImage from "@/assets/campus-hero.jpg";
import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import logo from "@/assets/pirnav-colleges-logo.png";
import "./GetInTouchModal.css";

const ENQUIRY_TYPES = ["General Enquiry", "Admissions", "Academic Programmes", "Fees", "Campus Information", "Other"];

const emptyValues = { fullName: "", email: "", mobile: "", enquiryType: "", message: "" };

export default function GetInTouchModal({ contact, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [demoMessage, setDemoMessage] = useState("");
  const dialogRef = useRef(null);
  const fullNameRef = useRef(null);
  const previousFocusRef = useRef(null);
  const closeTimerRef = useRef(null);
  const closingRef = useRef(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (disabled) return undefined;
    const timer = window.setTimeout(() => setOpen(true), 3000);
    return () => window.clearTimeout(timer);
  }, [disabled]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => fullNameRef.current?.focus({ preventScroll: true }));

    const close = () => {
      if (closingRef.current || dismissedRef.current) return;
      closingRef.current = true;
      dismissedRef.current = true;
      setClosing(true);
      closeTimerRef.current = window.setTimeout(() => setOpen(false), 190);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]") || [])];
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
  }, [open]);

  const dismiss = () => {
    if (closingRef.current || dismissedRef.current) return;
    closingRef.current = true;
    dismissedRef.current = true;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 190);
  };

  const updateField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setDemoMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (values.fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = "Enter a valid email address.";
    const mobileDigits = values.mobile.replace(/\D/g, "");
    if (!/^\+?[\d\s()-]+$/.test(values.mobile.trim()) || mobileDigits.length < 7 || mobileDigits.length > 15) nextErrors.mobile = "Enter a valid mobile number with 7 to 15 digits.";
    if (!ENQUIRY_TYPES.includes(values.enquiryType)) nextErrors.enquiryType = "Select an enquiry type.";
    if (!values.message.trim()) nextErrors.message = "Enter your message.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      dialogRef.current?.querySelector("[aria-invalid='true']")?.focus();
      return;
    }
    setDemoMessage("Demo preview only - your enquiry was not sent or saved. Backend integration is pending.");
    setValues(emptyValues);
  };

  if (!open) return null;

  return createPortal((
    <div className={`get-in-touch-backdrop${closing ? " is-closing" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <section className={`get-in-touch-dialog${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="get-in-touch-title" aria-describedby="get-in-touch-description" ref={dialogRef} tabIndex={-1}>
        <button className="get-in-touch-close" type="button" aria-label="Close contact enquiry" onClick={dismiss}><X size={21} /></button>
        <aside className="get-in-touch-aside">
          <CampusBrandImage className="get-in-touch-logo" slot="headerLogo" src={logo} alt={`${contact.collegeName} logo`} />
          <span className="get-in-touch-script">Get in Touch</span>
          <h2 id="get-in-touch-title">We're Here to <em>Help You!</em></h2>
          <p id="get-in-touch-description">We're here to help you take the next step in your academic journey.</p>
          <div className="get-in-touch-contact-list">
            <a href={`tel:${contact.contactPhone.replace(/[^+\d]/g, "")}`}><span><Phone size={20} /></span><span><strong>Call Us</strong><b>{contact.contactPhone}</b></span></a>
            <a href={`mailto:${contact.contactEmail}`}><span><Mail size={20} /></span><span><strong>Email Us</strong><b>{contact.contactEmail}</b></span></a>
            <div><span><MapPin size={20} /></span><span><strong>Visit Us</strong><b>{contact.contactAddress}</b></span></div>
          </div>
          <img className="get-in-touch-campus" src={campusImage} alt="PIRNAV College campus" />
        </aside>
        <div className="get-in-touch-form-panel">
          <div className="get-in-touch-form-heading"><span><Send size={22} /></span><div><h3>Send Us a Message</h3><p>Fill in the details below and we will get back to you.</p></div></div>
          <form className="get-in-touch-form" noValidate onSubmit={handleSubmit}>
            <div className="get-in-touch-control"><label htmlFor="get-touch-name">Full Name <i aria-hidden="true">*</i></label><div className="get-in-touch-field"><UserRound size={17} /><input ref={fullNameRef} id="get-touch-name" name="fullName" autoComplete="name" required aria-required="true" value={values.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Enter your full name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "get-touch-name-error" : undefined} />{errors.fullName ? <small id="get-touch-name-error" className="get-in-touch-error">{errors.fullName}</small> : null}</div></div>
            <div className="get-in-touch-control"><label htmlFor="get-touch-email">Email Address <i aria-hidden="true">*</i></label><div className="get-in-touch-field"><Mail size={17} /><input id="get-touch-email" name="email" type="email" autoComplete="email" required aria-required="true" value={values.email} onChange={(event) => updateField("email", event.target.value)} placeholder="Enter your email address" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "get-touch-email-error" : undefined} />{errors.email ? <small id="get-touch-email-error" className="get-in-touch-error">{errors.email}</small> : null}</div></div>
            <div className="get-in-touch-control"><label htmlFor="get-touch-mobile">Mobile Number <i aria-hidden="true">*</i></label><div className="get-in-touch-field"><Phone size={17} /><input id="get-touch-mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" required aria-required="true" value={values.mobile} onChange={(event) => updateField("mobile", event.target.value.replace(/[^\d+()\s-]/g, ""))} placeholder="Enter your mobile number" aria-invalid={Boolean(errors.mobile)} aria-describedby={errors.mobile ? "get-touch-mobile-error" : undefined} />{errors.mobile ? <small id="get-touch-mobile-error" className="get-in-touch-error">{errors.mobile}</small> : null}</div></div>
            <div className="get-in-touch-control"><label htmlFor="get-touch-type">Enquiry Type <i aria-hidden="true">*</i></label><div className="get-in-touch-field"><ListChecks size={17} /><select id="get-touch-type" name="enquiryType" required aria-required="true" value={values.enquiryType} onChange={(event) => updateField("enquiryType", event.target.value)} aria-invalid={Boolean(errors.enquiryType)} aria-describedby={errors.enquiryType ? "get-touch-type-error" : undefined}><option value="">Select enquiry type</option>{ENQUIRY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>{errors.enquiryType ? <small id="get-touch-type-error" className="get-in-touch-error">{errors.enquiryType}</small> : null}</div></div>
            <div className="get-in-touch-control is-full"><label htmlFor="get-touch-message">Message <i aria-hidden="true">*</i></label><div className="get-in-touch-field get-in-touch-message-field"><MessageSquareText size={17} /><textarea id="get-touch-message" name="message" rows="4" required aria-required="true" value={values.message} onChange={(event) => updateField("message", event.target.value)} placeholder="Enter your message" aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "get-touch-message-error" : undefined} />{errors.message ? <small id="get-touch-message-error" className="get-in-touch-error">{errors.message}</small> : null}</div></div>
            <p className="get-in-touch-demo-note"><ShieldCheck size={20} /><span><strong>Demo enquiry only</strong><small>Your details are not sent or saved. Backend integration is pending.</small></span></p>
            {demoMessage ? <p className="get-in-touch-success" role="status">{demoMessage}</p> : null}
            <button className="get-in-touch-submit" type="submit"><Send size={18} />Submit Enquiry</button>
          </form>
          <p className="get-in-touch-direct">Or call us directly: <a href={`tel:${contact.contactPhone.replace(/[^+\d]/g, "")}`}>{contact.contactPhone}</a></p>
        </div>
      </section>
    </div>
  ), document.body);
}
