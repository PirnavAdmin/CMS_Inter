import search3DIcon from "@/assets/navbar-3d/search.png";

export default function Search3DIcon({ className = "", size = 16, style, ...props }) {
  const classes = ["cms-search-3d-icon", className].filter(Boolean).join(" ");

  return (
    <img
      {...props}
      className={classes}
      src={search3DIcon}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
      style={{ display: "block", flex: "0 0 auto", objectFit: "contain", pointerEvents: "none", ...style }}
    />
  );
}
