import { ImageResponse } from "next/og";
import { MAP_SIZE, OUTLINE_PATH } from "@/lib/geo/california";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** The California outline in the accent colour. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f7f4", borderRadius: 6 }}>
        <svg width="26" height="28" viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}>
          <path d={OUTLINE_PATH} fill="#0b6e79" />
        </svg>
      </div>
    ),
    size,
  );
}
