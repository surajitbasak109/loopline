(function () {
  const script = document.currentScript;
  const apiKey = script && script.getAttribute("data-key");
  if (!apiKey) {
    console.warn("[Loopline] Missing data-key attribute on widget script.");
    return;
  }

  // Derive the widget origin from the script's own src so the loader works
  // regardless of which domain serves it.
  const origin = new URL(script.src, location.href).origin;
  const iframeSrc = origin + "/widget?key=" + encodeURIComponent(apiKey);

  // ── Styles ──────────────────────────────────────────────────────────────────

  const BUTTON_SIZE = "52px";
  const PANEL_WIDTH = "400px";
  const PANEL_HEIGHT = "560px";
  const Z = "2147483647"; // max z-index

  const buttonStyle = [
    "position:fixed", "bottom:24px", "right:24px",
    "width:" + BUTTON_SIZE, "height:" + BUTTON_SIZE,
    "border-radius:50%", "border:none", "cursor:pointer",
    "background:#6366f1", "color:#fff",
    "font-size:22px", "line-height:1",
    "box-shadow:0 4px 14px rgba(0,0,0,0.25)",
    "z-index:" + Z, "transition:transform 0.2s",
  ].join(";");

  const iframeStyle = [
    "position:fixed", "bottom:88px", "right:24px",
    "width:" + PANEL_WIDTH, "height:" + PANEL_HEIGHT,
    "border:none", "border-radius:12px",
    "box-shadow:0 8px 30px rgba(0,0,0,0.18)",
    "z-index:" + Z,
    "transition:opacity 0.2s,transform 0.2s",
    "opacity:0", "transform:translateY(8px) scale(0.98)",
    "pointer-events:none",
  ].join(";");

  // ── DOM ─────────────────────────────────────────────────────────────────────

  const button = document.createElement("button");
  button.setAttribute("aria-label", "Open feedback widget");
  button.setAttribute("style", buttonStyle);
  button.innerHTML = "&#128172;"; // 💬

  const iframe = document.createElement("iframe");
  iframe.src = iframeSrc;
  iframe.setAttribute("style", iframeStyle);
  iframe.setAttribute("title", "Loopline feedback widget");
  iframe.setAttribute("allow", "");

  document.body.appendChild(iframe);
  document.body.appendChild(button);

  // ── State ────────────────────────────────────────────────────────────────────

  let isOpen = false;

  function open() {
    isOpen = true;
    iframe.style.opacity = "1";
    iframe.style.transform = "translateY(0) scale(1)";
    iframe.style.pointerEvents = "auto";
    button.innerHTML = "&#10005;"; // ✕
    button.setAttribute("aria-label", "Close feedback widget");
    iframe.contentWindow &&
      iframe.contentWindow.postMessage({ type: "open" }, origin);
  }

  function close() {
    isOpen = false;
    iframe.style.opacity = "0";
    iframe.style.transform = "translateY(8px) scale(0.98)";
    iframe.style.pointerEvents = "none";
    button.innerHTML = "&#128172;";
    button.setAttribute("aria-label", "Open feedback widget");
    iframe.contentWindow &&
      iframe.contentWindow.postMessage({ type: "close" }, origin);
  }

  button.addEventListener("click", function () {
    isOpen ? close() : open();
  });

  // ── postMessage ──────────────────────────────────────────────────────────────

  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "resize" && typeof data.height === "number") {
      iframe.style.height = Math.min(data.height, 620) + "px";
    }

    if (data.type === "close") {
      close();
    }
  });
})();
