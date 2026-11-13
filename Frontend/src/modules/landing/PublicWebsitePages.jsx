import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Bus,
  CalendarDays,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Compass,
  Dna,
  GraduationCap,
  Globe2,
  HeartHandshake,
  LibraryBig,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sigma,
  Sparkles,
  Users,
  WalletCards,
  Clock,
  Sparkle,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import campusImage from "@/assets/campus-hero.jpg";
import collegeHeroImage from "@/assets/pirnav-college-hero.jpg";
import classImage from "@/assets/hero-classroom.jpg";
import graduationImage from "@/assets/hero-graduation.jpg";
import labImage from "@/assets/hero-lab.jpg";
import libraryImage from "@/assets/hero-library.jpg";
import HeroSlider from "@/shared/components/HeroSlider.jsx";
import { GetInTouchView } from "./GetInTouchModal.jsx";
import PublicSiteLayout, { NAV_ITEMS } from "./PublicSiteLayout.jsx";
import "./PublicSite.css";

// ── MOTION VARIANTS ─────────────────────────────────────────────────────────────
const fadeUpVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

// ── ANIMATED COMPONENT SECTION HEADER ───────────────────────────────────────────
function AnimatedSectionHeader({ kicker, title, description, icon: Icon }) {
  return (
    <motion.header
      className="public-section-heading"
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      {kicker && (
        <div className="public-kicker-wrap">
          <span className="public-kicker-line" />
          <span className="public-kicker">
            {Icon && <Icon size={16} />} <span>{kicker}</span>
          </span>
          <span className="public-kicker-line" />
        </div>
      )}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </motion.header>
  );
}

// ── PROGRAMMES DATA ─────────────────────────────────────────────────────────────
const programmes = [
  {
    code: "MPC",
    title: "Mathematics, Physics, Chemistry",
    stream: "Science Stream",
    icon: Sigma,
    subjects: "Mathematics, Physics, Chemistry, English, Sanskrit/Telugu",
    description: "Rigorous analytical and conceptual training geared toward competitive engineering entrance (JEE, EAMCET) and technical sciences.",
    highlights: ["Advanced physics & chemistry laboratories", "Daily objective problem-solving sessions", "Expert senior faculty mentorship"],
  },
  {
    code: "BiPC",
    title: "Biology, Physics, Chemistry",
    stream: "Life Sciences Stream",
    icon: Dna,
    subjects: "Botany, Zoology, Physics, Chemistry, English, Sanskrit/Telugu",
    description: "Deep foundation in biological systems, physiology, and physical sciences tailored for medical entrance (NEET), pharmacy, and biotechnology.",
    highlights: ["Modern dissection & microscope setups", "Regular botanical specimen workshops", "Comprehensive NEET test series"],
  },
  {
    code: "CEC",
    title: "Civics, Economics, Commerce",
    stream: "Commerce & Humanities",
    icon: Calculator,
    subjects: "Civics, Economics, Commerce, Accountancy, English",
    description: "Integrated financial, legal, and public governance curriculum preparing students for CA Foundation, CS, Law, and civil service administration.",
    highlights: ["Real-world accountancy ledger training", "Economics case studies & mock stock market", "Civics & constitutional seminars"],
  },
  {
    code: "MEC",
    title: "Mathematics, Economics, Commerce",
    stream: "Commerce & Analytics",
    icon: BarChart3,
    subjects: "Mathematics, Economics, Commerce, Accountancy, English",
    description: "High-value combination of mathematical rigor and commercial expertise for Actuarial Sciences, Data Analytics, CA, and premier MBA tracks.",
    highlights: ["Quantitative analytics and logic building", "Business calculus and financial modeling", "Corporate law and taxation basics"],
  },
];

// ── CMS PLATFORM FEATURES ─────────────────────────────────────────────────────
const cmsFeatures = [
  ["Student Information System", "Comprehensive 360° student records, profile data, admissions, and personal identity tracking.", Users],
  ["Faculty & Staff Management", "Teaching workloads, department affiliations, leave balances, and biometric attendance.", GraduationCap],
  ["Timetable & Substitution", "Conflict-free weekly timetables, classroom mapping, and automated teacher substitutions.", CalendarDays],
  ["Daily Attendance Tracking", "Automated section-wise and subject-wise attendance with instant guardian SMS alerts.", ClipboardCheck],
  ["Examination Management", "End-to-end exam schedules, room hall allocations, question paper logs, and invigilation.", BookOpen],
  ["Marks & Grade Evaluation", "Internal assessments, practicals, moderation, grade card generation, and rank lists.", Award],
  ["Fee Collection & Receipts", "Fee structures, dynamic UPI QR payments, instalment tracking, and GST receipt generation.", WalletCards],
  ["Hostel & Bed Allocation", "Hostel building blocks, room inventory, warden allocations, outpass approvals, and fees.", HeartHandshake],
  ["Transport & Route GPS", "Bus vehicle fleet, live route stops, pickup driver allocations, and maintenance schedules.", Bus],
  ["Library Catalog System", "Book issuing, ISBN cataloging, barcode circulation, return tracking, and overdue fines.", LibraryBig],
  ["Parent Communication", "SMS, WhatsApp, and portal announcements keeping families aligned with academic progress.", Users],
  ["Performance Analytics", "Section-wise comparisons, pass percentages, toppers list, and administrative insight dashboards.", BarChart3],
  ["Notice & Circular Broadcast", "Instant priority notices, academic event calendars, and departmental broadcasts.", Mail],
  ["Role-Based Security", "Granular permissions for Super Admin, Admin, Principal, Faculty, Accountant, and Receptionist.", ShieldCheck],
];

// ── 1. HOME SECTION COMPONENT ────────────────────────────────────────────────
function HomeSection({ content, onNavigate }) {
  const shouldReduce = useReducedMotion();

  const showcaseFeatures = [
    ["Online Admissions", "Fast, transparent intermediate application process with verified counseling.", ClipboardCheck, "admissions"],
    ["Student Management", "Comprehensive profiles, live attendance monitoring, and performance records.", Users, "cms"],
    ["Academic Excellence", "Rigorous MPC, BiPC, CEC, MEC coaching with modern laboratory facilities.", BookOpen, "academics"],
    ["Fee Management", "Transparent schedules, verified digital receipts, and instalment support.", WalletCards, "cms"],
    ["Results & Reports", "Term evaluations, automated report cards, and university entrance prep.", BarChart3, "cms"],
  ];

  return (
    <section id="home" className="public-home-hero-wrap">
      {/* Expansive Hero Banner */}
      <div className="landing-hero-banner public-home-hero">
        <HeroSlider variant="hero-bg" imageOverride={classImage} autoRotate={false} showControls={false} />
        <motion.div
          className="landing-hero-content public-home-hero-copy"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        >
          <span className="cms-eyebrow">
            <Building2 size={16} /> {content.landingBadge || "A Smarter Campus Starts Here"}
          </span>
          <h1>
            Your Gateway to<br />
            <span>A Bright Intermediate</span><br />
            Future
          </h1>
          <p>
            {content.landingDescription ||
              "PIRNAV Intermediate College brings students, faculty, academics and administration together in one integrated platform for better education and brighter futures."}
          </p>
          <div className="cms-hero-actions landing-hero-actions">
            <motion.button
              type="button"
              className="public-btn"
              onClick={() => onNavigate("admissions")}
              whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
            >
              Apply for Admission <ArrowRight size={17} />
            </motion.button>
            <motion.button
              type="button"
              className="public-btn is-outline"
              onClick={() => onNavigate("about")}
              whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
            >
              Explore College <ArrowRight size={17} />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* 5 Showcase Feature Tiles with Stagger Motion */}
      <motion.div
        className="public-home-feature-cards"
        aria-label="College management features"
        variants={staggerContainer}
        initial={"hidden"}
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
      >
        {showcaseFeatures.map(([title, description, Icon, targetId], index) => (
          <motion.button
            key={title}
            type="button"
            className="public-home-feature-tile"
            onClick={() => onNavigate(targetId)}
            variants={fadeUpVariant}
            whileHover={shouldReduce ? {} : { y: -7, boxShadow: "0 18px 36px rgba(0, 66, 39, 0.16)" }}
          >
            <span className="public-home-feature-icon">
              <Icon size={26} />
            </span>
            <b>0{index + 1}</b>
            <h2>{title}</h2>
            <p>{description}</p>
          </motion.button>
        ))}
      </motion.div>

      {/* Highlights Strip */}
      <div className="public-home-stat-strip" aria-label="College highlights">
        <div>
          <BookOpen size={26} />
          <strong>MPC &amp; BiPC</strong>
          <small>Science Programme Groups</small>
        </div>
        <div>
          <Calculator size={26} />
          <strong>CEC &amp; MEC</strong>
          <small>Commerce Programme Groups</small>
        </div>
        <div>
          <Users size={26} />
          <strong>Class 11 &amp; 12</strong>
          <small>Intermediate Education</small>
        </div>
        <div>
          <ShieldCheck size={26} />
          <strong>Integrated CMS</strong>
          <small>Digital Campus Platform</small>
        </div>
        <div>
          <Phone size={26} />
          <strong>Admissions Help</strong>
          <small>Active Front Desk Support</small>
        </div>
      </div>
    </section>
  );
}

// ── 2. ABOUT SECTION COMPONENT ────────────────────────────────────────────────
function AboutSection({ content, onNavigate }) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="public-section-inner">
      <AnimatedSectionHeader
        kicker="About Pirnav College"
        icon={Building2}
        title={<>Our Intermediate College <em>Empowers</em> Your Future.</>}
        description="Committed to academic excellence, state-of-the-art campus learning, and holistic mentorship for intermediate scholars."
      />

      <div className="public-home-about-layout" style={{ marginTop: "24px" }}>
        {/* Photo Collage with Generous Dimensions */}
        <motion.div
          className="public-about-collage"
          initial={{ opacity: 0, x: -35 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <div className="public-photo-container main-photo aspect-4-3">
            <img
              className="public-about-photo-main"
              src={libraryImage}
              alt="Students in college central library"
              loading="lazy"
            />
          </div>
          <div className="public-photo-container top-photo aspect-square">
            <img
              className="public-about-photo-top"
              src={classImage}
              alt="Interactive classroom session"
              loading="lazy"
            />
          </div>
          <div className="public-photo-container bottom-photo aspect-square">
            <img
              className="public-about-photo-bottom"
              src={labImage}
              alt="Physics and chemistry laboratories"
              loading="lazy"
            />
          </div>
          <div className="public-about-badge">
            <GraduationCap size={26} />
            <span>
              <strong>Intermediate (10+2)</strong>
              <small>Board of Intermediate Education</small>
            </span>
          </div>
        </motion.div>

        {/* Copy & 3 Pillars */}
        <motion.div
          className="public-home-about-copy"
          initial={{ opacity: 0, x: 35 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <span className="public-kicker">
            <Building2 size={16} /> About {content.collegeName || "Pirnav College"}
          </span>
          <h2>
            Excellence in <em>Intermediate</em> Education
          </h2>
          <p>
            {content.collegeName || "Pirnav College"} is a premier Intermediate (10+2) institution committed to quality education, strong academic support, and student-centric holistic development. Our college management system keeps academic and administrative operations smooth and transparent.
          </p>

          <div className="public-about-details">
            <article>
              <GraduationCap size={22} />
              <div>
                <h3>Academic Excellence</h3>
                <p>Top-tier MPC, BiPC, CEC, and MEC coaching with comprehensive entrance guidance.</p>
              </div>
            </article>
            <article>
              <Building2 size={22} />
              <div>
                <h3>Digital Campus Experience</h3>
                <p>Live attendance updates, digital fee receipts, transparent timetables, and notices.</p>
              </div>
            </article>
            <article>
              <HeartHandshake size={22} />
              <div>
                <h3>Dedicated Student Support</h3>
                <p>Personalized counselling, regular parent-teacher reviews, and hostel accommodations.</p>
              </div>
            </article>
          </div>

          <blockquote>
            &ldquo;Quality education, personal discipline, and holistic development for every student at {content.collegeName || "Pirnav College"}.&rdquo;
          </blockquote>

          <div className="public-about-actions">
            <motion.button
              type="button"
              className="public-btn"
              onClick={() => onNavigate("academics")}
              whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
            >
              Explore Academics <ArrowRight size={16} />
            </motion.button>
            <motion.a
              href={`tel:${(content.contactPhone || "+919908364909").replace(/[^+\d]/g, "")}`}
              className="public-btn is-outline"
              whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
              whileTap={shouldReduce ? {} : { scale: 0.97 }}
            >
              <Phone size={16} /> Call Us: {content.contactPhone || "+91 9908364909"}
            </motion.a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── 3. ACADEMICS SECTION COMPONENT ────────────────────────────────────────────
function AcademicsSection({ onNavigate }) {
  const shouldReduce = useReducedMotion();

  const courseShowcase = [
    ["Science Stream", "Class 11 & 12 – Science", "MPC (Engineering) & BiPC (Medical / Life Sciences) with cutting-edge labs.", labImage],
    ["Commerce Stream", "Class 11 & 12 – Commerce", "CEC & MEC streams focusing on Accountancy, Economics, and CA Foundation.", classImage],
    ["Campus Life", "Class 11 & 12 – Digital Campus", "Central library, smart classrooms, sports, seminars, and holistic growth.", libraryImage],
  ];

  return (
    <div className="public-section-inner">
      <AnimatedSectionHeader
        kicker="Our Courses & Programmes"
        icon={BookOpen}
        title={<>Let’s Explore Our <em>Programmes</em></>}
        description="Affiliated with the State Board of Intermediate Education, our college offers structured 2-year programmes designed to secure top academic ranks and entrance test success."
      />

      {/* 4 Programme Cards with Stagger Motion */}
      <motion.div
        className="public-programmes-grid"
        variants={staggerContainer}
        initial={"hidden"}
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
        style={{ marginTop: "28px" }}
      >
        {programmes.map((prog) => {
          const Icon = prog.icon;
          return (
            <motion.article
              key={prog.code}
              className="public-prog-card"
              variants={fadeUpVariant}
              whileHover={shouldReduce ? {} : { y: -8, boxShadow: "0 18px 40px rgba(0, 66, 39, 0.13)" }}
            >
              <div className="prog-card-top">
                <span className="prog-code-pill">{prog.code}</span>
                <span className="prog-stream-badge">{prog.stream}</span>
              </div>
              <div className="prog-icon-wrap">
                <Icon size={30} />
              </div>
              <h3>{prog.title}</h3>
              <p className="prog-desc">{prog.description}</p>
              <div className="prog-subjects">
                <strong>Subjects Covered:</strong>
                <span>{prog.subjects}</span>
              </div>
              <ul className="prog-highlights">
                {prog.highlights.map((h, i) => (
                  <li key={i}>
                    <CheckCircle2 size={15} /> {h}
                  </li>
                ))}
              </ul>
              <motion.button
                type="button"
                className="public-btn is-outline prog-enquire-btn"
                onClick={() => onNavigate("contact")}
                whileHover={shouldReduce ? {} : { scale: 1.02 }}
                whileTap={shouldReduce ? {} : { scale: 0.98 }}
              >
                Inquire About {prog.code} <ArrowRight size={14} />
              </motion.button>
            </motion.article>
          );
        })}
      </motion.div>

      {/* Course Showcase Cards with Aspect Ratios */}
      <div className="public-home-course-grid" style={{ marginTop: "42px" }}>
        {courseShowcase.map(([label, title, description, image]) => (
          <motion.article
            key={title}
            className="course-showcase-item"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            whileHover={shouldReduce ? {} : { y: -6 }}
            transition={{ duration: 0.4 }}
          >
            <div className="aspect-16-9 course-img-box">
              <img src={image} alt={title} loading="lazy" />
              <span>{label}</span>
            </div>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

// ── 4. ADMISSIONS SECTION COMPONENT ───────────────────────────────────────────
function AdmissionsSection({ content, onNavigate }) {
  const shouldReduce = useReducedMotion();

  const steps = [
    { num: "01", title: "Enquiry & Counselling", desc: "Submit an online enquiry or visit our admissions office for one-on-one group selection guidance." },
    { num: "02", title: "Application Submission", desc: "Fill out the admission registration form with student biographical details and marks list." },
    { num: "03", title: "Document Verification", desc: "Submit 10th Class SSC Marks Memo, Transfer Certificate (TC), Aadhaar, and passport photos." },
    { num: "04", title: "Eligibility Assessment", desc: "Admission desk reviews qualifying scores and confirms program group allocation." },
    { num: "05", title: "Fee Payment & Enrollment", desc: "Pay academic / hostel fees securely via UPI, Card, or Net Banking; receive digital receipt." },
    { num: "06", title: "Welcome & Induction", desc: "Receive student ID card, timetable schedule, college LMS credentials, and orientation details." },
  ];

  return (
    <div className="public-section-inner">
      <AnimatedSectionHeader
        kicker="Admissions 2026 – 2027"
        icon={ClipboardCheck}
        title="A Clear Way to Get Started"
        description="Simple, transparent, merit-oriented admissions process for Class 11 (Intermediate 1st Year)."
      />

      {/* Steps List */}
      <motion.div
        className="public-steps-grid"
        variants={staggerContainer}
        initial={"hidden"}
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
        style={{ marginTop: "28px" }}
      >
        {steps.map((st) => (
          <motion.div
            key={st.num}
            className="public-step-card"
            variants={fadeUpVariant}
            whileHover={shouldReduce ? {} : { y: -4, boxShadow: "0 12px 28px rgba(0, 48, 28, 0.09)" }}
          >
            <span className="step-num">{st.num}</span>
            <div className="step-info">
              <h3>{st.title}</h3>
              <p>{st.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Admissions Checklist & Quick Contact Banner */}
      <motion.div
        className="public-admissions-banner"
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.15 }}
        style={{ marginTop: "32px" }}
      >
        <div className="admissions-banner-copy">
          <h3>Required Documents for Intermediate Admission</h3>
          <ul>
            <li><CheckCircle2 size={17} /> Original SSC (10th) or equivalent marks memorandum</li>
            <li><CheckCircle2 size={17} /> Transfer Certificate (T.C.) &amp; Conduct Certificate</li>
            <li><CheckCircle2 size={17} /> Student and Parent Aadhaar Card photocopies</li>
            <li><CheckCircle2 size={17} /> Recent passport-size colour photographs (6 copies)</li>
            <li><CheckCircle2 size={17} /> Caste &amp; Income Certificate (if applicable for scholarship)</li>
          </ul>
        </div>
        <div className="admissions-banner-action">
          <h4>Have Questions About Seats?</h4>
          <p>Our admissions desk is open Monday to Saturday to assist prospective students and parents.</p>
          <motion.button
            type="button"
            className="public-btn is-white"
            onClick={() => onNavigate("contact")}
            whileHover={shouldReduce ? {} : { scale: 1.04 }}
            whileTap={shouldReduce ? {} : { scale: 0.97 }}
          >
            Submit Admission Enquiry <ArrowRight size={16} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── 5. STUDENT SERVICES & FAQ COMPONENT ───────────────────────────────────────
function StudentServicesSection({ content, onNavigate }) {
  const [openFaq, setOpenFaq] = useState(0);

  const faqItems = [
    ["Which programme groups are available at Pirnav College?", "We offer four premier Board of Intermediate Education programmes: MPC (Maths, Physics, Chemistry), BiPC (Biology, Physics, Chemistry), CEC (Civics, Economics, Commerce), and MEC (Maths, Economics, Commerce)."],
    ["What are the laboratory and practical learning facilities?", "Pirnav College hosts fully equipped, modern Physics, Chemistry, and Biology laboratories adhering strictly to board practical specifications with supervised safety equipment."],
    ["How are parents informed about student attendance and marks?", "Our integrated CMS automatically sends real-time attendance and exam marks to parents via SMS and portal notices. Term report cards are generated digitally."],
    ["Are hostel and campus transport facilities available?", "Yes! We provide safe, comfortable hostel accommodations with nutritious dining, as well as dedicated college bus routes covering major pickup points across the region."],
    ["How can I apply or schedule a campus visit?", "You can submit an online enquiry using the Contact form below, or directly call our reception desk at " + (content.contactPhone || "+91 9908364909") + " to book a campus visit."],
  ];

  return (
    <div className="public-section-inner">
      <AnimatedSectionHeader
        kicker="Student Services & Guidance"
        icon={HeartHandshake}
        title="Support for Learning & Campus Life"
        description="Comprehensive academic, residential, and digital services designed for students to thrive."
      />

      {/* 3 Support Columns */}
      <div className="public-support-cards" style={{ marginTop: "28px" }}>
        <article className="public-support-card">
          <div className="support-card-icon"><HeartHandshake size={30} /></div>
          <h3>Academic Mentoring</h3>
          <p>One-on-one mentorship by dedicated subject lecturers, regular doubt-clearing sessions, and specialized entrance study materials.</p>
        </article>
        <article className="public-support-card">
          <div className="support-card-icon"><Bus size={30} /></div>
          <h3>Safe Transport &amp; Hostel</h3>
          <p>Well-maintained college buses with GPS tracking, alongside monitored residential hostel blocks for outstation learners.</p>
        </article>
        <article className="public-support-card">
          <div className="support-card-icon"><Compass size={30} /></div>
          <h3>Career &amp; Entrance Prep</h3>
          <p>Guidance for EAMCET, JEE, NEET, CA Foundation, CLAT, and top university admissions with regular practice test series.</p>
        </article>
      </div>

      {/* FAQ Accordion */}
      <div className="public-faq-wrap">
        <h3 className="public-faq-title">Frequently Asked Questions</h3>
        <div className="public-faq-list">
          {faqItems.map(([question, answer], index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`public-faq-card${isOpen ? " is-open" : ""}`}
                onClick={() => setOpenFaq(isOpen ? -1 : index)}
              >
                <div className="public-faq-header">
                  <h4>{question}</h4>
                  <span className="faq-toggle-icon">
                    <ChevronDown size={19} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.25s" }} />
                  </span>
                </div>
                {isOpen && <p className="public-faq-body">{answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 6. CMS PLATFORM FEATURES COMPONENT ─────────────────────────────────────────
function CmsSection({ onNavigate }) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="public-section-inner">
      <AnimatedSectionHeader
        kicker="Campus Management System"
        icon={ShieldCheck}
        title="Complete Digital Operations in One Platform"
        description="PIRNAV College Management System powers daily academic administration, attendance, examinations, fee processing, and campus logistics."
      />

      <motion.div
        className="public-cms-grid"
        variants={staggerContainer}
        initial={"hidden"}
        whileInView="visible"
        viewport={{ once: false, amount: 0.15 }}
        style={{ marginTop: "28px" }}
      >
        {cmsFeatures.map(([title, description, Icon]) => (
          <motion.article
            key={title}
            className="public-cms-tile"
            variants={fadeUpVariant}
            whileHover={shouldReduce ? {} : { y: -5, boxShadow: "0 12px 30px rgba(0, 48, 28, 0.1)" }}
          >
            <span className="cms-tile-icon">
              <Icon size={24} />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </motion.article>
        ))}
      </motion.div>

      <div className="public-cms-login-cta" style={{ marginTop: "32px" }}>
        <div>
          <h3>Authorized Staff &amp; Student Portal Access</h3>
          <p>Faculty, staff, and enrolled students can sign into the management system to access their personal dashboards.</p>
        </div>
        <Link to="/login" className="public-btn is-white">
          Sign In to Portal <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

// ── 7. CONTACT & ENQUIRY COMPONENT ─────────────────────────────────────────────
function ContactSection({ content }) {
  return (
    <div className="public-section-inner">
      <AnimatedSectionHeader
        kicker="Contact Us & Location"
        icon={MapPin}
        title="Connect with Pirnav College"
        description="Have questions regarding admissions, fees, or course combinations? Send us an inquiry or reach out directly."
      />

      {/* 4 Contact Cards */}
      <div className="public-contact-cards-row" style={{ marginTop: "28px" }}>
        <div className="contact-info-card">
          <div className="card-icon"><MapPin size={24} /></div>
          <h4>Campus Address</h4>
          <p>{content.contactAddress || "Dwarakapuram, Pirnav, Nizamabad, Telangana - 503224"}</p>
        </div>
        <div className="contact-info-card">
          <div className="card-icon"><Phone size={24} /></div>
          <h4>Call Admissions</h4>
          <p>
            <a href={`tel:${(content.contactPhone || "+919908364909").replace(/[^+\d]/g, "")}`}>
              {content.contactPhone || "+91 9908364909"}
            </a>
          </p>
        </div>
        <div className="contact-info-card">
          <div className="card-icon"><Mail size={24} /></div>
          <h4>Email Inquiries</h4>
          <p>
            <a href={`mailto:${content.contactEmail || "pirnavjuniorcollege@gmail.com"}`}>
              {content.contactEmail || "pirnavjuniorcollege@gmail.com"}
            </a>
          </p>
        </div>
        <div className="contact-info-card">
          <div className="card-icon"><Clock size={24} /></div>
          <h4>Office Working Hours</h4>
          <p>{content.officeHours || "Monday – Saturday: 9:00 AM – 5:00 PM"}</p>
        </div>
      </div>

      {/* Embedded Interactive GetInTouch Form */}
      <div className="public-contact-form-wrap" style={{ marginTop: "36px" }}>
        <GetInTouchView contact={content} isPageView={true} />
      </div>
    </div>
  );
}

// ── MASTER LANDING PAGE COMPONENT ─────────────────────────────────────────────
export function PublicLandingPage({ targetInitialSection, disabled = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("home");

  // Smooth scroll handler accounting for sticky header offset
  const scrollToSection = (sectionId, smooth = true) => {
    if (!sectionId) return;
    const el = document.getElementById(sectionId);
    if (el) {
      const headerEl = document.querySelector(".cms-landing-nav.public-header");
      const headerHeight = headerEl ? headerEl.offsetHeight : 74;
      const offset = headerHeight + 8;
      const elementPosition = el.getBoundingClientRect().top;
      const targetY = Math.max(0, elementPosition + window.pageYOffset - offset);
      window.scrollTo({
        top: targetY,
        behavior: smooth ? "smooth" : "auto",
      });
      window.history.pushState(null, "", `#${sectionId}`);
      setActiveSection(sectionId);
    }
  };

  // Immediate scroll-to-target when URL hash or direct path exists
  useEffect(() => {
    const hash = window.location.hash ? window.location.hash.replace("#", "") : "";
    const path = window.location.pathname.replace("/", "");
    const validSections = ["home", "about", "academics", "admissions", "student-services", "cms", "contact"];

    const target = (hash && validSections.includes(hash))
      ? hash
      : (targetInitialSection && targetInitialSection !== "home" && validSections.includes(targetInitialSection))
      ? targetInitialSection
      : (validSections.includes(path) ? path : null);

    if (target && target !== "home") {
      const timer1 = setTimeout(() => scrollToSection(target, true), 80);
      const timer2 = setTimeout(() => scrollToSection(target, true), 350);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [location.pathname, location.hash, targetInitialSection]);

  // High-performance scroll tracking for sticky header navigation
  useEffect(() => {
    const sectionIds = ["home", "about", "academics", "admissions", "student-services", "cms", "contact"];
    let ticking = false;

    const updateActiveSection = () => {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const headerEl = document.querySelector(".cms-landing-nav.public-header");
      const headerHeight = (headerEl ? headerEl.offsetHeight : 74) + 16;

      // Check if user is scrolled to the very bottom of the document
      const isAtBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 70;
      if (isAtBottom) {
        setActiveSection("contact");
        ticking = false;
        return;
      }

      // Check sections from bottom to top
      const reversedIds = [...sectionIds].reverse();
      let current = "home";

      for (const id of reversedIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop - headerHeight;
          if (scrollY >= top - 25) {
            current = id;
            break;
          }
        }
      }

      setActiveSection(current);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateActiveSection);
        ticking = true;
      }
    };

    updateActiveSection();
    const initTimer1 = setTimeout(updateActiveSection, 150);
    const initTimer2 = setTimeout(updateActiveSection, 600);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      clearTimeout(initTimer1);
      clearTimeout(initTimer2);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <PublicSiteLayout
      activeSection={activeSection}
      onNavigateSection={scrollToSection}
      disabled={disabled}
    >
      {(content) => (
        <main className="public-single-page-scroll">
          {/* 1. Home Section */}
          <HomeSection content={content} onNavigate={scrollToSection} />

          {/* 2. About Section */}
          <section id="about" className="public-section is-pale">
            <AboutSection content={content} onNavigate={scrollToSection} />
          </section>

          {/* 3. Academics Section */}
          <section id="academics" className="public-section">
            <AcademicsSection onNavigate={scrollToSection} />
          </section>

          {/* 4. Admissions Section */}
          <section id="admissions" className="public-section is-pale">
            <AdmissionsSection content={content} onNavigate={scrollToSection} />
          </section>

          {/* 5. Student Services Section */}
          <section id="student-services" className="public-section">
            <StudentServicesSection content={content} onNavigate={scrollToSection} />
          </section>

          {/* 6. CMS Platform Features Section */}
          <section id="cms" className="public-section is-pale">
            <CmsSection onNavigate={scrollToSection} />
          </section>

          {/* 7. Contact Section */}
          <section id="contact" className="public-section">
            <ContactSection content={content} />
          </section>
        </main>
      )}
    </PublicSiteLayout>
  );
}

// ── SUPPORTING STATIC PAGES (e.g. Terms / Privacy) ───────────────────────────
function SupportingStaticPage({ page, disabled = false }) {
  const copy = {
    privacy: ["Privacy Information", "Pirnav College adheres to standard educational privacy practices to safeguard student records and confidential inquiries. Inquiries submitted via this site are processed strictly by college administrative personnel."],
    terms: ["Website Terms", "This website provides public information regarding courses, admission eligibility, and campus facilities. Registered portal areas require valid staff or student credentials."],
  }[page];

  return (
    <PublicSiteLayout page={page} disabled={disabled}>
      {() => (
        <main className="public-main public-page" style={{ padding: "40px 20px 80px" }}>
          <div className="public-page-shell" style={{ maxWidth: 860, margin: "0 auto" }}>
            <h1 style={{ fontSize: "28px", marginBottom: "16px", color: "var(--site-ink)" }}>{copy[0]}</h1>
            <p style={{ lineHeight: 1.7, color: "var(--site-muted)" }}>{copy[1]}</p>
            <div style={{ marginTop: "32px" }}>
              <Link to="/" className="public-btn">
                <ArrowRight size={16} style={{ transform: "rotate(180deg)" }} /> Return to Home
              </Link>
            </div>
          </div>
        </main>
      )}
    </PublicSiteLayout>
  );
}

// ── MAIN ROUTE EXPORT ─────────────────────────────────────────────────────────
export function PublicWebsitePage({ page, disabled = false }) {
  if (page === "privacy-policy") return <SupportingStaticPage page="privacy" disabled={disabled} />;
  if (page === "terms") return <SupportingStaticPage page="terms" disabled={disabled} />;
  const mappedSection = {
    about: "about",
    academics: "academics",
    features: "cms",
    admissions: "admissions",
    contact: "contact",
    help: "student-services",
    home: "home",
  }[page] || "home";

  return <PublicLandingPage targetInitialSection={mappedSection} disabled={disabled} />;
}

export function PublicRouteFallback() {
  return null;
}
