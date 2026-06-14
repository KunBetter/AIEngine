"use client";

import { useState, useRef, useCallback } from "react";
import type { PlanetTile, SpeciesIndividual, SpeciesDef } from "@/lib/types";

const TERRAIN_COLORS: Record<string, string> = {
  ocean: "#1a3a5c",
  coast: "#2a5a7c",
  forest: "#1a4a1a",
  grassland: "#3a5a2a",
  desert: "#8a7a4a",
  mountain: "#5a5a5a",
  volcano: "#4a2a2a",
  tundra: "#9a9a9a",
};

const TILE_SIZE = 8;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

interface PlanetMapProps {
  tiles: PlanetTile[][];
  individuals: SpeciesIndividual[];
  species: Record<string, SpeciesDef>;
  showHeatmap?: boolean;
  onTileClick?: (tile: PlanetTile) => void;
  selectedTile?: { x: number; y: number } | null;
}

export function PlanetMap({
  tiles,
  individuals,
  species,
  showHeatmap = false,
  onTileClick,
  selectedTile,
}: PlanetMapProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const height = tiles.length;
  const width = tiles[0]?.length || 0;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Individual positions by tile
  const individualMap = new Map<string, { speciesId: string; count: number }>();
  for (const ind of individuals) {
    const key = `${Math.round(ind.x)},${Math.round(ind.y)}`;
    const existing = individualMap.get(key);
    if (existing) { existing.count++; }
    else { individualMap.set(key, { speciesId: ind.speciesId, count: 1 }); }
  }

  const viewHeight = 300;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-[#2a2a4a] bg-[#0a0a1a]"
      style={{ height: viewHeight, cursor: isPanning ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        width={width * TILE_SIZE * zoom}
        height={height * TILE_SIZE * zoom}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {/* Tiles */}
        {tiles.map((row, y) =>
          row.map((tile, x) => {
            const indKey = `${x},${y}`;
            const indData = individualMap.get(indKey);
            const isSelected = selectedTile?.x === x && selectedTile?.y === y;

            let fillColor = TERRAIN_COLORS[tile.terrain] || "#333";
            if (showHeatmap && indData) {
              const alpha = Math.min(1, indData.count / 10);
              fillColor = `rgba(255, 100, 100, ${alpha * 0.5})`;
            }

            return (
              <g key={`${x}-${y}`}>
                <rect
                  x={x * TILE_SIZE * zoom}
                  y={y * TILE_SIZE * zoom}
                  width={TILE_SIZE * zoom}
                  height={TILE_SIZE * zoom}
                  fill={fillColor}
                  stroke={isSelected ? "#fff" : "transparent"}
                  strokeWidth={isSelected ? 1 : 0}
                  className="hover:brightness-125 transition-colors"
                  onClick={() => onTileClick?.(tile)}
                />
                {tile.special && (
                  <rect
                    x={x * TILE_SIZE * zoom + 1}
                    y={y * TILE_SIZE * zoom + 1}
                    width={TILE_SIZE * zoom - 2}
                    height={TILE_SIZE * zoom - 2}
                    fill="none"
                    stroke={tile.special === "geothermal" ? "#ff6644" : tile.special === "fertile" ? "#44ff44" : tile.special === "toxic" ? "#88ff00" : "#ffff00"}
                    strokeWidth={0.5}
                    strokeDasharray="1 1"
                  />
                )}
              </g>
            );
          })
        )}

        {/* Individuals */}
        {!showHeatmap && individuals.map((ind) => {
          const speciesDef = species[ind.speciesId];
          if (!speciesDef) return null;
          return (
            <circle
              key={ind.id}
              cx={ind.x * TILE_SIZE * zoom + (TILE_SIZE * zoom) / 2}
              cy={ind.y * TILE_SIZE * zoom + (TILE_SIZE * zoom) / 2}
              r={Math.max(1.5, TILE_SIZE * zoom * 0.3)}
              fill={speciesDef.color}
              opacity={ind.state === "dying" ? 0.3 : 0.8}
            />
          );
        })}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        <button
          onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.2))}
          className="w-6 h-6 rounded bg-[#1a1a2e] text-gray-400 text-xs hover:text-white"
        >+</button>
        <button
          onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.2))}
          className="w-6 h-6 rounded bg-[#1a1a2e] text-gray-400 text-xs hover:text-white"
        >−</button>
      </div>
    </div>
  );
}
