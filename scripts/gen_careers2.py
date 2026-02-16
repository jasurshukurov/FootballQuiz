#!/usr/bin/env python3
"""Generate professional + semi_pro tiers."""
import json

players = json.load(open("/Users/jasur/workspace/football/scripts/_careers_part1.json"))

professional = [
    {"id":131,"name":"Mesut Ozil","nationality":"Germany","position":"Midfielder","career":[
        {"club":"Schalke 04","from":2006,"to":2008},{"club":"Werder Bremen","from":2008,"to":2010},{"club":"Real Madrid","from":2010,"to":2013},{"club":"Arsenal","from":2013,"to":2021},{"club":"Fenerbahce","from":2021,"to":2022},{"club":"Istanbul Basaksehir","from":2022,"to":2023}]},
    {"id":132,"name":"Radamel Falcao","nationality":"Colombia","position":"Forward","career":[
        {"club":"River Plate","from":2005,"to":2009},{"club":"Porto","from":2009,"to":2011},{"club":"Atletico Madrid","from":2011,"to":2013},{"club":"AS Monaco","from":2013,"to":2019},{"club":"Manchester United","from":2014,"to":2015},{"club":"Chelsea","from":2015,"to":2016},{"club":"Galatasaray","from":2019,"to":2020},{"club":"Rayo Vallecano","from":2021,"to":2022}]},
    {"id":133,"name":"Diego Costa","nationality":"Spain","position":"Forward","career":[
        {"club":"Braga","from":2007,"to":2009},{"club":"Atletico Madrid","from":2007,"to":2014},{"club":"Celta Vigo","from":2008,"to":2009},{"club":"Valladolid","from":2009,"to":2010},{"club":"Rayo Vallecano","from":2010,"to":2011},{"club":"Chelsea","from":2014,"to":2018},{"club":"Atletico Madrid","from":2018,"to":2021}]},
    {"id":134,"name":"Romelu Lukaku","nationality":"Belgium","position":"Forward","career":[
        {"club":"Anderlecht","from":2009,"to":2011},{"club":"Chelsea","from":2011,"to":2014},{"club":"West Bromwich Albion","from":2012,"to":2013},{"club":"Everton","from":2013,"to":2017},{"club":"Manchester United","from":2017,"to":2019},{"club":"Inter Milan","from":2019,"to":2021},{"club":"Chelsea","from":2021,"to":2023},{"club":"Inter Milan","from":2022,"to":2023},{"club":"Roma","from":2023,"to":2024},{"club":"Napoli","from":2024,"to":2025}]},
    {"id":135,"name":"Olivier Giroud","nationality":"France","position":"Forward","career":[
        {"club":"Grenoble","from":2005,"to":2008},{"club":"Istres","from":2007,"to":2008},{"club":"Tours","from":2008,"to":2010},{"club":"Montpellier","from":2010,"to":2012},{"club":"Arsenal","from":2012,"to":2018},{"club":"Chelsea","from":2018,"to":2021},{"club":"AC Milan","from":2021,"to":2024},{"club":"Los Angeles FC","from":2024,"to":2025}]},
    {"id":136,"name":"Xabi Alonso","nationality":"Spain","position":"Midfielder","career":[
        {"club":"Real Sociedad","from":1999,"to":2004},{"club":"Liverpool","from":2004,"to":2009},{"club":"Real Madrid","from":2009,"to":2014},{"club":"Bayern Munich","from":2014,"to":2017}]},
    {"id":137,"name":"Michael Ballack","nationality":"Germany","position":"Midfielder","career":[
        {"club":"Chemnitzer FC","from":1995,"to":1997},{"club":"Kaiserslautern","from":1997,"to":1999},{"club":"Bayer Leverkusen","from":1999,"to":2002},{"club":"Bayern Munich","from":2002,"to":2006},{"club":"Chelsea","from":2006,"to":2010},{"club":"Bayer Leverkusen","from":2010,"to":2012}]},
    {"id":138,"name":"Wesley Sneijder","nationality":"Netherlands","position":"Midfielder","career":[
        {"club":"Ajax","from":2002,"to":2007},{"club":"Real Madrid","from":2007,"to":2009},{"club":"Inter Milan","from":2009,"to":2013},{"club":"Galatasaray","from":2013,"to":2017},{"club":"Nice","from":2017,"to":2018},{"club":"Al Gharafa","from":2018,"to":2019}]},
    {"id":139,"name":"Carlos Tevez","nationality":"Argentina","position":"Forward","career":[
        {"club":"Boca Juniors","from":2001,"to":2005},{"club":"Corinthians","from":2005,"to":2006},{"club":"West Ham United","from":2006,"to":2007},{"club":"Manchester United","from":2007,"to":2009},{"club":"Manchester City","from":2009,"to":2013},{"club":"Juventus","from":2013,"to":2015},{"club":"Boca Juniors","from":2015,"to":2021}]},
    {"id":140,"name":"Miroslav Klose","nationality":"Germany","position":"Forward","career":[
        {"club":"Kaiserslautern","from":1999,"to":2004},{"club":"Werder Bremen","from":2004,"to":2007},{"club":"Bayern Munich","from":2007,"to":2011},{"club":"Lazio","from":2011,"to":2016}]},
    {"id":141,"name":"Bastian Schweinsteiger","nationality":"Germany","position":"Midfielder","career":[
        {"club":"Bayern Munich","from":2002,"to":2015},{"club":"Manchester United","from":2015,"to":2017},{"club":"Chicago Fire","from":2017,"to":2019}]},
    {"id":142,"name":"David Villa","nationality":"Spain","position":"Forward","career":[
        {"club":"Sporting Gijon","from":2001,"to":2003},{"club":"Real Zaragoza","from":2003,"to":2005},{"club":"Valencia","from":2005,"to":2010},{"club":"FC Barcelona","from":2010,"to":2013},{"club":"Atletico Madrid","from":2013,"to":2014},{"club":"New York City FC","from":2014,"to":2018},{"club":"Vissel Kobe","from":2019,"to":2019}]},
    {"id":143,"name":"Ivan Rakitic","nationality":"Croatia","position":"Midfielder","career":[
        {"club":"Basel","from":2005,"to":2007},{"club":"Schalke 04","from":2007,"to":2011},{"club":"Sevilla","from":2011,"to":2014},{"club":"FC Barcelona","from":2014,"to":2020},{"club":"Sevilla","from":2020,"to":2024}]},
    {"id":144,"name":"Mario Mandzukic","nationality":"Croatia","position":"Forward","career":[
        {"club":"Marsonia","from":2004,"to":2005},{"club":"NK Zagreb","from":2005,"to":2007},{"club":"Dinamo Zagreb","from":2007,"to":2010},{"club":"VfL Wolfsburg","from":2010,"to":2012},{"club":"Bayern Munich","from":2012,"to":2014},{"club":"Atletico Madrid","from":2014,"to":2015},{"club":"Juventus","from":2015,"to":2019},{"club":"Al-Duhail","from":2020,"to":2020},{"club":"AC Milan","from":2021,"to":2021}]},
    {"id":145,"name":"Arturo Vidal","nationality":"Chile","position":"Midfielder","career":[
        {"club":"Colo-Colo","from":2005,"to":2007},{"club":"Bayer Leverkusen","from":2007,"to":2011},{"club":"Juventus","from":2011,"to":2015},{"club":"Bayern Munich","from":2015,"to":2018},{"club":"FC Barcelona","from":2018,"to":2020},{"club":"Inter Milan","from":2020,"to":2021},{"club":"Flamengo","from":2022,"to":2023}]},
    {"id":146,"name":"Philippe Coutinho","nationality":"Brazil","position":"Midfielder","career":[
        {"club":"Inter Milan","from":2010,"to":2013},{"club":"Vasco da Gama","from":2009,"to":2010},{"club":"Espanyol","from":2012,"to":2012},{"club":"Liverpool","from":2013,"to":2018},{"club":"FC Barcelona","from":2018,"to":2023},{"club":"Bayern Munich","from":2019,"to":2020},{"club":"Aston Villa","from":2022,"to":2023},{"club":"Al-Duhail","from":2023,"to":2024}]},
    {"id":147,"name":"Leroy Sane","nationality":"Germany","position":"Forward","career":[
        {"club":"Schalke 04","from":2014,"to":2016},{"club":"Manchester City","from":2016,"to":2020},{"club":"Bayern Munich","from":2020,"to":2025}]},
    {"id":148,"name":"Marcus Rashford","nationality":"England","position":"Forward","career":[
        {"club":"Manchester United","from":2016,"to":2025}]},
    {"id":149,"name":"Joao Felix","nationality":"Portugal","position":"Forward","career":[
        {"club":"Benfica","from":2018,"to":2019},{"club":"Atletico Madrid","from":2019,"to":2025},{"club":"Chelsea","from":2023,"to":2023},{"club":"FC Barcelona","from":2023,"to":2024}]},
    {"id":150,"name":"Jadon Sancho","nationality":"England","position":"Forward","career":[
        {"club":"Manchester City","from":2015,"to":2017},{"club":"Borussia Dortmund","from":2017,"to":2021},{"club":"Manchester United","from":2021,"to":2025},{"club":"Borussia Dortmund","from":2024,"to":2024},{"club":"Chelsea","from":2025,"to":2025}]},
    {"id":151,"name":"Hakim Ziyech","nationality":"Morocco","position":"Forward","career":[
        {"club":"Heerenveen","from":2012,"to":2014},{"club":"Twente","from":2014,"to":2016},{"club":"Ajax","from":2016,"to":2020},{"club":"Chelsea","from":2020,"to":2023},{"club":"Galatasaray","from":2023,"to":2025}]},
    {"id":152,"name":"Nicolas Pepe","nationality":"Ivory Coast","position":"Forward","career":[
        {"club":"Angers","from":2013,"to":2014},{"club":"Orleans","from":2014,"to":2016},{"club":"Angers","from":2016,"to":2017},{"club":"Lille","from":2017,"to":2019},{"club":"Arsenal","from":2019,"to":2023},{"club":"Nice","from":2022,"to":2023},{"club":"Trabzonspor","from":2023,"to":2024},{"club":"Villarreal","from":2024,"to":2025}]},
    {"id":153,"name":"Raphael Guerreiro","nationality":"Portugal","position":"Defender","career":[
        {"club":"Caen","from":2013,"to":2014},{"club":"Lorient","from":2014,"to":2016},{"club":"Borussia Dortmund","from":2016,"to":2023},{"club":"Bayern Munich","from":2023,"to":2025}]},
    {"id":154,"name":"David Luiz","nationality":"Brazil","position":"Defender","career":[
        {"club":"Vitoria","from":2006,"to":2007},{"club":"Benfica","from":2007,"to":2011},{"club":"Chelsea","from":2011,"to":2014},{"club":"Paris Saint-Germain","from":2014,"to":2016},{"club":"Chelsea","from":2016,"to":2019},{"club":"Arsenal","from":2019,"to":2021},{"club":"Flamengo","from":2021,"to":2024}]},
    {"id":155,"name":"Keylor Navas","nationality":"Costa Rica","position":"Goalkeeper","career":[
        {"club":"Saprissa","from":2005,"to":2010},{"club":"Albacete","from":2010,"to":2011},{"club":"Levante","from":2011,"to":2014},{"club":"Real Madrid","from":2014,"to":2019},{"club":"Paris Saint-Germain","from":2019,"to":2024}]},
    {"id":156,"name":"Juan Mata","nationality":"Spain","position":"Midfielder","career":[
        {"club":"Real Madrid Castilla","from":2006,"to":2007},{"club":"Valencia","from":2007,"to":2011},{"club":"Chelsea","from":2011,"to":2014},{"club":"Manchester United","from":2014,"to":2022},{"club":"Galatasaray","from":2022,"to":2023}]},
    {"id":157,"name":"Santi Cazorla","nationality":"Spain","position":"Midfielder","career":[
        {"club":"Villarreal","from":2003,"to":2011},{"club":"Recreativo","from":2003,"to":2004},{"club":"Malaga","from":2011,"to":2012},{"club":"Arsenal","from":2012,"to":2018},{"club":"Villarreal","from":2018,"to":2020},{"club":"Al Sadd","from":2020,"to":2022}]},
    {"id":158,"name":"Willian","nationality":"Brazil","position":"Forward","career":[
        {"club":"Corinthians","from":2006,"to":2007},{"club":"Shakhtar Donetsk","from":2007,"to":2013},{"club":"Anzhi Makhachkala","from":2013,"to":2013},{"club":"Chelsea","from":2013,"to":2020},{"club":"Arsenal","from":2020,"to":2021},{"club":"Corinthians","from":2021,"to":2023},{"club":"Olympiacos","from":2023,"to":2024},{"club":"Fulham","from":2024,"to":2025}]},
    {"id":159,"name":"Douglas Costa","nationality":"Brazil","position":"Forward","career":[
        {"club":"Gremio","from":2008,"to":2010},{"club":"Shakhtar Donetsk","from":2010,"to":2015},{"club":"Bayern Munich","from":2015,"to":2020},{"club":"Juventus","from":2017,"to":2021},{"club":"Gremio","from":2021,"to":2022},{"club":"LA Galaxy","from":2022,"to":2023}]},
    {"id":160,"name":"Memphis Depay","nationality":"Netherlands","position":"Forward","career":[
        {"club":"PSV Eindhoven","from":2011,"to":2015},{"club":"Manchester United","from":2015,"to":2017},{"club":"Lyon","from":2017,"to":2021},{"club":"FC Barcelona","from":2021,"to":2023},{"club":"Atletico Madrid","from":2023,"to":2024},{"club":"Corinthians","from":2024,"to":2025}]},
    {"id":161,"name":"Mario Balotelli","nationality":"Italy","position":"Forward","career":[
        {"club":"Inter Milan","from":2007,"to":2010},{"club":"Manchester City","from":2010,"to":2013},{"club":"AC Milan","from":2013,"to":2014},{"club":"Liverpool","from":2014,"to":2015},{"club":"AC Milan","from":2015,"to":2016},{"club":"Nice","from":2016,"to":2019},{"club":"Marseille","from":2019,"to":2019},{"club":"Brescia","from":2019,"to":2020},{"club":"Monza","from":2020,"to":2021},{"club":"Adana Demirspor","from":2021,"to":2023}]},
    {"id":162,"name":"Andre-Pierre Gignac","nationality":"France","position":"Forward","career":[
        {"club":"Lorient","from":2004,"to":2007},{"club":"Toulouse","from":2007,"to":2010},{"club":"Marseille","from":2010,"to":2015},{"club":"Tigres UANL","from":2015,"to":2025}]},
    {"id":163,"name":"Alvaro Morata","nationality":"Spain","position":"Forward","career":[
        {"club":"Real Madrid","from":2010,"to":2014},{"club":"Juventus","from":2014,"to":2016},{"club":"Real Madrid","from":2016,"to":2017},{"club":"Chelsea","from":2017,"to":2019},{"club":"Atletico Madrid","from":2019,"to":2022},{"club":"Juventus","from":2020,"to":2022},{"club":"Atletico Madrid","from":2022,"to":2024},{"club":"AC Milan","from":2024,"to":2025}]},
    {"id":164,"name":"Nabil Fekir","nationality":"France","position":"Forward","career":[
        {"club":"Lyon","from":2013,"to":2019},{"club":"Real Betis","from":2019,"to":2025}]},
    {"id":165,"name":"Oscar","nationality":"Brazil","position":"Midfielder","career":[
        {"club":"Sao Paulo","from":2008,"to":2009},{"club":"Internacional","from":2009,"to":2012},{"club":"Chelsea","from":2012,"to":2017},{"club":"Shanghai Port","from":2017,"to":2024}]},
    {"id":166,"name":"Patrice Evra","nationality":"France","position":"Defender","career":[
        {"club":"Marsala","from":1998,"to":1999},{"club":"Monza","from":1999,"to":2000},{"club":"Nice","from":2000,"to":2002},{"club":"AS Monaco","from":2002,"to":2006},{"club":"Manchester United","from":2006,"to":2014},{"club":"Juventus","from":2014,"to":2017},{"club":"Marseille","from":2017,"to":2018},{"club":"West Ham United","from":2018,"to":2018}]},
    {"id":167,"name":"Ashley Cole","nationality":"England","position":"Defender","career":[
        {"club":"Arsenal","from":1999,"to":2006},{"club":"Chelsea","from":2006,"to":2014},{"club":"Roma","from":2014,"to":2015},{"club":"LA Galaxy","from":2016,"to":2018},{"club":"Derby County","from":2019,"to":2020}]},
    {"id":168,"name":"Nemanja Vidic","nationality":"Serbia","position":"Defender","career":[
        {"club":"Red Star Belgrade","from":2000,"to":2004},{"club":"Spartak Moscow","from":2004,"to":2006},{"club":"Manchester United","from":2006,"to":2014},{"club":"Inter Milan","from":2014,"to":2016}]},
    {"id":169,"name":"Rio Ferdinand","nationality":"England","position":"Defender","career":[
        {"club":"West Ham United","from":1996,"to":2000},{"club":"Bournemouth","from":1996,"to":1997},{"club":"Leeds United","from":2000,"to":2002},{"club":"Manchester United","from":2002,"to":2014},{"club":"Queens Park Rangers","from":2014,"to":2015}]},
    {"id":170,"name":"Carles Puyol","nationality":"Spain","position":"Defender","career":[
        {"club":"FC Barcelona","from":1999,"to":2014}]},
    {"id":171,"name":"John Terry","nationality":"England","position":"Defender","career":[
        {"club":"Chelsea","from":1998,"to":2017},{"club":"Aston Villa","from":2017,"to":2018}]},
    {"id":172,"name":"Philipp Lahm","nationality":"Germany","position":"Defender","career":[
        {"club":"Bayern Munich","from":2002,"to":2017},{"club":"VfB Stuttgart","from":2003,"to":2005}]},
    {"id":173,"name":"Mats Hummels","nationality":"Germany","position":"Defender","career":[
        {"club":"Bayern Munich","from":2007,"to":2009},{"club":"Borussia Dortmund","from":2008,"to":2016},{"club":"Bayern Munich","from":2016,"to":2019},{"club":"Borussia Dortmund","from":2019,"to":2024},{"club":"Roma","from":2024,"to":2025}]},
    {"id":174,"name":"Jerome Boateng","nationality":"Germany","position":"Defender","career":[
        {"club":"Hertha Berlin","from":2006,"to":2010},{"club":"Hamburg","from":2007,"to":2008},{"club":"Manchester City","from":2010,"to":2011},{"club":"Bayern Munich","from":2011,"to":2021},{"club":"Lyon","from":2021,"to":2023},{"club":"Salernitana","from":2023,"to":2023}]},
    {"id":175,"name":"Pepe","nationality":"Portugal","position":"Defender","career":[
        {"club":"Maritimo","from":2002,"to":2004},{"club":"Porto","from":2004,"to":2007},{"club":"Real Madrid","from":2007,"to":2017},{"club":"Besiktas","from":2017,"to":2019},{"club":"Porto","from":2019,"to":2024}]},
    {"id":176,"name":"Mauro Icardi","nationality":"Argentina","position":"Forward","career":[
        {"club":"FC Barcelona","from":2008,"to":2011},{"club":"Sampdoria","from":2011,"to":2013},{"club":"Inter Milan","from":2013,"to":2020},{"club":"Paris Saint-Germain","from":2019,"to":2023},{"club":"Galatasaray","from":2023,"to":2025}]},
    {"id":177,"name":"Pedro Rodriguez","nationality":"Spain","position":"Forward","career":[
        {"club":"FC Barcelona","from":2008,"to":2015},{"club":"Chelsea","from":2015,"to":2020},{"club":"Roma","from":2020,"to":2021},{"club":"Lazio","from":2021,"to":2024}]},
    {"id":178,"name":"Marco Reus","nationality":"Germany","position":"Forward","career":[
        {"club":"Borussia Monchengladbach","from":2009,"to":2012},{"club":"Borussia Dortmund","from":2012,"to":2024},{"club":"LA Galaxy","from":2025,"to":2025}]},
    {"id":179,"name":"Julian Draxler","nationality":"Germany","position":"Midfielder","career":[
        {"club":"Schalke 04","from":2011,"to":2015},{"club":"VfL Wolfsburg","from":2015,"to":2017},{"club":"Paris Saint-Germain","from":2017,"to":2024},{"club":"Benfica","from":2023,"to":2024},{"club":"Al-Ahli","from":2024,"to":2025}]},
    {"id":180,"name":"Henrikh Mkhitaryan","nationality":"Armenia","position":"Midfielder","career":[
        {"club":"Pyunik","from":2006,"to":2009},{"club":"Metalurh Donetsk","from":2009,"to":2010},{"club":"Shakhtar Donetsk","from":2010,"to":2013},{"club":"Borussia Dortmund","from":2013,"to":2016},{"club":"Manchester United","from":2016,"to":2018},{"club":"Arsenal","from":2018,"to":2019},{"club":"Roma","from":2019,"to":2021},{"club":"Inter Milan","from":2021,"to":2025}]},
    {"id":181,"name":"Andre Silva","nationality":"Portugal","position":"Forward","career":[
        {"club":"Porto","from":2015,"to":2017},{"club":"AC Milan","from":2017,"to":2019},{"club":"Sevilla","from":2018,"to":2019},{"club":"Eintracht Frankfurt","from":2019,"to":2021},{"club":"RB Leipzig","from":2021,"to":2024}]},
    {"id":182,"name":"Ivan Perisic","nationality":"Croatia","position":"Forward","career":[
        {"club":"Sochaux","from":2007,"to":2009},{"club":"Roeselare","from":2009,"to":2009},{"club":"Club Brugge","from":2009,"to":2011},{"club":"Borussia Dortmund","from":2011,"to":2013},{"club":"VfL Wolfsburg","from":2013,"to":2015},{"club":"Inter Milan","from":2015,"to":2022},{"club":"Bayern Munich","from":2019,"to":2020},{"club":"Tottenham Hotspur","from":2022,"to":2023},{"club":"Hajduk Split","from":2023,"to":2025}]},
    {"id":183,"name":"Kalidou Koulibaly","nationality":"Senegal","position":"Defender","career":[
        {"club":"Metz","from":2010,"to":2012},{"club":"Genk","from":2012,"to":2014},{"club":"Napoli","from":2014,"to":2022},{"club":"Chelsea","from":2022,"to":2023},{"club":"Al-Hilal","from":2023,"to":2025}]},
    {"id":184,"name":"Matthijs de Ligt","nationality":"Netherlands","position":"Defender","career":[
        {"club":"Ajax","from":2017,"to":2019},{"club":"Juventus","from":2019,"to":2022},{"club":"Bayern Munich","from":2022,"to":2024},{"club":"Manchester United","from":2024,"to":2025}]},
    {"id":185,"name":"Aymeric Laporte","nationality":"Spain","position":"Defender","career":[
        {"club":"Athletic Bilbao","from":2012,"to":2018},{"club":"Manchester City","from":2018,"to":2023},{"club":"Al-Nassr","from":2023,"to":2025}]},
    {"id":186,"name":"Youri Tielemans","nationality":"Belgium","position":"Midfielder","career":[
        {"club":"Anderlecht","from":2013,"to":2017},{"club":"AS Monaco","from":2017,"to":2019},{"club":"Leicester City","from":2019,"to":2023},{"club":"Aston Villa","from":2023,"to":2025}]},
    {"id":187,"name":"Ilkay Gundogan","nationality":"Germany","position":"Midfielder","career":[
        {"club":"Nurnberg","from":2009,"to":2011},{"club":"Borussia Dortmund","from":2011,"to":2016},{"club":"Manchester City","from":2016,"to":2023},{"club":"FC Barcelona","from":2023,"to":2024},{"club":"Manchester City","from":2024,"to":2025}]},
    {"id":188,"name":"Wissam Ben Yedder","nationality":"France","position":"Forward","career":[
        {"club":"Toulouse","from":2010,"to":2016},{"club":"Sevilla","from":2016,"to":2019},{"club":"AS Monaco","from":2019,"to":2024}]},
    {"id":189,"name":"Roberto Firmino","nationality":"Brazil","position":"Forward","career":[
        {"club":"Figueirense","from":2009,"to":2011},{"club":"TSG Hoffenheim","from":2011,"to":2015},{"club":"Liverpool","from":2015,"to":2023},{"club":"Al-Ahli","from":2023,"to":2025}]},
    {"id":190,"name":"Fabinho","nationality":"Brazil","position":"Midfielder","career":[
        {"club":"Fluminense","from":2012,"to":2013},{"club":"Rio Ave","from":2012,"to":2013},{"club":"Real Madrid Castilla","from":2013,"to":2013},{"club":"AS Monaco","from":2013,"to":2018},{"club":"Liverpool","from":2018,"to":2023},{"club":"Al-Ittihad","from":2023,"to":2025}]},
    {"id":191,"name":"Diogo Jota","nationality":"Portugal","position":"Forward","career":[
        {"club":"Pacos de Ferreira","from":2014,"to":2016},{"club":"Atletico Madrid","from":2016,"to":2017},{"club":"Porto","from":2016,"to":2017},{"club":"Wolverhampton","from":2017,"to":2020},{"club":"Liverpool","from":2020,"to":2025}]},
    {"id":192,"name":"Joao Cancelo","nationality":"Portugal","position":"Defender","career":[
        {"club":"Benfica","from":2014,"to":2015},{"club":"Valencia","from":2015,"to":2017},{"club":"Inter Milan","from":2017,"to":2018},{"club":"Juventus","from":2018,"to":2019},{"club":"Manchester City","from":2019,"to":2025}]},
    {"id":193,"name":"Kyle Walker","nationality":"England","position":"Defender","career":[
        {"club":"Sheffield United","from":2008,"to":2009},{"club":"Tottenham Hotspur","from":2009,"to":2017},{"club":"Northampton Town","from":2009,"to":2009},{"club":"Queens Park Rangers","from":2010,"to":2011},{"club":"Aston Villa","from":2011,"to":2011},{"club":"Manchester City","from":2017,"to":2025},{"club":"AC Milan","from":2025,"to":2025}]},
    {"id":194,"name":"Stefan Savic","nationality":"Montenegro","position":"Defender","career":[
        {"club":"Partizan","from":2009,"to":2011},{"club":"Manchester City","from":2011,"to":2012},{"club":"Fiorentina","from":2012,"to":2015},{"club":"Atletico Madrid","from":2015,"to":2024}]},
    {"id":195,"name":"Victor Osimhen","nationality":"Nigeria","position":"Forward","career":[
        {"club":"VfL Wolfsburg","from":2017,"to":2018},{"club":"Charleroi","from":2018,"to":2019},{"club":"Lille","from":2019,"to":2020},{"club":"Napoli","from":2020,"to":2025},{"club":"Galatasaray","from":2024,"to":2025}]},
    {"id":196,"name":"Dusan Vlahovic","nationality":"Serbia","position":"Forward","career":[
        {"club":"Partizan","from":2016,"to":2018},{"club":"Fiorentina","from":2018,"to":2022},{"club":"Juventus","from":2022,"to":2025}]},
    {"id":197,"name":"Rafael Leao","nationality":"Portugal","position":"Forward","career":[
        {"club":"Sporting CP","from":2018,"to":2019},{"club":"Lille","from":2019,"to":2019},{"club":"AC Milan","from":2019,"to":2025}]},
    {"id":198,"name":"Martin Odegaard","nationality":"Norway","position":"Midfielder","career":[
        {"club":"Stromsgodset","from":2014,"to":2015},{"club":"Real Madrid","from":2015,"to":2021},{"club":"Heerenveen","from":2017,"to":2018},{"club":"Vitesse","from":2018,"to":2019},{"club":"Real Sociedad","from":2019,"to":2021},{"club":"Arsenal","from":2021,"to":2025}]},
    {"id":199,"name":"Gabriel Jesus","nationality":"Brazil","position":"Forward","career":[
        {"club":"Palmeiras","from":2015,"to":2017},{"club":"Manchester City","from":2017,"to":2022},{"club":"Arsenal","from":2022,"to":2025}]},
    {"id":200,"name":"Ferran Torres","nationality":"Spain","position":"Forward","career":[
        {"club":"Valencia","from":2017,"to":2020},{"club":"Manchester City","from":2020,"to":2022},{"club":"FC Barcelona","from":2022,"to":2025}]},
    {"id":201,"name":"Yaya Toure","nationality":"Ivory Coast","position":"Midfielder","career":[
        {"club":"Beveren","from":2001,"to":2003},{"club":"Metalurh Donetsk","from":2003,"to":2005},{"club":"Olympiacos","from":2005,"to":2006},{"club":"AS Monaco","from":2006,"to":2007},{"club":"FC Barcelona","from":2007,"to":2010},{"club":"Manchester City","from":2010,"to":2018},{"club":"Olympiacos","from":2018,"to":2019}]},
    {"id":202,"name":"Clarence Seedorf","nationality":"Netherlands","position":"Midfielder","career":[
        {"club":"Ajax","from":1992,"to":1995},{"club":"Sampdoria","from":1995,"to":1996},{"club":"Real Madrid","from":1996,"to":1999},{"club":"Inter Milan","from":1999,"to":2002},{"club":"AC Milan","from":2002,"to":2012},{"club":"Botafogo","from":2012,"to":2014}]},
    {"id":203,"name":"Claude Makelele","nationality":"France","position":"Midfielder","career":[
        {"club":"Nantes","from":1992,"to":1997},{"club":"Marseille","from":1997,"to":1998},{"club":"Celta Vigo","from":1998,"to":2000},{"club":"Real Madrid","from":2000,"to":2003},{"club":"Chelsea","from":2003,"to":2008},{"club":"Paris Saint-Germain","from":2008,"to":2011}]},
    {"id":204,"name":"Michael Essien","nationality":"Ghana","position":"Midfielder","career":[
        {"club":"Bastia","from":2000,"to":2003},{"club":"Lyon","from":2003,"to":2005},{"club":"Chelsea","from":2005,"to":2014},{"club":"Real Madrid","from":2012,"to":2013},{"club":"AC Milan","from":2014,"to":2015},{"club":"Panathinaikos","from":2015,"to":2016},{"club":"Persib Bandung","from":2017,"to":2018}]},
    {"id":205,"name":"Nwankwo Kanu","nationality":"Nigeria","position":"Forward","career":[
        {"club":"Iwuanyanwu Nationale","from":1992,"to":1993},{"club":"Ajax","from":1993,"to":1996},{"club":"Inter Milan","from":1996,"to":1999},{"club":"Arsenal","from":1999,"to":2004},{"club":"West Bromwich Albion","from":2004,"to":2006},{"club":"Portsmouth","from":2006,"to":2012}]},
    {"id":206,"name":"Jay-Jay Okocha","nationality":"Nigeria","position":"Midfielder","career":[
        {"club":"Enugu Rangers","from":1990,"to":1991},{"club":"Borussia Neunkirchen","from":1991,"to":1992},{"club":"Eintracht Frankfurt","from":1992,"to":1996},{"club":"Fenerbahce","from":1996,"to":1998},{"club":"Paris Saint-Germain","from":1998,"to":2002},{"club":"Bolton Wanderers","from":2002,"to":2006},{"club":"Qatar SC","from":2006,"to":2007},{"club":"Hull City","from":2007,"to":2008}]},
    {"id":207,"name":"Hidetoshi Nakata","nationality":"Japan","position":"Midfielder","career":[
        {"club":"Bellmare Hiratsuka","from":1995,"to":1998},{"club":"Perugia","from":1998,"to":2000},{"club":"Roma","from":2000,"to":2001},{"club":"Parma","from":2001,"to":2004},{"club":"Bologna","from":2004,"to":2005},{"club":"Fiorentina","from":2005,"to":2006},{"club":"Bolton Wanderers","from":2006,"to":2006}]},
    {"id":208,"name":"Park Ji-sung","nationality":"South Korea","position":"Midfielder","career":[
        {"club":"Kyoto Purple Sanga","from":2000,"to":2003},{"club":"PSV Eindhoven","from":2003,"to":2005},{"club":"Manchester United","from":2005,"to":2012},{"club":"Queens Park Rangers","from":2012,"to":2014}]},
    {"id":209,"name":"Tim Cahill","nationality":"Australia","position":"Midfielder","career":[
        {"club":"Sydney United","from":1997,"to":1998},{"club":"Millwall","from":1998,"to":2004},{"club":"Everton","from":2004,"to":2012},{"club":"New York Red Bulls","from":2012,"to":2015},{"club":"Shanghai Shenhua","from":2015,"to":2016},{"club":"Melbourne City","from":2016,"to":2017},{"club":"Millwall","from":2017,"to":2018},{"club":"Jamshedpur","from":2018,"to":2019}]},
    {"id":210,"name":"Shinji Kagawa","nationality":"Japan","position":"Midfielder","career":[
        {"club":"Cerezo Osaka","from":2006,"to":2010},{"club":"Borussia Dortmund","from":2010,"to":2012},{"club":"Manchester United","from":2012,"to":2014},{"club":"Borussia Dortmund","from":2014,"to":2019},{"club":"Real Zaragoza","from":2019,"to":2020},{"club":"PAOK","from":2020,"to":2021},{"club":"Sint-Truiden","from":2021,"to":2023}]},
    {"id":211,"name":"Keisuke Honda","nationality":"Japan","position":"Midfielder","career":[
        {"club":"Nagoya Grampus","from":2004,"to":2008},{"club":"VVV-Venlo","from":2008,"to":2010},{"club":"CSKA Moscow","from":2010,"to":2014},{"club":"AC Milan","from":2014,"to":2017},{"club":"Pachuca","from":2017,"to":2018},{"club":"Melbourne Victory","from":2018,"to":2019},{"club":"Vitesse","from":2019,"to":2020}]},
    {"id":212,"name":"Sandro Tonali","nationality":"Italy","position":"Midfielder","career":[
        {"club":"Brescia","from":2017,"to":2020},{"club":"AC Milan","from":2020,"to":2023},{"club":"Newcastle United","from":2023,"to":2025}]},
    {"id":213,"name":"Federico Chiesa","nationality":"Italy","position":"Forward","career":[
        {"club":"Fiorentina","from":2016,"to":2020},{"club":"Juventus","from":2020,"to":2024},{"club":"Liverpool","from":2024,"to":2025}]},
    {"id":214,"name":"Lorenzo Insigne","nationality":"Italy","position":"Forward","career":[
        {"club":"Napoli","from":2010,"to":2022},{"club":"Cavese","from":2010,"to":2011},{"club":"Foggia","from":2011,"to":2012},{"club":"Pescara","from":2012,"to":2012},{"club":"Toronto FC","from":2022,"to":2025}]},
    {"id":215,"name":"Ciro Immobile","nationality":"Italy","position":"Forward","career":[
        {"club":"Juventus","from":2008,"to":2012},{"club":"Grosseto","from":2009,"to":2010},{"club":"Siena","from":2010,"to":2011},{"club":"Pescara","from":2011,"to":2012},{"club":"Genoa","from":2012,"to":2012},{"club":"Torino","from":2012,"to":2014},{"club":"Borussia Dortmund","from":2014,"to":2015},{"club":"Sevilla","from":2015,"to":2016},{"club":"Lazio","from":2016,"to":2024},{"club":"Besiktas","from":2024,"to":2025}]},
    {"id":216,"name":"Marek Hamsik","nationality":"Slovakia","position":"Midfielder","career":[
        {"club":"Brescia","from":2004,"to":2007},{"club":"Napoli","from":2007,"to":2019},{"club":"Dalian Professional","from":2019,"to":2021},{"club":"Goteborg","from":2021,"to":2022},{"club":"Trabzonspor","from":2022,"to":2024}]},
    {"id":217,"name":"Diego Forlan","nationality":"Uruguay","position":"Forward","career":[
        {"club":"Independiente","from":1998,"to":2002},{"club":"Manchester United","from":2002,"to":2004},{"club":"Villarreal","from":2004,"to":2007},{"club":"Atletico Madrid","from":2007,"to":2011},{"club":"Inter Milan","from":2011,"to":2012},{"club":"Internacional","from":2012,"to":2013},{"club":"Cerezo Osaka","from":2014,"to":2015},{"club":"Penarol","from":2015,"to":2016},{"club":"Mumbai City","from":2016,"to":2016},{"club":"Kitchee","from":2018,"to":2018}]},
    {"id":218,"name":"Adriano","nationality":"Brazil","position":"Forward","career":[
        {"club":"Flamengo","from":2000,"to":2001},{"club":"Inter Milan","from":2001,"to":2009},{"club":"Parma","from":2002,"to":2004},{"club":"Fiorentina","from":2008,"to":2009},{"club":"Sao Paulo","from":2008,"to":2008},{"club":"Flamengo","from":2009,"to":2010},{"club":"Roma","from":2010,"to":2011},{"club":"Corinthians","from":2011,"to":2012},{"club":"Atletico Paranaense","from":2014,"to":2014}]},
    {"id":219,"name":"Luka Jovic","nationality":"Serbia","position":"Forward","career":[
        {"club":"Red Star Belgrade","from":2014,"to":2016},{"club":"Benfica","from":2016,"to":2019},{"club":"Eintracht Frankfurt","from":2017,"to":2019},{"club":"Real Madrid","from":2019,"to":2023},{"club":"Eintracht Frankfurt","from":2021,"to":2022},{"club":"Fiorentina","from":2022,"to":2023},{"club":"AC Milan","from":2023,"to":2025}]},
    {"id":220,"name":"Patrik Schick","nationality":"Czech Republic","position":"Forward","career":[
        {"club":"Sparta Prague","from":2014,"to":2016},{"club":"Sampdoria","from":2016,"to":2017},{"club":"Roma","from":2017,"to":2020},{"club":"RB Leipzig","from":2019,"to":2020},{"club":"Bayer Leverkusen","from":2020,"to":2025}]},
    {"id":221,"name":"Josip Ilicic","nationality":"Slovenia","position":"Forward","career":[
        {"club":"Interblock","from":2007,"to":2008},{"club":"Maribor","from":2008,"to":2010},{"club":"Palermo","from":2010,"to":2013},{"club":"Fiorentina","from":2013,"to":2017},{"club":"Atalanta","from":2017,"to":2022},{"club":"Maribor","from":2022,"to":2024}]},
    {"id":222,"name":"Aleksandar Mitrovic","nationality":"Serbia","position":"Forward","career":[
        {"club":"Partizan","from":2013,"to":2014},{"club":"Anderlecht","from":2014,"to":2015},{"club":"Newcastle United","from":2015,"to":2018},{"club":"Fulham","from":2018,"to":2023},{"club":"Al-Hilal","from":2023,"to":2025}]},
    {"id":223,"name":"Jamie Vardy","nationality":"England","position":"Forward","career":[
        {"club":"Stocksbridge Park Steels","from":2007,"to":2010},{"club":"Halifax Town","from":2010,"to":2011},{"club":"Fleetwood Town","from":2011,"to":2012},{"club":"Leicester City","from":2012,"to":2025}]},
    {"id":224,"name":"Granit Xhaka","nationality":"Switzerland","position":"Midfielder","career":[
        {"club":"Basel","from":2010,"to":2012},{"club":"Borussia Monchengladbach","from":2012,"to":2016},{"club":"Arsenal","from":2016,"to":2023},{"club":"Bayer Leverkusen","from":2023,"to":2025}]},
    {"id":225,"name":"Kai Havertz","nationality":"Germany","position":"Forward","career":[
        {"club":"Bayer Leverkusen","from":2016,"to":2020},{"club":"Chelsea","from":2020,"to":2023},{"club":"Arsenal","from":2023,"to":2025}]},
    {"id":226,"name":"Leon Goretzka","nationality":"Germany","position":"Midfielder","career":[
        {"club":"VfL Bochum","from":2012,"to":2013},{"club":"Schalke 04","from":2013,"to":2018},{"club":"Bayern Munich","from":2018,"to":2025}]},
    {"id":227,"name":"Josko Gvardiol","nationality":"Croatia","position":"Defender","career":[
        {"club":"Dinamo Zagreb","from":2019,"to":2021},{"club":"RB Leipzig","from":2021,"to":2023},{"club":"Manchester City","from":2023,"to":2025}]},
    {"id":228,"name":"Dayot Upamecano","nationality":"France","position":"Defender","career":[
        {"club":"Valenciennes","from":2015,"to":2016},{"club":"Red Bull Salzburg","from":2016,"to":2017},{"club":"RB Leipzig","from":2017,"to":2021},{"club":"Bayern Munich","from":2021,"to":2025}]},
    {"id":229,"name":"Antonio Rudiger","nationality":"Germany","position":"Defender","career":[
        {"club":"VfB Stuttgart","from":2011,"to":2015},{"club":"Roma","from":2015,"to":2017},{"club":"Chelsea","from":2017,"to":2022},{"club":"Real Madrid","from":2022,"to":2025}]},
    {"id":230,"name":"Lisandro Martinez","nationality":"Argentina","position":"Defender","career":[
        {"club":"Newell's Old Boys","from":2017,"to":2019},{"club":"Defensa y Justicia","from":2019,"to":2019},{"club":"Ajax","from":2019,"to":2022},{"club":"Manchester United","from":2022,"to":2025}]},
    {"id":231,"name":"Enzo Fernandez","nationality":"Argentina","position":"Midfielder","career":[
        {"club":"River Plate","from":2020,"to":2022},{"club":"Benfica","from":2022,"to":2023},{"club":"Chelsea","from":2023,"to":2025}]},
    {"id":232,"name":"Aurelien Tchouameni","nationality":"France","position":"Midfielder","career":[
        {"club":"Bordeaux","from":2018,"to":2020},{"club":"AS Monaco","from":2020,"to":2022},{"club":"Real Madrid","from":2022,"to":2025}]},
    {"id":233,"name":"Lautaro Martinez","nationality":"Argentina","position":"Forward","career":[
        {"club":"Racing Club","from":2015,"to":2018},{"club":"Inter Milan","from":2018,"to":2025}]},
    {"id":234,"name":"Khvicha Kvaratskhelia","nationality":"Georgia","position":"Forward","career":[
        {"club":"Dinamo Tbilisi","from":2017,"to":2019},{"club":"Rustavi","from":2018,"to":2019},{"club":"Lokomotiv Moscow","from":2019,"to":2021},{"club":"Rubin Kazan","from":2019,"to":2021},{"club":"Napoli","from":2022,"to":2025},{"club":"Paris Saint-Germain","from":2025,"to":2025}]},
    {"id":235,"name":"Cole Palmer","nationality":"England","position":"Forward","career":[
        {"club":"Manchester City","from":2020,"to":2023},{"club":"Chelsea","from":2023,"to":2025}]},
    {"id":236,"name":"Gianluigi Donnarumma","nationality":"Italy","position":"Goalkeeper","career":[
        {"club":"AC Milan","from":2015,"to":2021},{"club":"Paris Saint-Germain","from":2021,"to":2025}]},
    {"id":237,"name":"Mike Maignan","nationality":"France","position":"Goalkeeper","career":[
        {"club":"Paris Saint-Germain","from":2013,"to":2015},{"club":"Lille","from":2015,"to":2021},{"club":"AC Milan","from":2021,"to":2025}]},
    {"id":238,"name":"Emiliano Martinez","nationality":"Argentina","position":"Goalkeeper","career":[
        {"club":"Independiente","from":2009,"to":2010},{"club":"Arsenal","from":2010,"to":2020},{"club":"Oxford United","from":2012,"to":2012},{"club":"Sheffield Wednesday","from":2014,"to":2015},{"club":"Rotherham United","from":2015,"to":2015},{"club":"Wolverhampton","from":2015,"to":2016},{"club":"Getafe","from":2017,"to":2018},{"club":"Reading","from":2019,"to":2019},{"club":"Aston Villa","from":2020,"to":2025}]},
    {"id":239,"name":"Kepa Arrizabalaga","nationality":"Spain","position":"Goalkeeper","career":[
        {"club":"Athletic Bilbao","from":2012,"to":2018},{"club":"Chelsea","from":2018,"to":2025},{"club":"Real Madrid","from":2023,"to":2024}]},
    {"id":240,"name":"Andre Onana","nationality":"Cameroon","position":"Goalkeeper","career":[
        {"club":"FC Barcelona","from":2010,"to":2015},{"club":"Ajax","from":2015,"to":2022},{"club":"Inter Milan","from":2022,"to":2023},{"club":"Manchester United","from":2023,"to":2025}]},
]

for p in professional:
    p["tier"] = "professional"
    p["normalized_name"] = p["name"].lower().replace("é","e").replace("á","a").replace("í","i").replace("ó","o").replace("ú","u").replace("ñ","n").replace("ã","a").replace("ö","o").replace("ü","u").replace("ç","c").replace("ë","e").replace("ï","i")
    p["image_url"] = ""
players.extend(professional)

# ============================================================
# SEMI-PRO TIER (~100 players)
# ============================================================
semi_pro = [
    {"id":241,"name":"Adrien Rabiot","nationality":"France","position":"Midfielder","career":[
        {"club":"Paris Saint-Germain","from":2012,"to":2019},{"club":"Juventus","from":2019,"to":2024},{"club":"Marseille","from":2024,"to":2025}]},
    {"id":242,"name":"Yannick Carrasco","nationality":"Belgium","position":"Forward","career":[
        {"club":"AS Monaco","from":2012,"to":2015},{"club":"Atletico Madrid","from":2015,"to":2018},{"club":"Dalian Professional","from":2018,"to":2020},{"club":"Atletico Madrid","from":2020,"to":2024},{"club":"Al-Shabab","from":2024,"to":2025}]},
    {"id":243,"name":"Thomas Lemar","nationality":"France","position":"Midfielder","career":[
        {"club":"Caen","from":2013,"to":2014},{"club":"AS Monaco","from":2014,"to":2018},{"club":"Atletico Madrid","from":2018,"to":2024}]},
    {"id":244,"name":"Hector Bellerin","nationality":"Spain","position":"Defender","career":[
        {"club":"FC Barcelona","from":2008,"to":2011},{"club":"Arsenal","from":2011,"to":2023},{"club":"Real Betis","from":2021,"to":2022},{"club":"FC Barcelona","from":2022,"to":2023},{"club":"Sporting CP","from":2023,"to":2024}]},
    {"id":245,"name":"Lucas Hernandez","nationality":"France","position":"Defender","career":[
        {"club":"Atletico Madrid","from":2014,"to":2019},{"club":"Bayern Munich","from":2019,"to":2023},{"club":"Paris Saint-Germain","from":2023,"to":2025}]},
    {"id":246,"name":"Theo Hernandez","nationality":"France","position":"Defender","career":[
        {"club":"Atletico Madrid","from":2015,"to":2017},{"club":"Real Madrid","from":2017,"to":2019},{"club":"Real Sociedad","from":2017,"to":2018},{"club":"Alaves","from":2018,"to":2019},{"club":"AC Milan","from":2019,"to":2025}]},
    {"id":247,"name":"Benjamin Pavard","nationality":"France","position":"Defender","career":[
        {"club":"Lille","from":2015,"to":2016},{"club":"VfB Stuttgart","from":2016,"to":2019},{"club":"Bayern Munich","from":2019,"to":2023},{"club":"Inter Milan","from":2023,"to":2025}]},
    {"id":248,"name":"Jules Kounde","nationality":"France","position":"Defender","career":[
        {"club":"Bordeaux","from":2018,"to":2019},{"club":"Sevilla","from":2019,"to":2022},{"club":"FC Barcelona","from":2022,"to":2025}]},
    {"id":249,"name":"Presnel Kimpembe","nationality":"France","position":"Defender","career":[
        {"club":"Paris Saint-Germain","from":2014,"to":2025}]},
    {"id":250,"name":"Lucas Digne","nationality":"France","position":"Defender","career":[
        {"club":"Lille","from":2011,"to":2013},{"club":"Paris Saint-Germain","from":2013,"to":2016},{"club":"Roma","from":2015,"to":2016},{"club":"FC Barcelona","from":2016,"to":2018},{"club":"Everton","from":2018,"to":2022},{"club":"Aston Villa","from":2022,"to":2025}]},
    {"id":251,"name":"Nacho Fernandez","nationality":"Spain","position":"Defender","career":[
        {"club":"Real Madrid","from":2013,"to":2024},{"club":"Al-Qadsiah","from":2024,"to":2025}]},
    {"id":252,"name":"Joselu","nationality":"Spain","position":"Forward","career":[
        {"club":"Real Madrid Castilla","from":2010,"to":2012},{"club":"Hoffenheim","from":2012,"to":2013},{"club":"Eintracht Frankfurt","from":2013,"to":2014},{"club":"Hannover 96","from":2014,"to":2015},{"club":"Stoke City","from":2015,"to":2017},{"club":"Newcastle United","from":2017,"to":2019},{"club":"Deportivo Alaves","from":2019,"to":2021},{"club":"Espanyol","from":2021,"to":2023},{"club":"Real Madrid","from":2023,"to":2024},{"club":"Al-Gharafa","from":2024,"to":2025}]},
    {"id":253,"name":"Jack Grealish","nationality":"England","position":"Midfielder","career":[
        {"club":"Aston Villa","from":2013,"to":2021},{"club":"Notts County","from":2014,"to":2014},{"club":"Manchester City","from":2021,"to":2025}]},
    {"id":254,"name":"Mason Mount","nationality":"England","position":"Midfielder","career":[
        {"club":"Chelsea","from":2017,"to":2023},{"club":"Vitesse","from":2017,"to":2018},{"club":"Derby County","from":2018,"to":2019},{"club":"Manchester United","from":2023,"to":2025}]},
    {"id":255,"name":"Reece James","nationality":"England","position":"Defender","career":[
        {"club":"Chelsea","from":2018,"to":2025},{"club":"Wigan Athletic","from":2018,"to":2019}]},
    {"id":256,"name":"Ben Chilwell","nationality":"England","position":"Defender","career":[
        {"club":"Leicester City","from":2015,"to":2020},{"club":"Huddersfield Town","from":2015,"to":2016},{"club":"Chelsea","from":2020,"to":2025}]},
    {"id":257,"name":"Emile Smith Rowe","nationality":"England","position":"Midfielder","career":[
        {"club":"Arsenal","from":2018,"to":2024},{"club":"RB Leipzig","from":2019,"to":2019},{"club":"Huddersfield Town","from":2020,"to":2020},{"club":"Fulham","from":2024,"to":2025}]},
    {"id":258,"name":"Richarlison","nationality":"Brazil","position":"Forward","career":[
        {"club":"America Mineiro","from":2014,"to":2016},{"club":"Fluminense","from":2015,"to":2017},{"club":"Watford","from":2017,"to":2018},{"club":"Everton","from":2018,"to":2022},{"club":"Tottenham Hotspur","from":2022,"to":2025}]},
    {"id":259,"name":"Dominik Szoboszlai","nationality":"Hungary","position":"Midfielder","career":[
        {"club":"Liefering","from":2018,"to":2019},{"club":"Red Bull Salzburg","from":2019,"to":2021},{"club":"RB Leipzig","from":2021,"to":2023},{"club":"Liverpool","from":2023,"to":2025}]},
    {"id":260,"name":"Sven Botman","nationality":"Netherlands","position":"Defender","career":[
        {"club":"Ajax","from":2018,"to":2020},{"club":"Heerenveen","from":2019,"to":2020},{"club":"Lille","from":2020,"to":2022},{"club":"Newcastle United","from":2022,"to":2025}]},
    {"id":261,"name":"Ismael Bennacer","nationality":"Algeria","position":"Midfielder","career":[
        {"club":"Arsenal","from":2015,"to":2017},{"club":"Tours","from":2016,"to":2017},{"club":"Empoli","from":2017,"to":2019},{"club":"AC Milan","from":2019,"to":2025}]},
    {"id":262,"name":"Adama Traore","nationality":"Spain","position":"Forward","career":[
        {"club":"FC Barcelona","from":2013,"to":2015},{"club":"Aston Villa","from":2015,"to":2016},{"club":"Middlesbrough","from":2016,"to":2018},{"club":"Wolverhampton","from":2018,"to":2025},{"club":"FC Barcelona","from":2022,"to":2022}]},
    {"id":263,"name":"Allan Saint-Maximin","nationality":"France","position":"Forward","career":[
        {"club":"Saint-Etienne","from":2012,"to":2015},{"club":"Hannover 96","from":2014,"to":2015},{"club":"Monaco","from":2015,"to":2017},{"club":"Bastia","from":2015,"to":2016},{"club":"Nice","from":2017,"to":2019},{"club":"Newcastle United","from":2019,"to":2023},{"club":"Al-Ahli","from":2023,"to":2025}]},
    {"id":264,"name":"Boubacar Kamara","nationality":"France","position":"Midfielder","career":[
        {"club":"Marseille","from":2017,"to":2022},{"club":"Aston Villa","from":2022,"to":2025}]},
    {"id":265,"name":"Moussa Diaby","nationality":"France","position":"Forward","career":[
        {"club":"Paris Saint-Germain","from":2017,"to":2019},{"club":"Bayer Leverkusen","from":2019,"to":2023},{"club":"Aston Villa","from":2023,"to":2025}]},
    {"id":266,"name":"Jonathan David","nationality":"Canada","position":"Forward","career":[
        {"club":"KAA Gent","from":2018,"to":2020},{"club":"Lille","from":2020,"to":2025}]},
    {"id":267,"name":"Randal Kolo Muani","nationality":"France","position":"Forward","career":[
        {"club":"Nantes","from":2018,"to":2022},{"club":"Eintracht Frankfurt","from":2022,"to":2023},{"club":"Paris Saint-Germain","from":2023,"to":2025}]},
    {"id":268,"name":"Kingsley Coman","nationality":"France","position":"Forward","career":[
        {"club":"Paris Saint-Germain","from":2013,"to":2014},{"club":"Juventus","from":2014,"to":2015},{"club":"Bayern Munich","from":2015,"to":2025}]},
    {"id":269,"name":"Serge Gnabry","nationality":"Germany","position":"Forward","career":[
        {"club":"Arsenal","from":2012,"to":2016},{"club":"West Bromwich Albion","from":2015,"to":2016},{"club":"Werder Bremen","from":2016,"to":2017},{"club":"Bayern Munich","from":2017,"to":2025},{"club":"TSG Hoffenheim","from":2017,"to":2018}]},
    {"id":270,"name":"Mikel Oyarzabal","nationality":"Spain","position":"Forward","career":[
        {"club":"Real Sociedad","from":2015,"to":2025}]},
    {"id":271,"name":"Dani Olmo","nationality":"Spain","position":"Midfielder","career":[
        {"club":"FC Barcelona","from":2007,"to":2014},{"club":"Dinamo Zagreb","from":2014,"to":2020},{"club":"RB Leipzig","from":2020,"to":2024},{"club":"FC Barcelona","from":2024,"to":2025}]},
    {"id":272,"name":"Nico Williams","nationality":"Spain","position":"Forward","career":[
        {"club":"Athletic Bilbao","from":2021,"to":2025}]},
    {"id":273,"name":"Ferland Mendy","nationality":"France","position":"Defender","career":[
        {"club":"Le Havre","from":2016,"to":2017},{"club":"Lyon","from":2017,"to":2019},{"club":"Real Madrid","from":2019,"to":2025}]},
    {"id":274,"name":"Diogo Dalot","nationality":"Portugal","position":"Defender","career":[
        {"club":"Porto","from":2017,"to":2018},{"club":"Manchester United","from":2018,"to":2025},{"club":"AC Milan","from":2020,"to":2021}]},
    {"id":275,"name":"Ibrahima Konate","nationality":"France","position":"Defender","career":[
        {"club":"Sochaux","from":2017,"to":2017},{"club":"RB Leipzig","from":2017,"to":2021},{"club":"Liverpool","from":2021,"to":2025}]},
    {"id":276,"name":"Konrad Laimer","nationality":"Austria","position":"Midfielder","career":[
        {"club":"Red Bull Salzburg","from":2015,"to":2017},{"club":"RB Leipzig","from":2017,"to":2023},{"club":"Bayern Munich","from":2023,"to":2025}]},
    {"id":277,"name":"Youssef En-Nesyri","nationality":"Morocco","position":"Forward","career":[
        {"club":"Malaga","from":2016,"to":2018},{"club":"Leganes","from":2018,"to":2020},{"club":"Sevilla","from":2020,"to":2024},{"club":"Fenerbahce","from":2024,"to":2025}]},
    {"id":278,"name":"Sofyan Amrabat","nationality":"Morocco","position":"Midfielder","career":[
        {"club":"Utrecht","from":2014,"to":2017},{"club":"Feyenoord","from":2017,"to":2019},{"club":"Hellas Verona","from":2019,"to":2020},{"club":"Fiorentina","from":2020,"to":2025},{"club":"Manchester United","from":2023,"to":2024},{"club":"Fenerbahce","from":2024,"to":2025}]},
    {"id":279,"name":"Azzedine Ounahi","nationality":"Morocco","position":"Midfielder","career":[
        {"club":"Angers","from":2020,"to":2023},{"club":"Marseille","from":2023,"to":2025}]},
    {"id":280,"name":"Alexis Mac Allister","nationality":"Argentina","position":"Midfielder","career":[
        {"club":"Argentinos Juniors","from":2016,"to":2019},{"club":"Brighton","from":2019,"to":2023},{"club":"Boca Juniors","from":2019,"to":2020},{"club":"Liverpool","from":2023,"to":2025}]},
    {"id":281,"name":"Julian Alvarez","nationality":"Argentina","position":"Forward","career":[
        {"club":"River Plate","from":2018,"to":2022},{"club":"Manchester City","from":2022,"to":2024},{"club":"Atletico Madrid","from":2024,"to":2025}]},
    {"id":282,"name":"Cristian Romero","nationality":"Argentina","position":"Defender","career":[
        {"club":"Belgrano","from":2016,"to":2018},{"club":"Genoa","from":2018,"to":2019},{"club":"Juventus","from":2019,"to":2023},{"club":"Atalanta","from":2020,"to":2022},{"club":"Tottenham Hotspur","from":2022,"to":2025}]},
    {"id":283,"name":"Nahuel Molina","nationality":"Argentina","position":"Defender","career":[
        {"club":"Boca Juniors","from":2016,"to":2017},{"club":"Rosario Central","from":2017,"to":2018},{"club":"Defensa y Justicia","from":2018,"to":2019},{"club":"Udinese","from":2019,"to":2022},{"club":"Atletico Madrid","from":2022,"to":2025}]},
    {"id":284,"name":"Emiliano Buendia","nationality":"Argentina","position":"Midfielder","career":[
        {"club":"Getafe","from":2014,"to":2017},{"club":"Norwich City","from":2018,"to":2021},{"club":"Aston Villa","from":2021,"to":2025}]},
    {"id":285,"name":"Leandro Trossard","nationality":"Belgium","position":"Forward","career":[
        {"club":"Genk","from":2014,"to":2019},{"club":"Brighton","from":2019,"to":2023},{"club":"Arsenal","from":2023,"to":2025}]},
    {"id":286,"name":"Jeremy Doku","nationality":"Belgium","position":"Forward","career":[
        {"club":"Anderlecht","from":2018,"to":2020},{"club":"Rennes","from":2020,"to":2023},{"club":"Manchester City","from":2023,"to":2025}]},
    {"id":287,"name":"Alexander Isak","nationality":"Sweden","position":"Forward","career":[
        {"club":"AIK","from":2016,"to":2017},{"club":"Borussia Dortmund","from":2017,"to":2019},{"club":"Willem II","from":2017,"to":2018},{"club":"Real Sociedad","from":2019,"to":2022},{"club":"Newcastle United","from":2022,"to":2025}]},
    {"id":288,"name":"Dejan Kulusevski","nationality":"Sweden","position":"Forward","career":[
        {"club":"Atalanta","from":2017,"to":2020},{"club":"Parma","from":2019,"to":2020},{"club":"Juventus","from":2020,"to":2022},{"club":"Tottenham Hotspur","from":2022,"to":2025}]},
    {"id":289,"name":"Takefusa Kubo","nationality":"Japan","position":"Forward","career":[
        {"club":"FC Tokyo","from":2016,"to":2019},{"club":"FC Barcelona","from":2019,"to":2019},{"club":"Real Madrid","from":2019,"to":2022},{"club":"Mallorca","from":2019,"to":2020},{"club":"Villarreal","from":2020,"to":2021},{"club":"Getafe","from":2021,"to":2021},{"club":"Mallorca","from":2021,"to":2022},{"club":"Real Sociedad","from":2022,"to":2025}]},
    {"id":290,"name":"Wataru Endo","nationality":"Japan","position":"Midfielder","career":[
        {"club":"Shonan Bellmare","from":2014,"to":2015},{"club":"Urawa Red Diamonds","from":2015,"to":2018},{"club":"Sint-Truiden","from":2018,"to":2020},{"club":"VfB Stuttgart","from":2020,"to":2023},{"club":"Liverpool","from":2023,"to":2025}]},
    {"id":291,"name":"Heung-Min Son","nationality":"South Korea","position":"Forward","career":[
        {"club":"Hamburger SV","from":2010,"to":2013},{"club":"Bayer Leverkusen","from":2013,"to":2015},{"club":"Tottenham Hotspur","from":2015,"to":2025}]},
    {"id":292,"name":"Hwang Hee-chan","nationality":"South Korea","position":"Forward","career":[
        {"club":"Pohang Steelers","from":2014,"to":2015},{"club":"Red Bull Salzburg","from":2015,"to":2020},{"club":"RB Leipzig","from":2020,"to":2023},{"club":"Wolverhampton","from":2021,"to":2025}]},
    {"id":293,"name":"Joao Pedro","nationality":"Brazil","position":"Forward","career":[
        {"club":"Fluminense","from":2017,"to":2019},{"club":"Watford","from":2020,"to":2022},{"club":"Brighton","from":2022,"to":2025}]},
    {"id":294,"name":"Bryan Mbeumo","nationality":"Cameroon","position":"Forward","career":[
        {"club":"Troyes","from":2016,"to":2019},{"club":"Brentford","from":2019,"to":2025}]},
    {"id":295,"name":"Ivan Toney","nationality":"England","position":"Forward","career":[
        {"club":"Newcastle United","from":2015,"to":2018},{"club":"Barnsley","from":2016,"to":2016},{"club":"Shrewsbury Town","from":2017,"to":2017},{"club":"Scunthorpe United","from":2018,"to":2018},{"club":"Wigan Athletic","from":2018,"to":2019},{"club":"Peterborough United","from":2018,"to":2020},{"club":"Brentford","from":2020,"to":2025},{"club":"Al-Ahli","from":2025,"to":2025}]},
    {"id":296,"name":"Pedro Neto","nationality":"Portugal","position":"Forward","career":[
        {"club":"Braga","from":2017,"to":2018},{"club":"Lazio","from":2018,"to":2019},{"club":"Wolverhampton","from":2019,"to":2024},{"club":"Chelsea","from":2024,"to":2025}]},
    {"id":297,"name":"Matheus Cunha","nationality":"Brazil","position":"Forward","career":[
        {"club":"Sion","from":2017,"to":2018},{"club":"RB Leipzig","from":2018,"to":2020},{"club":"Hertha Berlin","from":2020,"to":2022},{"club":"Atletico Madrid","from":2022,"to":2022},{"club":"Wolverhampton","from":2022,"to":2025}]},
    {"id":298,"name":"Eberechi Eze","nationality":"England","position":"Midfielder","career":[
        {"club":"Millwall","from":2016,"to":2018},{"club":"Queens Park Rangers","from":2018,"to":2020},{"club":"Crystal Palace","from":2020,"to":2025}]},
    {"id":299,"name":"Michael Olise","nationality":"France","position":"Forward","career":[
        {"club":"Manchester City","from":2016,"to":2017},{"club":"Reading","from":2019,"to":2021},{"club":"Crystal Palace","from":2021,"to":2024},{"club":"Bayern Munich","from":2024,"to":2025}]},
    {"id":300,"name":"Mohammed Kudus","nationality":"Ghana","position":"Forward","career":[
        {"club":"Right to Dream","from":2017,"to":2018},{"club":"Nordsjaelland","from":2018,"to":2020},{"club":"Ajax","from":2020,"to":2023},{"club":"West Ham United","from":2023,"to":2025}]},
    {"id":301,"name":"Seko Fofana","nationality":"Ivory Coast","position":"Midfielder","career":[
        {"club":"Lorient","from":2014,"to":2016},{"club":"Manchester City","from":2013,"to":2017},{"club":"Bastia","from":2015,"to":2016},{"club":"Udinese","from":2016,"to":2020},{"club":"Lens","from":2020,"to":2023},{"club":"Al-Nassr","from":2023,"to":2025}]},
    {"id":302,"name":"Franck Kessie","nationality":"Ivory Coast","position":"Midfielder","career":[
        {"club":"Atalanta","from":2015,"to":2017},{"club":"AC Milan","from":2017,"to":2022},{"club":"FC Barcelona","from":2022,"to":2025},{"club":"Al-Ahli","from":2023,"to":2025}]},
    {"id":303,"name":"Hakan Calhanoglu","nationality":"Turkey","position":"Midfielder","career":[
        {"club":"Karlsruher SC","from":2011,"to":2013},{"club":"Hamburger SV","from":2013,"to":2014},{"club":"Bayer Leverkusen","from":2014,"to":2017},{"club":"AC Milan","from":2017,"to":2021},{"club":"Inter Milan","from":2021,"to":2025}]},
    {"id":304,"name":"Arda Guler","nationality":"Turkey","position":"Midfielder","career":[
        {"club":"Fenerbahce","from":2021,"to":2023},{"club":"Real Madrid","from":2023,"to":2025}]},
    {"id":305,"name":"Yusuf Yazici","nationality":"Turkey","position":"Midfielder","career":[
        {"club":"Trabzonspor","from":2014,"to":2019},{"club":"Lille","from":2019,"to":2024}]},
    {"id":306,"name":"Zeki Celik","nationality":"Turkey","position":"Defender","career":[
        {"club":"Istanbulspor","from":2016,"to":2018},{"club":"Lille","from":2018,"to":2022},{"club":"Roma","from":2022,"to":2025}]},
    {"id":307,"name":"Mehdi Taremi","nationality":"Iran","position":"Forward","career":[
        {"club":"Persepolis","from":2015,"to":2019},{"club":"Rio Ave","from":2019,"to":2020},{"club":"Porto","from":2020,"to":2024},{"club":"Inter Milan","from":2024,"to":2025}]},
    {"id":308,"name":"Sardar Azmoun","nationality":"Iran","position":"Forward","career":[
        {"club":"Sepahan","from":2012,"to":2013},{"club":"Rubin Kazan","from":2013,"to":2016},{"club":"Rostov","from":2016,"to":2019},{"club":"Zenit Saint Petersburg","from":2019,"to":2022},{"club":"Bayer Leverkusen","from":2022,"to":2023},{"club":"Roma","from":2023,"to":2025}]},
    {"id":309,"name":"Chanathip Songkrasin","nationality":"Thailand","position":"Midfielder","career":[
        {"club":"Muangthong United","from":2012,"to":2017},{"club":"Consadole Sapporo","from":2017,"to":2021},{"club":"Kawasaki Frontale","from":2021,"to":2024}]},
    {"id":310,"name":"Alphonso Davies","nationality":"Canada","position":"Defender","career":[
        {"club":"Vancouver Whitecaps","from":2016,"to":2019},{"club":"Bayern Munich","from":2019,"to":2025}]},
    {"id":311,"name":"Tajon Buchanan","nationality":"Canada","position":"Forward","career":[
        {"club":"New England Revolution","from":2019,"to":2022},{"club":"Club Brugge","from":2022,"to":2024},{"club":"Inter Milan","from":2024,"to":2025}]},
    {"id":312,"name":"Miguel Almiron","nationality":"Paraguay","position":"Midfielder","career":[
        {"club":"Cerro Porteno","from":2011,"to":2015},{"club":"Lanus","from":2015,"to":2017},{"club":"Atlanta United","from":2017,"to":2019},{"club":"Newcastle United","from":2019,"to":2025}]},
    {"id":313,"name":"Edmond Tapsoba","nationality":"Burkina Faso","position":"Defender","career":[
        {"club":"Salitas","from":2016,"to":2018},{"club":"Vitoria Guimaraes","from":2018,"to":2020},{"club":"Bayer Leverkusen","from":2020,"to":2025}]},
    {"id":314,"name":"Kaoru Mitoma","nationality":"Japan","position":"Forward","career":[
        {"club":"Kawasaki Frontale","from":2020,"to":2021},{"club":"Brighton","from":2021,"to":2025},{"club":"Union Saint-Gilloise","from":2021,"to":2022}]},
    {"id":315,"name":"Palhinha","nationality":"Portugal","position":"Midfielder","career":[
        {"club":"Sporting CP","from":2015,"to":2021},{"club":"Braga","from":2017,"to":2018},{"club":"Belenenses","from":2018,"to":2019},{"club":"Fulham","from":2022,"to":2024},{"club":"Bayern Munich","from":2024,"to":2025}]},
    {"id":316,"name":"Ollie Watkins","nationality":"England","position":"Forward","career":[
        {"club":"Exeter City","from":2014,"to":2017},{"club":"Brentford","from":2017,"to":2020},{"club":"Aston Villa","from":2020,"to":2025}]},
    {"id":317,"name":"Brennan Johnson","nationality":"Wales","position":"Forward","career":[
        {"club":"Nottingham Forest","from":2019,"to":2023},{"club":"Lincoln City","from":2021,"to":2021},{"club":"Tottenham Hotspur","from":2023,"to":2025}]},
    {"id":318,"name":"Micky van de Ven","nationality":"Netherlands","position":"Defender","career":[
        {"club":"FC Volendam","from":2019,"to":2021},{"club":"VfL Wolfsburg","from":2021,"to":2023},{"club":"Tottenham Hotspur","from":2023,"to":2025}]},
    {"id":319,"name":"Moises Caicedo","nationality":"Ecuador","position":"Midfielder","career":[
        {"club":"Independiente del Valle","from":2019,"to":2021},{"club":"Brighton","from":2021,"to":2023},{"club":"Chelsea","from":2023,"to":2025}]},
    {"id":320,"name":"Noni Madueke","nationality":"England","position":"Forward","career":[
        {"club":"Tottenham Hotspur","from":2016,"to":2018},{"club":"PSV Eindhoven","from":2018,"to":2023},{"club":"Chelsea","from":2023,"to":2025}]},
    {"id":321,"name":"Christopher Nkunku","nationality":"France","position":"Forward","career":[
        {"club":"Paris Saint-Germain","from":2015,"to":2019},{"club":"RB Leipzig","from":2019,"to":2023},{"club":"Chelsea","from":2023,"to":2025}]},
    {"id":322,"name":"Xavi Simons","nationality":"Netherlands","position":"Midfielder","career":[
        {"club":"FC Barcelona","from":2018,"to":2022},{"club":"Paris Saint-Germain","from":2022,"to":2025},{"club":"PSV Eindhoven","from":2022,"to":2023},{"club":"RB Leipzig","from":2023,"to":2025}]},
    {"id":323,"name":"Warren Zaire-Emery","nationality":"France","position":"Midfielder","career":[
        {"club":"Paris Saint-Germain","from":2022,"to":2025}]},
    {"id":324,"name":"Kobbie Mainoo","nationality":"England","position":"Midfielder","career":[
        {"club":"Manchester United","from":2023,"to":2025}]},
    {"id":325,"name":"Alejandro Garnacho","nationality":"Argentina","position":"Forward","career":[
        {"club":"Atletico Madrid","from":2019,"to":2020},{"club":"Manchester United","from":2020,"to":2025}]},
    {"id":326,"name":"Rasmus Hojlund","nationality":"Denmark","position":"Forward","career":[
        {"club":"Copenhagen","from":2019,"to":2021},{"club":"Sturm Graz","from":2021,"to":2022},{"club":"Atalanta","from":2022,"to":2023},{"club":"Manchester United","from":2023,"to":2025}]},
    {"id":327,"name":"Savinho","nationality":"Brazil","position":"Forward","career":[
        {"club":"Atletico Mineiro","from":2021,"to":2022},{"club":"PSV Eindhoven","from":2022,"to":2023},{"club":"Girona","from":2023,"to":2024},{"club":"Manchester City","from":2024,"to":2025}]},
    {"id":328,"name":"Endrick","nationality":"Brazil","position":"Forward","career":[
        {"club":"Palmeiras","from":2022,"to":2024},{"club":"Real Madrid","from":2024,"to":2025}]},
    {"id":329,"name":"Youssoufa Moukoko","nationality":"Germany","position":"Forward","career":[
        {"club":"Borussia Dortmund","from":2020,"to":2025},{"club":"Nice","from":2024,"to":2025}]},
    {"id":330,"name":"Mathys Tel","nationality":"France","position":"Forward","career":[
        {"club":"Rennes","from":2021,"to":2022},{"club":"Bayern Munich","from":2022,"to":2025}]},
    {"id":331,"name":"Malo Gusto","nationality":"France","position":"Defender","career":[
        {"club":"Lyon","from":2020,"to":2023},{"club":"Chelsea","from":2023,"to":2025}]},
    {"id":332,"name":"Evan Ferguson","nationality":"Ireland","position":"Forward","career":[
        {"club":"Bohemians","from":2019,"to":2021},{"club":"Brighton","from":2021,"to":2025}]},
    {"id":333,"name":"Pau Cubarsi","nationality":"Spain","position":"Defender","career":[
        {"club":"FC Barcelona","from":2023,"to":2025}]},
    {"id":334,"name":"Joao Neves","nationality":"Portugal","position":"Midfielder","career":[
        {"club":"Benfica","from":2023,"to":2024},{"club":"Paris Saint-Germain","from":2024,"to":2025}]},
    {"id":335,"name":"Vitinha","nationality":"Portugal","position":"Midfielder","career":[
        {"club":"Porto","from":2020,"to":2022},{"club":"Wolverhampton","from":2020,"to":2021},{"club":"Paris Saint-Germain","from":2022,"to":2025}]},
    {"id":336,"name":"Min-jae Kim","nationality":"South Korea","position":"Defender","career":[
        {"club":"Jeonbuk Hyundai Motors","from":2017,"to":2019},{"club":"Beijing Guoan","from":2019,"to":2021},{"club":"Napoli","from":2021,"to":2023},{"club":"Bayern Munich","from":2023,"to":2025}]},
    {"id":337,"name":"Weston McKennie","nationality":"United States","position":"Midfielder","career":[
        {"club":"FC Dallas","from":2014,"to":2016},{"club":"Schalke 04","from":2016,"to":2020},{"club":"Juventus","from":2020,"to":2025},{"club":"Leeds United","from":2023,"to":2023}]},
    {"id":338,"name":"Christian Pulisic","nationality":"United States","position":"Forward","career":[
        {"club":"Borussia Dortmund","from":2015,"to":2019},{"club":"Chelsea","from":2019,"to":2023},{"club":"AC Milan","from":2023,"to":2025}]},
    {"id":339,"name":"Tyler Adams","nationality":"United States","position":"Midfielder","career":[
        {"club":"New York Red Bulls","from":2015,"to":2019},{"club":"RB Leipzig","from":2019,"to":2022},{"club":"Leeds United","from":2022,"to":2024},{"club":"Bournemouth","from":2024,"to":2025}]},
    {"id":340,"name":"Gio Reyna","nationality":"United States","position":"Midfielder","career":[
        {"club":"Borussia Dortmund","from":2019,"to":2025},{"club":"Nottingham Forest","from":2024,"to":2024}]},
]

for p in semi_pro:
    p["tier"] = "semi_pro"
    p["normalized_name"] = p["name"].lower().replace("é","e").replace("á","a").replace("í","i").replace("ó","o").replace("ú","u").replace("ñ","n").replace("ã","a").replace("ö","o").replace("ü","u").replace("ç","c").replace("ë","e").replace("ï","i").replace("ä","a")
    p["image_url"] = ""
players.extend(semi_pro)

print(f"Professional: {len(professional)}, Semi-pro: {len(semi_pro)}")
print(f"Total so far: {len(players)}")

with open("/Users/jasur/workspace/football/scripts/_careers_part2.json", "w") as f:
    json.dump(players, f)
print("Part 2 saved")
