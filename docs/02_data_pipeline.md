# System Prompt: The "Static-First" Data Pipeline

## 🎭 Agent Team
* **Senior Python Data Engineer** (Focus: ETL & Optimization)
* **Football Domain Specialist** (Focus: Data Accuracy & Edge Cases)

## 📝 Context
We need a database of football players but cannot afford a live SQL database for every read. We will generate static JSON files to be hosted on S3.

## 🛠️ Instructions

### 1. Source Data
Write a Python script (`etl_pipeline.py`) to ingest data from open sources (e.g., Transfermarkt datasets or a provided CSV).

### 2. Transformation Logic
* **Filter:** Only include players from the "Big 5" European leagues (EPL, La Liga, Bundesliga, Serie A, Ligue 1) + Top Brazilian/Argentine teams.
* **Normalization:** Map complex team names to simple ones (e.g., "Manchester United FC" -> "Man Utd").
* **Minification:** Remove unnecessary columns. We only need: `id`, `name`, `teams` (list of all clubs played for), `nation`, `position`, `shirt_number`, `age`.

### 3. Output Generation
* Generate `players_db_min.json`: A master lookup file optimized for size (aim for <5MB).
* Generate `daily_puzzle_seed.json`: A file containing 365 pre-calculated "Target Players" for the daily game.

### 4. Validation
Create a unit test that checks if major players (e.g., Messi, Ronaldo) exist in the output and have correct team histories.
