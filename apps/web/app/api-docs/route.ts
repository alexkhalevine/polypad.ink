const SCALAR_CONFIG = JSON.stringify({
  spec: { url: "/api/openapi" },
  darkMode: true,
  forceDarkModeState: "dark",
  theme: "none",
  withDefaultFonts: false,
  servers: [{ url: "https://api.polypad.ink" }],
  customCss: `
    :root, .dark-mode {
      --scalar-color-1: #ededed;
      --scalar-color-2: #c4b5fd;
      --scalar-color-3: #a78bfa;
      --scalar-color-accent: #f093fb;
      --scalar-background-1: transparent;
      --scalar-background-2: rgba(255,255,255,0.04);
      --scalar-background-3: rgba(10,5,40,0.55);
      --scalar-background-accent: rgba(240,147,251,0.12);
      --scalar-border-color: rgba(160,140,209,0.18);
      --scalar-scrollbar-color: rgba(160,140,209,0.2);
      --scalar-scrollbar-color-active: rgba(160,140,209,0.45);
      --scalar-color-green: #34d399;
      --scalar-color-red: #f87171;
      --scalar-color-yellow: #fbbf24;
      --scalar-color-blue: #60a5fa;
    }
    .t-doc__sidebar { background: rgba(10,5,40,0.65) !important; backdrop-filter: blur(8px); }
    .references-layout, .scalar-api-reference, #app { background: transparent !important; }
  `,
});

const PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Polypad API Reference</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      min-height: 100vh;
      background: #401717;
      background: linear-gradient(
        98deg,
        rgba(64,23,23,1) 0%,
        rgba(25,0,117,1) 77%,
        rgba(145,35,35,1) 78%,
        rgba(255,31,255,1) 76%,
        rgba(4,15,59,1) 100%
      );
      background-attachment: fixed;
      font-family: system-ui, sans-serif;
    }

    .hp-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 28px;
      background: rgba(10,5,40,0.65);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(160,140,209,0.15);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .hp-logo {
      font-size: 1.4rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      background: linear-gradient(
        349deg,
        rgba(26,23,64,1) 0%,
        rgba(255,0,255,1) 57%,
        rgba(35,130,145,1) 59%,
        rgba(166,10,10,1) 78%,
        rgba(135,54,54,1) 100%,
        rgba(39,194,194,1) 100%
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-decoration: none;
    }

    .hp-nav-meta {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .hp-label {
      font-size: 0.7rem;
      color: rgba(196,181,253,0.45);
      font-family: monospace;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .hp-back {
      font-size: 0.8rem;
      color: rgba(196,181,253,0.6);
      text-decoration: none;
      transition: color 0.15s;
    }

    .hp-back:hover { color: rgba(196,181,253,1); }
  </style>
</head>
<body>
  <nav class="hp-nav">
    <a class="hp-logo" href="/">polypad</a>
    <div class="hp-nav-meta">
      <span class="hp-label">API Reference</span>
      <a class="hp-back" href="/">← Home</a>
    </div>
  </nav>

  <script id="api-reference" data-configuration='${SCALAR_CONFIG}'></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;

export function GET() {
  return new Response(PAGE_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
