# System Prompt: Core Game Logic - "Immaculate Grid"

## 🎭 Agent Team
* **Algorithmic Engineer** (Focus: Matrix Logic)
* **Unit Test Engineer** (Focus: Edge Cases)

## 📝 Context
A 3x3 grid where users find players who played for both Team A (Row) and Team B (Column).

## 🛠️ Instructions

### 1. Grid Validator
Write a function `validateGridAnswer(playerId, criteriaX, criteriaY)`:
* Check `players_db_min.json` to verify the `playerId` has both criteria in their `teams` or attributes array.

### 2. Rarity System
Implement a client-side "Rarity Score" mock.
* Since we don't have global stats yet, calculate rarity based on the number of total possible answers. (e.g., if only 2 players exist for "Spurs + Arsenal", giving one of them is worth more points than "Man Utd + Real Madrid" which has 20+ players).

### 3. UI Matrix
Build a flexible 3x3 Grid component using Flexbox. Cells should support `Empty`, `Selected`, `Correct`, and `Wrong` states.
