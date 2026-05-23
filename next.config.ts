import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Build standalone : produit /.next/standalone + /.next/static, image Docker ~150 Mo.
  output: "standalone",
  // Évite l’avertissement Turbopack quand d’autres package-lock.json existent au-dessus du repo.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
