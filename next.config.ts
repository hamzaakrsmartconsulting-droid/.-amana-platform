import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Évite l’avertissement Turbopack quand d’autres package-lock.json existent au-dessus du repo.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
