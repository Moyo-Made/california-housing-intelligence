import { ImageResponse } from "next/og";
import { MAP_SIZE, OUTLINE_PATH } from "@/lib/geo/california";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f7f4" }}>
        <svg width="130" height="140" viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}>
          <path d={OUTLINE_PATH} fill="#0b6e79" />
        </svg>
      </div>
    ),
    size,
  );
}
