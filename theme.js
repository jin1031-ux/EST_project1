(function initializeTheme() {
  const STORAGE_KEY = "today-menu-theme";

  function getSavedTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (error) { return null; }
  }

  function preferredTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme, save) {
    document.documentElement.dataset.theme = theme;
    if (save) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (error) { /* The selected theme still applies for this visit. */ }
    }
  }

  function updateToggle(button) {
    const isDark = document.documentElement.dataset.theme === "dark";
    button.textContent = isDark ? "☾ 다크" : "☀ 라이트";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", isDark ? "라이트 모드로 전환" : "다크 모드로 전환");
  }

  const savedTheme = getSavedTheme();
  applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : preferredTheme(), false);

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    updateToggle(button);
    button.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, true);
      updateToggle(button);
    });
  });
})();
