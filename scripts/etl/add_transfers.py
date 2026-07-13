#!/usr/bin/env python3
"""Append new transfer records to data/transfers.json and remove the duplicate
Joao Cancelo entry (id 192, a stale subset of id 95).

Fees are real reported figures (euros, Transfermarkt-style). Recent 2025/2026
window fees were verified via web search. Uncertain intermediate fees are left
as null; free/end-of-contract moves use "Free"; loans use "Loan".
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PATH = os.path.join(ROOT, "data", "transfers.json")


def t(club_name, club_id, joined, left, fee):
    return {
        "club_name": club_name,
        "club_id": club_id,
        "date_joined": joined,
        "date_left": left,
        "fee": fee,
    }


# Each entry: (player_name, [transfer rows])
NEW = [
    # ---- Iconic / record-breaking (pre-2025), missing from file ----
    ("Luis Figo", [
        t("Sporting CP", "sporting-cp", "1990-07-01", "1995-07-01", None),
        t("FC Barcelona", "fc-barcelona", "1995-07-01", "2000-07-24", "€2.25m"),
        t("Real Madrid", "real-madrid", "2000-07-24", "2005-08-04", "€62m"),
        t("Inter Milan", "inter-milan", "2005-08-04", "2009-05-31", "Free"),
    ]),
    ("Christian Vieri", [
        t("Torino", "torino", "1991-07-01", "1995-07-01", None),
        t("Juventus", "juventus", "1996-07-01", "1997-06-30", "€7m"),
        t("Atletico Madrid", "atletico-madrid", "1997-07-01", "1998-06-30", "€19m"),
        t("Lazio", "lazio", "1998-07-01", "1999-06-30", "€28m"),
        t("Inter Milan", "inter-milan", "1999-06-24", "2005-07-01", "€46.5m"),
        t("AC Milan", "ac-milan", "2005-07-06", "2006-06-30", "Free"),
    ]),
    ("Andriy Shevchenko", [
        t("Dynamo Kyiv", "dynamo-kyiv", "1994-07-01", "1999-07-01", None),
        t("AC Milan", "ac-milan", "1999-07-01", "2006-05-31", "€25m"),
        t("Chelsea", "chelsea", "2006-05-31", "2009-08-28", "€43.9m"),
        t("Dynamo Kyiv", "dynamo-kyiv", "2009-08-28", "2012-07-28", "Free"),
    ]),
    ("Ruud van Nistelrooy", [
        t("Den Bosch", "den-bosch", "1993-07-01", "1997-07-01", None),
        t("Heerenveen", "heerenveen", "1997-07-01", "1998-07-01", "€0.4m"),
        t("PSV Eindhoven", "psv-eindhoven", "1998-07-01", "2001-04-23", "€4.2m"),
        t("Manchester United", "manchester-united", "2001-04-23", "2006-07-28", "€28.5m"),
        t("Real Madrid", "real-madrid", "2006-07-28", "2010-01-30", "€14m"),
        t("Hamburg", "hamburg", "2010-01-30", "2011-07-01", "Free"),
        t("Malaga", "malaga", "2011-07-01", "2012-05-31", "Free"),
    ]),
    ("Pavel Nedved", [
        t("Sparta Prague", "sparta-prague", "1992-07-01", "1996-07-01", None),
        t("Lazio", "lazio", "1996-07-01", "2001-07-01", "€8m"),
        t("Juventus", "juventus", "2001-07-01", "2009-08-27", "€41m"),
    ]),
    ("Rui Costa", [
        t("Benfica", "benfica", "1990-07-01", "1994-07-01", None),
        t("Fiorentina", "fiorentina", "1994-07-01", "2001-07-01", "€1.2m"),
        t("AC Milan", "ac-milan", "2001-07-01", "2006-07-01", "€42m"),
        t("Benfica", "benfica", "2006-07-01", "2008-05-31", "Free"),
    ]),
    ("Filippo Inzaghi", [
        t("Atalanta", "atalanta", "1996-07-01", "1997-07-01", None),
        t("Juventus", "juventus", "1997-07-01", "2001-07-01", "€23m"),
        t("AC Milan", "ac-milan", "2001-07-01", "2012-05-31", "€36.5m"),
    ]),
    ("Nicolas Anelka", [
        t("Paris Saint-Germain", "paris-saint-germain", "1996-07-01", "1997-02-01", None),
        t("Arsenal", "arsenal", "1997-02-01", "1999-08-02", "€0.7m"),
        t("Real Madrid", "real-madrid", "1999-08-02", "2000-07-27", "€35m"),
        t("Paris Saint-Germain", "paris-saint-germain", "2000-07-27", "2002-06-30", "€34m"),
        t("Manchester City", "manchester-city", "2002-06-30", "2005-01-11", "€17m"),
        t("Fenerbahce", "fenerbahce", "2005-01-11", "2006-08-24", "€7m"),
        t("Bolton Wanderers", "bolton-wanderers", "2006-08-24", "2008-01-11", "€10m"),
        t("Chelsea", "chelsea", "2008-01-11", "2012-01-14", "€15m"),
        t("Shanghai Shenhua", "shanghai-shenhua", "2012-01-14", "2012-12-31", "Free"),
        t("West Bromwich Albion", "west-bromwich-albion", "2013-07-01", "2014-03-14", "Free"),
    ]),
    ("Juan Sebastian Veron", [
        t("Boca Juniors", "boca-juniors", "1996-07-01", "1996-09-01", None),
        t("Sampdoria", "sampdoria", "1996-09-01", "1998-07-01", None),
        t("Parma", "parma", "1998-07-01", "1999-07-01", "€18m"),
        t("Lazio", "lazio", "1999-07-01", "2001-07-12", "€35m"),
        t("Manchester United", "manchester-united", "2001-07-12", "2003-08-15", "€42.6m"),
        t("Chelsea", "chelsea", "2003-08-15", "2004-08-31", "€26m"),
        t("Inter Milan", "inter-milan", "2004-08-31", "2006-08-01", "Loan"),
        t("Estudiantes", "estudiantes", "2006-08-01", "2012-08-08", "Free"),
    ]),
    ("Deco", [
        t("Porto", "porto", "1999-07-01", "2004-07-23", None),
        t("FC Barcelona", "fc-barcelona", "2004-07-23", "2008-06-30", "€21m"),
        t("Chelsea", "chelsea", "2008-06-30", "2010-06-30", "€10m"),
        t("Fluminense", "fluminense", "2010-08-31", "2013-08-05", "Free"),
    ]),
    ("Ricardo Carvalho", [
        t("Porto", "porto", "2001-07-01", "2004-07-27", None),
        t("Chelsea", "chelsea", "2004-07-27", "2010-08-27", "€30m"),
        t("Real Madrid", "real-madrid", "2010-08-27", "2013-06-30", "€8m"),
        t("Monaco", "monaco", "2013-08-19", "2016-06-30", "Free"),
    ]),
    ("Fernando Morientes", [
        t("Real Zaragoza", "real-zaragoza", "1995-07-01", "1997-07-01", None),
        t("Real Madrid", "real-madrid", "1997-07-01", "2005-01-01", "€6m"),
        t("Liverpool", "liverpool", "2005-01-11", "2006-08-11", "€9m"),
        t("Valencia", "valencia", "2006-08-11", "2009-07-01", "€3m"),
        t("Marseille", "marseille", "2009-07-01", "2010-06-30", "Free"),
    ]),
    ("Georginio Wijnaldum", [
        t("Feyenoord", "feyenoord", "2007-07-01", "2011-07-01", None),
        t("PSV Eindhoven", "psv-eindhoven", "2011-07-01", "2015-07-10", "€5m"),
        t("Newcastle United", "newcastle-united", "2015-07-10", "2016-07-22", "€18.5m"),
        t("Liverpool", "liverpool", "2016-07-22", "2021-06-30", "€27.5m"),
        t("Paris Saint-Germain", "paris-saint-germain", "2021-06-30", "2023-08-31", "Free"),
        t("Al-Ettifaq", "al-ettifaq", "2023-08-31", None, "€9m"),
    ]),
    ("Cody Gakpo", [
        t("PSV Eindhoven", "psv-eindhoven", "2018-07-01", "2023-01-01", None),
        t("Liverpool", "liverpool", "2023-01-01", None, "€42m"),
    ]),
    ("Donny van de Beek", [
        t("Ajax", "ajax", "2015-07-01", "2020-09-02", None),
        t("Manchester United", "manchester-united", "2020-09-02", "2024-01-10", "€39m"),
        t("Everton", "everton", "2022-01-31", "2022-06-30", "Loan"),
        t("Eintracht Frankfurt", "eintracht-frankfurt", "2024-01-10", None, "Free"),
    ]),
    ("Rafael van der Vaart", [
        t("Ajax", "ajax", "2000-07-01", "2005-08-01", None),
        t("Hamburg", "hamburg", "2005-08-01", "2008-08-01", "€5.5m"),
        t("Real Madrid", "real-madrid", "2008-08-01", "2010-08-31", "€13m"),
        t("Tottenham Hotspur", "tottenham-hotspur", "2010-08-31", "2012-08-31", "€9m"),
        t("Hamburg", "hamburg", "2012-08-31", "2015-07-01", "€13m"),
        t("Real Betis", "real-betis", "2015-07-01", "2016-06-30", "Free"),
    ]),
    ("Klaas-Jan Huntelaar", [
        t("Heerenveen", "heerenveen", "2004-07-01", "2006-01-01", None),
        t("Ajax", "ajax", "2006-01-01", "2009-01-01", "€9m"),
        t("Real Madrid", "real-madrid", "2009-01-01", "2009-08-27", "€27m"),
        t("AC Milan", "ac-milan", "2009-08-27", "2010-08-25", "€14.5m"),
        t("Schalke 04", "schalke-04", "2010-08-25", "2017-06-30", "€13m"),
        t("Ajax", "ajax", "2017-07-01", "2021-06-30", "Free"),
    ]),
    ("Gaizka Mendieta", [
        t("Valencia", "valencia", "1992-07-01", "2001-07-01", None),
        t("Lazio", "lazio", "2001-07-01", "2003-07-01", "€48m"),
        t("Barcelona", "fc-barcelona", "2002-08-01", "2003-06-30", "Loan"),
        t("Middlesbrough", "middlesbrough", "2003-08-01", "2008-06-30", "Free"),
    ]),
    ("Denilson", [
        t("Sao Paulo", "sao-paulo", "1994-07-01", "1998-07-01", None),
        t("Real Betis", "real-betis", "1998-08-01", "2005-06-30", "€31.5m"),
        t("Bordeaux", "bordeaux", "2005-07-01", "2006-06-30", "Free"),
    ]),
    ("Pablo Aimar", [
        t("River Plate", "river-plate", "1996-07-01", "2001-01-01", None),
        t("Valencia", "valencia", "2001-01-01", "2006-08-01", "€24m"),
        t("Real Zaragoza", "real-zaragoza", "2006-08-01", "2008-07-01", "€11m"),
        t("Benfica", "benfica", "2008-07-01", "2013-06-30", "€7m"),
    ]),
    ("Javier Saviola", [
        t("River Plate", "river-plate", "1998-07-01", "2001-07-01", None),
        t("FC Barcelona", "fc-barcelona", "2001-07-01", "2007-06-30", "€35.9m"),
        t("Real Madrid", "real-madrid", "2007-07-01", "2009-06-30", "Free"),
        t("Benfica", "benfica", "2009-07-01", "2012-06-30", "Free"),
    ]),
    ("Diego Milito", [
        t("Genoa", "genoa", "2008-07-01", "2009-06-30", None),
        t("Inter Milan", "inter-milan", "2009-06-30", "2014-06-30", "€28m"),
        t("Racing Club", "racing-club", "2014-07-01", "2016-05-31", "Free"),
    ]),
    ("Walter Samuel", [
        t("Boca Juniors", "boca-juniors", "1997-07-01", "2000-07-01", None),
        t("Roma", "roma", "2000-07-01", "2004-07-01", "€18m"),
        t("Real Madrid", "real-madrid", "2004-07-01", "2005-08-01", "€25m"),
        t("Inter Milan", "inter-milan", "2005-08-01", "2014-06-30", "€16m"),
    ]),
    ("Esteban Cambiasso", [
        t("Independiente", "independiente", "1998-07-01", "2002-07-01", None),
        t("Real Madrid", "real-madrid", "2002-07-01", "2004-07-01", "Free"),
        t("Inter Milan", "inter-milan", "2004-07-01", "2014-07-01", "Free"),
        t("Leicester City", "leicester-city", "2014-08-25", "2015-06-30", "Free"),
    ]),
    ("Maicon", [
        t("Cruzeiro", "cruzeiro", "2001-07-01", "2004-08-01", None),
        t("Monaco", "monaco", "2004-08-01", "2006-07-01", "€6m"),
        t("Inter Milan", "inter-milan", "2006-07-01", "2012-07-01", "€6m"),
        t("Manchester City", "manchester-city", "2012-07-01", "2013-08-01", "€4m"),
        t("Roma", "roma", "2013-08-01", "2016-06-30", "€2.5m"),
    ]),
    ("Lucio", [
        t("Internacional", "internacional", "1997-07-01", "2001-07-01", None),
        t("Bayer Leverkusen", "bayer-leverkusen", "2001-07-01", "2004-07-01", "€8m"),
        t("Bayern Munich", "bayern-munich", "2004-07-01", "2009-07-01", "€12m"),
        t("Inter Milan", "inter-milan", "2009-07-01", "2012-06-30", "Free"),
        t("Juventus", "juventus", "2012-08-01", "2013-01-31", "Free"),
    ]),
    ("Julio Cesar", [
        t("Flamengo", "flamengo", "1997-07-01", "2005-08-01", None),
        t("Inter Milan", "inter-milan", "2005-08-01", "2012-08-01", "€0.25m"),
        t("Queens Park Rangers", "queens-park-rangers", "2012-08-31", "2014-02-01", "Free"),
        t("Benfica", "benfica", "2014-09-01", "2018-05-31", "Free"),
    ]),
    ("Christian Panucci", [
        t("AC Milan", "ac-milan", "1993-07-01", "1996-07-01", None),
        t("Real Madrid", "real-madrid", "1996-07-01", "1999-07-01", "€10m"),
        t("Inter Milan", "inter-milan", "1999-07-01", "2001-07-01", "€24m"),
        t("Roma", "roma", "2001-07-01", "2009-06-30", "Free"),
    ]),
    ("Dida", [
        t("Corinthians", "corinthians", "1999-07-01", "2000-07-01", None),
        t("AC Milan", "ac-milan", "2000-07-01", "2010-06-30", "€4m"),
    ]),
    ("Michael Laudrup", [
        t("Juventus", "juventus", "1985-07-01", "1989-07-01", None),
        t("FC Barcelona", "fc-barcelona", "1989-07-01", "1994-07-01", None),
        t("Real Madrid", "real-madrid", "1994-07-01", "1996-07-01", "Free"),
        t("Ajax", "ajax", "1997-07-01", "1998-07-01", "Free"),
    ]),
    ("Paul Gascoigne", [
        t("Newcastle United", "newcastle-united", "1985-07-01", "1988-07-01", None),
        t("Tottenham Hotspur", "tottenham-hotspur", "1988-07-01", "1992-07-01", "€2.5m"),
        t("Lazio", "lazio", "1992-07-01", "1995-07-01", "€5.5m"),
        t("Rangers", "rangers", "1995-07-01", "1998-03-01", "€4.7m"),
        t("Middlesbrough", "middlesbrough", "1998-03-01", "2000-07-01", "€4.3m"),
        t("Everton", "everton", "2000-07-01", "2002-07-01", "Free"),
    ]),
    ("Andy Cole", [
        t("Newcastle United", "newcastle-united", "1993-03-01", "1995-01-01", None),
        t("Manchester United", "manchester-united", "1995-01-01", "2001-12-29", "€8m"),
        t("Blackburn Rovers", "blackburn-rovers", "2001-12-29", "2004-07-01", "€11.5m"),
        t("Fulham", "fulham", "2004-07-01", "2005-07-01", "€2.5m"),
        t("Manchester City", "manchester-city", "2005-07-01", "2006-07-01", "€0.75m"),
    ]),
    ("Dwight Yorke", [
        t("Aston Villa", "aston-villa", "1989-12-01", "1998-08-01", None),
        t("Manchester United", "manchester-united", "1998-08-01", "2002-07-01", "€18.6m"),
        t("Blackburn Rovers", "blackburn-rovers", "2002-07-01", "2004-07-01", "€3m"),
        t("Sydney FC", "sydney-fc", "2005-08-01", "2006-07-01", "Free"),
        t("Sunderland", "sunderland", "2006-08-01", "2009-06-30", "€0.3m"),
    ]),
    ("Gianluca Vialli", [
        t("Sampdoria", "sampdoria", "1984-07-01", "1992-07-01", None),
        t("Juventus", "juventus", "1992-07-01", "1996-07-01", "€16.5m"),
        t("Chelsea", "chelsea", "1996-07-01", "1999-05-31", "Free"),
    ]),
    ("Thiago Alcantara", [
        t("FC Barcelona", "fc-barcelona", "2009-07-01", "2013-07-14", None),
        t("Bayern Munich", "bayern-munich", "2013-07-14", "2020-09-18", "€25m"),
        t("Liverpool", "liverpool", "2020-09-18", "2024-06-30", "€22m"),
    ]),
    ("Javi Martinez", [
        t("Athletic Bilbao", "athletic-bilbao", "2006-07-01", "2012-08-29", None),
        t("Bayern Munich", "bayern-munich", "2012-08-29", "2021-07-01", "€40m"),
        t("Qatar SC", "qatar-sc", "2021-08-01", "2023-06-30", "Free"),
    ]),
    ("Mario Gomez", [
        t("VfB Stuttgart", "vfb-stuttgart", "2003-07-01", "2009-07-01", None),
        t("Bayern Munich", "bayern-munich", "2009-07-01", "2013-07-01", "€30m"),
        t("Fiorentina", "fiorentina", "2013-07-01", "2015-08-01", "€15.5m"),
        t("Besiktas", "besiktas", "2015-08-01", "2016-07-01", "€3m"),
        t("VfL Wolfsburg", "vfl-wolfsburg", "2016-08-01", "2018-01-01", "€3m"),
        t("VfB Stuttgart", "vfb-stuttgart", "2018-01-01", "2020-06-30", "€3m"),
    ]),
    ("Mario Gotze", [
        t("Borussia Dortmund", "borussia-dortmund", "2009-07-01", "2013-07-01", None),
        t("Bayern Munich", "bayern-munich", "2013-07-01", "2016-07-01", "€37m"),
        t("Borussia Dortmund", "borussia-dortmund", "2016-07-01", "2020-06-30", "€22m"),
        t("PSV Eindhoven", "psv-eindhoven", "2020-10-05", "2022-06-30", "Free"),
        t("Eintracht Frankfurt", "eintracht-frankfurt", "2022-07-01", None, "€4m"),
    ]),
    ("Sami Khedira", [
        t("VfB Stuttgart", "vfb-stuttgart", "2007-07-01", "2010-07-30", None),
        t("Real Madrid", "real-madrid", "2010-07-30", "2015-07-01", "€14m"),
        t("Juventus", "juventus", "2015-07-01", "2021-02-01", "Free"),
        t("Hertha Berlin", "hertha-berlin", "2021-02-01", "2021-06-30", "Free"),
    ]),
    ("Jordi Alba", [
        t("Valencia", "valencia", "2008-07-01", "2012-07-04", None),
        t("FC Barcelona", "fc-barcelona", "2012-07-04", "2023-06-30", "€14m"),
        t("Inter Miami CF", "inter-miami", "2023-07-01", None, "Free"),
    ]),
    ("Paulo Dybala", [
        t("Palermo", "palermo", "2012-07-01", "2015-06-05", None),
        t("Juventus", "juventus", "2015-06-05", "2022-06-30", "€32m"),
        t("Roma", "roma", "2022-07-20", None, "Free"),
    ]),
    ("Miralem Pjanic", [
        t("Lyon", "lyon", "2008-07-01", "2011-07-01", None),
        t("Roma", "roma", "2011-07-01", "2016-06-13", "€11m"),
        t("Juventus", "juventus", "2016-06-13", "2020-06-30", "€32m"),
        t("FC Barcelona", "fc-barcelona", "2020-06-30", "2023-01-01", "€60m"),
    ]),
    ("Juan Cuadrado", [
        t("Fiorentina", "fiorentina", "2012-07-01", "2015-02-02", None),
        t("Chelsea", "chelsea", "2015-02-02", "2017-07-01", "€30m"),
        t("Juventus", "juventus", "2017-07-01", "2023-06-30", "€20m"),
        t("Inter Milan", "inter-milan", "2023-08-16", "2024-06-30", "Free"),
    ]),
    ("Federico Bernardeschi", [
        t("Fiorentina", "fiorentina", "2013-07-01", "2017-07-24", None),
        t("Juventus", "juventus", "2017-07-24", "2022-06-30", "€40m"),
        t("Toronto FC", "toronto-fc", "2022-07-01", None, "Free"),
    ]),
    ("Andrea Barzagli", [
        t("Palermo", "palermo", "2004-07-01", "2008-01-01", None),
        t("VfL Wolfsburg", "vfl-wolfsburg", "2008-01-01", "2011-01-26", "€12m"),
        t("Juventus", "juventus", "2011-01-26", "2019-06-30", "€0.3m"),
    ]),
    ("Alex Sandro", [
        t("Porto", "porto", "2011-08-01", "2015-08-20", None),
        t("Juventus", "juventus", "2015-08-20", "2024-06-30", "€26m"),
        t("Flamengo", "flamengo", "2024-08-01", None, "Free"),
    ]),
    ("Hulk", [
        t("Porto", "porto", "2008-07-01", "2012-09-03", None),
        t("Zenit Saint Petersburg", "zenit-saint-petersburg", "2012-09-03", "2016-07-01", "€40m"),
        t("Shanghai Port", "shanghai-port", "2016-07-01", "2020-12-31", "€55.8m"),
        t("Atletico Mineiro", "atletico-mineiro", "2021-01-01", None, "Free"),
    ]),
    ("Ramires", [
        t("Benfica", "benfica", "2009-07-01", "2010-08-13", None),
        t("Chelsea", "chelsea", "2010-08-13", "2016-01-28", "€22m"),
        t("Jiangsu Suning", "jiangsu-suning", "2016-01-28", "2019-12-31", "€28m"),
    ]),
    ("Javier Pastore", [
        t("Huracan", "huracan", "2008-07-01", "2009-08-01", None),
        t("Palermo", "palermo", "2009-08-01", "2011-08-08", "€4.7m"),
        t("Paris Saint-Germain", "paris-saint-germain", "2011-08-08", "2018-06-26", "€42m"),
        t("Roma", "roma", "2018-06-26", "2021-06-30", "€24.7m"),
    ]),
    ("Ezequiel Lavezzi", [
        t("San Lorenzo", "san-lorenzo", "2004-07-01", "2007-07-01", None),
        t("Napoli", "napoli", "2007-07-01", "2012-06-27", "€5.75m"),
        t("Paris Saint-Germain", "paris-saint-germain", "2012-06-27", "2016-02-01", "€26m"),
        t("Hebei FC", "hebei-fc", "2016-02-01", "2019-12-31", "Free"),
    ]),
    ("Andriy Arshavin", [
        t("Zenit Saint Petersburg", "zenit-saint-petersburg", "2000-07-01", "2009-02-02", None),
        t("Arsenal", "arsenal", "2009-02-02", "2013-06-30", "€18m"),
        t("Zenit Saint Petersburg", "zenit-saint-petersburg", "2013-06-30", "2015-06-30", "Free"),
    ]),
    ("Yuri Zhirkov", [
        t("CSKA Moscow", "cska-moscow", "2004-07-01", "2009-07-13", None),
        t("Chelsea", "chelsea", "2009-07-13", "2011-08-01", "€21m"),
        t("Anzhi Makhachkala", "anzhi-makhachkala", "2011-08-01", "2013-08-01", "€15m"),
        t("Zenit Saint Petersburg", "zenit-saint-petersburg", "2013-08-01", "2020-08-01", "Free"),
    ]),
    ("Fernando Redondo", [
        t("Argentinos Juniors", "argentinos-juniors", "1985-07-01", "1990-07-01", None),
        t("Tenerife", "tenerife", "1990-07-01", "1994-07-01", None),
        t("Real Madrid", "real-madrid", "1994-07-01", "2000-08-01", None),
        t("AC Milan", "ac-milan", "2000-08-01", "2004-06-30", "€17m"),
    ]),

    # ---- Verified 2024 window moves (missing players) ----
    ("Scott McTominay", [
        t("Manchester United", "manchester-united", "2017-05-01", "2024-08-30", None),
        t("Napoli", "napoli", "2024-08-30", None, "€30.5m"),
    ]),
    ("Joshua Zirkzee", [
        t("Bayern Munich", "bayern-munich", "2018-07-01", "2022-07-01", None),
        t("Bologna", "bologna", "2022-08-05", "2024-07-12", "€8.5m"),
        t("Manchester United", "manchester-united", "2024-07-12", None, "€42.5m"),
    ]),
    ("Serhou Guirassy", [
        t("Rennes", "rennes", "2019-08-01", "2022-01-31", None),
        t("VfB Stuttgart", "vfb-stuttgart", "2022-01-31", "2024-08-16", "€9m"),
        t("Borussia Dortmund", "borussia-dortmund", "2024-08-16", None, "€18m"),
    ]),
    ("Artem Dovbyk", [
        t("Girona", "girona", "2023-08-01", "2024-08-08", None),
        t("Roma", "roma", "2024-08-08", None, "€30.5m"),
    ]),
    ("Riccardo Calafiori", [
        t("Roma", "roma", "2019-07-01", "2022-07-01", None),
        t("Basel", "basel", "2022-07-01", "2023-08-01", "€4m"),
        t("Bologna", "bologna", "2023-08-01", "2024-07-29", "€4m"),
        t("Arsenal", "arsenal", "2024-07-29", None, "€45m"),
    ]),
    ("Dominic Solanke", [
        t("Chelsea", "chelsea", "2015-07-01", "2017-07-01", None),
        t("Liverpool", "liverpool", "2017-07-01", "2019-01-04", "Free"),
        t("Bournemouth", "bournemouth", "2019-01-04", "2024-08-17", "€22m"),
        t("Tottenham Hotspur", "tottenham-hotspur", "2024-08-17", None, "€64m"),
    ]),
    ("Youssouf Fofana", [
        t("Strasbourg", "strasbourg", "2018-07-01", "2020-01-30", None),
        t("Monaco", "monaco", "2020-01-30", "2024-08-14", "€15m"),
        t("AC Milan", "ac-milan", "2024-08-14", None, "€25m"),
    ]),

    # ---- Verified summer 2025 window moves (missing players) ----
    ("Hugo Ekitike", [
        t("Reims", "reims", "2021-07-01", "2022-01-01", None),
        t("Paris Saint-Germain", "paris-saint-germain", "2022-01-01", "2024-08-30", "€28.5m"),
        t("Eintracht Frankfurt", "eintracht-frankfurt", "2024-08-30", "2025-07-23", "€16.5m"),
        t("Liverpool", "liverpool", "2025-07-23", None, "€95m"),
    ]),
    ("Nick Woltemade", [
        t("Werder Bremen", "werder-bremen", "2020-07-01", "2024-08-01", None),
        t("VfB Stuttgart", "vfb-stuttgart", "2024-08-01", "2025-08-30", "Free"),
        t("Newcastle United", "newcastle-united", "2025-08-30", None, "€85m"),
    ]),
    ("Martin Zubimendi", [
        t("Real Sociedad", "real-sociedad", "2019-07-01", "2025-07-01", None),
        t("Arsenal", "arsenal", "2025-07-01", None, "€70m"),
    ]),
    ("Viktor Gyokeres", [
        t("Brighton", "brighton", "2018-01-01", "2021-08-01", None),
        t("Coventry City", "coventry-city", "2021-08-01", "2023-07-24", "€1.5m"),
        t("Sporting CP", "sporting-cp", "2023-07-24", "2025-07-26", "€20m"),
        t("Arsenal", "arsenal", "2025-07-26", None, "€65m"),
    ]),
    ("Illia Zabarnyi", [
        t("Dynamo Kyiv", "dynamo-kyiv", "2020-07-01", "2023-01-24", None),
        t("Bournemouth", "bournemouth", "2023-01-24", "2025-08-13", "€23.5m"),
        t("Paris Saint-Germain", "paris-saint-germain", "2025-08-13", None, "€63m"),
    ]),
    ("Anthony Elanga", [
        t("Manchester United", "manchester-united", "2021-05-01", "2023-08-31", None),
        t("Nottingham Forest", "nottingham-forest", "2023-08-31", "2025-07-25", "€17m"),
        t("Newcastle United", "newcastle-united", "2025-07-25", None, "€60m"),
    ]),
    ("Mateo Retegui", [
        t("Tigre", "tigre", "2022-07-01", "2023-08-01", None),
        t("Genoa", "genoa", "2023-08-01", "2024-08-01", "€15m"),
        t("Atalanta", "atalanta", "2024-08-01", "2025-07-20", "€22m"),
        t("Al-Qadsiah", "al-qadsiah", "2025-07-20", None, "€65m"),
    ]),
    ("Dean Huijsen", [
        t("Juventus", "juventus", "2021-07-01", "2024-08-01", None),
        t("Bournemouth", "bournemouth", "2024-08-01", "2025-06-01", "€15m"),
        t("Real Madrid", "real-madrid", "2025-06-01", None, "€60m"),
    ]),

    # ---- Verified current summer 2026 window moves (missing players) ----
    ("Elliot Anderson", [
        t("Newcastle United", "newcastle-united", "2020-07-01", "2024-08-30", None),
        t("Nottingham Forest", "nottingham-forest", "2024-08-30", "2026-07-01", "€38m"),
        t("Manchester City", "manchester-city", "2026-07-01", None, "€135m"),
    ]),
    ("Anthony Gordon", [
        t("Everton", "everton", "2020-07-01", "2023-01-29", None),
        t("Newcastle United", "newcastle-united", "2023-01-29", "2026-07-01", "€45m"),
        t("FC Barcelona", "fc-barcelona", "2026-07-01", None, "€80m"),
    ]),
    ("Orkun Kokcu", [
        t("Feyenoord", "feyenoord", "2018-07-01", "2023-07-01", None),
        t("Benfica", "benfica", "2023-07-01", "2026-07-01", "€25m"),
        t("Besiktas", "besiktas", "2026-07-01", None, "€30m"),
    ]),
    ("Jan Paul van Hecke", [
        t("Brighton", "brighton", "2020-08-01", "2026-07-01", None),
        t("Tottenham Hotspur", "tottenham-hotspur", "2026-07-01", None, "€60m"),
    ]),
    ("Geovany Quenda", [
        t("Sporting CP", "sporting-cp", "2024-07-01", "2026-07-01", None),
        t("Chelsea", "chelsea", "2026-07-01", None, "€51m"),
    ]),
    ("Mateus Fernandes", [
        t("Sporting CP", "sporting-cp", "2022-07-01", "2024-08-01", None),
        t("Southampton", "southampton", "2024-08-01", "2025-08-01", "€17m"),
        t("West Ham United", "west-ham-united", "2025-08-01", "2026-07-01", None),
        t("Tottenham Hotspur", "tottenham-hotspur", "2026-07-01", None, "€98m"),
    ]),
]


def main():
    with open(PATH, encoding="utf-8") as f:
        data = json.load(f)

    before = len(data)

    # Remove duplicate Joao Cancelo (id 192, stale subset of id 95)
    data = [p for p in data if p["player_id"] != 192]
    removed_dupe = before - len(data)

    existing_names = {p["player_name"] for p in data}
    next_id = max(p["player_id"] for p in data) + 1

    added = 0
    skipped = []
    for name, transfers in NEW:
        if name in existing_names:
            skipped.append(name)
            continue
        data.append({
            "player_id": next_id,
            "player_name": name,
            "transfers": transfers,
        })
        existing_names.add(name)
        next_id += 1
        added += 1

    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"before: {before}")
    print(f"removed duplicate entries: {removed_dupe}")
    print(f"added: {added}")
    print(f"skipped (already present): {skipped}")
    print(f"after: {len(data)}")


if __name__ == "__main__":
    main()
