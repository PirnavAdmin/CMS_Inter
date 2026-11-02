import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme.js";
import themeDarkIcon from "@/assets/navbar-3d/theme-dark.png";
import themeLightIcon from "@/assets/navbar-3d/theme-light.png";

export default function ThemeToggle({ variant }) {
  const { theme, toggle } = useTheme();
  const useNavbarIcon = variant === "dashboard";

  return (
    <button
      type="button"
      className="cms-icon-btn"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      onClick={toggle}
    >
      {useNavbarIcon
        ? <img className="cms-navbar-3d-icon" src={theme === "dark" ? themeLightIcon : themeDarkIcon} alt="" aria-hidden="true" />
        : theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
