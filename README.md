# Lordaeron · WoW Board Game v0.7

Desktop adaptacija osnovne igre iz 2005. i službenog FAQ-a 1.4. React interfejs, zaseban TypeScript engine, lokalni hotseat i AI igrači. **Online sobe su na čekanju.**

[Otvori igru](https://lordaeron-tabletop.vercel.app)

v0.7 donosi 521 potpuno ilustrirano lice karte, reljefnu mapu, portrete i brojače jedinica, novi quest journal, scripted reward engine i geometrijski ispravne d8. Promjene, izvori i provjere: [TABLETOP-V7.md](docs/TABLETOP-V7.md).

Novi UI prolaz dodaje izbor opreme po slotovima, animirani feedback, Threat level s D8 pragom, grupne challenge vrijednosti i jasnije management korake. Detalji i provjere: [UI-POLISH.md](docs/UI-POLISH.md).

Desktop paneli sada koriste thumbnail karte s velikim pregledom na hover ili fokus, character sheet na jednom ekranu i borbu s fazama pripreme, udarca i rezultata. [Detalji izmjena](docs/DESKTOP-CARDS-AND-COMBAT.md).

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

Podrazumijevano upravljaš Grumbazom, a ostale likove vodi AI. **Run AI** pokreće botove; pojedinačni potez je u Party controls. U postavkama možeš preuzeti druge likove, izvesti ili uvesti partiju. Detalji novog interfejsa i provjera su u [UI-SETUP.md](docs/UI-SETUP.md).

- Dvije akcije po liku: Travel, Rest, Train, Town i Challenge; zatim upravljanje opremom.
- Centralna 2D mapa ima 67 omeđenih polja u sedam oblasti. Prolaz prati obojenu zajedničku granicu; crni rub i dodir u uglu nisu prolaz.
- Pregled mape staje u jedan ekran s akcijama. **Interact with map** uključuje pomicanje točkićem/trackpadom u oba smjera, Shift za horizontalno pomicanje i Ctrl za zoom. Završetak vraća pregled cijele table. Hover ili fokus na tokenu objašnjava figuru, quest i pravilo kretanja.
- Travel prikazuje najviše dva koraka za jednu akciju, uključujući prijateljske letove i plave prepreke. Potez se potvrđuje dugmetom **Putuj ovdje**.
- Frakcijski quest tokeni dijele oznake s kartama. Klik u oba smjera povezuje polje i quest; detalji prikazuju mete, spawnove i nagrade. Obje frakcije imaju vidljive brojače špilova; zamjena se bira nakon nagrada.
- Lični list prikazuje sedam mjesta, dodatke, torbu i talente; Hood of Shadow otvara osmo mjesto.
- Više moći kupuje se jednom Train ili Town akcijom. Instant moći plaćaju energiju pri korištenju, active pri opremanju. Ljubimci imaju izričit izbor ponovnog opremanja uz novi trošak. Talenti su besplatni na nivoima 2–5.
- **Combat** ima zaseban meni i toggle, animirane 3D D8 kockice i zajednički obračun. Plave daju ranged, crvene melee/defense, zelene armor, a attrition ulazi u resolution. **Auto-resolve** automatski vodi obračun i botove; **Autoplay battle** preuzima i igrače do rezultata. Moći, reroll i taktički izbori ostaju dostupni. [Detalji combat sistema](docs/COMBAT.md).
- Događaji imaju izbore, aukcije, ratove, trofeje, kugu i svjetske bossove. Kazzak ima skrivene tragove; Nefarian putuje prema Bulwarku; Kel’Thuzad uključuje pet dodatnih događaja.
- Cilj novih kampanja uvijek je **Defeat the Overlord**. Nakon 30. smjene traka se ponavlja do njegovog poraza. **Deadly PvP** je nezavisna, opcionalna postavka obračuna PvP štete.
- Setup prikazuje stvarno izvučene questove, figure i regije. Animirani početni pregled i naknadne zamjene mogu se ponovo otvoriti s glavnog stola. Svih šest karaktera imaju zasebne akcije, AI, opremu, moći i nagrade.
- Ability karte koriste novi imagegen okvir i D8 simbole, čitljiv tekst i sve opcije jačine. Pravila rastu s sadržajem karte bez preklapanja ili skrolanja unutar njenog teksta. [Promjene i promptovi](docs/UI-REVISION-2026-09-30.md).

Prečice: **1–5** akcije, **F** interakcija s mapom, **Esc** povratak. Unutar mape **+ / − / 0**, točkić i strelice. Desktop je jedina ciljna platforma.

## Provjera i granice

Aktuelni prolaz popravlja Vanish bonuse, duplirane figure pri recikliranju questova i ponovno zatvaranje borbe. **838 testova**, build, render i tri nove AI partije s 4.312 naredbi i identičnim replayom prolaze: [ENGINE-SCRIPT-AUDIT.md](docs/ENGINE-SCRIPT-AUDIT.md). Prethodna provjera svih event karata, klasnih moći, talenata i smjene Horda → Alijansa kroz svih 30 poteza: [CARD-EVENT-TURN-AUDIT.md](docs/CARD-EVENT-TURN-AUDIT.md).

Automatizovane provjere uključuju setup, opremanje, špilove, višestruki trening, varijante, borbu, mapu, scripted rewards, AI odluke i React interakcije. Novi AI engine bira ciljeve i sastav ekipe prema stanju, procjenjuje borbu, uspoređuje pune konfiguracije opreme i provjerava učinke sposobnosti prije upotrebe. Planiranje u browseru radi u Web Workeru. Karte klase su katalog za kupovinu/trening; moći se prvo uče i opremaju. Izvori, pretraživanje i granice: [AI-ENGINE.md](docs/AI-ENGINE.md). Pregled pravila: [RULES-AUDIT-V6.md](docs/RULES-AUDIT-V6.md).

Granice mape ručno su precrtane iz dvije fotografije originala, uz dijagrame iz pravilnika. Granice i engine koriste isti graf; 67 poligona nema preklapanja. Arhiv ne sadrži ravan sken, pa je ovo rekonstrukcija s pojednostavljenim konturama i stiliziranim Lordaeron reljefom. v0.7 je vizuelno provjeren u Chromeu, uključujući karte, mapu, questove i nagrade. Ranije provjere: [MAP.md](docs/MAP.md) i [VALIDATION.md](docs/VALIDATION.md); aktuelne: [TABLETOP-V7.md](docs/TABLETOP-V7.md).

## Dokumentacija

- [Mapa, granice i questovi](docs/MAP.md)
- [Uvoz 560 skenova i manifest](docs/SCAN-INTEGRATION.md)
- [Pokrivenost pravilnika i sadržaja](docs/RULES-COVERAGE.md)
- [Engine i AI](docs/ENGINE.md)
- [Dizajn sistem](docs/DESIGN-SYSTEM.md)
- [Imagegen promptovi](docs/IMAGEGEN-BASE.md)
- [Porijeklo materijala](docs/ASSETS.md)
- [Multiplayer, trenutno na čekanju](docs/MULTIPLAYER.md)

`main` je povezan s Vercel projektom `lordaeron-tabletop`. Redis nije povezan; online kontrole nisu izložene u trenutnom interfejsu. Stariji fixture paket i server testovi ostaju radi regresija. Paket pravila v7 ima novi content fingerprint i autosave ključ zbog promjena replaya. Prethodne v6/v4/v3 partije ostaju netaknute; najnovija prethodna partija može se preuzeti u postavkama i nije automatski ponovljena po novim pravilima.
