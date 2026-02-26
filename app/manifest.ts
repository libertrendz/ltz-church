/* PATH: app/manifest.ts */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LT-CHURCH",
    short_name: "LTZ",
    description: "Multi-tenant SaaS para igrejas",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#D4AF37",
    icons: [
      { src: "/images/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/icon-256x256.png", sizes: "256x256", type: "image/png" },
      { src: "/images/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/images/icon-1024x1024.png", sizes: "1024x1024", type: "image/png" }
    ]
  };
}
