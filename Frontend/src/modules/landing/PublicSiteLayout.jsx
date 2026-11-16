import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Mail,
  MapPin,
  Menu,
  Phone,
  X,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Globe,
  Github,
  Send,
  Share2,
  Clock,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import ThemeToggle from "@/shared/components/ThemeToggle.jsx";
import logo from "@/assets/pirnav-colleges-logo.png";
import { useCampusImages } from "../admin/AdminSettings/campusImages.js";
import { getCampusContent } from "../admin/AdminSettings/campusContent.js";
import landingConfigApi from "@/api/landingConfigApi.js";
import "./LandingPage.css";
import "./PublicSite.css";

const defaultSocialLinks = [
  { id: "facebook", platform: "Facebook", url: "https://facebook.com/pirnavcollege", icon: "facebook", isActive: true },
  { id: "instagram", platform: "Instagram", url: "https://instagram.com/pirnavcollege", icon: "instagram", isActive: true },
  { id: "twitter", platform: "Twitter / X", url: "https://twitter.com/pirnavcollege", icon: "twitter", isActive: true },
  { id: "linkedin", platform: "LinkedIn", url: "https://linkedin.com/company/pirnavcollege", icon: "linkedin", isActive: true },
  { id: "youtube", platform: "YouTube", url: "https://youtube.com/@pirnavcollege", icon: "youtube", isActive: true },
];

export function SocialIcon({ icon, size = 18 }) {
  const norm = String(icon || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  switch (norm) {
    case "facebook":
      return <Facebook size={size} />;
    case "instagram":
      return <Instagram size={size} />;
    case "twitter":
    case "x":
      return <Twitter size={size} />;
    case "linkedin":
      return <Linkedin size={size} />;
    case "youtube":
      return <Youtube size={size} />;
    case "github":
      return <Github size={size} />;
    case "send":
    case "telegram":
      return <Send size={size} />;
    case "share":
    case "share2":
      return <Share2 size={size} />;
    default:
      return <Globe size={size} />;
  }
}

export const NAV_ITEMS = [
  { id: "home", label: "Home", to: "/" },
  { id: "about", label: "About", to: "/about" },
  { id: "academics", label: "Academics", to: "/academics" },
  { id: "admissions", label: "Admissions", to: "/admissions" },
  { id: "student-services", label: "Student Services", to: "/help" },
  { id: "cms", label: "CMS", to: "/features" },
  { id: "contact", label: "Contact", to: "/contact" },
];

export default function PublicSiteLayout({
  children,
  page = "",
  activeSection: propActiveSection,
  onNavigateSection,
  disabled = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [socialLinks, setSocialLinks] = useState(defaultSocialLinks);
  const content = getCampusContent(useCampusImages());

  // Determine current active section
  const [localActiveSection, setLocalActiveSection] = useState("home");
  const activeSection = propActiveSection || localActiveSection;

  // Track window scroll to add shadow and elevated frosted-glass styling
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(offset > 12);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch configured social links from MySQL backend DB
  useEffect(() => {
    let active = true;
    landingConfigApi
      .getLandingConfig()
      .then((cfg) => {
        if (active && cfg?.socialLinks?.length) {
          setSocialLinks(cfg.socialLinks);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleNavClick = (item) => {
    setMenuOpen(false);
    if (onNavigateSection) {
      onNavigateSection(item.id);
      return;
    }

    const sectionEl = document.getElementById(item.id);
    if (sectionEl) {
      const headerEl = document.querySelector(".cms-landing-nav.public-header");
      const headerOffset = (headerEl?.offsetHeight || 74) + 6;
      const elementPosition = sectionEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      });
      window.history.pushState(null, "", `#${item.id}`);
      setLocalActiveSection(item.id);
    } else {
      navigate(`/#${item.id}`);
    }
  };

  const pageContent = typeof children === "function" ? children(content) : children;

  return (
    <div
      className="cms-landing public-website"
      aria-hidden={disabled || undefined}
      inert={disabled || undefined}
    >
      {/* Main Navigation Bar - Permanently Fixed / Sticky at top: 0 with Glassmorphism */}
      <header
        className={`cms-landing-nav public-header${isScrolled ? " is-sticky-scrolled" : ""}`}
      >
        <Link
          className="cms-landing-brand public-brand"
          to="/"
          aria-label={`${content.collegeName} home`}
          onClick={() => handleNavClick(NAV_ITEMS[0])}
        >
          <span className="landing-brand-logo">
            <CampusBrandImage
              slot="headerLogo"
              src={logo}
              alt={`${content.collegeName} logo`}
            />
          </span>
        </Link>

        {/* 8 Navigation Items: Home, About, Academics, Admissions, Student Services, CMS, Contact */}
        <nav
          className={`public-nav${menuOpen ? " is-open" : ""}`}
          aria-label="Public website navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`public-nav-link${isActive ? " is-active" : ""}`}
                onClick={() => handleNavClick(item)}
              >
                <span>{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="activeNavIndicator"
                    className="public-nav-indicator"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Header Actions: Theme Toggle, Mobile Menu, Strictly "Login" */}
        <div className="landing-header-actions public-actions-header">
          <ThemeToggle />
          <Link to="/login" className="landing-login-btn">
            Login
          </Link>
          <button
            type="button"
            className="public-menu-button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Main Single-Page Content Area */}
      {typeof children === "function" ? pageContent : <main>{pageContent}</main>}

      {/* Footer with Integrated "Follow Us" Social Media Icons (from DB) and Campus Details */}
            {/* Premium Restoran-Style Master Footer */}
      <footer className="public-master-footer">
        <div className="footer-main-grid">
          {/* Column 1: College Brand & Social Media */}
          <div className="footer-col-brand">
            <Link
              to="/"
              className="footer-logo-wrap"
              aria-label={`${content.collegeName} home`}
              onClick={() => handleNavClick(NAV_ITEMS[0])}
            >
              <CampusBrandImage
                slot="footerLogo"
                src={logo}
                alt={`${content.collegeName} logo`}
              />
            </Link>
            <p className="footer-brand-desc">
              {content.footerDescription || "PIRNAV Intermediate College empowers scholars with academic rigor, modern laboratories, and transparent campus administration."}
            </p>

            {/* Configured Social Media Links (Admin DB) */}
            <div className="footer-socials-box">
              <span className="footer-social-title">Follow Us</span>
              <div className="footer-social-icons">
                {socialLinks
                  .filter((item) => item.isActive && item.url)
                  .map((item) => (
                    <motion.a
                      key={item.id || item.platform}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-social-btn"
                      aria-label={`Follow on ${item.platform}`}
                      title={item.platform}
                      whileHover={{ scale: 1.15, y: -3 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <SocialIcon icon={item.icon} size={18} />
                    </motion.a>
                  ))}
              </div>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="footer-col">
            <h2 className="footer-col-title">Quick Navigation</h2>
            <div className="footer-links-list">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="footer-nav-link"
                  onClick={() => handleNavClick(item)}
                >
                  <ChevronRight size={14} className="footer-link-chevron" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Column 3: Academics & Support */}
          <div className="footer-col">
            <h2 className="footer-col-title">Academics &amp; Support</h2>
            <div className="footer-links-list">
              <button
                type="button"
                className="footer-nav-link"
                onClick={() => handleNavClick(NAV_ITEMS[2])}
              >
                <ChevronRight size={14} className="footer-link-chevron" />
                <span>MPC &amp; BiPC (Science)</span>
              </button>
              <button
                type="button"
                className="footer-nav-link"
                onClick={() => handleNavClick(NAV_ITEMS[2])}
              >
                <ChevronRight size={14} className="footer-link-chevron" />
                <span>CEC &amp; MEC (Commerce)</span>
              </button>
              <button
                type="button"
                className="footer-nav-link"
                onClick={() => handleNavClick(NAV_ITEMS[5])}
              >
                <ChevronRight size={14} className="footer-link-chevron" />
                <span>Platform Features (CMS)</span>
              </button>
              <button
                type="button"
                className="footer-nav-link"
                onClick={() => handleNavClick(NAV_ITEMS[4])}
              >
                <ChevronRight size={14} className="footer-link-chevron" />
                <span>Student Support &amp; FAQ</span>
              </button>
              <Link to="/privacy-policy" className="footer-nav-link">
                <ChevronRight size={14} className="footer-link-chevron" />
                <span>Privacy Policy</span>
              </Link>
              <Link to="/terms" className="footer-nav-link">
                <ChevronRight size={14} className="footer-link-chevron" />
                <span>Website Terms</span>
              </Link>
            </div>
          </div>

          {/* Column 4: Contact Information */}
          <div className="footer-col">
            <h2 className="footer-col-title">Contact Information</h2>
            <div className="footer-contact-list">
              <div className="footer-contact-row">
                <MapPin size={18} className="footer-contact-icon" />
                <span>{content.contactAddress || "Dwarakapuram, Pirnav, Nizamabad, Telangana - 503224"}</span>
              </div>
              <div className="footer-contact-row">
                <Phone size={18} className="footer-contact-icon" />
                <a href={`tel:${(content.contactPhone || "+919908364909").replace(/[^+\d]/g, "")}`}>
                  {content.contactPhone || "+91 9908364909"}
                </a>
              </div>
              <div className="footer-contact-row">
                <Mail size={18} className="footer-contact-icon" />
                <a href={`mailto:${content.contactEmail || "pirnavjuniorcollege@gmail.com"}`}>
                  {content.contactEmail || "pirnavjuniorcollege@gmail.com"}
                </a>
              </div>
              <div className="footer-hours-card">
                <Clock size={16} className="footer-hours-icon" />
                <div>
                  <strong>Admissions Office Hours:</strong>
                  <span>{content.officeHours || "Monday – Saturday: 9:00 AM – 5:00 PM"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Credits Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-bottom-inner">
            <p className="footer-copyright">
              &copy; {new Date().getFullYear()} {content.collegeName || "Pirnav College"}. All rights reserved.
            </p>
            <div className="footer-bottom-links">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <span>•</span>
              <Link to="/terms">Terms of Service</Link>
              <span>•</span>
              <Link to="/login">Student &amp; Staff Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
