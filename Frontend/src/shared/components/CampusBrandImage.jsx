import { getHeaderBrand, useCampusImages } from "../../modules/admin/AdminSettings/campusImages.js";
import crest from "../../assets/pirnav-college-crest.png";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

export function fitHeaderLineSizes(brand, width, height, measure) {
  const lines = [
    [brand.dashboardTitle, Number(brand.dashboardTitleSize), brand.dashboardTitleWeight, 0.04, 0.45],
    [brand.dashboardSubtitle, Number(brand.dashboardSubtitleSize), brand.dashboardSubtitleWeight, 0.18, 0.35],
    [brand.dashboardTagline, Number(brand.dashboardTaglineSize), brand.dashboardTaglineWeight, 0, 0.2],
  ];
  // Stable height budgets keep one line's size changes from resizing the others.
  const totalBudget = lines.reduce((total, [text, , , , budget]) => total + (text ? budget : 0), 0) || 1;
  const availableHeight = Math.max(0, height - 12);
  return lines.map(([text, size, weight, spacing, budget], index) => {
    if (!text) return 0;
    const naturalWidth = Math.max(1, measure(text, size, weight, index) + text.length * size * spacing);
    const widthFit = size * Math.min(1, Math.max(0.4, width / naturalWidth));
    const heightFit = availableHeight * budget / totalBudget / 1.15;
    return Math.max(0, Math.min(size, widthFit, heightFit));
  });
}

export function HeaderBrand({ configuration, alt = "College logo", ...props }) {
  const brand = useMemo(() => getHeaderBrand(configuration), [configuration]);
  const textBox = useRef(null);
  const [sizes, setSizes] = useState(() => [Number(brand.dashboardTitleSize), Number(brand.dashboardSubtitleSize), Number(brand.dashboardTaglineSize)]);
  useLayoutEffect(() => {
    const box = textBox.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!box || !context) return undefined;
    const fit = () => {
      const next = fitHeaderLineSizes(brand, box.clientWidth, box.clientHeight, (text, fontSize, weight, index) => {
        context.font = `${index === 2 ? "italic " : ""}${weight} ${fontSize}px Georgia, serif`;
        return context.measureText(text).width;
      });
      setSizes((previous) => previous.every((value, index) => Math.abs(value - next[index]) < 0.001) ? previous : next);
    };
    fit();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", fit);
      return () => window.removeEventListener("resize", fit);
    }
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [brand]);
  const line = { display: "block", margin: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0, lineHeight: 1.15 };
  const ornament = { display: "flex", alignItems: "center", margin: 0, gap: 4, color: brand.dashboardSubtitleColor, height: 5, flex: "0 0 5px", fontSize: 8, lineHeight: 1, overflow: "hidden" };
  const rule = { height: 1, margin: 0, flex: 1, minWidth: 0, background: "currentColor", opacity: 0.6 };
  return <span {...props} style={{ ...props.style, display: "flex", alignItems: "center", gap: 8, width: "100%", height: "100%", minWidth: 0, maxWidth: "100%", overflow: "hidden", transform: "none", filter: "none" }}>
    <img src={configuration?.dashboardLogo || crest} alt={alt} style={{ width: Number(brand.dashboardLogoSize), height: Number(brand.dashboardLogoSize), maxWidth: "35%", maxHeight: "100%", minWidth: 0, flexShrink: 0, objectFit: "contain" }} onError={(event) => {
      if (event.currentTarget.src !== new URL(crest, window.location.href).href) event.currentTarget.src = crest;
    }} />
    <span ref={textBox} style={{ display: "flex", flexDirection: "column", justifyContent: "center", margin: 0, flex: "1 1 0", height: "100%", minWidth: 0, overflow: "hidden", fontFamily: "Georgia, 'Times New Roman', serif", textAlign: brand.dashboardTitleAlign }}>
      <span aria-hidden="true" style={ornament}><span style={rule} />{"\u2723"}<span style={rule} /></span>
      <span title={brand.dashboardTitle} style={{ ...line, color: brand.dashboardTitleColor, fontSize: sizes[0], fontWeight: Number(brand.dashboardTitleWeight), textAlign: brand.dashboardTitleAlign, letterSpacing: "0.04em" }}>{brand.dashboardTitle}</span>
      {brand.dashboardSubtitle && <span title={brand.dashboardSubtitle} style={{ ...line, color: brand.dashboardSubtitleColor, fontSize: sizes[1], fontWeight: Number(brand.dashboardSubtitleWeight), textAlign: brand.dashboardSubtitleAlign, letterSpacing: "0.18em" }}>{brand.dashboardSubtitle}</span>}
      <span aria-hidden="true" style={ornament}><span style={rule} />{"\u2723"}<span style={rule} /></span>
      {brand.dashboardTagline && <span title={brand.dashboardTagline} style={{ ...line, color: brand.dashboardTaglineColor, fontSize: sizes[2], fontWeight: Number(brand.dashboardTaglineWeight), textAlign: brand.dashboardTaglineAlign, fontStyle: "italic" }}>{brand.dashboardTagline}</span>}
    </span>
  </span>;
}

export default function CampusBrandImage({ slot = "dashboardLogo", src, alt, ...props }) {
  const images = useCampusImages();
  if (slot === "dashboardLogo") {
    return <HeaderBrand {...props} configuration={images} alt={alt} />;
  }
  const selected = images[slot] || src;
  return <img {...props} src={selected} alt={alt} onError={(event) => {
    if (event.currentTarget.src !== new URL(src, window.location.href).href) event.currentTarget.src = src;
  }} />;
}
