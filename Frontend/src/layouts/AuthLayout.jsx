import { Link } from "react-router-dom";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import HeroSlider from "@/components/common/HeroSlider.jsx";
import { heroCopy } from "@/data/heroSlides.js";
import { useCampusImages } from "../features/campusImages.js";
import { getCampusContent } from "../features/campusContent.js";
import "@/features/auth/styles/auth.css";

export default function AuthLayout({ title, subtitle, children, cardClass = "" }) {
  const images = useCampusImages();
  const content = getCampusContent(images);
  return (
    <div className="cms-auth">
      <div className="cms-auth-bg">
        <HeroSlider variant="bg" />
      </div>
      <aside className="cms-auth-aside">
        <div className="cms-anim-up cms-auth-hero-copy">
          {images.loginLogo && <img src={images.loginLogo} alt={`${content.loginCollegeName} logo`} style={{ maxWidth: 240, maxHeight: 100, objectFit: "contain", marginBottom: 20 }} />}
          <h2 className="cms-auth-hero-title">{images.loginCollegeName ?? heroCopy.headline}</h2>
          <p className="cms-auth-hero-desc">{images.loginTagline ?? heroCopy.subtitle}</p>
        </div>
      </aside>

      <main className="cms-auth-main">
        <div className={`cms-auth-card ${cardClass}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <h1>{title}</h1>
            </div>
            <ThemeToggle />
          </div>
          <p>{subtitle}</p>
          {children}
          <div className="cms-auth-links" style={{ marginTop: 20 }}>
            <Link to="/">Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}


