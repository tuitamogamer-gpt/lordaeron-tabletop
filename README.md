# Lordaeron · WoW Board Game v0.7

Desktop adaptacija osnovne igre iz 2005. i službenog FAQ-a 1.4. React interfejs, zaseban TypeScript engine, lokalni hotseat i AI igrači. **Online sobe su na čekanju.**

[Otvori igru](https://lordaeron-tabletop.vercel.app)

Najnoviji prolaz: **popravke i završni sloj dizajna**. Svih 43 ekrana je snimljeno i izmjereno na tri veličine (računar, veliki ekran, telefon), a poslije popravki i na tabletu u oba položaja. Popravljeno je 15 stvari, među njima pregled Encounter decka koji se na telefonu slijevao u nečitak tekst, imena koja je aukcija lomila usred riječi, nečitljiva pravila u detalju karte i dugme **Management** koje je stajalo i na stranicama gdje slučajan klik završava fazu. Sitni tekst od 8 do 9,5 px je podignut na 10,5 px (nekoliko oznaka na tijesnim mjestima na 10 px). Na ekranu na dodir dugmad su dovoljno velika za prst, a natpisi govore „Tap” umjesto „Hover”. Glavno dugme je svuda zlatno, kao što je već bilo u borbi, reljefni rubovi su zamijenjeni tankom linijom, prozori i stranice stižu uz kratak pokret, opis iznad kontrole je u izgledu igre, a prije učitavanja se vidi grb umjesto praznog ekrana. Detalji: [PREMIUM-FINISH-2026-11-14.md](docs/PREMIUM-FINISH-2026-11-14.md).

Prethodni prolaz: **botovi igraju sami**. Do sada nisu radili ništa dok se ne nađe „Run AI”, a bez toga je svaki njihov korak tražio klik: „Bot move” za svaku nagradu i izbor, „Finish combat & continue” poslije njihove borbe, „Return to the map” za svaki novi quest. Sada igraju od početka kampanje i izbor se pamti. U potezu svoje frakcije **igračevi likovi igraju prvi**, a saveznici kreću kad on završi (dugme **Allies first** ih pušta ranije); dok je prozor odluke otvoren za igračev izbor (nagrada koju može uzeti i njegov lik, njegov talent), botovi čekaju. **Ono što bot uzme vidi se kao karta** na sredini stola: nagrada za quest sa odštampanim licem predmeta i onim što je još bilo ponuđeno, talent, trening, kupovina, aukcija. Rezultat borbe botova stoji tri sekunde prije nego što se zatvori. Novi tempo **Step by step** je za onoga ko želi da svaka najava čeka njegov klik. Detalji: [BOT-TURNS-2026-11-12.md](docs/BOT-TURNS-2026-11-12.md).

Prethodni prolaz dodaje glasove i zvuk borbe. Glasovnih linija je 79 umjesto 16: prilike imaju po dvije ili tri rečenice koje se smjenjuju, karta događaja se najavi prema svojoj vrsti („War is declared!”, „A bounty is posted.”), Overlordi se javljaju kad se pomjere i kad dobiju borbu, a trgovac i trener imaju svoje glasove. **Borba se čuje korak po korak**: moć, žetoni na polju borbe, rika protivnika, blok, rana, udarac i pad protivnika, pa rog i riječ pobjede ili poraza. Let, odmor, grad, portal i promjena opreme imaju svoje kratke zvukove. Usput je nađeno da se **prvih 16 linija od 10. 11. nije čulo**: skripta za pripremu ih je utišavala poslije prve desetinke sekunde. To je ispravljeno, a skripta i novi test sada provjeravaju sadržaj svake datoteke. Sve linije su provjerene transkripcijom, a efekti mjerenjem; ništa nije preslušano, pa gluma novih glasova i boja efekata čekaju vlasnikovo uho. Fish Audio: 20.688 kredita, uz odobrenje vlasnika. Detalji: [SOUND-2026-11-12.md](docs/SOUND-2026-11-12.md).

Prethodni prolaz ima tri dijela. **Mapa** je upoređena s fotografijama originalne table: šest veza između polja koja na tabli razdvaja crni rub je uklonjeno, a tri koje su nedostajale su dodate (115 veza umjesto 118); staza poteza, staza iskustva, ključevi i polje borbe slažu se s tablom polje po polje. U pregledu tabla sada **leži na stolu** i gleda se malo sprijeda: dalji rub je kraći, tabla ima rub i sjenu, a figure stoje na njoj. Dugme **3D** vraća ravnu tablu, a mapa preko cijelog ekrana je uvijek ravna. **Gain i Regain** su provjereni na sve 34 karte prema skenovima: karte su se slagale s pravilnikom (Charge i ranije ide iznad kapaciteta), a ispravljeno je da lik koji iz borbe izađe Ice Blockom više ne zadržava višak; žetoni iznad kapaciteta su označeni. **Sto je sporiji**: karta događaja se okrene na sredini stola sa slikom i tekstom, potez bota se najavi dok polje svijetli i figura klizi do njega, uz kratke zvučne znakove, a tempo se bira u postavkama (**Pace of the table**: Relaxed, Normal, Brisk, Off). Ispravke mape i pravila važe od revizije pravila 4; započete kampanje zadržavaju mapu i pravila s kojima su igrane. Detalji: [MAP-AUDIT-2026-11-12.md](docs/MAP-AUDIT-2026-11-12.md), [GAIN-REGAIN-2026-11-12.md](docs/GAIN-REGAIN-2026-11-12.md), [TABLE-PACE-2026-11-12.md](docs/TABLE-PACE-2026-11-12.md).

Prethodni prolaz mijenja kako se u borbi igraju moći. Svaka moć koja se može odigrati ima svoj red s dugmetom **Use** i cijenom, pa je jedan klik odigra; **Take back** je vraća dok kockice nisu bačene. List u borbi kaže odakle energija („+1 from Charge this round”) i zašto koja karta čeka, a dugme za izbor napadača šta lik donosi („2 energy · Heroic Strike ready”). Ranije je prije izbora napadača pisalo „Needs 2 energy · 1 available”, kao da Charge ne radi; engine ga je primjenjivao ispravno. Na telefonu moći i glavna akcija stoje na dnu ekrana. Detalji: [COMBAT-PLAY-2026-11-12.md](docs/COMBAT-PLAY-2026-11-12.md).

Prethodni prolaz popravlja botove i saradnju s njima. U prozoru **Challenge** protivnik sada ima jednu karticu na kojoj se saborci iz iste regije pozivaju dugmadima, a bot koji stoji uz igračevog lika pita ga da se pridruži borbi, umjesto da se bori bez njega. Mjerenje cijelih AI kampanja pokazalo je da botovi gomilaju zlato, ignorišu ratove i na nivou 5 odlažu napad na Overlorda (u jednoj partiji 238 poteza). Sada troše zlato, idu u grad po opremu, drže regije ratova i na Overlorda kreću odmoreni čim je cijela frakcija na nivou 5: na osam partija kampanja traje prosječno 45 poteza frakcija umjesto 99. Detalji i granice: [AI-BOTS-2026-11-11.md](docs/AI-BOTS-2026-11-11.md).

Prethodni prolaz dodaje muziku: umjesto dvije teme igra ih ima sedam, četiri za mapu, dvije za borbu i jednu za borbu s Overlordom. Teme se smjenjuju, pa se ista na mapi vrati tek nakon šest do sedam minuta. Pri obradi je ispravljena i rupa od 51 ms tišine na svakom ponavljanju stare dvije teme. Pet novih tema napravljeno je s Fish Audio (39.750 kredita, uz odobrenje vlasnika). Detalji: [MUSIC-THEMES-2026-11-11.md](docs/MUSIC-THEMES-2026-11-11.md).

Prethodni prolaz dodaje savjetnika za potez i usklađuje ratove s pravilnikom. Dugme **Hint** (tipka **H**) na stolu pita planer koji vodi AI likove koju bi akciju odigrao odabrani lik i zašto; **Do this** je odigra. **Pass** troši preostale akcije lika, jer po pravilniku lik smije, a ne mora, odigrati dvije. Zdravlje i energija su žetoni kao na odštampanom listu lika. Muzika više ne vrti petlju od 13 sekundi bez prestanka, nego svira u frazama s pauzama. Ratovi se ocjenjuju na kraju poteza frakcije, nakon karte događaja (revizija pravila 3; započete kampanje zadržavaju svoja pravila), a osvojeni rat ima zapis u Chronicleu i obavijest na stolu. Detalji: [ADVISOR-TOKENS-WARS-2026-11-11.md](docs/ADVISOR-TOKENS-WARS-2026-11-11.md).

Prethodni prolaz je igranje kroz cijelu igru i provjera enginea prema zvaničnom pravilniku. Tri pravila su ispravljena: Kel’Thuzadov limit Attritiona broji svaku crvenu ili plavu kockicu sa 6+ i ne troši je, lik koji padne van poteza svoje frakcije ne gubi akcije sljedećeg poteza, a lik kojem događaj uzme zadnje zdravlje može još popiti napitak. Vrijede za nove kampanje; započete zadržavaju pravila s kojima su igrane, da se sačuvana partija i dalje učita. Žetoni na mapi sada stoje unutar granica svoje regije (ranije je oko 11 od 37 bilo izvan nje), putovanje vraća na sto, a Chronicle piše imena likova i regija umjesto internih oznaka. Detalji i šta je provjereno bez izmjene: [PLAYTHROUGH-2026-11-11.md](docs/PLAYTHROUGH-2026-11-11.md).

Prethodni prolaz mijenja izgled borbe da liči na originalnu igru. Polje borbe je sada „COMBAT AREA” s table: tri preklopljena kruga, **Damage**, **Defense** i **Attrition**, s pravim hit i armor žetonima u njima, oznakama boje kocki i tačnim brojem; na računaru stoji pored kocki. Prelazak mišem preko protivnika pokazuje njegove vrijednosti (prag, napad, zdravlje), boju figure i pravila, a za Overlorda i njegova pravila borbe. Sposobnosti su kompaktni redovi umjesto velikih karata; klik otvara opcije i dugme **Use**. Mehanika borbe nije mijenjana. Detalji: [COMBAT-TABLE-2026-11-10.md](docs/COMBAT-TABLE-2026-11-10.md).

Prethodni prolaz popravlja opremanje i dodaje zvuk. U prozoru **Character management** vidjela su se samo mjesta 1–4, pa su oružje (05 Melee), mjesto 06 i oklop (07 Armor) izgledali kao da ne postoje; sada je svih 7 mjesta u mreži 4 × 2 na svakoj veličini ekrana, a karta pod mišem prikazuje se dovoljno velika da se tekst čita. Oprema se mijenja kada svi likovi frakcije potroše obje akcije: **Manage equipment → Equip <lik> → mjesto → karta → Confirm equipment**. Klasne karte, predmeti i početne karte (386 lica) imaju isti odštampani crni rub umjesto tri različita izreza skenova. Muzika (mapa i borba), šest zvučnih efekata i 16 glasovnih linija napravljeni su s Fish Audio; zvučnik u zaglavlju ih isključuje, a **Settings › Sound** podešava glasnoću i glasove. Mjerenje AI-ja protiv Nefariana nije pokazalo brži razvoj heroja, pa AI nije mijenjan. Detalji: [EQUIPMENT-AND-SOUND-2026-11-10.md](docs/EQUIPMENT-AND-SOUND-2026-11-10.md).

Prethodni prolaz koristi korisnikove prave skenove: 544 odštampana lica karata (i početne karte i rasni paneli s listova likova), pravi brojači likova u popisima, na mapi i tragu iskustva, slikani portreti likova i Overlorda, okrugli portreti stvorenja, pravi žetoni (zdravlje, energija, zlato, hit, armor, Stun, Curse, znakovi frakcija), pravi pješčani sat, prave poleđine špilova, dugme **Printed sheet** s originalnim listom lika i referentni listovi na stranici Rules. Settings pokazuje koja je verzija pokrenuta i koliko je skenova u upotrebi. Objavljene su smanjene kopije u `public/assets/scans/` (originali od 1 GB ostaju lokalno), a bez njih igra koristi ilustrovana lica. Autorska prava i uklanjanje: [SCANS-2026-11-05.md](docs/SCANS-2026-11-05.md).

Prethodni prolaz približava tablu izgledu igre na stolu, prema pravilniku i fotografijama komponenti. Ispod mape je odštampani trag poteza s 30 polja, simbolima za Event karte i trgovca i pješčanim satom na trenutnom potezu. Uz lijevi rub portretni žetoni likova penju se po tragu iskustva prema nivou 5. Stvorenja stoje kao jednobojne zelene, crvene i plave plastične figure, a tabla ima prelome i okvir kao presavijena tabla. Detalji: [LIVE-TABLE-2026-10-30.md](docs/LIVE-TABLE-2026-10-30.md).

Prethodni prolaz uči AI da se utrkuje s Nefarianom: napad na njega vrijedi više kako se približava Bulwarku, a heroji se odmaraju prije prisilne završne borbe. Na istih 24 seeda broj pobjeda protiv Nefariana porastao je s 1 na 4, a Kel’Thuzad i Kazzak igraju se kao ranije. Na telefonu naslov u sceni borbe više se ne lomi riječ po riječ, a sažetak kampanje prolazi provjeru pristupačnosti bez prekršaja. Detalji: [AI-NEFARIAN-2026-10-30.md](docs/AI-NEFARIAN-2026-10-30.md).

Prethodni prolaz popravlja oporavak i sitne greške. Greška pri prikazu više ne ostavlja prazan ekran: prikazuju se ponovno učitavanje i preuzimanje autosavea. Tab otvoren tokom novog deploya sam se jednom ponovo učita i nastavi partiju. AI ima 90 umjesto 30 sekundi za najtežu odluku, pa sporiji telefoni ne zaustavljaju automatsko igranje. **Return to combat** više ne prekriva **Challenge** i **Run AI**, a **Undo** na telefonu više ne gura kontrole izvan ekrana. Dvanaest novih AI kampanja završilo je bez zastoja i s identičnim replayem. Detalji: [RELIABILITY-2026-10-29.md](docs/RELIABILITY-2026-10-29.md).

Prethodni prolaz dovršava igranje na telefonu: mapa se zumira s dva prsta, upute na mapi prate način unosa (dodir ili miš), a igra se može dodati na početni ekran kao aplikacija sa svojom ikonom i bez trake preglednika. Na telefonu više nema teksta manjeg od 9 px. Detalji: [DESIGN-PASS-2026-10-22.md](docs/DESIGN-PASS-2026-10-22.md#šesti-krug--24-10-2026).

Prethodni prolaz prilagođava igru tabletu i telefonu. Ispod 1.000 px širine mapa zauzima cijelu širinu, kolona stola ide ispod nje, a akcije ostaju prikačene na dnu ekrana. Stranice se više ne skrolaju vodoravno, a aukcija, New Horizons, borba i dnevnik questova slažu se u jednu kolonu. Desktop raspored je nepromijenjen. Detalji: [DESIGN-PASS-2026-10-22.md](docs/DESIGN-PASS-2026-10-22.md#peti-krug--24-10-2026).

Prethodni prolaz dodaje **Undo**: Travel, Rest, Train, Town, Trade i opremanje mogu se vratiti dugmetom pored End turn ili sa Ctrl+Z, sve dok potez nije bacio kockice ni otkrio kartu. Dijalog za izbor sljedećeg questa sada staje na laptop ekran. Detalji: [DESIGN-PASS-2026-10-22.md](docs/DESIGN-PASS-2026-10-22.md#četvrti-krug--23-10-2026).

Prethodni prolaz dodaje završni ekran kampanje: pobjednik, kako je partija završila (npr. „Lord Kazzak falls in Deep Elem Mine to Artumnis, Brandon and Burbon”), tačan broj odigranih poteza kroz sve krugove trake, završeni questovi po frakciji i heroji s nivoom i zlatom. Ranije je pisalo samo „10 turns” i kada je partija trajala 70 poteza. React i ostale biblioteke sada se učitavaju kao zasebni paketi koji ostaju u kešu preglednika između deployeva. Detalji: [DESIGN-PASS-2026-10-22.md](docs/DESIGN-PASS-2026-10-22.md#treći-krug--23-10-2026).

Prethodni dizajnerski prolaz podiže sitan tekst od 6–8 px na čitljivu veličinu, oslobađa lični list od ukrasa okvira, daje bossovima događaja ime i sliku u borbi i preuređuje aukciju, nagrade, izbor talenta i New Horizons. Na visokim ekranima kolona stola prikazuje dnevnik questova. Provjereno na 1280×720, 1366×768 i 1920×1080: [DESIGN-PASS-2026-10-22.md](docs/DESIGN-PASS-2026-10-22.md).

Prethodni prolaz uči AI da napada Overlorda kada ima stvarnu šansu. Kampanje protiv Kel’Thuzada koje ranije nisu završavale ni nakon hiljada naredbi sada završavaju pobjedom, a AI gubi znatno manje likova po borbi. Automatika više ne staje kod svakog novog questa, a Crocolisk Steak i Meditation pišu **Recover all health · Recover all energy**. Detalji i provjere: [AI-OVERLORD-2026-10-22.md](docs/AI-OVERLORD-2026-10-22.md).

Prethodni prolaz poboljšava nastavak kampanje: backup prije uvoza, **Restore previous campaign**, preuzimanje oštećenog autosavea i trajna obavijest kada čuvanje nije dostupno. AI pouzdanije otkazuje zastarjele poteze i oporavlja se nakon greške, a izvoz mape ponovo radi. Duge kampanje više ne zapinju nakon iscrpljenih quest špilova: dostupno je **Continue without a replacement quest**. Detalji i provjere: [RELIABILITY-2026-10-20.md](docs/RELIABILITY-2026-10-20.md).

Prethodni prolaz rasporeda provjeren je u Chromiumu na 1280×720, 1366×768 i 1920×1080: borba staje na ekran (kockice, totali i karte bez rezanja), knjigovodstveni koraci borbe idu sami uz prekidač **Auto-continue steps**, lični listovi ostaju unutar naslikanog okvira, a setup, mapa i sto jasnije vode igrača. Detalji i provjere: [SCREEN-FIT-2026-10-05.md](docs/SCREEN-FIT-2026-10-05.md).

Prethodna dorada: **573 potpune slike karata s utisnutim tekstom**, fizički oblikovane D8 i tri originalna polja borbe. Izvori, imagegen prompt i provjere: [PRINTED-CARDS-AND-DICE.md](docs/PRINTED-CARDS-AND-DICE.md).

v0.7 donosi 521 potpuno ilustrirano lice karte, reljefnu mapu, portrete i brojače jedinica, novi quest journal, scripted reward engine i geometrijski ispravne d8. Promjene, izvori i provjere: [TABLETOP-V7.md](docs/TABLETOP-V7.md).

Novi UI prolaz dodaje izbor opreme po slotovima, animirani feedback, Threat level s D8 pragom, grupne challenge vrijednosti i jasnije management korake. Detalji i provjere: [UI-POLISH.md](docs/UI-POLISH.md).

Desktop paneli sada koriste thumbnail karte s velikim pregledom na hover ili fokus, character sheet na jednom ekranu i borbu s fazama pripreme, udarca i rezultata. [Detalji izmjena](docs/DESKTOP-CARDS-AND-COMBAT.md).

Dodatna dorada donosi pregled rezultata odmora, trening bez gubitka odabira, pauzu AI tokom rada u panelima i pouzdanije kontrole kockica, opreme i modala. [Izmjene i provjere](docs/INTERACTION-POLISH.md).

Setup, biblioteka, oprema, trgovina, Encounter pregled, dnevnik i pravila sada koriste raspored za jedan desktop ekran, uz kratke tranzicije, tabove i stranice za duže zbirke. [Detalji i provjere](docs/SMOOTH-DESKTOP-FLOW.md).

Igriva kampanja koristi sadržaj prenesen iz dostavljenih skenova: 16 likova, 108 moći, 108 talenata, 120 predmeta, 80 questova, 52 događaja, 13 vrsta stvorenja i tri Overlorda. Originali su lokalni izvori teksta i mehanika; **Warforged Chronicles** daje novi izgled ličnih listova i karata; centralna 2D mapa prati polja i granice originalne ploče. Nijedno proširenje nije uključeno.

## Pokretanje

Node.js 24:

```sh
npm ci
npm run dev
```

Otvori `http://127.0.0.1:5173/`. Lokalna igra i botovi ne trebaju API server ni ključeve.

```sh
npm test
npm run check:render
npm run render:map
npm run build
npm run simulate -- 2005 kelthuzad
npm run simulate -- 71 nefarian casters
npm run simulate -- 99 kazzak casters
```

Simulacija provjerava resurse, jedinstvene figure, fizičke zalihe i D8 nakon svake naredbe, te ponavlja završenu partiju iz JSON zapisa. `--output putanja.json` čuva dnevnik za `npm run audit:session -- putanja.json izvjestaj.json`; `--trace` prikazuje spore odluke, a `--max-commands 12000` postavlja limit. Druga postava uključuje Rogue, Priest i Warlock klase, uz Warrior, Druid i Mage.

## Igranje

Prvo otvaranje vodi kroz **New game → Table → Characters → Overlord → Ready to play**. Biraš četiri ili šest likova, jednako podijeljenih između frakcija, bez ponavljanja klase. Pregled prije početka objašnjava resurse, početne gradove, questove, trgovca i Overlorda prema pravilniku. Sačuvana partija se nastavlja bez ponovnog setupa; započinjanje nove čuva prethodni autosave kao backup u postavkama.

Glavni ekran prikazuje mapu i akcije. **Characters**, **Class decks**, **Quests**, **Merchant**, **Encounter deck** i **Party controls** otvaraju zasebne panele; isti toggle, Close ili Esc vraća na mapu. Characters sadrži puni sheet, Spellbook, torbu i talente. Class decks prikazuje 12 moći i 12 talenata svake klase. Merchant se može pregledati bilo kada; kupovina je dostupna samo uz legalnu Town akciju. Eventi se vuku automatski po traci poteza.

Podrazumijevano upravljaš Grumbazom, a ostale likove vodi AI. Botovi igraju sami: u potezu tvoje frakcije čekaju da tvoj lik odigra (**Allies first** ih pušta ranije), a **Pause AI** ih zaustavlja; pojedinačni potez je u Party controls. U postavkama možeš preuzeti druge likove, izvesti ili uvesti partiju. Detalji novog interfejsa i provjera su u [UI-SETUP.md](docs/UI-SETUP.md).

- Do dvije akcije po liku: Travel, Rest, Train, Town i Challenge, ili **Pass**; zatim upravljanje opremom.
- Centralna 2D mapa ima 67 omeđenih polja u sedam oblasti. Prolaz prati obojenu zajedničku granicu; crni rub i dodir u uglu nisu prolaz.
- Pregled mape staje u jedan ekran s akcijama; tabla u njemu leži na stolu, a dugme **3D** je vraća u ravan prikaz. **Interact with map** uključuje pomicanje točkićem/trackpadom u oba smjera, Shift za horizontalno pomicanje i Ctrl za zoom. Završetak vraća pregled cijele table. Hover ili fokus na tokenu objašnjava figuru, quest i pravilo kretanja.
- Travel prikazuje najviše dva koraka za jednu akciju, uključujući prijateljske letove i plave prepreke. Potez se potvrđuje dugmetom **Putuj ovdje**.
- Frakcijski quest tokeni dijele oznake s kartama. Klik u oba smjera povezuje polje i quest; detalji prikazuju mete, spawnove i nagrade. Obje frakcije imaju vidljive brojače špilova; zamjena se bira nakon nagrada.
- Lični list prikazuje sedam mjesta, dodatke, torbu i talente; Hood of Shadow otvara osmo mjesto.
- Više moći kupuje se jednom Train ili Town akcijom. Instant moći plaćaju energiju pri korištenju, active pri opremanju. Ljubimci imaju izričit izbor ponovnog opremanja uz novi trošak. Talenti su besplatni na nivoima 2–5.
- **Combat** ima zaseban meni i toggle, animirane 3D D8 kockice i zajednički obračun. Plave daju ranged, crvene melee/defense, zelene armor, a attrition ulazi u resolution. **Auto-resolve** automatski vodi obračun i botove; **Autoplay battle** preuzima i igrače do rezultata. Moći, reroll i taktički izbori ostaju dostupni. [Detalji combat sistema](docs/COMBAT.md).
- Ono što se desi na stolu prikazuje se korak po korak: karta događaja, novi i završeni zadaci, nivoi, porazi, ratovi i potezi botova. Klik ili razmaknica vodi dalje, Esc preskače, a **Pace of the table** u postavkama bira tempo.
- Događaji imaju izbore, aukcije, ratove, trofeje, kugu i svjetske bossove. Kazzak ima skrivene tragove; Nefarian putuje prema Bulwarku; Kel’Thuzad uključuje pet dodatnih događaja.
- Cilj novih kampanja uvijek je **Defeat the Overlord**. Nakon 30. smjene traka se ponavlja do njegovog poraza. **Deadly PvP** je nezavisna, opcionalna postavka obračuna PvP štete.
- Setup prikazuje stvarno izvučene questove, figure i regije. Animirani početni pregled i naknadne zamjene mogu se ponovo otvoriti s glavnog stola. Svih šest karaktera imaju zasebne akcije, AI, opremu, moći i nagrade.
- Ability karte koriste novi imagegen okvir i D8 simbole, čitljiv tekst i sve opcije jačine. Pravila rastu s sadržajem karte bez preklapanja ili skrolanja unutar njenog teksta. [Promjene i promptovi](docs/UI-REVISION-2026-09-30.md).

Prečice: **1–5** akcije, **H** savjet za potez, **F** interakcija s mapom, **Esc** povratak. Unutar mape **+ / − / 0**, točkić i strelice. Desktop je jedina ciljna platforma.

## Provjera i granice

Aktuelni prolaz ima **1.425 testova** i mjerenje 43 ekrana na pet veličina ([PREMIUM-FINISH-2026-11-14.md](docs/PREMIUM-FINISH-2026-11-14.md#provjera)); prolaz s botovima koji igraju sami imao je 1.414 i pet minuta igre u pregledniku bez ijednog klika zbog botova ([BOT-TURNS-2026-11-12.md](docs/BOT-TURNS-2026-11-12.md#provjera)); prolaz sa zvukom imao je 1.393, provjeru sadržaja svih 98 zvučnih datoteka i tri minute igre botova sa zvukom bez zastoja ([SOUND-2026-11-12.md](docs/SOUND-2026-11-12.md#provjera)); prolaz s mapom i tempom stola imao je 1.346, četiri završene AI kampanje i tačnu provjeru geometrije mape ([TABLE-PACE-2026-11-12.md](docs/TABLE-PACE-2026-11-12.md#provjera)); prolaz s botovima imao je 1.234 ([AI-BOTS-2026-11-11.md](docs/AI-BOTS-2026-11-11.md)); prolaz s muzikom imao je 1.198 ([MUSIC-THEMES-2026-11-11.md](docs/MUSIC-THEMES-2026-11-11.md)); prolaz sa savjetnikom i ratovima imao je 1.189 ([ADVISOR-TOKENS-WARS-2026-11-11.md](docs/ADVISOR-TOKENS-WARS-2026-11-11.md)); prolaz kroz igru imao je 1.145 ([PLAYTHROUGH-2026-11-11.md](docs/PLAYTHROUGH-2026-11-11.md)); dizajnerski prolaz imao je 1.108 testova, build, render 621 komponente i dizajnerski audit 39 ekrana na tri veličine: [DESIGN-PASS-2026-10-22.md](docs/DESIGN-PASS-2026-10-22.md). AI prolaz dodaje sedam završenih AI kampanja protiv sva tri Overlorda i nezavisni replay audit dvije od njih: [AI-OVERLORD-2026-10-22.md](docs/AI-OVERLORD-2026-10-22.md). Prethodni prolaz dodaje render 621 komponente, izvoz mape i nastavak dvije zaglavljene kampanje: [RELIABILITY-2026-10-20.md](docs/RELIABILITY-2026-10-20.md).

Raniji audit enginea popravlja Vanish bonuse, duplirane figure pri recikliranju questova i ponovno zatvaranje borbe. Tadašnjih 838 testova, build, render i tri AI partije s 4.312 naredbi i identičnim replayom: [ENGINE-SCRIPT-AUDIT.md](docs/ENGINE-SCRIPT-AUDIT.md). Prethodna provjera svih event karata, klasnih moći, talenata i smjene Horda → Alijansa kroz svih 30 poteza: [CARD-EVENT-TURN-AUDIT.md](docs/CARD-EVENT-TURN-AUDIT.md).

Automatizovane provjere uključuju setup, opremanje, špilove, višestruki trening, varijante, borbu, mapu, scripted rewards, AI odluke i React interakcije. Novi AI engine bira ciljeve i sastav ekipe prema stanju, procjenjuje borbu, uspoređuje pune konfiguracije opreme i provjerava učinke sposobnosti prije upotrebe. Planiranje u browseru radi u Web Workeru. Karte klase su katalog za kupovinu/trening; moći se prvo uče i opremaju. Izvori, pretraživanje i granice: [AI-ENGINE.md](docs/AI-ENGINE.md). Pregled pravila: [RULES-AUDIT-V6.md](docs/RULES-AUDIT-V6.md).

Granice mape ručno su precrtane iz dvije fotografije originala, uz dijagrame iz pravilnika, i 12. 11. 2026. ponovo upoređene s njima ([MAP-AUDIT-2026-11-12.md](docs/MAP-AUDIT-2026-11-12.md)). Granice i engine koriste isti graf; 67 poligona nema preklapanja. Arhiv ne sadrži ravan sken, pa je ovo rekonstrukcija s pojednostavljenim konturama i stiliziranim Lordaeron reljefom. v0.7 je vizuelno provjeren u Chromeu, uključujući karte, mapu, questove i nagrade. Ranije provjere: [MAP.md](docs/MAP.md) i [VALIDATION.md](docs/VALIDATION.md); aktuelne: [TABLETOP-V7.md](docs/TABLETOP-V7.md).

## Dokumentacija

- [Mapa, granice i questovi](docs/MAP.md)
- [Uvoz 560 skenova i manifest](docs/SCAN-INTEGRATION.md)
- [Pokrivenost pravilnika i sadržaja](docs/RULES-COVERAGE.md)
- [Engine i AI](docs/ENGINE.md)
- [Dizajn sistem](docs/DESIGN-SYSTEM.md)
- [Imagegen promptovi](docs/IMAGEGEN-BASE.md)
- [Porijeklo materijala](docs/ASSETS.md)
- [Multiplayer, trenutno na čekanju](docs/MULTIPLAYER.md)
- [Pravi skenovi karata, žetona i listova](docs/SCANS-2026-11-05.md)
- [Oprema, rub karata, zvuk i muzika](docs/EQUIPMENT-AND-SOUND-2026-11-10.md)
- [Borba kao na stolu: polje borbe, protivnik, sposobnosti](docs/COMBAT-TABLE-2026-11-10.md)
- [Prolaz kroz igru i provjera pravila prema pravilniku](docs/PLAYTHROUGH-2026-11-11.md)
- [Savjetnik za potez, žetoni, muzika u frazama i ratovi po pravilniku](docs/ADVISOR-TOKENS-WARS-2026-11-11.md)
- [Sedam muzičkih tema i petlje bez rupe](docs/MUSIC-THEMES-2026-11-11.md)
- [Botovi: saradnja s igračem, zlato, ratovi i odlučna završnica](docs/AI-BOTS-2026-11-11.md)
- [Borba: moć jednim klikom, izvor energije, telefon](docs/COMBAT-PLAY-2026-11-12.md)
- [Mapa prema originalnoj tabli i tabla koja leži na stolu](docs/MAP-AUDIT-2026-11-12.md)
- [Gain ide iznad kapaciteta, Regain ne (revizija pravila 4)](docs/GAIN-REGAIN-2026-11-12.md)
- [Sto korak po korak: karta događaja, najave, zvučni znakovi i tempo](docs/TABLE-PACE-2026-11-12.md)
- [Više glasova, zvuk borbe i ispravka nijemih linija](docs/SOUND-2026-11-12.md)
- [Botovi igraju sami, igračevi likovi prvi, i vidi se šta su uzeli](docs/BOT-TURNS-2026-11-12.md)
- [Popravke iz pregleda svih ekrana i završni sloj dizajna](docs/PREMIUM-FINISH-2026-11-14.md)

## Autorska prava

Neslužbeni projekat obožavatelja bez komercijalne svrhe. World of Warcraft: The Board Game i njegove karte, ilustracije, žetoni i likovi pripadaju Fantasy Flight Games i Blizzard Entertainmentu. Slike u `public/assets/scans/` smanjene su kopije skenova igre iz vlasnikovog posjeda. Nositelji prava mogu tražiti njihovo uklanjanje; kako se uklanjaju opisano je u [SCANS-2026-11-05.md](docs/SCANS-2026-11-05.md).

`main` je povezan s Vercel projektom `lordaeron-tabletop`. Redis nije povezan; online kontrole nisu izložene u trenutnom interfejsu. Stariji fixture paket i server testovi ostaju radi regresija. Paket pravila v7 ima novi content fingerprint i autosave ključ zbog promjena replaya. Prethodne v6/v4/v3 partije ostaju netaknute; najnovija prethodna partija može se preuzeti u postavkama i nije automatski ponovljena po novim pravilima.
