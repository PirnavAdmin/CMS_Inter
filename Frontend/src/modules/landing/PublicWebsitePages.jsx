import { useState } from "react";
import { ArrowRight, Award, BookOpen, Bus, CalendarDays, CheckCircle2, ClipboardCheck, GraduationCap, HeartHandshake, LibraryBig, Mail, MapPin, Phone, ShieldCheck, Sparkles, Users, WalletCards } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import campusImage from "@/assets/campus-hero.jpg";
import classImage from "@/assets/hero-classroom.jpg";
import graduationImage from "@/assets/hero-graduation.jpg";
import labImage from "@/assets/hero-lab.jpg";
import libraryImage from "@/assets/hero-library.jpg";
import HeroSlider from "@/shared/components/HeroSlider.jsx";
import GetInTouchModal from "./GetInTouchModal.jsx";
import PublicSiteLayout from "./PublicSiteLayout.jsx";

const pageInfo = {
  about: ["About", "About PIRNAV College", "A connected college experience for intermediate learners."],
  academics: ["Academics", "Academic Programmes", "Explore the MPC, BiPC, CEC, and MEC programme groups."],
  features: ["Features", "College Management Features", "An overview of the college management platform areas."],
  admissions: ["Admissions", "Admissions Information", "Review the enquiry steps, sample checklist, and contact options."],
  contact: ["Contact", "Contact PIRNAV College", "Use the project-listed contact details or send a demo enquiry."],
  help: ["Help", "Help & Support", "Find your way around the public college website."],
  privacy: ["Privacy Policy", "Privacy Information", "A short informational placeholder for this static website preview."],
  terms: ["Terms", "Website Terms", "A short informational placeholder for this static website preview."],
};

const programmes = [
  { code: "MPC", title: "Mathematics, Physics, Chemistry", icon: Sparkles, subjects: "Mathematics, Physics, Chemistry", description: "A science programme group with a focus on mathematics and physical sciences." },
  { code: "BiPC", title: "Botany, Zoology, Physics, Chemistry", icon: LibraryBig, subjects: "Botany, Zoology, Physics, Chemistry", description: "A science programme group including life sciences and physical sciences." },
  { code: "CEC", title: "Civics, Economics, Commerce", icon: Users, subjects: "Civics, Economics, Commerce", description: "A programme group bringing together civics, economics, and commerce subjects." },
  { code: "MEC", title: "Mathematics, Economics, Commerce", icon: BookOpen, subjects: "Mathematics, Economics, Commerce", description: "A programme group combining mathematics, economics, and commerce subjects." },
];

const features = [
  ["Student Management", "Student records and admission information.", Users],
  ["Faculty/Staff Management", "Faculty and staff information areas.", GraduationCap],
  ["Timetable Management", "Timetable and academic schedule areas.", CalendarDays],
  ["Attendance Management", "Student and staff attendance areas.", ClipboardCheck],
  ["Examination Management", "Examination planning and administration areas.", BookOpen],
  ["Results & Marks", "Marks and result information areas.", Award],
  ["Fee Management", "Fee schedules and collection information areas.", WalletCards],
  ["Reports & Analytics", "Reports and academic summary areas.", CheckCircle2],
  ["Transport Management", "Transport route and related information areas.", Bus],
  ["Library Management", "Library information and resource areas.", LibraryBig],
  ["Hostel Management", "Hostel information and administration areas.", HeartHandshake],
  ["Parent Communication", "Parent-facing information and communication areas.", Users],
  ["Notifications", "Updates and notification areas.", Mail],
  ["Role-Based Access", "Access areas organised by application role.", ShieldCheck],
];

function Breadcrumb({ title }) {
  return <nav className="public-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">›</span><span>{title}</span></nav>;
}

function PageHeading({ page }) {
  const [section, title, description] = pageInfo[page];
  return <header className="public-page-heading"><Breadcrumb title={section} /><span className="public-kicker">PIRNAV Intermediate College</span><h1>{title}</h1><p>{description}</p></header>;
}

function SectionHeading({ kicker, title, description }) {
  return <header className="public-section-heading"><span className="public-kicker">{kicker}</span><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

function ProgrammeCard({ programme, compact = false }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const Icon = programme.icon;
  return <article className={`public-card public-programme-card${compact ? " is-compact" : ""}`} id={!compact ? programme.code : undefined}>
    <div className="public-programme-art"><Icon size={38} strokeWidth={1.6} /></div>
    <span className="public-kicker">Intermediate programme</span><h2>{programme.code}</h2><h3>{programme.title}</h3>
    {!compact ? <><p>{programme.description}</p><button className="public-card-link public-detail-toggle" type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((value) => !value)}>{detailsOpen ? "Hide Details" : "View Details"}<ArrowRight size={15} /></button>{detailsOpen ? <div className="public-detail-panel"><h4>Illustrative subject list</h4><p>{programme.subjects}</p><small>Sample information. Confirm current subjects with the college.</small></div> : null}</> : <Link className="public-card-link" to="/academics">View Details <ArrowRight size={15} /></Link>}
  </article>;
}

function FeatureCard({ feature }) {
  const [title, description, Icon] = feature;
  return <article className="public-card public-feature-card"><span className="public-card-icon"><Icon size={23} /></span><h3>{title}</h3><p>{description}</p></article>;
}

function StaticDemoForm({ kind, onSuccess }) {
  const isAdmissions = kind === "admissions";
  const fields = isAdmissions ? [
    ["studentName", "Student name", "text", true], ["guardianName", "Parent / guardian name", "text", true],
    ["phone", "Phone", "tel", true], ["email", "Email", "email", true],
  ] : [
    ["name", "Name", "text", true], ["email", "Email", "email", true], ["subject", "Subject", "text", true],
  ];
  return <form className="public-form" onSubmit={(event) => { event.preventDefault(); onSuccess(); event.currentTarget.reset(); }}>
    <h2>{isAdmissions ? "Admission Enquiry" : "Send an Enquiry"}</h2>
    <div className="public-form-grid">
      {fields.map(([name, label, type, required]) => <label key={name}>{label}<input name={name} type={type} required={required} autoComplete={name.toLowerCase().includes("name") ? "name" : undefined} /></label>)}
      {isAdmissions ? <label>Programme preference<select name="programme" required defaultValue=""><option value="" disabled>Select a programme</option>{programmes.map((programme) => <option key={programme.code} value={programme.code}>{programme.code}</option>)}</select></label> : null}
      <label className="span-two">{isAdmissions ? "Message" : "Message"}<textarea name="message" required rows="4" /></label>
    </div>
    <button type="submit" className="public-btn">{isAdmissions ? "Send Enquiry" : "Send Message"} <ArrowRight size={16} /></button>
    <p className="public-form-note">Demo form only. Your information is not sent or saved.</p>
  </form>;
}

function HomePage({ content }) {
  const highlights = [
    ["Academic Programmes", "MPC, BiPC, CEC, and MEC programme information.", BookOpen, "/academics"],
    ["Faculty & Staff", "A college platform area for faculty and staff information.", GraduationCap, "/features"],
    ["Student Support", "College information and support contact options.", HeartHandshake, "/contact"],
    ["Campus Facilities", "Explore the existing campus and learning images.", LibraryBig, "/about"],
  ];
  return <main className="public-main">
    <section className="landing-hero-banner">
      <HeroSlider variant="hero-bg" />
      <div className="landing-hero-content cms-anim-up">
        <span className="cms-eyebrow"><CheckCircle2 size={14} /> A smarter campus starts here</span>
        <h1>Learn, grow and succeed with a connected college experience.</h1>
        <p>{content.landingDescription}</p>
        <div className="landing-trust-points"><span><CheckCircle2 size={15} /> Intermediate programmes</span><span><CheckCircle2 size={15} /> College information</span><span><CheckCircle2 size={15} /> Student support</span></div>
        <div className="cms-hero-actions landing-hero-actions"><Link to="/academics" className="public-explore-link">Explore Academics <ArrowRight size={16} /></Link><Link to="/admissions" className="cms-btn landing-start-btn">Apply for Admission <ArrowRight size={16} /></Link></div>
      </div>
    </section>
    <section className="public-section"><div className="public-section-inner"><SectionHeading kicker="PIRNAV College" title="A connected college experience" description={content.footerDescription} /><div className="public-card-grid">{highlights.map(([title, description, Icon, to]) => <article className="public-card" key={title}><span className="public-card-icon"><Icon size={23} /></span><h3>{title}</h3><p>{description}</p><Link className="public-card-link" to={to}>Explore <ArrowRight size={15} /></Link></article>)}</div></div></section>
    <section className="public-section is-sage"><div className="public-section-inner"><SectionHeading kicker="Academics" title="Explore our programme groups" description="Subject group descriptions below are sample information. Contact the college to confirm current details." /><div className="public-card-grid">{programmes.map((programme) => <ProgrammeCard key={programme.code} programme={programme} compact />)}</div><div className="public-actions is-centered"><Link className="public-btn" to="/academics">View All Programmes <ArrowRight size={16} /></Link></div></div></section>
    <section className="public-section"><div className="public-section-inner public-split-section"><div className="public-split-copy"><span className="public-kicker">Why Choose {content.collegeName}?</span><h2>Learning, student growth, and support</h2><p>{content.landingDescription}</p><ul className="public-simple-list"><li>Information for four intermediate programme groups</li><li>College and student support contact options</li><li>Connected academic and management platform areas</li></ul><Link className="public-btn is-outline" to="/about">About the College <ArrowRight size={16} /></Link></div><img src={classImage} alt="Students learning in a college classroom" /></div></section>
    <section className="public-section is-sage"><div className="public-section-inner"><SectionHeading kicker="College platform" title="Management tools in one place" description="These are informational descriptions of platform capabilities; they do not represent live public functions." /><div className="public-card-grid">{features.slice(0, 4).map((feature) => <FeatureCard key={feature[0]} feature={feature} />)}</div><div className="public-actions is-centered"><Link className="public-btn is-outline" to="/features">Explore Features <ArrowRight size={16} /></Link></div></div></section>
    <section className="public-section"><div className="public-section-inner public-split-section"><img src={campusImage} alt="PIRNAV College campus image" /><div className="public-split-copy"><span className="public-kicker">Campus & student life</span><h2>A place to learn and grow</h2><p>Browse the college, classroom, laboratory, library, and graduation images available in the project.</p><div className="public-image-strip"><img src={labImage} alt="Laboratory image" /><img src={libraryImage} alt="Library image" /><img src={graduationImage} alt="Graduation image" /></div><Link className="public-card-link" to="/about">Discover PIRNAV College <ArrowRight size={15} /></Link></div></div></section>
    <section className="public-cta"><div><span className="public-kicker">Admissions</span><h2>Explore your next step</h2><p>Review programme information or contact the college with an enquiry.</p></div><div className="public-actions"><Link className="public-btn" to="/admissions">Apply for Admission <ArrowRight size={16} /></Link><a className="public-btn is-outline" href={`tel:${content.contactPhone.replace(/[^+\d]/g, "")}`}>Call the College</a></div></section>
  </main>;
}

function AboutPage({ content }) {
  const principles = [
    ["Vision", "Create a supportive environment for learning and student development.", Sparkles],
    ["Mission", "Bring academic information, student support, and college administration together.", BookOpen],
    ["Values", "Learning, discipline, respect, and care for the college community.", HeartHandshake],
  ];
  return <main className="public-main"><section className="public-page"><div className="public-page-shell"><PageHeading page="about" /><div className="public-split-section"><div className="public-split-copy"><span className="public-kicker">College introduction</span><h2>{content.collegeName}</h2><p>{content.landingDescription}</p><p>{content.footerDescription}</p><Link className="public-btn" to="/academics">Explore Academics <ArrowRight size={16} /></Link></div><img src={campusImage} alt="PIRNAV College campus" /></div></div></section>
    <section className="public-section is-sage"><div className="public-section-inner"><SectionHeading kicker="Our principles" title="Vision, mission, and values" description="Introductory wording for review and approval by the college." /><div className="public-card-grid is-three">{principles.map(([title, description, Icon]) => <article className="public-card" key={title}><span className="public-card-icon"><Icon size={23} /></span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
    <section className="public-section"><div className="public-section-inner public-split-section"><img src={classImage} alt="College classroom" /><div className="public-split-copy"><span className="public-kicker">Learning approach</span><h2>Academic learning and student development</h2><p>For current academic information, programme guidance, and student support details, contact the college directly.</p><Link className="public-card-link" to="/contact">Contact PIRNAV College <ArrowRight size={15} /></Link></div></div><div className="public-gallery"><img src={labImage} alt="College laboratory" /><img src={libraryImage} alt="College library" /><img src={graduationImage} alt="College graduation image" /></div></section>
  </main>;
}

function AcademicsPage() {
  return <main className="public-main"><section className="public-page"><div className="public-page-shell"><PageHeading page="academics" /><p className="public-feature-note">Illustrative subject lists are sample information. Confirm current programme details with the college.</p><div className="public-programmes">{programmes.map((programme) => <ProgrammeCard key={programme.code} programme={programme} />)}</div></div></section>
    <section className="public-section is-sage"><div className="public-section-inner public-split-section"><div className="public-split-copy"><span className="public-kicker">Academic information</span><h2>Learning and academic calendar</h2><p>Academic calendar dates and current learning details are not listed here. Contact the college for the latest approved information.</p><Link className="public-btn" to="/contact">Ask the College <ArrowRight size={16} /></Link></div><img src={labImage} alt="Students learning in a laboratory" /></div></section>
    <section className="public-cta"><div><span className="public-kicker">Admissions</span><h2>Need programme information?</h2><p>Send a demo enquiry or use the project-listed contact details.</p></div><Link className="public-btn" to="/admissions">Admission Information <ArrowRight size={16} /></Link></section>
  </main>;
}

function FeaturesPage() {
  return <main className="public-main"><section className="public-page"><div className="public-page-shell"><PageHeading page="features" /><p className="public-feature-note">Descriptions below are informational summaries of platform capabilities. These public cards do not provide live dashboard access.</p><div className="public-card-grid public-feature-grid">{features.map((feature) => <FeatureCard key={feature[0]} feature={feature} />)}</div></div></section></main>;
}

function AdmissionsPage({ content }) {
  const [sent, setSent] = useState(false);
  const steps = ["Enquiry / Application", "Submit Student Details", "Provide Required Documents", "Eligibility Review", "Fee Information", "Admission Confirmation"];
  return <main className="public-main"><section className="public-page"><div className="public-page-shell"><PageHeading page="admissions" /><div className="public-split-section public-admissions-layout"><div><h2>Admission steps</h2><ol className="public-step-list">{steps.map((step) => <li key={step}><div><strong>{step}</strong><span>Contact the college for current information about this step.</span></div></li>)}</ol><h2 className="public-subheading">Eligibility & documents</h2><p className="public-section-copy">Eligibility depends on the student's qualifying examination and current requirements. Please confirm details with the college.</p><ul className="public-checklist"><li>Previous qualifying examination record</li><li>Student identity and contact details</li><li>Parent or guardian contact details</li><li>Any other documents confirmed by the college</li></ul><p className="public-notice">Illustrative checklist only. Confirm the current required documents with the college. No uploads or payments are processed here.</p><p className="public-section-copy">For enquiries, use <a href={`mailto:${content.contactEmail}`}>{content.contactEmail}</a> or call {content.contactPhone}.</p></div><StaticDemoForm kind="admissions" onSuccess={() => setSent(true)} />{sent ? <p className="public-form-success" role="status">Demo preview only — your enquiry was not sent or saved.</p> : null}</div></div></section></main>;
}

function ContactPage({ content }) {
  const [sent, setSent] = useState(false);
  const contacts = [
    ["Location", content.contactAddress || "Contact details to be added", MapPin],
    ["Phone", content.contactPhone || "Contact details to be added", Phone],
    ["Email", content.contactEmail || "Contact details to be added", Mail],
  ];
  return <main className="public-main"><section className="public-page"><div className="public-page-shell"><PageHeading page="contact" /><div className="public-contact-layout"><div className="public-contact-list">{contacts.map(([title, value, Icon]) => <article className="public-info-card" key={title}><span className="public-card-icon"><Icon size={22} /></span><h3>{title}</h3>{title === "Phone" ? <a href={`tel:${value.replace(/[^+\d]/g, "")}`}>{value}</a> : title === "Email" ? <a href={`mailto:${value}`}>{value}</a> : <p>{value}</p>}</article>)}<article className="public-info-card"><span className="public-card-icon"><CalendarDays size={22} /></span><h3>Office Hours</h3><p>Please contact the college to confirm office hours.</p></article><div className="public-map-placeholder"><MapPin size={25} /><strong>College location</strong><span>{content.contactAddress || "Contact details to be added"}</span><small>Static location information — no map service is connected.</small></div></div><div><StaticDemoForm kind="contact" onSuccess={() => setSent(true)} />{sent ? <p className="public-form-success" role="status">Demo preview only — your message was not sent or saved.</p> : null}</div></div></div></section></main>;
}

function SupportingPage({ page }) {
  const copy = {
    help: ["Website navigation", "Use the header to explore college information, programme groups, features, admissions, and contact details."],
    privacy: ["Static preview", "This public website preview does not submit or store information entered into its demo forms. No privacy policy has been provided in the project; replace this placeholder with college-approved text."],
    terms: ["Static preview", "This page is a placeholder for website terms. It is not legal advice or a legally reviewed document; replace it with college-approved terms."],
  }[page];
  return <main className="public-main"><section className="public-page"><div className="public-page-shell"><PageHeading page={page} /><article className="public-info-card public-support-copy"><h2>{copy[0]}</h2><p>{copy[1]}</p><div className="public-actions"><Link className="public-btn" to="/">Back to Home <ArrowRight size={16} /></Link><Link className="public-btn is-outline" to="/contact">Contact the College</Link></div></article></div></section></main>;
}

function NotFoundPage() {
  return <PublicSiteLayout>{() => <main className="public-main public-page public-404"><div className="public-page-shell"><p className="public-404-code">404</p><h1>Page Not Found</h1><p className="public-page-heading">The public page you are looking for could not be found.</p><div className="public-actions is-centered"><Link className="public-btn" to="/">Back to Home <ArrowRight size={16} /></Link><Link className="public-btn is-outline" to="/contact">Contact Us</Link></div></div></main>}</PublicSiteLayout>;
}

export function PublicWebsitePage({ page, disabled = false }) {
  const view = {
    about: (content) => <AboutPage content={content} />,
    academics: () => <AcademicsPage />,
    features: () => <FeaturesPage />,
    admissions: (content) => <AdmissionsPage content={content} />,
    contact: (content) => <ContactPage content={content} />,
    help: () => <SupportingPage page="help" />,
    "privacy-policy": () => <SupportingPage page="privacy" />,
    terms: () => <SupportingPage page="terms" />,
    home: (content) => <HomePage content={content} />,
  }[page];
  if (!view) return null;
  const navPage = page === "home" ? "/" : `/${page}`;
  return <PublicSiteLayout page={page === "privacy-policy" ? "" : navPage} disabled={disabled}>{(content) => <>{view(content)}{page === "home" ? <GetInTouchModal contact={content} disabled={disabled} /> : null}</>}</PublicSiteLayout>;
}

const applicationPrefixes = ["/dashboard", "/principal-dashboard", "/warden", "/warden-dashboard", "/student-dashboard", "/accountant-dashboard", "/parent-dashboard", "/exam-cell-dashboard", "/faculty-dashboard", "/non-teaching-dashboard", "/non-teaching", "/transport-manager", "/driver", "/driver-dashboard", "/inventory-dashboard", "/hostel", "/staff", "/staff-portal", "/mock-staff-portal"];

export function PublicRouteFallback() {
  const { pathname } = useLocation();
  const applicationPath = applicationPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return applicationPath ? <Navigate to="/" replace /> : <NotFoundPage />;
}
