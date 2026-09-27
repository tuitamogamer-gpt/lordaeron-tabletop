# Lordaeron · WoW Board Game v0.5

Desktop adaptacija osnovne igre iz 2005. i službenog FAQ-a 1.4. React interfejs, zaseban TypeScript engine, lokalni hotseat i AI igrači. **Online sobe su na čekanju.**

[Otvori igru](https://lordaeron-tabletop.vercel.app)

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

Simulacija provjerava resurse nakon svakog poteza i ponavlja završenu partiju iz JSON zapisa. Druga postava uključuje Rogue, Priest i Warlock klase, uz Warrior, Druid i Mage.

## Igranje

Prvo otvaranje vodi kroz **New game → Table → Characters → Overlord → Ready to play**. Biraš četiri ili šest likova, jednako podijeljenih između frakcija, bez ponavljanja klase. Pregled prije početka objašnjava resurse, početne gradove, questove, trgovca i Overlorda prema pravilniku. Sačuvana partija se nastavlja bez ponovnog setupa; započinjanje nove čuva prethodni autosave kao backup u postavkama.

Glavni ekran prikazuje mapu i akcije. **Characters**, **Quests**, **Merchant**, **Encounter deck** i **Party controls** otvaraju zasebne panele; isti toggle, Close ili Esc vraća na mapu. Characters sadrži puni sheet, Spellbook, torbu i talente. Merchant se može pregledati bilo kada; kupovina je dostupna samo uz legalnu Town akciju. Eventi se vuku automatski po traci poteza.

Podrazumijevano upravljaš Grumbazom, a ostale likove vodi AI. **Run AI** pokreće botove; pojedinačni potez je u Party controls. U postavkama možeš preuzeti druge likove, izvesti ili uvesti partiju. Detalji novog interfejsa i provjera su u [UI-SETUP.md](docs/UI-SETUP.md).

- Dvije akcije po liku: Travel, Rest, Train, Town i Challenge; zatim upravljanje opremom.
- Centralna 2D mapa ima 67 omeđenih polja u sedam oblasti. Prolaz prati obojenu zajedničku granicu; crni rub i dodir u uglu nisu prolaz.
- **Interact with map** uključuje prošireni prikaz, zoom, povlačenje, pretragu regija i centriranje junaka. Završetak vraća pregled cijele table.
- Travel prikazuje najviše dva koraka za jednu akciju, uključujući prijateljske letove i plave prepreke. Potez se potvrđuje dugmetom **Putuj ovdje**.
- Frakcijski quest tokeni dijele oznake s kartama. Klik u oba smjera povezuje polje i quest; detalji prikazuju mete, spawnove i nagrade. Obje frakcije imaju vidljive brojače špilova; zamjena se bira nakon nagrada.
- Lični list prikazuje sedam mjesta, dodatke, torbu i talente; Hood of Shadow otvara osmo mjesto.
- Borba vodi kroz kockice, reroll, Spot, sposobnosti, pogotke, rane, oživljavanje i nagrade. Izbor jačine, mete i kockica nalazi se uz odgovarajuću kartu.
- Događaji imaju izbore, aukcije, ratove, trofeje, kugu i svjetske bossove. Kazzak ima skrivene tragove; Nefarian putuje prema Bulwarku; Kel’Thuzad uključuje pet dodatnih događaja.
- Pobjeda nad Overlordom ili završni PvP nakon 30. smjene; Nefarianov dolazak može ranije pokrenuti završnicu.

Prečice: **1–5** akcije, **F** interakcija s mapom, **Esc** povratak. Unutar mape **+ / − / 0**, točkić i strelice. Desktop je jedina ciljna platforma.

## Provjera i granice

157 automatizovanih testova, render provjera 572 komponente i tri završene kampanje s identičnim replayom. Novi testovi pokrivaju geometriju, Travel, quest tokene/špilove i React interakcije mape. AI koristi heuristike i ne predstavlja optimizovanu strategiju.

Mapa je ručno precrtana iz dvije fotografije originala, uz dijagrame iz pravilnika. Granice i engine koriste isti graf. Render mape je vizuelno pregledan; 67 poligona nema preklapanja. Arhiv ne sadrži ravan sken, pa je ovo rekonstrukcija s pojednostavljenim konturama. Dostupni preglednički alat nije imao aktivan browser; DOM testovi i zaseban SVG render ne zamjenjuju završni pregled cijelog prozora u pregledniku. Detalji su u [MAP.md](docs/MAP.md) i [VALIDATION.md](docs/VALIDATION.md).

## Dokumentacija

- [Mapa, granice i questovi](docs/MAP.md)
- [Uvoz 560 skenova i manifest](docs/SCAN-INTEGRATION.md)
- [Pokrivenost pravilnika i sadržaja](docs/RULES-COVERAGE.md)
- [Engine i AI](docs/ENGINE.md)
- [Dizajn sistem](docs/DESIGN-SYSTEM.md)
- [Imagegen promptovi](docs/IMAGEGEN-BASE.md)
- [Porijeklo materijala](docs/ASSETS.md)
- [Multiplayer, trenutno na čekanju](docs/MULTIPLAYER.md)

`main` je povezan s Vercel projektom `lordaeron-tabletop`. Redis nije povezan; online kontrole nisu izložene u trenutnom interfejsu. Stariji fixture paket i server testovi ostaju radi regresija. v0.4 ima novi content fingerprint i autosave ključ zbog ispravljenih puteva. Stara v0.3 partija ostaje netaknuta i može se preuzeti u postavkama; nije automatski ponovljena po novim pravilima kretanja.
