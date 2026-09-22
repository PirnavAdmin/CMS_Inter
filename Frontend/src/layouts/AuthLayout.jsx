import { Link } from "react-router-dom";
import ThemeToggle from "@/components/common/ThemeToggle.jsx";
import HeroSlider from "@/components/common/HeroSlider.jsx";
import { heroCopy } from "@/data/heroSlides.js";
import "@/features/auth/styles/auth.css";

export default function AuthLayout({ title, subtitle, children, cardClass = "" }) {
  return (
    <div className="cms-auth">
      <div className="cms-auth-bg">
        <HeroSlider variant="bg" />
      </div>
      <aside className="cms-auth-aside">
        <div className="cms-anim-up cms-auth-hero-copy">
          <h2 className="cms-auth-hero-title">{heroCopy.headline}</h2>
          <p className="cms-auth-hero-desc">{heroCopy.subtitle}</p>
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


