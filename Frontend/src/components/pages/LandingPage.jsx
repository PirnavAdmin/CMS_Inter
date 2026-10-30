import CampusBrandImage from "@/components/common/CampusBrandImage.jsx";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import HeroSlider from "@/components/common/HeroSlider.jsx";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import logo from "@/assets/pirnav-colleges-logo.png";
import { useCampusImages } from "../../features/campusImages.js";
import { getCampusContent } from "../../features/campusContent.js";
import "./LandingPage.css";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Login", to: "/login" },
];

const modules = ["Admissions", "Attendance", "Exams", "Fees", "Reports"];

export default function LandingPage() {
  const content = getCampusContent(useCampusImages());
  return (
    <div className="cms-landing">
      <header className="cms-landing-nav">
        <div className="cms-landing-brand">
          <span className="landing-brand-logo"><CampusBrandImage slot="headerLogo" src={logo} alt={`${content.collegeName} logo`} /></span>
        </div>
        <div className="landing-header-actions"><ThemeToggle /><Link to="/login" className="landing-login-btn">{content.landingLoginButton}</Link></div>
      </header>

      <section className="landing-hero-banner">
        <HeroSlider variant="hero-bg" />
        <div className="landing-hero-content cms-anim-up">
          <span className="cms-eyebrow"><CheckCircle2 size={14} /> {content.landingBadge}</span>
          <h1>{content.landingHeadline}</h1>
          <p>{content.landingDescription}</p>
          <div className="landing-trust-points" aria-label="Platform benefits">
            <span><CheckCircle2 size={15} /> {content.landingBenefit1}</span>
            <span><CheckCircle2 size={15} /> {content.landingBenefit2}</span>
            <span><CheckCircle2 size={15} /> {content.landingBenefit3}</span>
          </div>
          <div className="cms-hero-actions landing-hero-actions">
            <Link to="/login" className="cms-btn landing-start-btn">{content.landingButton} <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-footer-logo"><CampusBrandImage slot="footerLogo" src={logo} alt={`${content.collegeName} logo`} /></span>
            <div>
              <p>{content.footerDescription}</p>
            </div>
          </div>
          <div className="landing-footer-col">
            <h2>Quick Links</h2>
            {quickLinks.map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}
          </div>
          <div className="landing-footer-col">
            <h2>Modules</h2>
            {modules.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className="landing-footer-col">
            <h2>Contact</h2>
            <span>{content.contactAddress}</span>
            <a href={`mailto:${content.contactEmail}`}>{content.contactEmail}</a>
            <a href={`tel:${content.contactPhone.replace(/[^+\d]/g, "")}`}>{content.contactPhone}</a>
          </div>
        </div>
        <div className="landing-footer-bottom">&copy; {new Date().getFullYear()} {content.collegeName}. All rights reserved.</div>
      </footer>
    </div>
  );
}
