// Web: load Baloo 2 from Google Fonts and apply it to every element, plus the
// game stylesheet used by the map home and its sheets.
import { theme } from "../constants/theme";
import { GAME_CSS } from "./gameCss";

let installed = false;

export function installWebTheme() {
  if (installed || typeof document === "undefined") return;
  installed = true;

  const pre = document.createElement("link");
  pre.rel = "preconnect";
  pre.href = "https://fonts.googleapis.com";
  document.head.appendChild(pre);

  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap";
  document.head.appendChild(font);

  const style = document.createElement("style");
  style.setAttribute("data-mc-theme", "");
  // React Native Web sets fonts per element, so the family is forced here.
  // Icon glyphs (Ionicons) set their own font inline and are left alone.
  style.textContent = `
    html, body { background: ${theme.colors.background}; }
    body, body *:not([style*="ionicons"]) { font-family: ${theme.fontFamily} !important; }
    ${GAME_CSS}
  `;
  document.head.appendChild(style);
}
