# Provjera verzije 0.2

Provedeno 26. 9. 2026. u lokalnom Windows okruženju. Aktivni paket: `development-2005-v2.1.0`, označen `officialComplete: false`.

## Automatizirano

- `npm test`: **86 testova prolazi** u tri datoteke: 49 testova novog enginea, 10 multiplayer testova i 27 regresijskih testova prethodnog prototipa.
- Engine: setup 4/6, jedinstvene klase, putovanje i blue blokade, svih pet akcija, više gradskih transakcija u jednoj akciji, torba i oprema, energija aktivnih moći, d8/Spot/reroll, minioni, stanje poraza, nagrade, više dovršenih questova, završnica i replay.
- Multiplayer: kontrola likova, skrivanje budućih bacanja/špilova i tuđih ponuda, idempotentnost, konflikt revizija, saglasnost za razmjenu, botovi i stroga validacija naredbi. Transportni test otvara pravi lokalni HTTP/WebSocket server i dva klijenta; provjerava istu reviziju i reconnect. Spremište tih testova je `MemoryStore`.
- `npm run build`: uspješan TypeScript strict check i Vite produkcijski build. Rollup prijavljuje dvije nevažeće PURE anotacije u Zod komentarima i sigurno ih uklanja; nije greška aplikacije.

Tri kampanje kroz `npm run simulate -- SEED 7000` završile su svih 30 poteza i završni PvP:

| Seed | Broj naredbi | Završni potez | Ishod |
| --- | ---: | ---: | --- |
| 42 | 2.055 | 30 | Horda |
| 2005 | 2.023 | 30 | Horda |
| 987654 | 1.971 | 30 | Alijansa |

Simulacije koriste probne karte. One pokazuju prolaz kroz cijeli tok kampanje za ove seedove, ne potvrđuju balans ili potpunu tačnost originalnog seta.

## Provjera u pregledniku

- Gradska akcija: naučene dvije moći, zbirna cijena 5 zlata, potrošena jedna akcija. Pregled transakcija prati promjenu zlata i inventara.
- Besplatna razmjena poslije akcije: saveznik u istoj regiji predao je 1 zlato.
- Grumbaz je putovao iz Brilla u Stillwater Pond i izazvao Murloca. Aktivacija karata potrošila je energiju i dala šest kockica. Refresh je sačuvao iste bačene rezultate.
- Murlocov efekt smanjio je zdravlje sa 4 na 2. Odbrana, poraz protivnika, dodjela 3 XP / 3 zlata, izbor predmeta i novi quest završeni su kroz kontrole u aplikaciji.
- Multiplayer UI: kreiranje sobe, pet botova, početak partije, aktivna WebSocket veza i nastavak iste sobe poslije refresha. Povratak na lokalnu partiju čuva sobu u listi za nastavak.
- Dizajn sistem: nova ilustracija mape, 67 interaktivnih regija, predlošci moći, talenata, predmeta, questova, događaja, miniona, Overlorda i likova. Karte koriste novi raspored i vektorske simbole, bez originalnih lica skeniranih karata.
- Nakon korisnikove odluke UI je prebačen isključivo na desktop. Provjereni su **1280 × 800** i **1920 × 1080**: stalne kontrole, bočni panel, mapa i donje karte/tracker. Nema horizontalnog preljeva. Povlačenje mape pomiče pogled bez odabira druge regije; prečica 2 otvara odmor, Escape zatvara dijalog, F proširuje mapu. Točkić mijenja zoom, a promjena veličine panela zadržava kadar. Vidljive slike su učitane.
- U završnoj pregledničkoj provjeri nema zabilježenih grešaka ili upozorenja konzole. Lokalna kampanja vraćena je na početak, automatski botovi su pauzirani.

## Granice provjere

### Warforged Chronicles, 27. 9. 2026.

- `npm test`: 86/86; `npm run build` uključujući NodeNext serversku provjeru prolazi. Izmjene ne mijenjaju reducer, podatke pravila, legalne poteze ni format snimljene partije.
- Prvi lokalni pregled potvrđuje prikaz nove mape, oslikanih akcija/karata, grba, portreta, pergamenta i ukrasnog okvira. Svih sedam WebP putanja vraća HTTP 200 i `image/webp`; ukupno 3.45 MB.
- DOM provjera na 1280 × 800 i 1920 × 1080 potvrđuje da su širina i visina dokumenta jednake viewportu. Tracker i bočni panel ostaju unutar radne površine. Privremena promjena viewporta vraćena je na početnu vrijednost.
- Završna provjera otvaranja dijaloga nije dovršena: ugrađeni preglednik je nakon promjene viewporta prestao prihvatati ulaz i snimke. To je ograničenje ovog prolaza provjere; ne predstavlja potvrđen kvar aplikacije. Glavni ekran je pregledan prije tog prekida, bez grešaka u konzoli.

Vercel produkcija je objavljena; frontend i slika mape vraćaju HTTP 200. Node 24 provjera kompajliranih API modula potvrđuje uspješan ESM import. Provjera produkcijskih endpointa potvrđuje kontrolisani JSON HTTP 503 kada nedostaje trajno spremište, HTTP 426 za običan zahtjev prema WebSocket endpointu i uspješan WebSocket handshake sa zatvaranjem kodom 1000. Online sobe su na holdu; nisu provjereni Upstash Redis, prekid više cloud instanci ili dugotrajna partija preko javnog interneta. Originalni tekstovi karata, sve posebne FAQ interakcije i konačna topologija mape čekaju provjeru izvora. Tačan pregled je u [RULES-COVERAGE.md](RULES-COVERAGE.md).

Stariji `docs/sample-save.json` pripada prototipu v0.1. Novi engine koristi vlastiti format sesije v2 i provjerava verziju sadržaja prije replaya.
