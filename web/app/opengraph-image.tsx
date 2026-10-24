import { ImageResponse } from "next/og";
import { MAP_SIZE, OUTLINE_PATH } from "@/lib/geo/california";

export const alt =
  "California Housing Intelligence: a 1990 census model, explained. An educational machine-learning explorer.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "72px 88px",
          background: "#f7f7f4",
          color: "#16181d",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
          <div style={{ fontSize: 26, letterSpacing: 2, textTransform: "uppercase", color: "#5b616e" }}>
            Educational · 1990 Census data
          </div>
          <div style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.1, marginTop: 24 }}>
            California Housing Intelligence
          </div>
          <div style={{ fontSize: 34, color: "#5b616e", marginTop: 20 }}>
            A 1990 census model, explained
          </div>
          <div style={{ fontSize: 26, color: "#5b616e", marginTop: 48, lineHeight: 1.4 }}>
            Estimates an area&apos;s median home value in 1990 dollars. Not a valuation of any
            home today.
          </div>
        </div>
        <svg width="330" height="380" viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}>
          <path d={OUTLINE_PATH} fill="#e3e3de" stroke="#0b6e79" strokeWidth="0.05" />
        </svg>
      </div>
    ),
    size,
  );
}
