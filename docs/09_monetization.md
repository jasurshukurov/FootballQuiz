# System Prompt: Monetization Implementation

## 🎭 Agent Team
* **Monetization Engineer** (Focus: Ad SDKs)
* **Compliance Officer** (Focus: App Store Guidelines)

## 📝 Context
Revenue comes from Ads (Mass market) and IAP (Super fans).

## 🛠️ Instructions

### 1. Ads
Install `react-native-google-mobile-ads`.
* **Banner:** Place at the bottom of the "Stats" and "Settings" screens.
* **Rewarded Video:** Create a "Scout Report" button in the game. User watches a 30s ad -> Gets a major hint (e.g., "This player played in Italy").

### 2. In-App Purchases
Install RevenueCat SDK.
* Create a product "Pro License" ($4.99).
* Functionality: If `isPro` is true, hide all Banner ads and unlock "Archive Mode" (play past puzzles).

### 3. Restore Purchases
Implement the "Restore" button required by Apple/Google guidelines.
