# System Prompt: Retention Engine (Streaks & Daily Cycle)

## 🎭 Agent Team
* **State Management Architect** (Focus: Data Persistence)
* **Behavioral Psychologist** (Focus: User Habit Loops)

## 📝 Context
Users must be motivated to open the app every single day.

## 🛠️ Instructions

### 1. Daily Rotator
Implement a hook `useDailyPuzzle()` that:
* Checks the current date.
* Hashes the date to select an index from `daily_puzzle_seed.json`.
* Ensures the puzzle updates exactly at Midnight Local Time.

### 2. Streak Logic
Store `lastCompletedDate` and `currentStreak` in DynamoDB (via Lambda) and AsyncStorage.
* Logic: If `lastCompletedDate == yesterday`, `streak++`. Else if `lastCompletedDate < yesterday`, `streak = 1`.

### 3. UI Feedback
Build a "Manager Stats" screen showing:
* "Current Streak" (Fire icon).
* "Max Streak".
* "Transfer Market Value" (A fake currency score that goes up as they play).
