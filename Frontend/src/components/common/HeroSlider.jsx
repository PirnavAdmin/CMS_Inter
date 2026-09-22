import { useEffect, useState } from "react";
import { heroSlides } from "@/data/heroSlides.js";
import "./HeroSlider.css";

export default function HeroSlider({ variant = "card" }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setIndex((current) => (current + 1) % heroSlides.length), 2000);
    return () => window.clearInterval(id);
  }, []);

  const isBackground = variant === "bg" || variant === "hero-bg";

  return (
    <div className={`cms-slider ${isBackground ? "is-bg" : ""} ${variant === "hero-bg" ? "is-hero-bg" : ""}`} role="region" aria-label="College highlights">
      <div className="cms-slider-frame">
        {heroSlides.map((slide, slideIndex) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            width={1600}
            height={1000}
            loading={slideIndex === 0 ? "eager" : "lazy"}
            className={`cms-slide ${slideIndex === index ? "is-active" : ""}`}
            aria-hidden={slideIndex === index ? undefined : true}
          />
        ))}
        {isBackground ? <span className="cms-slide-overlay" /> : null}
      </div>
      <div className="cms-slider-dots">
        {heroSlides.map((slide, slideIndex) => (
          <button
            key={slide.src}
            type="button"
            className={`cms-slider-dot ${slideIndex === index ? "is-active" : ""}`}
            aria-label={`Show slide ${slideIndex + 1}`}
            aria-current={slideIndex === index ? "true" : undefined}
            onClick={() => setIndex(slideIndex)}
          />
        ))}
      </div>
    </div>
  );
}