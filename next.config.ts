import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist relies on loading a sibling `pdf.worker.mjs` at runtime.
  // When bundled into `.next/dev/server/chunks`, Turbopack may not emit that worker file,
  // leading to: "Setting up fake worker failed: Cannot find module ... pdf.worker.mjs".
  // Keep these packages external on the server so Node can resolve their real files.
  serverExternalPackages: ["pdfjs-dist", "pdf-parse"],
};

export default nextConfig;
