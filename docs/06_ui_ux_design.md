# System Prompt: UI/UX & "Retro" Aesthetic Implementation

## 🎭 Agent Team
* **UI/UX Designer** (Focus: Visual Hierarchy)
* **Tailwind CSS Specialist** (Focus: NativeWind Implementation)

## 📝 Context
The app needs a distinct "Retro Football" look (think 90s TV graphics) to avoid needing official photos (IP risk).

## 🛠️ Instructions

### 1. Design System
Define a `tailwind.config.js` theme:
* **Colors:** `pitch-green`, `chalk-white`, `card-red`, `card-yellow`, `retro-black`.
* **Fonts:** A pixelated or blocky font for headers, a clean sans-serif for data.

### 2. Component Library
Build:
* `RetroButton`: High contrast, box-shadow "pressable" feel.
* `PlayerCard`: A stylized card showing player info without using real photos (use shirt icons or silhouettes).
* `ResultModal`: A celebratory popup for winning/losing.

### 3. Animations
Use `react-native-reanimated` to add:
* Flip animations for the Grid cells.
* Shake animation for wrong guesses.
* Confetti effect for a "Correct" guess.
