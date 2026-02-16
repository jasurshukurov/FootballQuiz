import * as path from 'path';
import * as fs from 'fs';
import { Player } from '../../types/player';
import { generateGrid, generateValidGrid, findValidPlayers, hashDateSeed } from '../gridGenerator';
import { getDailyGrid } from '../dailyGrid';

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

  describe('getDailyGrid', () => {
    it('should return the same grid for the same date', () => {
      const grid1 = getDailyGrid(players, '2025-06-15');
      const grid2 = getDailyGrid(players, '2025-06-15');

      expect(grid1).not.toBeNull();
      expect(grid2).not.toBeNull();
      if (!grid1 || !grid2) return;

      expect(grid1.xCriteria).toEqual(grid2.xCriteria);
      expect(grid1.yCriteria).toEqual(grid2.yCriteria);
      expect(grid1.date).toBe('2025-06-15');
    });

    it('should return different grids for different dates', () => {
      const grid1 = getDailyGrid(players, '2025-06-15');
      const grid2 = getDailyGrid(players, '2025-07-20');

      expect(grid1).not.toBeNull();
      expect(grid2).not.toBeNull();
      if (!grid1 || !grid2) return;

      const x1 = grid1.xCriteria.map((c) => `${c.type}:${c.value}`).join(',');
      const x2 = grid2.xCriteria.map((c) => `${c.type}:${c.value}`).join(',');
      const y1 = grid1.yCriteria.map((c) => `${c.type}:${c.value}`).join(',');
      const y2 = grid2.yCriteria.map((c) => `${c.type}:${c.value}`).join(',');

      // At least one axis should differ between different dates
      expect(x1 === x2 && y1 === y2).toBe(false);
    });
  });
});
