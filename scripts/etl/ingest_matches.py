"""
ETL script to generate matches_db.json with 50 iconic historical matches.
Cross-references player IDs from players_db_v1.json where possible;
uses negative IDs for players not in the database.
"""

import json
from pathlib import Path
from unidecode import unidecode

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
PLAYERS_DB = ROOT_DIR / "data" / "players_db_v1.json"
OUTPUT_FILE = ROOT_DIR / "data" / "matches_db.json"


def normalize_name(name: str) -> str:
    """Remove diacritics and lowercase a player name."""
    if not isinstance(name, str):
        return ""
    return unidecode(name).lower().strip()


def build_player_lookup() -> dict[str, int]:
    """Load players_db_v1.json and return {normalized_name: id}."""
    with open(PLAYERS_DB, "r", encoding="utf-8") as f:
        players = json.load(f)
    return {p["normalized_name"]: p["id"] for p in players}


def resolve_ids(names: list[str], lookup: dict[str, int], neg_counter: list[int]) -> list[int]:
    """Resolve player names to IDs. Uses negative IDs for unknown players."""
    ids = []
    for name in names:
        norm = normalize_name(name)
        if norm in lookup:
            ids.append(lookup[norm])
        else:
            ids.append(neg_counter[0])
            neg_counter[0] -= 1
    return ids


# ──────────────────────────────────────────────────────────────────────
# 50 iconic matches with real historical starting XIs
# ──────────────────────────────────────────────────────────────────────

MATCHES_RAW = [
    # ═══════════════════════════════════════════════════════════════════
    # UCL FINALS 2005-2024 (20 matches)
    # ═══════════════════════════════════════════════════════════════════
    {
        "match_id": "ucl-final-2005",
        "date": "2005-05-25",
        "competition": "UEFA Champions League Final",
        "season": "2004-05",
        "opponent_a": "Liverpool",
        "opponent_b": "AC Milan",
        "score": "3-3 (3-2 pen)",
        "lineup_a_names": [
            "Jerzy Dudek", "Steve Finnan", "Jamie Carragher", "Sami Hyypia",
            "Djimi Traore", "Steven Gerrard", "Xabi Alonso", "Dietmar Hamann",
            "Luis Garcia", "Milan Baros", "Djibril Cisse"
        ],
        "lineup_b_names": [
            "Dida", "Cafu", "Alessandro Nesta", "Jaap Stam",
            "Paolo Maldini", "Gennaro Gattuso", "Andrea Pirlo", "Clarence Seedorf",
            "Kaka", "Andriy Shevchenko", "Hernan Crespo"
        ],
    },
    {
        "match_id": "ucl-final-2006",
        "date": "2006-05-17",
        "competition": "UEFA Champions League Final",
        "season": "2005-06",
        "opponent_a": "Barcelona",
        "opponent_b": "Arsenal",
        "score": "2-1",
        "lineup_a_names": [
            "Victor Valdes", "Oleguer", "Carles Puyol", "Rafael Marquez",
            "Giovanni van Bronckhorst", "Edmilson", "Mark van Bommel", "Deco",
            "Ludovic Giuly", "Samuel Eto'o", "Ronaldinho"
        ],
        "lineup_b_names": [
            "Jens Lehmann", "Emmanuel Eboue", "Kolo Toure", "Sol Campbell",
            "Ashley Cole", "Gilberto Silva", "Cesc Fabregas", "Alexander Hleb",
            "Fredrik Ljungberg", "Thierry Henry", "Robert Pires"
        ],
    },
    {
        "match_id": "ucl-final-2007",
        "date": "2007-05-23",
        "competition": "UEFA Champions League Final",
        "season": "2006-07",
        "opponent_a": "AC Milan",
        "opponent_b": "Liverpool",
        "score": "2-1",
        "lineup_a_names": [
            "Dida", "Massimo Oddo", "Alessandro Nesta", "Paolo Maldini",
            "Marek Jankulovski", "Gennaro Gattuso", "Andrea Pirlo", "Massimo Ambrosini",
            "Clarence Seedorf", "Kaka", "Filippo Inzaghi"
        ],
        "lineup_b_names": [
            "Pepe Reina", "Steve Finnan", "Jamie Carragher", "Daniel Agger",
            "John Arne Riise", "Steven Gerrard", "Xabi Alonso", "Javier Mascherano",
            "Boudewijn Zenden", "Dirk Kuyt", "Craig Bellamy"
        ],
    },
    {
        "match_id": "ucl-final-2008",
        "date": "2008-05-21",
        "competition": "UEFA Champions League Final",
        "season": "2007-08",
        "opponent_a": "Manchester United",
        "opponent_b": "Chelsea",
        "score": "1-1 (6-5 pen)",
        "lineup_a_names": [
            "Edwin van der Sar", "Wes Brown", "Rio Ferdinand", "Nemanja Vidic",
            "Patrice Evra", "Owen Hargreaves", "Michael Carrick", "Paul Scholes",
            "Cristiano Ronaldo", "Wayne Rooney", "Ryan Giggs"
        ],
        "lineup_b_names": [
            "Petr Cech", "Michael Essien", "Ricardo Carvalho", "John Terry",
            "Ashley Cole", "Claude Makelele", "Michael Ballack", "Frank Lampard",
            "Joe Cole", "Didier Drogba", "Florent Malouda"
        ],
    },
    {
        "match_id": "ucl-final-2009",
        "date": "2009-05-27",
        "competition": "UEFA Champions League Final",
        "season": "2008-09",
        "opponent_a": "Barcelona",
        "opponent_b": "Manchester United",
        "score": "2-0",
        "lineup_a_names": [
            "Victor Valdes", "Dani Alves", "Gerard Pique", "Carles Puyol",
            "Sylvinho", "Xavi", "Sergio Busquets", "Andres Iniesta",
            "Lionel Messi", "Samuel Eto'o", "Thierry Henry"
        ],
        "lineup_b_names": [
            "Edwin van der Sar", "John O'Shea", "Rio Ferdinand", "Nemanja Vidic",
            "Patrice Evra", "Cristiano Ronaldo", "Michael Carrick", "Anderson",
            "Park Ji-Sung", "Wayne Rooney", "Carlos Tevez"
        ],
    },
    {
        "match_id": "ucl-final-2010",
        "date": "2010-05-22",
        "competition": "UEFA Champions League Final",
        "season": "2009-10",
        "opponent_a": "Inter Milan",
        "opponent_b": "Bayern Munich",
        "score": "2-0",
        "lineup_a_names": [
            "Julio Cesar", "Maicon", "Lucio", "Walter Samuel",
            "Javier Zanetti", "Esteban Cambiasso", "Dejan Stankovic", "Wesley Sneijder",
            "Samuel Eto'o", "Diego Milito", "Goran Pandev"
        ],
        "lineup_b_names": [
            "Hans-Jorg Butt", "Philipp Lahm", "Martin Demichelis", "Daniel van Buyten",
            "Holger Badstuber", "Bastian Schweinsteiger", "Mark van Bommel", "Arjen Robben",
            "Thomas Muller", "Ivica Olic", "Franck Ribery"
        ],
    },
    {
        "match_id": "ucl-final-2011",
        "date": "2011-05-28",
        "competition": "UEFA Champions League Final",
        "season": "2010-11",
        "opponent_a": "Barcelona",
        "opponent_b": "Manchester United",
        "score": "3-1",
        "lineup_a_names": [
            "Victor Valdes", "Dani Alves", "Gerard Pique", "Javier Mascherano",
            "Eric Abidal", "Sergio Busquets", "Xavi", "Andres Iniesta",
            "Lionel Messi", "David Villa", "Pedro"
        ],
        "lineup_b_names": [
            "Edwin van der Sar", "Fabio", "Rio Ferdinand", "Nemanja Vidic",
            "Patrice Evra", "Antonio Valencia", "Michael Carrick", "Ryan Giggs",
            "Park Ji-Sung", "Wayne Rooney", "Javier Hernandez"
        ],
    },
    {
        "match_id": "ucl-final-2012",
        "date": "2012-05-19",
        "competition": "UEFA Champions League Final",
        "season": "2011-12",
        "opponent_a": "Bayern Munich",
        "opponent_b": "Chelsea",
        "score": "1-1 (3-4 pen)",
        "lineup_a_names": [
            "Manuel Neuer", "Philipp Lahm", "Jerome Boateng", "Anatoliy Tymoshchuk",
            "David Alaba", "Bastian Schweinsteiger", "Toni Kroos", "Arjen Robben",
            "Thomas Muller", "Mario Gomez", "Franck Ribery"
        ],
        "lineup_b_names": [
            "Petr Cech", "Jose Bosingwa", "David Luiz", "Gary Cahill",
            "Ashley Cole", "John Obi Mikel", "Frank Lampard", "Salomon Kalou",
            "Juan Mata", "Didier Drogba", "Ryan Bertrand"
        ],
    },
    {
        "match_id": "ucl-final-2013",
        "date": "2013-05-25",
        "competition": "UEFA Champions League Final",
        "season": "2012-13",
        "opponent_a": "Bayern Munich",
        "opponent_b": "Borussia Dortmund",
        "score": "2-1",
        "lineup_a_names": [
            "Manuel Neuer", "Philipp Lahm", "Jerome Boateng", "Dante",
            "David Alaba", "Bastian Schweinsteiger", "Javi Martinez", "Arjen Robben",
            "Thomas Muller", "Mario Mandzukic", "Franck Ribery"
        ],
        "lineup_b_names": [
            "Roman Weidenfeller", "Lukasz Piszczek", "Neven Subotic", "Mats Hummels",
            "Marcel Schmelzer", "Sven Bender", "Ilkay Gundogan", "Jakub Blaszczykowski",
            "Marco Reus", "Robert Lewandowski", "Kevin Grosskreutz"
        ],
    },
    {
        "match_id": "ucl-final-2014",
        "date": "2014-05-24",
        "competition": "UEFA Champions League Final",
        "season": "2013-14",
        "opponent_a": "Real Madrid",
        "opponent_b": "Atletico Madrid",
        "score": "4-1 (aet)",
        "lineup_a_names": [
            "Iker Casillas", "Dani Carvajal", "Sergio Ramos", "Pepe",
            "Fabio Coentrao", "Luka Modric", "Sami Khedira", "Angel Di Maria",
            "Gareth Bale", "Karim Benzema", "Cristiano Ronaldo"
        ],
        "lineup_b_names": [
            "Thibaut Courtois", "Juanfran", "Diego Godin", "Miranda",
            "Filipe Luis", "Gabi", "Tiago", "Raul Garcia",
            "Koke", "Diego Costa", "David Villa"
        ],
    },
    {
        "match_id": "ucl-final-2015",
        "date": "2015-06-06",
        "competition": "UEFA Champions League Final",
        "season": "2014-15",
        "opponent_a": "Barcelona",
        "opponent_b": "Juventus",
        "score": "3-1",
        "lineup_a_names": [
            "Marc-Andre ter Stegen", "Dani Alves", "Gerard Pique", "Javier Mascherano",
            "Jordi Alba", "Sergio Busquets", "Andres Iniesta", "Ivan Rakitic",
            "Lionel Messi", "Neymar", "Luis Suarez"
        ],
        "lineup_b_names": [
            "Gianluigi Buffon", "Stephan Lichtsteiner", "Andrea Barzagli", "Leonardo Bonucci",
            "Giorgio Chiellini", "Arturo Vidal", "Andrea Pirlo", "Claudio Marchisio",
            "Carlos Tevez", "Alvaro Morata", "Patrice Evra"
        ],
    },
    {
        "match_id": "ucl-final-2016",
        "date": "2016-05-28",
        "competition": "UEFA Champions League Final",
        "season": "2015-16",
        "opponent_a": "Real Madrid",
        "opponent_b": "Atletico Madrid",
        "score": "1-1 (5-3 pen)",
        "lineup_a_names": [
            "Keylor Navas", "Dani Carvajal", "Sergio Ramos", "Pepe",
            "Marcelo", "Luka Modric", "Toni Kroos", "Casemiro",
            "Gareth Bale", "Karim Benzema", "Cristiano Ronaldo"
        ],
        "lineup_b_names": [
            "Jan Oblak", "Juanfran", "Diego Godin", "Jose Gimenez",
            "Filipe Luis", "Gabi", "Augusto Fernandez", "Koke",
            "Saul Niguez", "Antoine Griezmann", "Fernando Torres"
        ],
    },
    {
        "match_id": "ucl-final-2017",
        "date": "2017-06-03",
        "competition": "UEFA Champions League Final",
        "season": "2016-17",
        "opponent_a": "Real Madrid",
        "opponent_b": "Juventus",
        "score": "4-1",
        "lineup_a_names": [
            "Keylor Navas", "Dani Carvajal", "Sergio Ramos", "Raphael Varane",
            "Marcelo", "Luka Modric", "Toni Kroos", "Casemiro",
            "Isco", "Karim Benzema", "Cristiano Ronaldo"
        ],
        "lineup_b_names": [
            "Gianluigi Buffon", "Dani Alves", "Leonardo Bonucci", "Giorgio Chiellini",
            "Alex Sandro", "Sami Khedira", "Miralem Pjanic", "Mario Mandzukic",
            "Juan Cuadrado", "Gonzalo Higuain", "Cristiano Ronaldo"
        ],
    },
    {
        "match_id": "ucl-final-2018",
        "date": "2018-05-26",
        "competition": "UEFA Champions League Final",
        "season": "2017-18",
        "opponent_a": "Real Madrid",
        "opponent_b": "Liverpool",
        "score": "3-1",
        "lineup_a_names": [
            "Keylor Navas", "Dani Carvajal", "Sergio Ramos", "Raphael Varane",
            "Marcelo", "Luka Modric", "Toni Kroos", "Casemiro",
            "Isco", "Karim Benzema", "Cristiano Ronaldo"
        ],
        "lineup_b_names": [
            "Loris Karius", "Trent Alexander-Arnold", "Dejan Lovren", "Virgil van Dijk",
            "Andrew Robertson", "Jordan Henderson", "James Milner", "Georginio Wijnaldum",
            "Mohamed Salah", "Roberto Firmino", "Sadio Mane"
        ],
    },
    {
        "match_id": "ucl-final-2019",
        "date": "2019-06-01",
        "competition": "UEFA Champions League Final",
        "season": "2018-19",
        "opponent_a": "Liverpool",
        "opponent_b": "Tottenham Hotspur",
        "score": "2-0",
        "lineup_a_names": [
            "Alisson", "Trent Alexander-Arnold", "Joel Matip", "Virgil van Dijk",
            "Andrew Robertson", "Fabinho", "Jordan Henderson", "Georginio Wijnaldum",
            "Mohamed Salah", "Roberto Firmino", "Sadio Mane"
        ],
        "lineup_b_names": [
            "Hugo Lloris", "Kieran Trippier", "Toby Alderweireld", "Jan Vertonghen",
            "Danny Rose", "Moussa Sissoko", "Harry Winks", "Dele Alli",
            "Christian Eriksen", "Harry Kane", "Son Heung-Min"
        ],
    },
    {
        "match_id": "ucl-final-2020",
        "date": "2020-08-23",
        "competition": "UEFA Champions League Final",
        "season": "2019-20",
        "opponent_a": "Bayern Munich",
        "opponent_b": "Paris Saint-Germain",
        "score": "1-0",
        "lineup_a_names": [
            "Manuel Neuer", "Joshua Kimmich", "Jerome Boateng", "David Alaba",
            "Alphonso Davies", "Leon Goretzka", "Thiago Alcantara", "Serge Gnabry",
            "Thomas Muller", "Robert Lewandowski", "Ivan Perisic"
        ],
        "lineup_b_names": [
            "Keylor Navas", "Thilo Kehrer", "Marquinhos", "Presnel Kimpembe",
            "Juan Bernat", "Ander Herrera", "Marco Verratti", "Angel Di Maria",
            "Neymar", "Kylian Mbappe", "Pablo Sarabia"
        ],
    },
    {
        "match_id": "ucl-final-2021",
        "date": "2021-05-29",
        "competition": "UEFA Champions League Final",
        "season": "2020-21",
        "opponent_a": "Manchester City",
        "opponent_b": "Chelsea",
        "score": "0-1",
        "lineup_a_names": [
            "Ederson", "Kyle Walker", "John Stones", "Ruben Dias",
            "Oleksandr Zinchenko", "Ilkay Gundogan", "Bernardo Silva", "Riyad Mahrez",
            "Kevin De Bruyne", "Phil Foden", "Raheem Sterling"
        ],
        "lineup_b_names": [
            "Edouard Mendy", "Cesar Azpilicueta", "Thiago Silva", "Antonio Rudiger",
            "Reece James", "Jorginho", "N'Golo Kante", "Ben Chilwell",
            "Mason Mount", "Kai Havertz", "Timo Werner"
        ],
    },
    {
        "match_id": "ucl-final-2022",
        "date": "2022-05-28",
        "competition": "UEFA Champions League Final",
        "season": "2021-22",
        "opponent_a": "Liverpool",
        "opponent_b": "Real Madrid",
        "score": "0-1",
        "lineup_a_names": [
            "Alisson", "Trent Alexander-Arnold", "Ibrahima Konate", "Virgil van Dijk",
            "Andrew Robertson", "Fabinho", "Jordan Henderson", "Thiago Alcantara",
            "Mohamed Salah", "Sadio Mane", "Luis Diaz"
        ],
        "lineup_b_names": [
            "Thibaut Courtois", "Dani Carvajal", "Eder Militao", "David Alaba",
            "Ferland Mendy", "Luka Modric", "Toni Kroos", "Casemiro",
            "Federico Valverde", "Karim Benzema", "Vinicius Junior"
        ],
    },
    {
        "match_id": "ucl-final-2023",
        "date": "2023-06-10",
        "competition": "UEFA Champions League Final",
        "season": "2022-23",
        "opponent_a": "Manchester City",
        "opponent_b": "Inter Milan",
        "score": "1-0",
        "lineup_a_names": [
            "Ederson", "Kyle Walker", "John Stones", "Ruben Dias",
            "Nathan Ake", "Rodri", "Bernardo Silva", "Kevin De Bruyne",
            "Jack Grealish", "Erling Haaland", "Phil Foden"
        ],
        "lineup_b_names": [
            "Andre Onana", "Matteo Darmian", "Francesco Acerbi", "Alessandro Bastoni",
            "Denzel Dumfries", "Nicolo Barella", "Marcelo Brozovic", "Hakan Calhanoglu",
            "Federico Dimarco", "Edin Dzeko", "Lautaro Martinez"
        ],
    },
    {
        "match_id": "ucl-final-2024",
        "date": "2024-06-01",
        "competition": "UEFA Champions League Final",
        "season": "2023-24",
        "opponent_a": "Borussia Dortmund",
        "opponent_b": "Real Madrid",
        "score": "0-2",
        "lineup_a_names": [
            "Gregor Kobel", "Julian Ryerson", "Mats Hummels", "Nico Schlotterbeck",
            "Ian Maatsen", "Emre Can", "Marcel Sabitzer", "Julian Brandt",
            "Jadon Sancho", "Niclas Fullkrug", "Karim Adeyemi"
        ],
        "lineup_b_names": [
            "Thibaut Courtois", "Dani Carvajal", "Antonio Rudiger", "Nacho",
            "Ferland Mendy", "Toni Kroos", "Eduardo Camavinga", "Federico Valverde",
            "Rodrygo", "Jude Bellingham", "Vinicius Junior"
        ],
    },

    # ═══════════════════════════════════════════════════════════════════
    # WORLD CUP FINALS 2006-2022 (5 matches)
    # ═══════════════════════════════════════════════════════════════════
    {
        "match_id": "wc-final-2006",
        "date": "2006-07-09",
        "competition": "FIFA World Cup Final",
        "season": "2006",
        "opponent_a": "Italy",
        "opponent_b": "France",
        "score": "1-1 (5-3 pen)",
        "lineup_a_names": [
            "Gianluigi Buffon", "Gianluca Zambrotta", "Fabio Cannavaro", "Marco Materazzi",
            "Fabio Grosso", "Mauro Camoranesi", "Andrea Pirlo", "Gennaro Gattuso",
            "Simone Perrotta", "Francesco Totti", "Luca Toni"
        ],
        "lineup_b_names": [
            "Fabien Barthez", "Willy Sagnol", "Lilian Thuram", "William Gallas",
            "Eric Abidal", "Claude Makelele", "Patrick Vieira", "Franck Ribery",
            "Zinedine Zidane", "Florent Malouda", "Thierry Henry"
        ],
    },
    {
        "match_id": "wc-final-2010",
        "date": "2010-07-11",
        "competition": "FIFA World Cup Final",
        "season": "2010",
        "opponent_a": "Spain",
        "opponent_b": "Netherlands",
        "score": "1-0 (aet)",
        "lineup_a_names": [
            "Iker Casillas", "Sergio Ramos", "Gerard Pique", "Carles Puyol",
            "Joan Capdevila", "Xabi Alonso", "Sergio Busquets", "Xavi",
            "Andres Iniesta", "David Villa", "Pedro"
        ],
        "lineup_b_names": [
            "Maarten Stekelenburg", "Gregory van der Wiel", "John Heitinga", "Joris Mathijsen",
            "Giovanni van Bronckhorst", "Mark van Bommel", "Nigel de Jong", "Wesley Sneijder",
            "Arjen Robben", "Dirk Kuyt", "Robin van Persie"
        ],
    },
    {
        "match_id": "wc-final-2014",
        "date": "2014-07-13",
        "competition": "FIFA World Cup Final",
        "season": "2014",
        "opponent_a": "Germany",
        "opponent_b": "Argentina",
        "score": "1-0 (aet)",
        "lineup_a_names": [
            "Manuel Neuer", "Philipp Lahm", "Mats Hummels", "Jerome Boateng",
            "Benedikt Howedes", "Bastian Schweinsteiger", "Sami Khedira", "Toni Kroos",
            "Mesut Ozil", "Thomas Muller", "Miroslav Klose"
        ],
        "lineup_b_names": [
            "Sergio Romero", "Pablo Zabaleta", "Martin Demichelis", "Ezequiel Garay",
            "Marcos Rojo", "Javier Mascherano", "Lucas Biglia", "Enzo Perez",
            "Lionel Messi", "Gonzalo Higuain", "Ezequiel Lavezzi"
        ],
    },
    {
        "match_id": "wc-final-2018",
        "date": "2018-07-15",
        "competition": "FIFA World Cup Final",
        "season": "2018",
        "opponent_a": "France",
        "opponent_b": "Croatia",
        "score": "4-2",
        "lineup_a_names": [
            "Hugo Lloris", "Benjamin Pavard", "Raphael Varane", "Samuel Umtiti",
            "Lucas Hernandez", "N'Golo Kante", "Paul Pogba", "Blaise Matuidi",
            "Kylian Mbappe", "Antoine Griezmann", "Olivier Giroud"
        ],
        "lineup_b_names": [
            "Danijel Subasic", "Sime Vrsaljko", "Dejan Lovren", "Domagoj Vida",
            "Ivan Strinic", "Luka Modric", "Ivan Rakitic", "Marcelo Brozovic",
            "Ante Rebic", "Mario Mandzukic", "Ivan Perisic"
        ],
    },
    {
        "match_id": "wc-final-2022",
        "date": "2022-12-18",
        "competition": "FIFA World Cup Final",
        "season": "2022",
        "opponent_a": "Argentina",
        "opponent_b": "France",
        "score": "3-3 (4-2 pen)",
        "lineup_a_names": [
            "Emiliano Martinez", "Nahuel Molina", "Cristian Romero", "Nicolas Otamendi",
            "Nicolas Tagliafico", "Rodrigo De Paul", "Enzo Fernandez", "Alexis Mac Allister",
            "Lionel Messi", "Julian Alvarez", "Angel Di Maria"
        ],
        "lineup_b_names": [
            "Hugo Lloris", "Jules Kounde", "Raphael Varane", "Dayot Upamecano",
            "Theo Hernandez", "Aurelien Tchouameni", "Adrien Rabiot", "Ousmane Dembele",
            "Kylian Mbappe", "Antoine Griezmann", "Olivier Giroud"
        ],
    },

    # ═══════════════════════════════════════════════════════════════════
    # MEMORABLE UCL SEMI-FINALS (~10 matches)
    # ═══════════════════════════════════════════════════════════════════
    {
        "match_id": "ucl-sf-2009-chelsea-barca",
        "date": "2009-05-06",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2008-09",
        "opponent_a": "Chelsea",
        "opponent_b": "Barcelona",
        "score": "1-1 (agg 1-2)",
        "lineup_a_names": [
            "Petr Cech", "Jose Bosingwa", "Alex", "John Terry",
            "Ashley Cole", "Michael Essien", "Michael Ballack", "Frank Lampard",
            "Florent Malouda", "Didier Drogba", "Nicolas Anelka"
        ],
        "lineup_b_names": [
            "Victor Valdes", "Dani Alves", "Gerard Pique", "Carles Puyol",
            "Eric Abidal", "Xavi", "Sergio Busquets", "Yaya Toure",
            "Lionel Messi", "Samuel Eto'o", "Thierry Henry"
        ],
    },
    {
        "match_id": "ucl-sf-2012-chelsea-barca",
        "date": "2012-04-24",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2011-12",
        "opponent_a": "Barcelona",
        "opponent_b": "Chelsea",
        "score": "2-2 (agg 2-3)",
        "lineup_a_names": [
            "Victor Valdes", "Dani Alves", "Gerard Pique", "Javier Mascherano",
            "Adriano", "Sergio Busquets", "Xavi", "Andres Iniesta",
            "Cesc Fabregas", "Alexis Sanchez", "Pedro"
        ],
        "lineup_b_names": [
            "Petr Cech", "Branislav Ivanovic", "Gary Cahill", "John Terry",
            "Ashley Cole", "John Obi Mikel", "Frank Lampard", "Ramires",
            "Juan Mata", "Didier Drogba", "Fernando Torres"
        ],
    },
    {
        "match_id": "ucl-sf-2019-liv-barca",
        "date": "2019-05-07",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2018-19",
        "opponent_a": "Liverpool",
        "opponent_b": "Barcelona",
        "score": "4-0 (agg 4-3)",
        "lineup_a_names": [
            "Alisson", "Trent Alexander-Arnold", "Joel Matip", "Virgil van Dijk",
            "Andrew Robertson", "Fabinho", "Jordan Henderson", "Georginio Wijnaldum",
            "Xherdan Shaqiri", "Divock Origi", "Sadio Mane"
        ],
        "lineup_b_names": [
            "Marc-Andre ter Stegen", "Sergi Roberto", "Gerard Pique", "Clement Lenglet",
            "Jordi Alba", "Sergio Busquets", "Arturo Vidal", "Ivan Rakitic",
            "Lionel Messi", "Philippe Coutinho", "Luis Suarez"
        ],
    },
    {
        "match_id": "ucl-sf-2019-ajax-spurs",
        "date": "2019-05-08",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2018-19",
        "opponent_a": "Ajax",
        "opponent_b": "Tottenham Hotspur",
        "score": "2-3 (agg 3-3, away goals)",
        "lineup_a_names": [
            "Andre Onana", "Noussair Mazraoui", "Matthijs de Ligt", "Daley Blind",
            "Nicolas Tagliafico", "Lasse Schone", "Frenkie de Jong", "Donny van de Beek",
            "Hakim Ziyech", "Dusan Tadic", "David Neres"
        ],
        "lineup_b_names": [
            "Hugo Lloris", "Kieran Trippier", "Toby Alderweireld", "Jan Vertonghen",
            "Danny Rose", "Moussa Sissoko", "Victor Wanyama", "Christian Eriksen",
            "Dele Alli", "Lucas Moura", "Son Heung-Min"
        ],
    },
    {
        "match_id": "ucl-sf-2022-city-madrid",
        "date": "2022-05-04",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2021-22",
        "opponent_a": "Real Madrid",
        "opponent_b": "Manchester City",
        "score": "3-1 (agg 6-5, aet)",
        "lineup_a_names": [
            "Thibaut Courtois", "Dani Carvajal", "Eder Militao", "David Alaba",
            "Ferland Mendy", "Luka Modric", "Toni Kroos", "Casemiro",
            "Federico Valverde", "Karim Benzema", "Vinicius Junior"
        ],
        "lineup_b_names": [
            "Ederson", "Kyle Walker", "John Stones", "Ruben Dias",
            "Joao Cancelo", "Kevin De Bruyne", "Bernardo Silva", "Rodri",
            "Riyad Mahrez", "Phil Foden", "Gabriel Jesus"
        ],
    },
    {
        "match_id": "ucl-sf-2005-chelsea-liverpool",
        "date": "2005-05-03",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2004-05",
        "opponent_a": "Liverpool",
        "opponent_b": "Chelsea",
        "score": "1-0 (agg 1-0)",
        "lineup_a_names": [
            "Jerzy Dudek", "Steve Finnan", "Jamie Carragher", "Sami Hyypia",
            "Djimi Traore", "Steven Gerrard", "Xabi Alonso", "Dietmar Hamann",
            "Luis Garcia", "Milan Baros", "John Arne Riise"
        ],
        "lineup_b_names": [
            "Petr Cech", "Paulo Ferreira", "Ricardo Carvalho", "John Terry",
            "William Gallas", "Claude Makelele", "Frank Lampard", "Tiago",
            "Joe Cole", "Eidur Gudjohnsen", "Damien Duff"
        ],
    },
    {
        "match_id": "ucl-sf-2014-real-bayern",
        "date": "2014-04-29",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2013-14",
        "opponent_a": "Bayern Munich",
        "opponent_b": "Real Madrid",
        "score": "0-4 (agg 0-5)",
        "lineup_a_names": [
            "Manuel Neuer", "Philipp Lahm", "Jerome Boateng", "Dante",
            "David Alaba", "Bastian Schweinsteiger", "Toni Kroos", "Arjen Robben",
            "Thomas Muller", "Mario Mandzukic", "Franck Ribery"
        ],
        "lineup_b_names": [
            "Iker Casillas", "Dani Carvajal", "Sergio Ramos", "Pepe",
            "Fabio Coentrao", "Luka Modric", "Xabi Alonso", "Angel Di Maria",
            "Gareth Bale", "Karim Benzema", "Cristiano Ronaldo"
        ],
    },
    {
        "match_id": "ucl-sf-2018-roma-liverpool",
        "date": "2018-05-02",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2017-18",
        "opponent_a": "Roma",
        "opponent_b": "Liverpool",
        "score": "4-2 (agg 6-7)",
        "lineup_a_names": [
            "Alisson", "Alessandro Florenzi", "Federico Fazio", "Juan Jesus",
            "Aleksandar Kolarov", "Daniele De Rossi", "Lorenzo Pellegrini", "Radja Nainggolan",
            "Stephan El Shaarawy", "Edin Dzeko", "Cengiz Under"
        ],
        "lineup_b_names": [
            "Loris Karius", "Trent Alexander-Arnold", "Dejan Lovren", "Virgil van Dijk",
            "Andrew Robertson", "Jordan Henderson", "James Milner", "Georginio Wijnaldum",
            "Mohamed Salah", "Roberto Firmino", "Sadio Mane"
        ],
    },
    {
        "match_id": "ucl-sf-2020-lyon-bayern",
        "date": "2020-08-19",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2019-20",
        "opponent_a": "Lyon",
        "opponent_b": "Bayern Munich",
        "score": "0-3",
        "lineup_a_names": [
            "Anthony Lopes", "Leo Dubois", "Marcelo", "Jason Denayer",
            "Maxwel Cornet", "Bruno Guimaraes", "Houssem Aouar", "Maxence Caqueret",
            "Karl Toko Ekambi", "Memphis Depay", "Moussa Dembele"
        ],
        "lineup_b_names": [
            "Manuel Neuer", "Joshua Kimmich", "Jerome Boateng", "David Alaba",
            "Alphonso Davies", "Leon Goretzka", "Thiago Alcantara", "Serge Gnabry",
            "Thomas Muller", "Robert Lewandowski", "Ivan Perisic"
        ],
    },
    {
        "match_id": "ucl-sf-2023-city-madrid",
        "date": "2023-05-17",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2022-23",
        "opponent_a": "Manchester City",
        "opponent_b": "Real Madrid",
        "score": "4-0 (agg 5-1)",
        "lineup_a_names": [
            "Ederson", "Kyle Walker", "John Stones", "Manuel Akanji",
            "Nathan Ake", "Rodri", "Bernardo Silva", "Kevin De Bruyne",
            "Jack Grealish", "Erling Haaland", "Phil Foden"
        ],
        "lineup_b_names": [
            "Thibaut Courtois", "Dani Carvajal", "Eder Militao", "David Alaba",
            "Ferland Mendy", "Eduardo Camavinga", "Toni Kroos", "Luka Modric",
            "Rodrygo", "Karim Benzema", "Vinicius Junior"
        ],
    },

    # ═══════════════════════════════════════════════════════════════════
    # ICONIC WORLD CUP MATCHES (~15 matches)
    # ═══════════════════════════════════════════════════════════════════
    {
        "match_id": "wc-sf-2006-germany-italy",
        "date": "2006-07-04",
        "competition": "FIFA World Cup Semi-Final",
        "season": "2006",
        "opponent_a": "Germany",
        "opponent_b": "Italy",
        "score": "0-2 (aet)",
        "lineup_a_names": [
            "Jens Lehmann", "Philipp Lahm", "Per Mertesacker", "Christoph Metzelder",
            "Arne Friedrich", "Bastian Schweinsteiger", "Torsten Frings", "Tim Borowski",
            "Bernd Schneider", "Miroslav Klose", "Lukas Podolski"
        ],
        "lineup_b_names": [
            "Gianluigi Buffon", "Gianluca Zambrotta", "Fabio Cannavaro", "Marco Materazzi",
            "Fabio Grosso", "Mauro Camoranesi", "Andrea Pirlo", "Gennaro Gattuso",
            "Simone Perrotta", "Luca Toni", "Alberto Gilardino"
        ],
    },
    {
        "match_id": "wc-sf-2014-brazil-germany",
        "date": "2014-07-08",
        "competition": "FIFA World Cup Semi-Final",
        "season": "2014",
        "opponent_a": "Brazil",
        "opponent_b": "Germany",
        "score": "1-7",
        "lineup_a_names": [
            "Julio Cesar", "Maicon", "David Luiz", "Dante",
            "Marcelo", "Luiz Gustavo", "Fernandinho", "Oscar",
            "Hulk", "Fred", "Bernard"
        ],
        "lineup_b_names": [
            "Manuel Neuer", "Philipp Lahm", "Mats Hummels", "Jerome Boateng",
            "Benedikt Howedes", "Bastian Schweinsteiger", "Sami Khedira", "Toni Kroos",
            "Mesut Ozil", "Thomas Muller", "Miroslav Klose"
        ],
    },
    {
        "match_id": "wc-sf-2018-france-belgium",
        "date": "2018-07-10",
        "competition": "FIFA World Cup Semi-Final",
        "season": "2018",
        "opponent_a": "France",
        "opponent_b": "Belgium",
        "score": "1-0",
        "lineup_a_names": [
            "Hugo Lloris", "Benjamin Pavard", "Raphael Varane", "Samuel Umtiti",
            "Lucas Hernandez", "N'Golo Kante", "Paul Pogba", "Blaise Matuidi",
            "Kylian Mbappe", "Antoine Griezmann", "Olivier Giroud"
        ],
        "lineup_b_names": [
            "Thibaut Courtois", "Thomas Meunier", "Toby Alderweireld", "Vincent Kompany",
            "Jan Vertonghen", "Axel Witsel", "Marouane Fellaini", "Kevin De Bruyne",
            "Eden Hazard", "Romelu Lukaku", "Nacer Chadli"
        ],
    },
    {
        "match_id": "wc-sf-2022-argentina-croatia",
        "date": "2022-12-13",
        "competition": "FIFA World Cup Semi-Final",
        "season": "2022",
        "opponent_a": "Argentina",
        "opponent_b": "Croatia",
        "score": "3-0",
        "lineup_a_names": [
            "Emiliano Martinez", "Nahuel Molina", "Cristian Romero", "Nicolas Otamendi",
            "Nicolas Tagliafico", "Rodrigo De Paul", "Enzo Fernandez", "Alexis Mac Allister",
            "Lionel Messi", "Julian Alvarez", "Angel Di Maria"
        ],
        "lineup_b_names": [
            "Dominik Livakovic", "Josip Juranovic", "Dejan Lovren", "Josko Gvardiol",
            "Borna Sosa", "Luka Modric", "Mateo Kovacic", "Marcelo Brozovic",
            "Ivan Perisic", "Mario Pasalic", "Bruno Petkovic"
        ],
    },
    {
        "match_id": "wc-sf-2022-france-morocco",
        "date": "2022-12-14",
        "competition": "FIFA World Cup Semi-Final",
        "season": "2022",
        "opponent_a": "France",
        "opponent_b": "Morocco",
        "score": "2-0",
        "lineup_a_names": [
            "Hugo Lloris", "Jules Kounde", "Raphael Varane", "Dayot Upamecano",
            "Theo Hernandez", "Aurelien Tchouameni", "Adrien Rabiot", "Ousmane Dembele",
            "Kylian Mbappe", "Antoine Griezmann", "Olivier Giroud"
        ],
        "lineup_b_names": [
            "Yassine Bounou", "Achraf Hakimi", "Nayef Aguerd", "Romain Saiss",
            "Noussair Mazraoui", "Sofyan Amrabat", "Azzedine Ounahi", "Selim Amallah",
            "Hakim Ziyech", "Youssef En-Nesyri", "Sofiane Boufal"
        ],
    },
    {
        "match_id": "wc-group-2014-germany-portugal",
        "date": "2014-06-16",
        "competition": "FIFA World Cup Group Stage",
        "season": "2014",
        "opponent_a": "Germany",
        "opponent_b": "Portugal",
        "score": "4-0",
        "lineup_a_names": [
            "Manuel Neuer", "Philipp Lahm", "Mats Hummels", "Jerome Boateng",
            "Benedikt Howedes", "Bastian Schweinsteiger", "Sami Khedira", "Toni Kroos",
            "Mesut Ozil", "Thomas Muller", "Mario Gotze"
        ],
        "lineup_b_names": [
            "Rui Patricio", "Joao Pereira", "Pepe", "Bruno Alves",
            "Fabio Coentrao", "Joao Moutinho", "Miguel Veloso", "Raul Meireles",
            "Nani", "Hugo Almeida", "Cristiano Ronaldo"
        ],
    },
    {
        "match_id": "wc-group-2014-spain-netherlands",
        "date": "2014-06-13",
        "competition": "FIFA World Cup Group Stage",
        "season": "2014",
        "opponent_a": "Spain",
        "opponent_b": "Netherlands",
        "score": "1-5",
        "lineup_a_names": [
            "Iker Casillas", "Cesar Azpilicueta", "Sergio Ramos", "Gerard Pique",
            "Jordi Alba", "Xabi Alonso", "Sergio Busquets", "Xavi",
            "David Silva", "Diego Costa", "Pedro"
        ],
        "lineup_b_names": [
            "Jasper Cillessen", "Daryl Janmaat", "Ron Vlaar", "Stefan de Vrij",
            "Daley Blind", "Nigel de Jong", "Georginio Wijnaldum", "Wesley Sneijder",
            "Arjen Robben", "Robin van Persie", "Dirk Kuyt"
        ],
    },
    {
        "match_id": "wc-r16-2022-japan-croatia",
        "date": "2022-12-05",
        "competition": "FIFA World Cup Round of 16",
        "season": "2022",
        "opponent_a": "Japan",
        "opponent_b": "Croatia",
        "score": "1-1 (1-3 pen)",
        "lineup_a_names": [
            "Shuichi Gonda", "Hiroki Sakai", "Maya Yoshida", "Shogo Taniguchi",
            "Yuto Nagatomo", "Wataru Endo", "Hidemasa Morita", "Junya Ito",
            "Ritsu Doan", "Daizen Maeda", "Daichi Kamada"
        ],
        "lineup_b_names": [
            "Dominik Livakovic", "Josip Juranovic", "Dejan Lovren", "Josko Gvardiol",
            "Borna Sosa", "Luka Modric", "Mateo Kovacic", "Marcelo Brozovic",
            "Ivan Perisic", "Andrej Kramaric", "Bruno Petkovic"
        ],
    },
    {
        "match_id": "wc-group-2022-argentina-saudiarabia",
        "date": "2022-11-22",
        "competition": "FIFA World Cup Group Stage",
        "season": "2022",
        "opponent_a": "Argentina",
        "opponent_b": "Saudi Arabia",
        "score": "1-2",
        "lineup_a_names": [
            "Emiliano Martinez", "Nahuel Molina", "Cristian Romero", "Nicolas Otamendi",
            "Nicolas Tagliafico", "Rodrigo De Paul", "Leandro Paredes", "Alejandro Gomez",
            "Lionel Messi", "Lautaro Martinez", "Angel Di Maria"
        ],
        "lineup_b_names": [
            "Mohammed Al Owais", "Sultan Al Ghannam", "Hassan Tambakti", "Ali Al Bulayhi",
            "Yasser Al Shahrani", "Abdulelah Al Malki", "Sami Al Najei", "Mohamed Kanno",
            "Firas Al Buraikan", "Salem Al Dawsari", "Saleh Al Shehri"
        ],
    },
    {
        "match_id": "wc-group-2022-germany-japan",
        "date": "2022-11-23",
        "competition": "FIFA World Cup Group Stage",
        "season": "2022",
        "opponent_a": "Germany",
        "opponent_b": "Japan",
        "score": "1-2",
        "lineup_a_names": [
            "Manuel Neuer", "Niklas Sule", "Antonio Rudiger", "Nico Schlotterbeck",
            "David Raum", "Joshua Kimmich", "Ilkay Gundogan", "Serge Gnabry",
            "Thomas Muller", "Jamal Musiala", "Kai Havertz"
        ],
        "lineup_b_names": [
            "Shuichi Gonda", "Hiroki Sakai", "Maya Yoshida", "Shogo Taniguchi",
            "Yuto Nagatomo", "Wataru Endo", "Hidemasa Morita", "Junya Ito",
            "Ritsu Doan", "Daizen Maeda", "Takuma Asano"
        ],
    },
    {
        "match_id": "wc-qf-2022-brazil-croatia",
        "date": "2022-12-09",
        "competition": "FIFA World Cup Quarter-Final",
        "season": "2022",
        "opponent_a": "Brazil",
        "opponent_b": "Croatia",
        "score": "1-1 (2-4 pen)",
        "lineup_a_names": [
            "Alisson", "Eder Militao", "Thiago Silva", "Marquinhos",
            "Danilo", "Lucas Paqueta", "Casemiro", "Neymar",
            "Raphinha", "Richarlison", "Vinicius Junior"
        ],
        "lineup_b_names": [
            "Dominik Livakovic", "Josip Juranovic", "Dejan Lovren", "Josko Gvardiol",
            "Borna Sosa", "Luka Modric", "Mateo Kovacic", "Marcelo Brozovic",
            "Ivan Perisic", "Andrej Kramaric", "Bruno Petkovic"
        ],
    },
    {
        "match_id": "wc-qf-2022-netherlands-argentina",
        "date": "2022-12-09",
        "competition": "FIFA World Cup Quarter-Final",
        "season": "2022",
        "opponent_a": "Netherlands",
        "opponent_b": "Argentina",
        "score": "2-2 (3-4 pen)",
        "lineup_a_names": [
            "Andries Noppert", "Jurrien Timber", "Virgil van Dijk", "Nathan Ake",
            "Denzel Dumfries", "Marten de Roon", "Frenkie de Jong", "Davy Klaassen",
            "Steven Bergwijn", "Cody Gakpo", "Memphis Depay"
        ],
        "lineup_b_names": [
            "Emiliano Martinez", "Nahuel Molina", "Cristian Romero", "Nicolas Otamendi",
            "Nicolas Tagliafico", "Rodrigo De Paul", "Enzo Fernandez", "Alexis Mac Allister",
            "Lionel Messi", "Julian Alvarez", "Angel Di Maria"
        ],
    },
    {
        "match_id": "wc-group-2018-germany-mexico",
        "date": "2018-06-17",
        "competition": "FIFA World Cup Group Stage",
        "season": "2018",
        "opponent_a": "Germany",
        "opponent_b": "Mexico",
        "score": "0-1",
        "lineup_a_names": [
            "Manuel Neuer", "Joshua Kimmich", "Mats Hummels", "Jerome Boateng",
            "Marvin Plattenhardt", "Sami Khedira", "Toni Kroos", "Mesut Ozil",
            "Thomas Muller", "Timo Werner", "Julian Draxler"
        ],
        "lineup_b_names": [
            "Guillermo Ochoa", "Edson Alvarez", "Hector Moreno", "Carlos Salcedo",
            "Jesus Gallardo", "Andres Guardado", "Hector Herrera", "Carlos Vela",
            "Hirving Lozano", "Javier Hernandez", "Miguel Layun"
        ],
    },
    {
        "match_id": "wc-r16-2018-france-argentina",
        "date": "2018-06-30",
        "competition": "FIFA World Cup Round of 16",
        "season": "2018",
        "opponent_a": "France",
        "opponent_b": "Argentina",
        "score": "4-3",
        "lineup_a_names": [
            "Hugo Lloris", "Benjamin Pavard", "Raphael Varane", "Samuel Umtiti",
            "Lucas Hernandez", "N'Golo Kante", "Paul Pogba", "Blaise Matuidi",
            "Kylian Mbappe", "Antoine Griezmann", "Olivier Giroud"
        ],
        "lineup_b_names": [
            "Franco Armani", "Gabriel Mercado", "Nicolas Otamendi", "Marcos Rojo",
            "Nicolas Tagliafico", "Javier Mascherano", "Enzo Perez", "Ever Banega",
            "Lionel Messi", "Gonzalo Higuain", "Angel Di Maria"
        ],
    },
    {
        "match_id": "wc-sf-2010-germany-spain",
        "date": "2010-07-07",
        "competition": "FIFA World Cup Semi-Final",
        "season": "2010",
        "opponent_a": "Germany",
        "opponent_b": "Spain",
        "score": "0-1",
        "lineup_a_names": [
            "Manuel Neuer", "Philipp Lahm", "Per Mertesacker", "Arne Friedrich",
            "Jerome Boateng", "Bastian Schweinsteiger", "Sami Khedira", "Mesut Ozil",
            "Thomas Muller", "Miroslav Klose", "Lukas Podolski"
        ],
        "lineup_b_names": [
            "Iker Casillas", "Sergio Ramos", "Gerard Pique", "Carles Puyol",
            "Joan Capdevila", "Xabi Alonso", "Sergio Busquets", "Xavi",
            "Andres Iniesta", "David Villa", "Pedro"
        ],
    },
]


def main() -> None:
    print("Loading player database...")
    lookup = build_player_lookup()
    print(f"  Loaded {len(lookup):,} players")

    neg_counter = [-1]  # mutable counter for negative IDs
    matched = 0
    unmatched = 0

    matches_out = []
    for m in MATCHES_RAW:
        ids_a = resolve_ids(m["lineup_a_names"], lookup, neg_counter)
        ids_b = resolve_ids(m["lineup_b_names"], lookup, neg_counter)

        for pid in ids_a + ids_b:
            if pid >= 0:
                matched += 1
            else:
                unmatched += 1

        matches_out.append({
            "match_id": m["match_id"],
            "date": m["date"],
            "competition": m["competition"],
            "season": m["season"],
            "opponent_a": m["opponent_a"],
            "opponent_b": m["opponent_b"],
            "score": m["score"],
            "lineup_a_ids": ids_a,
            "lineup_b_ids": ids_b,
            "lineup_a_names": m["lineup_a_names"],
            "lineup_b_names": m["lineup_b_names"],
        })

    # Sort by date
    matches_out.sort(key=lambda m: m["date"])

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(matches_out, f, ensure_ascii=False, indent=2)

    file_size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"\nWrote {len(matches_out)} matches to {OUTPUT_FILE}")
    print(f"File size: {file_size_kb:.1f} KB")
    print(f"Player IDs matched: {matched}, unmatched (negative IDs): {unmatched}")
    print("ETL complete.")


if __name__ == "__main__":
    main()
