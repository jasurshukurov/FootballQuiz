#!/usr/bin/env python3
"""Generate amateur + beginner tiers and finalize career_paths.json."""
import json

players = json.load(open("/Users/jasur/workspace/football/scripts/_careers_part2.json"))

amateur = [
    {"id":341,"name":"Keita Balde","nationality":"Senegal","position":"Forward","career":[
        {"club":"Lazio","from":2013,"to":2017},{"club":"AS Monaco","from":2017,"to":2021},{"club":"Inter Milan","from":2018,"to":2019},{"club":"Sampdoria","from":2020,"to":2021},{"club":"Cagliari","from":2021,"to":2022},{"club":"Spartak Moscow","from":2022,"to":2023}]},
    {"id":342,"name":"Hector Herrera","nationality":"Mexico","position":"Midfielder","career":[
        {"club":"Pachuca","from":2010,"to":2013},{"club":"Porto","from":2013,"to":2019},{"club":"Atletico Madrid","from":2019,"to":2022},{"club":"Houston Dynamo","from":2022,"to":2024}]},
    {"id":343,"name":"Alex Song","nationality":"Cameroon","position":"Midfielder","career":[
        {"club":"Bastia","from":2004,"to":2005},{"club":"Arsenal","from":2005,"to":2012},{"club":"FC Barcelona","from":2012,"to":2016},{"club":"West Ham United","from":2014,"to":2016},{"club":"Rubin Kazan","from":2016,"to":2017},{"club":"Sion","from":2018,"to":2018},{"club":"Djibouti Telecom","from":2020,"to":2021}]},
    {"id":344,"name":"Mattia Destro","nationality":"Italy","position":"Forward","career":[
        {"club":"Inter Milan","from":2009,"to":2012},{"club":"Genoa","from":2009,"to":2010},{"club":"Siena","from":2010,"to":2012},{"club":"Roma","from":2012,"to":2016},{"club":"AC Milan","from":2015,"to":2015},{"club":"Bologna","from":2016,"to":2019},{"club":"Genoa","from":2019,"to":2022},{"club":"Empoli","from":2022,"to":2023}]},
    {"id":345,"name":"Nacer Chadli","nationality":"Belgium","position":"Midfielder","career":[
        {"club":"Twente","from":2010,"to":2013},{"club":"Tottenham Hotspur","from":2013,"to":2016},{"club":"West Bromwich Albion","from":2016,"to":2018},{"club":"AS Monaco","from":2018,"to":2020},{"club":"Anderlecht","from":2018,"to":2019},{"club":"Istanbul Basaksehir","from":2020,"to":2022},{"club":"Westerlo","from":2022,"to":2024}]},
    {"id":346,"name":"Kevin-Prince Boateng","nationality":"Ghana","position":"Midfielder","career":[
        {"club":"Hertha Berlin","from":2005,"to":2007},{"club":"Tottenham Hotspur","from":2007,"to":2009},{"club":"Borussia Dortmund","from":2008,"to":2009},{"club":"Portsmouth","from":2009,"to":2010},{"club":"AC Milan","from":2010,"to":2013},{"club":"Schalke 04","from":2013,"to":2015},{"club":"AC Milan","from":2016,"to":2016},{"club":"Las Palmas","from":2016,"to":2017},{"club":"Eintracht Frankfurt","from":2017,"to":2018},{"club":"Sassuolo","from":2018,"to":2019},{"club":"FC Barcelona","from":2019,"to":2019},{"club":"Fiorentina","from":2019,"to":2020},{"club":"Besiktas","from":2020,"to":2020},{"club":"Monza","from":2020,"to":2021},{"club":"Hertha Berlin","from":2021,"to":2023}]},
    {"id":347,"name":"Jack Wilshere","nationality":"England","position":"Midfielder","career":[
        {"club":"Arsenal","from":2008,"to":2018},{"club":"Bolton Wanderers","from":2010,"to":2011},{"club":"Bournemouth","from":2016,"to":2017},{"club":"West Ham United","from":2018,"to":2020},{"club":"Bournemouth","from":2021,"to":2022}]},
    {"id":348,"name":"Aaron Ramsey","nationality":"Wales","position":"Midfielder","career":[
        {"club":"Cardiff City","from":2007,"to":2008},{"club":"Arsenal","from":2008,"to":2019},{"club":"Juventus","from":2019,"to":2022},{"club":"Rangers","from":2022,"to":2022},{"club":"Nice","from":2022,"to":2023},{"club":"Cardiff City","from":2023,"to":2024}]},
    {"id":349,"name":"Theo Walcott","nationality":"England","position":"Forward","career":[
        {"club":"Southampton","from":2005,"to":2006},{"club":"Arsenal","from":2006,"to":2018},{"club":"Everton","from":2018,"to":2022},{"club":"Southampton","from":2022,"to":2023}]},
    {"id":350,"name":"Daniel Sturridge","nationality":"England","position":"Forward","career":[
        {"club":"Manchester City","from":2006,"to":2009},{"club":"Chelsea","from":2009,"to":2013},{"club":"Bolton Wanderers","from":2011,"to":2011},{"club":"Liverpool","from":2013,"to":2019},{"club":"West Bromwich Albion","from":2018,"to":2018},{"club":"Trabzonspor","from":2019,"to":2020},{"club":"Perth Glory","from":2021,"to":2022}]},
    {"id":351,"name":"Samir Nasri","nationality":"France","position":"Midfielder","career":[
        {"club":"Marseille","from":2004,"to":2008},{"club":"Arsenal","from":2008,"to":2011},{"club":"Manchester City","from":2011,"to":2017},{"club":"Sevilla","from":2016,"to":2017},{"club":"Antalyaspor","from":2017,"to":2018},{"club":"West Ham United","from":2019,"to":2019},{"club":"Anderlecht","from":2019,"to":2020}]},
    {"id":352,"name":"Nani","nationality":"Portugal","position":"Forward","career":[
        {"club":"Sporting CP","from":2005,"to":2007},{"club":"Manchester United","from":2007,"to":2015},{"club":"Sporting CP","from":2014,"to":2015},{"club":"Fenerbahce","from":2015,"to":2016},{"club":"Valencia","from":2016,"to":2018},{"club":"Lazio","from":2017,"to":2018},{"club":"Sporting CP","from":2018,"to":2019},{"club":"Orlando City","from":2019,"to":2022},{"club":"Melbourne Victory","from":2022,"to":2023}]},
    {"id":353,"name":"Dimitar Berbatov","nationality":"Bulgaria","position":"Forward","career":[
        {"club":"CSKA Sofia","from":1998,"to":2001},{"club":"Bayer Leverkusen","from":2001,"to":2006},{"club":"Tottenham Hotspur","from":2006,"to":2008},{"club":"Manchester United","from":2008,"to":2012},{"club":"Fulham","from":2012,"to":2014},{"club":"AS Monaco","from":2014,"to":2015},{"club":"PAOK","from":2015,"to":2016},{"club":"Kerala Blasters","from":2017,"to":2018}]},
    {"id":354,"name":"Javier Mascherano","nationality":"Argentina","position":"Midfielder","career":[
        {"club":"River Plate","from":2003,"to":2005},{"club":"Corinthians","from":2005,"to":2006},{"club":"West Ham United","from":2006,"to":2007},{"club":"Liverpool","from":2007,"to":2010},{"club":"FC Barcelona","from":2010,"to":2018},{"club":"Hebei FC","from":2018,"to":2020},{"club":"Estudiantes","from":2020,"to":2020}]},
    {"id":355,"name":"Javier Zanetti","nationality":"Argentina","position":"Defender","career":[
        {"club":"Talleres","from":1991,"to":1993},{"club":"Banfield","from":1993,"to":1995},{"club":"Inter Milan","from":1995,"to":2014}]},
    {"id":356,"name":"Gennaro Gattuso","nationality":"Italy","position":"Midfielder","career":[
        {"club":"Perugia","from":1995,"to":1997},{"club":"Rangers","from":1997,"to":1998},{"club":"Salernitana","from":1998,"to":1999},{"club":"AC Milan","from":1999,"to":2012},{"club":"Sion","from":2012,"to":2013}]},
    {"id":357,"name":"Alessandro Nesta","nationality":"Italy","position":"Defender","career":[
        {"club":"Lazio","from":1994,"to":2002},{"club":"AC Milan","from":2002,"to":2012},{"club":"Montreal Impact","from":2012,"to":2013},{"club":"Chennaiyin","from":2014,"to":2014}]},
    {"id":358,"name":"Hernan Crespo","nationality":"Argentina","position":"Forward","career":[
        {"club":"River Plate","from":1993,"to":1996},{"club":"Parma","from":1996,"to":2000},{"club":"Lazio","from":2000,"to":2002},{"club":"Inter Milan","from":2002,"to":2004},{"club":"Chelsea","from":2003,"to":2004},{"club":"AC Milan","from":2004,"to":2005},{"club":"Inter Milan","from":2006,"to":2007},{"club":"Genoa","from":2007,"to":2009},{"club":"Parma","from":2009,"to":2012}]},
    {"id":359,"name":"Gabriel Batistuta","nationality":"Argentina","position":"Forward","career":[
        {"club":"Newell's Old Boys","from":1988,"to":1989},{"club":"River Plate","from":1989,"to":1991},{"club":"Fiorentina","from":1991,"to":2000},{"club":"Roma","from":2000,"to":2003},{"club":"Inter Milan","from":2003,"to":2003},{"club":"Al-Arabi","from":2003,"to":2005}]},
    {"id":360,"name":"Juan Roman Riquelme","nationality":"Argentina","position":"Midfielder","career":[
        {"club":"Boca Juniors","from":1996,"to":2002},{"club":"FC Barcelona","from":2002,"to":2005},{"club":"Villarreal","from":2003,"to":2007},{"club":"Boca Juniors","from":2007,"to":2014},{"club":"Argentinos Juniors","from":2014,"to":2015}]},
    {"id":361,"name":"Rafael Marquez","nationality":"Mexico","position":"Defender","career":[
        {"club":"Atlas","from":1996,"to":1999},{"club":"AS Monaco","from":1999,"to":2003},{"club":"FC Barcelona","from":2003,"to":2010},{"club":"New York Red Bulls","from":2010,"to":2012},{"club":"Leon","from":2012,"to":2014},{"club":"Hellas Verona","from":2014,"to":2016},{"club":"Atlas","from":2016,"to":2018}]},
    {"id":362,"name":"Hugo Sanchez","nationality":"Mexico","position":"Forward","career":[
        {"club":"UNAM","from":1976,"to":1981},{"club":"Atletico Madrid","from":1981,"to":1985},{"club":"Real Madrid","from":1985,"to":1992},{"club":"America","from":1992,"to":1993},{"club":"Rayo Vallecano","from":1993,"to":1994},{"club":"Atletico Celaya","from":1996,"to":1997}]},
    {"id":363,"name":"Abedi Pele","nationality":"Ghana","position":"Midfielder","career":[
        {"club":"Real Tamale United","from":1982,"to":1985},{"club":"Zurich","from":1985,"to":1986},{"club":"Chamois Niortais","from":1986,"to":1987},{"club":"Mulhouse","from":1987,"to":1988},{"club":"Marseille","from":1988,"to":1993},{"club":"Lyon","from":1993,"to":1994},{"club":"Torino","from":1994,"to":1996},{"club":"1860 Munich","from":1996,"to":1998}]},
    {"id":364,"name":"Roger Milla","nationality":"Cameroon","position":"Forward","career":[
        {"club":"Leopard Douala","from":1970,"to":1974},{"club":"Tonnerre Yaounde","from":1974,"to":1977},{"club":"Valenciennes","from":1977,"to":1979},{"club":"AS Monaco","from":1979,"to":1980},{"club":"Bastia","from":1980,"to":1984},{"club":"Saint-Etienne","from":1984,"to":1986},{"club":"Montpellier","from":1986,"to":1989},{"club":"Tonnerre Yaounde","from":1990,"to":1996}]},
    {"id":365,"name":"Rashidi Yekini","nationality":"Nigeria","position":"Forward","career":[
        {"club":"Shooting Stars","from":1981,"to":1984},{"club":"Abiola Babes","from":1984,"to":1987},{"club":"Africa Sports","from":1987,"to":1990},{"club":"Vitoria Setubal","from":1990,"to":1993},{"club":"Olympiacos","from":1993,"to":1995},{"club":"Sporting Gijon","from":1995,"to":1996},{"club":"FC Zurich","from":1996,"to":1997},{"club":"Al Shabab","from":1997,"to":1998},{"club":"Julius Berger","from":1999,"to":2003}]},
    {"id":366,"name":"Son Woong-jung","nationality":"South Korea","position":"Forward","career":[
        {"club":"Seoul E-Land","from":1990,"to":1992}]},
    {"id":367,"name":"Mohamed Aboutrika","nationality":"Egypt","position":"Midfielder","career":[
        {"club":"Tersana","from":1996,"to":2003},{"club":"Al Ahly","from":2004,"to":2013},{"club":"Baniyas","from":2013,"to":2014}]},
    {"id":368,"name":"El Hadji Diouf","nationality":"Senegal","position":"Forward","career":[
        {"club":"Sochaux","from":1998,"to":2000},{"club":"Rennes","from":2000,"to":2002},{"club":"Lens","from":2001,"to":2002},{"club":"Liverpool","from":2002,"to":2005},{"club":"Bolton Wanderers","from":2004,"to":2008},{"club":"Sunderland","from":2008,"to":2009},{"club":"Blackburn Rovers","from":2009,"to":2011},{"club":"Rangers","from":2011,"to":2012},{"club":"Leeds United","from":2012,"to":2013},{"club":"Sabah FA","from":2014,"to":2015}]},
    {"id":369,"name":"Emmanuel Adebayor","nationality":"Togo","position":"Forward","career":[
        {"club":"Metz","from":2001,"to":2003},{"club":"AS Monaco","from":2003,"to":2006},{"club":"Arsenal","from":2006,"to":2009},{"club":"Manchester City","from":2009,"to":2012},{"club":"Real Madrid","from":2011,"to":2011},{"club":"Tottenham Hotspur","from":2012,"to":2015},{"club":"Crystal Palace","from":2016,"to":2016},{"club":"Istanbul Basaksehir","from":2017,"to":2018},{"club":"Kayserispor","from":2019,"to":2019},{"club":"Olimpia","from":2020,"to":2021}]},
    {"id":370,"name":"Obafemi Martins","nationality":"Nigeria","position":"Forward","career":[
        {"club":"Inter Milan","from":2001,"to":2006},{"club":"Newcastle United","from":2006,"to":2009},{"club":"VfL Wolfsburg","from":2009,"to":2011},{"club":"Rubin Kazan","from":2011,"to":2011},{"club":"Birmingham City","from":2011,"to":2012},{"club":"Levante","from":2012,"to":2012},{"club":"Seattle Sounders","from":2013,"to":2015},{"club":"Shanghai Shenhua","from":2016,"to":2017}]},
    {"id":371,"name":"Robinho","nationality":"Brazil","position":"Forward","career":[
        {"club":"Santos","from":2002,"to":2005},{"club":"Real Madrid","from":2005,"to":2008},{"club":"Manchester City","from":2008,"to":2010},{"club":"Santos","from":2010,"to":2014},{"club":"AC Milan","from":2010,"to":2014},{"club":"Guangzhou Evergrande","from":2014,"to":2015},{"club":"Atletico Mineiro","from":2016,"to":2016},{"club":"Sivasspor","from":2017,"to":2018},{"club":"Istanbul Basaksehir","from":2018,"to":2019},{"club":"Santos","from":2020,"to":2020}]},
    {"id":372,"name":"Fred","nationality":"Brazil","position":"Midfielder","career":[
        {"club":"Internacional","from":2013,"to":2016},{"club":"Shakhtar Donetsk","from":2016,"to":2018},{"club":"Manchester United","from":2018,"to":2023},{"club":"Fenerbahce","from":2023,"to":2025}]},
    {"id":373,"name":"Allan","nationality":"Brazil","position":"Midfielder","career":[
        {"club":"Vasco da Gama","from":2012,"to":2015},{"club":"Udinese","from":2015,"to":2016},{"club":"Napoli","from":2016,"to":2020},{"club":"Everton","from":2020,"to":2023},{"club":"Al-Wahda","from":2023,"to":2025}]},
    {"id":374,"name":"Lucas Moura","nationality":"Brazil","position":"Forward","career":[
        {"club":"Sao Paulo","from":2010,"to":2013},{"club":"Paris Saint-Germain","from":2013,"to":2018},{"club":"Tottenham Hotspur","from":2018,"to":2023},{"club":"Sao Paulo","from":2023,"to":2025}]},
    {"id":375,"name":"Sergi Roberto","nationality":"Spain","position":"Midfielder","career":[
        {"club":"FC Barcelona","from":2013,"to":2024}]},
    {"id":376,"name":"Marc Cucurella","nationality":"Spain","position":"Defender","career":[
        {"club":"FC Barcelona","from":2017,"to":2020},{"club":"Eibar","from":2018,"to":2019},{"club":"Getafe","from":2019,"to":2021},{"club":"Brighton","from":2021,"to":2022},{"club":"Chelsea","from":2022,"to":2025}]},
    {"id":377,"name":"Marcos Llorente","nationality":"Spain","position":"Midfielder","career":[
        {"club":"Real Madrid","from":2015,"to":2019},{"club":"Deportivo Alaves","from":2016,"to":2017},{"club":"Atletico Madrid","from":2019,"to":2025}]},
    {"id":378,"name":"Pablo Sarabia","nationality":"Spain","position":"Forward","career":[
        {"club":"Real Madrid Castilla","from":2010,"to":2011},{"club":"Getafe","from":2011,"to":2016},{"club":"Sevilla","from":2016,"to":2019},{"club":"Paris Saint-Germain","from":2019,"to":2023},{"club":"Sporting CP","from":2021,"to":2022},{"club":"Wolverhampton","from":2023,"to":2024}]},
    {"id":379,"name":"Gianluca Scamacca","nationality":"Italy","position":"Forward","career":[
        {"club":"Sassuolo","from":2017,"to":2022},{"club":"PSV Eindhoven","from":2018,"to":2019},{"club":"Cremonese","from":2019,"to":2020},{"club":"Genoa","from":2020,"to":2021},{"club":"West Ham United","from":2022,"to":2023},{"club":"Atalanta","from":2023,"to":2025}]},
    {"id":380,"name":"Giacomo Raspadori","nationality":"Italy","position":"Forward","career":[
        {"club":"Sassuolo","from":2018,"to":2022},{"club":"Napoli","from":2022,"to":2025}]},
    {"id":381,"name":"Nicolo Barella","nationality":"Italy","position":"Midfielder","career":[
        {"club":"Cagliari","from":2015,"to":2019},{"club":"Inter Milan","from":2019,"to":2025}]},
    {"id":382,"name":"Davide Frattesi","nationality":"Italy","position":"Midfielder","career":[
        {"club":"Roma","from":2017,"to":2020},{"club":"Ascoli","from":2017,"to":2018},{"club":"Empoli","from":2018,"to":2019},{"club":"Monza","from":2020,"to":2021},{"club":"Sassuolo","from":2021,"to":2023},{"club":"Inter Milan","from":2023,"to":2025}]},
    {"id":383,"name":"Takehiro Tomiyasu","nationality":"Japan","position":"Defender","career":[
        {"club":"Avispa Fukuoka","from":2016,"to":2019},{"club":"Sint-Truiden","from":2019,"to":2019},{"club":"Bologna","from":2019,"to":2021},{"club":"Arsenal","from":2021,"to":2025}]},
    {"id":384,"name":"Daichi Kamada","nationality":"Japan","position":"Midfielder","career":[
        {"club":"Sagan Tosu","from":2015,"to":2017},{"club":"Eintracht Frankfurt","from":2017,"to":2023},{"club":"Sint-Truiden","from":2018,"to":2019},{"club":"Lazio","from":2023,"to":2024},{"club":"Crystal Palace","from":2024,"to":2025}]},
    {"id":385,"name":"Rui Patricio","nationality":"Portugal","position":"Goalkeeper","career":[
        {"club":"Sporting CP","from":2006,"to":2018},{"club":"Wolverhampton","from":2018,"to":2021},{"club":"Roma","from":2021,"to":2024}]},
    {"id":386,"name":"Jose Fonte","nationality":"Portugal","position":"Defender","career":[
        {"club":"Sporting CP","from":2005,"to":2007},{"club":"Felgueiras","from":2005,"to":2006},{"club":"Vitoria Setubal","from":2006,"to":2007},{"club":"Benfica","from":2007,"to":2008},{"club":"Crystal Palace","from":2007,"to":2010},{"club":"Southampton","from":2010,"to":2017},{"club":"West Ham United","from":2017,"to":2018},{"club":"Dalian Professional","from":2018,"to":2019},{"club":"Lille","from":2019,"to":2023}]},
    {"id":387,"name":"Yacine Adli","nationality":"France","position":"Midfielder","career":[
        {"club":"Paris Saint-Germain","from":2017,"to":2019},{"club":"Bordeaux","from":2019,"to":2022},{"club":"AC Milan","from":2022,"to":2025}]},
    {"id":388,"name":"Tanguy Ndombele","nationality":"France","position":"Midfielder","career":[
        {"club":"Amiens","from":2016,"to":2017},{"club":"Lyon","from":2017,"to":2019},{"club":"Tottenham Hotspur","from":2019,"to":2025},{"club":"Lyon","from":2022,"to":2022},{"club":"Napoli","from":2022,"to":2023},{"club":"Galatasaray","from":2023,"to":2024}]},
    {"id":389,"name":"Wilfried Zaha","nationality":"Ivory Coast","position":"Forward","career":[
        {"club":"Crystal Palace","from":2010,"to":2013},{"club":"Manchester United","from":2013,"to":2015},{"club":"Cardiff City","from":2014,"to":2014},{"club":"Crystal Palace","from":2014,"to":2023},{"club":"Galatasaray","from":2023,"to":2025}]},
    {"id":390,"name":"James Maddison","nationality":"England","position":"Midfielder","career":[
        {"club":"Coventry City","from":2014,"to":2016},{"club":"Aberdeen","from":2016,"to":2016},{"club":"Norwich City","from":2016,"to":2018},{"club":"Leicester City","from":2018,"to":2023},{"club":"Tottenham Hotspur","from":2023,"to":2025}]},
    {"id":391,"name":"Dan Ndoye","nationality":"Switzerland","position":"Forward","career":[
        {"club":"Nice","from":2019,"to":2021},{"club":"Lausanne-Sport","from":2019,"to":2020},{"club":"Basel","from":2021,"to":2023},{"club":"Bologna","from":2023,"to":2025}]},
    {"id":392,"name":"Lois Openda","nationality":"Belgium","position":"Forward","career":[
        {"club":"Club Brugge","from":2018,"to":2021},{"club":"Vitesse","from":2021,"to":2022},{"club":"Lens","from":2022,"to":2023},{"club":"RB Leipzig","from":2023,"to":2025}]},
    {"id":393,"name":"Dani Carvajal","nationality":"Spain","position":"Defender","career":[
        {"club":"Real Madrid","from":2012,"to":2025},{"club":"Bayer Leverkusen","from":2012,"to":2013}]},
    {"id":394,"name":"Tomas Soucek","nationality":"Czech Republic","position":"Midfielder","career":[
        {"club":"Slavia Prague","from":2014,"to":2020},{"club":"West Ham United","from":2020,"to":2025}]},
    {"id":395,"name":"Jarrod Bowen","nationality":"England","position":"Forward","career":[
        {"club":"Hereford United","from":2014,"to":2015},{"club":"Hull City","from":2015,"to":2020},{"club":"West Ham United","from":2020,"to":2025}]},
    {"id":396,"name":"Luis Diaz","nationality":"Colombia","position":"Forward","career":[
        {"club":"Barranquilla","from":2017,"to":2019},{"club":"Junior","from":2019,"to":2019},{"club":"Porto","from":2019,"to":2022},{"club":"Liverpool","from":2022,"to":2025}]},
    {"id":397,"name":"Darwin Nunez","nationality":"Uruguay","position":"Forward","career":[
        {"club":"Penarol","from":2017,"to":2019},{"club":"Almeria","from":2019,"to":2020},{"club":"Benfica","from":2020,"to":2022},{"club":"Liverpool","from":2022,"to":2025}]},
    {"id":398,"name":"Exequiel Palacios","nationality":"Argentina","position":"Midfielder","career":[
        {"club":"River Plate","from":2016,"to":2020},{"club":"Bayer Leverkusen","from":2020,"to":2025}]},
    {"id":399,"name":"Nicolas Gonzalez","nationality":"Argentina","position":"Forward","career":[
        {"club":"Argentinos Juniors","from":2016,"to":2018},{"club":"VfB Stuttgart","from":2018,"to":2021},{"club":"Fiorentina","from":2021,"to":2024},{"club":"Juventus","from":2024,"to":2025}]},
    {"id":400,"name":"Rodrigo De Paul","nationality":"Argentina","position":"Midfielder","career":[
        {"club":"Racing Club","from":2013,"to":2016},{"club":"Valencia","from":2014,"to":2016},{"club":"Udinese","from":2016,"to":2021},{"club":"Atletico Madrid","from":2021,"to":2025}]},
    {"id":401,"name":"Emiliano Sala","nationality":"Argentina","position":"Forward","career":[
        {"club":"Proyecto Crecer","from":2010,"to":2012},{"club":"Bordeaux","from":2012,"to":2015},{"club":"Orleans","from":2012,"to":2013},{"club":"Chamois Niortais","from":2013,"to":2014},{"club":"Caen","from":2014,"to":2015},{"club":"Nantes","from":2015,"to":2019}]},
    {"id":402,"name":"Moussa Dembele","nationality":"France","position":"Forward","career":[
        {"club":"Paris Saint-Germain","from":2012,"to":2013},{"club":"Fulham","from":2013,"to":2016},{"club":"Celtic","from":2016,"to":2018},{"club":"Lyon","from":2018,"to":2023},{"club":"Atletico Madrid","from":2020,"to":2021}]},
    {"id":403,"name":"Timothy Weah","nationality":"United States","position":"Forward","career":[
        {"club":"Paris Saint-Germain","from":2017,"to":2019},{"club":"Celtic","from":2019,"to":2019},{"club":"Lille","from":2019,"to":2024},{"club":"Juventus","from":2024,"to":2025}]},
    {"id":404,"name":"Sergej Milinkovic-Savic","nationality":"Serbia","position":"Midfielder","career":[
        {"club":"Vojvodina","from":2013,"to":2014},{"club":"Genk","from":2014,"to":2015},{"club":"Lazio","from":2015,"to":2023},{"club":"Al-Hilal","from":2023,"to":2025}]},
    {"id":405,"name":"Fikayo Tomori","nationality":"England","position":"Defender","career":[
        {"club":"Chelsea","from":2016,"to":2021},{"club":"Brighton","from":2017,"to":2017},{"club":"Hull City","from":2017,"to":2018},{"club":"Derby County","from":2018,"to":2019},{"club":"AC Milan","from":2021,"to":2025}]},
    {"id":406,"name":"Max Kilman","nationality":"England","position":"Defender","career":[
        {"club":"Maidenhead United","from":2016,"to":2018},{"club":"Wolverhampton","from":2018,"to":2024},{"club":"West Ham United","from":2024,"to":2025}]},
    {"id":407,"name":"Odsonne Edouard","nationality":"France","position":"Forward","career":[
        {"club":"Paris Saint-Germain","from":2015,"to":2017},{"club":"Toulouse","from":2016,"to":2017},{"club":"Celtic","from":2017,"to":2021},{"club":"Crystal Palace","from":2021,"to":2025}]},
    {"id":408,"name":"Yunus Musah","nationality":"United States","position":"Midfielder","career":[
        {"club":"Arsenal","from":2016,"to":2019},{"club":"Valencia","from":2019,"to":2023},{"club":"AC Milan","from":2023,"to":2025}]},
    {"id":409,"name":"Folarin Balogun","nationality":"United States","position":"Forward","career":[
        {"club":"Arsenal","from":2019,"to":2023},{"club":"Middlesbrough","from":2021,"to":2022},{"club":"Reims","from":2022,"to":2023},{"club":"AS Monaco","from":2023,"to":2025}]},
    {"id":410,"name":"Ricardo Pepi","nationality":"United States","position":"Forward","career":[
        {"club":"FC Dallas","from":2019,"to":2022},{"club":"Augsburg","from":2022,"to":2023},{"club":"Groningen","from":2022,"to":2023},{"club":"PSV Eindhoven","from":2023,"to":2025}]},
    {"id":411,"name":"Florian Thauvin","nationality":"France","position":"Forward","career":[
        {"club":"Bastia","from":2011,"to":2013},{"club":"Lille","from":2013,"to":2013},{"club":"Marseille","from":2013,"to":2021},{"club":"Newcastle United","from":2015,"to":2016},{"club":"Tigres UANL","from":2021,"to":2025}]},
    {"id":412,"name":"Matteo Guendouzi","nationality":"France","position":"Midfielder","career":[
        {"club":"Lorient","from":2016,"to":2018},{"club":"Arsenal","from":2018,"to":2022},{"club":"Hertha Berlin","from":2020,"to":2021},{"club":"Marseille","from":2021,"to":2024},{"club":"Lazio","from":2024,"to":2025}]},
    {"id":413,"name":"Amine Harit","nationality":"Morocco","position":"Midfielder","career":[
        {"club":"Nantes","from":2015,"to":2017},{"club":"Schalke 04","from":2017,"to":2022},{"club":"Marseille","from":2021,"to":2025}]},
    {"id":414,"name":"Ryan Gravenberch","nationality":"Netherlands","position":"Midfielder","career":[
        {"club":"Ajax","from":2018,"to":2022},{"club":"Bayern Munich","from":2022,"to":2023},{"club":"Liverpool","from":2023,"to":2025}]},
    {"id":415,"name":"Jurrien Timber","nationality":"Netherlands","position":"Defender","career":[
        {"club":"Ajax","from":2020,"to":2023},{"club":"Arsenal","from":2023,"to":2025}]},
    {"id":416,"name":"Destiny Udogie","nationality":"Italy","position":"Defender","career":[
        {"club":"Hellas Verona","from":2019,"to":2021},{"club":"Udinese","from":2021,"to":2023},{"club":"Tottenham Hotspur","from":2023,"to":2025}]},
    {"id":417,"name":"Khephren Thuram","nationality":"France","position":"Midfielder","career":[
        {"club":"AS Monaco","from":2018,"to":2019},{"club":"Nice","from":2019,"to":2024},{"club":"Juventus","from":2024,"to":2025}]},
    {"id":418,"name":"Marcus Thuram","nationality":"France","position":"Forward","career":[
        {"club":"Sochaux","from":2016,"to":2017},{"club":"Guingamp","from":2017,"to":2019},{"club":"Borussia Monchengladbach","from":2019,"to":2023},{"club":"Inter Milan","from":2023,"to":2025}]},
    {"id":419,"name":"Omar Marmoush","nationality":"Egypt","position":"Forward","career":[
        {"club":"VfL Wolfsburg","from":2019,"to":2023},{"club":"St. Pauli","from":2021,"to":2022},{"club":"Eintracht Frankfurt","from":2023,"to":2025},{"club":"Manchester City","from":2025,"to":2025}]},
    {"id":420,"name":"Jamie Bynoe-Gittens","nationality":"England","position":"Forward","career":[
        {"club":"Manchester City","from":2018,"to":2020},{"club":"Borussia Dortmund","from":2020,"to":2025}]},
]

for p in amateur:
    p["tier"] = "amateur"
    p["normalized_name"] = p["name"].lower().replace("é","e").replace("á","a").replace("í","i").replace("ó","o").replace("ú","u").replace("ñ","n").replace("ã","a").replace("ö","o").replace("ü","u").replace("ç","c").replace("ë","e").replace("ï","i").replace("ä","a")
    p["image_url"] = ""
players.extend(amateur)

# ============================================================
# BEGINNER TIER (~80 players)
# ============================================================
beginner = [
    {"id":421,"name":"Arda Turan","nationality":"Turkey","position":"Midfielder","career":[
        {"club":"Galatasaray","from":2005,"to":2011},{"club":"Atletico Madrid","from":2011,"to":2015},{"club":"FC Barcelona","from":2015,"to":2020},{"club":"Istanbul Basaksehir","from":2018,"to":2020},{"club":"Galatasaray","from":2020,"to":2022},{"club":"Eyupspor","from":2022,"to":2024}]},
    {"id":422,"name":"Hatem Ben Arfa","nationality":"France","position":"Forward","career":[
        {"club":"Lyon","from":2004,"to":2008},{"club":"Marseille","from":2008,"to":2011},{"club":"Newcastle United","from":2011,"to":2014},{"club":"Hull City","from":2014,"to":2015},{"club":"Nice","from":2015,"to":2016},{"club":"Paris Saint-Germain","from":2016,"to":2018},{"club":"Rennes","from":2018,"to":2019},{"club":"Real Valladolid","from":2019,"to":2020},{"club":"Bordeaux","from":2020,"to":2021},{"club":"Lille","from":2021,"to":2022}]},
    {"id":423,"name":"Marko Arnautovic","nationality":"Austria","position":"Forward","career":[
        {"club":"Twente","from":2006,"to":2009},{"club":"Inter Milan","from":2009,"to":2010},{"club":"Werder Bremen","from":2010,"to":2013},{"club":"Stoke City","from":2013,"to":2017},{"club":"West Ham United","from":2017,"to":2019},{"club":"Shanghai Port","from":2019,"to":2021},{"club":"Bologna","from":2021,"to":2023},{"club":"Inter Milan","from":2023,"to":2025}]},
    {"id":424,"name":"Divock Origi","nationality":"Belgium","position":"Forward","career":[
        {"club":"Lille","from":2012,"to":2014},{"club":"Liverpool","from":2014,"to":2022},{"club":"Lille","from":2014,"to":2015},{"club":"VfL Wolfsburg","from":2017,"to":2018},{"club":"AC Milan","from":2022,"to":2024},{"club":"Nottingham Forest","from":2024,"to":2025}]},
    {"id":425,"name":"Renato Sanches","nationality":"Portugal","position":"Midfielder","career":[
        {"club":"Benfica","from":2015,"to":2016},{"club":"Bayern Munich","from":2016,"to":2019},{"club":"Swansea City","from":2017,"to":2018},{"club":"Lille","from":2019,"to":2022},{"club":"Paris Saint-Germain","from":2022,"to":2024},{"club":"Benfica","from":2024,"to":2025}]},
    {"id":426,"name":"Roque Mesa","nationality":"Spain","position":"Midfielder","career":[
        {"club":"Las Palmas","from":2009,"to":2017},{"club":"Swansea City","from":2017,"to":2018},{"club":"Sevilla","from":2018,"to":2019},{"club":"Leganes","from":2019,"to":2020},{"club":"Real Valladolid","from":2020,"to":2023}]},
    {"id":427,"name":"Danny Drinkwater","nationality":"England","position":"Midfielder","career":[
        {"club":"Manchester United","from":2009,"to":2012},{"club":"Huddersfield Town","from":2011,"to":2011},{"club":"Cardiff City","from":2011,"to":2012},{"club":"Watford","from":2012,"to":2012},{"club":"Barnsley","from":2012,"to":2013},{"club":"Leicester City","from":2012,"to":2017},{"club":"Chelsea","from":2017,"to":2022},{"club":"Burnley","from":2019,"to":2020},{"club":"Aston Villa","from":2020,"to":2020},{"club":"Kasimpasa","from":2020,"to":2021},{"club":"Reading","from":2022,"to":2023}]},
    {"id":428,"name":"Cenk Tosun","nationality":"Turkey","position":"Forward","career":[
        {"club":"Eintracht Frankfurt","from":2009,"to":2011},{"club":"Gaziantepspor","from":2011,"to":2014},{"club":"Besiktas","from":2014,"to":2018},{"club":"Everton","from":2018,"to":2021},{"club":"Crystal Palace","from":2020,"to":2020},{"club":"Besiktas","from":2020,"to":2025}]},
    {"id":429,"name":"Tiemoue Bakayoko","nationality":"France","position":"Midfielder","career":[
        {"club":"AS Monaco","from":2014,"to":2017},{"club":"Chelsea","from":2017,"to":2023},{"club":"AC Milan","from":2018,"to":2019},{"club":"AS Monaco","from":2019,"to":2020},{"club":"Napoli","from":2020,"to":2021},{"club":"AC Milan","from":2021,"to":2023},{"club":"Lorient","from":2023,"to":2024}]},
    {"id":430,"name":"Brahim Diaz","nationality":"Spain","position":"Midfielder","career":[
        {"club":"Manchester City","from":2016,"to":2019},{"club":"Real Madrid","from":2019,"to":2025},{"club":"AC Milan","from":2020,"to":2023}]},
    {"id":431,"name":"Takumi Minamino","nationality":"Japan","position":"Forward","career":[
        {"club":"Cerezo Osaka","from":2012,"to":2015},{"club":"Red Bull Salzburg","from":2015,"to":2020},{"club":"Liverpool","from":2020,"to":2022},{"club":"Southampton","from":2022,"to":2022},{"club":"AS Monaco","from":2022,"to":2024},{"club":"Stade Brestois","from":2024,"to":2025}]},
    {"id":432,"name":"Ante Rebic","nationality":"Croatia","position":"Forward","career":[
        {"club":"RNK Split","from":2013,"to":2014},{"club":"Fiorentina","from":2014,"to":2016},{"club":"Hellas Verona","from":2015,"to":2016},{"club":"Eintracht Frankfurt","from":2016,"to":2020},{"club":"AC Milan","from":2020,"to":2024},{"club":"Besiktas","from":2024,"to":2025}]},
    {"id":433,"name":"Moise Kean","nationality":"Italy","position":"Forward","career":[
        {"club":"Juventus","from":2016,"to":2019},{"club":"Hellas Verona","from":2017,"to":2018},{"club":"Everton","from":2019,"to":2021},{"club":"Paris Saint-Germain","from":2020,"to":2021},{"club":"Juventus","from":2021,"to":2024},{"club":"Fiorentina","from":2024,"to":2025}]},
    {"id":434,"name":"Boulaye Dia","nationality":"Senegal","position":"Forward","career":[
        {"club":"Reims","from":2018,"to":2021},{"club":"Villarreal","from":2021,"to":2022},{"club":"Salernitana","from":2022,"to":2023},{"club":"Lazio","from":2023,"to":2025}]},
    {"id":435,"name":"Romain Saiss","nationality":"Morocco","position":"Defender","career":[
        {"club":"Valence","from":2009,"to":2010},{"club":"Le Havre","from":2010,"to":2012},{"club":"Angers","from":2012,"to":2016},{"club":"Wolverhampton","from":2016,"to":2023},{"club":"Besiktas","from":2023,"to":2025}]},
    {"id":436,"name":"Andre Ayew","nationality":"Ghana","position":"Forward","career":[
        {"club":"Marseille","from":2007,"to":2015},{"club":"Arles-Avignon","from":2008,"to":2009},{"club":"Lorient","from":2009,"to":2010},{"club":"Swansea City","from":2015,"to":2018},{"club":"West Ham United","from":2016,"to":2018},{"club":"Fenerbahce","from":2018,"to":2019},{"club":"Swansea City","from":2018,"to":2021},{"club":"Al Sadd","from":2021,"to":2022},{"club":"Le Havre","from":2023,"to":2024}]},
    {"id":437,"name":"Jordan Ayew","nationality":"Ghana","position":"Forward","career":[
        {"club":"Marseille","from":2010,"to":2014},{"club":"Sochaux","from":2012,"to":2013},{"club":"Lorient","from":2014,"to":2015},{"club":"Aston Villa","from":2015,"to":2017},{"club":"Swansea City","from":2017,"to":2019},{"club":"Crystal Palace","from":2019,"to":2024},{"club":"Leicester City","from":2024,"to":2025}]},
    {"id":438,"name":"Gelson Martins","nationality":"Portugal","position":"Forward","career":[
        {"club":"Sporting CP","from":2015,"to":2018},{"club":"Atletico Madrid","from":2018,"to":2019},{"club":"AS Monaco","from":2019,"to":2024}]},
    {"id":439,"name":"Andreas Christensen","nationality":"Denmark","position":"Defender","career":[
        {"club":"Chelsea","from":2014,"to":2022},{"club":"Borussia Monchengladbach","from":2015,"to":2017},{"club":"FC Barcelona","from":2022,"to":2025}]},
    {"id":440,"name":"Eric Bailly","nationality":"Ivory Coast","position":"Defender","career":[
        {"club":"Espanyol","from":2012,"to":2014},{"club":"Villarreal","from":2014,"to":2016},{"club":"Manchester United","from":2016,"to":2023},{"club":"Marseille","from":2022,"to":2023},{"club":"Besiktas","from":2023,"to":2024}]},
    {"id":441,"name":"Niklas Sule","nationality":"Germany","position":"Defender","career":[
        {"club":"TSG Hoffenheim","from":2013,"to":2017},{"club":"Bayern Munich","from":2017,"to":2022},{"club":"Borussia Dortmund","from":2022,"to":2025}]},
    {"id":442,"name":"Manuel Akanji","nationality":"Switzerland","position":"Defender","career":[
        {"club":"Basel","from":2014,"to":2018},{"club":"Borussia Dortmund","from":2018,"to":2022},{"club":"Manchester City","from":2022,"to":2025}]},
    {"id":443,"name":"Nathan Ake","nationality":"Netherlands","position":"Defender","career":[
        {"club":"Chelsea","from":2012,"to":2017},{"club":"Reading","from":2015,"to":2015},{"club":"Watford","from":2015,"to":2016},{"club":"Bournemouth","from":2016,"to":2020},{"club":"Manchester City","from":2020,"to":2025}]},
    {"id":444,"name":"Stefan de Vrij","nationality":"Netherlands","position":"Defender","career":[
        {"club":"Feyenoord","from":2010,"to":2014},{"club":"Lazio","from":2014,"to":2018},{"club":"Inter Milan","from":2018,"to":2025}]},
    {"id":445,"name":"Simon Kjaer","nationality":"Denmark","position":"Defender","career":[
        {"club":"Midtjylland","from":2007,"to":2008},{"club":"Palermo","from":2008,"to":2010},{"club":"VfL Wolfsburg","from":2010,"to":2013},{"club":"Roma","from":2011,"to":2012},{"club":"Lille","from":2013,"to":2015},{"club":"Fenerbahce","from":2015,"to":2017},{"club":"Sevilla","from":2017,"to":2019},{"club":"Atalanta","from":2019,"to":2020},{"club":"AC Milan","from":2020,"to":2024}]},
    {"id":446,"name":"Mikel Merino","nationality":"Spain","position":"Midfielder","career":[
        {"club":"Osasuna","from":2014,"to":2016},{"club":"Borussia Dortmund","from":2016,"to":2017},{"club":"Newcastle United","from":2017,"to":2018},{"club":"Real Sociedad","from":2018,"to":2024},{"club":"Arsenal","from":2024,"to":2025}]},
    {"id":447,"name":"Rodrigo Bentancur","nationality":"Uruguay","position":"Midfielder","career":[
        {"club":"Boca Juniors","from":2015,"to":2017},{"club":"Juventus","from":2017,"to":2022},{"club":"Tottenham Hotspur","from":2022,"to":2025}]},
    {"id":448,"name":"Giovani Lo Celso","nationality":"Argentina","position":"Midfielder","career":[
        {"club":"Rosario Central","from":2015,"to":2016},{"club":"Paris Saint-Germain","from":2016,"to":2019},{"club":"Real Betis","from":2018,"to":2019},{"club":"Tottenham Hotspur","from":2019,"to":2024},{"club":"Villarreal","from":2022,"to":2023},{"club":"Real Betis","from":2024,"to":2025}]},
    {"id":449,"name":"Maxence Caqueret","nationality":"France","position":"Midfielder","career":[
        {"club":"Lyon","from":2019,"to":2025}]},
    {"id":450,"name":"Rayan Cherki","nationality":"France","position":"Forward","career":[
        {"club":"Lyon","from":2019,"to":2025}]},
    {"id":451,"name":"Harvey Elliott","nationality":"England","position":"Midfielder","career":[
        {"club":"Fulham","from":2018,"to":2019},{"club":"Liverpool","from":2019,"to":2025},{"club":"Blackburn Rovers","from":2020,"to":2021}]},
    {"id":452,"name":"Curtis Jones","nationality":"England","position":"Midfielder","career":[
        {"club":"Liverpool","from":2019,"to":2025}]},
    {"id":453,"name":"Leny Yoro","nationality":"France","position":"Defender","career":[
        {"club":"Lille","from":2022,"to":2024},{"club":"Manchester United","from":2024,"to":2025}]},
    {"id":454,"name":"Desire Doue","nationality":"France","position":"Forward","career":[
        {"club":"Rennes","from":2022,"to":2024},{"club":"Paris Saint-Germain","from":2024,"to":2025}]},
    {"id":455,"name":"Gabri Veiga","nationality":"Spain","position":"Midfielder","career":[
        {"club":"Celta Vigo","from":2021,"to":2023},{"club":"Al-Ahli","from":2023,"to":2025}]},
    {"id":456,"name":"Gonçalo Ramos","nationality":"Portugal","position":"Forward","career":[
        {"club":"Benfica","from":2020,"to":2023},{"club":"Paris Saint-Germain","from":2023,"to":2025}]},
    {"id":457,"name":"Rasmus Kristensen","nationality":"Denmark","position":"Defender","career":[
        {"club":"Midtjylland","from":2014,"to":2015},{"club":"Ajax","from":2015,"to":2018},{"club":"Red Bull Salzburg","from":2018,"to":2022},{"club":"Leeds United","from":2022,"to":2024},{"club":"Roma","from":2023,"to":2024},{"club":"Eintracht Frankfurt","from":2024,"to":2025}]},
    {"id":458,"name":"Amadou Onana","nationality":"Belgium","position":"Midfielder","career":[
        {"club":"TSG Hoffenheim","from":2019,"to":2021},{"club":"Hamburger SV","from":2020,"to":2021},{"club":"Lille","from":2021,"to":2022},{"club":"Everton","from":2022,"to":2024},{"club":"Aston Villa","from":2024,"to":2025}]},
    {"id":459,"name":"Samu Omorodion","nationality":"Spain","position":"Forward","career":[
        {"club":"Granada","from":2022,"to":2023},{"club":"Atletico Madrid","from":2023,"to":2024},{"club":"Alaves","from":2023,"to":2024},{"club":"Porto","from":2024,"to":2025}]},
    {"id":460,"name":"Kenan Yildiz","nationality":"Turkey","position":"Forward","career":[
        {"club":"Bayern Munich","from":2019,"to":2022},{"club":"Juventus","from":2022,"to":2025}]},
    {"id":461,"name":"Benjamin Sesko","nationality":"Slovenia","position":"Forward","career":[
        {"club":"Red Bull Salzburg","from":2019,"to":2023},{"club":"RB Leipzig","from":2023,"to":2025}]},
    {"id":462,"name":"Manu Kone","nationality":"France","position":"Midfielder","career":[
        {"club":"Toulouse","from":2019,"to":2021},{"club":"Borussia Monchengladbach","from":2021,"to":2024},{"club":"Roma","from":2024,"to":2025}]},
    {"id":463,"name":"Adam Wharton","nationality":"England","position":"Midfielder","career":[
        {"club":"Blackburn Rovers","from":2021,"to":2024},{"club":"Crystal Palace","from":2024,"to":2025}]},
    {"id":464,"name":"Carlos Baleba","nationality":"Cameroon","position":"Midfielder","career":[
        {"club":"Lille","from":2021,"to":2023},{"club":"Brighton","from":2023,"to":2025}]},
    {"id":465,"name":"Enzo Le Fee","nationality":"France","position":"Midfielder","career":[
        {"club":"Lorient","from":2019,"to":2023},{"club":"Rennes","from":2023,"to":2024},{"club":"Roma","from":2024,"to":2025}]},
    {"id":466,"name":"Michael Kayode","nationality":"Italy","position":"Defender","career":[
        {"club":"Fiorentina","from":2022,"to":2025}]},
    {"id":467,"name":"Giorgio Scalvini","nationality":"Italy","position":"Defender","career":[
        {"club":"Atalanta","from":2021,"to":2025}]},
    {"id":468,"name":"Castello Lukeba","nationality":"France","position":"Defender","career":[
        {"club":"Lyon","from":2021,"to":2024},{"club":"RB Leipzig","from":2024,"to":2025}]},
    {"id":469,"name":"Caleb Wiley","nationality":"United States","position":"Defender","career":[
        {"club":"Atlanta United","from":2022,"to":2024},{"club":"Chelsea","from":2024,"to":2025},{"club":"Strasbourg","from":2024,"to":2025}]},
    {"id":470,"name":"Oscar Bobb","nationality":"Norway","position":"Midfielder","career":[
        {"club":"Manchester City","from":2022,"to":2025}]},
    {"id":471,"name":"Claudio Echeverri","nationality":"Argentina","position":"Midfielder","career":[
        {"club":"River Plate","from":2023,"to":2025},{"club":"Manchester City","from":2025,"to":2025}]},
    {"id":472,"name":"Liam Delap","nationality":"England","position":"Forward","career":[
        {"club":"Derby County","from":2019,"to":2019},{"club":"Manchester City","from":2019,"to":2024},{"club":"Stoke City","from":2022,"to":2022},{"club":"Preston North End","from":2023,"to":2023},{"club":"Hull City","from":2023,"to":2024},{"club":"Ipswich Town","from":2024,"to":2025}]},
    {"id":473,"name":"Amad Diallo","nationality":"Ivory Coast","position":"Forward","career":[
        {"club":"Atalanta","from":2019,"to":2021},{"club":"Manchester United","from":2021,"to":2025},{"club":"Rangers","from":2022,"to":2022},{"club":"Sunderland","from":2022,"to":2023}]},
    {"id":474,"name":"Lewis Hall","nationality":"England","position":"Defender","career":[
        {"club":"Chelsea","from":2020,"to":2024},{"club":"Newcastle United","from":2023,"to":2025}]},
    {"id":475,"name":"Gabriel Martinelli","nationality":"Brazil","position":"Forward","career":[
        {"club":"Ituano","from":2018,"to":2019},{"club":"Arsenal","from":2019,"to":2025}]},
    {"id":476,"name":"Eddie Nketiah","nationality":"England","position":"Forward","career":[
        {"club":"Arsenal","from":2017,"to":2025},{"club":"Leeds United","from":2019,"to":2020},{"club":"Crystal Palace","from":2025,"to":2025}]},
    {"id":477,"name":"Mikel Arteta","nationality":"Spain","position":"Midfielder","career":[
        {"club":"FC Barcelona","from":1997,"to":2002},{"club":"Paris Saint-Germain","from":2002,"to":2002},{"club":"Rangers","from":2002,"to":2004},{"club":"Real Sociedad","from":2004,"to":2005},{"club":"Everton","from":2005,"to":2011},{"club":"Arsenal","from":2011,"to":2016}]},
    {"id":478,"name":"Michael Carrick","nationality":"England","position":"Midfielder","career":[
        {"club":"West Ham United","from":1999,"to":2004},{"club":"Tottenham Hotspur","from":2004,"to":2006},{"club":"Manchester United","from":2006,"to":2018}]},
    {"id":479,"name":"Peter Crouch","nationality":"England","position":"Forward","career":[
        {"club":"Tottenham Hotspur","from":1998,"to":2000},{"club":"Dulwich Hamlet","from":2000,"to":2000},{"club":"IFK Hassleholm","from":2000,"to":2000},{"club":"Queens Park Rangers","from":2000,"to":2002},{"club":"Portsmouth","from":2001,"to":2002},{"club":"Aston Villa","from":2002,"to":2004},{"club":"Southampton","from":2004,"to":2005},{"club":"Liverpool","from":2005,"to":2008},{"club":"Portsmouth","from":2008,"to":2009},{"club":"Tottenham Hotspur","from":2009,"to":2011},{"club":"Stoke City","from":2011,"to":2019},{"club":"Burnley","from":2019,"to":2019}]},
    {"id":480,"name":"Jermain Defoe","nationality":"England","position":"Forward","career":[
        {"club":"West Ham United","from":1999,"to":2004},{"club":"Tottenham Hotspur","from":2004,"to":2008},{"club":"Portsmouth","from":2008,"to":2009},{"club":"Tottenham Hotspur","from":2009,"to":2014},{"club":"Toronto FC","from":2014,"to":2015},{"club":"Sunderland","from":2015,"to":2017},{"club":"Bournemouth","from":2017,"to":2018},{"club":"Rangers","from":2019,"to":2022}]},
    {"id":481,"name":"Peter Schmeichel","nationality":"Denmark","position":"Goalkeeper","career":[
        {"club":"Brondby","from":1987,"to":1991},{"club":"Manchester United","from":1991,"to":1999},{"club":"Sporting CP","from":1999,"to":2001},{"club":"Aston Villa","from":2001,"to":2003},{"club":"Manchester City","from":2002,"to":2003}]},
    {"id":482,"name":"Edwin van der Sar","nationality":"Netherlands","position":"Goalkeeper","career":[
        {"club":"Ajax","from":1990,"to":1999},{"club":"Juventus","from":1999,"to":2001},{"club":"Fulham","from":2001,"to":2005},{"club":"Manchester United","from":2005,"to":2011}]},
    {"id":483,"name":"Oliver Kahn","nationality":"Germany","position":"Goalkeeper","career":[
        {"club":"Karlsruher SC","from":1987,"to":1994},{"club":"Bayern Munich","from":1994,"to":2008}]},
    {"id":484,"name":"Gianfranco Zola","nationality":"Italy","position":"Forward","career":[
        {"club":"Nuorese","from":1984,"to":1986},{"club":"Torres","from":1986,"to":1989},{"club":"Napoli","from":1989,"to":1993},{"club":"Parma","from":1993,"to":1996},{"club":"Chelsea","from":1996,"to":2003},{"club":"Cagliari","from":2003,"to":2005}]},
    {"id":485,"name":"Davor Suker","nationality":"Croatia","position":"Forward","career":[
        {"club":"Osijek","from":1987,"to":1991},{"club":"Dinamo Zagreb","from":1991,"to":1992},{"club":"Sevilla","from":1992,"to":1996},{"club":"Real Madrid","from":1996,"to":1999},{"club":"Arsenal","from":1999,"to":2000},{"club":"West Ham United","from":2000,"to":2001},{"club":"1860 Munich","from":2001,"to":2003}]},
    {"id":486,"name":"Predrag Mijatovic","nationality":"Montenegro","position":"Forward","career":[
        {"club":"Buducnost Podgorica","from":1987,"to":1993},{"club":"Partizan","from":1993,"to":1993},{"club":"Valencia","from":1993,"to":1996},{"club":"Real Madrid","from":1996,"to":1999},{"club":"Fiorentina","from":1999,"to":2000},{"club":"Levante","from":2000,"to":2003}]},
    {"id":487,"name":"Robbie Fowler","nationality":"England","position":"Forward","career":[
        {"club":"Liverpool","from":1993,"to":2001},{"club":"Leeds United","from":2001,"to":2003},{"club":"Manchester City","from":2003,"to":2006},{"club":"Liverpool","from":2006,"to":2007},{"club":"Cardiff City","from":2007,"to":2008},{"club":"Blackburn Rovers","from":2008,"to":2008},{"club":"North Queensland Fury","from":2009,"to":2010},{"club":"Perth Glory","from":2010,"to":2011},{"club":"Muangthong United","from":2012,"to":2012}]},
    {"id":488,"name":"Alan Shearer","nationality":"England","position":"Forward","career":[
        {"club":"Southampton","from":1988,"to":1992},{"club":"Blackburn Rovers","from":1992,"to":1996},{"club":"Newcastle United","from":1996,"to":2006}]},
    {"id":489,"name":"Ian Rush","nationality":"Wales","position":"Forward","career":[
        {"club":"Chester City","from":1978,"to":1980},{"club":"Liverpool","from":1980,"to":1987},{"club":"Juventus","from":1987,"to":1988},{"club":"Liverpool","from":1988,"to":1996},{"club":"Leeds United","from":1996,"to":1997},{"club":"Newcastle United","from":1997,"to":1998},{"club":"Sheffield United","from":1998,"to":1998},{"club":"Wrexham","from":1998,"to":1999}]},
    {"id":490,"name":"Ryan Giggs","nationality":"Wales","position":"Midfielder","career":[
        {"club":"Manchester United","from":1991,"to":2014}]},
    {"id":491,"name":"Paul Scholes","nationality":"England","position":"Midfielder","career":[
        {"club":"Manchester United","from":1994,"to":2013}]},
    {"id":492,"name":"Gary Neville","nationality":"England","position":"Defender","career":[
        {"club":"Manchester United","from":1992,"to":2011}]},
    {"id":493,"name":"Sol Campbell","nationality":"England","position":"Defender","career":[
        {"club":"Tottenham Hotspur","from":1992,"to":2001},{"club":"Arsenal","from":2001,"to":2006},{"club":"Portsmouth","from":2006,"to":2009},{"club":"Notts County","from":2009,"to":2010},{"club":"Arsenal","from":2010,"to":2010},{"club":"Newcastle United","from":2010,"to":2011}]},
    {"id":494,"name":"Marcel Desailly","nationality":"France","position":"Defender","career":[
        {"club":"Nantes","from":1986,"to":1992},{"club":"Marseille","from":1992,"to":1994},{"club":"AC Milan","from":1994,"to":1998},{"club":"Chelsea","from":1998,"to":2004},{"club":"Al-Gharafa","from":2004,"to":2005}]},
    {"id":495,"name":"Lilian Thuram","nationality":"France","position":"Defender","career":[
        {"club":"AS Monaco","from":1991,"to":1996},{"club":"Parma","from":1996,"to":2001},{"club":"Juventus","from":2001,"to":2006},{"club":"FC Barcelona","from":2006,"to":2008}]},
    {"id":496,"name":"Didier Deschamps","nationality":"France","position":"Midfielder","career":[
        {"club":"Nantes","from":1985,"to":1989},{"club":"Marseille","from":1989,"to":1994},{"club":"Juventus","from":1994,"to":1999},{"club":"Chelsea","from":1999,"to":2000},{"club":"Valencia","from":2000,"to":2001}]},
    {"id":497,"name":"Laurent Blanc","nationality":"France","position":"Defender","career":[
        {"club":"Montpellier","from":1983,"to":1991},{"club":"Napoli","from":1991,"to":1993},{"club":"Nimes","from":1993,"to":1995},{"club":"Saint-Etienne","from":1995,"to":1996},{"club":"Auxerre","from":1996,"to":1996},{"club":"FC Barcelona","from":1996,"to":1997},{"club":"Marseille","from":1997,"to":1999},{"club":"Inter Milan","from":1999,"to":2001},{"club":"Manchester United","from":2001,"to":2003}]},
    {"id":498,"name":"David Trezeguet","nationality":"France","position":"Forward","career":[
        {"club":"Platense","from":1994,"to":1995},{"club":"AS Monaco","from":1995,"to":2000},{"club":"Juventus","from":2000,"to":2010},{"club":"Hercules","from":2010,"to":2011},{"club":"River Plate","from":2011,"to":2012},{"club":"Newell's Old Boys","from":2012,"to":2013},{"club":"Pune City","from":2014,"to":2014}]},
    {"id":499,"name":"Robert Pires","nationality":"France","position":"Midfielder","career":[
        {"club":"Metz","from":1993,"to":1998},{"club":"Marseille","from":1998,"to":2000},{"club":"Arsenal","from":2000,"to":2006},{"club":"Villarreal","from":2006,"to":2010},{"club":"Aston Villa","from":2010,"to":2011},{"club":"FC Goa","from":2014,"to":2015}]},
    {"id":500,"name":"Sylvain Wiltord","nationality":"France","position":"Forward","career":[
        {"club":"Rennes","from":1994,"to":1997},{"club":"Bordeaux","from":1997,"to":2000},{"club":"Arsenal","from":2000,"to":2004},{"club":"Lyon","from":2004,"to":2007},{"club":"Rennes","from":2007,"to":2009},{"club":"Metz","from":2010,"to":2011}]},
    {"id":501,"name":"Alvaro Negredo","nationality":"Spain","position":"Forward","career":[
        {"club":"Real Madrid Castilla","from":2005,"to":2007},{"club":"Almeria","from":2007,"to":2009},{"club":"Sevilla","from":2009,"to":2013},{"club":"Manchester City","from":2013,"to":2015},{"club":"Valencia","from":2014,"to":2017},{"club":"Middlesbrough","from":2017,"to":2017},{"club":"Besiktas","from":2017,"to":2018},{"club":"Al-Nassr","from":2018,"to":2019},{"club":"Cadiz","from":2020,"to":2022}]},
    {"id":502,"name":"Iago Aspas","nationality":"Spain","position":"Forward","career":[
        {"club":"Celta Vigo","from":2008,"to":2013},{"club":"Liverpool","from":2013,"to":2015},{"club":"Sevilla","from":2014,"to":2015},{"club":"Celta Vigo","from":2015,"to":2025}]},
    {"id":503,"name":"Josip Brekalo","nationality":"Croatia","position":"Forward","career":[
        {"club":"Dinamo Zagreb","from":2015,"to":2016},{"club":"VfL Wolfsburg","from":2016,"to":2022},{"club":"VfB Stuttgart","from":2017,"to":2018},{"club":"Torino","from":2021,"to":2022},{"club":"Fiorentina","from":2022,"to":2023},{"club":"Hajduk Split","from":2023,"to":2025}]},
    {"id":504,"name":"Florin Raducioiu","nationality":"Romania","position":"Forward","career":[
        {"club":"Dinamo Bucharest","from":1986,"to":1990},{"club":"Bari","from":1990,"to":1992},{"club":"Verona","from":1992,"to":1993},{"club":"Brescia","from":1993,"to":1994},{"club":"AC Milan","from":1993,"to":1996},{"club":"Espanyol","from":1996,"to":1997},{"club":"West Ham United","from":1996,"to":1997},{"club":"VfB Stuttgart","from":1997,"to":1999}]},
    {"id":505,"name":"Radja Nainggolan","nationality":"Belgium","position":"Midfielder","career":[
        {"club":"Piacenza","from":2005,"to":2010},{"club":"Cagliari","from":2010,"to":2014},{"club":"Roma","from":2014,"to":2018},{"club":"Inter Milan","from":2018,"to":2021},{"club":"Cagliari","from":2019,"to":2021},{"club":"Antwerp","from":2021,"to":2023}]},
    {"id":506,"name":"Josip Stanisic","nationality":"Croatia","position":"Defender","career":[
        {"club":"Bayern Munich","from":2021,"to":2025},{"club":"Bayer Leverkusen","from":2023,"to":2024}]},
    {"id":507,"name":"Jeremy Frimpong","nationality":"Netherlands","position":"Defender","career":[
        {"club":"Manchester City","from":2017,"to":2019},{"club":"Celtic","from":2020,"to":2021},{"club":"Bayer Leverkusen","from":2021,"to":2025}]},
    {"id":508,"name":"Piero Hincapie","nationality":"Ecuador","position":"Defender","career":[
        {"club":"Independiente del Valle","from":2019,"to":2021},{"club":"Talleres","from":2019,"to":2020},{"club":"Bayer Leverkusen","from":2021,"to":2025}]},
    {"id":509,"name":"Amine Adli","nationality":"France","position":"Forward","career":[
        {"club":"Toulouse","from":2019,"to":2021},{"club":"Bayer Leverkusen","from":2021,"to":2025}]},
    {"id":510,"name":"Jonathan Tah","nationality":"Germany","position":"Defender","career":[
        {"club":"Hamburger SV","from":2013,"to":2015},{"club":"Fortuna Dusseldorf","from":2014,"to":2015},{"club":"Bayer Leverkusen","from":2015,"to":2025}]},
]

for p in beginner:
    p["tier"] = "beginner"
    p["normalized_name"] = p["name"].lower().replace("é","e").replace("á","a").replace("í","i").replace("ó","o").replace("ú","u").replace("ñ","n").replace("ã","a").replace("ö","o").replace("ü","u").replace("ç","c").replace("ë","e").replace("ï","i").replace("ä","a")
    p["image_url"] = ""
players.extend(beginner)

print(f"Amateur: {len(amateur)}, Beginner: {len(beginner)}")
print(f"Total players: {len(players)}")

# Write final file
with open("/Users/jasur/workspace/football/data/career_paths.json", "w") as f:
    json.dump(players, f, indent=2, ensure_ascii=False)
print("career_paths.json written successfully!")
