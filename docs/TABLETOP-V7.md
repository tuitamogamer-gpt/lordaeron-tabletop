# Tabletop v0.7 · karte, questovi i reljef

Cijelo lice svake Power, Talent, Equipment, Racial, Quest, Event, Creature i Overlord karte sada je imagegen bitmap: okvir, ilustracija, naslovna pločica i pergament su dio jedne slike. Nazivi, brojevi i pravila ostaju živi tekst iz verificiranog paketa. Duge opise moguće je skrolati unutar karte i otvoriti u detaljima.

521 WebP lice pokriva 406 karata likova/predmeta, 80 questova, 19 ilustriranih tema za 52 eventa i 16 bestiary/Overlord karata. Manifest ima 573 ključa, uključujući alias svakog eventa. Quest journal ima ilustrirane ugovore, napredak po meti i lokaciji, briefing, raspodjelu nagrada i povezivanje s mapom.

## Scripted rewards

`src/rules/reward-engine.ts` kompajlira svaki Reward u serijalizabilan program: experience → gold → draw/keep-one za svaki simbol → special izbor → replace-quest. Interpreter automatski prolazi do narednog izbora i pamti cursor, status, izračunatu raspodjelu i receipts. Quest XP se prilagođava nivou; poraženi učesnici dobijaju XP, a zlato i predmete dobijaju preživjeli. RNG za podjelu ostaje seedovan.

Izbor predmeta prolazi kroz provjeru kapaciteta torbe. Neizabrani obični predmeti vraćaju se u svoj špil, a neizabrani named predmeti ostaju dostupni. Prazni špilovi se preskaču. Nije moguće zamijeniti quest prije završene dodjele. Stari v6 autosave bez polja `resolution` koristi kompatibilni queue put; content fingerprint i ključ sačuvane partije ostaju isti.

## Mapa i kockice

Mapa ostaje Lordaeron u Eastern Kingdoms, područje originalne base igre. Reljef razdvaja Tirisfal, Silverpine, Alterac, Hillsbrad, oba Plaguelands i Hinterlands. Jezera, obale, snijeg, šume i visinske razlike su ilustrirani prema rasporedu lokacija. Ovo je stilizirana rekonstrukcija table, ne geodetski model Azerotha. Granice 67 polja i legalni graf prolaza nisu mijenjani.

Svaki prisutni junak ima portret, frakcijski obruč, ime i nivo. Overlord ima veći portret i krunu. Svaka kombinacija vrste i boje miniona ima zaseban portret i brojač; odabrana regija prikazuje i tekstualan spisak jedinica. Kazzak zadržava skrivene tragove dok se ne otkrije. Pregled mape ima dovoljno veliku površinu za čitljive tokene, sa sticky akcijama.

D8 koristi osam numerisanih 3D ploha pravog oktaedra (6 vrhova, 8 trougaonih strana), sa osvijetljenim plohama, rezultatom i postojećim red/blue/green bojama. Reroll, Spot, uklanjanje i selekcija ostaju vezani za stvarno stanje enginea.

Izvori za geografiju i oblik: [Blizzard · Getting Around Azeroth](https://news.blizzard.com/en-us/article/23156366/wow-classic-getting-around-azeroth), [Blizzard · Naxxramas](https://worldofwarcraft.blizzard.com/news/23572632/wow-classic-naxxramas-is-now-live), [Die Hard Dice · D8 octahedron](https://www.dieharddice.com/pages/test-dnd-dice-explained), [Apple TabletopKit · octahedron](https://developer.apple.com/documentation/tabletopkit/tossablerepresentation). Pravila, boje kockica i graf table dolaze iz postojećeg base paketa i originalnog pravilnika.

## Asseti i reprodukcija

Generisano ugrađenim `image_gen.imagegen` alatom; slike nisu skenovi originalnih karata. Cijeli promptovi, batch raspored i izlazna odredišta su u [imagegen-v7-prompts.json](imagegen-v7-prompts.json). Očišćene granice ćelija i WebP priprema su u `scripts/prepare-full-cards.ts`. Dva korektivna sheeta popravljaju rubnu kolonu ability karata i anatomiju Wildkina.

- `public/assets/full-cards/*.webp`: kompletna lica 384 × 576.
- `public/assets/tokens/*.webp`: izolirani portreti miniona 128 × 128.
- `public/assets/warcraft/lordaeron-relief-v3.webp`: reljef 2400 × 1600.
- `src/data/full-cards.json`: mapiranje sadržaja na lica.

Izvorni PNG sheetovi su lokalno u `.local-data/full-card-sources/`, isključeni iz Gita. Za ponovnu pripremu sa sačuvanim izvorima:

```sh
npx tsx scripts/prepare-full-cards.ts
npx tsx scripts/prepare-map-assets.ts
npm run render:map
```

## Provjera

268 testova; 621 server render. Testovi pokrivaju sva puna lica, stvarni izbor nagrade, sve quest programe, višestruke draw korake, prazne špilove, named predmete, kapacitet torbe, serijalizaciju/replay i zaštitu od duplog završetka questa.

Tri kampanje završene uz identičan replay:
- Kel’Thuzad / seed 2005: 968 komandi, 12 questova, Alliance, turn 30.
- Nefarian / seed 71 / casters: 484 komande, 3 questa, draw, turn 25.
- Kazzak / seed 99 / casters: 1383 komande, 15 questova, Alliance, turn 30.

Chrome provjera obuhvata novu kampanju, mapu, questove, puna lica Ability/Event/Quest karata, d8 stanja i stvarnu dodjelu izabrane nagrade kroz React + engine. Lokalni QA fixture nije dio produkcije.
