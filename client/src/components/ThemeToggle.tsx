import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
