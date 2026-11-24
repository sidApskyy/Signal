import { build } from "esbuild";
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2018", "chrome64", "safari14", "firefox78", "edge79"],
  outfile: "dist/signal.js",
  sourcemap: false,
  legalComments: "none",
});

// Ship the tracker beside the Next.js app so /signal.js is served statically.
try {
  mkdirSync("../../apps/web/public", { recursive: true });
  copyFileSync("dist/signal.js", "../../apps/web/public/signal.js");
} catch { /* web app may not exist yet */ }

const bytes = statSync("dist/signal.js").size;
const gz = gzipSync(readFileSync("dist/signal.js")).length;
console.log(`signal.js: ${bytes} B (${(gz / 1024).toFixed(1)} KB gzip)`);
