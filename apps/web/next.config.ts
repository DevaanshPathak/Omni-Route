import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  agentRules: false,
  output: "standalone",
  outputFileTracingRoot: path.join(projectDirectory, "../.."),
  transpilePackages: ["@omni-route/shared"],
};

export default nextConfig;
