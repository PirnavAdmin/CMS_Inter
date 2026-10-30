import { useEffect, useState } from "react";
import { useCampusImages } from "../../modules/admin/AdminSettings/campusImages.js";
import { useTheme } from "../../hooks/useTheme.js";
import pirnavCollegesLogoDark from "../../assets/pirnav-colleges-logo-dark.png";
import pirnavCollegesLogo from "../../assets/pirnav-colleges-logo.png";

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

export default function CampusBrandImage({ slot = "dashboardLogo", src, alt, ...props }) {
  const images = useCampusImages();
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
