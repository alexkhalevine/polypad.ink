import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    // Set base to app/ so Tailwind only watches apps/web/app/**,
    // preventing the dir-dependency on apps/web/** that would trigger
    // infinite recompilation whenever .next/static/css/ is written.
    "@tailwindcss/postcss": { base: path.join(__dirname, "app") },
  },
};

export default config;
