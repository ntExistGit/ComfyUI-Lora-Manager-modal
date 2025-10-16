import { setForcedTheme, clearForcedTheme } from "./uiHelpers.js";

export function applyTheme(theme, source = "unknown") {
  if (source === "parent") {
    setForcedTheme(theme);
  } else {
    clearForcedTheme();
  }
  updateThemeToggleVisualState(theme);
}

function updateThemeToggleVisualState(theme) {
  const themeToggle = document.querySelector(".theme-toggle");
  if (!themeToggle) return;

  themeToggle.classList.remove("theme-light", "theme-dark", "theme-auto");
  themeToggle.classList.add(`theme-${theme}`);

  const newTitle =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  themeToggle.title = newTitle;
}

export function initThemeSync() {
  let isProcessing = false;

  window.addEventListener("message", function (event) {
    if (event.data.type === "THEME_CHANGE" && !isProcessing) {
      const newTheme = event.data.theme;

      isProcessing = true;
      applyTheme(newTheme, "parent");

      setTimeout(() => {
        isProcessing = false;
      }, 100);
    }
  });

  if (typeof window.toggleTheme === "function") {
    const originalToggleTheme = window.toggleTheme;

    window.toggleTheme = function () {
      if (isProcessing) return originalToggleTheme();

      isProcessing = true;

      const newTheme = originalToggleTheme();

      if (window.parent) {
        try {
          window.parent.postMessage(
            {
              type: "CHILD_THEME_CHANGE",
              theme: newTheme,
            },
            "*"
          );
          console.log("Sent theme change to parent:", newTheme);
        } catch (error) {
          console.log("Cannot send theme to parent:", error);
        }
      }

      setTimeout(() => {
        isProcessing = false;
      }, 100);

      return newTheme;
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
      const currentTheme = getCurrentThemeFromDOM();
      if (window.parent && currentTheme) {
        try {
          window.parent.postMessage(
            {
              type: "CHILD_THEME_CHANGE",
              theme: currentTheme,
            },
            "*"
          );
          console.log("Sent initial theme to parent:", currentTheme);
        } catch (error) {
          console.log("Cannot send initial theme to parent:", error);
        }
      }
    }, 500);
  });

  console.log("Theme sync initialized");
}

function getCurrentThemeFromDOM() {
  const htmlElement = document.documentElement;
  const dataTheme = htmlElement.getAttribute("data-theme");
  if (dataTheme === "dark") return "dark";
  if (dataTheme === "light") return "light";

  const bodyElement = document.body;
  if (
    bodyElement.classList.contains("dark-theme") ||
    bodyElement.classList.contains("dark")
  ) {
    return "dark";
  }

  return "light";
}
