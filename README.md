# Lordaeron · WoW Board Game v0.2

Razvojna adaptacija osnovne igre iz 2005. + službenog FAQ-a 1.4. React sučelje, nezavisan TypeScript engine, lokalni hotseat, AI igrači i multiplayer server pripremljen za Vercel.

**Originalni set još nije kompletan.** Igriva kampanja koristi jasno označene probne karte. Skenove ćemo naknadno koristiti za tekst, vrijednosti i mehanike; mapa, karte i drugi elementi imaju vlastiti dizajn sistem **Gilded Atlas**.

## Pokretanje

Node.js 22+:

```sh
npm ci
npm run dev
```

U drugom terminalu za multiplayer:

```sh
npm run dev:server
```

Otvori **http://127.0.0.1:5173/**. Lokalna igra i botovi ne trebaju API server ni ključeve. API je na `127.0.0.1:5174`; Vite prosljeđuje `/api` i WebSocket vezu. Lokalni multiplayer čuva sobe u `.local-data/rooms/` i nastavlja ih poslije ponovnog pokretanja servera.

```sh
npm test
npm run build
npm run simulate -- 2005
```

## Trenutno igrivo

- Setup s 4 ili 6 likova, jednakim frakcijama, jedinstvenim klasama, početnim questovima i trgovcem.
- Mapa sa 67 regija, putovanjem do dva koraka, letovima i blokadom nezavisnih stvorenja. Topologija čeka provjeru ravnim skenom.
- Svih pet osnovnih akcija; više kupovina, prodaja i treninga u jednoj gradskoj akciji; razmjena među saveznicima.
- Sedam mjesta za opremu, knjiga moći, torba, add-on karte, aktivne moći, ljubimci, XP i talenti.
- Pojedinačne borbene faze, d8 svih boja, reroll, Spot, Curse/Stun, grupne rane, poraz i respawn; 13 skriptiranih vrsta stvorenja.
- PvE, PvP, plijen, quest spawnovi i nagrade, izbor sljedećeg špila, aukcije, bonus događaji i ratni zadaci.
- Tracker 30 frakcijskih poteza; pobjeda nad razvojnim Overlordom ili završni PvP nakon 30. poteza.
- Zaseban AI planer sa tri lokalna stila, javnim stanjem i legalnim potezima.
- Mrežni lobby, kod sobe, kontrola likova, bot mjesta, potvrda zajedničkih izazova i trgovine, sinhronizacija i reconnect.
- Lokalni autosave i provjeren JSON replay. Nevažeći zapisi ostaju u recovery ključu umjesto tihog brisanja.

U početnoj partiji upravljaš Grumbazom; ostali su botovi. Pokreni ih dugmetom **Pokreni botove** ili odigraj pojedinačan bot potez. U Postavkama možeš preuzeti druge likove. Za prvi izazov putuj u Stillwater Pond i izazovi Murloca. Oprema i moći pojedinačno se aktiviraju u odgovarajućim borbenim fazama.

## Originalni sadržaj i novi izgled

Probni set ima 80 questova, sedam događaja i razvojne moći/predmete. To nisu transkripcije originalnih špilova. Postoje imena i kapaciteti 16 originalnih likova i community podaci za 13 vrsta stvorenja.

Referentna zbirka sadrži 273 skena predmeta, 39 prikaza stvorenja i pet poleđina; uključuje proširenja. Njena izdanja i pravila nisu automatski prihvaćena u osnovni set. Igrivi renderer koristi nove predloške, ilustraciju mape, portrete i 13 vlastitih vektorskih simbola miniona. Pregled predložaka je u **Dizajn sistem**.

Preostaju originalni Power/Talent i rasni efekti, stvarni questovi, događaji i predmeti, tri originalna Overlord profila i njihove posebne interakcije. Postojeći mehanizmi imaju testove, ali cijeli originalni ruleset još nije potvrđen kao kompletan.

## Vercel

Dodani su `api/game.ts`, `api/ws.ts` i `vercel.json`. Za cloud multiplayer potrebne su serverske varijable `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN`. Sobe koriste atomsku Redis provjeru revizije. Produkcija bez trajnog spremišta odbija mrežni zahtjev.

Produkcija: [lordaeron-tabletop.vercel.app](https://lordaeron-tabletop.vercel.app). GitHub `main` je povezan s Vercel projektom `lordaeron-tabletop`. **Stvarni Redis servis još nije povezan niti testiran; lokalna igra i botovi su dostupni.** Upute su u [MULTIPLAYER.md](docs/MULTIPLAYER.md).

## Dokumentacija

- [Pokrivenost pravilnika](docs/RULES-COVERAGE.md)
- [Engine, skripte i botovi](docs/ENGINE.md)
- [Dizajn sistem i uvoz sadržaja](docs/DESIGN-SYSTEM.md)
- [Multiplayer i Vercel](docs/MULTIPLAYER.md)
- [Provjera](docs/VALIDATION.md)
- [Istraživanje izvora i API-ja](docs/RESEARCH.md)
- [Porijeklo materijala](docs/ASSETS.md)

Prethodni lokalni prototip dostupan je kroz Postavke radi poređenja. Njegov engine je odvojen i ne služi kao provjera originalnog pravilnika.

Ciljna platforma je **desktop**, po zahtjevu korisnika. Mapa podržava zoom točkićem, povlačenje, pronalaženje regije/junaka i pregled cijele ploče. Prečice: 1–5 akcije, M kampanja, F proširena mapa; unutar mape + / − / 0 i strelice.
