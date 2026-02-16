#!/usr/bin/env python3
"""
Club name normalizer for football project.

Normalizes club names across different data sources (Kaggle official names,
salimt names, our DB names) to a canonical short form.

Usage:
    from club_normalizer import normalize_club, clubs_match
"""

import difflib
import re

from unidecode import unidecode

# ---------------------------------------------------------------------------
# Canonical alias map: lowercase variation -> canonical short name
# ---------------------------------------------------------------------------

CLUB_ALIASES: dict[str, str] = {
    # =========================================================================
    # PREMIER LEAGUE (20)
    # =========================================================================
    # Arsenal
    "arsenal football club": "Arsenal",
    "arsenal fc": "Arsenal",
    "arsenal": "Arsenal",
    # Aston Villa
    "aston villa football club": "Arsenal" if False else "Aston Villa",
    "aston villa fc": "Aston Villa",
    "aston villa": "Aston Villa",
    # Bournemouth
    "association football club bournemouth": "Bournemouth",
    "afc bournemouth": "Bournemouth",
    "bournemouth": "Bournemouth",
    # Brentford
    "brentford football club": "Brentford",
    "brentford fc": "Brentford",
    "brentford": "Brentford",
    # Brighton
    "brighton and hove albion football club": "Brighton",
    "brighton & hove albion": "Brighton",
    "brighton and hove albion": "Brighton",
    "brighton": "Brighton",
    # Burnley
    "burnley football club": "Burnley",
    "burnley fc": "Burnley",
    "burnley": "Burnley",
    # Chelsea
    "chelsea football club": "Chelsea",
    "chelsea fc": "Chelsea",
    "chelsea": "Chelsea",
    # Crystal Palace
    "crystal palace football club": "Crystal Palace",
    "crystal palace fc": "Crystal Palace",
    "crystal palace": "Crystal Palace",
    # Everton
    "everton football club": "Everton",
    "everton fc": "Everton",
    "everton": "Everton",
    # Fulham
    "fulham football club": "Fulham",
    "fulham fc": "Fulham",
    "fulham": "Fulham",
    # Ipswich Town
    "ipswich town football club": "Ipswich Town",
    "ipswich town fc": "Ipswich Town",
    "ipswich town": "Ipswich Town",
    "ipswich": "Ipswich Town",
    # Leicester City
    "leicester city football club": "Leicester City",
    "leicester city fc": "Leicester City",
    "leicester city": "Leicester City",
    "leicester": "Leicester City",
    # Liverpool
    "liverpool football club": "Liverpool",
    "liverpool fc": "Liverpool",
    "liverpool": "Liverpool",
    # Luton Town
    "luton town football club": "Luton Town",
    "luton town fc": "Luton Town",
    "luton town": "Luton Town",
    # Manchester City
    "manchester city football club": "Manchester City",
    "manchester city fc": "Manchester City",
    "manchester city": "Manchester City",
    "man city": "Manchester City",
    # Manchester United
    "manchester united football club": "Manchester United",
    "manchester united fc": "Manchester United",
    "manchester united": "Manchester United",
    "man utd": "Manchester United",
    "man united": "Manchester United",
    # Newcastle United
    "newcastle united football club": "Newcastle United",
    "newcastle united fc": "Newcastle United",
    "newcastle united": "Newcastle United",
    "newcastle": "Newcastle United",
    # Nottingham Forest
    "nottingham forest football club": "Nottingham Forest",
    "nottingham forest fc": "Nottingham Forest",
    "nottingham forest": "Nottingham Forest",
    # Southampton
    "southampton football club": "Southampton",
    "southampton fc": "Southampton",
    "southampton": "Southampton",
    # Tottenham Hotspur
    "tottenham hotspur football club": "Tottenham Hotspur",
    "tottenham hotspur fc": "Tottenham Hotspur",
    "tottenham hotspur": "Tottenham Hotspur",
    "tottenham": "Tottenham Hotspur",
    "spurs": "Tottenham Hotspur",
    # West Ham United
    "west ham united football club": "West Ham United",
    "west ham united fc": "West Ham United",
    "west ham united": "West Ham United",
    "west ham": "West Ham United",
    # Wolverhampton Wanderers
    "wolverhampton wanderers football club": "Wolverhampton Wanderers",
    "wolverhampton wanderers fc": "Wolverhampton Wanderers",
    "wolverhampton wanderers": "Wolverhampton Wanderers",
    "wolves": "Wolverhampton Wanderers",

    # =========================================================================
    # LA LIGA (20)
    # =========================================================================
    # Real Madrid
    "real madrid club de futbol": "Real Madrid",
    "real madrid cf": "Real Madrid",
    "real madrid": "Real Madrid",
    # Barcelona
    "futbol club barcelona": "Barcelona",
    "fc barcelona": "Barcelona",
    "barcelona": "Barcelona",
    "barca": "Barcelona",
    # Atletico Madrid
    "club atletico de madrid s.a.d.": "Atletico Madrid",
    "club atletico de madrid": "Atletico Madrid",
    "atletico de madrid": "Atletico Madrid",
    "atletico madrid": "Atletico Madrid",
    "atletico": "Atletico Madrid",
    # Sevilla
    "sevilla futbol club s.a.d.": "Sevilla",
    "sevilla futbol club": "Sevilla",
    "sevilla fc": "Sevilla",
    "sevilla": "Sevilla",
    # Real Betis
    "real betis balompie s.a.d.": "Real Betis",
    "real betis balompie": "Real Betis",
    "real betis": "Real Betis",
    "betis": "Real Betis",
    # Real Sociedad
    "real sociedad de futbol s.a.d.": "Real Sociedad",
    "real sociedad de futbol": "Real Sociedad",
    "real sociedad": "Real Sociedad",
    # Villarreal
    "villarreal club de futbol s.a.d.": "Villarreal",
    "villarreal club de futbol": "Villarreal",
    "villarreal cf": "Villarreal",
    "villarreal": "Villarreal",
    # Athletic Bilbao
    "athletic club bilbao": "Athletic Bilbao",
    "athletic club": "Athletic Bilbao",
    "athletic bilbao": "Athletic Bilbao",
    # Valencia
    "valencia club de futbol s. a. d.": "Valencia",
    "valencia club de futbol s.a.d.": "Valencia",
    "valencia club de futbol": "Valencia",
    "valencia cf": "Valencia",
    "valencia": "Valencia",
    # Celta Vigo
    "real club celta de vigo s. a. d.": "Celta Vigo",
    "real club celta de vigo s.a.d.": "Celta Vigo",
    "real club celta de vigo": "Celta Vigo",
    "celta de vigo": "Celta Vigo",
    "celta vigo": "Celta Vigo",
    "celta": "Celta Vigo",
    # Mallorca
    "real club deportivo mallorca s.a.d.": "Mallorca",
    "real club deportivo mallorca": "Mallorca",
    "rcd mallorca": "Mallorca",
    "mallorca": "Mallorca",
    # Espanyol
    "reial club deportiu espanyol de barcelona s.a.d.": "Espanyol",
    "rcd espanyol de barcelona": "Espanyol",
    "rcd espanyol": "Espanyol",
    "espanyol": "Espanyol",
    # Osasuna
    "club atletico osasuna": "Osasuna",
    "ca osasuna": "Osasuna",
    "osasuna": "Osasuna",
    # Getafe
    "getafe club de futbol s. a. d. team dubai": "Getafe",
    "getafe club de futbol s.a.d.": "Getafe",
    "getafe club de futbol": "Getafe",
    "getafe cf": "Getafe",
    "getafe": "Getafe",
    # Girona
    "girona futbol club s. a. d.": "Girona",
    "girona futbol club s.a.d.": "Girona",
    "girona fc": "Girona",
    "girona": "Girona",
    # Alaves
    "deportivo alaves s. a. d.": "Alaves",
    "deportivo alaves s.a.d.": "Alaves",
    "deportivo alaves": "Alaves",
    "alaves": "Alaves",
    # Las Palmas
    "ud las palmas": "Las Palmas",
    "las palmas": "Las Palmas",
    # Rayo Vallecano
    "rayo vallecano de madrid s. a. d.": "Rayo Vallecano",
    "rayo vallecano de madrid s.a.d.": "Rayo Vallecano",
    "rayo vallecano": "Rayo Vallecano",
    # Leganes
    "cd leganes": "Leganes",
    "leganes": "Leganes",
    # Cadiz
    "cadiz cf": "Cadiz",
    "cadiz": "Cadiz",
    # Real Valladolid
    "real valladolid cf": "Real Valladolid",
    "real valladolid": "Real Valladolid",
    "valladolid": "Real Valladolid",
    # Real Oviedo
    "real oviedo s.a.d.": "Real Oviedo",
    "real oviedo": "Real Oviedo",
    # Granada
    "granada cf": "Granada",
    "granada": "Granada",
    # Almeria
    "ud almeria": "Almeria",
    "almeria": "Almeria",
    # Elche
    "elche club de futbol s.a.d.": "Elche",
    "elche cf": "Elche",
    "elche": "Elche",
    # Levante
    "levante union deportiva s.a.d.": "Levante",
    "levante ud": "Levante",
    "levante": "Levante",
    # Huesca
    "sd huesca": "Huesca",
    "huesca": "Huesca",
    # Eibar
    "sd eibar": "Eibar",
    "eibar": "Eibar",
    # Malaga
    "malaga cf": "Malaga",
    "malaga": "Malaga",
    # Deportivo La Coruna
    "deportivo de la coruna": "Deportivo La Coruna",
    "deportivo la coruna": "Deportivo La Coruna",
    # Real Zaragoza
    "real zaragoza": "Real Zaragoza",
    "zaragoza": "Real Zaragoza",
    # Sporting Gijon
    "sporting gijon": "Sporting Gijon",

    # =========================================================================
    # BUNDESLIGA (18)
    # =========================================================================
    # Bayern Munich
    "fc bayern munchen": "Bayern Munich",
    "fc bayern munich": "Bayern Munich",
    "bayern munchen": "Bayern Munich",
    "bayern munich": "Bayern Munich",
    "bayern": "Bayern Munich",
    # Borussia Dortmund
    "borussia dortmund": "Borussia Dortmund",
    "bv borussia 09 dortmund": "Borussia Dortmund",
    "bvb": "Borussia Dortmund",
    "dortmund": "Borussia Dortmund",
    # Bayer Leverkusen
    "bayer 04 leverkusen fussball": "Bayer Leverkusen",
    "bayer 04 leverkusen": "Bayer Leverkusen",
    "bayer leverkusen": "Bayer Leverkusen",
    "leverkusen": "Bayer Leverkusen",
    # RB Leipzig
    "rasenballsport leipzig": "RB Leipzig",
    "rb leipzig": "RB Leipzig",
    "leipzig": "RB Leipzig",
    # Borussia Monchengladbach
    "borussia verein fur leibesubungen 1900 monchengladbach": "Borussia Monchengladbach",
    "borussia monchengladbach": "Borussia Monchengladbach",
    "monchengladbach": "Borussia Monchengladbach",
    "gladbach": "Borussia Monchengladbach",
    # Eintracht Frankfurt
    "eintracht frankfurt fussball ag": "Eintracht Frankfurt",
    "eintracht frankfurt": "Eintracht Frankfurt",
    "frankfurt": "Eintracht Frankfurt",
    # VfB Stuttgart
    "verein fur bewegungsspiele stuttgart 1893": "VfB Stuttgart",
    "vfb stuttgart 1893": "VfB Stuttgart",
    "vfb stuttgart": "VfB Stuttgart",
    "stuttgart": "VfB Stuttgart",
    # VfL Wolfsburg
    "verein fur leibesubungen wolfsburg": "VfL Wolfsburg",
    "vfl wolfsburg": "VfL Wolfsburg",
    "wolfsburg": "VfL Wolfsburg",
    # Werder Bremen
    "sportverein werder bremen von 1899": "Werder Bremen",
    "sv werder bremen": "Werder Bremen",
    "werder bremen": "Werder Bremen",
    # SC Freiburg
    "sport-club freiburg": "SC Freiburg",
    "sc freiburg": "SC Freiburg",
    "freiburg": "SC Freiburg",
    # TSG Hoffenheim
    "turn- und sportgemeinschaft 1899 hoffenheim fussball-spielbetriebs": "TSG Hoffenheim",
    "tsg 1899 hoffenheim": "TSG Hoffenheim",
    "tsg hoffenheim": "TSG Hoffenheim",
    "hoffenheim": "TSG Hoffenheim",
    # Mainz 05
    "1. fussball- und sportverein mainz 05": "Mainz 05",
    "1. fsv mainz 05": "Mainz 05",
    "fsv mainz 05": "Mainz 05",
    "mainz 05": "Mainz 05",
    "mainz": "Mainz 05",
    # FC Augsburg
    "fussball-club augsburg 1907": "FC Augsburg",
    "fc augsburg": "FC Augsburg",
    "augsburg": "FC Augsburg",
    # Union Berlin
    "1. fussballclub union berlin": "Union Berlin",
    "1. fc union berlin": "Union Berlin",
    "fc union berlin": "Union Berlin",
    "union berlin": "Union Berlin",
    # FC Koln
    "1. fussball-club koln": "FC Koln",
    "1. fc koln": "FC Koln",
    "fc koln": "FC Koln",
    "koln": "FC Koln",
    # Heidenheim
    "1. fussballclub heidenheim 1846": "Heidenheim",
    "1. fc heidenheim 1846": "Heidenheim",
    "fc heidenheim": "Heidenheim",
    "heidenheim": "Heidenheim",
    # FC Schalke 04
    "fc schalke 04": "Schalke 04",
    "schalke 04": "Schalke 04",
    "schalke": "Schalke 04",
    # Hertha BSC
    "hertha bsc": "Hertha BSC",
    "hertha berlin": "Hertha BSC",
    # Holstein Kiel
    "holstein kiel": "Holstein Kiel",
    # St. Pauli
    "fussball-club st. pauli von 1910": "St. Pauli",
    "fc st. pauli": "St. Pauli",
    "fc st pauli": "St. Pauli",
    "st. pauli": "St. Pauli",
    # VfL Bochum
    "vfl bochum": "VfL Bochum",
    "bochum": "VfL Bochum",
    # Hannover 96
    "hannover 96": "Hannover 96",
    # Hamburger SV
    "hamburger sport verein": "Hamburger SV",
    "hamburger sv": "Hamburger SV",
    "hamburg": "Hamburger SV",
    # Fortuna Dusseldorf
    "fortuna dusseldorf": "Fortuna Dusseldorf",
    "dusseldorf": "Fortuna Dusseldorf",
    # SC Paderborn
    "sc paderborn 07": "SC Paderborn",
    "sc paderborn": "SC Paderborn",
    # Arminia Bielefeld
    "arminia bielefeld": "Arminia Bielefeld",
    "bielefeld": "Arminia Bielefeld",
    # SV Darmstadt 98
    "sv darmstadt 98": "SV Darmstadt 98",
    "darmstadt": "SV Darmstadt 98",
    # Eintracht Braunschweig
    "eintracht braunschweig": "Eintracht Braunschweig",
    # SpVgg Greuther Furth
    "spvgg greuther furth": "SpVgg Greuther Furth",
    "greuther furth": "SpVgg Greuther Furth",
    # FC Ingolstadt
    "fc ingolstadt 04": "FC Ingolstadt",
    "fc ingolstadt": "FC Ingolstadt",

    # =========================================================================
    # SERIE A (20)
    # =========================================================================
    # Juventus
    "juventus football club s.p.a.": "Juventus",
    "juventus football club": "Juventus",
    "juventus fc": "Juventus",
    "juventus": "Juventus",
    "juve": "Juventus",
    # Inter Milan
    "football club internazionale milano s.p.a.": "Inter Milan",
    "fc internazionale milano": "Inter Milan",
    "internazionale milano": "Inter Milan",
    "internazionale": "Inter Milan",
    "inter milan": "Inter Milan",
    "inter": "Inter Milan",
    # AC Milan
    "associazione calcio milan": "AC Milan",
    "ac milan": "AC Milan",
    "milan": "AC Milan",
    # Napoli
    "societa sportiva calcio napoli": "Napoli",
    "ssc napoli": "Napoli",
    "napoli": "Napoli",
    # Roma
    "associazione sportiva roma": "Roma",
    "as roma": "Roma",
    "roma": "Roma",
    # Lazio
    "societa sportiva lazio s.p.a.": "Lazio",
    "ss lazio": "Lazio",
    "lazio": "Lazio",
    # Fiorentina
    "associazione calcio fiorentina": "Fiorentina",
    "acf fiorentina": "Fiorentina",
    "fiorentina": "Fiorentina",
    # Atalanta
    "atalanta bergamasca calcio s.p.a.": "Atalanta",
    "atalanta bergamasca calcio": "Atalanta",
    "atalanta bc": "Atalanta",
    "atalanta": "Atalanta",
    # Bologna
    "bologna football club 1909": "Bologna",
    "bologna fc 1909": "Bologna",
    "bologna fc": "Bologna",
    "bologna": "Bologna",
    # Torino
    "torino calcio": "Torino",
    "torino fc": "Torino",
    "torino": "Torino",
    # Udinese
    "udinese calcio": "Udinese",
    "udinese": "Udinese",
    # Sassuolo
    "unione sportiva sassuolo calcio": "Sassuolo",
    "us sassuolo calcio": "Sassuolo",
    "us sassuolo": "Sassuolo",
    "sassuolo": "Sassuolo",
    # Sampdoria
    "uc sampdoria": "Sampdoria",
    "sampdoria": "Sampdoria",
    # Genoa
    "genoa cricket and football club": "Genoa",
    "genoa cfc": "Genoa",
    "genoa": "Genoa",
    # Hellas Verona
    "verona hellas football club": "Hellas Verona",
    "hellas verona fc": "Hellas Verona",
    "hellas verona": "Hellas Verona",
    "verona": "Hellas Verona",
    # Cagliari
    "cagliari calcio": "Cagliari",
    "cagliari": "Cagliari",
    # Lecce
    "unione sportiva lecce": "Lecce",
    "us lecce": "Lecce",
    "lecce": "Lecce",
    # Empoli
    "fc empoli": "Empoli",
    "empoli fc": "Empoli",
    "empoli": "Empoli",
    # Monza
    "ac monza": "Monza",
    "monza": "Monza",
    # Parma
    "parma calcio 1913": "Parma",
    "parma fc": "Parma",
    "parma": "Parma",
    # Como
    "calcio como": "Como",
    "como 1907": "Como",
    "como": "Como",
    # Venezia
    "venezia fc": "Venezia",
    "venezia": "Venezia",
    # Spezia
    "spezia calcio": "Spezia",
    "spezia": "Spezia",
    # Salernitana
    "us salernitana 1919": "Salernitana",
    "salernitana": "Salernitana",
    # Frosinone
    "frosinone calcio": "Frosinone",
    "frosinone": "Frosinone",
    # Cremonese
    "unione sportiva cremonese s.p.a.": "Cremonese",
    "us cremonese": "Cremonese",
    "cremonese": "Cremonese",
    # Pisa
    "pisa sporting club": "Pisa",
    "pisa sc": "Pisa",
    "pisa": "Pisa",
    # Benevento
    "benevento calcio": "Benevento",
    "benevento": "Benevento",
    # SPAL
    "spal": "SPAL",
    # Brescia
    "brescia calcio": "Brescia",
    "brescia": "Brescia",
    # Crotone
    "fc crotone": "Crotone",
    "crotone": "Crotone",
    # Chievo
    "chievo verona": "Chievo Verona",
    # Palermo
    "palermo fc": "Palermo",
    "palermo": "Palermo",
    # Pescara
    "delfino pescara 1936": "Pescara",
    "pescara": "Pescara",
    # Catania
    "catania fc": "Catania",
    "catania": "Catania",
    # Siena
    "siena fc": "Siena",
    "siena": "Siena",
    # Livorno
    "us livorno 1915": "Livorno",
    "livorno": "Livorno",
    # Cesena
    "cesena fc": "Cesena",
    "cesena": "Cesena",
    # Carpi
    "ac carpi": "Carpi",
    "carpi": "Carpi",

    # =========================================================================
    # LIGUE 1 (18)
    # =========================================================================
    # PSG
    "paris saint-germain football club": "Paris Saint-Germain",
    "paris saint-germain fc": "Paris Saint-Germain",
    "paris saint-germain": "Paris Saint-Germain",
    "paris sg": "Paris Saint-Germain",
    "psg": "Paris Saint-Germain",
    # Marseille
    "olympique de marseille": "Marseille",
    "om": "Marseille",
    "marseille": "Marseille",
    # Lyon
    "olympique lyonnais": "Lyon",
    "olympique lyon": "Lyon",
    "lyon": "Lyon",
    # Monaco
    "association sportive de monaco football club": "Monaco",
    "as monaco fc": "Monaco",
    "as monaco": "Monaco",
    "monaco": "Monaco",
    # Lille
    "lille olympique sporting club": "Lille",
    "lille osc": "Lille",
    "losc lille": "Lille",
    "losc": "Lille",
    "lille": "Lille",
    # Nice
    "olympique gymnaste club nice cote d'azur": "Nice",
    "ogc nice": "Nice",
    "nice": "Nice",
    # Rennes
    "stade rennais football club": "Rennes",
    "stade rennais fc": "Rennes",
    "stade rennais": "Rennes",
    "rennes": "Rennes",
    # Lens
    "racing club de lens": "Lens",
    "rc lens": "Lens",
    "lens": "Lens",
    # Strasbourg
    "racing club de strasbourg alsace": "Strasbourg",
    "rc strasbourg": "Strasbourg",
    "strasbourg": "Strasbourg",
    # Toulouse
    "toulouse football club": "Toulouse",
    "toulouse fc": "Toulouse",
    "toulouse": "Toulouse",
    # Nantes
    "football club de nantes": "Nantes",
    "fc nantes": "Nantes",
    "nantes": "Nantes",
    # Montpellier
    "montpellier hsc": "Montpellier",
    "montpellier hsc": "Montpellier",
    "montpellier": "Montpellier",
    # Reims
    "stade reims": "Reims",
    "stade de reims": "Reims",
    "reims": "Reims",
    # Brest
    "stade brestois 29": "Brest",
    "stade brestois": "Brest",
    "brest": "Brest",
    # Le Havre
    "le havre athletic club": "Le Havre",
    "le havre ac": "Le Havre",
    "le havre": "Le Havre",
    # Metz
    "football club de metz": "Metz",
    "fc metz": "Metz",
    "metz": "Metz",
    # Lorient
    "football club lorient-bretagne sud": "Lorient",
    "fc lorient": "Lorient",
    "lorient": "Lorient",
    # Clermont
    "clermont foot 63": "Clermont Foot",
    "clermont foot": "Clermont Foot",
    "clermont": "Clermont Foot",
    # Bordeaux
    "fc girondins bordeaux": "Bordeaux",
    "girondins de bordeaux": "Bordeaux",
    "bordeaux": "Bordeaux",
    # Saint-Etienne
    "as saint-etienne": "Saint-Etienne",
    "saint-etienne": "Saint-Etienne",
    # Angers
    "angers sporting club de l'ouest": "Angers",
    "angers sco": "Angers",
    "angers": "Angers",
    # Dijon
    "dijon fco": "Dijon",
    "dijon": "Dijon",
    # Amiens
    "amiens sc": "Amiens",
    "amiens": "Amiens",
    # Caen
    "sm caen": "Caen",
    "caen": "Caen",
    # Guingamp
    "ea guingamp": "Guingamp",
    "guingamp": "Guingamp",
    # Nimes
    "nimes olympique": "Nimes",
    "nimes": "Nimes",
    # Troyes
    "estac troyes": "Troyes",
    "troyes": "Troyes",
    # Ajaccio
    "ac ajaccio": "AC Ajaccio",
    "gfc ajaccio": "GFC Ajaccio",
    # Nancy
    "as nancy-lorraine": "Nancy",
    "nancy": "Nancy",
    # Bastia
    "sc bastia": "Bastia",
    "bastia": "Bastia",
    # Sochaux
    "fc sochaux-montbeliard": "Sochaux",
    "sochaux": "Sochaux",
    # Valenciennes
    "valenciennes fc": "Valenciennes",
    "valenciennes": "Valenciennes",
    # Evian
    "thonon evian grand geneve fc": "Evian",
    "evian tg fc": "Evian",
    # Paris FC
    "paris football club": "Paris FC",
    "paris fc": "Paris FC",
    # Auxerre
    "association de la jeunesse auxerroise": "Auxerre",
    "aj auxerre": "Auxerre",
    "auxerre": "Auxerre",

    # =========================================================================
    # EREDIVISIE (top 5)
    # =========================================================================
    "afc ajax": "Ajax",
    "ajax amsterdam": "Ajax",
    "ajax": "Ajax",
    "psv eindhoven": "PSV",
    "psv": "PSV",
    "feyenoord rotterdam": "Feyenoord",
    "feyenoord": "Feyenoord",
    "az alkmaar": "AZ Alkmaar",
    "az": "AZ Alkmaar",
    "fc twente": "Twente",
    "twente": "Twente",

    # =========================================================================
    # PORTUGUESE LIGA (top 5)
    # =========================================================================
    "sport lisboa e benfica": "Benfica",
    "sl benfica": "Benfica",
    "benfica": "Benfica",
    "futebol clube do porto": "Porto",
    "fc porto": "Porto",
    "porto": "Porto",
    "sporting clube de portugal": "Sporting CP",
    "sporting cp": "Sporting CP",
    "sporting lisbon": "Sporting CP",
    "sporting": "Sporting CP",
    "sporting clube de braga": "Braga",
    "sc braga": "Braga",
    "braga": "Braga",
    "vitoria sport clube": "Vitoria Guimaraes",
    "vitoria de guimaraes": "Vitoria Guimaraes",
    "vitoria guimaraes": "Vitoria Guimaraes",

    # =========================================================================
    # SAUDI PRO LEAGUE (top 4)
    # =========================================================================
    "al-hilal saudi football club": "Al-Hilal",
    "al-hilal sfc": "Al-Hilal",
    "al-hilal fc": "Al-Hilal",
    "al-hilal club": "Al-Hilal",
    "al-hilal": "Al-Hilal",
    "al hilal": "Al-Hilal",
    "al-ittihad club": "Al-Ittihad",
    "al-ittihad fc": "Al-Ittihad",
    "al-ittihad": "Al-Ittihad",
    "al ittihad": "Al-Ittihad",
    "al-nassr fc": "Al-Nassr",
    "al-nassr": "Al-Nassr",
    "al nassr fc": "Al-Nassr",
    "al nassr": "Al-Nassr",
    "al-ahli saudi fc": "Al-Ahli",
    "al-ahli fc": "Al-Ahli",
    "al-ahli club": "Al-Ahli",
    "al-ahli": "Al-Ahli",
    "al ahli": "Al-Ahli",

    # =========================================================================
    # MLS (top 5)
    # =========================================================================
    "inter miami cf": "Inter Miami",
    "inter miami": "Inter Miami",
    "los angeles football club": "LAFC",
    "lafc": "LAFC",
    "la galaxy": "LA Galaxy",
    "los angeles galaxy": "LA Galaxy",
    "atlanta united fc": "Atlanta United",
    "atlanta united": "Atlanta United",
    "seattle sounders fc": "Seattle Sounders",
    "seattle sounders": "Seattle Sounders",

    # =========================================================================
    # MAJOR SOUTH AMERICAN CLUBS
    # =========================================================================
    # Brazil
    "santos fc": "Santos",
    "santos": "Santos",
    "sociedade esportiva palmeiras": "Palmeiras",
    "se palmeiras": "Palmeiras",
    "palmeiras": "Palmeiras",
    "clube de regatas do flamengo": "Flamengo",
    "cr flamengo": "Flamengo",
    "flamengo": "Flamengo",
    "sport club corinthians paulista": "Corinthians",
    "sc corinthians": "Corinthians",
    "corinthians": "Corinthians",
    "sao paulo fc": "Sao Paulo",
    "sao paulo": "Sao Paulo",
    "sport club internacional": "Internacional",
    "sc internacional": "Internacional",
    "internacional": "Internacional",
    "gremio foot-ball porto alegrense": "Gremio",
    "gremio fbpa": "Gremio",
    "gremio": "Gremio",
    "clube atletico mineiro": "Atletico Mineiro",
    "atletico mineiro": "Atletico Mineiro",
    "atletico-mg": "Atletico Mineiro",
    "botafogo de futebol e regatas": "Botafogo",
    "botafogo fr": "Botafogo",
    "botafogo": "Botafogo",
    "fluminense football club": "Fluminense",
    "fluminense fc": "Fluminense",
    "fluminense": "Fluminense",
    "cruzeiro esporte clube": "Cruzeiro",
    "cruzeiro ec": "Cruzeiro",
    "cruzeiro": "Cruzeiro",
    "america mineiro": "America Mineiro",
    # Argentina
    "club atletico boca juniors": "Boca Juniors",
    "boca juniors": "Boca Juniors",
    "club atletico river plate": "River Plate",
    "river plate": "River Plate",
    "club atletico independiente": "Independiente",
    "independiente": "Independiente",
    "racing club de avellaneda": "Racing Club",
    "racing club": "Racing Club",
    "club atletico san lorenzo de almagro": "San Lorenzo",
    "san lorenzo": "San Lorenzo",
    "club atletico velez sarsfield": "Velez Sarsfield",
    "velez sarsfield": "Velez Sarsfield",
    "argentinos juniors": "Argentinos Juniors",
    "newell's old boys": "Newell's Old Boys",
    "newells old boys": "Newell's Old Boys",
    # Colombia
    "atletico nacional": "Atletico Nacional",
    "club atletico nacional": "Atletico Nacional",
    # Uruguay
    "club atletico penarol": "Penarol",
    "penarol": "Penarol",
    "club nacional de football": "Nacional",
    "nacional": "Nacional",

    # =========================================================================
    # OTHER NOTABLE CLUBS (from DB/career paths)
    # =========================================================================
    # English lower / promoted / relegated
    "west bromwich albion": "West Brom",
    "west brom": "West Brom",
    "watford fc": "Watford",
    "watford": "Watford",
    "leeds united association football club": "Leeds United",
    "leeds united fc": "Leeds United",
    "leeds united": "Leeds United",
    "leeds": "Leeds United",
    "sunderland association football club": "Sunderland",
    "sunderland afc": "Sunderland",
    "sunderland": "Sunderland",
    "middlesbrough fc": "Middlesbrough",
    "middlesbrough": "Middlesbrough",
    "norwich city": "Norwich City",
    "sheffield united": "Sheffield United",
    "reading fc": "Reading",
    "reading": "Reading",
    "queens park rangers": "QPR",
    "qpr": "QPR",
    "hull city": "Hull City",
    "stoke city": "Stoke City",
    "swansea city": "Swansea City",
    "cardiff city": "Cardiff City",
    "huddersfield town": "Huddersfield Town",
    "wigan athletic": "Wigan Athletic",

    # Turkish
    "galatasaray sk": "Galatasaray",
    "galatasaray": "Galatasaray",
    "fenerbahce sk": "Fenerbahce",
    "fenerbahce": "Fenerbahce",
    "besiktas jk": "Besiktas",
    "besiktas": "Besiktas",
    "antalyaspor": "Antalyaspor",
    "adana demirspor": "Adana Demirspor",

    # Russian
    "fc zenit saint petersburg": "Zenit",
    "zenit st. petersburg": "Zenit",
    "zenit": "Zenit",
    "cska moscow": "CSKA Moscow",
    "fc spartak moscow": "Spartak Moscow",
    "spartak moscow": "Spartak Moscow",
    "anzhi makhachkala": "Anzhi Makhachkala",

    # German (additional)
    "1860 munich": "1860 Munich",
    "tsv 1860 munich": "1860 Munich",
    "1.fc nuremberg": "Nuremberg",
    "1. fc nurnberg": "Nuremberg",
    "fc nurnberg": "Nuremberg",
    "nuremberg": "Nuremberg",

    # Other European
    "celtic fc": "Celtic",
    "celtic": "Celtic",
    "rangers fc": "Rangers",
    "rangers": "Rangers",
    "anderlecht": "Anderlecht",
    "rsc anderlecht": "Anderlecht",
    "club brugge kv": "Club Brugge",
    "club brugge": "Club Brugge",
    "royal antwerp fc": "Antwerp",
    "antwerp": "Antwerp",
    "fc shakhtar donetsk": "Shakhtar Donetsk",
    "shakhtar donetsk": "Shakhtar Donetsk",
    "dynamo kyiv": "Dynamo Kyiv",
    "fc dynamo kyiv": "Dynamo Kyiv",
    "olympiacos fc": "Olympiacos",
    "olympiacos": "Olympiacos",
    "panathinaikos fc": "Panathinaikos",
    "panathinaikos": "Panathinaikos",
    "red bull salzburg": "RB Salzburg",
    "fc red bull salzburg": "RB Salzburg",
    "rb salzburg": "RB Salzburg",
    "aik": "AIK",
    "aberdeen": "Aberdeen",

    # Middle East / Asia (additional)
    "al sadd": "Al Sadd",
    "al sadd sc": "Al Sadd",
    "al gharafa": "Al Gharafa",
    "al-gharafa": "Al Gharafa",
    "al-duhail": "Al-Duhail",
    "al duhail": "Al-Duhail",
    "al-rayyan": "Al-Rayyan",
    "al rayyan": "Al-Rayyan",
    "al shabab": "Al Shabab",
    "al-shabab": "Al Shabab",
    "al-wahda": "Al-Wahda",
    "al wahda": "Al-Wahda",
    "al-arabi": "Al-Arabi",
    "al arabi": "Al-Arabi",
    "al ahly": "Al Ahly",
    "al ahly sc": "Al Ahly",
    "al-qadsiah": "Al-Qadsiah",
    "al qadsiah": "Al-Qadsiah",

    # African
    "africa sports": "Africa Sports",
    "abiola babes": "Abiola Babes",
}

# Build reverse map: canonical name -> canonical name (for fuzzy matching target)
_CANONICAL_NAMES: set[str] = set(CLUB_ALIASES.values())

# Common suffixes to strip when looking for a match
_SUFFIXES = [
    " football club", " fc", " s.p.a.", " s.a.d.", " s. a. d.",
    " club", " cf", " calcio", " fussball", " fussball ag",
]


def normalize_club(name: str) -> str:
    """Normalize a club name to its canonical short form.

    Fallback chain:
      1. Exact alias match (after lowercasing + unidecode)
      2. Strip common suffixes, try alias again
      3. Fuzzy match against all canonical names (cutoff=0.8)
      4. Return original name in title case
    """
    if not name or not name.strip():
        return name

    cleaned = unidecode(name).strip().lower()
    # Remove extra whitespace
    cleaned = re.sub(r"\s+", " ", cleaned)

    # 1. Exact match
    if cleaned in CLUB_ALIASES:
        return CLUB_ALIASES[cleaned]

    # 2. Strip suffixes and try again
    stripped = cleaned
    for suffix in _SUFFIXES:
        if stripped.endswith(suffix):
            stripped = stripped[: -len(suffix)].strip()
    if stripped != cleaned and stripped in CLUB_ALIASES:
        return CLUB_ALIASES[stripped]

    # 3. Fuzzy match against canonical names
    candidates = list(_CANONICAL_NAMES)
    matches = difflib.get_close_matches(
        cleaned, [c.lower() for c in candidates], n=1, cutoff=0.8
    )
    if matches:
        # Map the lowercase match back to its proper-cased form
        for c in candidates:
            if c.lower() == matches[0]:
                return c

    # 4. Fallback: title case
    return name.strip().title()


def clubs_match(a: str, b: str) -> bool:
    """Return True if two club names normalize to the same canonical form."""
    return normalize_club(a) == normalize_club(b)
