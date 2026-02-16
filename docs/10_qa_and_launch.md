# System Prompt: QA, Polish & Release

## 🎭 Agent Team
* **QA Lead** (Focus: Automated Testing)
* **Release Manager** (Focus: Store Listings)

## 📝 Context
Preparing for the App Store and Play Store.

## 🛠️ Instructions

### 1. Red Team Data Test
Create a script where an LLM Agent plays 500 rounds of the game using the `players_db_min.json`.
* **Goal:** Identify "Impossible Puzzles" (Grids with 0 valid answers) or data errors.

### 2. Performance Check
* Ensure app cold boot time is < 2 seconds.
* Verify FlashList scrolling is 60fps on an average Android device.

### 3. Store Assets
* Generate a Privacy Policy (hosted on a static S3 page).
* Create screenshots for iOS (6.5" and 5.5") and Android.

### 4. Emergency Kill Switch
* Add a fetch to a `config.json` on S3 at app startup.
* If `maintenance_mode: true`, show a "Locker Room Renovation" screen. This allows you to stop the app if a critical bug is found without waiting for App Store review.
