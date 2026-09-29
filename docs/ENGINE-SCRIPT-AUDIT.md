# Engine i skripte · 29. 9. 2026.

Aktivni paket je `base-2005-faq-1.4-v7`. Završna provjera prolazi **838/838 testova u 25 datoteka**, TypeScript aplikacije i servera, Vite build, render 621 komponente i izvoz mape. Tri nove AI kampanje završene su nakon ukupno **4.312 naredbi**; zaseban replay audit provjerio je **4.315 stanja**. [Sažetak rezultata](playtests/engine-audit-2026-09-29.json).

## Ispravke

| Problem | Rezultat |
| --- | --- |
| Vanish je zadržavao kockice i Reroll zamijenjenog luka uz novi Stealth | Zamjena na početku Dice Pool koraka uklanja već obračunate bonuse stare karte. Provjereni su štampani luk, Ravenwood Bow i postojeći Unholy Power / Demon Armor tok. |
| Ponovni spawn questa nakon New Horizons mogao je duplirati ID preostale plave figure | Nova figura dobiva slobodan deterministički ID; ranije figure i fizičke zalihe ostaju očuvane. |
| `closeBattle` se mogao prihvatiti i tokom podjele nagrada | Engine odbija ponovno zatvaranje rezultata nakon izlaska iz combat faze. |
| `--trace` se u izvještaju simulacije mogao prikazati kao ime postave; tipfeler postave se ignorisao | CLI odvojeno parsira opcije i pozicione argumente te odbija nepoznatu postavu, Overlorda i neispravne limite. |
| Render mape je pretpostavljao postojanje `.local-data` direktorija | Skripta kreira odredište prije pisanja SVG-a. Replay audit također kreira direktorij izvještaja. |
| Rest dijalog je tvrdio da se Curse uklanja samo u gradu | Tekst sada navodi jedan Curse u divljini i sve u prijateljskom gradu, kao postojeći engine. |

Vanish i Unholy Power provjereni su na lokalnim originalima `Classes/Rogue/Layer 3.png` i `Classes/Warlock/Layer 9.png`, indeksiranim u [manifestu skenova](sources/base-scans-manifest.json). Novi testovi su u [engine-script-audit.test.ts](../tests/engine-script-audit.test.ts) i [audit-scripts.test.ts](../tests/audit-scripts.test.ts).

## Simulacije i audit

| Overlord / postava | Seed | Naredbe | Provjerena stanja | Questovi | Borbe | Ishod |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Kel’Thuzad / default | 20260929 | 1787 | 1788 | 21 | 30 | Horda, završni PvP u potezu 30 |
| Nefarian / casters | 337 | 1260 | 1261 | 17 | 23 | Alijansa, završni PvP u potezu 30 |
| Kazzak / casters | 2026 | 1265 | 1266 | 20 | 27 | Horda, završni PvP u potezu 30 |

Svaka simulacija provjerava stanje nakon svake naredbe, izvozi stvarni dnevnik i poredi završno stanje sa strogim importom. `audit:session` ponovo primjenjuje taj dnevnik i poredi rezultat, uz provjeru cijene akcija, nagrada, talentâ, resursa, figura i D8 zaliha. Obje skripte koriste isti skup invarijanti u `scripts/assert-state.ts`, uključujući jedinstvenost figura i figure zadržane kao trofeji.

Provjeren je i prekinuti run s `--max-commands 1`: izvozi djelimični dnevnik i vraća exit code 1 jer kampanja nije završena. Pune partije i detaljni audit izvještaji ovog prolaza su lokalno u `.local-data/engine-audit-2026-09-29/`.

```sh
npm test
npm run build
npm run check:render
npm run render:map
npm audit --omit=dev --audit-level=high
npm run simulate -- 20260929 kelthuzad --output .local-data/engine-audit-2026-09-29/kelthuzad.session.json
npm run simulate -- 337 nefarian casters --output .local-data/engine-audit-2026-09-29/nefarian.session.json
npm run simulate -- 2026 kazzak casters --output .local-data/engine-audit-2026-09-29/kazzak.session.json
npm run audit:session -- .local-data/engine-audit-2026-09-29/kelthuzad.session.json .local-data/engine-audit-2026-09-29/kelthuzad.audit.json
npm run audit:session -- .local-data/engine-audit-2026-09-29/nefarian.session.json .local-data/engine-audit-2026-09-29/nefarian.audit.json
npm run audit:session -- .local-data/engine-audit-2026-09-29/kazzak.session.json .local-data/engine-audit-2026-09-29/kazzak.audit.json
```

## Save i browser

Ispravke mijenjaju replay semantiku, pa v7 koristi zaseban autosave `lordaeron-base-save-v7`. V6, v4 i v3 zapisi ostaju netaknuti; najnoviji prethodni zapis može se preuzeti u Settings. Import starog paketa se odbija umjesto tihog izvršavanja njegovih naredbi pod novim pravilima. Testovi provjeravaju očuvanje v6 i v4 zapisa. Ranija ručna 2v2 partija od 684 naredbe prošla je audit prije izmjene verzije; njen arhiv nije prepisan.

U Chromeu je provjeren lokalni setup kroz sva četiri koraka, početak partije, vizuelni prikaz ploče, ispravljeni Rest tekst i smanjenje broja akcija s 2 na 1. Web Worker je vodio AI likove kroz legalno putovanje, a Pause AI je zaustavio automatske poteze. Nije odigrana nova puna ručna partija u browseru.

Produkcijske zavisnosti imaju 0 prijavljenih ranjivosti prema `npm audit --omit=dev`. Build zadržava postojeća upozorenja za Zod PURE komentare i glavni bundle veći od 500 kB. Dva pokušaja testiranja istovremeno s više punih simulacija prešla su UI vremenske limite; završni obični `npm test`, nakon simulacija, prolazi svih 838 testova za 18,27 s bez promjene tih limita. Ovo nije iscrpna provjera svih kombinacija karata niti dokaz optimalnosti AI strategije; online razvoj ostaje na čekanju.
