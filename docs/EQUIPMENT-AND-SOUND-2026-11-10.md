# Oprema, ujednačene karte i zvuk · 10. 11. 2026.

## Oprema: sva mjesta i čitljive karte

U prozoru **Character management** mjesta za opremu stajala su u traci koja se pomjera vodoravno, u kolonama od 155 px. Na 1366×768, pa i na 1920×1080, vidjela su se samo mjesta 1–4, pa su **05 Melee (oružje), 06 General i 07 Armor (oklop)** izgledala kao da ne postoje. Ponuđene karte bile su visoke 210 px, pa je njihov tekst bio oko 4 px, a na telefonu su lica karata u mjestima bila razvučena.

- **Sva mjesta odjednom.** Svih 7 mjesta (8 uz Hood of Shadow) stoji u mreži 4 × 2 na svakoj veličini ekrana, bez vodoravnog pomjeranja.
- **Velika karta.** Ponuđene karte su redovi s malim licem, a karta pod mišem ili fokusom tastature prikazuje se desno, onoliko velika koliko ekran dozvoljava: 278×426 px na 1366×768, 247×378 na 1280×720 i 358×548 na 1920×1080. Ispod piše je li karta već u mjestu („In slot 05”) ili još nije opremljena, a prelazak preko nje i dalje otvara sve jačine.
- **Telefon i tablet.** Četiri mjesta u redu, lica zadržavaju omjer, a velika karta je široka do 300 px.
- **Dosije lika.** Umjesto samo posivljenog dugmeta Manage, odjeljak opreme piše kada se oprema mijenja: „Equipment changes once every ally has used both actions”, odnosno „Open Manage to change equipment”.

Kako se oprema mijenja: kada svi likovi tvoje frakcije potroše obje akcije, pojavljuje se **Manage equipment**, zatim **Equip <lik>**. Izabereš mjesto, pa kartu, pa **Confirm equipment**. Kupljeni predmeti i nagrade čekaju u torbi (tab **Bag** u dosijeu) i odatle se opremaju.

| Veličina | Vidljiva mjesta prije | Poslije |
| --- | --- | --- |
| 1366×768 | 4 od 7 | 7 od 7 |
| 1280×720 | 4 od 7 | 7 od 7 |
| 1920×1080 | 4 od 7 | 7 od 7 |
| 390×844 (telefon) | 3 od 7, ostalo ispod | 7 od 7 na prvom ekranu |
| 820×1180 (tablet) | 6 od 7 | 7 od 7 |

## Ujednačen rub karata

Skenovi su stigli izrezani na tri načina: neki s cijelim odštampanim rubom i bijelom pozadinom skenera u uglovima (predmeti s trouglom), neki s crnom marginom skenera, širom s jedne strane nego s druge (kvadrat, special, Hunter), a mnogi izrezani unutar ruba, pa okvir ide do same ivice (krug, većina klasnih karata, npr. Moonfire bez desnog ruba). U redu kod trgovca ili u spellbooku izgledale su kao karte iz različitih štampanja.

Svih 386 takvih lica (klasne karte, predmeti iz četiri špila i početne karte s listova likova) sada je izrezano do odštampanog okvira i postavljeno u isti crni rub, 3,5 % širine karte, sa zaobljenim providnim uglovima. Questovi, eventi i Overlord listovi već su bili ujednačeni i nisu dirani.

- `scripts/card-border.ts` nalazi okvir: preskače bijelu pozadinu skenera i sive piksele prijelaza, pa redove i kolone koji su većinom crni. Strana bez crnog ostaje kakva jeste.
- `npm run scans:prepare` dodaje rub sam, a `npm run scans:border` ga je dodao već pripremljenim licima, bez originalnih skenova. Oznaka u datoteci sprečava dvostruki rub.
- Nakon ruba omjer svih lica je između 0,640 i 0,685, a svaka strana svakog lica je unutar −1/+3 px od ciljane debljine. Test `scan-asset-files.test.ts` to provjerava na svim licima.

## Zvuk i muzika (Fish Audio)

Fish Audio u ovoj vezi nema poseban generator muzike ni zvučnih efekata. Glasovi su napravljeni njegovim TTS-om (model drama-3), a muzika i efekti su zvučni zapis njegovog video modela heygen-video-1, koji uz kratki video generiše i zvuk; koristi se samo zvuk. Vlasnik je odobrio trošak prije generisanja.

| Šta | Količina | Krediti |
| --- | --- | --- |
| Muzika (2 × 15 s video) | mapa, borba | 15.900 |
| Efekti (6 × 5 s video) | kocke, mač, karta, zlato, novi nivo, pobjeda | 15.900 |
| Glasovi (16 linija TTS) | bojni poklič, potez, quest, nivo, kraj, Overlordi… | 706 |
| Ukupno | | 32.506 (preostalo 212.088) |

Analiza prije upotrebe: obje muzike su tonalne (vrhovi na tonovima C, G i D) i stalne glasnoće, bez tišine; mač ima metalni ton s odjekom, novčići visok šum, fanfara tonalni bakar. Efekti su izrezani na sam zvuk (1,2–3,9 s), muzika je pretvorena u petlje od 13,6 s bez šava (zadnjih 1,5 s pretapa se u početak), a sve je ujednačene glasnoće.

| Zvuk | Kada se čuje |
| --- | --- |
| Muzika mape / borbe | na stolu / u borbi, s pretapanjem |
| Mač + bojni poklič („For the Horde!”, „For the Alliance!”) | početak borbe |
| Mač + linija Overlorda (Kel’Thuzad, Nefarian, Kazzak) | početak borbe protiv Overlorda |
| Kocke | bacanje i ponovno bacanje |
| Karta + „Fate turns…” / „A new quest awaits.” | event / novi quest |
| „The auction begins!” | aukcija |
| Zlato | promjena zlata |
| Novi nivo + „Level up!” | lik napreduje |
| „Quest complete!” | završen quest |
| „I will return…” | pali lik |
| „The Horde marches.” / „The Alliance marches.” | potez druge frakcije |
| Fanfara + pobjednik ili „Both factions have fallen. Nefarian reigns.” | kraj kampanje |

- Zvuk prati promjene stanja igre, pa se isto čuje bez obzira je li potez napravio igrač ili AI. Po promjeni se pušta najviše jedan efekat i jedan glas, po važnosti; glasovi se ne preklapaju, a ista stvar se ne ponavlja u roku od 0,35 s. Nova ili uvezena partija i Undo su tihi.
- Preglednici dozvoljavaju zvuk tek nakon prvog klika ili tipke, pa muzika kreće tada. Skriven tab utišava zvuk.
- **Zvučnik u zaglavlju** uključuje i isključuje sve. **Settings › Sound**: muzika (35 %), efekti (80 %) i glasovne linije. Izbor se pamti u pregledniku.
- Glasovi su zvanični Fish glasovi (Adrian, Ethan), ne kloniranje glumaca ili likova, a linije su nove, ne citati iz igara.
- Datoteke: `public/assets/audio/` (24 MP3, 0,85 MB). Sirovi snimci su lokalno u `.local-data/audio/raw`, a obrada je `python3 scripts/prepare-audio.py`. Kod: `src/campaign/audio.tsx`, testovi `tests/game-audio.test.ts`.

Promptovi za video model (480p, 16:9):

- Mapa (15 s): „Slow camera drift over an old hand-painted fantasy war map lit by candles… calm, majestic medieval fantasy orchestral music with a gentle steady pulse – soft strings, a warm French horn melody, harp arpeggios, a light frame drum. Instrumental music only, no voices…”
- Borba (15 s): „Torchlit close-up of huge war drums… intense epic fantasy battle music with a driving steady rhythm – pounding war drums, low brass ostinato, fast staccato strings, a wordless male choir…”
- Efekti (5 s): kocke u kožnoj čaši bačene na drveni sto; mač koji jednom udari u gvozdeni štit; karta povučena i okrenuta na stolu; šaka zlatnika na stolu; runa koja zasja uz uzlazni čarobni zvon; kratka trijumfalna fanfara truba uz timpane. Svaki prompt traži samo taj zvuk, bez muzike i glasova.

## AI protiv Nefariana: mjerenje bez izmjene

Otvoren zadatak iz [AI-NEFARIAN-2026-10-30.md](AI-NEFARIAN-2026-10-30.md) bio je brži razvoj do nivoa 5. Na istih 24 seeda (309–320 standardni likovi, 321–332 casteri) izmjerene su dvije varijante:

| | Sadašnji AI | A: AI računa bonus XP za quest iznad nivoa | B: A + XP vrijedi više dok Nefarian maršira |
| --- | --- | --- | --- |
| Pobjede | 4 / 24 | 4 / 24 | 6 / 24 |
| Prosječan nivo na potezu 10 / 20 / 30 | 1,97 / 2,93 / 3,71 | 1,97 / 2,91 / 3,72 | 1,97 / 2,92 / 3,75 |
| Nivo heroja pri Nefarianovom dolasku | 3,67 | 3,61 | 3,67 |

Nijedna varijanta ne ubrzava razvoj, a razlika u pobjedama je u granicama slučajnosti, pa AI nije mijenjan. Razlog je u samoj igri: do dolaska (u prosjeku 30. potez) heroji završe oko 17–22 questa, svaki donosi 4–7 XP bez obzira na težinu, a 59 % akcija odlazi na putovanje. Nivo 5 traži 28 XP po heroju, a XP stiže samo iz questova; preraspodjela težina to ne mijenja.

## Zavisnosti

`npm audit` je prijavio 7 ranjivosti (zod, vite, sharp, undici, vitest, source-map-js). Sve su ispravljene unutar postojećih raspona verzija, pa se mijenja samo `package-lock.json`; sada je 0.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.119 testova u 60 datoteka prolaze; novi: `card-border.test.ts` (4), `game-audio.test.ts` (6), veliki pregled karte u `card-presentation.test.tsx` (1), provjera ruba svih 386 lica u `scan-asset-files.test.ts` |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta |
| Chromium, prozor opreme | 7 od 7 mjesta na 5 veličina, bez vodoravnog skrolanja |
| Chromium, zvuk | prije prvog klika nijedan zahtjev; nakon klika muzika mape (13,6 s) učitana i pokrenuta; kraj poteza pušta „The Alliance marches.”, napad AI-ja mač, „For the Alliance!”, muziku borbe i kocke; bez grešaka u konzoli |
| 72 AI simulacije protiv Nefariana | sve završene |
