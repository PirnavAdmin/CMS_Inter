import { getHeaderBrand, useCampusImages } from "../../modules/admin/AdminSettings/campusImages.js";
import crest from "../../assets/pirnav-college-crest.png";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../hooks/useTheme.js";
import pirnavCollegesLogoDark from "../../assets/pirnav-colleges-logo-dark.png";
import pirnavCollegesLogo from "../../assets/pirnav-colleges-logo.png";

export function fitHeaderLineSizes(brand, width, height, measure) {
  const lines = [
    [brand.dashboardTitle, Number(brand.dashboardTitleSize), brand.dashboardTitleWeight, 0.45],
    [brand.dashboardSubtitle, Number(brand.dashboardSubtitleSize), brand.dashboardSubtitleWeight, 0.35],
    [brand.dashboardTagline, Number(brand.dashboardTaglineSize), brand.dashboardTaglineWeight, 0.2],
  ];
  // Stable height budgets keep one line's size changes from resizing the others.
  const totalBudget = lines.reduce((total, [text, , , budget]) => total + (text ? budget : 0), 0) || 1;
  const availableHeight = Math.max(0, height - 12);
  return lines.map(([text, size, weight, budget], index) => {
    if (!text) return 0;
    const heightFit = availableHeight * budget / totalBudget / 1.15;
    let low = 0;
    let high = Math.max(0, Math.min(size, heightFit));
    // The measurer includes letter spacing. Leave a pixel for glyph overhang/rounding.
    const fits = (candidate) => measure(text, candidate, weight, index) <= Math.max(0, width - 1);
    if (fits(high)) return high;
    for (let step = 0; step < 18; step += 1) {
      const middle = (low + high) / 2;
      if (fits(middle)) low = middle;
      else high = middle;
    }
    return low;
  });
}

export function HeaderBrand({ configuration, alt = "College logo", onFitChange, ...props }) {
  const brand = useMemo(() => getHeaderBrand(configuration), [configuration]);
  const textBox = useRef(null);
  const lineElements = useRef([]);
  const [sizes, setSizes] = useState(() => [Number(brand.dashboardTitleSize), Number(brand.dashboardSubtitleSize), Number(brand.dashboardTaglineSize)]);
  useLayoutEffect(() => {
    const box = textBox.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!box || !context) return undefined;
    let active = true;
    const fit = () => {
      if (!active) return;
      const styles = lineElements.current.map((element) => element ? getComputedStyle(element) : null);
      const next = fitHeaderLineSizes(brand, box.clientWidth, box.clientHeight, (text, fontSize, weight, index) => {
        const style = styles[index];
        context.font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
        const spacingRatio = parseFloat(style.fontSize) > 0
          ? (parseFloat(style.letterSpacing) || 0) / parseFloat(style.fontSize)
          : parseFloat(lineElements.current[index].style.letterSpacing) || 0;
        const metrics = context.measureText(text);
        const glyphWidth = Math.max(metrics.width, (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0));
        return glyphWidth + Array.from(text).length * fontSize * spacingRatio;
      });
      setSizes((previous) => previous.every((value, index) => value === next[index]) ? previous : next);
      onFitChange?.(next.some((size, index) => Boolean([brand.dashboardTitle, brand.dashboardSubtitle, brand.dashboardTagline][index]) && size < 8));
    };
    fit();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    observer?.observe(box);
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit);
    document.fonts?.addEventListener("loadingdone", fit);
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener("resize", fit);
      document.fonts?.removeEventListener("loadingdone", fit);
    };
  }, [brand, onFitChange]);
  const line = { display: "block", margin: 0, minWidth: 0, whiteSpace: "nowrap", flexShrink: 0, lineHeight: 1.15 };
  const ornament = { display: "flex", alignItems: "center", margin: 0, gap: 4, color: brand.dashboardSubtitleColor, height: 5, flex: "0 0 5px", fontSize: 8, lineHeight: 1, overflow: "hidden" };
  const rule = { height: 1, margin: 0, flex: 1, minWidth: 0, background: "currentColor", opacity: 0.6 };
  return <span {...props} style={{ ...props.style, display: "flex", alignItems: "center", gap: 8, width: "100%", height: "100%", minWidth: 0, maxWidth: "100%", overflow: "hidden", transform: "none", filter: "none" }}>
    <CampusLogoImage slot="dashboardLogo" configuration={configuration || {}} src={configuration?.dashboardLogo || crest} alt={alt} style={{ width: Number(brand.dashboardLogoSize), height: Number(brand.dashboardLogoSize), maxWidth: "35%", maxHeight: "100%", minWidth: 0, flexShrink: 0, objectFit: "contain" }} onError={(event) => {
      if (event.currentTarget.src !== new URL(crest, window.location.href).href) event.currentTarget.src = crest;
    }} />
    <span ref={textBox} style={{ display: "flex", flexDirection: "column", justifyContent: "center", margin: 0, flex: "1 1 0", height: "100%", minWidth: 0, overflow: "hidden", fontFamily: "Georgia, 'Times New Roman', serif", textAlign: brand.dashboardTitleAlign }}>
      <span aria-hidden="true" style={ornament}><span style={rule} />{"\u2723"}<span style={rule} /></span>
      <span ref={(element) => { lineElements.current[0] = element; }} title={brand.dashboardTitle} style={{ ...line, color: brand.dashboardTitleColor, fontSize: sizes[0], fontWeight: Number(brand.dashboardTitleWeight), textAlign: brand.dashboardTitleAlign, letterSpacing: "0.04em" }}>{brand.dashboardTitle}</span>
      {brand.dashboardSubtitle && <span ref={(element) => { lineElements.current[1] = element; }} title={brand.dashboardSubtitle} style={{ ...line, color: brand.dashboardSubtitleColor, fontSize: sizes[1], fontWeight: Number(brand.dashboardSubtitleWeight), textAlign: brand.dashboardSubtitleAlign, letterSpacing: "0.18em" }}>{brand.dashboardSubtitle}</span>}
      <span aria-hidden="true" style={ornament}><span style={rule} />{"\u2723"}<span style={rule} /></span>
      {brand.dashboardTagline && <span ref={(element) => { lineElements.current[2] = element; }} title={brand.dashboardTagline} style={{ ...line, color: brand.dashboardTaglineColor, fontSize: sizes[2], fontWeight: Number(brand.dashboardTaglineWeight), textAlign: brand.dashboardTaglineAlign, fontStyle: "italic" }}>{brand.dashboardTagline}</span>}
    </span>
  </span>;
}

const logoCache = new Map();

/**
 * Ensures any logo image with an opaque light/olive/cream background is cleanly
 * stripped to a transparent PNG so it matches every theme surface and dark mode.
 */
function cleanLogoBackground(src) {
  if (!src) return Promise.resolve(src);
  if (logoCache.has(src)) return Promise.resolve(logoCache.get(src));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          logoCache.set(src, src);
          return resolve(src);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample 4 corners
        const cornerIndices = [
          0,
          (w - 1) * 4,
          ((h - 1) * w) * 4,
          ((h - 1) * w + (w - 1)) * 4,
        ];

        // Check if all 4 corners are opaque (alpha > 200) and light/olive/cream
        const isCornerOpaqueAndLight = (idx) => {
          const a = data[idx + 3];
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return a > 200 && r > 160 && g > 160 && b > 140;
        };

        const allCornersLight = cornerIndices.every(isCornerOpaqueAndLight);

        if (allCornersLight) {
          let bgR = 0;
          let bgG = 0;
          let bgB = 0;
          cornerIndices.forEach((idx) => {
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
          });
          bgR /= 4;
          bgG /= 4;
          bgB /= 4;

          const total = w * h;
          for (let i = 0; i < total; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a > 0) {
              const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
              const isOliveCream = r > 195 && g > 205 && b > 165 && Math.abs(r - g) < 45;

              if (dist < 45 || isOliveCream) {
                data[idx + 3] = 0;
              } else if (dist < 65) {
                const factor = (dist - 45) / 20;
                data[idx + 3] = Math.round(a * factor);
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
          const transparentUrl = canvas.toDataURL("image/png");
          logoCache.set(src, transparentUrl);
          return resolve(transparentUrl);
        }

        logoCache.set(src, src);
        return resolve(src);
      } catch {
        logoCache.set(src, src);
        return resolve(src);
      }
    };
    img.onerror = () => {
      logoCache.set(src, src);
      resolve(src);
    };
    img.src = src;
  });
}

function CampusLogoImage({ slot = "dashboardLogo", src, alt, configuration, ...props }) {
  const saved = useCampusImages();
  const images = configuration ?? saved;
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark");

  const configured = images[slot];
  const initialSrc = configured || src || pirnavCollegesLogo;

  // In dark mode, if using the default Pirnav Colleges logo, use the crisp dark-mode optimized asset
  const isDefaultPirnavLogo =
    (!configured && !src) ||
    (typeof configured === "string" && configured.includes("pirnav-colleges-logo")) ||
    (typeof src === "string" && src.includes("pirnav-colleges-logo")) ||
    src === pirnavCollegesLogo;

  const rawSrc = isDark && isDefaultPirnavLogo ? pirnavCollegesLogoDark : initialSrc;
  const isLogoSlot = ["dashboardLogo", "loginLogo", "headerLogo", "footerLogo"].includes(slot) || !slot;
  const [displaySrc, setDisplaySrc] = useState(() => logoCache.get(rawSrc) || rawSrc);

  useEffect(() => {
    setDisplaySrc(logoCache.get(rawSrc) || rawSrc);
    let active = true;
    if (isLogoSlot && rawSrc) {
      if (logoCache.has(rawSrc)) {
        setDisplaySrc(logoCache.get(rawSrc));
      } else {
        cleanLogoBackground(rawSrc).then((cleaned) => {
          if (active) setDisplaySrc(cleaned);
        });
      }
    }
    return () => {
      active = false;
    };
  }, [rawSrc, isLogoSlot]);

  return (
    <img
      {...props}
      src={displaySrc || rawSrc}
      alt={alt}
      onError={(event) => {
        const fallback = src || pirnavCollegesLogo;
        try {
          if (event.currentTarget.src !== new URL(fallback, window.location.href).href) {
            event.currentTarget.src = fallback;
          }
        } catch {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}

export default function CampusBrandImage({ slot = "dashboardLogo", src, alt, ...props }) {
  const images = useCampusImages();
  return slot === "dashboardLogo"
    ? <HeaderBrand {...props} configuration={images} alt={alt} />
    : <CampusLogoImage {...props} slot={slot} src={src} alt={alt} configuration={images} />;
}
