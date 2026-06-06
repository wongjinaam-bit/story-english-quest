"use client";

import { useEffect, useState } from "react";

type ThemeMode = "day" | "night";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("day");

  useEffect(() => {
    const saved = localStorage.getItem("seq-theme") as ThemeMode | null;
    const next = saved === "night" ? "night" : "day";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function toggleTheme() {
    const next = theme === "day" ? "night" : "day";
    setTheme(next);
    localStorage.setItem("seq-theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "day" ? "切換夜間模式" : "切換白天模式"}
    >
      <span aria-hidden="true">{theme === "day" ? "☀️" : "🌙"}</span>
      <strong>{theme === "day" ? "白天" : "夜間"}</strong>
    </button>
  );
}
