import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import HeroSlider from "@/components/common/HeroSlider.jsx";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import logo from "@/assets/pirnav-colleges-logo.png";
import "./LandingPage.css";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Login", to: "/login" },
  { label: "Register", to: "/register" },
];

const modules = ["Admissions", "Attendance", "Exams", "Fees", "Reports"];

export default function LandingPage() {
  return (
    <div className="cms-landing">
      <header className="cms-landing-nav">
        <div className="cms-landing-brand">
          <span className="landing-brand-logo"><img src={logo} alt="Pirnav College logo" /></span>
        </div>
        <div className="landing-header-actions"><ThemeToggle /><Link to="/login" className="landing-login-btn">Login</Link></div>
      </header>

      <section className="landing-hero-banner">
        <HeroSlider variant="hero-bg" />
        <div className="landing-hero-content cms-anim-up">
          <span className="cms-eyebrow"><CheckCircle2 size={14} /> A smarter campus starts here</span>
          <h1>Learn, grow and succeed with a connected college experience.</h1>
          <p>Bring students, faculty, academics, examinations, fees and administration together in one clear, reliable platform built for Pirnav College.</p>
          <div className="landing-trust-points" aria-label="Platform benefits">
            <span><CheckCircle2 size={15} /> Faster daily operations</span>
            <span><CheckCircle2 size={15} /> Clear academic visibility</span>
            <span><CheckCircle2 size={15} /> Better student outcomes</span>
          </div>
          <div className="cms-hero-actions landing-hero-actions">
            <Link to="/register" className="cms-btn landing-start-btn">Get Started <ArrowRight size={16} /></Link>
            <Link to="/login" className="cms-btn landing-start-btn landing-explore-btn">Explore the platform <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-footer-logo"><img src={logo} alt="Pirnav College logo" /></span>
            <div>
              <p>One connected platform for academics, admissions, administration and student success.</p>
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
            <span>Vijayawada, Andhra Pradesh</span>
            <a href="mailto:support@pirnavcollege.com">support@pirnavcollege.com</a>
            <a href="tel:+919398649798">+91 9398649798</a>
          </div>
        </div>
        <div className="landing-footer-bottom">&copy; 2026 Pirnav College. All rights reserved.</div>
      </footer>
    </div>
  );
}
