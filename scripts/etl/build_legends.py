#!/usr/bin/env python3
"""Append missing legendary players to data/players_db_v1.json + their DOB to
data/player_ages.json.

The 82 targets come from find_missing_legends.py: fame_scores players with
fame_score >= 70 that have no players_db row, so they are unguessable in
"Who Are Ya" even though the fame join would accept them. Adding a row whose
`name` EXACTLY matches the fame_scores `name` (lib/dailyPuzzle.ts joins by
lowercase name) makes each one enter getFamousPlayers() automatically.

Design notes / conventions (mirrors existing rows + apply_player_patches.py):
  * name         -> EXACTLY the fame_scores spelling (join key).
  * normalized_name -> diacritic-folded lowercase, like existing rows
                       ("Lúcio" -> "lucio").
  * position     -> one of Attack / Midfield / Defender / Goalkeeper.
  * current_team -> the player's last professional club. When that club exists
                    in players_db we use its EXACT official string (so Grid
                    indexing matches); otherwise the plain common name (Grid
                    just won't match it — these rows exist mainly for the
                    name-guessing mode).
  * league       -> a big-5 league string ONLY when the last club plays in one;
                    '' otherwise (retired-in-MLS/Qatar/Brazil legends, etc.).
  * market_value -> 0  (these are not priced; Grid market-value cells stay 0).
  * status       -> 'active' for players still under contract in 2026, else
                    'retired' with retired_year.
  * image_url/image_source -> '' here; fetch_legend_images.py fills the
                    acceptably-licensed ones and records attribution.

Idempotent: a legend already present (by folded name) is skipped, so re-running
never duplicates. New ids are assigned from ID_BASE upward in roster order,
skipping any already taken.

stdlib only.

Usage:
    python3 build_legends.py            # append missing rows + ages
    python3 build_legends.py --dry-run  # report only, write nothing
"""
import argparse
import json
import os
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "data"))
DB_PATH = os.path.join(DATA_DIR, "players_db_v1.json")
AGES_PATH = os.path.join(DATA_DIR, "player_ages.json")

# New ids live well above the existing max (1,497,653) so they can never collide
# with real Transfermarkt-derived ids.
ID_BASE = 1_600_000

BIG5 = {"Premier League", "La Liga", "Serie A", "Ligue 1", "Bundesliga"}

# name, nationality, position, current_team, league, status, retired_year, dob
# league '' = last club not in a big-5 league. retired_year None for actives.
ROSTER = [
    ("Ronaldo de Assis Moreira", "Brazil", "Attack", "Fluminense", "", "retired", 2018, "1980-03-21"),
    ("Ronaldinho", "Brazil", "Attack", "Fluminense", "", "retired", 2018, "1980-03-21"),
    ("Pele", "Brazil", "Attack", "Santos", "", "retired", 1977, "1940-10-23"),
    ("Diego Maradona", "Argentina", "Attack", "Boca Juniors", "", "retired", 1997, "1960-10-30"),
    ("Gheorghe Hagi", "Romania", "Midfield", "Galatasaray", "", "retired", 2001, "1965-02-05"),
    ("Hristo Stoichkov", "Bulgaria", "Attack", "D.C. United", "", "retired", 2003, "1966-02-08"),
    ("Zinedine Zidane", "France", "Midfield", "Real Madrid Club de Fútbol", "La Liga", "retired", 2006, "1972-06-23"),
    ("Ronaldo Nazario", "Brazil", "Attack", "Corinthians", "", "retired", 2011, "1976-09-18"),
    ("Xavi Hernandez", "Spain", "Midfield", "Al-Sadd Sc", "", "retired", 2019, "1980-01-25"),
    ("Thierry Henry", "France", "Attack", "New York Red Bulls", "", "retired", 2014, "1977-08-17"),
    ("Iker Casillas", "Spain", "Goalkeeper", "FC Porto", "", "retired", 2020, "1981-05-20"),
    ("Paolo Maldini", "Italy", "Defender", "Associazione Calcio Milan", "Serie A", "retired", 2009, "1968-06-26"),
    ("Son Heung-min", "Korea, South", "Attack", "Los Angeles Fc", "", "active", None, "1992-07-08"),
    ("Raul Gonzalez", "Spain", "Attack", "New York Cosmos", "", "retired", 2015, "1977-06-27"),
    ("Mesut Ozil", "Germany", "Midfield", "Fenerbahce", "", "retired", 2023, "1988-10-15"),
    ("Alessandro Del Piero", "Italy", "Attack", "Sydney Fc", "", "retired", 2014, "1974-11-09"),
    ("N'Golo Kante", "France", "Midfield", "Al-Ittihad", "", "active", None, "1991-03-29"),
    ("Roberto Carlos", "Brazil", "Defender", "Delhi Dynamos", "", "retired", 2015, "1973-04-10"),
    ("Angel Di Maria", "Argentina", "Attack", "Ca Rosario Central", "", "active", None, "1988-02-14"),
    ("Samuel Eto'o", "Cameroon", "Attack", "Qatar Sc", "", "retired", 2019, "1981-03-10"),
    ("Thiago Silva", "Brazil", "Defender", "Fluminense", "", "active", None, "1984-09-22"),
    ("James Rodriguez", "Colombia", "Midfield", "Minnesota United Fc", "", "active", None, "1991-07-12"),
    ("Arjen Robben", "Netherlands", "Attack", "FC Groningen", "", "retired", 2021, "1984-01-23"),
    ("Alisson Becker", "Brazil", "Goalkeeper", "Liverpool Football Club", "Premier League", "active", None, "1992-10-02"),
    ("Raheem Sterling", "England", "Attack", "Chelsea Football Club", "Premier League", "active", None, "1994-12-08"),
    ("Franz Beckenbauer", "Germany", "Defender", "New York Cosmos", "", "retired", 1983, "1945-09-11"),
    ("Leonardo Bonucci", "Italy", "Defender", "Fenerbahce", "", "retired", 2024, "1987-05-01"),
    ("Fabio Cannavaro", "Italy", "Defender", "Al-Ahli Dubai", "", "retired", 2011, "1973-09-13"),
    ("Alessandro Nesta", "Italy", "Defender", "Montreal Impact", "", "retired", 2014, "1976-03-19"),
    ("Johan Cruyff", "Netherlands", "Attack", "Feyenoord", "", "retired", 1984, "1947-04-25"),
    ("Ilkay Gundogan", "Germany", "Midfield", "Manchester City Football Club", "Premier League", "active", None, "1990-10-24"),
    ("Robin van Persie", "Netherlands", "Attack", "Feyenoord", "", "retired", 2019, "1983-08-06"),
    ("Rivaldo", "Brazil", "Attack", "Mogi Mirim Esporte Clube", "", "retired", 2015, "1972-04-19"),
    ("Pepe", "Portugal", "Defender", "FC Porto", "", "retired", 2024, "1983-02-26"),
    ("Romario", "Brazil", "Attack", "America Rj", "", "retired", 2009, "1966-01-29"),
    ("Michael Ballack", "Germany", "Midfield", "Bayer 04 Leverkusen Fußball", "Bundesliga", "retired", 2012, "1976-09-26"),
    ("Patrick Vieira", "France", "Midfield", "Manchester City Football Club", "Premier League", "retired", 2011, "1976-06-23"),
    ("Oliver Kahn", "Germany", "Goalkeeper", "FC Bayern München", "Bundesliga", "retired", 2008, "1969-06-15"),
    ("Yaya Toure", "Cote d'Ivoire", "Midfield", "Qingdao Huanghai", "", "retired", 2020, "1983-05-13"),
    ("Michel Platini", "France", "Midfield", "Juventus Football Club", "Serie A", "retired", 1987, "1955-06-21"),
    ("Gabriel Batistuta", "Argentina", "Attack", "Al-Arabi Sc", "", "retired", 2005, "1969-02-01"),
    ("Victor Osimhen", "Nigeria", "Attack", "Galatasaray", "", "active", None, "1998-12-29"),
    ("Dennis Bergkamp", "Netherlands", "Attack", "Arsenal Football Club", "Premier League", "retired", 2006, "1969-05-10"),
    ("Franco Baresi", "Italy", "Defender", "Associazione Calcio Milan", "Serie A", "retired", 1997, "1960-05-08"),
    ("Alan Shearer", "England", "Attack", "Newcastle United Football Club", "Premier League", "retired", 2006, "1970-08-13"),
    ("Lilian Thuram", "France", "Defender", "Futbol Club Barcelona", "La Liga", "retired", 2008, "1972-01-01"),
    ("Roy Keane", "Ireland", "Midfield", "Celtic", "", "retired", 2006, "1971-08-10"),
    ("Edwin van der Sar", "Netherlands", "Goalkeeper", "Manchester United Football Club", "Premier League", "retired", 2011, "1970-10-29"),
    ("Hernan Crespo", "Argentina", "Attack", "Parma Calcio 1913", "Serie A", "retired", 2012, "1975-07-05"),
    ("Dimitar Berbatov", "Bulgaria", "Attack", "Kerala Blasters", "", "retired", 2019, "1981-01-30"),
    ("Juan Roman Riquelme", "Argentina", "Midfield", "Boca Juniors", "", "retired", 2014, "1978-06-24"),
    ("Marcel Desailly", "France", "Midfield", "Al-Gharafa Sc", "", "retired", 2006, "1968-09-07"),
    ("Mario Balotelli", "Italy", "Attack", "Al-Ittifaq", "", "active", None, "1990-08-12"),
    ("Alfredo Di Stefano", "Argentina", "Attack", "Reial Club Deportiu Espanyol de Barcelona S.A.D.", "La Liga", "retired", 1966, "1926-07-04"),
    ("Michael Essien", "Ghana", "Midfield", "Sabail Fk", "", "retired", 2020, "1982-12-03"),
    ("Roberto Baggio", "Italy", "Attack", "Brescia Calcio", "Serie A", "retired", 2004, "1967-02-18"),
    ("Robert Pires", "France", "Midfield", "Fc Goa", "", "retired", 2016, "1973-10-29"),
    ("Park Ji-sung", "Korea, South", "Midfield", "Queens Park Rangers", "", "retired", 2014, "1981-02-25"),
    ("Sol Campbell", "England", "Defender", "Newcastle United Football Club", "Premier League", "retired", 2011, "1974-09-18"),
    ("Peter Schmeichel", "Denmark", "Goalkeeper", "Manchester City Football Club", "Premier League", "retired", 2003, "1963-11-18"),
    ("Gianfranco Zola", "Italy", "Attack", "Cagliari Calcio", "Serie A", "retired", 2005, "1966-07-05"),
    ("Marco van Basten", "Netherlands", "Attack", "Associazione Calcio Milan", "Serie A", "retired", 1995, "1964-10-31"),
    ("Claude Makelele", "France", "Midfield", "Paris Saint-Germain Football Club", "Ligue 1", "retired", 2011, "1973-02-18"),
    ("Eric Cantona", "France", "Attack", "Manchester United Football Club", "Premier League", "retired", 1997, "1966-05-24"),
    ("Ruud Gullit", "Netherlands", "Midfield", "Chelsea Football Club", "Premier League", "retired", 1998, "1962-09-01"),
    ("Eusebio", "Portugal", "Attack", "Benfica", "", "retired", 1978, "1942-01-25"),
    ("Juan Mata", "Spain", "Midfield", "Melbourne Victory", "", "active", None, "1988-04-28"),
    ("Andre Onana", "Cameroon", "Goalkeeper", "Manchester United Football Club", "Premier League", "active", None, "1996-04-02"),
    ("Robbie Fowler", "England", "Attack", "Perth Glory", "", "retired", 2012, "1975-04-09"),
    ("Jay-Jay Okocha", "Nigeria", "Midfield", "Bolton Wanderers", "", "retired", 2008, "1973-08-14"),
    ("Lev Yashin", "Russia", "Goalkeeper", "Dynamo Moscow", "", "retired", 1970, "1929-10-22"),
    ("Hidetoshi Nakata", "Japan", "Midfield", "Bolton Wanderers", "Premier League", "retired", 2006, "1977-01-22"),
    ("Tim Cahill", "Australia", "Midfield", "Melbourne City Fc", "", "retired", 2018, "1979-12-06"),
    ("George Weah", "Liberia", "Attack", "Al-Jazira", "", "retired", 2003, "1966-10-01"),
    ("Keisuke Honda", "Japan", "Midfield", "Suzuka Point Getters", "", "retired", 2023, "1986-06-13"),
    ("Adriano", "Brazil", "Attack", "Miami United", "", "retired", 2016, "1982-02-17"),
    ("Shinji Kagawa", "Japan", "Midfield", "Cerezo Osaka", "", "active", None, "1989-03-17"),
    ("George Best", "Northern Ireland", "Attack", "San Jose Earthquakes", "", "retired", 1983, "1946-05-22"),
    ("Hakim Ziyech", "Morocco", "Attack", "Wydad Ac", "", "active", None, "1993-03-19"),
    ("Clarence Seedorf", "Netherlands", "Midfield", "Botafogo", "", "retired", 2014, "1976-04-01"),
    ("Leroy Sane", "Germany", "Attack", "Galatasaray", "", "active", None, "1996-01-11"),
    ("Marek Hamsik", "Slovakia", "Midfield", "Trabzonspor", "", "retired", 2023, "1987-07-27"),
]


def fold(name):
    nfkd = unicodedata.normalize("NFKD", name or "")
    stripped = "".join(c for c in nfkd if not unicodedata.combining(c))
    return " ".join(stripped.lower().split())


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def dump_json(path, obj):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    players = load_json(DB_PATH)
    ages = load_json(AGES_PATH)

    existing_folded = {fold(p.get("name")) for p in players}
    existing_ids = {p["id"] for p in players}

    # Sanity: every league we assert must already be a real big-5 string.
    for r in ROSTER:
        league = r[4]
        assert league == "" or league in BIG5, "bad league %r" % league

    next_id = ID_BASE
    added = []
    skipped = []
    for (name, nat, pos, team, league, status, retired_year, dob) in ROSTER:
        if fold(name) in existing_folded:
            skipped.append(name)
            continue
        while next_id in existing_ids:
            next_id += 1
        pid = next_id
        next_id += 1
        existing_ids.add(pid)
        existing_folded.add(fold(name))

        row = {
            "id": pid,
            "name": name,
            "normalized_name": fold(name),
            "nationality": nat,
            "current_team": team,
            "league": league,
            "position": pos,
            "market_value": 0,
            "image_url": "",
            "image_source": "",
            "status": status,
        }
        if status == "retired" and retired_year is not None:
            row["retired_year"] = retired_year
        players.append(row)
        ages[str(pid)] = dob + " 00:00:00"
        added.append((pid, name))

    print("Legends already present (skipped): %d" % len(skipped))
    for n in skipped:
        print("  - %s" % n)
    print("Legends appended: %d" % len(added))
    for pid, n in added:
        print("  + %d  %s" % (pid, n))

    if args.dry_run:
        print("\n[dry-run] nothing written")
        return

    dump_json(DB_PATH, players)
    dump_json(AGES_PATH, ages)
    print("\nWrote %s (%d rows) and %s (%d ages)"
          % (DB_PATH, len(players), AGES_PATH, len(ages)))


if __name__ == "__main__":
    main()
