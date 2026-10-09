import { useCampusImages } from "../../features/campusImages.js";

export default function CampusBrandImage({ slot = "dashboardLogo", src, alt, ...props }) {
  const images = useCampusImages();
  const selected = images[slot] || src;
  return <img {...props} src={selected} alt={alt} onError={(event) => {
    if (event.currentTarget.src !== new URL(src, window.location.href).href) event.currentTarget.src = src;
  }} />;
}
