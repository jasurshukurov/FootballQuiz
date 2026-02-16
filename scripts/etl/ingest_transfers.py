"""
ETL script to generate transfers.json with curated historical transfer data.

Contains ~100 notable players with well-known transfer histories,
cross-referenced against players_db_v1.json for matching IDs.
"""

import json
import sys
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PLAYERS_DB = OUTPUT_DIR / "players_db_v1.json"
OUTPUT_FILE = OUTPUT_DIR / "transfers.json"


def load_player_ids() -> dict[str, int]:
    """Load player DB and return a name->id mapping."""
    with open(PLAYERS_DB, "r", encoding="utf-8") as f:
        players = json.load(f)
    return {p["normalized_name"]: p["id"] for p in players}


def slugify(name: str) -> str:
    """Convert club name to a URL-friendly slug."""
    return (
        name.lower()
        .replace(".", "")
        .replace("'", "")
        .replace("é", "e")
        .replace("ü", "u")
        .replace("ö", "o")
        .replace("ä", "a")
        .replace("ç", "c")
        .replace("ñ", "n")
        .replace("í", "i")
        .replace("á", "a")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ã", "a")
        .replace("â", "a")
        .replace(" ", "-")
        .replace("--", "-")
        .strip("-")
    )


def build_transfer_entry(
    club_name: str,
    date_joined: str,
    date_left: str | None,
    fee: str | None,
) -> dict:
    return {
        "club_name": club_name,
        "club_id": slugify(club_name),
        "date_joined": date_joined,
        "date_left": date_left,
        "fee": fee,
    }


def t(club: str, joined: str, left: str | None, fee: str | None) -> dict:
    """Shorthand for build_transfer_entry."""
    return build_transfer_entry(club, joined, left, fee)


# fmt: off
TRANSFER_DATA: list[dict] = [
    # --- Prolific movers & legends ---
    {
        "player_name": "Cristiano Ronaldo",
        "normalized_name": "cristiano ronaldo",
        "transfers": [
            t("Sporting CP", "2002-08-01", "2003-08-12", None),
            t("Manchester United", "2003-08-12", "2009-07-01", "€12.24m"),
            t("Real Madrid", "2009-07-01", "2018-07-10", "€94m"),
            t("Juventus", "2018-07-10", "2021-08-31", "€117m"),
            t("Manchester United", "2021-08-31", "2022-11-22", "€15m"),
            t("Al Nassr", "2023-01-01", None, "Free"),
        ],
    },
    {
        "player_name": "Lionel Messi",
        "normalized_name": "lionel messi",
        "transfers": [
            t("FC Barcelona", "2004-10-16", "2021-08-10", None),
            t("Paris Saint-Germain", "2021-08-10", "2023-06-30", "Free"),
            t("Inter Miami", "2023-07-15", None, "Free"),
        ],
    },
    {
        "player_name": "Zlatan Ibrahimovic",
        "normalized_name": "zlatan ibrahimovic",
        "transfers": [
            t("Malmo FF", "1999-07-01", "2001-07-01", None),
            t("Ajax", "2001-07-01", "2004-08-31", "€8.7m"),
            t("Juventus", "2004-08-31", "2006-08-10", "€16m"),
            t("Inter Milan", "2006-08-10", "2009-07-27", "€24.8m"),
            t("FC Barcelona", "2009-07-27", "2010-08-28", "€69.5m"),
            t("AC Milan", "2010-08-28", "2012-07-18", "Loan"),
            t("Paris Saint-Germain", "2012-07-18", "2016-06-30", "€21m"),
            t("Manchester United", "2016-07-01", "2018-03-22", "Free"),
            t("LA Galaxy", "2018-03-23", "2019-11-13", "Free"),
            t("AC Milan", "2020-01-02", "2023-06-05", "Free"),
        ],
    },
    {
        "player_name": "David Beckham",
        "normalized_name": "david beckham",
        "transfers": [
            t("Manchester United", "1992-07-01", "2003-07-01", None),
            t("Real Madrid", "2003-07-01", "2007-06-30", "€37.5m"),
            t("LA Galaxy", "2007-07-01", "2012-12-01", "Free"),
            t("AC Milan", "2009-01-07", "2009-06-30", "Loan"),
            t("AC Milan", "2010-01-06", "2010-06-30", "Loan"),
            t("Paris Saint-Germain", "2013-01-31", "2013-05-18", "Free"),
        ],
    },
    {
        "player_name": "Neymar",
        "normalized_name": "neymar",
        "transfers": [
            t("Santos", "2009-03-07", "2013-06-03", None),
            t("FC Barcelona", "2013-06-03", "2017-08-03", "€88.2m"),
            t("Paris Saint-Germain", "2017-08-03", "2023-08-15", "€222m"),
            t("Al Hilal", "2023-08-15", None, "€90m"),
        ],
    },
    {
        "player_name": "Kylian Mbappe",
        "normalized_name": "kylian mbappe",
        "transfers": [
            t("Monaco", "2015-12-02", "2017-08-31", None),
            t("Paris Saint-Germain", "2017-08-31", "2024-07-01", "€180m"),
            t("Real Madrid", "2024-07-01", None, "Free"),
        ],
    },
    {
        "player_name": "Erling Haaland",
        "normalized_name": "erling haaland",
        "transfers": [
            t("Molde", "2017-02-01", "2019-01-01", None),
            t("Red Bull Salzburg", "2019-01-01", "2020-01-01", "€8m"),
            t("Borussia Dortmund", "2020-01-01", "2022-07-01", "€20m"),
            t("Manchester City", "2022-07-01", None, "€60m"),
        ],
    },
    {
        "player_name": "Jude Bellingham",
        "normalized_name": "jude bellingham",
        "transfers": [
            t("Birmingham City", "2019-08-01", "2020-07-16", None),
            t("Borussia Dortmund", "2020-07-16", "2023-06-14", "€25m"),
            t("Real Madrid", "2023-06-14", None, "€103m"),
        ],
    },
    {
        "player_name": "Cesc Fabregas",
        "normalized_name": "cesc fabregas",
        "transfers": [
            t("Arsenal", "2003-09-01", "2011-08-15", None),
            t("FC Barcelona", "2011-08-15", "2014-06-12", "€34m"),
            t("Chelsea", "2014-06-12", "2019-01-11", "€33m"),
            t("Monaco", "2019-01-11", "2022-07-01", "Free"),
            t("Como 1907", "2022-07-01", "2023-06-30", "Free"),
        ],
    },
    {
        "player_name": "Luka Modric",
        "normalized_name": "luka modric",
        "transfers": [
            t("Dinamo Zagreb", "2003-07-01", "2008-04-28", None),
            t("Tottenham Hotspur", "2008-04-28", "2012-08-27", "€21m"),
            t("Real Madrid", "2012-08-27", None, "€35m"),
        ],
    },
    {
        "player_name": "Toni Kroos",
        "normalized_name": "toni kroos",
        "transfers": [
            t("Bayern Munich", "2007-07-01", "2014-07-17", None),
            t("Bayer Leverkusen", "2009-01-01", "2010-06-30", "Loan"),
            t("Real Madrid", "2014-07-17", "2024-06-30", "€25m"),
        ],
    },
    {
        "player_name": "Robert Lewandowski",
        "normalized_name": "robert lewandowski",
        "transfers": [
            t("Znicz Pruszkow", "2006-07-01", "2008-06-30", None),
            t("Lech Poznan", "2008-06-30", "2010-06-18", "€0.4m"),
            t("Borussia Dortmund", "2010-06-18", "2014-07-01", "€4.5m"),
            t("Bayern Munich", "2014-07-01", "2022-08-13", "Free"),
            t("FC Barcelona", "2022-08-13", None, "€45m"),
        ],
    },
    {
        "player_name": "Mohamed Salah",
        "normalized_name": "mohamed salah",
        "transfers": [
            t("El Mokawloon", "2010-05-01", "2012-04-01", None),
            t("Basel", "2012-04-01", "2014-02-02", "€2.5m"),
            t("Chelsea", "2014-02-02", "2016-08-03", "€15m"),
            t("Fiorentina", "2015-02-02", "2015-06-30", "Loan"),
            t("Roma", "2015-08-06", "2017-06-22", "Loan/€15m"),
            t("Liverpool", "2017-06-22", None, "€42m"),
        ],
    },
    {
        "player_name": "Luis Suarez",
        "normalized_name": "luis suarez",
        "transfers": [
            t("Nacional", "2005-01-01", "2006-07-01", None),
            t("Groningen", "2006-07-01", "2007-08-23", "€0.8m"),
            t("Ajax", "2007-08-23", "2011-01-28", "€7.5m"),
            t("Liverpool", "2011-01-28", "2014-07-11", "€26.5m"),
            t("FC Barcelona", "2014-07-11", "2020-09-25", "€81.7m"),
            t("Atletico Madrid", "2020-09-25", "2022-06-30", "Free"),
            t("Nacional", "2022-07-26", "2022-10-31", "Free"),
            t("Gremio", "2023-01-04", "2024-07-22", "Free"),
            t("Inter Miami", "2024-07-22", None, "Free"),
        ],
    },
    {
        "player_name": "Eden Hazard",
        "normalized_name": "eden hazard",
        "transfers": [
            t("Lille", "2007-11-24", "2012-06-04", None),
            t("Chelsea", "2012-06-04", "2019-06-07", "€35m"),
            t("Real Madrid", "2019-06-07", "2023-06-30", "€115m"),
        ],
    },
    {
        "player_name": "Antoine Griezmann",
        "normalized_name": "antoine griezmann",
        "transfers": [
            t("Real Sociedad", "2009-09-01", "2014-07-28", None),
            t("Atletico Madrid", "2014-07-28", "2019-07-12", "€30m"),
            t("FC Barcelona", "2019-07-12", "2021-08-31", "€120m"),
            t("Atletico Madrid", "2021-08-31", None, "Loan/€20m"),
        ],
    },
    {
        "player_name": "Philippe Coutinho",
        "normalized_name": "philippe coutinho",
        "transfers": [
            t("Vasco da Gama", "2008-01-01", "2010-07-01", None),
            t("Inter Milan", "2010-07-01", "2013-01-30", "€3.8m"),
            t("Liverpool", "2013-01-30", "2018-01-06", "€13m"),
            t("FC Barcelona", "2018-01-06", "2022-01-08", "€135m"),
            t("Aston Villa", "2022-01-08", None, "Loan/€20m"),
        ],
    },
    {
        "player_name": "Joao Felix",
        "normalized_name": "joao felix",
        "transfers": [
            t("Benfica", "2018-02-01", "2019-07-17", None),
            t("Atletico Madrid", "2019-07-17", "2023-01-12", "€127.2m"),
            t("Chelsea", "2023-01-12", "2023-06-30", "Loan"),
            t("FC Barcelona", "2023-09-01", "2024-06-30", "Loan"),
            t("Chelsea", "2024-08-22", None, "€52m"),
        ],
    },
    {
        "player_name": "Paul Pogba",
        "normalized_name": "paul pogba",
        "transfers": [
            t("Le Havre", "2007-01-01", "2009-07-01", None),
            t("Manchester United", "2009-07-01", "2012-07-03", "Free"),
            t("Juventus", "2012-07-03", "2016-08-08", "Free"),
            t("Manchester United", "2016-08-08", "2022-07-01", "€105m"),
            t("Juventus", "2022-07-01", "2024-03-01", "Free"),
        ],
    },
    {
        "player_name": "Romelu Lukaku",
        "normalized_name": "romelu lukaku",
        "transfers": [
            t("Anderlecht", "2009-05-24", "2011-08-10", None),
            t("Chelsea", "2011-08-10", "2014-07-30", "€12m"),
            t("West Brom", "2012-08-10", "2013-06-30", "Loan"),
            t("Everton", "2013-09-02", "2017-07-10", "Loan/€35m"),
            t("Manchester United", "2017-07-10", "2019-08-08", "€84.7m"),
            t("Inter Milan", "2019-08-08", "2021-08-12", "€74m"),
            t("Chelsea", "2021-08-12", "2023-06-30", "€113m"),
            t("Roma", "2023-09-01", "2024-06-30", "Loan"),
            t("Napoli", "2024-08-29", None, "€30m"),
        ],
    },
    {
        "player_name": "Alvaro Morata",
        "normalized_name": "alvaro morata",
        "transfers": [
            t("Real Madrid", "2010-07-01", "2014-07-19", None),
            t("Juventus", "2014-07-19", "2016-06-23", "€20m"),
            t("Real Madrid", "2016-06-23", "2017-07-18", "€30m"),
            t("Chelsea", "2017-07-18", "2019-01-28", "€66m"),
            t("Atletico Madrid", "2019-01-28", "2022-07-01", "Loan/€56m"),
            t("Juventus", "2020-09-22", "2022-06-30", "Loan"),
            t("Atletico Madrid", "2022-07-01", "2024-07-15", "€35m"),
            t("AC Milan", "2024-07-15", None, "€13m"),
        ],
    },
    {
        "player_name": "Andrea Pirlo",
        "normalized_name": "andrea pirlo",
        "transfers": [
            t("Brescia", "1995-05-21", "1998-07-01", None),
            t("Inter Milan", "1998-07-01", "2001-06-30", "€18m"),
            t("Brescia", "1999-07-01", "2000-06-30", "Loan"),
            t("Reggina", "2000-01-01", "2000-06-30", "Loan"),
            t("AC Milan", "2001-06-30", "2011-07-01", "Free"),
            t("Juventus", "2011-07-01", "2015-07-01", "Free"),
            t("New York City FC", "2015-07-01", "2017-12-31", "Free"),
        ],
    },
    {
        "player_name": "Xabi Alonso",
        "normalized_name": "xabi alonso",
        "transfers": [
            t("Real Sociedad", "1999-07-01", "2004-08-20", None),
            t("Liverpool", "2004-08-20", "2009-08-05", "€15m"),
            t("Real Madrid", "2009-08-05", "2014-08-29", "€30m"),
            t("Bayern Munich", "2014-08-29", "2017-05-20", "€9m"),
        ],
    },
    {
        "player_name": "Sergio Ramos",
        "normalized_name": "sergio ramos",
        "transfers": [
            t("Sevilla", "2003-02-01", "2005-08-31", None),
            t("Real Madrid", "2005-08-31", "2021-06-30", "€27m"),
            t("Paris Saint-Germain", "2021-07-08", "2023-06-30", "Free"),
            t("Sevilla", "2023-09-12", None, "Free"),
        ],
    },
    {
        "player_name": "Gerard Pique",
        "normalized_name": "gerard pique",
        "transfers": [
            t("FC Barcelona", "1997-07-01", "2004-07-01", None),
            t("Manchester United", "2004-07-01", "2008-05-27", "€5m"),
            t("FC Barcelona", "2008-05-27", "2022-11-03", "€5m"),
        ],
    },
    {
        "player_name": "Xavi",
        "normalized_name": "xavi",
        "transfers": [
            t("FC Barcelona", "1998-08-01", "2015-05-21", None),
            t("Al Sadd", "2015-05-21", "2019-05-02", "Free"),
        ],
    },
    {
        "player_name": "Andres Iniesta",
        "normalized_name": "andres iniesta",
        "transfers": [
            t("FC Barcelona", "2002-10-29", "2018-05-20", None),
            t("Vissel Kobe", "2018-05-24", "2023-07-01", "Free"),
        ],
    },
    {
        "player_name": "Wayne Rooney",
        "normalized_name": "wayne rooney",
        "transfers": [
            t("Everton", "2002-08-17", "2004-08-31", None),
            t("Manchester United", "2004-08-31", "2017-07-09", "€37m"),
            t("Everton", "2017-07-09", "2018-06-28", "Free"),
            t("DC United", "2018-07-10", "2019-10-06", "Free"),
            t("Derby County", "2020-01-02", "2021-06-30", "Free"),
        ],
    },
    {
        "player_name": "Carlos Tevez",
        "normalized_name": "carlos tevez",
        "transfers": [
            t("Boca Juniors", "2001-03-21", "2004-12-15", None),
            t("Corinthians", "2004-12-15", "2006-08-31", "€16.9m"),
            t("West Ham United", "2006-08-31", "2007-06-29", "Loan"),
            t("Manchester United", "2007-08-10", "2009-06-30", "Loan"),
            t("Manchester City", "2009-07-14", "2013-06-27", "€25.5m"),
            t("Juventus", "2013-06-27", "2016-06-24", "€12m"),
            t("Boca Juniors", "2016-07-13", "2021-06-04", "Free"),
        ],
    },
    {
        "player_name": "Fernando Torres",
        "normalized_name": "fernando torres",
        "transfers": [
            t("Atletico Madrid", "2001-05-27", "2007-07-04", None),
            t("Liverpool", "2007-07-04", "2011-01-31", "€38m"),
            t("Chelsea", "2011-01-31", "2014-12-29", "€58.5m"),
            t("AC Milan", "2014-08-31", "2015-01-05", "Loan"),
            t("Atletico Madrid", "2015-01-05", "2018-05-20", "Free"),
            t("Sagan Tosu", "2018-07-10", "2019-08-23", "Free"),
        ],
    },
    {
        "player_name": "Edinson Cavani",
        "normalized_name": "edinson cavani",
        "transfers": [
            t("Danubio", "2005-01-01", "2007-07-01", None),
            t("Palermo", "2007-07-01", "2010-06-30", "€4.5m"),
            t("Napoli", "2010-06-30", "2013-07-16", "€17m"),
            t("Paris Saint-Germain", "2013-07-16", "2020-06-30", "€64.5m"),
            t("Manchester United", "2020-10-05", "2022-06-30", "Free"),
            t("Valencia", "2022-08-29", "2023-06-30", "Free"),
        ],
    },
    {
        "player_name": "Sergio Aguero",
        "normalized_name": "sergio aguero",
        "transfers": [
            t("Independiente", "2003-07-05", "2006-06-02", None),
            t("Atletico Madrid", "2006-06-02", "2011-07-28", "€23m"),
            t("Manchester City", "2011-07-28", "2021-06-30", "€40m"),
            t("FC Barcelona", "2021-07-31", "2021-12-15", "Free"),
        ],
    },
    {
        "player_name": "Gianluigi Buffon",
        "normalized_name": "gianluigi buffon",
        "transfers": [
            t("Parma", "1995-11-19", "2001-07-03", None),
            t("Juventus", "2001-07-03", "2018-07-06", "€52m"),
            t("Paris Saint-Germain", "2018-07-06", "2019-06-30", "Free"),
            t("Juventus", "2019-07-04", "2021-06-30", "Free"),
            t("Parma", "2021-06-17", "2023-08-02", "Free"),
        ],
    },
    {
        "player_name": "Franck Ribery",
        "normalized_name": "franck ribery",
        "transfers": [
            t("Boulogne", "2002-09-01", "2004-01-01", None),
            t("Ales", "2002-01-01", "2002-06-30", "Loan"),
            t("Brest", "2003-01-01", "2003-06-30", "Loan"),
            t("Metz", "2004-01-01", "2005-01-01", "€0.5m"),
            t("Galatasaray", "2005-01-01", "2005-06-30", "€3m"),
            t("Marseille", "2005-06-30", "2007-06-07", "€5m"),
            t("Bayern Munich", "2007-06-07", "2019-06-30", "€25m"),
            t("Fiorentina", "2019-08-21", "2021-06-30", "Free"),
            t("Salernitana", "2021-09-06", "2022-10-14", "Free"),
        ],
    },
    {
        "player_name": "Bastian Schweinsteiger",
        "normalized_name": "bastian schweinsteiger",
        "transfers": [
            t("Bayern Munich", "2002-11-13", "2015-07-11", None),
            t("Manchester United", "2015-07-11", "2017-03-20", "€9m"),
            t("Chicago Fire", "2017-03-29", "2019-10-15", "Free"),
        ],
    },
    {
        "player_name": "Dani Alves",
        "normalized_name": "dani alves",
        "transfers": [
            t("Bahia", "2001-01-01", "2002-07-01", None),
            t("Sevilla", "2002-07-01", "2008-07-01", "€1m"),
            t("FC Barcelona", "2008-07-01", "2016-06-30", "€35.5m"),
            t("Juventus", "2016-06-30", "2017-06-30", "Free"),
            t("Paris Saint-Germain", "2017-08-01", "2019-06-30", "Free"),
            t("Sao Paulo", "2019-08-08", "2021-09-10", "Free"),
            t("FC Barcelona", "2021-11-12", "2022-06-30", "Free"),
            t("UNAM Pumas", "2022-07-23", "2023-02-20", "Free"),
        ],
    },
    {
        "player_name": "Thiago Silva",
        "normalized_name": "thiago silva",
        "transfers": [
            t("Fluminense", "2006-01-01", "2009-01-01", None),
            t("AC Milan", "2009-01-01", "2012-07-12", "€10m"),
            t("Paris Saint-Germain", "2012-07-12", "2020-08-25", "€42m"),
            t("Chelsea", "2020-08-25", "2024-06-30", "Free"),
            t("Fluminense", "2024-07-07", None, "Free"),
        ],
    },
    {
        "player_name": "David Luiz",
        "normalized_name": "david luiz",
        "transfers": [
            t("Vitoria", "2005-01-01", "2007-05-01", None),
            t("Benfica", "2007-05-01", "2011-01-31", "€1m"),
            t("Chelsea", "2011-01-31", "2014-06-13", "€25m"),
            t("Paris Saint-Germain", "2014-06-13", "2016-08-31", "€49.5m"),
            t("Chelsea", "2016-08-31", "2019-08-08", "€35m"),
            t("Arsenal", "2019-08-08", "2021-06-30", "€8m"),
            t("Flamengo", "2021-09-10", "2023-12-31", "Free"),
        ],
    },
    {
        "player_name": "Willian",
        "normalized_name": "willian",
        "transfers": [
            t("Corinthians", "2006-01-01", "2007-08-28", None),
            t("Shakhtar Donetsk", "2007-08-28", "2013-01-25", "€14m"),
            t("Anzhi Makhachkala", "2013-01-25", "2013-08-21", "€35m"),
            t("Chelsea", "2013-08-21", "2020-06-30", "€35m"),
            t("Arsenal", "2020-08-14", "2021-08-31", "Free"),
            t("Corinthians", "2021-09-01", "2022-08-09", "Free"),
            t("Fulham", "2022-08-18", None, "Free"),
        ],
    },
    {
        "player_name": "Alexis Sanchez",
        "normalized_name": "alexis sanchez",
        "transfers": [
            t("Cobreloa", "2005-04-02", "2006-07-01", None),
            t("Udinese", "2006-07-01", "2011-07-20", "€3m"),
            t("FC Barcelona", "2011-07-20", "2014-07-10", "€26m"),
            t("Arsenal", "2014-07-10", "2018-01-22", "€42.5m"),
            t("Manchester United", "2018-01-22", "2020-08-06", "Swap"),
            t("Inter Milan", "2019-08-29", "2020-08-06", "Loan"),
            t("Inter Milan", "2020-08-06", "2023-06-30", "Free"),
            t("Marseille", "2023-08-16", "2024-06-30", "Free"),
            t("Udinese", "2024-09-11", None, "Free"),
        ],
    },
    {
        "player_name": "Arturo Vidal",
        "normalized_name": "arturo vidal",
        "transfers": [
            t("Colo-Colo", "2006-01-01", "2007-07-01", None),
            t("Bayer Leverkusen", "2007-07-01", "2011-07-25", "€6m"),
            t("Juventus", "2011-07-25", "2015-07-28", "€10.5m"),
            t("Bayern Munich", "2015-07-28", "2018-08-28", "€37m"),
            t("FC Barcelona", "2018-08-28", "2020-09-21", "€18m"),
            t("Inter Milan", "2020-09-21", "2022-06-30", "Free"),
            t("Flamengo", "2022-07-07", "2023-07-04", "Free"),
        ],
    },
    {
        "player_name": "Ivan Rakitic",
        "normalized_name": "ivan rakitic",
        "transfers": [
            t("Basel", "2005-01-01", "2007-07-01", None),
            t("Schalke 04", "2007-07-01", "2011-01-20", "€5.5m"),
            t("Sevilla", "2011-01-20", "2014-06-16", "€2.5m"),
            t("FC Barcelona", "2014-06-16", "2020-09-01", "€18m"),
            t("Sevilla", "2020-09-01", "2024-06-30", "€1.5m"),
        ],
    },
    {
        "player_name": "Wesley Sneijder",
        "normalized_name": "wesley sneijder",
        "transfers": [
            t("Ajax", "2002-08-01", "2007-08-14", None),
            t("Real Madrid", "2007-08-14", "2009-08-27", "€27m"),
            t("Inter Milan", "2009-08-27", "2013-01-22", "€15m"),
            t("Galatasaray", "2013-01-22", "2017-07-01", "€7.5m"),
            t("Nice", "2017-08-08", "2018-01-01", "Free"),
            t("Al-Gharafa", "2018-01-01", "2019-01-06", "Free"),
        ],
    },
    {
        "player_name": "Gonzalo Higuain",
        "normalized_name": "gonzalo higuain",
        "transfers": [
            t("River Plate", "2004-05-29", "2006-12-27", None),
            t("Real Madrid", "2006-12-27", "2013-07-26", "€12m"),
            t("Napoli", "2013-07-26", "2016-07-26", "€39m"),
            t("Juventus", "2016-07-26", "2020-09-17", "€90m"),
            t("AC Milan", "2018-08-02", "2019-01-23", "Loan"),
            t("Chelsea", "2019-01-23", "2019-06-30", "Loan"),
            t("Inter Miami", "2020-09-18", "2022-10-15", "Free"),
        ],
    },
    {
        "player_name": "Diego Costa",
        "normalized_name": "diego costa",
        "transfers": [
            t("Braga", "2006-01-01", "2007-01-01", None),
            t("Atletico Madrid", "2007-01-01", "2014-07-15", "€1.5m"),
            t("Chelsea", "2014-07-15", "2017-09-21", "€38m"),
            t("Atletico Madrid", "2017-09-21", "2020-12-29", "€60m"),
            t("Atletico Mineiro", "2021-08-19", "2022-01-12", "Free"),
            t("Wolverhampton", "2023-09-01", "2024-06-30", "Free"),
        ],
    },
    {
        "player_name": "Radamel Falcao",
        "normalized_name": "radamel falcao",
        "transfers": [
            t("River Plate", "2005-03-01", "2009-08-12", None),
            t("Porto", "2009-08-12", "2011-08-18", "€5.5m"),
            t("Atletico Madrid", "2011-08-18", "2013-05-31", "€40m"),
            t("Monaco", "2013-05-31", "2019-09-01", "€60m"),
            t("Manchester United", "2014-09-01", "2015-06-30", "Loan"),
            t("Chelsea", "2015-07-01", "2016-05-30", "Loan"),
            t("Galatasaray", "2019-09-03", "2020-06-30", "Loan"),
            t("Rayo Vallecano", "2021-09-04", None, "Free"),
        ],
    },
    {
        "player_name": "Douglas Costa",
        "normalized_name": "douglas costa",
        "transfers": [
            t("Gremio", "2008-01-01", "2010-01-01", None),
            t("Shakhtar Donetsk", "2010-01-01", "2015-06-30", "€6m"),
            t("Bayern Munich", "2015-06-30", "2017-06-14", "€30m"),
            t("Juventus", "2017-06-14", "2021-07-01", "Loan/€40m"),
            t("Bayern Munich", "2020-10-05", "2021-06-30", "Loan"),
            t("Gremio", "2021-07-01", "2022-01-01", "Loan"),
            t("LA Galaxy", "2022-02-10", "2022-07-01", "Free"),
        ],
    },
    {
        "player_name": "Juan Cuadrado",
        "normalized_name": "juan cuadrado",
        "transfers": [
            t("Independiente Medellin", "2008-01-01", "2009-07-01", None),
            t("Udinese", "2009-07-01", "2012-01-01", "€1.5m"),
            t("Lecce", "2011-01-01", "2011-06-30", "Loan"),
            t("Fiorentina", "2012-01-01", "2015-02-02", "€4m"),
            t("Chelsea", "2015-02-02", "2015-08-01", "€26.8m"),
            t("Juventus", "2015-08-01", "2023-06-30", "Loan/€20m"),
            t("Inter Milan", "2023-07-01", "2024-06-30", "Free"),
        ],
    },
    {
        "player_name": "Thibaut Courtois",
        "normalized_name": "thibaut courtois",
        "transfers": [
            t("Genk", "2009-07-01", "2011-07-12", None),
            t("Chelsea", "2011-07-12", "2018-08-08", "€9m"),
            t("Atletico Madrid", "2011-08-01", "2014-06-30", "Loan"),
            t("Real Madrid", "2018-08-08", None, "€35m"),
        ],
    },
    {
        "player_name": "David de Gea",
        "normalized_name": "david de gea",
        "transfers": [
            t("Atletico Madrid", "2008-09-30", "2011-06-29", None),
            t("Manchester United", "2011-06-29", "2023-06-30", "€25m"),
            t("Fiorentina", "2024-09-28", None, "Free"),
        ],
    },
    {
        "player_name": "Kevin De Bruyne",
        "normalized_name": "kevin de bruyne",
        "transfers": [
            t("Genk", "2008-07-01", "2012-01-31", None),
            t("Chelsea", "2012-01-31", "2014-01-18", "€8m"),
            t("Werder Bremen", "2012-07-01", "2013-06-30", "Loan"),
            t("VfL Wolfsburg", "2014-01-18", "2015-08-30", "€22m"),
            t("Manchester City", "2015-08-30", None, "€76m"),
        ],
    },
    {
        "player_name": "Harry Kane",
        "normalized_name": "harry kane",
        "transfers": [
            t("Tottenham Hotspur", "2009-07-01", "2023-08-12", None),
            t("Bayern Munich", "2023-08-12", None, "€95m"),
        ],
    },
    {
        "player_name": "Gareth Bale",
        "normalized_name": "gareth bale",
        "transfers": [
            t("Southampton", "2006-04-17", "2007-05-25", None),
            t("Tottenham Hotspur", "2007-05-25", "2013-09-01", "€14.7m"),
            t("Real Madrid", "2013-09-01", "2022-06-30", "€101m"),
            t("Tottenham Hotspur", "2020-09-19", "2021-06-30", "Loan"),
            t("LAFC", "2022-06-27", "2023-01-09", "Free"),
        ],
    },
    {
        "player_name": "Pierre-Emerick Aubameyang",
        "normalized_name": "pierre-emerick aubameyang",
        "transfers": [
            t("AC Milan", "2008-01-01", "2011-06-30", None),
            t("Saint-Etienne", "2011-06-30", "2013-07-04", "€2m"),
            t("Borussia Dortmund", "2013-07-04", "2018-01-31", "€13m"),
            t("Arsenal", "2018-01-31", "2022-02-01", "€63.75m"),
            t("FC Barcelona", "2022-02-01", "2022-09-01", "Free"),
            t("Chelsea", "2022-09-01", "2023-06-30", "€12m"),
            t("Marseille", "2023-07-01", None, "Free"),
        ],
    },
    {
        "player_name": "Memphis Depay",
        "normalized_name": "memphis depay",
        "transfers": [
            t("PSV Eindhoven", "2011-08-01", "2015-01-01", None),
            t("Manchester United", "2015-06-12", "2017-01-20", "€34m"),
            t("Lyon", "2017-01-20", "2021-06-30", "€16m"),
            t("FC Barcelona", "2021-06-30", "2023-01-17", "Free"),
            t("Atletico Madrid", "2023-01-17", None, "Free"),
        ],
    },
    {
        "player_name": "Ousmane Dembele",
        "normalized_name": "ousmane dembele",
        "transfers": [
            t("Rennes", "2015-09-12", "2016-06-12", None),
            t("Borussia Dortmund", "2016-06-12", "2017-08-25", "€15m"),
            t("FC Barcelona", "2017-08-25", "2023-08-07", "€135m"),
            t("Paris Saint-Germain", "2023-08-07", None, "€50m"),
        ],
    },
    {
        "player_name": "Roberto Firmino",
        "normalized_name": "roberto firmino",
        "transfers": [
            t("Figueirense", "2009-01-01", "2011-01-01", None),
            t("Hoffenheim", "2011-01-01", "2015-06-24", "€3.5m"),
            t("Liverpool", "2015-06-24", "2023-06-30", "€41m"),
            t("Al-Ahli", "2023-08-01", None, "Free"),
        ],
    },
    {
        "player_name": "Sadio Mane",
        "normalized_name": "sadio mane",
        "transfers": [
            t("Metz", "2011-08-01", "2012-07-01", None),
            t("Red Bull Salzburg", "2012-07-01", "2014-09-01", "€4m"),
            t("Southampton", "2014-09-01", "2016-06-28", "€23m"),
            t("Liverpool", "2016-06-28", "2022-06-22", "€41.2m"),
            t("Bayern Munich", "2022-06-22", "2023-07-07", "€32m"),
            t("Al-Nassr", "2023-08-01", None, "€30m"),
        ],
    },
    {
        "player_name": "Chicharito",
        "normalized_name": "chicharito",
        "transfers": [
            t("Guadalajara", "2006-09-11", "2010-07-01", None),
            t("Manchester United", "2010-07-01", "2014-09-01", "€8m"),
            t("Real Madrid", "2014-09-01", "2015-06-30", "Loan"),
            t("Bayer Leverkusen", "2015-08-31", "2017-07-01", "€12m"),
            t("West Ham United", "2017-07-01", "2019-09-19", "€16m"),
            t("Sevilla", "2019-09-19", "2020-01-19", "Loan"),
            t("LA Galaxy", "2020-01-20", "2022-12-31", "€8.5m"),
        ],
    },
    {
        "player_name": "Steven Gerrard",
        "normalized_name": "steven gerrard",
        "transfers": [
            t("Liverpool", "1998-11-29", "2015-05-16", None),
            t("LA Galaxy", "2015-07-07", "2016-11-24", "Free"),
        ],
    },
    {
        "player_name": "Frank Lampard",
        "normalized_name": "frank lampard",
        "transfers": [
            t("West Ham United", "1996-01-31", "2001-06-14", None),
            t("Chelsea", "2001-06-14", "2014-06-30", "€16.5m"),
            t("New York City FC", "2014-07-24", "2016-11-24", "Free"),
            t("Manchester City", "2014-08-03", "2015-01-31", "Loan"),
        ],
    },
    {
        "player_name": "Didier Drogba",
        "normalized_name": "didier drogba",
        "transfers": [
            t("Le Mans", "2001-01-01", "2002-01-01", None),
            t("Guingamp", "2002-01-01", "2003-07-01", "€3m"),
            t("Marseille", "2003-07-01", "2004-07-20", "€6m"),
            t("Chelsea", "2004-07-20", "2012-05-20", "€38m"),
            t("Shanghai Shenhua", "2012-07-01", "2013-01-01", "Free"),
            t("Galatasaray", "2013-01-26", "2014-05-21", "Free"),
            t("Chelsea", "2014-07-21", "2015-06-01", "Free"),
            t("Montreal Impact", "2015-07-27", "2018-11-01", "Free"),
        ],
    },
    {
        "player_name": "David Villa",
        "normalized_name": "david villa",
        "transfers": [
            t("Sporting Gijon", "2001-05-20", "2003-07-01", None),
            t("Zaragoza", "2003-07-01", "2005-07-01", "€12m"),
            t("Valencia", "2005-07-01", "2010-05-19", "€12m"),
            t("FC Barcelona", "2010-05-19", "2013-07-09", "€40m"),
            t("Atletico Madrid", "2013-07-09", "2014-07-01", "€5.1m"),
            t("New York City FC", "2014-07-01", "2018-12-31", "Free"),
            t("Vissel Kobe", "2018-12-01", "2019-12-07", "Free"),
        ],
    },
    {
        "player_name": "David Silva",
        "normalized_name": "david silva",
        "transfers": [
            t("Valencia", "2004-08-01", "2010-06-30", None),
            t("Celta Vigo", "2004-08-01", "2005-06-30", "Loan"),
            t("Eibar", "2005-01-01", "2005-06-30", "Loan"),
            t("Manchester City", "2010-06-30", "2020-08-01", "€28.6m"),
            t("Real Sociedad", "2020-08-17", "2023-06-30", "Free"),
        ],
    },
    {
        "player_name": "Miroslav Klose",
        "normalized_name": "miroslav klose",
        "transfers": [
            t("Kaiserslautern", "1999-07-01", "2004-06-30", None),
            t("Werder Bremen", "2004-06-30", "2007-06-30", "€5m"),
            t("Bayern Munich", "2007-06-30", "2011-06-30", "Free"),
            t("Lazio", "2011-06-30", "2016-06-30", "Free"),
        ],
    },
    {
        "player_name": "Karim Benzema",
        "normalized_name": "karim benzema",
        "transfers": [
            t("Lyon", "2005-01-15", "2009-07-09", None),
            t("Real Madrid", "2009-07-09", "2023-06-01", "€35m"),
            t("Al-Ittihad", "2023-06-06", None, "Free"),
        ],
    },
    {
        "player_name": "Hugo Lloris",
        "normalized_name": "hugo lloris",
        "transfers": [
            t("Nice", "2005-12-03", "2008-06-30", None),
            t("Lyon", "2008-06-30", "2012-08-31", "€8.5m"),
            t("Tottenham Hotspur", "2012-08-31", "2023-12-28", "€15m"),
            t("LAFC", "2024-01-01", None, "Free"),
        ],
    },
    {
        "player_name": "Raheem Sterling",
        "normalized_name": "raheem sterling",
        "transfers": [
            t("Liverpool", "2012-03-24", "2015-07-14", None),
            t("Manchester City", "2015-07-14", "2022-07-13", "€63.7m"),
            t("Chelsea", "2022-07-13", None, "€56m"),
        ],
    },
    {
        "player_name": "Riyad Mahrez",
        "normalized_name": "riyad mahrez",
        "transfers": [
            t("Le Havre", "2009-07-01", "2014-01-11", None),
            t("Leicester City", "2014-01-11", "2018-07-10", "€0.5m"),
            t("Manchester City", "2018-07-10", "2023-07-26", "€67.8m"),
            t("Al-Ahli", "2023-07-26", None, "€30m"),
        ],
    },
    {
        "player_name": "Son Heung-min",
        "normalized_name": "son heung-min",
        "transfers": [
            t("Hamburger SV", "2010-08-01", "2013-06-13", None),
            t("Bayer Leverkusen", "2013-06-13", "2015-08-28", "€10m"),
            t("Tottenham Hotspur", "2015-08-28", None, "€30m"),
        ],
    },
    {
        "player_name": "Bernardo Silva",
        "normalized_name": "bernardo silva",
        "transfers": [
            t("Benfica", "2013-07-01", "2017-06-29", None),
            t("Monaco", "2014-08-25", "2017-06-29", "Loan/€15.75m"),
            t("Manchester City", "2017-06-29", None, "€50m"),
        ],
    },
    {
        "player_name": "Phil Foden",
        "normalized_name": "phil foden",
        "transfers": [
            t("Manchester City", "2017-12-06", None, None),
        ],
    },
    {
        "player_name": "Bukayo Saka",
        "normalized_name": "bukayo saka",
        "transfers": [
            t("Arsenal", "2018-11-29", None, None),
        ],
    },
    {
        "player_name": "Vinicius Junior",
        "normalized_name": "vinicius junior",
        "transfers": [
            t("Flamengo", "2017-03-13", "2018-07-12", None),
            t("Real Madrid", "2018-07-12", None, "€45m"),
        ],
    },
    {
        "player_name": "Eduardo Camavinga",
        "normalized_name": "eduardo camavinga",
        "transfers": [
            t("Rennes", "2018-12-18", "2021-08-31", None),
            t("Real Madrid", "2021-08-31", None, "€31m"),
        ],
    },
    {
        "player_name": "Pedri",
        "normalized_name": "pedri",
        "transfers": [
            t("Las Palmas", "2018-08-01", "2020-07-01", None),
            t("FC Barcelona", "2020-07-01", None, "€5m"),
        ],
    },
    {
        "player_name": "Gavi",
        "normalized_name": "gavi",
        "transfers": [
            t("FC Barcelona", "2020-08-20", None, None),
        ],
    },
    {
        "player_name": "James Rodriguez",
        "normalized_name": "james rodriguez",
        "transfers": [
            t("Banfield", "2007-07-01", "2010-07-01", None),
            t("Porto", "2010-07-01", "2013-05-22", "€5.1m"),
            t("Monaco", "2013-05-22", "2014-07-22", "€45m"),
            t("Real Madrid", "2014-07-22", "2020-09-07", "€80m"),
            t("Bayern Munich", "2017-07-11", "2019-06-30", "Loan"),
            t("Everton", "2020-09-07", "2021-06-30", "Free"),
            t("Al-Rayyan", "2021-09-22", "2022-06-30", "Free"),
            t("Olympiacos", "2022-09-11", "2023-01-01", "Free"),
        ],
    },
    {
        "player_name": "Marcelo",
        "normalized_name": "marcelo",
        "transfers": [
            t("Fluminense", "2005-01-01", "2007-01-08", None),
            t("Real Madrid", "2007-01-08", "2022-06-30", "€6.5m"),
            t("Olympiacos", "2022-08-31", "2022-12-31", "Free"),
            t("Fluminense", "2023-03-07", None, "Free"),
        ],
    },
    {
        "player_name": "Angel Di Maria",
        "normalized_name": "angel di maria",
        "transfers": [
            t("Rosario Central", "2005-07-01", "2007-07-01", None),
            t("Benfica", "2007-07-01", "2010-06-28", "€8m"),
            t("Real Madrid", "2010-06-28", "2014-08-26", "€33m"),
            t("Manchester United", "2014-08-26", "2015-08-06", "€75m"),
            t("Paris Saint-Germain", "2015-08-06", "2022-06-30", "€63m"),
            t("Juventus", "2022-07-08", "2023-06-30", "Free"),
            t("Benfica", "2023-07-12", None, "Free"),
        ],
    },
    {
        "player_name": "Achraf Hakimi",
        "normalized_name": "achraf hakimi",
        "transfers": [
            t("Real Madrid", "2016-07-01", "2020-07-02", None),
            t("Borussia Dortmund", "2018-07-11", "2020-06-30", "Loan"),
            t("Inter Milan", "2020-07-02", "2021-07-06", "€40m"),
            t("Paris Saint-Germain", "2021-07-06", None, "€60m"),
        ],
    },
    {
        "player_name": "Raphael Varane",
        "normalized_name": "raphael varane",
        "transfers": [
            t("Lens", "2010-11-06", "2011-06-25", None),
            t("Real Madrid", "2011-06-25", "2021-08-14", "€10m"),
            t("Manchester United", "2021-08-14", "2023-06-30", "€40m"),
            t("Como 1907", "2024-08-12", None, "Free"),
        ],
    },
    {
        "player_name": "Virgil van Dijk",
        "normalized_name": "virgil van dijk",
        "transfers": [
            t("Groningen", "2010-07-01", "2013-06-12", None),
            t("Celtic", "2013-06-12", "2015-09-01", "€2.6m"),
            t("Southampton", "2015-09-01", "2018-01-01", "€14.5m"),
            t("Liverpool", "2018-01-01", None, "€84.5m"),
        ],
    },
    {
        "player_name": "Marquinhos",
        "normalized_name": "marquinhos",
        "transfers": [
            t("Corinthians", "2012-01-01", "2013-07-17", None),
            t("Roma", "2013-07-17", "2014-07-15", "€4m"),
            t("Paris Saint-Germain", "2014-07-15", None, "€31.4m"),
        ],
    },
    {
        "player_name": "Aymeric Laporte",
        "normalized_name": "aymeric laporte",
        "transfers": [
            t("Athletic Bilbao", "2012-08-19", "2018-01-30", None),
            t("Manchester City", "2018-01-30", "2023-08-08", "€65m"),
            t("Al-Nassr", "2023-08-08", None, "€27.5m"),
        ],
    },
    {
        "player_name": "Matthijs de Ligt",
        "normalized_name": "matthijs de ligt",
        "transfers": [
            t("Ajax", "2017-09-20", "2019-07-18", None),
            t("Juventus", "2019-07-18", "2022-07-19", "€85.5m"),
            t("Bayern Munich", "2022-07-19", "2024-08-13", "€67m"),
            t("Manchester United", "2024-08-13", None, "€45m"),
        ],
    },
    {
        "player_name": "Frenkie de Jong",
        "normalized_name": "frenkie de jong",
        "transfers": [
            t("Willem II", "2015-07-01", "2016-07-01", None),
            t("Ajax", "2016-07-01", "2019-07-01", "€1m"),
            t("FC Barcelona", "2019-07-01", None, "€86m"),
        ],
    },
    {
        "player_name": "Jadon Sancho",
        "normalized_name": "jadon sancho",
        "transfers": [
            t("Manchester City", "2015-03-06", "2017-08-31", None),
            t("Borussia Dortmund", "2017-08-31", "2021-07-23", "€7.84m"),
            t("Manchester United", "2021-07-23", None, "€85m"),
        ],
    },
    {
        "player_name": "Keylor Navas",
        "normalized_name": "keylor navas",
        "transfers": [
            t("Saprissa", "2005-01-01", "2010-07-01", None),
            t("Albacete", "2010-07-01", "2011-07-01", "€0.3m"),
            t("Levante", "2011-07-01", "2014-08-02", "€0.5m"),
            t("Real Madrid", "2014-08-02", "2019-09-02", "€10m"),
            t("Paris Saint-Germain", "2019-09-02", "2024-06-30", "€15m"),
        ],
    },
    {
        "player_name": "Jan Oblak",
        "normalized_name": "jan oblak",
        "transfers": [
            t("Olimpija Ljubljana", "2009-07-01", "2010-07-01", None),
            t("Benfica", "2010-07-01", "2014-07-16", "€4m"),
            t("Atletico Madrid", "2014-07-16", None, "€16m"),
        ],
    },
    {
        "player_name": "Marc-Andre ter Stegen",
        "normalized_name": "marc-andre ter stegen",
        "transfers": [
            t("Borussia Monchengladbach", "2009-08-01", "2014-05-22", None),
            t("FC Barcelona", "2014-05-22", None, "€12m"),
        ],
    },
    {
        "player_name": "Manuel Neuer",
        "normalized_name": "manuel neuer",
        "transfers": [
            t("Schalke 04", "2004-08-01", "2011-06-01", None),
            t("Bayern Munich", "2011-06-01", None, "€30m"),
        ],
    },
    {
        "player_name": "Thomas Muller",
        "normalized_name": "thomas muller",
        "transfers": [
            t("Bayern Munich", "2008-08-15", None, None),
        ],
    },
    {
        "player_name": "Mario Mandzukic",
        "normalized_name": "mario mandzukic",
        "transfers": [
            t("NK Marsonia", "2003-01-01", "2004-07-01", None),
            t("NK Zagreb", "2004-07-01", "2007-07-01", "€0.3m"),
            t("Dinamo Zagreb", "2007-07-01", "2010-06-01", "€1.6m"),
            t("VfL Wolfsburg", "2010-06-01", "2012-06-30", "€7m"),
            t("Bayern Munich", "2012-06-30", "2014-07-01", "€13m"),
            t("Atletico Madrid", "2014-07-01", "2015-06-22", "€22m"),
            t("Juventus", "2015-06-22", "2019-12-24", "€19m"),
            t("AC Milan", "2020-01-17", "2020-07-01", "Free"),
        ],
    },
    {
        "player_name": "Mario Balotelli",
        "normalized_name": "mario balotelli",
        "transfers": [
            t("Inter Milan", "2007-04-18", "2010-08-13", None),
            t("Manchester City", "2010-08-13", "2013-01-30", "€29.5m"),
            t("AC Milan", "2013-01-30", "2014-08-25", "€20m"),
            t("Liverpool", "2014-08-25", "2016-08-31", "€20m"),
            t("AC Milan", "2015-09-01", "2016-01-01", "Loan"),
            t("Nice", "2016-08-31", "2019-01-23", "Free"),
            t("Marseille", "2019-01-23", "2019-06-30", "Free"),
            t("Brescia", "2019-08-18", "2020-06-30", "Free"),
            t("Monza", "2020-12-07", "2021-06-30", "Free"),
            t("Adana Demirspor", "2021-07-07", "2023-06-30", "Free"),
        ],
    },
    {
        "player_name": "Robin van Persie",
        "normalized_name": "robin van persie",
        "transfers": [
            t("Feyenoord", "2001-08-18", "2004-05-17", None),
            t("Arsenal", "2004-05-17", "2012-08-17", "€3m"),
            t("Manchester United", "2012-08-17", "2015-07-07", "€30m"),
            t("Fenerbahce", "2015-07-14", "2018-01-25", "€5.5m"),
            t("Feyenoord", "2018-01-27", "2019-05-12", "Free"),
        ],
    },
    {
        "player_name": "Arjen Robben",
        "normalized_name": "arjen robben",
        "transfers": [
            t("Groningen", "2000-07-01", "2002-07-01", None),
            t("PSV Eindhoven", "2002-07-01", "2004-07-01", "€4.1m"),
            t("Chelsea", "2004-07-01", "2007-08-22", "€18m"),
            t("Real Madrid", "2007-08-22", "2009-08-28", "€36m"),
            t("Bayern Munich", "2009-08-28", "2019-06-30", "€25m"),
            t("Groningen", "2020-06-27", "2021-07-15", "Free"),
        ],
    },
    {
        "player_name": "Samuel Eto'o",
        "normalized_name": "samuel eto'o",
        "transfers": [
            t("Real Madrid", "1997-01-01", "2004-08-24", None),
            t("Mallorca", "2000-01-01", "2004-08-24", "Loan"),
            t("FC Barcelona", "2004-08-24", "2009-07-27", "€24m"),
            t("Inter Milan", "2009-07-27", "2011-08-24", "€20m"),
            t("Anzhi Makhachkala", "2011-08-24", "2013-08-29", "€30m"),
            t("Chelsea", "2013-08-29", "2014-06-30", "Free"),
            t("Everton", "2014-08-27", "2015-01-19", "Free"),
            t("Sampdoria", "2015-01-19", "2015-06-30", "Free"),
            t("Antalyaspor", "2015-06-30", "2018-06-30", "Free"),
        ],
    },
    {
        "player_name": "Thierry Henry",
        "normalized_name": "thierry henry",
        "transfers": [
            t("Monaco", "1994-08-31", "1999-08-03", None),
            t("Juventus", "1999-01-18", "1999-08-03", "€10.5m"),
            t("Arsenal", "1999-08-03", "2007-06-25", "€14m"),
            t("FC Barcelona", "2007-06-25", "2010-07-14", "€24m"),
            t("New York Red Bulls", "2010-07-14", "2014-12-01", "Free"),
            t("Arsenal", "2012-01-02", "2012-02-17", "Loan"),
        ],
    },
    {
        "player_name": "Ronaldinho",
        "normalized_name": "ronaldinho",
        "transfers": [
            t("Gremio", "1998-07-01", "2001-07-21", None),
            t("Paris Saint-Germain", "2001-07-21", "2003-07-19", "€5m"),
            t("FC Barcelona", "2003-07-19", "2008-07-16", "€32.25m"),
            t("AC Milan", "2008-07-16", "2011-01-06", "€21m"),
            t("Flamengo", "2011-01-06", "2012-06-01", "Free"),
            t("Atletico Mineiro", "2012-06-04", "2014-07-28", "Free"),
        ],
    },
    {
        "player_name": "Ronaldo Nazario",
        "normalized_name": "ronaldo nazario",
        "transfers": [
            t("Cruzeiro", "1993-07-01", "1994-08-01", None),
            t("PSV Eindhoven", "1994-08-01", "1996-07-01", "€6m"),
            t("FC Barcelona", "1996-07-01", "1997-07-01", "€19.5m"),
            t("Inter Milan", "1997-07-01", "2002-08-31", "€28m"),
            t("Real Madrid", "2002-08-31", "2007-01-22", "€45m"),
            t("AC Milan", "2007-01-22", "2008-02-12", "€7.5m"),
            t("Corinthians", "2009-01-14", "2011-02-14", "Free"),
        ],
    },
    {
        "player_name": "Zinedine Zidane",
        "normalized_name": "zinedine zidane",
        "transfers": [
            t("Cannes", "1988-08-01", "1992-05-18", None),
            t("Bordeaux", "1992-05-18", "1996-07-01", "€3.5m"),
            t("Juventus", "1996-07-01", "2001-07-09", "€3.5m"),
            t("Real Madrid", "2001-07-09", "2006-05-07", "€77.5m"),
        ],
    },
    {
        "player_name": "Diego Forlan",
        "normalized_name": "diego forlan",
        "transfers": [
            t("Independiente", "1997-07-01", "2002-01-22", None),
            t("Manchester United", "2002-01-22", "2004-08-24", "€8.7m"),
            t("Villarreal", "2004-08-24", "2007-07-04", "€21m"),
            t("Atletico Madrid", "2007-07-04", "2011-07-01", "€21m"),
            t("Inter Milan", "2011-07-01", "2012-07-01", "Free"),
            t("Internacional", "2012-07-01", "2014-06-30", "Free"),
        ],
    },
    {
        "player_name": "Mesut Ozil",
        "normalized_name": "mesut ozil",
        "transfers": [
            t("Schalke 04", "2006-08-01", "2008-07-01", None),
            t("Werder Bremen", "2008-07-01", "2010-08-17", "€5m"),
            t("Real Madrid", "2010-08-17", "2013-09-02", "€18m"),
            t("Arsenal", "2013-09-02", "2021-01-18", "€47m"),
            t("Fenerbahce", "2021-01-18", "2022-07-01", "Free"),
        ],
    },
    {
        "player_name": "Ivan Perisic",
        "normalized_name": "ivan perisic",
        "transfers": [
            t("Sochaux", "2006-07-01", "2009-07-01", None),
            t("Roeselare", "2009-07-01", "2011-01-01", "€0.8m"),
            t("Club Brugge", "2011-01-01", "2011-07-01", "€1.5m"),
            t("Borussia Dortmund", "2011-07-01", "2013-01-01", "€5.5m"),
            t("VfL Wolfsburg", "2013-01-01", "2015-08-25", "€8m"),
            t("Inter Milan", "2015-08-25", "2022-06-30", "€16m"),
            t("Tottenham Hotspur", "2022-07-01", "2023-06-30", "Free"),
            t("Hajduk Split", "2023-09-01", None, "Free"),
        ],
    },
    {
        "player_name": "Henrikh Mkhitaryan",
        "normalized_name": "henrikh mkhitaryan",
        "transfers": [
            t("Pyunik", "2006-07-01", "2009-08-01", None),
            t("Metalurh Donetsk", "2009-08-01", "2010-08-01", "€0.3m"),
            t("Shakhtar Donetsk", "2010-08-01", "2013-07-06", "€6m"),
            t("Borussia Dortmund", "2013-07-06", "2016-07-06", "€27.5m"),
            t("Manchester United", "2016-07-06", "2018-01-22", "€42m"),
            t("Arsenal", "2018-01-22", "2019-09-02", "Swap"),
            t("Roma", "2019-09-02", "2021-08-31", "Loan/Free"),
            t("Inter Milan", "2022-07-01", None, "Free"),
        ],
    },
]
# fmt: on


def resolve_player_ids(
    data: list[dict], name_to_id: dict[str, int]
) -> list[dict]:
    """Assign player_id from players_db or use negative IDs."""
    next_negative = -1
    used_ids: set[int] = set()

    for entry in data:
        norm = entry.pop("normalized_name", entry["player_name"].lower())
        pid = name_to_id.get(norm)
        if pid is not None and pid not in used_ids:
            entry["player_id"] = pid
        else:
            entry["player_id"] = next_negative
            next_negative -= 1
        used_ids.add(entry["player_id"])

    return data


def main() -> None:
    print("Loading player database...")
    name_to_id = load_player_ids()
    print(f"  Loaded {len(name_to_id):,} player name->id mappings")

    print(f"Processing {len(TRANSFER_DATA)} players...")
    records = resolve_player_ids(TRANSFER_DATA, name_to_id)

    # Sort by player_id (positive first, then negative)
    records.sort(key=lambda r: (r["player_id"] < 0, abs(r["player_id"])))

    # Write JSON
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    file_size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"Wrote {len(records)} players to {OUTPUT_FILE}")
    print(f"File size: {file_size_kb:.1f} KB")

    # Summary stats
    total_transfers = sum(len(r["transfers"]) for r in records)
    avg_transfers = total_transfers / len(records)
    print(f"Total transfers: {total_transfers}")
    print(f"Average transfers per player: {avg_transfers:.1f}")
    print("ETL complete.")


if __name__ == "__main__":
    main()
