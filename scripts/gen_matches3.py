#!/usr/bin/env python3
"""Add batch 3 of matches to reach 200+."""
import json

existing = json.load(open("/Users/jasur/workspace/football/data/matches_db.json"))
existing_ids = {m["match_id"] for m in existing}
Z = [0,0,0,0,0,0,0,0,0,0,0]

new_matches = [
    # === MORE WORLD CUP CLASSICS ===
    {
        "match_id": "wc-final-1958",
        "date": "1958-06-29",
        "competition": "FIFA World Cup Final",
        "season": "1958",
        "opponent_a": "Brazil",
        "opponent_b": "Sweden",
        "score": "5-2",
        "lineup_a": ["Gilmar", "De Sordi", "Nilton Santos", "Zito", "Bellini", "Orlando", "Garrincha", "Didi", "Vava", "Pele", "Zagallo"],
        "lineup_b": ["Svensson", "Bergmark", "Axbom", "Boerjesson", "Gustavsson", "Parling", "Hamrin", "Gren", "Simonsson", "Liedholm", "Skoglund"]
    },
    {
        "match_id": "wc-final-1962",
        "date": "1962-06-17",
        "competition": "FIFA World Cup Final",
        "season": "1962",
        "opponent_a": "Brazil",
        "opponent_b": "Czechoslovakia",
        "score": "3-1",
        "lineup_a": ["Gilmar", "Djalma Santos", "Nilton Santos", "Zito", "Mauro", "Zozimo", "Garrincha", "Didi", "Vava", "Amarildo", "Zagallo"],
        "lineup_b": ["Schrojf", "Tichy", "Novak", "Pluskal", "Popluhar", "Masopust", "Pospichal", "Scherer", "Kvasnak", "Kadraba", "Jelinek"]
    },
    {
        "match_id": "wc-final-1974",
        "date": "1974-07-07",
        "competition": "FIFA World Cup Final",
        "season": "1974",
        "opponent_a": "West Germany",
        "opponent_b": "Netherlands",
        "score": "2-1",
        "lineup_a": ["Maier", "Vogts", "Beckenbauer", "Schwarzenbeck", "Breitner", "Bonhof", "Hoeness", "Overath", "Grabowski", "Muller", "Holzenbein"],
        "lineup_b": ["Jongbloed", "Suurbier", "Rijsbergen", "Haan", "Krol", "Jansen", "Neeskens", "Van Hanegem", "Rep", "Cruyff", "Rensenbrink"]
    },
    {
        "match_id": "wc-final-1978",
        "date": "1978-06-25",
        "competition": "FIFA World Cup Final",
        "season": "1978",
        "opponent_a": "Argentina",
        "opponent_b": "Netherlands",
        "score": "3-1",
        "lineup_a": ["Fillol", "Olguin", "Galvan", "Passarella", "Tarantini", "Ardiles", "Gallego", "Kempes", "Bertoni", "Luque", "Ortiz"],
        "lineup_b": ["Jongbloed", "Krol", "Brandts", "Poortvliet", "Jansen", "Haan", "Neeskens", "Van de Kerkhof W.", "Van de Kerkhof R.", "Rep", "Rensenbrink"]
    },
    {
        "match_id": "wc-final-1982",
        "date": "1982-07-11",
        "competition": "FIFA World Cup Final",
        "season": "1982",
        "opponent_a": "Italy",
        "opponent_b": "West Germany",
        "score": "3-1",
        "lineup_a": ["Zoff", "Bergomi", "Cabrini", "Collovati", "Scirea", "Gentile", "Oriali", "Tardelli", "Conti", "Rossi", "Graziani"],
        "lineup_b": ["Schumacher", "Kaltz", "Briegel", "K.H. Forster", "Stielike", "B. Forster", "Breitner", "Dremmler", "Littbarski", "Fischer", "Rummenigge"]
    },
    {
        "match_id": "wc-sf-1982-italy-brazil",
        "date": "1982-07-05",
        "competition": "FIFA World Cup",
        "season": "1982",
        "opponent_a": "Italy",
        "opponent_b": "Brazil",
        "score": "3-2",
        "lineup_a": ["Zoff", "Bergomi", "Cabrini", "Collovati", "Scirea", "Gentile", "Oriali", "Tardelli", "Conti", "Rossi", "Graziani"],
        "lineup_b": ["Waldir Peres", "Leandro", "Junior", "Oscar", "Luizinho", "Cerezo", "Falcao", "Socrates", "Zico", "Serginho", "Eder"]
    },
    {
        "match_id": "wc-qf-1998-france-italy",
        "date": "1998-07-03",
        "competition": "FIFA World Cup Quarter-Final",
        "season": "1998",
        "opponent_a": "France",
        "opponent_b": "Italy",
        "score": "0-0 (4-3 pen)",
        "lineup_a": ["Barthez", "Thuram", "Blanc", "Desailly", "Lizarazu", "Karembeu", "Deschamps", "Petit", "Zidane", "Djorkaeff", "Guivarch"],
        "lineup_b": ["Pagliuca", "Bergomi", "Cannavaro", "Costacurta", "Maldini", "Di Biagio", "Albertini", "D. Baggio", "Di Livio", "Del Piero", "R. Baggio"]
    },
    {
        "match_id": "wc-sf-2002-brazil-turkey",
        "date": "2002-06-26",
        "competition": "FIFA World Cup Semi-Final",
        "season": "2002",
        "opponent_a": "Brazil",
        "opponent_b": "Turkey",
        "score": "1-0",
        "lineup_a": ["Marcos", "Cafu", "Lucio", "Roque Junior", "Roberto Carlos", "Gilberto Silva", "Kleberson", "Ronaldinho", "Rivaldo", "Ronaldo", "Juninho"],
        "lineup_b": ["Rustu", "Fatih", "Alpay", "Bulent", "Ergun", "Tugay", "Emre", "Basturk", "Sukur", "Hasan Sas", "Ilhan"]
    },
    {
        "match_id": "wc-r16-2006-argentina-mexico",
        "date": "2006-06-24",
        "competition": "FIFA World Cup Round of 16",
        "season": "2006",
        "opponent_a": "Argentina",
        "opponent_b": "Mexico",
        "score": "2-1",
        "lineup_a": ["Abbondanzieri", "Burdisso", "Ayala", "Heinze", "Sorin", "Mascherano", "Cambiasso", "Riquelme", "Rodriguez", "Saviola", "Crespo"],
        "lineup_b": ["Sanchez", "Salcido", "Marquez", "Osorio", "Mendez", "Torrado", "Pardo", "Pineda", "Zinha", "Bravo", "Borgetti"]
    },
    {
        "match_id": "wc-qf-2006-germany-argentina",
        "date": "2006-06-30",
        "competition": "FIFA World Cup Quarter-Final",
        "season": "2006",
        "opponent_a": "Germany",
        "opponent_b": "Argentina",
        "score": "1-1 (4-2 pen)",
        "lineup_a": ["Lehmann", "Friedrich", "Mertesacker", "Metzelder", "Lahm", "Frings", "Kehl", "Schneider", "Schweinsteiger", "Klose", "Podolski"],
        "lineup_b": ["Abbondanzieri", "Burdisso", "Ayala", "Heinze", "Sorin", "Mascherano", "Cambiasso", "Riquelme", "Rodriguez", "Saviola", "Crespo"]
    },
    # === EURO CLASSICS ===
    {
        "match_id": "euro-final-1988",
        "date": "1988-06-25",
        "competition": "UEFA Euro Final",
        "season": "1988",
        "opponent_a": "Netherlands",
        "opponent_b": "Soviet Union",
        "score": "2-0",
        "lineup_a": ["Van Breukelen", "Van Aerle", "R. Koeman", "Rijkaard", "Van Tiggelen", "Vanenburg", "Wouters", "E. Koeman", "Muhren", "Gullit", "Van Basten"],
        "lineup_b": ["Dasayev", "Bessonov", "Khidiyatullin", "Demianenko", "Rats", "Litovchenko", "Aleinikov", "Mikhailichenko", "Zavarov", "Protasov", "Belanov"]
    },
    {
        "match_id": "euro-final-1996",
        "date": "1996-06-30",
        "competition": "UEFA Euro Final",
        "season": "1996",
        "opponent_a": "Germany",
        "opponent_b": "Czech Republic",
        "score": "2-1",
        "lineup_a": ["Kopke", "Sammer", "Babbel", "Helmer", "Ziege", "Scholl", "Eilts", "Hassler", "Strunz", "Kuntz", "Bierhoff"],
        "lineup_b": ["Kouba", "Hornak", "Kadlec", "Suchoparek", "Rada", "Nedved", "Bejbl", "Poborsky", "Nemec", "Berger", "Kuka"]
    },
    {
        "match_id": "euro-sf-2000-france-portugal",
        "date": "2000-06-28",
        "competition": "UEFA Euro Semi-Final",
        "season": "2000",
        "opponent_a": "France",
        "opponent_b": "Portugal",
        "score": "2-1",
        "lineup_a": ["Barthez", "Thuram", "Blanc", "Desailly", "Lizarazu", "Vieira", "Deschamps", "Djorkaeff", "Zidane", "Henry", "Anelka"],
        "lineup_b": ["Vitor Baia", "Xavier", "Jorge Costa", "Fernando Couto", "Dimas", "Figo", "Costinha", "Rui Costa", "Conceicao", "Nuno Gomes", "Joao Pinto"]
    },
    {
        "match_id": "euro-sf-2008-germany-turkey",
        "date": "2008-06-25",
        "competition": "UEFA Euro Semi-Final",
        "season": "2008",
        "opponent_a": "Germany",
        "opponent_b": "Turkey",
        "score": "3-2",
        "lineup_a": ["Lehmann", "Friedrich", "Mertesacker", "Metzelder", "Lahm", "Frings", "Hitzlsperger", "Schweinsteiger", "Podolski", "Ballack", "Klose"],
        "lineup_b": ["Rustu", "Sabri", "Gokhan", "Emre Asik", "Hakan Balta", "Mehmet Aurelio", "Hamit Altintop", "Tuncay", "Kazim", "Nihat", "Semih"]
    },
    {
        "match_id": "euro-final-2008",
        "date": "2008-06-29",
        "competition": "UEFA Euro Final",
        "season": "2008",
        "opponent_a": "Spain",
        "opponent_b": "Germany",
        "score": "1-0",
        "lineup_a": ["Casillas", "Sergio Ramos", "Puyol", "Marchena", "Capdevila", "Senna", "Xavi", "Iniesta", "Silva", "Fabregas", "Torres"],
        "lineup_b": ["Lehmann", "Friedrich", "Mertesacker", "Metzelder", "Lahm", "Frings", "Hitzlsperger", "Schweinsteiger", "Podolski", "Ballack", "Klose"]
    },
    # === UCL CLASSICS ===
    {
        "match_id": "ucl-final-1992",
        "date": "1992-05-20",
        "competition": "UEFA Champions League Final",
        "season": "1991-92",
        "opponent_a": "Barcelona",
        "opponent_b": "Sampdoria",
        "score": "1-0",
        "lineup_a": ["Zubizarreta", "Ferrer", "Koeman", "Nando", "Juan Carlos", "Bakero", "Guardiola", "Eusebio", "Laudrup", "Stoichkov", "Salinas"],
        "lineup_b": ["Pagliuca", "Mannini", "Vierchowod", "Pellegrini", "Pari", "Katanec", "Cerezo", "Lanna", "Lombardo", "Vialli", "Mancini"]
    },
    {
        "match_id": "ucl-final-1993",
        "date": "1993-05-26",
        "competition": "UEFA Champions League Final",
        "season": "1992-93",
        "opponent_a": "Marseille",
        "opponent_b": "AC Milan",
        "score": "1-0",
        "lineup_a": ["Barthez", "Angloma", "Desailly", "Boli", "Di Meco", "Eydelie", "Deschamps", "Sauzee", "Voller", "Boksic", "Pelé (Abedi)"],
        "lineup_b": ["Rossi", "Tassotti", "Costacurta", "Baresi", "Maldini", "Donadoni", "Rijkaard", "Albertini", "Lentini", "Van Basten", "Massaro"]
    },
    {
        "match_id": "ucl-final-1995",
        "date": "1995-05-24",
        "competition": "UEFA Champions League Final",
        "season": "1994-95",
        "opponent_a": "Ajax",
        "opponent_b": "AC Milan",
        "score": "1-0",
        "lineup_a": ["Van der Sar", "Reiziger", "Blind", "Frank de Boer", "Rijkaard", "Seedorf", "Davids", "Litmanen", "Overmars", "Kluivert", "Ronald de Boer"],
        "lineup_b": ["Rossi", "Panucci", "Costacurta", "Baresi", "Maldini", "Donadoni", "Desailly", "Albertini", "Savicevic", "Boban", "Massaro"]
    },
    {
        "match_id": "ucl-final-1996",
        "date": "1996-05-22",
        "competition": "UEFA Champions League Final",
        "season": "1995-96",
        "opponent_a": "Juventus",
        "opponent_b": "Ajax",
        "score": "1-1 (4-2 pen)",
        "lineup_a": ["Peruzzi", "Ferrara", "Vierchowod", "Torricelli", "Pessotto", "Di Livio", "Deschamps", "Sousa", "Jugovic", "Vialli", "Ravanelli"],
        "lineup_b": ["Van der Sar", "Reiziger", "Blind", "Frank de Boer", "Rijkaard", "Seedorf", "Davids", "Litmanen", "Overmars", "Kluivert", "Musampa"]
    },
    {
        "match_id": "ucl-final-1997",
        "date": "1997-05-28",
        "competition": "UEFA Champions League Final",
        "season": "1996-97",
        "opponent_a": "Borussia Dortmund",
        "opponent_b": "Juventus",
        "score": "3-1",
        "lineup_a": ["Klos", "Reuter", "Kohler", "Sammer", "Heinrich", "Lambert", "Paulo Sousa", "Moller", "Chapuisat", "Riedle", "Ricken"],
        "lineup_b": ["Peruzzi", "Ferrara", "Montero", "Torricelli", "Pessotto", "Di Livio", "Deschamps", "Zidane", "Jugovic", "Boksic", "Del Piero"]
    },
    {
        "match_id": "ucl-final-1998",
        "date": "1998-05-20",
        "competition": "UEFA Champions League Final",
        "season": "1997-98",
        "opponent_a": "Real Madrid",
        "opponent_b": "Juventus",
        "score": "1-0",
        "lineup_a": ["Illgner", "Panucci", "Hierro", "Sanchis", "Roberto Carlos", "Seedorf", "Redondo", "Karembeu", "Raul", "Morientes", "Mijatovic"],
        "lineup_b": ["Peruzzi", "Birindelli", "Montero", "Iuliano", "Pessotto", "Di Livio", "Deschamps", "Davids", "Zidane", "Inzaghi", "Del Piero"]
    },
    {
        "match_id": "ucl-final-2001",
        "date": "2001-05-23",
        "competition": "UEFA Champions League Final",
        "season": "2000-01",
        "opponent_a": "Bayern Munich",
        "opponent_b": "Valencia",
        "score": "1-1 (5-4 pen)",
        "lineup_a": ["Kahn", "Kuffour", "Linke", "Andersson", "Lizarazu", "Salihamidzic", "Effenberg", "Hargreaves", "Scholl", "Elber", "Zickler"],
        "lineup_b": ["Canizares", "Angloma", "Ayala", "Djukic", "Carboni", "Baraja", "Mendieta", "Gerard", "Kily Gonzalez", "Sanchez", "Carew"]
    },
    # === PREMIER LEAGUE CLASSICS ===
    {
        "match_id": "epl-arsenal-manu-49-2004",
        "date": "2004-10-24",
        "competition": "Premier League",
        "season": "2004-05",
        "opponent_a": "Manchester United",
        "opponent_b": "Arsenal",
        "score": "2-0",
        "lineup_a": ["Carroll", "Gary Neville", "Ferdinand", "Silvestre", "Heinze", "Ronaldo", "Scholes", "Keane", "Giggs", "Rooney", "Van Nistelrooy"],
        "lineup_b": ["Lehmann", "Lauren", "Toure", "Campbell", "Cole", "Ljungberg", "Vieira", "Edu", "Reyes", "Bergkamp", "Henry"]
    },
    {
        "match_id": "epl-liverpool-newcastle-1996",
        "date": "1996-04-03",
        "competition": "Premier League",
        "season": "1995-96",
        "opponent_a": "Liverpool",
        "opponent_b": "Newcastle United",
        "score": "4-3",
        "lineup_a": ["James", "McAteer", "Scales", "Ruddock", "Jones", "Barnes", "Redknapp", "McManaman", "Thomas", "Collymore", "Fowler"],
        "lineup_b": ["Srnicek", "Barton", "Peacock", "Albert", "Beresford", "Lee", "Batty", "Beardsley", "Ginola", "Ferdinand", "Asprilla"]
    },
    {
        "match_id": "epl-manu-tottenham-5-3-2001",
        "date": "2001-09-29",
        "competition": "Premier League",
        "season": "2001-02",
        "opponent_a": "Tottenham Hotspur",
        "opponent_b": "Manchester United",
        "score": "3-5",
        "lineup_a": ["Sullivan", "Carr", "King", "Richards", "Perry", "Davies", "Freund", "Anderton", "Poyet", "Ziege", "Ferdinand"],
        "lineup_b": ["Barthez", "Gary Neville", "Blanc", "Ferdinand", "Irwin", "Beckham", "Keane", "Veron", "Giggs", "Van Nistelrooy", "Cole"]
    },
    {
        "match_id": "epl-portsmouth-manu-2008",
        "date": "2008-03-08",
        "competition": "FA Cup Quarter-Final",
        "season": "2007-08",
        "opponent_a": "Portsmouth",
        "opponent_b": "Manchester United",
        "score": "1-0",
        "lineup_a": ["James", "Johnson", "Campbell", "Distin", "Hreidarsson", "Utaka", "Diarra", "Muntari", "Kranjcar", "Kanu", "Baros"],
        "lineup_b": ["Kuszczak", "Brown", "Ferdinand", "Vidic", "Evra", "Ronaldo", "Carrick", "Scholes", "Park", "Rooney", "Tevez"]
    },
    {
        "match_id": "epl-chelsea-liverpool-2005",
        "date": "2005-02-06",
        "competition": "League Cup Final",
        "season": "2004-05",
        "opponent_a": "Chelsea",
        "opponent_b": "Liverpool",
        "score": "3-2",
        "lineup_a": ["Cech", "Ferreira", "Terry", "Carvalho", "Gallas", "Lampard", "Makelele", "Tiago", "Duff", "Gudjohnsen", "Drogba"],
        "lineup_b": ["Dudek", "Finnan", "Hyypia", "Carragher", "Riise", "Luis Garcia", "Gerrard", "Hamann", "Kewell", "Baros", "Morientes"]
    },
    {
        "match_id": "epl-mancity-qpr-2012",
        "date": "2012-05-13",
        "competition": "Premier League",
        "season": "2011-12",
        "opponent_a": "Manchester City",
        "opponent_b": "QPR",
        "score": "3-2",
        "lineup_a": ["Hart", "Zabaleta", "Kompany", "Lescott", "Clichy", "Nasri", "Barry", "Yaya Toure", "Silva", "Tevez", "Aguero"],
        "lineup_b": ["Kenny", "Onuoha", "Ferdinand", "Hill", "Taiwo", "Barton", "Derry", "Wright-Phillips", "Mackie", "Cisse", "Zamora"]
    },
    # === LA LIGA / SERIE A / BUNDESLIGA ===
    {
        "match_id": "la-liga-clasico-2006",
        "date": "2006-04-01",
        "competition": "La Liga",
        "season": "2005-06",
        "opponent_a": "Real Madrid",
        "opponent_b": "Barcelona",
        "score": "0-2",
        "lineup_a": ["Casillas", "Salgado", "Sergio Ramos", "Helguera", "Roberto Carlos", "Beckham", "Guti", "Gravesen", "Zidane", "Raul", "Ronaldo"],
        "lineup_b": ["Valdes", "Oleguer", "Puyol", "Marquez", "Van Bronckhorst", "Xavi", "Deco", "Iniesta", "Messi", "Eto'o", "Ronaldinho"]
    },
    {
        "match_id": "la-liga-clasico-2015",
        "date": "2015-03-22",
        "competition": "La Liga",
        "season": "2014-15",
        "opponent_a": "Barcelona",
        "opponent_b": "Real Madrid",
        "score": "2-1",
        "lineup_a": ["Ter Stegen", "Dani Alves", "Pique", "Mascherano", "Jordi Alba", "Rakitic", "Busquets", "Iniesta", "Messi", "Suarez", "Neymar"],
        "lineup_b": ["Casillas", "Carvajal", "Pepe", "Sergio Ramos", "Marcelo", "Kroos", "Modric", "Isco", "Bale", "Benzema", "Ronaldo"]
    },
    {
        "match_id": "serie-a-milan-derby-2023-ucl",
        "date": "2023-04-19",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2022-23",
        "opponent_a": "AC Milan",
        "opponent_b": "Inter Milan",
        "score": "0-2",
        "lineup_a": ["Maignan", "Calabria", "Tomori", "Kjaer", "Theo Hernandez", "Tonali", "Bennacer", "Saelemaekers", "Brahim Diaz", "Leao", "Giroud"],
        "lineup_b": ["Onana", "Dumfries", "Skriniar", "Acerbi", "Bastoni", "Darmian", "Barella", "Brozovic", "Calhanoglu", "Mkhitaryan", "Lautaro Martinez"]
    },
    {
        "match_id": "bundesliga-bayern-dortmund-2013-ucl",
        "date": "2013-05-25",
        "competition": "UEFA Champions League Final",
        "season": "2012-13",
        "opponent_a": "Bayern Munich",
        "opponent_b": "Borussia Dortmund",
        "score": "2-1",
        "lineup_a": ["Neuer", "Lahm", "Boateng", "Dante", "Alaba", "Muller", "Schweinsteiger", "Martinez", "Robben", "Mandzukic", "Ribery"],
        "lineup_b": ["Weidenfeller", "Piszczek", "Subotic", "Hummels", "Schmelzer", "Blaszczykowski", "Gundogan", "Bender", "Grosskreutz", "Reus", "Lewandowski"]
    },
    {
        "match_id": "serie-a-juve-napoli-2018",
        "date": "2018-04-22",
        "competition": "Serie A",
        "season": "2017-18",
        "opponent_a": "Juventus",
        "opponent_b": "Napoli",
        "score": "0-1",
        "lineup_a": ["Buffon", "De Sciglio", "Benatia", "Chiellini", "Alex Sandro", "Khedira", "Pjanic", "Matuidi", "Douglas Costa", "Dybala", "Higuain"],
        "lineup_b": ["Reina", "Hysaj", "Albiol", "Koulibaly", "Mario Rui", "Allan", "Jorginho", "Hamsik", "Callejon", "Mertens", "Insigne"]
    },
    # === AFRICAN / ASIAN / SOUTH AMERICAN ===
    {
        "match_id": "afcon-final-2023",
        "date": "2024-02-11",
        "competition": "Africa Cup of Nations Final",
        "season": "2023",
        "opponent_a": "Ivory Coast",
        "opponent_b": "Nigeria",
        "score": "2-1",
        "lineup_a": ["Sangare", "Aurier", "Deli", "Badiashile", "Boly", "Kessie", "Seri", "Pepe", "Gradel", "Haller", "Boly"],
        "lineup_b": ["Nwabali", "Ola Aina", "Troost-Ekong", "Ajayi", "Bassey", "Ndidi", "Iwobi", "Lookman", "Chukwueze", "Osimhen", "Simon"]
    },
    {
        "match_id": "afcon-final-2019",
        "date": "2019-07-19",
        "competition": "Africa Cup of Nations Final",
        "season": "2019",
        "opponent_a": "Algeria",
        "opponent_b": "Senegal",
        "score": "1-0",
        "lineup_a": ["M'Bolhi", "Atal", "Mandi", "Benlamri", "Bensebaini", "Guedioura", "Bennacer", "Feghouli", "Mahrez", "Bounedjah", "Belaili"],
        "lineup_b": ["Gomis", "Gassama", "Koulibaly", "Sane", "Sabaly", "Gueye", "N. Mendy", "Sarr", "Mane", "Niang", "Keita Balde"]
    },
    {
        "match_id": "asian-cup-final-2011",
        "date": "2011-01-29",
        "competition": "AFC Asian Cup Final",
        "season": "2011",
        "opponent_a": "Japan",
        "opponent_b": "Australia",
        "score": "1-0",
        "lineup_a": ["Kawashima", "Uchida", "Konno", "Yoshida", "Nagatomo", "Endo", "Hasebe", "Honda", "Okazaki", "Kagawa", "Maeda"],
        "lineup_b": ["Schwarzer", "Wilkshire", "Neill", "Ognenovski", "Carney", "Valeri", "McKay", "Emerton", "Holman", "Kewell", "Cahill"]
    },
    {
        "match_id": "asian-cup-final-2015",
        "date": "2015-01-31",
        "competition": "AFC Asian Cup Final",
        "season": "2015",
        "opponent_a": "Australia",
        "opponent_b": "South Korea",
        "score": "2-1",
        "lineup_a": ["Ryan", "Franjic", "Spiranovic", "Sainsbury", "Davidson", "Jedinak", "Luongo", "Leckie", "Troisi", "Cahill", "Kruse"],
        "lineup_b": ["Kim Jin-hyeon", "Cha Du-ri", "Kim Young-gwon", "Kwak Tae-hwi", "Kim Chang-soo", "Ki Sung-yueng", "Han Kook-young", "Lee Chung-yong", "Son Heung-min", "Lee Jeong-hyeop", "Nam Tae-hee"]
    },
    {
        "match_id": "copa-libertadores-final-2018",
        "date": "2018-12-09",
        "competition": "Copa Libertadores Final",
        "season": "2018",
        "opponent_a": "River Plate",
        "opponent_b": "Boca Juniors",
        "score": "3-1",
        "lineup_a": ["Armani", "Montiel", "Martinez Quarta", "Pinola", "Casco", "Enzo Perez", "Ponzio", "Palacios", "Nacho Fernandez", "Pratto", "Borre"],
        "lineup_b": ["Rossi", "Buffarini", "Izquierdoz", "Magallan", "Mas", "Nandez", "Barrios", "Perez", "Pavon", "Benedetto", "Villa"]
    },
    {
        "match_id": "copa-america-final-2019",
        "date": "2019-07-07",
        "competition": "Copa America Final",
        "season": "2019",
        "opponent_a": "Brazil",
        "opponent_b": "Peru",
        "score": "3-1",
        "lineup_a": ["Alisson", "Dani Alves", "Thiago Silva", "Marquinhos", "Alex Sandro", "Casemiro", "Arthur", "Coutinho", "Everton", "Firmino", "Gabriel Jesus"],
        "lineup_b": ["Gallese", "Advincula", "Zambrano", "Abram", "Trauco", "Tapia", "Yotun", "Cueva", "Carrillo", "Guerrero", "Flores"]
    },
    # === MORE UCL KNOCKOUTS ===
    {
        "match_id": "ucl-sf-2007-manu-milan",
        "date": "2007-05-02",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2006-07",
        "opponent_a": "AC Milan",
        "opponent_b": "Manchester United",
        "score": "3-0",
        "lineup_a": ["Dida", "Oddo", "Nesta", "Maldini", "Jankulovski", "Gattuso", "Pirlo", "Ambrosini", "Seedorf", "Kaka", "Inzaghi"],
        "lineup_b": ["Van der Sar", "Brown", "Ferdinand", "Vidic", "Heinze", "Ronaldo", "Fletcher", "Scholes", "Giggs", "Rooney", "Richardson"]
    },
    {
        "match_id": "ucl-sf-2006-barca-milan",
        "date": "2006-04-18",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2005-06",
        "opponent_a": "Barcelona",
        "opponent_b": "AC Milan",
        "score": "0-0",
        "lineup_a": ["Valdes", "Oleguer", "Puyol", "Marquez", "Van Bronckhorst", "Xavi", "Deco", "Edmilson", "Iniesta", "Eto'o", "Ronaldinho"],
        "lineup_b": ["Dida", "Cafu", "Nesta", "Stam", "Maldini", "Gattuso", "Pirlo", "Seedorf", "Kaka", "Shevchenko", "Gilardino"]
    },
    {
        "match_id": "ucl-qf-2009-barca-bayern",
        "date": "2009-04-08",
        "competition": "UEFA Champions League Quarter-Final",
        "season": "2008-09",
        "opponent_a": "Barcelona",
        "opponent_b": "Bayern Munich",
        "score": "4-0",
        "lineup_a": ["Valdes", "Alves", "Pique", "Puyol", "Abidal", "Xavi", "Busquets", "Toure Yaya", "Messi", "Eto'o", "Henry"],
        "lineup_b": ["Butt", "Lahm", "Demichelis", "Lucio", "Lell", "Schweinsteiger", "Van Bommel", "Ribery", "Muller", "Klose", "Podolski"]
    },
    {
        "match_id": "ucl-sf-2015-barca-bayern",
        "date": "2015-05-06",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2014-15",
        "opponent_a": "Barcelona",
        "opponent_b": "Bayern Munich",
        "score": "3-0",
        "lineup_a": ["Ter Stegen", "Dani Alves", "Pique", "Mascherano", "Jordi Alba", "Rakitic", "Busquets", "Iniesta", "Messi", "Suarez", "Neymar"],
        "lineup_b": ["Neuer", "Rafinha", "Boateng", "Benatia", "Bernat", "Muller", "Lahm", "Schweinsteiger", "Thiago", "Robben", "Lewandowski"]
    },
    {
        "match_id": "ucl-qf-2019-ajax-juve",
        "date": "2019-04-16",
        "competition": "UEFA Champions League Quarter-Final",
        "season": "2018-19",
        "opponent_a": "Ajax",
        "opponent_b": "Juventus",
        "score": "1-1",
        "lineup_a": ["Onana", "Mazraoui", "De Ligt", "Blind", "Tagliafico", "Schone", "De Jong", "Van de Beek", "Ziyech", "Tadic", "Neres"],
        "lineup_b": ["Szczesny", "Cancelo", "Bonucci", "Rugani", "Alex Sandro", "Emre Can", "Pjanic", "Matuidi", "Bernardeschi", "Ronaldo", "Mandzukic"]
    },
    {
        "match_id": "ucl-r16-2021-psg-barca",
        "date": "2021-03-10",
        "competition": "UEFA Champions League Round of 16",
        "season": "2020-21",
        "opponent_a": "Paris Saint-Germain",
        "opponent_b": "Barcelona",
        "score": "1-1",
        "lineup_a": ["Navas", "Florenzi", "Marquinhos", "Kimpembe", "Kurzawa", "Paredes", "Gueye", "Verratti", "Di Maria", "Mbappe", "Icardi"],
        "lineup_b": ["Ter Stegen", "Dest", "Pique", "Lenglet", "Jordi Alba", "De Jong", "Busquets", "Pedri", "Dembele", "Messi", "Griezmann"]
    },
    {
        "match_id": "ucl-qf-2022-real-chelsea",
        "date": "2022-04-12",
        "competition": "UEFA Champions League Quarter-Final",
        "season": "2021-22",
        "opponent_a": "Real Madrid",
        "opponent_b": "Chelsea",
        "score": "2-3",
        "lineup_a": ["Courtois", "Carvajal", "Militao", "Alaba", "Mendy", "Modric", "Casemiro", "Kroos", "Valverde", "Benzema", "Vinicius Jr"],
        "lineup_b": ["Mendy", "James", "Thiago Silva", "Rudiger", "Alonso", "Kante", "Kovacic", "Mount", "Pulisic", "Havertz", "Werner"]
    },
    {
        "match_id": "ucl-sf-2024-real-bayern",
        "date": "2024-05-08",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2023-24",
        "opponent_a": "Real Madrid",
        "opponent_b": "Bayern Munich",
        "score": "2-1",
        "lineup_a": ["Lunin", "Carvajal", "Nacho", "Rudiger", "Mendy", "Valverde", "Camavinga", "Kroos", "Rodrygo", "Vinicius Jr", "Joselu"],
        "lineup_b": ["Neuer", "Kimmich", "Upamecano", "Kim Min-jae", "Davies", "Goretzka", "Laimer", "Musiala", "Sane", "Kane", "Gnabry"]
    },
    {
        "match_id": "ucl-sf-2024-psg-dortmund",
        "date": "2024-05-07",
        "competition": "UEFA Champions League Semi-Final",
        "season": "2023-24",
        "opponent_a": "Paris Saint-Germain",
        "opponent_b": "Borussia Dortmund",
        "score": "0-1",
        "lineup_a": ["Donnarumma", "Hakimi", "Marquinhos", "Skriniar", "Lucas Hernandez", "Fabian Ruiz", "Vitinha", "Zaaire-Emery", "Dembele", "Mbappe", "Barcola"],
        "lineup_b": ["Kobel", "Ryerson", "Hummels", "Schlotterbeck", "Maatsen", "Can", "Sabitzer", "Sancho", "Brandt", "Fullkrug", "Adeyemi"]
    },
    # === MORE INTERNATIONAL MATCHES ===
    {
        "match_id": "wc-qf-2010-netherlands-brazil",
        "date": "2010-07-02",
        "competition": "FIFA World Cup Quarter-Final",
        "season": "2010",
        "opponent_a": "Netherlands",
        "opponent_b": "Brazil",
        "score": "2-1",
        "lineup_a": ["Stekelenburg", "Van der Wiel", "Heitinga", "Mathijsen", "Van Bronckhorst", "Van Bommel", "De Jong", "Kuyt", "Sneijder", "Robben", "Elia"],
        "lineup_b": ["Julio Cesar", "Maicon", "Juan", "Lucio", "Bastos", "Gilberto Silva", "Felipe Melo", "Ramires", "Robinho", "Luis Fabiano", "Kaka"]
    },
    {
        "match_id": "wc-sf-2014-netherlands-argentina",
        "date": "2014-07-09",
        "competition": "FIFA World Cup Semi-Final",
        "season": "2014",
        "opponent_a": "Netherlands",
        "opponent_b": "Argentina",
        "score": "0-0 (2-4 pen)",
        "lineup_a": ["Cillessen", "Vlaar", "De Vrij", "Martins Indi", "Blind", "Kuyt", "De Jong", "Wijnaldum", "Sneijder", "Robben", "Van Persie"],
        "lineup_b": ["Romero", "Zabaleta", "Demichelis", "Garay", "Rojo", "Biglia", "Mascherano", "Perez", "Di Maria", "Higuain", "Messi"]
    },
    {
        "match_id": "wc-group-2018-spain-portugal",
        "date": "2018-06-15",
        "competition": "FIFA World Cup Group Stage",
        "season": "2018",
        "opponent_a": "Portugal",
        "opponent_b": "Spain",
        "score": "3-3",
        "lineup_a": ["Rui Patricio", "Cedric", "Pepe", "Jose Fonte", "Guerreiro", "Bernardo Silva", "William Carvalho", "Bruno Fernandes", "Guedes", "Ronaldo", "Goncalo Guedes"],
        "lineup_b": ["De Gea", "Nacho", "Pique", "Sergio Ramos", "Jordi Alba", "Busquets", "Koke", "Iniesta", "Silva", "Diego Costa", "Isco"]
    },
    {
        "match_id": "wc-r16-2018-belgium-japan",
        "date": "2018-07-02",
        "competition": "FIFA World Cup Round of 16",
        "season": "2018",
        "opponent_a": "Belgium",
        "opponent_b": "Japan",
        "score": "3-2",
        "lineup_a": ["Courtois", "Alderweireld", "Kompany", "Vertonghen", "Meunier", "Witsel", "Fellaini", "Chadli", "De Bruyne", "Lukaku", "Hazard"],
        "lineup_b": ["Kawashima", "Sakai", "Yoshida", "Shoji", "Nagatomo", "Hasebe", "Shibasaki", "Haraguchi", "Kagawa", "Inui", "Osako"]
    },
    {
        "match_id": "wc-sf-1990-italy-argentina",
        "date": "1990-07-03",
        "competition": "FIFA World Cup Semi-Final",
        "season": "1990",
        "opponent_a": "Italy",
        "opponent_b": "Argentina",
        "score": "1-1 (3-4 pen)",
        "lineup_a": ["Zenga", "Bergomi", "Baresi", "Ferri", "Maldini", "De Napoli", "Donadoni", "Giannini", "Berti", "Schillaci", "Baggio"],
        "lineup_b": ["Goycochea", "Simon", "Ruggeri", "Serrizuela", "Olarticoechea", "Burruchaga", "Batista", "Lorenzo", "Maradona", "Caniggia", "Dezotti"]
    },
    {
        "match_id": "wc-qf-2002-england-brazil",
        "date": "2002-06-21",
        "competition": "FIFA World Cup Quarter-Final",
        "season": "2002",
        "opponent_a": "England",
        "opponent_b": "Brazil",
        "score": "1-2",
        "lineup_a": ["Seaman", "Mills", "Ferdinand", "Campbell", "Ashley Cole", "Beckham", "Scholes", "Butt", "Sinclair", "Heskey", "Owen"],
        "lineup_b": ["Marcos", "Cafu", "Lucio", "Roque Junior", "Roberto Carlos", "Gilberto Silva", "Kleberson", "Ronaldinho", "Rivaldo", "Ronaldo", "Edmilson"]
    },
    {
        "match_id": "wc-3rd-place-2022",
        "date": "2022-12-17",
        "competition": "FIFA World Cup Third Place",
        "season": "2022",
        "opponent_a": "Croatia",
        "opponent_b": "Morocco",
        "score": "2-1",
        "lineup_a": ["Livakovic", "Juranovic", "Lovren", "Gvardiol", "Sosa", "Modric", "Brozovic", "Kovacic", "Pasalic", "Kramaric", "Perisic"],
        "lineup_b": ["Bounou", "Hakimi", "Saiss", "El Yamiq", "Attiat-Allah", "Amrabat", "Ounahi", "Amallah", "Ziyech", "En-Nesyri", "Boufal"]
    },
    {
        "match_id": "nations-league-2023-spain-croatia",
        "date": "2023-06-18",
        "competition": "UEFA Nations League Final",
        "season": "2022-23",
        "opponent_a": "Croatia",
        "opponent_b": "Spain",
        "score": "0-0 (4-5 pen)",
        "lineup_a": ["Livakovic", "Stanisic", "Sutalo", "Gvardiol", "Sosa", "Modric", "Brozovic", "Kovacic", "Majer", "Kramaric", "Perisic"],
        "lineup_b": ["Unai Simon", "Carvajal", "Le Normand", "Nacho", "Balde", "Pedri", "Rodri", "Gavi", "Ferran Torres", "Morata", "Olmo"]
    },
    # === COPA AMERICA EXTRAS ===
    {
        "match_id": "copa-america-sf-2021-argentina-colombia",
        "date": "2021-07-06",
        "competition": "Copa America Semi-Final",
        "season": "2021",
        "opponent_a": "Argentina",
        "opponent_b": "Colombia",
        "score": "1-1 (3-2 pen)",
        "lineup_a": ["E. Martinez", "Montiel", "Pezzella", "Otamendi", "Acuna", "De Paul", "Paredes", "Lo Celso", "Messi", "Lautaro Martinez", "Di Maria"],
        "lineup_b": ["Ospina", "Munoz", "Mina", "Sanchez", "Tesillo", "Barrios", "Cuadrado", "Cardona", "Diaz", "Zapata", "Borja"]
    },
    {
        "match_id": "copa-america-sf-2024-argentina-canada",
        "date": "2024-07-09",
        "competition": "Copa America Semi-Final",
        "season": "2024",
        "opponent_a": "Argentina",
        "opponent_b": "Canada",
        "score": "2-0",
        "lineup_a": ["E. Martinez", "Molina", "C. Romero", "Lisandro Martinez", "Tagliafico", "De Paul", "E. Fernandez", "Mac Allister", "Messi", "Julian Alvarez", "Di Maria"],
        "lineup_b": ["Crepeau", "Johnston", "Bombito", "Cornelius", "Davies", "Eustaquio", "Kone", "Buchanan", "David", "Larin", "Shaffelburg"]
    },
]

# Convert lineup_a/b to lineup_a_names/lineup_b_names and add placeholder IDs
for m in new_matches:
    m["lineup_a_names"] = m.pop("lineup_a")
    m["lineup_b_names"] = m.pop("lineup_b")
    m["lineup_a_ids"] = Z[:]
    m["lineup_b_ids"] = Z[:]

# Filter out any duplicates
new_matches = [m for m in new_matches if m["match_id"] not in existing_ids]

existing.extend(new_matches)
print(f"Added {len(new_matches)} new matches")
print(f"Total matches: {len(existing)}")

with open("/Users/jasur/workspace/football/data/matches_db.json", "w") as f:
    json.dump(existing, f, indent=2, ensure_ascii=False)
print("matches_db.json updated!")
