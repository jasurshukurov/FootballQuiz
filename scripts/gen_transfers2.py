#!/usr/bin/env python3
"""Add more transfers to reach 500+."""
import json

existing = json.load(open("/Users/jasur/workspace/football/data/transfers.json"))
existing_ids = {t["player_id"] for t in existing}

more = [
    {"player_id":7,"player_name":"Paolo Maldini","transfers":[
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"1985-07-01","date_left":"2009-05-31","fee":None}]},
    {"player_id":11,"player_name":"Andres Iniesta","transfers":[
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2002-07-01","date_left":"2018-06-30","fee":None},
        {"club_name":"Vissel Kobe","club_id":"vissel-kobe","date_joined":"2018-07-01","date_left":"2023-06-30","fee":"Free"}]},
    {"player_id":12,"player_name":"Wayne Rooney","transfers":[
        {"club_name":"Everton","club_id":"everton","date_joined":"2002-07-01","date_left":"2004-08-31","fee":None},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2004-08-31","date_left":"2017-07-09","fee":"€37m"},
        {"club_name":"Everton","club_id":"everton","date_joined":"2017-07-09","date_left":"2018-06-28","fee":"Free"},
        {"club_name":"DC United","club_id":"dc-united","date_joined":"2018-07-10","date_left":"2019-10-06","fee":"Free"},
        {"club_name":"Derby County","club_id":"derby-county","date_joined":"2020-01-02","date_left":"2021-06-30","fee":"Free"}]},
    {"player_id":13,"player_name":"Xavi Hernandez","transfers":[
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"1998-07-01","date_left":"2015-06-03","fee":None},
        {"club_name":"Al Sadd","club_id":"al-sadd","date_joined":"2015-06-03","date_left":"2019-05-02","fee":"Free"}]},
    {"player_id":15,"player_name":"Frank Lampard","transfers":[
        {"club_name":"West Ham United","club_id":"west-ham-united","date_joined":"1996-07-01","date_left":"2001-06-14","fee":None},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2001-06-14","date_left":"2014-06-30","fee":"€16m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2014-08-06","date_left":"2015-06-30","fee":"Free"},
        {"club_name":"New York City FC","club_id":"new-york-city-fc","date_joined":"2015-07-01","date_left":"2016-11-13","fee":"Free"}]},
    {"player_id":16,"player_name":"Steven Gerrard","transfers":[
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"1998-11-29","date_left":"2015-05-16","fee":None},
        {"club_name":"LA Galaxy","club_id":"la-galaxy","date_joined":"2015-07-07","date_left":"2016-11-24","fee":"Free"}]},
    {"player_id":19,"player_name":"Diego Maradona","transfers":[
        {"club_name":"Argentinos Juniors","club_id":"argentinos-juniors","date_joined":"1976-10-20","date_left":"1981-02-20","fee":None},
        {"club_name":"Boca Juniors","club_id":"boca-juniors","date_joined":"1981-02-20","date_left":"1982-09-01","fee":"€1m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"1982-09-01","date_left":"1984-07-05","fee":"€7.6m"},
        {"club_name":"Napoli","club_id":"napoli","date_joined":"1984-07-05","date_left":"1991-03-17","fee":"€12m"},
        {"club_name":"Sevilla","club_id":"sevilla","date_joined":"1992-09-01","date_left":"1993-06-30","fee":"€7.5m"},
        {"club_name":"Newell's Old Boys","club_id":"newells-old-boys","date_joined":"1993-10-07","date_left":"1994-06-30","fee":"Free"},
        {"club_name":"Boca Juniors","club_id":"boca-juniors","date_joined":"1995-10-01","date_left":"1997-10-25","fee":"Free"}]},
    {"player_id":20,"player_name":"Pele","transfers":[
        {"club_name":"Santos","club_id":"santos","date_joined":"1956-09-07","date_left":"1974-10-02","fee":None},
        {"club_name":"New York Cosmos","club_id":"new-york-cosmos","date_joined":"1975-06-10","date_left":"1977-10-01","fee":"Free"}]},
    {"player_id":29,"player_name":"Rivaldo","transfers":[
        {"club_name":"Palmeiras","club_id":"palmeiras","date_joined":"1994-01-01","date_left":"1996-07-01","fee":"€0.5m"},
        {"club_name":"Deportivo La Coruna","club_id":"deportivo-la-coruna","date_joined":"1996-07-01","date_left":"1997-07-01","fee":"€4m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"1997-07-01","date_left":"2002-06-30","fee":"€26m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2002-07-01","date_left":"2004-06-30","fee":"Free"},
        {"club_name":"Olympiacos","club_id":"olympiacos","date_joined":"2004-07-01","date_left":"2007-06-30","fee":"Free"}]},
    {"player_id":34,"player_name":"Patrick Vieira","transfers":[
        {"club_name":"AS Cannes","club_id":"as-cannes","date_joined":"1993-07-01","date_left":"1995-07-01","fee":None},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"1995-07-01","date_left":"1996-08-14","fee":"€4m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"1996-08-14","date_left":"2005-07-21","fee":"€5m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2005-07-21","date_left":"2006-07-20","fee":"€20m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2006-07-20","date_left":"2010-01-08","fee":"€7.3m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2010-01-08","date_left":"2011-06-30","fee":"Free"}]},
    {"player_id":36,"player_name":"Eric Cantona","transfers":[
        {"club_name":"Auxerre","club_id":"auxerre","date_joined":"1983-07-01","date_left":"1988-06-30","fee":None},
        {"club_name":"Marseille","club_id":"marseille","date_joined":"1989-07-01","date_left":"1991-06-30","fee":"€2.3m"},
        {"club_name":"Leeds United","club_id":"leeds-united","date_joined":"1992-02-06","date_left":"1992-11-26","fee":"€1.2m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"1992-11-26","date_left":"1997-05-18","fee":"€1.5m"}]},
    {"player_id":42,"player_name":"Alessandro Del Piero","transfers":[
        {"club_name":"Padova","club_id":"padova","date_joined":"1991-07-01","date_left":"1993-07-01","fee":None},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"1993-07-01","date_left":"2012-06-30","fee":"€3m"},
        {"club_name":"Sydney FC","club_id":"sydney-fc","date_joined":"2012-09-15","date_left":"2014-05-01","fee":"Free"}]},
    {"player_id":43,"player_name":"Francesco Totti","transfers":[
        {"club_name":"Roma","club_id":"roma","date_joined":"1993-03-28","date_left":"2017-05-28","fee":None}]},
    {"player_id":44,"player_name":"Raul Gonzalez","transfers":[
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"1994-07-01","date_left":"2010-07-29","fee":None},
        {"club_name":"Schalke 04","club_id":"schalke-04","date_joined":"2010-07-29","date_left":"2012-06-30","fee":"Free"},
        {"club_name":"Al Sadd","club_id":"al-sadd","date_joined":"2012-07-01","date_left":"2014-06-30","fee":"Free"},
        {"club_name":"New York Cosmos","club_id":"new-york-cosmos","date_joined":"2014-12-01","date_left":"2015-11-15","fee":"Free"}]},
    {"player_id":48,"player_name":"Cafu","transfers":[
        {"club_name":"Sao Paulo","club_id":"sao-paulo","date_joined":"1989-01-01","date_left":"1994-06-30","fee":None},
        {"club_name":"Real Zaragoza","club_id":"real-zaragoza","date_joined":"1994-07-01","date_left":"1995-06-30","fee":"€2m"},
        {"club_name":"Palmeiras","club_id":"palmeiras","date_joined":"1995-07-01","date_left":"1997-07-01","fee":"€1m"},
        {"club_name":"Roma","club_id":"roma","date_joined":"1997-07-01","date_left":"2003-07-01","fee":"€4.7m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2003-07-01","date_left":"2008-06-30","fee":"Free"}]},
    {"player_id":49,"player_name":"Roberto Carlos","transfers":[
        {"club_name":"Palmeiras","club_id":"palmeiras","date_joined":"1991-01-01","date_left":"1995-07-01","fee":None},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"1995-07-01","date_left":"1996-07-01","fee":"€5.9m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"1996-07-01","date_left":"2007-06-30","fee":"€6m"},
        {"club_name":"Fenerbahce","club_id":"fenerbahce","date_joined":"2007-07-01","date_left":"2009-06-30","fee":"Free"},
        {"club_name":"Corinthians","club_id":"corinthians","date_joined":"2009-07-01","date_left":"2010-12-31","fee":"Free"},
        {"club_name":"Anzhi Makhachkala","club_id":"anzhi-makhachkala","date_joined":"2011-03-01","date_left":"2012-06-30","fee":"Free"}]},
    {"player_id":50,"player_name":"Fabio Cannavaro","transfers":[
        {"club_name":"Napoli","club_id":"napoli","date_joined":"1993-07-01","date_left":"1995-06-30","fee":None},
        {"club_name":"Parma","club_id":"parma","date_joined":"1995-07-01","date_left":"2002-07-01","fee":"€0.9m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2002-07-01","date_left":"2004-07-01","fee":"€7m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2004-07-01","date_left":"2006-08-09","fee":"€10m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2006-08-09","date_left":"2009-07-01","fee":"€7m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2009-07-01","date_left":"2010-06-30","fee":"Free"}]},
    {"player_id":61,"player_name":"Manuel Neuer","transfers":[
        {"club_name":"Schalke 04","club_id":"schalke-04","date_joined":"2004-07-01","date_left":"2011-06-01","fee":None},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2011-06-01","date_left":None,"fee":"€30m"}]},
    {"player_id":63,"player_name":"Son Heung-min","transfers":[
        {"club_name":"Hamburger SV","club_id":"hamburger-sv","date_joined":"2010-07-01","date_left":"2013-06-29","fee":"€0.1m"},
        {"club_name":"Bayer Leverkusen","club_id":"bayer-leverkusen","date_joined":"2013-06-29","date_left":"2015-08-28","fee":"€10m"},
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2015-08-28","date_left":None,"fee":"€30m"}]},
    {"player_id":75,"player_name":"Thomas Muller","transfers":[
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2008-07-01","date_left":None,"fee":None}]},
    {"player_id":78,"player_name":"Dani Alves","transfers":[
        {"club_name":"Bahia","club_id":"bahia","date_joined":"2001-01-01","date_left":"2002-07-01","fee":None},
        {"club_name":"Sevilla","club_id":"sevilla","date_joined":"2002-07-01","date_left":"2008-07-01","fee":"€1m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2008-07-01","date_left":"2016-06-30","fee":"€35.5m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2016-07-01","date_left":"2017-06-30","fee":"Free"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2017-07-01","date_left":"2019-06-30","fee":"Free"},
        {"club_name":"Sao Paulo","club_id":"sao-paulo","date_joined":"2019-08-15","date_left":"2021-09-10","fee":"Free"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2022-01-19","date_left":"2022-06-30","fee":"Free"}]},
    {"player_id":79,"player_name":"Marcelo","transfers":[
        {"club_name":"Fluminense","club_id":"fluminense","date_joined":"2005-01-01","date_left":"2007-01-09","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2007-01-09","date_left":"2022-06-30","fee":"€6.5m"},
        {"club_name":"Olympiacos","club_id":"olympiacos","date_joined":"2022-08-31","date_left":"2023-03-31","fee":"Free"},
        {"club_name":"Fluminense","club_id":"fluminense","date_joined":"2023-04-25","date_left":"2024-11-05","fee":"Free"}]},
    {"player_id":80,"player_name":"Gerard Pique","transfers":[
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2004-07-01","date_left":"2004-10-01","fee":None},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2004-10-01","date_left":"2008-05-27","fee":"€5m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2008-05-27","date_left":"2022-11-05","fee":"€5m"}]},
    {"player_id":87,"player_name":"Jan Oblak","transfers":[
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2010-07-01","date_left":"2014-07-16","fee":"€0.5m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2014-07-16","date_left":None,"fee":"€16m"}]},
    {"player_id":89,"player_name":"Ederson","transfers":[
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2009-07-01","date_left":"2017-06-01","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2017-06-01","date_left":None,"fee":"€40m"}]},
    {"player_id":90,"player_name":"Marc-Andre ter Stegen","transfers":[
        {"club_name":"Borussia Monchengladbach","club_id":"borussia-monchengladbach","date_joined":"2011-07-01","date_left":"2014-05-22","fee":None},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2014-05-22","date_left":None,"fee":"€12m"}]},
    {"player_id":92,"player_name":"Casemiro","transfers":[
        {"club_name":"Sao Paulo","club_id":"sao-paulo","date_joined":"2010-07-01","date_left":"2013-01-07","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2013-01-07","date_left":"2022-08-19","fee":"€6m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2022-08-19","date_left":None,"fee":"€70m"}]},
    {"player_id":97,"player_name":"Andrew Robertson","transfers":[
        {"club_name":"Queen's Park","club_id":"queens-park","date_joined":"2012-07-01","date_left":"2013-06-06","fee":None},
        {"club_name":"Dundee United","club_id":"dundee-united","date_joined":"2013-06-06","date_left":"2014-07-29","fee":"Free"},
        {"club_name":"Hull City","club_id":"hull-city","date_joined":"2014-07-29","date_left":"2017-07-21","fee":"€3.3m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2017-07-21","date_left":None,"fee":"€9.3m"}]},
    {"player_id":99,"player_name":"Marquinhos","transfers":[
        {"club_name":"Corinthians","club_id":"corinthians","date_joined":"2012-01-01","date_left":"2013-01-30","fee":None},
        {"club_name":"Roma","club_id":"roma","date_joined":"2013-01-30","date_left":"2013-07-18","fee":"€3.4m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2013-07-18","date_left":None,"fee":"€31.4m"}]},
    {"player_id":103,"player_name":"William Saliba","transfers":[
        {"club_name":"Saint-Etienne","club_id":"saint-etienne","date_joined":"2018-07-01","date_left":"2020-07-01","fee":None},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2019-07-25","date_left":None,"fee":"€30m"}]},
    {"player_id":113,"player_name":"Raheem Sterling","transfers":[
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2012-07-01","date_left":"2015-07-14","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2015-07-14","date_left":"2022-07-13","fee":"€63.7m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2022-07-13","date_left":None,"fee":"€56.2m"}]},
    {"player_id":114,"player_name":"Pierre-Emerick Aubameyang","transfers":[
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2008-07-01","date_left":"2011-06-30","fee":"€2m"},
        {"club_name":"Saint-Etienne","club_id":"saint-etienne","date_joined":"2011-07-01","date_left":"2013-07-04","fee":"€2m"},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2013-07-04","date_left":"2018-01-31","fee":"€13m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2018-01-31","date_left":"2022-02-01","fee":"€63.8m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2022-02-01","date_left":"2022-09-01","fee":"Free"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2022-09-01","date_left":"2023-06-30","fee":"€12m"},
        {"club_name":"Marseille","club_id":"marseille","date_joined":"2023-07-01","date_left":"2024-06-30","fee":"Free"}]},
    {"player_id":115,"player_name":"Hugo Lloris","transfers":[
        {"club_name":"Nice","club_id":"nice","date_joined":"2005-07-01","date_left":"2008-07-01","fee":None},
        {"club_name":"Lyon","club_id":"lyon","date_joined":"2008-07-01","date_left":"2012-08-31","fee":"€8.5m"},
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2012-08-31","date_left":"2023-12-31","fee":"€11m"},
        {"club_name":"Los Angeles FC","club_id":"los-angeles-fc","date_joined":"2024-02-09","date_left":None,"fee":"Free"}]},
    {"player_id":123,"player_name":"Christian Eriksen","transfers":[
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2010-07-01","date_left":"2013-08-30","fee":None},
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2013-08-30","date_left":"2020-01-28","fee":"€14m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2020-01-28","date_left":"2022-06-30","fee":"€27m"},
        {"club_name":"Brentford","club_id":"brentford","date_joined":"2022-01-31","date_left":"2022-06-30","fee":"Free"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2022-07-15","date_left":None,"fee":"Free"}]},
    {"player_id":124,"player_name":"Riyad Mahrez","transfers":[
        {"club_name":"Le Havre","club_id":"le-havre","date_joined":"2009-07-01","date_left":"2014-01-11","fee":None},
        {"club_name":"Leicester City","club_id":"leicester-city","date_joined":"2014-01-11","date_left":"2018-07-10","fee":"€0.5m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2018-07-10","date_left":"2023-07-28","fee":"€68m"},
        {"club_name":"Al-Ahli","club_id":"al-ahli","date_joined":"2023-07-28","date_left":None,"fee":"€30m"}]},
    {"player_id":128,"player_name":"Sergio Busquets","transfers":[
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2008-07-01","date_left":"2023-06-30","fee":None},
        {"club_name":"Inter Miami CF","club_id":"inter-miami","date_joined":"2023-07-10","date_left":None,"fee":"Free"}]},
    {"player_id":129,"player_name":"Cesc Fabregas","transfers":[
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2003-09-01","date_left":"2011-08-15","fee":"€2.5m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2011-08-15","date_left":"2014-06-12","fee":"€34m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2014-06-12","date_left":"2019-01-11","fee":"€33m"},
        {"club_name":"AS Monaco","club_id":"as-monaco","date_joined":"2019-01-11","date_left":"2022-06-30","fee":"Free"},
        {"club_name":"Como","club_id":"como","date_joined":"2022-07-01","date_left":"2023-06-30","fee":"Free"}]},
    {"player_id":132,"player_name":"Radamel Falcao","transfers":[
        {"club_name":"River Plate","club_id":"river-plate","date_joined":"2005-01-01","date_left":"2009-08-04","fee":None},
        {"club_name":"Porto","club_id":"porto","date_joined":"2009-08-04","date_left":"2011-08-11","fee":"€5.5m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2011-08-11","date_left":"2013-07-01","fee":"€40m"},
        {"club_name":"AS Monaco","club_id":"as-monaco","date_joined":"2013-07-01","date_left":"2019-09-02","fee":"€60m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2014-09-01","date_left":"2015-06-30","fee":"Loan"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2015-07-03","date_left":"2016-06-30","fee":"Loan"},
        {"club_name":"Galatasaray","club_id":"galatasaray","date_joined":"2019-09-02","date_left":"2020-06-30","fee":"Free"},
        {"club_name":"Rayo Vallecano","club_id":"rayo-vallecano","date_joined":"2021-09-01","date_left":"2022-06-30","fee":"Free"}]},
    {"player_id":133,"player_name":"Diego Costa","transfers":[
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2007-07-01","date_left":"2014-07-15","fee":"€1.5m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2014-07-15","date_left":"2018-01-01","fee":"€38m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2018-01-01","date_left":"2021-01-03","fee":"€66m"}]},
    {"player_id":135,"player_name":"Olivier Giroud","transfers":[
        {"club_name":"Montpellier","club_id":"montpellier","date_joined":"2010-07-01","date_left":"2012-06-26","fee":"€2m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2012-06-26","date_left":"2018-01-31","fee":"€12m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2018-01-31","date_left":"2021-07-17","fee":"€20m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2021-07-17","date_left":"2024-06-30","fee":"€2m"},
        {"club_name":"Los Angeles FC","club_id":"los-angeles-fc","date_joined":"2024-08-13","date_left":None,"fee":"Free"}]},
    {"player_id":137,"player_name":"Michael Ballack","transfers":[
        {"club_name":"Kaiserslautern","club_id":"kaiserslautern","date_joined":"1997-07-01","date_left":"1999-06-30","fee":"€0.5m"},
        {"club_name":"Bayer Leverkusen","club_id":"bayer-leverkusen","date_joined":"1999-07-01","date_left":"2002-06-30","fee":"€4.5m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2002-07-01","date_left":"2006-06-30","fee":"Free"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2006-07-01","date_left":"2010-06-30","fee":"Free"},
        {"club_name":"Bayer Leverkusen","club_id":"bayer-leverkusen","date_joined":"2010-07-01","date_left":"2012-06-30","fee":"Free"}]},
    {"player_id":141,"player_name":"Bastian Schweinsteiger","transfers":[
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2002-07-01","date_left":"2015-07-11","fee":None},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2015-07-11","date_left":"2017-03-20","fee":"€9m"},
        {"club_name":"Chicago Fire","club_id":"chicago-fire","date_joined":"2017-03-29","date_left":"2019-10-15","fee":"Free"}]},
    {"player_id":143,"player_name":"Ivan Rakitic","transfers":[
        {"club_name":"Basel","club_id":"basel","date_joined":"2005-07-01","date_left":"2007-06-30","fee":"€0.5m"},
        {"club_name":"Schalke 04","club_id":"schalke-04","date_joined":"2007-07-01","date_left":"2011-01-18","fee":"€5.5m"},
        {"club_name":"Sevilla","club_id":"sevilla","date_joined":"2011-01-18","date_left":"2014-06-16","fee":"€2.5m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2014-06-16","date_left":"2020-09-01","fee":"€18m"},
        {"club_name":"Sevilla","club_id":"sevilla","date_joined":"2020-09-01","date_left":"2024-06-30","fee":"€1.5m"}]},
    {"player_id":148,"player_name":"Marcus Rashford","transfers":[
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2016-02-25","date_left":None,"fee":None}]},
    {"player_id":151,"player_name":"Hakim Ziyech","transfers":[
        {"club_name":"Heerenveen","club_id":"heerenveen","date_joined":"2012-07-01","date_left":"2014-06-30","fee":None},
        {"club_name":"Twente","club_id":"twente","date_joined":"2014-07-01","date_left":"2016-08-30","fee":"€2m"},
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2016-08-30","date_left":"2020-07-01","fee":"€11m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2020-07-01","date_left":"2023-07-01","fee":"€40m"},
        {"club_name":"Galatasaray","club_id":"galatasaray","date_joined":"2023-07-01","date_left":None,"fee":"Loan"}]},
    {"player_id":153,"player_name":"Raphael Guerreiro","transfers":[
        {"club_name":"Lorient","club_id":"lorient","date_joined":"2014-07-01","date_left":"2016-06-29","fee":"€1m"},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2016-06-29","date_left":"2023-06-30","fee":"€12m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2023-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":154,"player_name":"David Luiz","transfers":[
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2007-07-01","date_left":"2011-01-31","fee":"€1.5m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2011-01-31","date_left":"2014-06-13","fee":"€25m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2014-06-13","date_left":"2016-08-31","fee":"€49.5m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2016-08-31","date_left":"2019-08-08","fee":"€35m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2019-08-08","date_left":"2021-06-30","fee":"€8m"},
        {"club_name":"Flamengo","club_id":"flamengo","date_joined":"2021-09-10","date_left":"2024-12-30","fee":"Free"}]},
    {"player_id":156,"player_name":"Juan Mata","transfers":[
        {"club_name":"Valencia","club_id":"valencia","date_joined":"2007-07-01","date_left":"2011-08-21","fee":"€0.3m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2011-08-21","date_left":"2014-01-25","fee":"€28m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2014-01-25","date_left":"2022-06-30","fee":"€44m"},
        {"club_name":"Galatasaray","club_id":"galatasaray","date_joined":"2022-09-07","date_left":"2023-06-30","fee":"Free"}]},
    {"player_id":166,"player_name":"Patrice Evra","transfers":[
        {"club_name":"AS Monaco","club_id":"as-monaco","date_joined":"2002-07-01","date_left":"2006-01-10","fee":"€0.6m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2006-01-10","date_left":"2014-06-30","fee":"€8m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2014-07-02","date_left":"2017-06-30","fee":"Free"},
        {"club_name":"Marseille","club_id":"marseille","date_joined":"2017-08-04","date_left":"2018-02-08","fee":"Free"},
        {"club_name":"West Ham United","club_id":"west-ham-united","date_joined":"2018-02-08","date_left":"2018-06-30","fee":"Free"}]},
    {"player_id":167,"player_name":"Ashley Cole","transfers":[
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"1999-07-01","date_left":"2006-08-31","fee":None},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2006-08-31","date_left":"2014-06-30","fee":"€24m"},
        {"club_name":"Roma","club_id":"roma","date_joined":"2014-07-15","date_left":"2015-06-30","fee":"Free"},
        {"club_name":"LA Galaxy","club_id":"la-galaxy","date_joined":"2016-02-01","date_left":"2018-12-31","fee":"Free"},
        {"club_name":"Derby County","club_id":"derby-county","date_joined":"2019-01-21","date_left":"2020-06-30","fee":"Free"}]},
    {"player_id":168,"player_name":"Nemanja Vidic","transfers":[
        {"club_name":"Red Star Belgrade","club_id":"red-star-belgrade","date_joined":"2000-07-01","date_left":"2004-07-01","fee":None},
        {"club_name":"Spartak Moscow","club_id":"spartak-moscow","date_joined":"2004-07-01","date_left":"2006-01-05","fee":"€4m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2006-01-05","date_left":"2014-06-30","fee":"€9m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2014-07-10","date_left":"2016-01-27","fee":"Free"}]},
    {"player_id":169,"player_name":"Rio Ferdinand","transfers":[
        {"club_name":"West Ham United","club_id":"west-ham-united","date_joined":"1996-07-01","date_left":"2000-11-27","fee":None},
        {"club_name":"Leeds United","club_id":"leeds-united","date_joined":"2000-11-27","date_left":"2002-07-22","fee":"€27m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2002-07-22","date_left":"2014-06-30","fee":"€46m"},
        {"club_name":"Queens Park Rangers","club_id":"queens-park-rangers","date_joined":"2014-07-17","date_left":"2015-05-24","fee":"Free"}]},
    {"player_id":170,"player_name":"Carles Puyol","transfers":[
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"1999-07-01","date_left":"2014-05-15","fee":None}]},
    {"player_id":171,"player_name":"John Terry","transfers":[
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"1998-10-28","date_left":"2017-05-21","fee":None},
        {"club_name":"Aston Villa","club_id":"aston-villa","date_joined":"2017-07-03","date_left":"2018-10-15","fee":"Free"}]},
    {"player_id":172,"player_name":"Philipp Lahm","transfers":[
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2002-07-01","date_left":"2017-05-20","fee":None},
        {"club_name":"VfB Stuttgart","club_id":"vfb-stuttgart","date_joined":"2003-08-27","date_left":"2005-06-30","fee":"Loan"}]},
    {"player_id":173,"player_name":"Mats Hummels","transfers":[
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2007-07-01","date_left":"2009-01-01","fee":None},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2008-01-01","date_left":"2016-06-30","fee":"€4.2m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2016-07-01","date_left":"2019-06-19","fee":"€35m"},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2019-06-19","date_left":"2024-06-30","fee":"€30.5m"},
        {"club_name":"Roma","club_id":"roma","date_joined":"2024-09-04","date_left":None,"fee":"Free"}]},
    {"player_id":175,"player_name":"Pepe","transfers":[
        {"club_name":"Maritimo","club_id":"maritimo","date_joined":"2002-07-01","date_left":"2004-01-01","fee":None},
        {"club_name":"Porto","club_id":"porto","date_joined":"2004-01-01","date_left":"2007-07-10","fee":"€2m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2007-07-10","date_left":"2017-06-30","fee":"€30m"},
        {"club_name":"Besiktas","club_id":"besiktas","date_joined":"2017-07-01","date_left":"2019-06-30","fee":"Free"},
        {"club_name":"Porto","club_id":"porto","date_joined":"2019-07-01","date_left":"2024-06-30","fee":"Free"}]},
    {"player_id":176,"player_name":"Mauro Icardi","transfers":[
        {"club_name":"Sampdoria","club_id":"sampdoria","date_joined":"2011-07-01","date_left":"2013-07-08","fee":"€0.4m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2013-07-08","date_left":"2020-05-31","fee":"€0.5m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2019-09-02","date_left":"2023-06-30","fee":"€50m"},
        {"club_name":"Galatasaray","club_id":"galatasaray","date_joined":"2023-07-01","date_left":None,"fee":"€10m"}]},
    {"player_id":178,"player_name":"Marco Reus","transfers":[
        {"club_name":"Borussia Monchengladbach","club_id":"borussia-monchengladbach","date_joined":"2009-07-01","date_left":"2012-07-01","fee":"€1m"},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2012-07-01","date_left":"2024-06-30","fee":"€17.1m"},
        {"club_name":"LA Galaxy","club_id":"la-galaxy","date_joined":"2025-01-06","date_left":None,"fee":"Free"}]},
    {"player_id":183,"player_name":"Kalidou Koulibaly","transfers":[
        {"club_name":"Genk","club_id":"genk","date_joined":"2012-07-01","date_left":"2014-06-30","fee":"€3m"},
        {"club_name":"Napoli","club_id":"napoli","date_joined":"2014-07-01","date_left":"2022-07-16","fee":"€8m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2022-07-16","date_left":"2023-07-31","fee":"€40m"},
        {"club_name":"Al-Hilal","club_id":"al-hilal","date_joined":"2023-07-31","date_left":None,"fee":"€23m"}]},
    {"player_id":185,"player_name":"Aymeric Laporte","transfers":[
        {"club_name":"Athletic Bilbao","club_id":"athletic-bilbao","date_joined":"2012-07-01","date_left":"2018-01-30","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2018-01-30","date_left":"2023-08-08","fee":"€65m"},
        {"club_name":"Al-Nassr","club_id":"al-nassr","date_joined":"2023-08-08","date_left":None,"fee":"€27.5m"}]},
    {"player_id":187,"player_name":"Ilkay Gundogan","transfers":[
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2011-07-01","date_left":"2016-06-02","fee":"€5.5m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2016-06-02","date_left":"2023-06-30","fee":"€27m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2023-07-01","date_left":"2024-08-23","fee":"Free"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2024-08-23","date_left":None,"fee":"Free"}]},
    {"player_id":189,"player_name":"Roberto Firmino","transfers":[
        {"club_name":"TSG Hoffenheim","club_id":"tsg-hoffenheim","date_joined":"2011-01-01","date_left":"2015-06-24","fee":"€4m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2015-06-24","date_left":"2023-06-30","fee":"€41m"},
        {"club_name":"Al-Ahli","club_id":"al-ahli","date_joined":"2023-07-19","date_left":None,"fee":"Free"}]},
    {"player_id":190,"player_name":"Fabinho","transfers":[
        {"club_name":"AS Monaco","club_id":"as-monaco","date_joined":"2013-07-01","date_left":"2018-05-28","fee":"€7m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2018-05-28","date_left":"2023-07-19","fee":"€45m"},
        {"club_name":"Al-Ittihad","club_id":"al-ittihad","date_joined":"2023-07-19","date_left":None,"fee":"€46.7m"}]},
    {"player_id":200,"player_name":"Ferran Torres","transfers":[
        {"club_name":"Valencia","club_id":"valencia","date_joined":"2017-07-01","date_left":"2020-08-04","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2020-08-04","date_left":"2022-01-01","fee":"€23m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2022-01-01","date_left":None,"fee":"€55m"}]},
    {"player_id":203,"player_name":"Claude Makelele","transfers":[
        {"club_name":"Nantes","club_id":"nantes","date_joined":"1992-07-01","date_left":"1997-06-30","fee":None},
        {"club_name":"Marseille","club_id":"marseille","date_joined":"1997-07-01","date_left":"1998-06-30","fee":"€3m"},
        {"club_name":"Celta Vigo","club_id":"celta-vigo","date_joined":"1998-07-01","date_left":"2000-07-01","fee":"€4m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2000-07-01","date_left":"2003-09-01","fee":"€6m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2003-09-01","date_left":"2008-06-30","fee":"€23m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2008-07-01","date_left":"2011-06-30","fee":"Free"}]},
    {"player_id":217,"player_name":"Diego Forlan","transfers":[
        {"club_name":"Independiente","club_id":"independiente","date_joined":"1998-01-01","date_left":"2002-01-22","fee":None},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2002-01-22","date_left":"2004-08-25","fee":"€9m"},
        {"club_name":"Villarreal","club_id":"villarreal","date_joined":"2004-08-25","date_left":"2007-07-12","fee":"€21m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2007-07-12","date_left":"2011-06-30","fee":"€21m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2011-07-14","date_left":"2012-01-31","fee":"€3m"},
        {"club_name":"Internacional","club_id":"internacional","date_joined":"2012-02-01","date_left":"2013-06-30","fee":"Free"}]},
    {"player_id":223,"player_name":"Jamie Vardy","transfers":[
        {"club_name":"Fleetwood Town","club_id":"fleetwood-town","date_joined":"2011-07-01","date_left":"2012-05-22","fee":"€0.1m"},
        {"club_name":"Leicester City","club_id":"leicester-city","date_joined":"2012-05-22","date_left":None,"fee":"€1m"}]},
    {"player_id":230,"player_name":"Lisandro Martinez","transfers":[
        {"club_name":"Defensa y Justicia","club_id":"defensa-y-justicia","date_joined":"2019-01-01","date_left":"2019-07-01","fee":"€2m"},
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2019-07-01","date_left":"2022-07-27","fee":"€7m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2022-07-27","date_left":None,"fee":"€57m"}]},
    {"player_id":237,"player_name":"Mike Maignan","transfers":[
        {"club_name":"Lille","club_id":"lille","date_joined":"2015-07-01","date_left":"2021-07-15","fee":None},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2021-07-15","date_left":None,"fee":"€15m"}]},
    {"player_id":238,"player_name":"Emiliano Martinez","transfers":[
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2010-07-01","date_left":"2020-09-16","fee":None},
        {"club_name":"Aston Villa","club_id":"aston-villa","date_joined":"2020-09-16","date_left":None,"fee":"€20m"}]},
    {"player_id":240,"player_name":"Andre Onana","transfers":[
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2015-01-01","date_left":"2022-07-01","fee":"€0.1m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2022-07-01","date_left":"2023-07-20","fee":"Free"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2023-07-20","date_left":None,"fee":"€55m"}]},
    {"player_id":241,"player_name":"Adrien Rabiot","transfers":[
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2012-07-01","date_left":"2019-06-30","fee":None},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2019-07-01","date_left":"2024-06-30","fee":"Free"},
        {"club_name":"Marseille","club_id":"marseille","date_joined":"2024-09-17","date_left":None,"fee":"Free"}]},
    {"player_id":245,"player_name":"Lucas Hernandez","transfers":[
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2014-07-01","date_left":"2019-07-01","fee":None},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2019-07-01","date_left":"2023-07-01","fee":"€80m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2023-07-01","date_left":None,"fee":"€35m"}]},
    {"player_id":246,"player_name":"Theo Hernandez","transfers":[
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2017-07-01","date_left":"2019-07-06","fee":"€24m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2019-07-06","date_left":None,"fee":"€20m"}]},
    {"player_id":248,"player_name":"Jules Kounde","transfers":[
        {"club_name":"Bordeaux","club_id":"bordeaux","date_joined":"2018-07-01","date_left":"2019-06-28","fee":None},
        {"club_name":"Sevilla","club_id":"sevilla","date_joined":"2019-06-28","date_left":"2022-08-02","fee":"€25m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2022-08-02","date_left":None,"fee":"€50m"}]},
    {"player_id":253,"player_name":"Jack Grealish","transfers":[
        {"club_name":"Aston Villa","club_id":"aston-villa","date_joined":"2013-07-01","date_left":"2021-08-05","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2021-08-05","date_left":None,"fee":"€117.5m"}]},
    {"player_id":254,"player_name":"Mason Mount","transfers":[
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2017-07-01","date_left":"2023-07-05","fee":None},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2023-07-05","date_left":None,"fee":"€64.2m"}]},
    {"player_id":258,"player_name":"Richarlison","transfers":[
        {"club_name":"Fluminense","club_id":"fluminense","date_joined":"2015-01-01","date_left":"2017-08-02","fee":None},
        {"club_name":"Watford","club_id":"watford","date_joined":"2017-08-02","date_left":"2018-07-24","fee":"€13.5m"},
        {"club_name":"Everton","club_id":"everton","date_joined":"2018-07-24","date_left":"2022-07-01","fee":"€50m"},
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2022-07-01","date_left":None,"fee":"€58m"}]},
    {"player_id":265,"player_name":"Moussa Diaby","transfers":[
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2017-07-01","date_left":"2019-07-15","fee":None},
        {"club_name":"Bayer Leverkusen","club_id":"bayer-leverkusen","date_joined":"2019-07-15","date_left":"2023-07-01","fee":"€15m"},
        {"club_name":"Aston Villa","club_id":"aston-villa","date_joined":"2023-07-01","date_left":None,"fee":"€55m"}]},
    {"player_id":268,"player_name":"Kingsley Coman","transfers":[
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2013-07-01","date_left":"2014-08-28","fee":None},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2014-08-28","date_left":"2015-08-30","fee":"Free"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2015-08-30","date_left":None,"fee":"€28m"}]},
    {"player_id":271,"player_name":"Dani Olmo","transfers":[
        {"club_name":"Dinamo Zagreb","club_id":"dinamo-zagreb","date_joined":"2014-07-01","date_left":"2020-01-22","fee":"€0.1m"},
        {"club_name":"RB Leipzig","club_id":"rb-leipzig","date_joined":"2020-01-22","date_left":"2024-08-09","fee":"€20m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2024-08-09","date_left":None,"fee":"€55m"}]},
    {"player_id":280,"player_name":"Alexis Mac Allister","transfers":[
        {"club_name":"Argentinos Juniors","club_id":"argentinos-juniors","date_joined":"2016-07-01","date_left":"2019-01-01","fee":None},
        {"club_name":"Brighton","club_id":"brighton","date_joined":"2019-01-01","date_left":"2023-06-20","fee":"€8m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2023-06-20","date_left":None,"fee":"€40m"}]},
    {"player_id":282,"player_name":"Cristian Romero","transfers":[
        {"club_name":"Genoa","club_id":"genoa","date_joined":"2018-07-01","date_left":"2019-07-01","fee":"€2m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2019-07-01","date_left":"2023-06-30","fee":"€26m"},
        {"club_name":"Atalanta","club_id":"atalanta","date_joined":"2020-07-01","date_left":"2022-06-30","fee":"Loan"},
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2022-07-01","date_left":None,"fee":"€50m"}]},
    {"player_id":285,"player_name":"Leandro Trossard","transfers":[
        {"club_name":"Genk","club_id":"genk","date_joined":"2014-07-01","date_left":"2019-06-28","fee":None},
        {"club_name":"Brighton","club_id":"brighton","date_joined":"2019-06-28","date_left":"2023-01-20","fee":"€18m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2023-01-20","date_left":None,"fee":"€27m"}]},
    {"player_id":286,"player_name":"Jeremy Doku","transfers":[
        {"club_name":"Anderlecht","club_id":"anderlecht","date_joined":"2018-07-01","date_left":"2020-10-05","fee":None},
        {"club_name":"Rennes","club_id":"rennes","date_joined":"2020-10-05","date_left":"2023-08-22","fee":"€26m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2023-08-22","date_left":None,"fee":"€60m"}]},
    {"player_id":288,"player_name":"Dejan Kulusevski","transfers":[
        {"club_name":"Atalanta","club_id":"atalanta","date_joined":"2017-07-01","date_left":"2020-01-02","fee":None},
        {"club_name":"Parma","club_id":"parma","date_joined":"2019-07-01","date_left":"2020-01-02","fee":"Loan"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2020-01-02","date_left":"2022-01-31","fee":"€35m"},
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2022-01-31","date_left":None,"fee":"€40m"}]},
    {"player_id":296,"player_name":"Pedro Neto","transfers":[
        {"club_name":"Lazio","club_id":"lazio","date_joined":"2018-07-01","date_left":"2019-07-01","fee":"€5m"},
        {"club_name":"Wolverhampton","club_id":"wolverhampton","date_joined":"2019-07-01","date_left":"2024-08-11","fee":"€17.6m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2024-08-11","date_left":None,"fee":"€54m"}]},
    {"player_id":299,"player_name":"Michael Olise","transfers":[
        {"club_name":"Reading","club_id":"reading","date_joined":"2019-07-01","date_left":"2021-07-09","fee":None},
        {"club_name":"Crystal Palace","club_id":"crystal-palace","date_joined":"2021-07-09","date_left":"2024-07-19","fee":"€9m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2024-07-19","date_left":None,"fee":"€53m"}]},
    {"player_id":303,"player_name":"Hakan Calhanoglu","transfers":[
        {"club_name":"Hamburger SV","club_id":"hamburger-sv","date_joined":"2013-07-01","date_left":"2014-07-01","fee":"€2m"},
        {"club_name":"Bayer Leverkusen","club_id":"bayer-leverkusen","date_joined":"2014-07-01","date_left":"2017-07-01","fee":"€14.5m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2017-07-01","date_left":"2021-06-30","fee":"Free"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2021-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":307,"player_name":"Mehdi Taremi","transfers":[
        {"club_name":"Porto","club_id":"porto","date_joined":"2020-07-01","date_left":"2024-06-30","fee":"€7m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2024-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":316,"player_name":"Ollie Watkins","transfers":[
        {"club_name":"Brentford","club_id":"brentford","date_joined":"2017-07-01","date_left":"2020-09-10","fee":"€1.8m"},
        {"club_name":"Aston Villa","club_id":"aston-villa","date_joined":"2020-09-10","date_left":None,"fee":"€33m"}]},
    {"player_id":322,"player_name":"Xavi Simons","transfers":[
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2018-07-01","date_left":"2022-07-01","fee":None},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2022-07-01","date_left":None,"fee":"Free"},
        {"club_name":"PSV Eindhoven","club_id":"psv-eindhoven","date_joined":"2022-08-01","date_left":"2023-06-30","fee":"Loan"},
        {"club_name":"RB Leipzig","club_id":"rb-leipzig","date_joined":"2023-07-01","date_left":None,"fee":"Loan"}]},
    {"player_id":326,"player_name":"Rasmus Hojlund","transfers":[
        {"club_name":"Sturm Graz","club_id":"sturm-graz","date_joined":"2021-07-01","date_left":"2022-07-01","fee":"€1.8m"},
        {"club_name":"Atalanta","club_id":"atalanta","date_joined":"2022-07-01","date_left":"2023-08-05","fee":"€17m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2023-08-05","date_left":None,"fee":"€75m"}]},
    {"player_id":336,"player_name":"Min-jae Kim","transfers":[
        {"club_name":"Napoli","club_id":"napoli","date_joined":"2021-07-01","date_left":"2023-07-01","fee":"€18m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2023-07-01","date_left":None,"fee":"€50m"}]},
    {"player_id":337,"player_name":"Weston McKennie","transfers":[
        {"club_name":"Schalke 04","club_id":"schalke-04","date_joined":"2016-07-01","date_left":"2020-08-24","fee":"Free"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2020-08-24","date_left":None,"fee":"€18.5m"}]},
    {"player_id":339,"player_name":"Tyler Adams","transfers":[
        {"club_name":"New York Red Bulls","club_id":"new-york-red-bulls","date_joined":"2015-07-01","date_left":"2019-01-01","fee":None},
        {"club_name":"RB Leipzig","club_id":"rb-leipzig","date_joined":"2019-01-01","date_left":"2022-07-06","fee":"€3m"},
        {"club_name":"Leeds United","club_id":"leeds-united","date_joined":"2022-07-06","date_left":"2024-08-12","fee":"€20m"},
        {"club_name":"Bournemouth","club_id":"bournemouth","date_joined":"2024-08-12","date_left":None,"fee":"€12m"}]},
    {"player_id":347,"player_name":"Jack Wilshere","transfers":[
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2008-07-01","date_left":"2018-07-09","fee":None},
        {"club_name":"West Ham United","club_id":"west-ham-united","date_joined":"2018-07-09","date_left":"2020-06-30","fee":"Free"}]},
    {"player_id":354,"player_name":"Javier Mascherano","transfers":[
        {"club_name":"River Plate","club_id":"river-plate","date_joined":"2003-01-01","date_left":"2005-01-01","fee":None},
        {"club_name":"Corinthians","club_id":"corinthians","date_joined":"2005-01-01","date_left":"2006-08-31","fee":"€7m"},
        {"club_name":"West Ham United","club_id":"west-ham-united","date_joined":"2006-08-31","date_left":"2007-02-08","fee":"€9m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2007-02-08","date_left":"2010-08-27","fee":"€20m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2010-08-27","date_left":"2018-01-24","fee":"€19m"},
        {"club_name":"Hebei FC","club_id":"hebei-fc","date_joined":"2018-01-24","date_left":"2020-06-30","fee":"€5m"}]},
    {"player_id":374,"player_name":"Lucas Moura","transfers":[
        {"club_name":"Sao Paulo","club_id":"sao-paulo","date_joined":"2010-01-01","date_left":"2013-01-01","fee":None},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2013-01-01","date_left":"2018-01-31","fee":"€40m"},
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2018-01-31","date_left":"2023-06-30","fee":"€28m"},
        {"club_name":"Sao Paulo","club_id":"sao-paulo","date_joined":"2023-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":389,"player_name":"Wilfried Zaha","transfers":[
        {"club_name":"Crystal Palace","club_id":"crystal-palace","date_joined":"2010-01-01","date_left":"2013-01-25","fee":None},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2013-01-25","date_left":"2015-02-02","fee":"€15m"},
        {"club_name":"Crystal Palace","club_id":"crystal-palace","date_joined":"2014-08-27","date_left":"2023-07-31","fee":"€10m"},
        {"club_name":"Galatasaray","club_id":"galatasaray","date_joined":"2023-07-31","date_left":None,"fee":"Free"}]},
    {"player_id":404,"player_name":"Sergej Milinkovic-Savic","transfers":[
        {"club_name":"Genk","club_id":"genk","date_joined":"2014-07-01","date_left":"2015-07-14","fee":"€3.5m"},
        {"club_name":"Lazio","club_id":"lazio","date_joined":"2015-07-14","date_left":"2023-07-14","fee":"€18m"},
        {"club_name":"Al-Hilal","club_id":"al-hilal","date_joined":"2023-07-14","date_left":None,"fee":"€40m"}]},
    {"player_id":405,"player_name":"Fikayo Tomori","transfers":[
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2016-07-01","date_left":"2021-06-16","fee":None},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2021-01-22","date_left":None,"fee":"€28.5m"}]},
    {"player_id":414,"player_name":"Ryan Gravenberch","transfers":[
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2018-07-01","date_left":"2022-07-18","fee":None},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2022-07-18","date_left":"2023-08-30","fee":"€18.5m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2023-08-30","date_left":None,"fee":"€40m"}]},
    {"player_id":418,"player_name":"Marcus Thuram","transfers":[
        {"club_name":"Guingamp","club_id":"guingamp","date_joined":"2017-07-01","date_left":"2019-07-01","fee":None},
        {"club_name":"Borussia Monchengladbach","club_id":"borussia-monchengladbach","date_joined":"2019-07-01","date_left":"2023-06-30","fee":"€9m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2023-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":419,"player_name":"Omar Marmoush","transfers":[
        {"club_name":"VfL Wolfsburg","club_id":"vfl-wolfsburg","date_joined":"2019-07-01","date_left":"2023-07-01","fee":"€2.5m"},
        {"club_name":"Eintracht Frankfurt","club_id":"eintracht-frankfurt","date_joined":"2023-07-01","date_left":"2025-01-22","fee":"€3.5m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2025-01-22","date_left":None,"fee":"€75m"}]},
    {"player_id":488,"player_name":"Alan Shearer","transfers":[
        {"club_name":"Southampton","club_id":"southampton","date_joined":"1988-07-01","date_left":"1992-07-27","fee":None},
        {"club_name":"Blackburn Rovers","club_id":"blackburn-rovers","date_joined":"1992-07-27","date_left":"1996-07-30","fee":"€4.7m"},
        {"club_name":"Newcastle United","club_id":"newcastle-united","date_joined":"1996-07-30","date_left":"2006-05-07","fee":"€21m"}]},
    {"player_id":490,"player_name":"Ryan Giggs","transfers":[
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"1991-07-01","date_left":"2014-05-19","fee":None}]},
    {"player_id":491,"player_name":"Paul Scholes","transfers":[
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"1994-07-01","date_left":"2013-05-19","fee":None}]},
]

# Filter out any that already exist
new_entries = [t for t in more if t["player_id"] not in existing_ids]
existing.extend(new_entries)

print(f"Added {len(new_entries)} new transfer records")
print(f"Total transfers: {len(existing)}")

with open("/Users/jasur/workspace/football/data/transfers.json", "w") as f:
    json.dump(existing, f, indent=2, ensure_ascii=False)
print("transfers.json updated successfully!")
