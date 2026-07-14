import * as path from 'path';
import * as fs from 'fs';
import { Player } from '../../types/player';
import {
  generateGrid,
  generateValidGrid,
  generateGridWithFallback,
  findValidPlayers,
  hashDateSeed,
  scoreCorrectPick,
  GRID_BASE_POINTS,
} from '../gridGenerator';

const playersPath = path.resolve(__dirname, '../../data/players_db_v1.json');
const players: Player[] = JSON.parse(fs.readFileSync(playersPath, 'utf-8'));

describe('gridGenerator', () => {
  describe('generateGrid', () => {
    it('should produce a 3x3 grid structure', () => {
      const grid = generateGrid(players, 42);
      expect(grid.xCriteria).toHaveLength(3);
      expect(grid.yCriteria).toHaveLength(3);
      expect(grid.cells).toHaveLength(3);
      grid.cells.forEach((row) => {
        expect(row).toHaveLength(3);
      });
    });

    it('should assign correct criteria references to each cell', () => {
      const grid = generateGrid(players, 42);
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(grid.cells[row][col].criteriaX).toBe(grid.xCriteria[col]);
          expect(grid.cells[row][col].criteriaY).toBe(grid.yCriteria[row]);
          expect(grid.cells[row][col].row).toBe(row);
          expect(grid.cells[row][col].col).toBe(col);
        }
      }
    });

    it('should not have duplicate criteria on the same axis', () => {
      const grid = generateGrid(players, 42);
      const xKeys = grid.xCriteria.map((c) => `${c.type}:${c.value}`);
      const yKeys = grid.yCriteria.map((c) => `${c.type}:${c.value}`);
      expect(new Set(xKeys).size).toBe(3);
      expect(new Set(yKeys).size).toBe(3);
    });

    it('should produce deterministic results with the same seed', () => {
      const grid1 = generateGrid(players, 12345);
      const grid2 = generateGrid(players, 12345);

      expect(grid1.xCriteria).toEqual(grid2.xCriteria);
      expect(grid1.yCriteria).toEqual(grid2.yCriteria);

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(grid1.cells[row][col].validPlayers.length).toBe(
            grid2.cells[row][col].validPlayers.length,
          );
        }
      }
    });

    it('should produce different results with different seeds', () => {
      const grid1 = generateGrid(players, 100);
      const grid2 = generateGrid(players, 200);

      const x1 = grid1.xCriteria.map((c) => `${c.type}:${c.value}`).join(',');
      const x2 = grid2.xCriteria.map((c) => `${c.type}:${c.value}`).join(',');
      const y1 = grid1.yCriteria.map((c) => `${c.type}:${c.value}`).join(',');
      const y2 = grid2.yCriteria.map((c) => `${c.type}:${c.value}`).join(',');

      // At least one axis should differ
      expect(x1 === x2 && y1 === y2).toBe(false);
    });
  });

  describe('generateValidGrid', () => {
    it('should produce a grid where every cell has >= 5 players', () => {
      const grid = generateValidGrid(players, 42);
      expect(grid).not.toBeNull();
      if (!grid) return;

      grid.cells.forEach((row) => {
        row.forEach((cell) => {
          expect(cell.validPlayers.length).toBeGreaterThanOrEqual(5);
        });
      });
    });
  });

  describe('findValidPlayers', () => {
    it('should find players matching both criteria', () => {
      const result = findValidPlayers(
        players,
        { type: 'league', value: 'Serie A', label: 'Serie A' },
        { type: 'nationality', value: 'Italy', label: 'Italy' },
      );
      expect(result.length).toBeGreaterThan(0);
      result.forEach((p) => {
        expect(p.league).toBe('Serie A');
        expect(p.nationality).toBe('Italy');
      });
    });

    it('should return empty for impossible combination', () => {
      const result = findValidPlayers(
        players,
        { type: 'league', value: 'Serie A', label: 'Serie A' },
        { type: 'league', value: 'La Liga', label: 'La Liga' },
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('hashDateSeed', () => {
    it('should return same hash for same date', () => {
      expect(hashDateSeed('2025-01-01')).toBe(hashDateSeed('2025-01-01'));
    });

    it('should return different hashes for different dates', () => {
      expect(hashDateSeed('2025-01-01')).not.toBe(hashDateSeed('2025-01-02'));
    });
  });

  describe('generateGridWithFallback', () => {
    it('should never return null for a normal player set', () => {
      const grid = generateGridWithFallback(players, hashDateSeed('2025-06-15'));
      expect(grid).not.toBeNull();
      expect(grid.cells).toHaveLength(3);
    });

    it('should be deterministic for the same seed', () => {
      const seed = hashDateSeed('2025-06-15');
      const g1 = generateGridWithFallback(players, seed);
      const g2 = generateGridWithFallback(players, seed);
      expect(g1.xCriteria).toEqual(g2.xCriteria);
      expect(g1.yCriteria).toEqual(g2.yCriteria);
    });

    it('should still return a solvable grid when the pool is tiny and strict', () => {
      // A handful of players can never fill a 5-per-cell grid; the fallback must
      // still hand back a grid object rather than null so the screen never hangs.
      const tiny = players.slice(0, 12);
      const grid = generateGridWithFallback(tiny, 7);
      expect(grid).not.toBeNull();
      expect(grid.cells).toHaveLength(3);
      grid.cells.forEach((row) => expect(row).toHaveLength(3));
    });

    it('should produce different grids for different seeds', () => {
      const a = generateGridWithFallback(players, hashDateSeed('2025-06-15'));
      const b = generateGridWithFallback(players, hashDateSeed('2025-07-20'));
      const key = (g: typeof a) =>
        g.xCriteria.map((c) => c.value).join(',') + '|' + g.yCriteria.map((c) => c.value).join(',');
      expect(key(a)).not.toBe(key(b));
    });
  });

  describe('scoreCorrectPick', () => {
    it('gives only base points for household names (fame >= 60)', () => {
      const s = scoreCorrectPick(85);
      expect(s.base).toBe(GRID_BASE_POINTS);
      expect(s.rarityBonus).toBe(0);
      expect(s.deepCut).toBe(false);
      expect(s.total).toBe(GRID_BASE_POINTS);
    });

    it('flags a deep cut and adds a bonus below fame 60', () => {
      const s = scoreCorrectPick(55);
      expect(s.deepCut).toBe(true);
      expect(s.rarityBonus).toBeGreaterThan(0);
      expect(s.total).toBe(s.base + s.rarityBonus);
    });

    it('escalates the bonus the more obscure the pick', () => {
      expect(scoreCorrectPick(50).rarityBonus).toBeLessThan(scoreCorrectPick(40).rarityBonus);
      expect(scoreCorrectPick(40).rarityBonus).toBeLessThan(scoreCorrectPick(20).rarityBonus);
    });

    it('treats missing fame as the most obscure (deep cut)', () => {
      const s = scoreCorrectPick(undefined);
      expect(s.deepCut).toBe(true);
      expect(s.rarityBonus).toBe(30);
    });
  });
});
