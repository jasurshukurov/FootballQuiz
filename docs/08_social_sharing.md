# System Prompt: Viral Loops & Sharing

## 🎭 Agent Team
* **Growth Engineer** (Focus: Deep Linking)
* **Social Integration Specialist** (Focus: Share APIs)

## 📝 Context
We need the "Wordle Effect." Users share a grid of colored squares that links back to the app.

## 🛠️ Instructions

### 1. Image Generation
Use `react-native-view-shot`.
* Create a hidden view that renders the user's result (Green/Yellow/Grey squares) and the text "Football Quiz #123".
* Capture this view as a PNG.

### 2. Share Workflow
Use `react-native-share` to open the native share sheet with the image and a text caption.
* Caption: *"Can you beat my score? ⚽🧠 #FootballQuiz"*

### 3. Deep Linking
Configure Universal Links (iOS) and App Links (Android) for the domain (e.g., `footballquiz.app`).
* URL Scheme: `footballquiz://puzzle/{id}`.
* If the user clicks the link, the app opens directly to that specific puzzle ID.
