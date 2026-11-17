# Čiji je grad i čiji je let · 17. 11. 2026.

Zahtjev: „Na mapi nije jasno koji je čiji town i flight path. Sredi to.”

Gradovi, letovi i groblja sada imaju svoje oznake u boji frakcije, ključ u legendi i ispisanu frakciju svuda gdje se polje opisuje. Žetoni im ostavljaju mjesta.

## Šta je nađeno

Objavljena verzija je izmjerena u Chromiumu prije izmjene.

- **Oznaka je bila sićušna.** Grad, let i groblje bili su jedan znak ispod imena polja. Na stolu (1366 × 768) znak leta i grada zajedno je imao 16 × 6 px, sam let 10 × 5 px. Na telefonu 8 × 3 px.
- **Jedna boja za cijeli znak.** Boja je uzimana od leta i bila je blijeda: losos za Hordu, svijetloplava za Alijansu. Grad nije imao svoju boju.
- **Legenda ih nije spominjala.** Pisalo je „Passable, Impassable, Range 1–2, Stop movement, Horde, Alliance”; zadnje dvoje su boje žetona questova. Šta je znak s krilima, a šta kućica, nigdje nije pisalo.
- **Opis polja nije imenovao frakciju.** Ispod mape je pisalo „Starting region · Town · Flight”. Znak je imao opis „Flight: horde · Town: horde”, ali on se nije mogao vidjeti, jer znak nije primao miša.
- **Linija leta je bila svijetloplava i za Hordu**, a plava je na mapi boja Alijanse.

U provjeri mape od 12. 11. ([MAP-AUDIT-2026-11-12.md](MAP-AUDIT-2026-11-12.md)) zapisao sam da ključ štampane table ima „iste oznake na poljima” i da razlike nema. Oznake su postojale, ali se s njih nije moglo pročitati čije su. Ta ocjena je bila preblaga.

## Šta je sada

### Oznake

Štampana tabla ima ključ s pet oznaka: Alliance City, Horde City, Alliance Flight Path, Horde Flight Path i Graveyard. Mapa sada ima istih pet.

| Oznaka | Izgled | Boja |
| --- | --- | --- |
| Grad | štit s kulom | crvena za Hordu, plava za Alijansu |
| Let | disk s krilima | crvena za Hordu, plava za Alijansu |
| Grad ili let obje frakcije | isti oblik | lijeva polovina crvena, desna plava |
| Groblje | nadgrobni kamen s krstom | siva |

Crvena i plava su iste boje koje već nose prstenovi heroja i žetoni questova. Oblik kaže šta je oznaka, a boja čija je.

| Gdje | Prije | Sada |
| --- | --- | --- |
| Sto, 1366 × 768 | let i grad zajedno 16 × 6 px | grad oko 15 × 19 px, let oko 31 × 13 px |
| Mapa preko cijelog ekrana, kako se otvori | 45 × 17 px | grad 28 × 35 px, let 59 × 25 px |
| Telefon, umanjeni prikaz | 8 × 3 px | grad oko 11 × 13 px, let oko 23 × 10 px |
| Telefon, mapa preko cijelog ekrana | 20 × 7 px | grad 17 × 22 px, let 36 × 15 px |

Na stolu je cijela tabla nacrtana na oko trećinu veličine koju ima kad se mapa otvori preko cijelog ekrana. Zato su oznake tamo nacrtane 1,4 puta veće (na telefonu 2,1 puta, na velikom ekranu 1,15 puta), da im se boja i oblik i dalje vide.

### Ključ u legendi

Legenda ispod mape sada ima dva dijela. Prvi je kao i prije: prolazna i neprolazna granica, domet, plava stvorenja. Drugi je ključ table:

> **Horde** štit town · krila flight path · žeton quest — **Alliance** isto u plavoj — **Both** dvobojni štit i krila — Graveyard

Gdje oba dijela ne stanu u jedan red (na 1280 × 720 i na tabletu), svaki ide u svoj red. Na telefonu ključ zauzima dva reda.

### Frakcija je ispisana

- **Red ispod mape** (mapa preko cijelog ekrana): umjesto „Starting region · Town · Flight” stoje pločice „Horde starting region”, „Horde town”, „Horde flight path”, u boji frakcije i sa sličicom oznake.
- **Region details**: za svaku oznaku piše čemu služi, kuda let vodi i da li je otvorena liku koji je na potezu. Na primjer: „Alliance town … Closed to Grumbaz (Horde).” i „Flies to Southshore, Sorrow Hill or Pestilent Scar”.
- **Pokazivanje mišem na oznaku** otvara isti opis odmah na mapi, i na stolu i preko cijelog ekrana. Na mapi preko cijelog ekrana klik na oznaku bira polje.
- **Ime polja za čitač ekrana i opis polja**: „Brill · Horde starting region · Horde town · Horde flight path”.
- **Map rules** (dugme sa znakom pitanja) ima rečenicu o bojama.

### Kuda let vodi

Kad se preko cijelog ekrana odabere polje s letom, od njega se tačkastim lukovima u boji frakcije crtaju svi letovi te frakcije. Od Brilla tri crvena luka, od Pestilent Scara tri crvena i tri plava. Let koji lik planira crta se u boji njegove frakcije, a ne uvijek plavo.

### Žetoni ostavljaju mjesta

Stari znak je bio toliko mali da ga žetoni nisu prekrivali. Veće oznake traže mjesto: uz stari raspored žetoni bi stajali na njima u svakom četvrtom slučaju na stolu. Zato su oznake sada prepreka pri raspoređivanju žetona, kao drugi žeton, što je jače od izbjegavanja imena polja. Oznake same biraju mjesto unutar svog polja. Tamo gdje ispod imena nema mjesta, red se pomjera u stranu ili iznad imena. Krst groblja Ruins of Andorhala je i ranije stajao preko granice, donjom polovinom na Sorrow Hillu; veći kamen bi većim dijelom stajao tamo, pa je sada iznad imena, u svom polju. Mjesto zavisi samo od polja, pa se oznaka ne pomjera tokom partije.

## Popis

| Polje | Grad | Let |
| --- | --- | --- |
| Brill (početno polje Horde) | Horda | Horda |
| North Tide’s Hollow | Horda | Horda |
| Caer Darrow | | Horda |
| Southshore (početno polje Alijanse) | Alijansa | Alijansa |
| Aerie Peak | Alijansa | Alijansa |
| Sorrow Hill | | Alijansa |
| Pestilent Scar | obje | obje |

Groblja: Olsen’s Farthing, Ruins of Andorhal, Quel’Danil Lodge, Corin’s Crossing.

Po pravilima: Town akcija (kupovina, prodaja, trening) traži grad svoje frakcije, a odmor u njemu vraća 3 boda po nivou umjesto 2. Let s jednog polja svoje frakcije na bilo koje drugo je jedan korak putovanja. Poraženi lik se vraća na najbliže groblje ili na početno polje svoje frakcije.

## Provjera

Sve je mjereno u Chromiumu na konačnoj verziji.

| Šta | Rezultat |
| --- | --- |
| Žetoni na oznakama, 2.400 položaja iz 40 partija (13.162 žetona u poljima s oznakama) | na mapi preko cijelog ekrana nijedan žeton ne dodiruje oznaku; na stolu, gdje su oznake veće, dodiruje je 0,5 %, nijedan za više od 10 jedinica table. Uz stari raspored bilo bi 12 %, odnosno 23 % |
| Oznake unutar svog polja | svih 16, na obje table; najtješnje je u Brillu, gdje vrh krila prelazi granicu za 3 jedinice table |
| 43 ekrana na računaru (1366 × 768), telefonu i tabletu u oba položaja | bez grešaka u konzoli, bez vodoravnog pomjeranja, bez odsječenog teksta i bez kontrola izvan ekrana, kao i u prethodnom prolazu. Sama mapa je snimljena i na 1280 × 720 i 1920 × 1080, bez grešaka |
| Igra samih botova | 2 minute, 59 naredbi, bez zastoja i grešaka |

`npm test`: **1.438 testova** u 87 datoteka, 13 više nego u prethodnom prolazu. Novi `tests/map-services.test.tsx` provjerava frakciju svake oznake, da mapa za let kaže isto što i pravila putovanja, da odmor u gradu daje tri boda koja oznaka obećava, da je svaka oznaka u svom polju, da žetoni ne staju na oznake, ključ u legendi, opis pod mišem, pločice i lukove leta. `npm run build` i `npm run check:render` (621) prolaze.

## Granice

- Žetoni u jedanaest polja s oznakama sada češće rubom prelaze granicu polja: 56 % umjesto 44 % ih dodiruje liniju granice, a 64 od 13.162 stoje gotovo napola preko nje (ranije 16). Središte svakog žetona ostaje u njegovom polju.
- Na samoj tabli frakciju nosi samo boja. Ko ne razlikuje crvenu i plavu, frakciju čita iz teksta: u legendi, u opisu pod mišem i u redu ispod mape.
- U umanjenom prikazu na telefonu oznake su i dalje male, grad oko 11 × 13 px; tamo je cijela tabla široka koliko i ekran.
- Lukovi leta se crtaju samo na mapi preko cijelog ekrana i samo za odabrano polje.
- Provjereno je u Chromiumu, na računaru i u emulaciji telefona i tableta. Safari, Firefox i pravi uređaji nisu isprobani.

## Datoteke

- `src/campaign/map-services.ts`: šta polje nudi i kome, riječima; mjere oznaka.
- `src/campaign/MapServices.tsx`: crtež oznaka, za tablu i za tekst.
- `src/campaign/token-layout.ts`: mjesto oznaka u polju i prostor koji žetoni ostavljaju.
- `src/campaign/Map.tsx`, `map.css`: oznake na mapi, ključ, pločice, opis, lukovi leta.
- `tests/map-services.test.tsx`.
