import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Mail, MapPin, Menu, Phone, X } from "lucide-react";
import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import ThemeToggle from "@/shared/components/ThemeToggle.jsx";
import logo from "@/assets/pirnav-colleges-logo.png";
import { useCampusImages } from "../admin/AdminSettings/campusImages.js";
import { getCampusContent } from "../admin/AdminSettings/campusContent.js";
import "./LandingPage.css";
import "./PublicSite.css";

const primaryLinks = [
  ["Home", "/", true], ["About", "/about"], ["Academics", "/academics"],
  ["Features", "/features"], ["Admissions", "/admissions"], ["Contact", "/contact"],
];
const headerLinks = [
  { label: "Home", to: "/", end: true },
  { label: "About", to: "/about" },
  { label: "Academics", to: "/academics" },
  { label: "Admissions", to: "/admissions" },
  { label: "Student Services", to: "/help" },
  { label: "CMS", to: "/features" },
  { label: "Contact", to: "/contact" },
];

export default function PublicSiteLayout({ children, page = "", disabled = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const content = getCampusContent(useCampusImages());
  const pageContent = typeof children === "function" ? children(content) : children;

  return (
    <div className="cms-landing public-website" aria-hidden={disabled || undefined} inert={disabled || undefined}>
      <div className="public-contact-strip"><div className="public-contact-social"><strong>Follow Us:</strong><span>f</span><span>◎</span><span>▶</span><span>in</span></div><div className="public-contact-details"><span><MapPin size={13} />{content.contactAddress}</span><a href={`mailto:${content.contactEmail}`}><Mail size={13} />{content.contactEmail}</a><a href={`tel:${content.contactPhone.replace(/[^+\d]/g, "")}`}><Phone size={13} />{content.contactPhone}</a></div></div>
      <header className="cms-landing-nav public-header">
        <Link className="cms-landing-brand public-brand" to="/" aria-label={`${content.collegeName} home`} onClick={() => setMenuOpen(false)}>
          <span className="landing-brand-logo"><CampusBrandImage slot="headerLogo" src={logo} alt={`${content.collegeName} logo`} /></span>
        </Link>
        <nav className={`public-nav${menuOpen ? " is-open" : ""}`} aria-label="Public website navigation">
          {headerLinks.map(({ label, to, end, anchor }) => anchor
            ? <Link key={to} to={to} onClick={() => setMenuOpen(false)}>{label}</Link>
            : <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive || page === to ? "is-active" : ""} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
        </nav>
        <div className="landing-header-actions public-actions-header">
          <ThemeToggle />
          <Link to="/login" className="landing-login-btn">Student Login</Link>
          <button type="button" className="public-menu-button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>
      {typeof children === "function" ? pageContent : <main>{pageContent}</main>}
      <footer className="landing-footer public-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand"><Link to="/" className="landing-footer-logo" aria-label={`${content.collegeName} home`}><CampusBrandImage slot="footerLogo" src={logo} alt={`${content.collegeName} logo`} /></Link><p>{content.footerDescription}</p></div>
          <div className="landing-footer-col"><h2>Quick Links</h2>{primaryLinks.map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}</div>
          <div className="landing-footer-col"><h2>Academics & Support</h2><Link to="/academics">MPC, BiPC, CEC & MEC</Link><Link to="/features">Platform Features</Link><Link to="/help">Help</Link><Link to="/privacy-policy">Privacy Policy</Link><Link to="/terms">Terms</Link></div>
          <div className="landing-footer-col"><h2>Contact Information</h2><span>{content.contactAddress || "Contact details to be added"}</span><a href={`mailto:${content.contactEmail}`}>{content.contactEmail}</a><a href={`tel:${content.contactPhone.replace(/[^+\d]/g, "")}`}>{content.contactPhone}</a></div>
        </div>
        <div className="landing-footer-bottom">&copy; {new Date().getFullYear()} {content.collegeName}. All rights reserved.</div>
      </footer>
    </div>
  );
}
