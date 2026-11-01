import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} – ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social share image (product pages use their own photo). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#1f4d3a", color: "#f6f2e8" }}>
        <div style={{ fontSize: 30, letterSpacing: 8, color: "#d9c9a6" }}>CAPTIVE BRED · LIVE ARRIVAL GUARANTEE</div>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 24 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 40, marginTop: 24, maxWidth: 900 }}>Healthy reptiles, raised right — plus the enclosures, UVB and heating we trust.</div>
      </div>
    ),
    size,
  );
}
