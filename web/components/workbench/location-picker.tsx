"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MAP_BOUNDS, MAP_SIZE, OUTLINE_PATH, project, unproject } from "@/lib/geo/california";
import { PLACES } from "@/lib/housing/places";

/** A few labelled cities for orientation; all are in PLACES. */
const LANDMARKS = ["San Francisco", "Sacramento", "Fresno", "Los Angeles", "San Diego"];

type Props = {
  /** Current valid coordinates; undefined while that field is invalid. */
  latitude?: number;
  longitude?: number;
  isOutside: boolean;
  onMove: (latitude: number, longitude: number) => void;
};

/**
 * Click, drag or use arrow keys to place the area. The latitude and longitude
 * fields stay the precise, accessible way to set the location; this map is a
 * faster way to get close.
 */
export function LocationPicker({ latitude, longitude, isOutside, onMove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const hintId = useId();
  const placeHintId = useId();
  // Announced only after keyboard moves, so typing in the fields stays quiet.
  const [announcement, setAnnouncement] = useState("");
  const pin = latitude !== undefined && longitude !== undefined ? project(latitude, longitude) : null;

  function moveTo(lat: number, lon: number) {
    const next = {
      latitude: round2(clamp(lat, MAP_BOUNDS.south, MAP_BOUNDS.north)),
      longitude: round2(clamp(lon, MAP_BOUNDS.west, MAP_BOUNDS.east)),
    };
    onMove(next.latitude, next.longitude);
    return next;
  }

  function moveToPointer(event: React.PointerEvent<SVGSVGElement>) {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const { latitude: lat, longitude: lon } = unproject(point.x, point.y);
    moveTo(lat, lon);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (latitude === undefined || longitude === undefined) return;
    const step = event.shiftKey ? 0.5 : 0.05;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [step, 0],
      ArrowDown: [-step, 0],
      ArrowRight: [0, step],
      ArrowLeft: [0, -step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const next = moveTo(latitude + move[0], longitude + move[1]);
    setAnnouncement(describe(next.latitude, next.longitude));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        tabIndex={0}
        role="group"
        aria-roledescription="map"
        aria-label="Location on a map of California"
        aria-describedby={hintId}
        onKeyDown={handleKeyDown}
        className="rounded-lg border border-border bg-card p-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <svg
          ref={svgRef}
          aria-hidden
          data-testid="location-map"
          viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
          className="mx-auto block h-72 w-auto max-w-full cursor-crosshair touch-none select-none"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragging.current = true;
            moveToPointer(event);
          }}
          onPointerMove={(event) => dragging.current && moveToPointer(event)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <path
            d={OUTLINE_PATH}
            fill="var(--muted)"
            stroke="var(--foreground)"
            strokeOpacity={0.35}
            strokeWidth={0.03}
            strokeLinejoin="round"
          />
          {PLACES.filter((place) => LANDMARKS.includes(place.name)).map((place) => {
            const { x, y } = project(place.latitude, place.longitude);
            return (
              <g key={place.name} fill="var(--muted-foreground)">
                <circle cx={x} cy={y} r={0.06} />
                <text x={x + 0.15} y={y + 0.12} fontSize={0.34}>
                  {place.name}
                </text>
              </g>
            );
          })}
          {pin && (
            <circle
              data-testid="location-pin"
              cx={pin.x}
              cy={pin.y}
              r={0.17}
              fill={isOutside ? "var(--notice)" : "var(--pacific)"}
              stroke="var(--card)"
              strokeWidth={0.07}
            />
          )}
        </svg>
      </div>
      <p id={hintId} className="text-xs text-pretty text-muted-foreground">
        Click or drag on the map to move the area. With the map focused, arrow keys move
        it by 0.05° (Shift: 0.5°).
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* An action, like "Load an example": it moves the pin and nothing stays selected. */}
      <div className="flex flex-col items-start gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="lg" aria-describedby={placeHintId}>
              <MapPin data-icon="inline-start" />
              Place near a city
              <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-56">
            {PLACES.map((place) => (
              <DropdownMenuItem
                key={place.name}
                onSelect={() => onMove(place.latitude, place.longitude)}
              >
                {place.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <p id={placeHintId} className="text-xs text-muted-foreground">
          Moves only the location to the city centre; the other inputs stay as they are.
        </p>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function describe(latitude: number, longitude: number) {
  const ew = longitude < 0 ? `${Math.abs(longitude)}°W` : `${longitude}°E`;
  return `${latitude}°N, ${ew}`;
}
