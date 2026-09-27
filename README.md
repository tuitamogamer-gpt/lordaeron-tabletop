# Lordaeron · WoW Board Game v0.3

Desktop adaptacija osnovne igre iz 2005. i službenog FAQ-a 1.4. React interfejs, zaseban TypeScript engine, lokalni hotseat i AI igrači. **Online sobe su na čekanju.**

[Otvori igru](https://lordaeron-tabletop.vercel.app)

Igriva kampanja koristi sadržaj prenesen iz dostavljenih skenova: 16 likova, 108 moći, 108 talenata, 120 predmeta, 80 questova, 52 događaja, 13 vrsta stvorenja i tri Overlorda. Originali su lokalni izvori teksta i mehanika; **Warforged Chronicles** daje novi izgled mape, ličnih listova, karata i tokena. Nijedno proširenje nije uključeno.

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
npm run build
npm run simulate -- 2005 kelthuzad
npm run simulate -- 71 nefarian casters
npm run simulate -- 99 kazzak casters
```

Simulacija provjerava resurse nakon svakog poteza i ponavlja završenu partiju iz JSON zapisa. Druga postava uključuje Rogue, Priest i Warlock klase, uz Warrior, Druid i Mage.

## Igranje

Početno upravljaš Grumbazom, a ostalih pet likova vodi AI. Dugme **Pokreni botove** uključuje automatske poteze; susjedna strelica odigra jedan. U postavkama možeš preuzeti druge likove, izvesti ili uvesti partiju. Novi setup bira četiri ili šest likova, tvog junaka i jednog od tri Overlorda.

- Dvije akcije po liku: Travel, Rest, Train, Town i Challenge; zatim upravljanje opremom.
- Obje frakcije imaju stalno vidljive quest panele. Klik na quest bira njegovu regiju.
- Mapa podržava zoom, povlačenje, letove, odabir putanje i posebne moći kretanja.
- Lični list prikazuje sedam mjesta, dodatke, torbu i talente; Hood of Shadow otvara osmo mjesto.
- Borba vodi kroz kockice, reroll, Spot, sposobnosti, pogotke, rane, oživljavanje i nagrade. Izbor jačine, mete i kockica nalazi se uz odgovarajuću kartu.
- Događaji imaju izbore, aukcije, ratove, trofeje, kugu i svjetske bossove. Kazzak ima skrivene tragove; Nefarian putuje prema Bulwarku; Kel’Thuzad uključuje pet dodatnih događaja.
- Pobjeda nad Overlordom ili završni PvP nakon 30. smjene; Nefarianov dolazak može ranije pokrenuti završnicu.

Prečice: **1–5** akcije, **F** proširena mapa. Unutar mape **+ / − / 0** i strelice. Desktop je jedina ciljna platforma.

## Provjera i granice

129 automatizovanih testova, render provjera 572 komponente i tri završene kampanje s identičnim replayom. To potvrđuje konkretne testirane tokove, ne svaku kombinaciju 336 originalnih klasnih i item karata. AI koristi heuristike i ne predstavlja optimizovanu strategiju.

**Glavna ploča nije u dostavljenom arhivu.** Graf od 67 regija prenesen je s fotografije; sve veze i letne oznake još treba uporediti s ravnim skenom. Nova mapa je dekorativna ilustracija tog grafa.

Preglednik je učitao novu kampanju bez grešaka i dimenzije panela su provjerene kroz DOM. Alat za kontrolu preglednika nije prihvatao klikove i screenshot zahtjeve; završni vizuelni pregled i ručno odigravanje novog UI-ja ostaju otvoreni. Detalji su u [VALIDATION.md](docs/VALIDATION.md).

## Dokumentacija

- [Uvoz 560 skenova i manifest](docs/SCAN-INTEGRATION.md)
- [Pokrivenost pravilnika i sadržaja](docs/RULES-COVERAGE.md)
- [Engine i AI](docs/ENGINE.md)
- [Dizajn sistem](docs/DESIGN-SYSTEM.md)
- [Imagegen promptovi](docs/IMAGEGEN-BASE.md)
- [Porijeklo materijala](docs/ASSETS.md)
- [Multiplayer, trenutno na čekanju](docs/MULTIPLAYER.md)

`main` je povezan s Vercel projektom `lordaeron-tabletop`. Redis nije povezan; online kontrole nisu izložene u trenutnom interfejsu. Stariji fixture paket i server testovi ostaju radi regresija. Partije starog paketa nisu kompatibilne s novim sadržajem; v0.3 ima poseban autosave ključ i provjerava fingerprint prije importa.
