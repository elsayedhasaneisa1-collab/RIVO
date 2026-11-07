"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

type DocWithVT = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme | null) ?? "dark";
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const x = event.clientX;
    const y = event.clientY;

    const applyTheme = () => {
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("rivo-theme", next);
      } catch {}
      setTheme(next);
    };

    const doc = document as DocWithVT;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!doc.startViewTransition || prefersReduced) {
      applyTheme();
      return;
    }

    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const root = document.documentElement;
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${maxRadius}px`);

    root.classList.add("theme-transitioning");
    const transition = doc.startViewTransition(applyTheme);
    transition.finished.finally(() => {
      root.classList.remove("theme-transitioning");
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
      className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5 transition-colors"
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}