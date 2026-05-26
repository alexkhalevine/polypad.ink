import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  spec: { url: "/api/openapi" },
  pageTitle: "Polypad API Reference",
  darkMode: true,
  customCss: `
    body, .scalar-app { background: #000 !important; }
    button.bg-sidebar-b-search { display: none !important; }
  `,
  mcp: { disabled: true },
  hideClientButton: true,
});
