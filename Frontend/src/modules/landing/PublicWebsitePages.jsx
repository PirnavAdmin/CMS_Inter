import { useState } from "react";
import { Activity, ArrowRight, Award, BarChart3, BookOpen, Building2, Bus, CalendarDays, Calculator, CheckCircle2, ClipboardCheck, Compass, Dna, GraduationCap, Globe2, HeartHandshake, LibraryBig, Mail, MapPin, Phone, ShieldCheck, Sigma, Sparkles, Users, WalletCards } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import campusImage from "@/assets/campus-hero.jpg";
import collegeHeroImage from "@/assets/pirnav-college-hero.jpg";
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
  { code: "MPC", title: "Mathematics, Physics, Chemistry", icon: Sigma, subjects: "Mathematics, Physics, Chemistry", description: "A science programme group with a focus on mathematics and physical sciences." },
  { code: "BiPC", title: "Botany, Zoology, Physics, Chemistry", icon: Dna, subjects: "Botany, Zoology, Physics, Chemistry", description: "A science programme group including life sciences and physical sciences." },
  { code: "CEC", title: "Civics, Economics, Commerce", icon: Calculator, subjects: "Civics, Economics, Commerce", description: "A programme group bringing together civics, economics, and commerce subjects." },
  { code: "MEC", title: "Mathematics, Economics, Commerce", icon: BarChart3, subjects: "Mathematics, Economics, Commerce", description: "A programme group combining mathematics, economics, and commerce subjects." },
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
    {!compact ? <span className="public-kicker">Intermediate programme</span> : null}<h2>{programme.code}</h2><h3>{programme.title}</h3>
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
  const showcaseFeatures = [
    ["Online Admission", "Apply for Class 11 & 12 with a simple and transparent process.", ClipboardCheck, "/admissions"],
    ["Student Management", "Manage student profiles, attendance, and performance easily.", Users, "/login"],
    ["Examination System", "Conduct and manage internal and board exams accurately.", CalendarDays, "/features"],
    ["Fee Management", "View fee schedules, receipts, and due-tracking tools.", WalletCards, "/features"],
    ["Results & Reports", "Generate results, marksheets, and academic reports.", BarChart3, "/features"],
  ];
  const courseShowcase = [
    ["Science", "Class 11 & 12 – Science", "Physics, Chemistry, Mathematics, Biology / Computer Science.", labImage, "/academics#MPC"],
    ["Commerce", "Class 11 & 12 – Commerce", "Accountancy, Business Studies, Economics, Mathematics.", classImage, "/academics#CEC"],
    ["Arts", "Class 11 & 12 – Arts", "Contact the college for current arts programme information.", libraryImage, "/academics"],
  ];
  const highlights = [
    ["Secure & Reliable", "Role-based access and secure college workflows.", ShieldCheck],
    ["Real-Time Insights", "Reports and dashboards for informed decisions.", BarChart3],
    ["Centralized Operations", "Academic and administrative tools in one place.", Building2],
    ["Multi-Campus Ready", "Campus-aware tools for college operations.", Globe2],
  ];
  const homeFeatures = [
    ["Student Management", "Student records and admission information.", Users],
    ["Faculty/Staff Management", "Faculty and staff information areas.", GraduationCap],
    ["Timetable Management", "Timetable and academic schedule areas.", CalendarDays],
    ["Attendance Management", "Student and staff attendance areas.", ClipboardCheck],
    ["Examination & Results", "Exams, results and performance analytics.", Award],
    ["Fees Management", "Fee structure, collection and reports.", WalletCards],
  ];
  const principles = [
    ["Vision", "A strong foundation for a bright future.", Sparkles],
    ["Mission", "Empowering young minds through education.", BookOpen],
    ["Values", "Academic excellence and ethical values.", HeartHandshake],
  ];
  const admissionSteps = ["Enquiry", "Counselling", "Application", "Verification", "Admission", "Welcome"];
  const faqItems = [
    ["Which programme groups are listed?", "The site lists MPC, BiPC, CEC, and MEC. Contact the college to confirm current availability and subject details."],
    ["How can I ask about admission?", "Use the Admissions page or contact the college for current requirements and guidance."],
    ["Can visitors access management dashboards here?", "No. The public feature cards describe platform areas; dashboards require the existing authorised login."],
    ["Are the enquiry forms live?", "The public enquiry forms are demo previews and do not send or save submissions."],
    ["Where can I find contact details?", "Use the Contact page or the configured details in the footer."],
  ];
  return <main className="public-main">
    <section className="landing-hero-banner public-home-hero">
      <HeroSlider variant="hero-bg" imageOverride={classImage} autoRotate={false} showControls={false} />
      <div className="landing-hero-content public-home-hero-copy">
        <span className="cms-eyebrow"><Building2 size={15} /> Welcome to Pirnav College</span>
        <h1>Your Gateway to<br /><span>A Bright Intermediate</span><br />Future</h1>
        <p>A modern Intermediate College Management System for admissions, academics, student records, examinations, and daily college operations.</p>
        <div className="cms-hero-actions landing-hero-actions"><Link to="/admissions" className="public-btn">Apply for Admission <ArrowRight size={16} /></Link><Link to="/about" className="public-btn is-outline">Explore College <ArrowRight size={16} /></Link></div>
      </div>
    </section>
    <section className="public-home-feature-cards" aria-label="College management features">{showcaseFeatures.map(([title, description, Icon, to], index) => <Link key={title} className="public-home-feature-tile" to={to}><span className="public-home-feature-icon"><Icon size={24} /></span><b>0{index + 1}</b><h2>{title}</h2><p>{description}</p></Link>)}</section>
    <section className="public-home-about-replica"><div className="public-section-inner public-home-about-layout"><div className="public-about-collage"><img className="public-about-photo-main" src={libraryImage} alt="Illustrative student study scene" loading="lazy" /><img className="public-about-photo-top" src={classImage} alt="Illustrative students learning" loading="lazy" /><img className="public-about-photo-bottom" src={labImage} alt="Illustrative science learning" loading="lazy" /><div className="public-about-badge"><GraduationCap size={22} /><span><strong>Intermediate (10+2)</strong><small>Learning with excellence</small></span></div></div><div className="public-home-about-copy"><span className="public-kicker"><Building2 size={16} /> About Pirnav College</span><h2>Our Intermediate College <em>Empowers</em> Your Future.</h2><p>Pirnav College is an Intermediate (10+2) institution committed to quality education, strong academic support, and a student-centric environment. Its college management system keeps academic and administrative processes clear and efficient.</p><div className="public-about-details"><article><GraduationCap size={20} /><div><h3>Academic Excellence</h3><p>Programme information for intermediate learning pathways.</p></div></article><article><Building2 size={20} /><div><h3>Digital College Services</h3><p>Admissions, records, examinations, and campus tools.</p></div></article><article><HeartHandshake size={20} /><div><h3>Student Support</h3><p>Guidance and current contact options for learners.</p></div></article></div><blockquote>Quality education, discipline, and holistic development for every student at Pirnav College.</blockquote><div className="public-about-actions"><Link className="public-btn" to="/about">Know More About Us <ArrowRight size={16} /></Link><a href={`tel:${content.contactPhone.replace(/[^+\d]/g, "")}`}><Phone size={18} /> Call Us</a></div></div></div></section>
    <section className="public-home-stat-strip" aria-label="College highlights"><div><BookOpen size={25} /><strong>MPC & BiPC</strong><small>Science programme groups</small></div><div><Calculator size={25} /><strong>CEC & MEC</strong><small>Commerce programme groups</small></div><div><Users size={25} /><strong>Class 11 & 12</strong><small>Intermediate education</small></div><div><ShieldCheck size={25} /><strong>College CMS</strong><small>Management platform</small></div><div><Phone size={25} /><strong>Admissions Help</strong><small>Contact the college</small></div></section>
    <section className="public-section public-home-courses"><div className="public-section-inner"><SectionHeading kicker="Our Courses" title={<>Let’s Explore Our <em>Courses</em></>} description="Explore the programme groups available in this system. Confirm current availability and subject combinations with the college." /><div className="public-home-course-grid">{courseShowcase.map(([label, title, description, image, to]) => <article key={title}><Link to={to}><img src={image} alt={`Illustrative ${label} learning image`} loading="lazy" /><span>{label}</span><i><ArrowRight size={17} /></i></Link><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></div></section>
    <section className="public-home-why"><div className="public-home-why-copy"><span className="public-kicker">Why Choose {content.collegeName}?</span><h2>Learning, growth and support</h2><ul><li><CheckCircle2 size={16} /> Information for four intermediate programme groups</li><li><CheckCircle2 size={16} /> College and student support contact options</li><li><CheckCircle2 size={16} /> Academic and management platform areas</li><li><CheckCircle2 size={16} /> Learning environment information</li></ul><Link className="public-btn is-light-outline" to="/about">About the College <ArrowRight size={16} /></Link></div><img className="public-home-classroom" src={classImage} alt="Illustrative classroom learning image" loading="lazy" /><aside className="public-success-card"><h3>Student learning support</h3><div><span><GraduationCap size={19} /></span><p><strong>Academic Information</strong><small>Programme and subject guidance</small></p></div><div><span><HeartHandshake size={19} /></span><p><strong>Student Support</strong><small>Use college contact options for help</small></p></div><div><span><Sparkles size={19} /></span><p><strong>Future Planning</strong><small>Ask the college about available guidance</small></p></div></aside></section>
    <section className="public-home-platform"><div className="public-section-inner"><SectionHeading kicker="College platform" title="Management tools in one place" description="These cards describe platform capabilities and do not provide live dashboard access." /><div className="public-home-feature-grid">{homeFeatures.map(([title, description, Icon]) => <article className="public-home-feature-card" key={title}><span><Icon size={18} /></span><h3>{title}</h3><p>{description}</p></article>)}</div><div className="public-actions is-centered"><Link className="public-btn is-outline" to="/features">Explore All Features <ArrowRight size={16} /></Link></div></div></section>
    <section className="public-home-about" id="about"><div className="public-section-inner public-home-about-layout"><div className="public-home-about-copy"><span className="public-kicker">About PIRNAV</span><h2>Committed to Excellence in Education</h2><p>{content.loginTagline || content.landingDescription}</p><div className="public-home-principles">{principles.map(([title, description, Icon]) => <article key={title}><span><Icon size={19} /></span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div><Link className="public-card-link" to="/about">About the College <ArrowRight size={15} /></Link></div><figure className="public-home-about-media"><img src={collegeHeroImage} alt="PIRNAV College campus exterior" loading="lazy" /><figcaption>College introduction image · contact the college for current details</figcaption></figure></div></section>
    <section className="public-home-achievements"><div className="public-home-achievement-copy"><span className="public-kicker">Academic Excellence</span><h2>Build strong foundations for what comes next</h2><p>Explore the programme information and ask the college for verified results, awards, and academic milestones.</p><Link className="public-btn is-warm" to="/academics">Explore Academics <ArrowRight size={16} /></Link></div><div className="public-home-achievement-art"><span><Award size={54} /></span><p>Verified achievements and results can be added here when approved college information is available.</p></div></section>
    <section className="public-home-support"><div className="public-section-inner"><SectionHeading kicker="Student Support" title="Guidance for learning and future planning" description="Contact the college to confirm current academic counselling, mentoring, parent communication, and career guidance services." /><div className="public-home-support-grid"><article><span><HeartHandshake size={25} /></span><h3>Student & Parent Support</h3><p>Use the college contact page to ask about academic guidance, student support, and parent communication.</p><Link className="public-card-link" to="/contact">Contact the College <ArrowRight size={15} /></Link></article><article><span><BookOpen size={25} /></span><h3>Digital Learning</h3><p>The public site describes management platform areas. Login is required for authorised system access.</p><Link className="public-card-link" to="/features">Explore Platform Features <ArrowRight size={15} /></Link></article><article><span><Compass size={25} /></span><h3>Career & Higher Education</h3><p>Ask the college which higher-education and career-planning guidance is currently available.</p><Link className="public-card-link" to="/contact">Ask the College <ArrowRight size={15} /></Link></article></div></div></section>
    <section className="public-home-admissions"><div className="public-section-inner"><div className="public-home-admissions-heading"><div><span className="public-kicker">Admissions</span><h2>A clear way to get started</h2><p>General enquiry flow only. Contact the college to confirm current steps, eligibility, documents, and dates.</p></div><Link className="public-btn" to="/admissions">Apply for Admission <ArrowRight size={16} /></Link></div><ol className="public-admission-steps">{admissionSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong><small>Ask the college for current details.</small></li>)}</ol></div></section>
    <section className="public-home-experience"><div className="public-home-experience-copy"><span className="public-kicker">Student & Parent Experience</span><h2>Find the information and support you need</h2><p>No approved public testimonials have been added. For programme, admissions, and support information, contact the college directly.</p><Link className="public-card-link" to="/contact">Contact PIRNAV College <ArrowRight size={15} /></Link></div><div className="public-home-experience-cards"><article><span><BookOpen size={21} /></span><h3>Programme Information</h3><p>Review MPC, BiPC, CEC, and MEC details and confirm current availability.</p></article><article><span><HeartHandshake size={21} /></span><h3>Admission Guidance</h3><p>Use the existing admissions page and ask the college about current requirements.</p></article></div></section>
    <section className="public-home-faq"><div className="public-section-inner"><SectionHeading kicker="Help & Support" title="Frequently asked questions" description="Answers are limited to information currently available on this website." /><div className="public-home-faq-list">{faqItems.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
    <section className="public-home-news"><div className="public-section-inner"><div><span className="public-kicker">News & Events</span><h2>Latest news from PIRNAV</h2><p>Verified public announcements and event updates will appear here when published.</p></div><div className="public-home-news-empty"><CalendarDays size={24} /><p>No public news or event announcements are available at this time.</p></div></div></section>
    <section className="public-home-contact"><div className="public-section-inner"><div><span className="public-kicker">Contact & Location</span><h2>Connect with PIRNAV College</h2><p>Use the configured contact details for current college information.</p></div><div className="public-home-contact-details"><a href={`tel:${content.contactPhone.replace(/[^+\d]/g, "")}`}><Phone size={19} /><span><small>Phone</small><strong>{content.contactPhone}</strong></span></a><a href={`mailto:${content.contactEmail}`}><Mail size={19} /><span><small>Email</small><strong>{content.contactEmail}</strong></span></a><div><MapPin size={19} /><span><small>Address</small><strong>{content.contactAddress}</strong></span></div></div></div></section>
    <section className="public-home-cta"><span className="public-cta-cap"><GraduationCap size={28} /></span><div><h2>Ready to take the next step?</h2><p>Apply for admission or connect with the college for more information.</p></div><div className="public-home-cta-actions"><Link className="public-btn is-white" to="/admissions">Apply for Admission <ArrowRight size={16} /></Link><Link className="public-btn is-light-outline" to="/contact"><Phone size={15} /> Contact the College</Link></div></section>
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
