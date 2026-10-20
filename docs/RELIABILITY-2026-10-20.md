# Nastavak kampanje i AI · 20. 10. 2026.

Pregled lokalne igre obuhvatio je setup, čuvanje i uvoz partija, kontrole AI-ja, postojeće testove enginea i interfejsa, produkcijski build te izvoz mape.

## Partije i oporavak

- Uvoz sada čuva trenutnu kampanju u postojećem backup slotu, jednako kao pokretanje nove kampanje. **Restore previous campaign** vraća prethodnu partiju direktno iz Settings; zamijenjena partija postaje novi backup.
- Neispravan autosave ostaje netaknut i dobiva jedan stalni recovery slot. Ponovno otvaranje aplikacije i React StrictMode više ne stvaraju nove kopije sa vremenskim oznakama. Settings omogućava preuzimanje originalnog zapisa, uključujući najnoviji arhiv starijih izdanja.
- Backup se zapisuje prije zamjene autosavea. Ako je spremište puno ili blokirano, postojeći zapis se čuva, a **SAVE UNAVAILABLE** i poruka u postavkama ostaju vidljivi. Trenutna partija se može izvesti, uz tekstualnu kopiju ako preuzimanje nije dostupno.
- Uvoz odbija datoteke veće od 4 MB prije čitanja i prikazuje razumljivu grešku za neispravan JSON. Neuspješan uvoz ne mijenja partiju ni backup. Zakašnjelo čitanje datoteke ne može prepisati novopokrenutu kampanju.
- Uspješan uvoz vraća igrača na mapu, čisti prethodne panele i otvara borbu ako je sačuvana partija u combat fazi. Uvezene i vraćene partije počinju s ručnom kontrolom svih likova; poruka upućuje na dodjelu AI-ja u Settings.
- Setup nema izvoz privremene partije, a slanje naredbi prije stvarnog početka je izričito blokirano. Podrazumijevani AI raspored koristi stvarnu postavu učitane kampanje i odbacuje duplirane ili nepoznate likove iz preference.

Format v7, content hash i semantika poteza ostaju kompatibilni s postojećim v7 partijama. Stariji v6/v4/v3 zapisi se ne prepisuju.

## AI i mapa

- Ponovljeni klik na jedan AI potez ne pokreće dodatne paralelne zahtjeve.
- Promjena kontrole, panela, kampanje ili stanja, te pauziranje automatike otkazuje zastarjelo planiranje. Brzo ponovno pokretanje AI-ja nastavlja bez čekanja na stari rezultat.
- Worker prijavljuje greške pri pokretanju, prijenosu poruke i čitanju odgovora. Zahtjev koji ne odgovori u 30 sekundi završava porukom, a sljedeći pokušaj koristi novi worker. Automatsko igranje se zaustavlja nakon greške.
- Završeni i otkazani zahtjevi uklanjaju timere. Zakašnjela greška ugašenog workera ne prekida novi worker.
- `npm run render:map` je padao jer je fullscreen mapa zahtijevala `document.body` tokom serverskog renderiranja. Izvan browsera sada iscrtava mapu direktno; interaktivni browser prikaz zadržava dialog i portal.

## Iscrpljeni quest špilovi

Duge šesteročlane kampanje otkrile su stvarnu blokadu: Kel’Thuzad, seed **20261020**, nakon **3.417 naredbi**, i Kazzak, seed **20261022**, nakon **3.371 naredbe**. U oba slučaja Alijansa je završila podjelu nagrada, ali nije imala nijednu preostalu zelenu, žutu ili crvenu quest kartu. Engine je zahtijevao zamjenu, a sve naredbe izvlačenja bile su nelegalne.

Nova izričita naredba `skip-quest`, prikazana kao **Continue without a replacement quest**, završava taj korak samo kada su sva tri špila odgovarajuće frakcije prazna. Ne može zaobići predmete, relikvije ili talente na čekanju niti postojeći quest špil. Kod ukradenog questa provjerava i daje kontrolu frakciji čiji se quest zamjenjuje. Nagrade se ne dodjeljuju ponovo; nema izvlačenja sivih questova ni recikliranja odbačenih karata.

[Pravilnik, str. 21–22 i 37](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf) opisuje zamjenu iz zelenog/žutog/crvenog špila i nastavak varijante Defeat the Overlord. Ne navodi postupak za iscrpljenost sva tri špila u višekružnoj kampanji; nastavak bez izvlačenja ovdje je izričita odluka digitalne adaptacije. To nije novo pravilo o miješanju ili umnožavanju karata.

Naredba je aditivna: raniji potezi se replayaju istom semantikom i stari v7 zapisi ostaju učitljivi. Regresije u `quest-exhaustion.test.tsx` pokrivaju prazne i neprazne špilove, preostale nagrade, redoslijed faza, kontrolu frakcije, AI izbor i stvarno dugme u interfejsu. Oba originalna zaglavljena zapisa korištena su za provjeru nastavka.

## Provjera

Regresije pokrivaju stvarne React interakcije u `campaign-saves.test.tsx`, `campaign-polish.test.tsx` i `combat-control.test.tsx`, životni ciklus workera u `ai-worker.test.ts` te serverski izvoz mape u `audit-scripts.test.ts`.

| Provjera | Rezultat |
| --- | --- |
| `npm test -- --maxWorkers=2` | 1.056 testova u 47 datoteka prolaze; 34 nova regresijska testa |
| `npm run build` | TypeScript aplikacije i servera te Vite produkcijski build prolaze |
| `npm run check:render` | 621 komponenta, bez `undefined` / `NaN` sadržaja |
| `npm run render:map` | PNG 2070 × 1380 i SVG uspješno generisani |
| `npm audit --omit=dev --audit-level=high` | 0 prijavljenih ranjivosti |
| Nefarian, seed 20261021, casters | Završena partija: 883 naredbe, 12 questova, potez 22, neriješen ishod |
| Nezavisni `audit:session` tog zapisa | 884 provjerena stanja, identičan replay |
| Kel’Thuzad: nastavak zaglavljenog zapisa | Još 201 naredba; ukupno 3.618, lap 3 / potez 27; identičan replay i 3.619 nezavisno provjerenih stanja |
| Kazzak: nastavak zaglavljenog zapisa | Još 201 naredba; ukupno 3.572, lap 4 / potez 8; identičan replay i 3.573 nezavisno provjerena stanja |

[Mašinski čitljiv sažetak provjera](playtests/reliability-2026-10-20.json). Provjere nastavka su namjerno ograničene na 201 dodatnu naredbu i nisu završene Overlord pobjede. Nezavisni prolaz kroz njihove kompletne zapise provjerava revizije, potrošnju akcija, resurse, figure, inventar i replay. Postojeći `audit:session` zahtijeva završen ishod, pa je za ova dva zapisa korišten zaseban bounded replay s izričitim `completedCampaign: false`.

Nefarian proba se ponavlja naredbama:

```sh
npm run simulate -- 20261021 nefarian casters --output .local-data/review-2026-10-20/nefarian.session.json
npm run audit:session -- .local-data/review-2026-10-20/nefarian.session.json .local-data/review-2026-10-20/nefarian.audit.json
```

Izvoz mape daje PNG 2070 × 1380 i SVG; generisani PNG je vizuelno pregledan. Browser alat nije bio dostupan za ovaj prolaz: React interakcije su testirane u jsdom-u, bez tvrdnje o novom ručnom browser playtestu. Build zadržava ranija upozorenja za Zod PURE komentare i glavni bundle veći od 500 kB.
