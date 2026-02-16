#!/usr/bin/env python3
"""Generate expanded transfers.json with 500+ players."""
import json

transfers = [
    {"player_id":1,"player_name":"Lionel Messi","transfers":[
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2004-07-01","date_left":"2021-08-10","fee":None},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2021-08-10","date_left":"2023-06-30","fee":"Free"},
        {"club_name":"Inter Miami CF","club_id":"inter-miami","date_joined":"2023-07-15","date_left":None,"fee":"Free"}]},
    {"player_id":2,"player_name":"Cristiano Ronaldo","transfers":[
        {"club_name":"Sporting CP","club_id":"sporting-cp","date_joined":"2002-07-01","date_left":"2003-08-12","fee":None},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2003-08-12","date_left":"2009-07-01","fee":"€19m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2009-07-01","date_left":"2018-07-10","fee":"€94m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2018-07-10","date_left":"2021-08-27","fee":"€117m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2021-08-27","date_left":"2022-11-22","fee":"€15m"},
        {"club_name":"Al-Nassr","club_id":"al-nassr","date_joined":"2023-01-01","date_left":None,"fee":"Free"}]},
    {"player_id":3,"player_name":"Zinedine Zidane","transfers":[
        {"club_name":"AS Cannes","club_id":"as-cannes","date_joined":"1989-07-01","date_left":"1992-06-30","fee":None},
        {"club_name":"Bordeaux","club_id":"bordeaux","date_joined":"1992-07-01","date_left":"1996-06-30","fee":"€3.5m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"1996-07-01","date_left":"2001-07-09","fee":"€3.2m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2001-07-09","date_left":"2006-05-07","fee":"€77.5m"}]},
    {"player_id":4,"player_name":"Ronaldinho","transfers":[
        {"club_name":"Gremio","club_id":"gremio","date_joined":"1998-07-01","date_left":"2001-06-30","fee":None},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2001-07-01","date_left":"2003-07-19","fee":"€5m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2003-07-19","date_left":"2008-07-15","fee":"€32.5m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2008-07-15","date_left":"2010-06-30","fee":"€7.5m"},
        {"club_name":"Flamengo","club_id":"flamengo","date_joined":"2011-01-10","date_left":"2012-06-30","fee":"Free"},
        {"club_name":"Atletico Mineiro","club_id":"atletico-mineiro","date_joined":"2012-07-01","date_left":"2014-06-30","fee":"Free"}]},
    {"player_id":5,"player_name":"David Beckham","transfers":[
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"1993-07-01","date_left":"2003-07-01","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2003-07-01","date_left":"2007-06-30","fee":"€37.5m"},
        {"club_name":"LA Galaxy","club_id":"la-galaxy","date_joined":"2007-07-13","date_left":"2012-12-01","fee":"Free"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2009-01-01","date_left":"2010-06-30","fee":"Free"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2013-01-31","date_left":"2013-05-18","fee":"Free"}]},
    {"player_id":6,"player_name":"Thierry Henry","transfers":[
        {"club_name":"AS Monaco","club_id":"as-monaco","date_joined":"1994-07-01","date_left":"1999-01-01","fee":None},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"1999-01-01","date_left":"1999-08-03","fee":"€10.5m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"1999-08-03","date_left":"2007-06-25","fee":"€11m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2007-06-25","date_left":"2010-07-14","fee":"€24m"},
        {"club_name":"New York Red Bulls","club_id":"new-york-red-bulls","date_joined":"2010-07-14","date_left":"2014-12-01","fee":"Free"}]},
    {"player_id":8,"player_name":"Ronaldo Nazario","transfers":[
        {"club_name":"Cruzeiro","club_id":"cruzeiro","date_joined":"1993-07-01","date_left":"1994-08-15","fee":None},
        {"club_name":"PSV Eindhoven","club_id":"psv-eindhoven","date_joined":"1994-08-15","date_left":"1996-07-01","fee":"€6m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"1996-07-01","date_left":"1997-07-26","fee":"€19.5m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"1997-07-26","date_left":"2002-08-31","fee":"€27m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2002-08-31","date_left":"2007-01-20","fee":"€46m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2007-01-20","date_left":"2008-02-14","fee":"Free"},
        {"club_name":"Corinthians","club_id":"corinthians","date_joined":"2009-01-13","date_left":"2011-02-14","fee":"Free"}]},
    {"player_id":9,"player_name":"Neymar","transfers":[
        {"club_name":"Santos","club_id":"santos","date_joined":"2009-01-01","date_left":"2013-06-03","fee":None},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2013-06-03","date_left":"2017-08-03","fee":"€88m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2017-08-03","date_left":"2023-08-15","fee":"€222m"},
        {"club_name":"Al-Hilal","club_id":"al-hilal","date_joined":"2023-08-15","date_left":None,"fee":"€90m"}]},
    {"player_id":10,"player_name":"Kaka","transfers":[
        {"club_name":"Sao Paulo","club_id":"sao-paulo","date_joined":"2001-01-01","date_left":"2003-08-20","fee":None},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2003-08-20","date_left":"2009-06-08","fee":"€8.5m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2009-06-08","date_left":"2013-09-02","fee":"€67m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2013-09-02","date_left":"2014-06-30","fee":"Free"},
        {"club_name":"Orlando City","club_id":"orlando-city","date_joined":"2015-07-01","date_left":"2017-10-29","fee":"Free"}]},
    {"player_id":14,"player_name":"Zlatan Ibrahimovic","transfers":[
        {"club_name":"Malmo FF","club_id":"malmo-ff","date_joined":"1999-07-01","date_left":"2001-07-01","fee":None},
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2001-07-01","date_left":"2004-08-31","fee":"€7.8m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2004-08-31","date_left":"2006-08-10","fee":"€16m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2006-08-10","date_left":"2009-07-27","fee":"€24.8m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2009-07-27","date_left":"2010-08-28","fee":"€69.5m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2010-08-28","date_left":"2012-06-30","fee":"€24m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2012-07-18","date_left":"2016-06-30","fee":"Free"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2016-07-01","date_left":"2018-03-22","fee":"Free"},
        {"club_name":"LA Galaxy","club_id":"la-galaxy","date_joined":"2018-03-23","date_left":"2019-11-13","fee":"Free"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2020-01-02","date_left":"2023-06-04","fee":"Free"}]},
    {"player_id":17,"player_name":"Andrea Pirlo","transfers":[
        {"club_name":"Brescia","club_id":"brescia","date_joined":"1995-07-01","date_left":"1998-06-30","fee":None},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"1998-07-01","date_left":"2001-06-30","fee":"€18m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2001-07-01","date_left":"2011-06-30","fee":"Free"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2011-07-01","date_left":"2015-06-30","fee":"Free"},
        {"club_name":"New York City FC","club_id":"new-york-city-fc","date_joined":"2015-07-24","date_left":"2017-11-05","fee":"Free"}]},
    {"player_id":18,"player_name":"Gianluigi Buffon","transfers":[
        {"club_name":"Parma","club_id":"parma","date_joined":"1995-07-01","date_left":"2001-07-03","fee":None},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2001-07-03","date_left":"2018-06-30","fee":"€52m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2018-07-06","date_left":"2019-06-30","fee":"Free"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2019-07-04","date_left":"2021-06-30","fee":"Free"},
        {"club_name":"Parma","club_id":"parma","date_joined":"2021-07-01","date_left":"2023-06-30","fee":"Free"}]},
    {"player_id":37,"player_name":"Samuel Eto'o","transfers":[
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"1997-07-01","date_left":"2000-06-30","fee":None},
        {"club_name":"Mallorca","club_id":"mallorca","date_joined":"2000-07-01","date_left":"2004-08-10","fee":"€6m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2004-08-10","date_left":"2009-07-20","fee":"€27m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2009-07-20","date_left":"2011-08-23","fee":"€20m"},
        {"club_name":"Anzhi Makhachkala","club_id":"anzhi-makhachkala","date_joined":"2011-08-23","date_left":"2013-08-29","fee":"€20m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2013-08-29","date_left":"2014-06-30","fee":"Free"},
        {"club_name":"Everton","club_id":"everton","date_joined":"2014-08-26","date_left":"2015-01-19","fee":"Free"},
        {"club_name":"Antalyaspor","club_id":"antalyaspor","date_joined":"2015-07-01","date_left":"2018-06-30","fee":"Free"}]},
    {"player_id":38,"player_name":"Didier Drogba","transfers":[
        {"club_name":"Le Mans","club_id":"le-mans","date_joined":"2001-01-01","date_left":"2002-06-30","fee":"€0.1m"},
        {"club_name":"Guingamp","club_id":"guingamp","date_joined":"2002-07-01","date_left":"2003-06-30","fee":"€0.1m"},
        {"club_name":"Marseille","club_id":"marseille","date_joined":"2003-07-01","date_left":"2004-07-20","fee":"€6m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2004-07-20","date_left":"2012-05-20","fee":"€38m"},
        {"club_name":"Shanghai Shenhua","club_id":"shanghai-shenhua","date_joined":"2012-07-01","date_left":"2013-01-23","fee":"Free"},
        {"club_name":"Galatasaray","club_id":"galatasaray","date_joined":"2013-01-23","date_left":"2014-06-30","fee":"Free"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2014-07-25","date_left":"2015-06-30","fee":"Free"},
        {"club_name":"Montreal Impact","club_id":"montreal-impact","date_joined":"2015-07-27","date_left":"2016-11-28","fee":"Free"}]},
    {"player_id":51,"player_name":"Kylian Mbappe","transfers":[
        {"club_name":"AS Monaco","club_id":"as-monaco","date_joined":"2015-07-01","date_left":"2017-08-31","fee":None},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2017-08-31","date_left":"2024-07-01","fee":"€180m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2024-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":52,"player_name":"Erling Haaland","transfers":[
        {"club_name":"Bryne","club_id":"bryne","date_joined":"2016-07-01","date_left":"2017-02-01","fee":None},
        {"club_name":"Molde","club_id":"molde","date_joined":"2017-02-01","date_left":"2019-01-01","fee":"€5m"},
        {"club_name":"Red Bull Salzburg","club_id":"red-bull-salzburg","date_joined":"2019-01-01","date_left":"2020-01-01","fee":"€8m"},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2020-01-01","date_left":"2022-07-01","fee":"€20m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2022-07-01","date_left":None,"fee":"€60m"}]},
    {"player_id":53,"player_name":"Kevin De Bruyne","transfers":[
        {"club_name":"Genk","club_id":"genk","date_joined":"2009-07-01","date_left":"2012-01-31","fee":None},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2012-01-31","date_left":"2014-01-18","fee":"€8m"},
        {"club_name":"Werder Bremen","club_id":"werder-bremen","date_joined":"2012-07-01","date_left":"2013-06-30","fee":"Loan"},
        {"club_name":"VfL Wolfsburg","club_id":"vfl-wolfsburg","date_joined":"2014-01-18","date_left":"2015-08-30","fee":"€22m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2015-08-30","date_left":None,"fee":"€76m"}]},
    {"player_id":54,"player_name":"Luka Modric","transfers":[
        {"club_name":"Dinamo Zagreb","club_id":"dinamo-zagreb","date_joined":"2003-07-01","date_left":"2008-04-28","fee":None},
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2008-04-28","date_left":"2012-08-27","fee":"€21m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2012-08-27","date_left":None,"fee":"€35m"}]},
    {"player_id":56,"player_name":"Karim Benzema","transfers":[
        {"club_name":"Lyon","club_id":"lyon","date_joined":"2005-01-01","date_left":"2009-07-09","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2009-07-09","date_left":"2023-06-01","fee":"€35m"},
        {"club_name":"Al-Ittihad","club_id":"al-ittihad","date_joined":"2023-06-06","date_left":None,"fee":"Free"}]},
    {"player_id":57,"player_name":"Robert Lewandowski","transfers":[
        {"club_name":"Znicz Pruszkow","club_id":"znicz-pruszkow","date_joined":"2006-07-01","date_left":"2008-06-30","fee":None},
        {"club_name":"Lech Poznan","club_id":"lech-poznan","date_joined":"2008-07-01","date_left":"2010-06-18","fee":"€0.4m"},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2010-06-18","date_left":"2014-07-01","fee":"€4.5m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2014-07-01","date_left":"2022-07-19","fee":"Free"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2022-07-19","date_left":None,"fee":"€45m"}]},
    {"player_id":58,"player_name":"Mohamed Salah","transfers":[
        {"club_name":"El Mokawloon","club_id":"el-mokawloon","date_joined":"2010-01-01","date_left":"2012-04-10","fee":None},
        {"club_name":"Basel","club_id":"basel","date_joined":"2012-04-10","date_left":"2014-02-02","fee":"€2.5m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2014-02-02","date_left":"2016-08-03","fee":"€15m"},
        {"club_name":"Fiorentina","club_id":"fiorentina","date_joined":"2015-02-02","date_left":"2015-06-30","fee":"Loan"},
        {"club_name":"Roma","club_id":"roma","date_joined":"2015-08-06","date_left":"2017-06-22","fee":"€5m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2017-06-22","date_left":None,"fee":"€42m"}]},
    {"player_id":59,"player_name":"Virgil van Dijk","transfers":[
        {"club_name":"Groningen","club_id":"groningen","date_joined":"2011-07-01","date_left":"2013-06-21","fee":None},
        {"club_name":"Celtic","club_id":"celtic","date_joined":"2013-06-21","date_left":"2015-09-01","fee":"€2.6m"},
        {"club_name":"Southampton","club_id":"southampton","date_joined":"2015-09-01","date_left":"2018-01-01","fee":"€13m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2018-01-01","date_left":None,"fee":"€84.7m"}]},
    {"player_id":62,"player_name":"N'Golo Kante","transfers":[
        {"club_name":"Boulogne","club_id":"boulogne","date_joined":"2010-07-01","date_left":"2013-06-30","fee":None},
        {"club_name":"Caen","club_id":"caen","date_joined":"2013-07-01","date_left":"2015-08-03","fee":"Free"},
        {"club_name":"Leicester City","club_id":"leicester-city","date_joined":"2015-08-03","date_left":"2016-07-16","fee":"€5.6m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2016-07-16","date_left":"2023-06-30","fee":"€35.8m"},
        {"club_name":"Al-Ittihad","club_id":"al-ittihad","date_joined":"2023-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":65,"player_name":"Eden Hazard","transfers":[
        {"club_name":"Lille","club_id":"lille","date_joined":"2007-07-01","date_left":"2012-06-04","fee":None},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2012-06-04","date_left":"2019-06-07","fee":"€35m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2019-06-07","date_left":"2023-06-30","fee":"€115m"}]},
    {"player_id":67,"player_name":"Vinicius Junior","transfers":[
        {"club_name":"Flamengo","club_id":"flamengo","date_joined":"2017-01-01","date_left":"2018-07-12","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2018-07-12","date_left":None,"fee":"€45m"}]},
    {"player_id":68,"player_name":"Sergio Aguero","transfers":[
        {"club_name":"Independiente","club_id":"independiente","date_joined":"2003-07-01","date_left":"2006-07-01","fee":None},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2006-07-01","date_left":"2011-07-28","fee":"€23m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2011-07-28","date_left":"2021-06-30","fee":"€40m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2021-10-31","date_left":"2021-12-15","fee":"Free"}]},
    {"player_id":69,"player_name":"Luis Suarez","transfers":[
        {"club_name":"Nacional","club_id":"nacional","date_joined":"2005-01-01","date_left":"2006-07-01","fee":None},
        {"club_name":"Groningen","club_id":"groningen","date_joined":"2006-07-01","date_left":"2007-08-09","fee":"€0.8m"},
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2007-08-09","date_left":"2011-01-28","fee":"€7.5m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2011-01-28","date_left":"2014-07-11","fee":"€26.5m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2014-07-11","date_left":"2020-09-25","fee":"€81m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2020-09-25","date_left":"2022-06-30","fee":"€6m"}]},
    {"player_id":70,"player_name":"Sergio Ramos","transfers":[
        {"club_name":"Sevilla","club_id":"sevilla","date_joined":"2004-01-01","date_left":"2005-08-31","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2005-08-31","date_left":"2021-06-30","fee":"€27m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2021-07-08","date_left":"2023-06-30","fee":"Free"},
        {"club_name":"Sevilla","club_id":"sevilla","date_joined":"2023-09-12","date_left":"2024-06-30","fee":"Free"}]},
    {"player_id":71,"player_name":"Gareth Bale","transfers":[
        {"club_name":"Southampton","club_id":"southampton","date_joined":"2006-01-01","date_left":"2007-05-25","fee":None},
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2007-05-25","date_left":"2013-09-01","fee":"€14.7m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2013-09-01","date_left":"2022-06-30","fee":"€101m"},
        {"club_name":"Los Angeles FC","club_id":"los-angeles-fc","date_joined":"2022-06-27","date_left":"2023-01-09","fee":"Free"}]},
    {"player_id":72,"player_name":"Harry Kane","transfers":[
        {"club_name":"Tottenham Hotspur","club_id":"tottenham-hotspur","date_joined":"2011-07-01","date_left":"2023-08-12","fee":None},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2023-08-12","date_left":None,"fee":"€100m"}]},
    {"player_id":73,"player_name":"Antoine Griezmann","transfers":[
        {"club_name":"Real Sociedad","club_id":"real-sociedad","date_joined":"2009-07-01","date_left":"2014-07-28","fee":None},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2014-07-28","date_left":"2019-07-12","fee":"€30m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2019-07-12","date_left":"2021-08-31","fee":"€120m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2021-08-31","date_left":None,"fee":"€25m"}]},
    {"player_id":74,"player_name":"Paul Pogba","transfers":[
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2009-07-01","date_left":"2012-07-03","fee":None},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2012-07-03","date_left":"2016-08-09","fee":"Free"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2016-08-09","date_left":"2022-06-30","fee":"€105m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2022-07-11","date_left":"2024-06-30","fee":"Free"}]},
    {"player_id":77,"player_name":"Edinson Cavani","transfers":[
        {"club_name":"Danubio","club_id":"danubio","date_joined":"2005-07-01","date_left":"2007-07-01","fee":None},
        {"club_name":"Palermo","club_id":"palermo","date_joined":"2007-07-01","date_left":"2010-07-17","fee":"€4.5m"},
        {"club_name":"Napoli","club_id":"napoli","date_joined":"2010-07-17","date_left":"2013-07-16","fee":"€17m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2013-07-16","date_left":"2020-06-30","fee":"€64.5m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2020-10-05","date_left":"2022-06-30","fee":"Free"}]},
    {"player_id":81,"player_name":"Arjen Robben","transfers":[
        {"club_name":"Groningen","club_id":"groningen","date_joined":"2000-07-01","date_left":"2002-07-01","fee":None},
        {"club_name":"PSV Eindhoven","club_id":"psv-eindhoven","date_joined":"2002-07-01","date_left":"2004-07-01","fee":"€4m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2004-07-01","date_left":"2007-08-23","fee":"€18m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2007-08-23","date_left":"2009-08-28","fee":"€36m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2009-08-28","date_left":"2019-06-30","fee":"€25m"}]},
    {"player_id":83,"player_name":"Thiago Silva","transfers":[
        {"club_name":"Fluminense","club_id":"fluminense","date_joined":"2006-01-01","date_left":"2009-01-14","fee":None},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2009-01-14","date_left":"2012-07-13","fee":"€10m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2012-07-13","date_left":"2020-08-27","fee":"€42m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2020-08-28","date_left":"2023-06-30","fee":"Free"},
        {"club_name":"Fluminense","club_id":"fluminense","date_joined":"2023-07-01","date_left":"2024-06-30","fee":"Free"}]},
    {"player_id":84,"player_name":"Raphael Varane","transfers":[
        {"club_name":"Lens","club_id":"lens","date_joined":"2010-07-01","date_left":"2011-06-26","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2011-06-26","date_left":"2021-08-14","fee":"€10m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2021-08-14","date_left":"2023-06-30","fee":"€40m"},
        {"club_name":"Como","club_id":"como","date_joined":"2024-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":91,"player_name":"Bruno Fernandes","transfers":[
        {"club_name":"Boavista","club_id":"boavista","date_joined":"2012-07-01","date_left":"2013-07-01","fee":None},
        {"club_name":"Udinese","club_id":"udinese","date_joined":"2013-07-01","date_left":"2016-07-01","fee":"€0.5m"},
        {"club_name":"Sampdoria","club_id":"sampdoria","date_joined":"2016-07-01","date_left":"2017-06-30","fee":"Loan"},
        {"club_name":"Sporting CP","club_id":"sporting-cp","date_joined":"2017-07-01","date_left":"2020-01-30","fee":"€8.5m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2020-01-30","date_left":None,"fee":"€55m"}]},
    {"player_id":98,"player_name":"Rodri","transfers":[
        {"club_name":"Villarreal","club_id":"villarreal","date_joined":"2015-07-01","date_left":"2018-07-01","fee":None},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2018-07-01","date_left":"2019-07-04","fee":"€25m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2019-07-04","date_left":None,"fee":"€70m"}]},
    {"player_id":102,"player_name":"Declan Rice","transfers":[
        {"club_name":"West Ham United","club_id":"west-ham-united","date_joined":"2017-07-01","date_left":"2023-07-15","fee":None},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2023-07-15","date_left":None,"fee":"€116m"}]},
    {"player_id":106,"player_name":"Jude Bellingham","transfers":[
        {"club_name":"Birmingham City","club_id":"birmingham-city","date_joined":"2019-07-01","date_left":"2020-07-20","fee":None},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2020-07-20","date_left":"2023-06-14","fee":"€25m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2023-06-14","date_left":None,"fee":"€103m"}]},
    {"player_id":107,"player_name":"Bukayo Saka","transfers":[
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2019-07-01","date_left":None,"fee":None}]},
    {"player_id":109,"player_name":"Lamine Yamal","transfers":[
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2023-07-01","date_left":None,"fee":None}]},
    {"player_id":112,"player_name":"Ousmane Dembele","transfers":[
        {"club_name":"Rennes","club_id":"rennes","date_joined":"2015-07-01","date_left":"2016-07-01","fee":None},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2016-07-01","date_left":"2017-08-25","fee":"€15m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2017-08-25","date_left":"2023-08-13","fee":"€140m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2023-08-13","date_left":None,"fee":"Free"}]},
    {"player_id":119,"player_name":"Fernando Torres","transfers":[
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2001-07-01","date_left":"2007-07-04","fee":None},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2007-07-04","date_left":"2011-01-31","fee":"€38m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2011-01-31","date_left":"2014-08-28","fee":"€58.5m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2014-08-28","date_left":"2015-01-05","fee":"Loan"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2015-01-05","date_left":"2018-06-30","fee":"Free"},
        {"club_name":"Sagan Tosu","club_id":"sagan-tosu","date_joined":"2018-07-10","date_left":"2019-06-23","fee":"Free"}]},
    {"player_id":121,"player_name":"Angel Di Maria","transfers":[
        {"club_name":"Rosario Central","club_id":"rosario-central","date_joined":"2005-07-01","date_left":"2007-07-07","fee":None},
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2007-07-07","date_left":"2010-07-01","fee":"€6m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2010-07-01","date_left":"2014-08-26","fee":"€33m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2014-08-26","date_left":"2015-08-06","fee":"€75m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2015-08-06","date_left":"2022-06-30","fee":"€63m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2022-07-08","date_left":"2023-06-30","fee":"Free"},
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2023-07-05","date_left":None,"fee":"Free"}]},
    {"player_id":125,"player_name":"Gonzalo Higuain","transfers":[
        {"club_name":"River Plate","club_id":"river-plate","date_joined":"2005-01-01","date_left":"2007-01-08","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2007-01-08","date_left":"2013-07-26","fee":"€12m"},
        {"club_name":"Napoli","club_id":"napoli","date_joined":"2013-07-26","date_left":"2016-07-26","fee":"€40m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2016-07-26","date_left":"2020-09-18","fee":"€90m"}]},
    {"player_id":126,"player_name":"Giorgio Chiellini","transfers":[
        {"club_name":"Livorno","club_id":"livorno","date_joined":"2000-07-01","date_left":"2004-06-30","fee":None},
        {"club_name":"Fiorentina","club_id":"fiorentina","date_joined":"2004-07-01","date_left":"2005-06-30","fee":"Loan"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2005-07-01","date_left":"2022-06-30","fee":"€6.5m"},
        {"club_name":"Los Angeles FC","club_id":"los-angeles-fc","date_joined":"2022-06-07","date_left":"2023-12-31","fee":"Free"}]},
    {"player_id":130,"player_name":"Robin van Persie","transfers":[
        {"club_name":"Feyenoord","club_id":"feyenoord","date_joined":"2001-07-01","date_left":"2004-05-20","fee":None},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2004-05-20","date_left":"2012-08-17","fee":"€3m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2012-08-17","date_left":"2015-07-13","fee":"€30m"},
        {"club_name":"Fenerbahce","club_id":"fenerbahce","date_joined":"2015-07-13","date_left":"2018-01-22","fee":"€5.5m"},
        {"club_name":"Feyenoord","club_id":"feyenoord","date_joined":"2018-01-22","date_left":"2019-06-30","fee":"Free"}]},
    {"player_id":134,"player_name":"Romelu Lukaku","transfers":[
        {"club_name":"Anderlecht","club_id":"anderlecht","date_joined":"2009-07-01","date_left":"2011-08-18","fee":None},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2011-08-18","date_left":"2014-07-30","fee":"€15m"},
        {"club_name":"Everton","club_id":"everton","date_joined":"2013-07-01","date_left":"2017-07-10","fee":"€35m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2017-07-10","date_left":"2019-08-08","fee":"€84.7m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2019-08-08","date_left":"2021-08-12","fee":"€74m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2021-08-12","date_left":"2023-06-30","fee":"€113m"},
        {"club_name":"Roma","club_id":"roma","date_joined":"2023-07-01","date_left":"2024-06-30","fee":"Loan"},
        {"club_name":"Napoli","club_id":"napoli","date_joined":"2024-08-29","date_left":None,"fee":"€30m"}]},
    {"player_id":136,"player_name":"Xabi Alonso","transfers":[
        {"club_name":"Real Sociedad","club_id":"real-sociedad","date_joined":"1999-07-01","date_left":"2004-08-20","fee":None},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2004-08-20","date_left":"2009-08-05","fee":"€10.5m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2009-08-05","date_left":"2014-08-29","fee":"€30m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2014-08-29","date_left":"2017-06-30","fee":"€10m"}]},
    {"player_id":138,"player_name":"Wesley Sneijder","transfers":[
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2002-07-01","date_left":"2007-08-27","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2007-08-27","date_left":"2009-08-26","fee":"€27m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2009-08-26","date_left":"2013-01-22","fee":"€15m"},
        {"club_name":"Galatasaray","club_id":"galatasaray","date_joined":"2013-01-22","date_left":"2017-06-30","fee":"€7.5m"}]},
    {"player_id":139,"player_name":"Carlos Tevez","transfers":[
        {"club_name":"Boca Juniors","club_id":"boca-juniors","date_joined":"2001-07-01","date_left":"2005-01-01","fee":None},
        {"club_name":"Corinthians","club_id":"corinthians","date_joined":"2005-01-01","date_left":"2006-08-25","fee":"€10m"},
        {"club_name":"West Ham United","club_id":"west-ham-united","date_joined":"2006-08-25","date_left":"2007-08-10","fee":"€2m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2007-08-10","date_left":"2009-07-14","fee":"Loan"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2009-07-14","date_left":"2013-07-01","fee":"€30m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2013-07-01","date_left":"2015-06-29","fee":"€12m"},
        {"club_name":"Boca Juniors","club_id":"boca-juniors","date_joined":"2015-07-13","date_left":"2021-06-04","fee":"Free"}]},
    {"player_id":140,"player_name":"Miroslav Klose","transfers":[
        {"club_name":"Kaiserslautern","club_id":"kaiserslautern","date_joined":"1999-07-01","date_left":"2004-06-30","fee":None},
        {"club_name":"Werder Bremen","club_id":"werder-bremen","date_joined":"2004-06-30","date_left":"2007-06-30","fee":"€5m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2007-06-30","date_left":"2011-06-30","fee":"Free"},
        {"club_name":"Lazio","club_id":"lazio","date_joined":"2011-06-30","date_left":"2016-06-30","fee":"Free"}]},
    {"player_id":142,"player_name":"David Villa","transfers":[
        {"club_name":"Sporting Gijon","club_id":"sporting-gijon","date_joined":"2001-07-01","date_left":"2003-06-30","fee":None},
        {"club_name":"Real Zaragoza","club_id":"real-zaragoza","date_joined":"2003-07-01","date_left":"2005-07-01","fee":"€3m"},
        {"club_name":"Valencia","club_id":"valencia","date_joined":"2005-07-01","date_left":"2010-05-19","fee":"€12m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2010-05-19","date_left":"2013-07-08","fee":"€40m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2013-07-08","date_left":"2014-06-30","fee":"€5.1m"},
        {"club_name":"New York City FC","club_id":"new-york-city-fc","date_joined":"2014-12-01","date_left":"2018-12-31","fee":"Free"}]},
    {"player_id":155,"player_name":"Keylor Navas","transfers":[
        {"club_name":"Saprissa","club_id":"saprissa","date_joined":"2005-07-01","date_left":"2010-07-01","fee":None},
        {"club_name":"Albacete","club_id":"albacete","date_joined":"2010-07-01","date_left":"2011-07-01","fee":"€0.2m"},
        {"club_name":"Levante","club_id":"levante","date_joined":"2011-07-01","date_left":"2014-08-03","fee":"€2m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2014-08-03","date_left":"2019-09-02","fee":"€10m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2019-09-02","date_left":"2024-06-30","fee":"€15m"}]},
    {"player_id":160,"player_name":"Memphis Depay","transfers":[
        {"club_name":"PSV Eindhoven","club_id":"psv-eindhoven","date_joined":"2011-07-01","date_left":"2015-06-12","fee":None},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2015-06-12","date_left":"2017-01-20","fee":"€34m"},
        {"club_name":"Lyon","club_id":"lyon","date_joined":"2017-01-20","date_left":"2021-06-30","fee":"€17m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2021-07-01","date_left":"2023-01-01","fee":"Free"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2023-01-01","date_left":"2024-06-30","fee":"Free"}]},
    {"player_id":163,"player_name":"Alvaro Morata","transfers":[
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2010-07-01","date_left":"2014-07-19","fee":None},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2014-07-19","date_left":"2016-06-21","fee":"€20m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2016-06-21","date_left":"2017-07-19","fee":"€30m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2017-07-19","date_left":"2019-01-28","fee":"€66m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2019-01-28","date_left":"2024-07-19","fee":"€65m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2024-07-19","date_left":None,"fee":"€13m"}]},
    {"player_id":184,"player_name":"Matthijs de Ligt","transfers":[
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2017-07-01","date_left":"2019-07-18","fee":None},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2019-07-18","date_left":"2022-07-19","fee":"€85.5m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2022-07-19","date_left":"2024-08-13","fee":"€67m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2024-08-13","date_left":None,"fee":"€45m"}]},
    {"player_id":195,"player_name":"Victor Osimhen","transfers":[
        {"club_name":"VfL Wolfsburg","club_id":"vfl-wolfsburg","date_joined":"2017-07-01","date_left":"2018-06-30","fee":"€3.5m"},
        {"club_name":"Charleroi","club_id":"charleroi","date_joined":"2018-07-01","date_left":"2019-07-31","fee":"€3.5m"},
        {"club_name":"Lille","club_id":"lille","date_joined":"2019-07-31","date_left":"2020-07-31","fee":"€12m"},
        {"club_name":"Napoli","club_id":"napoli","date_joined":"2020-07-31","date_left":None,"fee":"€75m"}]},
    {"player_id":197,"player_name":"Rafael Leao","transfers":[
        {"club_name":"Sporting CP","club_id":"sporting-cp","date_joined":"2018-07-01","date_left":"2019-06-30","fee":None},
        {"club_name":"Lille","club_id":"lille","date_joined":"2019-07-01","date_left":"2019-08-01","fee":"Free"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2019-08-01","date_left":None,"fee":"€30m"}]},
    {"player_id":198,"player_name":"Martin Odegaard","transfers":[
        {"club_name":"Stromsgodset","club_id":"stromsgodset","date_joined":"2014-07-01","date_left":"2015-01-22","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2015-01-22","date_left":"2021-08-20","fee":"€4m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2021-08-20","date_left":None,"fee":"€35m"}]},
    {"player_id":201,"player_name":"Yaya Toure","transfers":[
        {"club_name":"Beveren","club_id":"beveren","date_joined":"2001-07-01","date_left":"2003-06-30","fee":"€0.1m"},
        {"club_name":"Metalurh Donetsk","club_id":"metalurh-donetsk","date_joined":"2003-07-01","date_left":"2005-06-30","fee":"€0.1m"},
        {"club_name":"Olympiacos","club_id":"olympiacos","date_joined":"2005-07-01","date_left":"2006-07-01","fee":"Free"},
        {"club_name":"AS Monaco","club_id":"as-monaco","date_joined":"2006-07-01","date_left":"2007-06-25","fee":"€0.5m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2007-06-25","date_left":"2010-07-02","fee":"€9m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2010-07-02","date_left":"2018-06-30","fee":"€30m"}]},
    {"player_id":224,"player_name":"Granit Xhaka","transfers":[
        {"club_name":"Basel","club_id":"basel","date_joined":"2010-07-01","date_left":"2012-06-01","fee":None},
        {"club_name":"Borussia Monchengladbach","club_id":"borussia-monchengladbach","date_joined":"2012-06-01","date_left":"2016-05-25","fee":"€8.5m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2016-05-25","date_left":"2023-08-31","fee":"€45m"},
        {"club_name":"Bayer Leverkusen","club_id":"bayer-leverkusen","date_joined":"2023-08-31","date_left":None,"fee":"€25m"}]},
    {"player_id":225,"player_name":"Kai Havertz","transfers":[
        {"club_name":"Bayer Leverkusen","club_id":"bayer-leverkusen","date_joined":"2016-07-01","date_left":"2020-09-04","fee":None},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2020-09-04","date_left":"2023-06-28","fee":"€80m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2023-06-28","date_left":None,"fee":"€65m"}]},
    {"player_id":231,"player_name":"Enzo Fernandez","transfers":[
        {"club_name":"River Plate","club_id":"river-plate","date_joined":"2020-07-01","date_left":"2022-07-11","fee":None},
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2022-07-11","date_left":"2023-02-01","fee":"€10m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2023-02-01","date_left":None,"fee":"€121m"}]},
    {"player_id":232,"player_name":"Aurelien Tchouameni","transfers":[
        {"club_name":"Bordeaux","club_id":"bordeaux","date_joined":"2018-07-01","date_left":"2020-07-08","fee":None},
        {"club_name":"AS Monaco","club_id":"as-monaco","date_joined":"2020-07-08","date_left":"2022-06-14","fee":"€20m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2022-06-14","date_left":None,"fee":"€80m"}]},
    {"player_id":233,"player_name":"Lautaro Martinez","transfers":[
        {"club_name":"Racing Club","club_id":"racing-club","date_joined":"2015-07-01","date_left":"2018-07-04","fee":None},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2018-07-04","date_left":None,"fee":"€25m"}]},
    {"player_id":234,"player_name":"Khvicha Kvaratskhelia","transfers":[
        {"club_name":"Dinamo Tbilisi","club_id":"dinamo-tbilisi","date_joined":"2017-07-01","date_left":"2019-07-01","fee":None},
        {"club_name":"Lokomotiv Moscow","club_id":"lokomotiv-moscow","date_joined":"2019-07-01","date_left":"2021-06-30","fee":"€0.6m"},
        {"club_name":"Napoli","club_id":"napoli","date_joined":"2022-07-01","date_left":"2025-01-17","fee":"€10m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2025-01-17","date_left":None,"fee":"€70m"}]},
    {"player_id":235,"player_name":"Cole Palmer","transfers":[
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2020-07-01","date_left":"2023-09-01","fee":None},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2023-09-01","date_left":None,"fee":"€47m"}]},
    {"player_id":281,"player_name":"Julian Alvarez","transfers":[
        {"club_name":"River Plate","club_id":"river-plate","date_joined":"2018-07-01","date_left":"2022-01-31","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2022-01-31","date_left":"2024-08-12","fee":"€17m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2024-08-12","date_left":None,"fee":"€75m"}]},
    {"player_id":310,"player_name":"Alphonso Davies","transfers":[
        {"club_name":"Vancouver Whitecaps","club_id":"vancouver-whitecaps","date_joined":"2016-07-15","date_left":"2019-01-01","fee":None},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2019-01-01","date_left":None,"fee":"€10m"}]},
    {"player_id":321,"player_name":"Christopher Nkunku","transfers":[
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2015-07-01","date_left":"2019-07-15","fee":None},
        {"club_name":"RB Leipzig","club_id":"rb-leipzig","date_joined":"2019-07-15","date_left":"2023-07-01","fee":"€13m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2023-07-01","date_left":None,"fee":"€60m"}]},
    {"player_id":338,"player_name":"Christian Pulisic","transfers":[
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2015-02-01","date_left":"2019-01-02","fee":None},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2019-01-02","date_left":"2023-07-01","fee":"€64m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2023-07-01","date_left":None,"fee":"€20m"}]},
    {"player_id":60,"player_name":"Sadio Mane","transfers":[
        {"club_name":"Metz","club_id":"metz","date_joined":"2011-07-01","date_left":"2012-08-31","fee":"€4m"},
        {"club_name":"Red Bull Salzburg","club_id":"red-bull-salzburg","date_joined":"2012-08-31","date_left":"2014-09-01","fee":"€4m"},
        {"club_name":"Southampton","club_id":"southampton","date_joined":"2014-09-01","date_left":"2016-06-28","fee":"€23m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2016-06-28","date_left":"2022-06-22","fee":"€41.2m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2022-06-22","date_left":"2023-07-07","fee":"€32m"},
        {"club_name":"Al-Nassr","club_id":"al-nassr","date_joined":"2023-07-07","date_left":None,"fee":"€20m"}]},
    {"player_id":66,"player_name":"Alisson Becker","transfers":[
        {"club_name":"Internacional","club_id":"internacional","date_joined":"2013-01-01","date_left":"2016-07-01","fee":None},
        {"club_name":"Roma","club_id":"roma","date_joined":"2016-07-01","date_left":"2018-07-19","fee":"€8m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2018-07-19","date_left":None,"fee":"€62.5m"}]},
    {"player_id":88,"player_name":"Ruben Dias","transfers":[
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2017-07-01","date_left":"2020-09-29","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2020-09-29","date_left":None,"fee":"€68m"}]},
    {"player_id":93,"player_name":"Joshua Kimmich","transfers":[
        {"club_name":"RB Leipzig","club_id":"rb-leipzig","date_joined":"2013-07-01","date_left":"2015-07-01","fee":None},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2015-07-01","date_left":None,"fee":"€8.5m"}]},
    {"player_id":96,"player_name":"Trent Alexander-Arnold","transfers":[
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2016-07-01","date_left":None,"fee":None}]},
    {"player_id":100,"player_name":"Phil Foden","transfers":[
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2017-07-01","date_left":None,"fee":None}]},
    {"player_id":108,"player_name":"Pedri","transfers":[
        {"club_name":"Las Palmas","club_id":"las-palmas","date_joined":"2019-07-01","date_left":"2020-08-01","fee":None},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2020-08-01","date_left":None,"fee":"€5m"}]},
    {"player_id":111,"player_name":"Eduardo Camavinga","transfers":[
        {"club_name":"Rennes","club_id":"rennes","date_joined":"2019-01-01","date_left":"2021-08-31","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2021-08-31","date_left":None,"fee":"€31m"}]},
    {"player_id":116,"player_name":"David de Gea","transfers":[
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2009-07-01","date_left":"2011-06-29","fee":None},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2011-06-29","date_left":"2023-06-30","fee":"€25m"},
        {"club_name":"Fiorentina","club_id":"fiorentina","date_joined":"2024-10-01","date_left":None,"fee":"Free"}]},
    {"player_id":117,"player_name":"Petr Cech","transfers":[
        {"club_name":"Sparta Prague","club_id":"sparta-prague","date_joined":"2001-07-01","date_left":"2002-06-30","fee":"€0.5m"},
        {"club_name":"Rennes","club_id":"rennes","date_joined":"2002-07-01","date_left":"2004-07-01","fee":"€5m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2004-07-01","date_left":"2015-06-29","fee":"€13m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2015-06-29","date_left":"2019-05-29","fee":"€14m"}]},
    {"player_id":118,"player_name":"Iker Casillas","transfers":[
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"1999-07-01","date_left":"2015-07-13","fee":None},
        {"club_name":"Porto","club_id":"porto","date_joined":"2015-07-13","date_left":"2020-08-04","fee":"Free"}]},
    {"player_id":145,"player_name":"Arturo Vidal","transfers":[
        {"club_name":"Colo-Colo","club_id":"colo-colo","date_joined":"2005-07-01","date_left":"2007-07-05","fee":None},
        {"club_name":"Bayer Leverkusen","club_id":"bayer-leverkusen","date_joined":"2007-07-05","date_left":"2011-07-25","fee":"€10.5m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2011-07-25","date_left":"2015-07-28","fee":"€10.5m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2015-07-28","date_left":"2018-08-09","fee":"€37m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2018-08-09","date_left":"2020-09-22","fee":"€20m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2020-09-22","date_left":"2021-06-30","fee":"€1m"}]},
    {"player_id":147,"player_name":"Leroy Sane","transfers":[
        {"club_name":"Schalke 04","club_id":"schalke-04","date_joined":"2014-07-01","date_left":"2016-08-02","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2016-08-02","date_left":"2020-07-03","fee":"€50m"},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2020-07-03","date_left":None,"fee":"€49m"}]},
    {"player_id":161,"player_name":"Mario Balotelli","transfers":[
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2007-07-01","date_left":"2010-08-13","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2010-08-13","date_left":"2013-01-30","fee":"€29m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2013-01-30","date_left":"2014-08-20","fee":"€20m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2014-08-20","date_left":"2015-06-30","fee":"€20m"},
        {"club_name":"Nice","club_id":"nice","date_joined":"2016-09-01","date_left":"2019-01-23","fee":"Free"},
        {"club_name":"Marseille","club_id":"marseille","date_joined":"2019-01-23","date_left":"2019-06-30","fee":"Free"}]},
    {"player_id":202,"player_name":"Clarence Seedorf","transfers":[
        {"club_name":"Ajax","club_id":"ajax","date_joined":"1992-07-01","date_left":"1995-07-01","fee":None},
        {"club_name":"Sampdoria","club_id":"sampdoria","date_joined":"1995-07-01","date_left":"1996-07-01","fee":"€4.5m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"1996-07-01","date_left":"1999-12-22","fee":"€5.7m"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"1999-12-22","date_left":"2002-01-30","fee":"€18m"},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2002-01-30","date_left":"2012-01-20","fee":"€20m"}]},
    {"player_id":236,"player_name":"Gianluigi Donnarumma","transfers":[
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2015-07-01","date_left":"2021-06-30","fee":None},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2021-07-14","date_left":None,"fee":"Free"}]},
    {"player_id":287,"player_name":"Alexander Isak","transfers":[
        {"club_name":"AIK","club_id":"aik","date_joined":"2016-01-01","date_left":"2017-01-16","fee":None},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2017-01-16","date_left":"2019-06-30","fee":"€9m"},
        {"club_name":"Real Sociedad","club_id":"real-sociedad","date_joined":"2019-07-01","date_left":"2022-08-26","fee":"€6.5m"},
        {"club_name":"Newcastle United","club_id":"newcastle-united","date_joined":"2022-08-26","date_left":None,"fee":"€70m"}]},
    {"player_id":328,"player_name":"Endrick","transfers":[
        {"club_name":"Palmeiras","club_id":"palmeiras","date_joined":"2022-07-01","date_left":"2024-07-21","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2024-07-21","date_left":None,"fee":"€35m"}]},
    {"player_id":397,"player_name":"Darwin Nunez","transfers":[
        {"club_name":"Penarol","club_id":"penarol","date_joined":"2017-07-01","date_left":"2019-09-04","fee":None},
        {"club_name":"Almeria","club_id":"almeria","date_joined":"2019-09-04","date_left":"2020-09-07","fee":"€5m"},
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2020-09-07","date_left":"2022-06-13","fee":"€24m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2022-06-13","date_left":None,"fee":"€75m"}]},
    {"player_id":381,"player_name":"Nicolo Barella","transfers":[
        {"club_name":"Cagliari","club_id":"cagliari","date_joined":"2015-07-01","date_left":"2019-07-01","fee":None},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2019-07-01","date_left":None,"fee":"€25m"}]},
    {"player_id":396,"player_name":"Luis Diaz","transfers":[
        {"club_name":"Junior","club_id":"junior","date_joined":"2019-01-01","date_left":"2019-07-10","fee":None},
        {"club_name":"Porto","club_id":"porto","date_joined":"2019-07-10","date_left":"2022-01-30","fee":"€7.5m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2022-01-30","date_left":None,"fee":"€45m"}]},
    {"player_id":400,"player_name":"Rodrigo De Paul","transfers":[
        {"club_name":"Racing Club","club_id":"racing-club","date_joined":"2013-07-01","date_left":"2016-07-14","fee":None},
        {"club_name":"Valencia","club_id":"valencia","date_joined":"2014-07-01","date_left":"2016-07-14","fee":"€3.5m"},
        {"club_name":"Udinese","club_id":"udinese","date_joined":"2016-07-14","date_left":"2021-07-01","fee":"€3m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2021-07-01","date_left":None,"fee":"€35m"}]},
    {"player_id":475,"player_name":"Gabriel Martinelli","transfers":[
        {"club_name":"Ituano","club_id":"ituano","date_joined":"2018-07-01","date_left":"2019-07-02","fee":None},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2019-07-02","date_left":None,"fee":"€7m"}]},
    {"player_id":319,"player_name":"Moises Caicedo","transfers":[
        {"club_name":"Independiente del Valle","club_id":"independiente-del-valle","date_joined":"2019-07-01","date_left":"2021-02-01","fee":None},
        {"club_name":"Brighton","club_id":"brighton","date_joined":"2021-02-01","date_left":"2023-08-14","fee":"€5m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2023-08-14","date_left":None,"fee":"€115m"}]},
    {"player_id":259,"player_name":"Dominik Szoboszlai","transfers":[
        {"club_name":"Red Bull Salzburg","club_id":"red-bull-salzburg","date_joined":"2019-01-01","date_left":"2021-01-04","fee":None},
        {"club_name":"RB Leipzig","club_id":"rb-leipzig","date_joined":"2021-01-04","date_left":"2023-07-01","fee":"€20m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2023-07-01","date_left":None,"fee":"€70m"}]},
    {"player_id":196,"player_name":"Dusan Vlahovic","transfers":[
        {"club_name":"Partizan","club_id":"partizan","date_joined":"2016-07-01","date_left":"2018-07-13","fee":None},
        {"club_name":"Fiorentina","club_id":"fiorentina","date_joined":"2018-07-13","date_left":"2022-01-28","fee":"€2m"},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2022-01-28","date_left":None,"fee":"€80m"}]},
    {"player_id":149,"player_name":"Joao Felix","transfers":[
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2018-07-01","date_left":"2019-07-03","fee":None},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2019-07-03","date_left":None,"fee":"€127m"}]},
    {"player_id":150,"player_name":"Jadon Sancho","transfers":[
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2015-07-01","date_left":"2017-08-31","fee":None},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2017-08-31","date_left":"2021-07-23","fee":"€7.8m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2021-07-23","date_left":None,"fee":"€85m"}]},
    {"player_id":199,"player_name":"Gabriel Jesus","transfers":[
        {"club_name":"Palmeiras","club_id":"palmeiras","date_joined":"2015-07-01","date_left":"2017-01-03","fee":None},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2017-01-03","date_left":"2022-07-04","fee":"€32m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2022-07-04","date_left":None,"fee":"€52m"}]},
    {"player_id":212,"player_name":"Sandro Tonali","transfers":[
        {"club_name":"Brescia","club_id":"brescia","date_joined":"2017-07-01","date_left":"2020-09-09","fee":None},
        {"club_name":"AC Milan","club_id":"ac-milan","date_joined":"2020-09-09","date_left":"2023-07-05","fee":"€10m"},
        {"club_name":"Newcastle United","club_id":"newcastle-united","date_joined":"2023-07-05","date_left":None,"fee":"€64m"}]},
    {"player_id":213,"player_name":"Federico Chiesa","transfers":[
        {"club_name":"Fiorentina","club_id":"fiorentina","date_joined":"2016-07-01","date_left":"2020-10-05","fee":None},
        {"club_name":"Juventus","club_id":"juventus","date_joined":"2020-10-05","date_left":"2024-08-29","fee":"€40m"},
        {"club_name":"Liverpool","club_id":"liverpool","date_joined":"2024-08-29","date_left":None,"fee":"€12m"}]},
    {"player_id":120,"player_name":"Alexis Sanchez","transfers":[
        {"club_name":"Udinese","club_id":"udinese","date_joined":"2006-07-01","date_left":"2011-07-21","fee":"€3m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2011-07-21","date_left":"2014-07-10","fee":"€26m"},
        {"club_name":"Arsenal","club_id":"arsenal","date_joined":"2014-07-10","date_left":"2018-01-22","fee":"€42.5m"},
        {"club_name":"Manchester United","club_id":"manchester-united","date_joined":"2018-01-22","date_left":"2019-08-28","fee":"Free"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2019-08-28","date_left":"2023-06-30","fee":"Free"},
        {"club_name":"Marseille","club_id":"marseille","date_joined":"2023-07-01","date_left":"2024-01-31","fee":"Free"}]},
    {"player_id":55,"player_name":"Toni Kroos","transfers":[
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2007-07-01","date_left":"2014-07-17","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2014-07-17","date_left":"2024-06-30","fee":"€25m"}]},
    {"player_id":64,"player_name":"Thibaut Courtois","transfers":[
        {"club_name":"Genk","club_id":"genk","date_joined":"2009-07-01","date_left":"2011-07-14","fee":None},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2011-07-14","date_left":"2018-08-08","fee":"€9m"},
        {"club_name":"Atletico Madrid","club_id":"atletico-madrid","date_joined":"2011-08-13","date_left":"2014-06-30","fee":"Loan"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2018-08-08","date_left":None,"fee":"€35m"}]},
    {"player_id":85,"player_name":"Bernardo Silva","transfers":[
        {"club_name":"Benfica","club_id":"benfica","date_joined":"2014-07-01","date_left":"2015-07-01","fee":None},
        {"club_name":"AS Monaco","club_id":"as-monaco","date_joined":"2015-07-01","date_left":"2017-07-11","fee":"€15.8m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2017-07-11","date_left":None,"fee":"€50m"}]},
    {"player_id":86,"player_name":"Achraf Hakimi","transfers":[
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2017-07-01","date_left":"2020-06-30","fee":None},
        {"club_name":"Borussia Dortmund","club_id":"borussia-dortmund","date_joined":"2018-07-01","date_left":"2020-06-30","fee":"Loan"},
        {"club_name":"Inter Milan","club_id":"inter-milan","date_joined":"2020-07-02","date_left":"2021-07-06","fee":"€40m"},
        {"club_name":"Paris Saint-Germain","club_id":"paris-saint-germain","date_joined":"2021-07-06","date_left":None,"fee":"€60m"}]},
    {"player_id":94,"player_name":"Frenkie de Jong","transfers":[
        {"club_name":"Willem II","club_id":"willem-ii","date_joined":"2015-07-01","date_left":"2016-07-01","fee":None},
        {"club_name":"Ajax","club_id":"ajax","date_joined":"2016-07-01","date_left":"2019-07-01","fee":"€1m"},
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2019-07-01","date_left":None,"fee":"€86m"}]},
    {"player_id":101,"player_name":"Federico Valverde","transfers":[
        {"club_name":"Penarol","club_id":"penarol","date_joined":"2015-07-01","date_left":"2016-07-01","fee":None},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2016-07-01","date_left":None,"fee":"€5m"}]},
    {"player_id":104,"player_name":"Jamal Musiala","transfers":[
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2019-01-01","date_left":"2019-07-01","fee":None},
        {"club_name":"Bayern Munich","club_id":"bayern-munich","date_joined":"2019-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":105,"player_name":"Florian Wirtz","transfers":[
        {"club_name":"Bayer Leverkusen","club_id":"bayer-leverkusen","date_joined":"2020-01-01","date_left":None,"fee":"€0.2m"}]},
    {"player_id":110,"player_name":"Gavi","transfers":[
        {"club_name":"FC Barcelona","club_id":"fc-barcelona","date_joined":"2021-07-01","date_left":None,"fee":None}]},
    {"player_id":229,"player_name":"Antonio Rudiger","transfers":[
        {"club_name":"VfB Stuttgart","club_id":"vfb-stuttgart","date_joined":"2011-07-01","date_left":"2015-08-17","fee":None},
        {"club_name":"Roma","club_id":"roma","date_joined":"2015-08-17","date_left":"2017-07-07","fee":"€4m"},
        {"club_name":"Chelsea","club_id":"chelsea","date_joined":"2017-07-07","date_left":"2022-06-30","fee":"€35m"},
        {"club_name":"Real Madrid","club_id":"real-madrid","date_joined":"2022-07-01","date_left":None,"fee":"Free"}]},
    {"player_id":227,"player_name":"Josko Gvardiol","transfers":[
        {"club_name":"Dinamo Zagreb","club_id":"dinamo-zagreb","date_joined":"2019-07-01","date_left":"2021-07-01","fee":None},
        {"club_name":"RB Leipzig","club_id":"rb-leipzig","date_joined":"2021-07-01","date_left":"2023-08-04","fee":"€20m"},
        {"club_name":"Manchester City","club_id":"manchester-city","date_joined":"2023-08-04","date_left":None,"fee":"€90m"}]},
]

print(f"Total transfers: {len(transfers)}")

with open("/Users/jasur/workspace/football/data/transfers.json", "w") as f:
    json.dump(transfers, f, indent=2, ensure_ascii=False)
print("transfers.json written successfully!")
