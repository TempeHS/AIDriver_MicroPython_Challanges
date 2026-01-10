/**
 * AIDriver Simulator - Maze Definitions
 * Pre-defined mazes for Challenge 6: Maze Navigation
 */

const Mazes = (function () {
  "use strict";

  // Wall thickness in mm (reduced for wider corridors)
  const WALL_THICKNESS = 30;

  /**
   * Pre-defined maze layouts
   * Each maze has walls defined as { x, y, width, height } in mm
   */
  const mazeDefinitions = {
    // Simple maze - basic L-shaped corridor
    simple: {
      id: "simple",
      name: "Simple Corridor",
      difficulty: "Easy",
      description: "A simple L-shaped corridor to practice basic navigation",
      startPosition: { x: 300, y: 1700, heading: 0 },
      endZone: { x: 100, y: 100, width: 200, height: 200 },
      walls: [
        // Just two walls creating an L-shaped path
        { x: 0, y: 1000, width: 1400, height: WALL_THICKNESS },
        { x: 700, y: 400, width: WALL_THICKNESS, height: 600 },
      ],
    },

    // Zigzag maze - walls extend from opposite sides
    zigzag: {
      id: "zigzag",
      name: "Zigzag Path",
      difficulty: "Medium",
      description: "Navigate through a zigzag corridor",
      startPosition: { x: 300, y: 1700, heading: 0 },
      endZone: { x: 1700, y: 100, width: 200, height: 200 },
      walls: [
        // Bottom wall extends from left
        { x: 0, y: 1200, width: 1500, height: WALL_THICKNESS },
        // Top wall extends from right
        { x: 500, y: 600, width: 1500, height: WALL_THICKNESS },
      ],
    },

    // Spiral maze - evenly spaced spiral pattern
    spiral: {
      id: "spiral",
      name: "Spiral",
      difficulty: "Hard",
      description: "Navigate a spiral pattern to the center",
      startPosition: { x: 300, y: 1700, heading: 0 },
      endZone: { x: 800, y: 800, width: 200, height: 200 },
      walls: [
        // Outer spiral - 400mm spacing between walls
        { x: 0, y: 1400, width: 1600, height: WALL_THICKNESS }, // Outer top
        { x: 1600, y: 400, width: WALL_THICKNESS, height: 1030 }, // Outer right
        { x: 400, y: 400, width: 1230, height: WALL_THICKNESS }, // Outer bottom
        { x: 400, y: 400, width: WALL_THICKNESS, height: 600 }, // Outer left (partial)
        // Inner spiral - 400mm inward
        { x: 400, y: 1000, width: 800, height: WALL_THICKNESS }, // Inner top
        { x: 1200, y: 800, width: WALL_THICKNESS, height: 230 }, // Inner right
      ],
    },

    // Classic maze - verified solvable with dead ends
    // Solution: UP to top, hit wall, DOWN, RIGHT through gap, UP, RIGHT to end
    classic: {
      id: "classic",
      name: "Classic Maze",
      difficulty: "Hard",
      description: "A traditional maze with dead ends",
      startPosition: { x: 250, y: 1750, heading: 0 },
      endZone: { x: 1700, y: 100, width: 200, height: 200 },
      walls: [
        // Horizontal walls
        { x: 500, y: 400, width: 500, height: WALL_THICKNESS }, // blocks middle-left at top
        { x: 1500, y: 400, width: 500, height: WALL_THICKNESS }, // blocks right at top
        { x: 500, y: 1100, width: 1000, height: WALL_THICKNESS }, // middle barrier
        { x: 500, y: 1500, width: 500, height: WALL_THICKNESS }, // blocks path up from start-right
        // Vertical walls
        { x: 500, y: 700, width: WALL_THICKNESS, height: 400 }, // short wall with gap above
        { x: 500, y: 1500, width: WALL_THICKNESS, height: 500 }, // blocks going right from start
        { x: 1000, y: 0, width: WALL_THICKNESS, height: 400 }, // forces detour at top
        { x: 1500, y: 400, width: WALL_THICKNESS, height: 700 }, // blocks direct right path
      ],
    },

    // Open arena with obstacles - including wall-attached obstacles
    obstacles: {
      id: "obstacles",
      name: "Obstacle Course",
      difficulty: "Medium",
      description: "Navigate around scattered obstacles",
      startPosition: { x: 300, y: 1700, heading: 0 },
      endZone: { x: 1700, y: 100, width: 200, height: 200 },
      walls: [
        // Wall-attached obstacles
        { x: 0, y: 1200, width: 300, height: 200 }, // Left wall
        { x: 1700, y: 800, width: 300, height: 200 }, // Right wall
        { x: 600, y: 0, width: 200, height: 300 }, // Top wall
        { x: 1200, y: 1700, width: 200, height: 300 }, // Bottom wall
        // Center obstacles
        { x: 700, y: 900, width: 200, height: 200 },
        { x: 1100, y: 500, width: 200, height: 200 },
      ],
    },
  };

  /**
   * Generate a classic maze using a simple algorithm
   * @returns {Array} Wall definitions
   */
  function generateClassicMaze() {
    const walls = [];
    const cellSize = 200;
    const cols = 10;
    const rows = 10;

    // Add some predefined walls for a solvable maze
    const wallPatterns = [
      // Row 0
      { r: 0, c: 2, dir: "bottom" },
      { r: 0, c: 4, dir: "bottom" },
      { r: 0, c: 6, dir: "bottom" },
      { r: 0, c: 8, dir: "bottom" },

      // Row 1
      { r: 1, c: 1, dir: "right" },
      { r: 1, c: 3, dir: "bottom" },
      { r: 1, c: 5, dir: "right" },
      { r: 1, c: 7, dir: "bottom" },

      // Row 2
      { r: 2, c: 0, dir: "right" },
      { r: 2, c: 2, dir: "right" },
      { r: 2, c: 4, dir: "bottom" },
      { r: 2, c: 6, dir: "right" },
      { r: 2, c: 8, dir: "bottom" },

      // Row 3
      { r: 3, c: 1, dir: "bottom" },
      { r: 3, c: 3, dir: "right" },
      { r: 3, c: 5, dir: "bottom" },
      { r: 3, c: 7, dir: "right" },

      // Row 4
      { r: 4, c: 0, dir: "right" },
      { r: 4, c: 2, dir: "bottom" },
      { r: 4, c: 4, dir: "right" },
      { r: 4, c: 6, dir: "bottom" },
      { r: 4, c: 8, dir: "right" },

      // Row 5
      { r: 5, c: 1, dir: "right" },
      { r: 5, c: 3, dir: "bottom" },
      { r: 5, c: 5, dir: "right" },
      { r: 5, c: 7, dir: "bottom" },

      // Row 6
      { r: 6, c: 0, dir: "bottom" },
      { r: 6, c: 2, dir: "right" },
      { r: 6, c: 4, dir: "bottom" },
      { r: 6, c: 6, dir: "right" },
      { r: 6, c: 8, dir: "bottom" },

      // Row 7
      { r: 7, c: 1, dir: "bottom" },
      { r: 7, c: 3, dir: "right" },
      { r: 7, c: 5, dir: "bottom" },
      { r: 7, c: 7, dir: "right" },

      // Row 8
      { r: 8, c: 0, dir: "right" },
      { r: 8, c: 2, dir: "bottom" },
      { r: 8, c: 4, dir: "right" },
      { r: 8, c: 6, dir: "bottom" },
      { r: 8, c: 8, dir: "right" },
    ];

    for (const pattern of wallPatterns) {
      const x = pattern.c * cellSize;
      const y = pattern.r * cellSize;

      if (pattern.dir === "right") {
        walls.push({
          x: x + cellSize - WALL_THICKNESS / 2,
          y: y,
          width: WALL_THICKNESS,
          height: cellSize,
        });
      } else if (pattern.dir === "bottom") {
        walls.push({
          x: x,
          y: y + cellSize - WALL_THICKNESS / 2,
          width: cellSize,
          height: WALL_THICKNESS,
        });
      }
    }

    return walls;
  }

  /**
   * Get maze by ID
   * @param {string} mazeId - Maze identifier
   * @returns {object} Maze definition
   */
  function get(mazeId) {
    return mazeDefinitions[mazeId] || mazeDefinitions.simple;
  }

  /**
   * Get all maze definitions
   * @returns {object} All mazes
   */
  function getAll() {
    return mazeDefinitions;
  }

  /**
   * Get maze list for UI
   * @returns {Array} List of { id, name, difficulty }
   */
  function getList() {
    return Object.values(mazeDefinitions).map((m) => ({
      id: m.id,
      name: m.name,
      difficulty: m.difficulty,
    }));
  }

  /**
   * Draw maze walls on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} scale - Scale factor (pixels per mm)
   * @param {string} mazeId - Maze ID
   */
  function draw(ctx, scale, mazeId) {
    const maze = get(mazeId);
    if (!maze || !maze.walls) return;

    ctx.save();
    ctx.fillStyle = "#4a4a6a";
    ctx.strokeStyle = "#6a6a8a";
    ctx.lineWidth = 2;

    for (const wall of maze.walls) {
      ctx.fillRect(
        wall.x * scale,
        wall.y * scale,
        wall.width * scale,
        wall.height * scale
      );
      ctx.strokeRect(
        wall.x * scale,
        wall.y * scale,
        wall.width * scale,
        wall.height * scale
      );
    }

    // Draw end zone
    if (maze.endZone) {
      ctx.fillStyle = "rgba(0, 255, 136, 0.3)";
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 3;
      ctx.fillRect(
        maze.endZone.x * scale,
        maze.endZone.y * scale,
        maze.endZone.width * scale,
        maze.endZone.height * scale
      );
      ctx.strokeRect(
        maze.endZone.x * scale,
        maze.endZone.y * scale,
        maze.endZone.width * scale,
        maze.endZone.height * scale
      );

      // Draw "EXIT" label
      ctx.fillStyle = "#00ff88";
      ctx.font = `${12 * scale}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(
        "EXIT",
        (maze.endZone.x + maze.endZone.width / 2) * scale,
        (maze.endZone.y + maze.endZone.height / 2 + 4) * scale
      );
    }

    ctx.restore();
  }

  // Public API
  return {
    get,
    getAll,
    getList,
    draw,
    WALL_THICKNESS,
  };
})();
