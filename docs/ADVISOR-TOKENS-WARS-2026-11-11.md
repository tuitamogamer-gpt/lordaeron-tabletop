# Savjetnik za potez, žetoni, muzika u frazama i ratovi po pravilniku · 11. 11. 2026.

Nastavak poboljšanja nakon [prolaza kroz igru](PLAYTHROUGH-2026-11-11.md). Dvije stavke koje su tamo ostale otvorene sada su riješene: vrijeme provjere ratova i odustajanje od akcije.

## Savjetnik za potez

Na stolu, iznad questova, stoji kartica **Need a hint for <lik>?** s dugmetom **Hint** (tipka **H**). Planer koji vodi AI likove ocijeni sve akcije koje odabrani lik smije odigrati (Travel, Rest, Train, Town, Challenge, moći, Portal, Summon) i predloži najbolju, s razlogom:

| Prijedlog | Razlog |
| --- | --- |
| Travel to Brightwater Lake | This move reaches the quest “A Darkness in Brightwater”, to fight there with an ally. |
| Travel to The Uplands through Chillwind Point | Heading for the quest “Fishy Business” in Fenris Isle, to fight there with an ally; 1 more Travel action after this one. |
| Challenge the Wraith in North Tide’s Hollow with Brandon and Burbon | Fighting for the quest “Shades of Sorrow” with 3 characters: about 2 rounds and 3.2 wounds expected; low risk. |
| Rest: recover energy | Recovering 2 energy before the quest “A Hunger in the Vale”. |

- **Do this** odigra prijedlog, × ga odbaci. Bez potvrde igrača se ništa ne odigra.
- Prijedlog važi za stanje u kojem je tražen; svaka promjena na stolu ga briše.
- Planer dobija isti pogled na igru koji ima igrač (`view`), bez redoslijeda špilova i bez skrivenih Kazzakovih tragova.
- Računa se u Web Workeru, pa sto ostaje odzivan, i koristi težinu AI-ja iz postavki.
- Kartice nema u potezu AI-ja, za lik koji nema akcija i za lik kojeg vodi AI.

Razlozi u planeru su prepisani za igrača: navode quest i regiju, broj saveznika, preostale Travel akcije, očekivane runde i rane. Iste rečenice vidi i ko prati AI poteze.

## Pass: odustajanje od akcije

Pravilnik (str. 8) kaže da lik „may take two actions”, a igra je tražila da se obje potroše. Dugme **Pass** (ili **Pass 2 actions**) u kartici savjetnika troši preostale akcije odabranog lika; **Undo pass** ih vraća. Engine je za to već imao naredbu, putovanje bez koraka, koju koristi i AI. Pored plavog stvorenja Pass se ne nudi, jer sljedeća akcija mora biti Challenge (primjer na str. 11).

## Zdravlje i energija kao žetoni

Na odštampanom listu lika zdravlje i energija su žetoni, a ne trake. Tako je sada i u igri: po jedan žeton za svaki poen i prazno mjesto za svaki koji nedostaje do kapaciteta, s tačnim brojem pored. Kad su skenovi instalirani, žetoni su pravi skenirani; bez njih se crtaju crvena kap i plavi štit.

- **List lika:** zdravlje i energija stoje jedno pored drugog; žetoni se prelamaju u redove.
- **Borba:** na ekranima nižim od 800 px ikona, žetoni i broj stoje u jednom redu, pa zaglavlje lista ostaje nisko.
- **Viši nivoi** (do 14 poena): manji žetoni, u dva ili tri reda.

Stari stilovi traka (`.resource-track`, 20 pravila u devet datoteka) su uklonjeni.

## Muzika u frazama

Teme mape i borbe su petlje od 13,6 sekundi i svirale su bez prestanka, oko 260 ponavljanja na sat. Sada svaka tema svira u frazama: nekoliko ciklusa, stišavanje od 4 sekunde, pauza, sljedeća fraza.

| Tema | Fraze (ciklusi → trajanje) | Pauze između fraza |
| --- | --- | --- |
| Mapa | 4, 3, 4, 3 → 54 s, 41 s | 50 s, 80 s, 65 s, 100 s |
| Borba | 5, 4 → 68 s, 54 s | 20 s, 30 s |

- Tema borbe počinje s borbom, bez obzira na pauzu.
- Tema mape koju je prekinula borba sačeka kraj svoje pauze; ne počinje iznova nakon svake borbe.
- Ko uključi zvuk ili pomjeri glasnoću muzike čuje je odmah.
- U skrivenoj kartici preglednika raspored čeka.

**Settings › Sound** to kaže jednom rečenicom. Nije potrošen nijedan novi Fish Audio kredit. Duža muzika s više tema tražila bi nove snimke (oko 8.000 kredita po isječku od 15 sekundi).

> Naknadno, istog dana: vlasnik je odobrio nove snimke. Tema je sada sedam, pauze su kraće, a borba s Overlordom ima svoju temu: [MUSIC-THEMES-2026-11-11.md](MUSIC-THEMES-2026-11-11.md).

## Zvuk karte događaja

Karta događaja koja se riješi bez odluke (rat, većina svjetskih događaja) nije imala zvuk. Zvuk je bio vezan za popis događaja izvučenih u koraku, a engine taj popis isprazni u istoj naredbi. Sada prati hrpu odbačenih događaja, koja raste sa svakom izvučenom kartom.

## Ratovi po pravilniku (revizija pravila 3)

| | Pravilnik | Do sada | Sada (revizija 3) |
| --- | --- | --- | --- |
| Kada se rat ocjenjuje | Str. 26: nagradu dobija frakcija koja ima likove u obje regije „at the end of their opponents’ faction turn”. Str. 12: potez frakcije završava s tri koraka: Character Management, Advance Turn Marker, Event. | Prije pomjeranja markera i prije Event koraka. | Na kraju poteza: nakon što je marker pomjeren i karta događaja riješena. |

Razlika se vidi u dva slučaja:

- **Rat izvučen dok protivnik već stoji u obje regije.** Po pravilniku ga osvaja odmah, na kraju tog istog poteza. Ranije bi ga dobio tek cijeli krug kasnije, i to samo ako bi do tada ostao u obje regije.
- **Događaj koji u Event koraku pomjeri ili obori likove** (npr. Kel’Thuzadov Soul Taint pošalje lik na groblje). Ocjenjuje se stanje nakon njega.

Uz to:

- Nagrada za rat sada ima zapis u Chronicleu i obavijest na stolu, npr. „The Horde wins The Domination War, holding Balnir Farmstead and Corrahn’s Dagger: 5 gold and 4 XP for each of its characters.” Ranije su se samo promijenili brojevi zlata i XP-a.
- Kad marker uđe u polje **End** (varijanta sa završnim PvP-om), igra odmah prelazi u završnu bitku, kako piše na str. 12; taj potez nema Event korak ni kraj na kojem bi se rat ocijenio. U varijanti *Defeat the Overlord* traka se nastavlja i rat se ocjenjuje kao na svakom drugom potezu.
- **Započete kampanje se ne mijenjaju.** Kampanje s revizijom 1 ili 2 i dalje ocjenjuju ratove prije pomjeranja markera, pa se sačuvana lista naredbi odigra isto kao i ranije. **Settings** piše koju reviziju koristi otvorena kampanja.

## Prozor New talent

Prozor nije govorio za koga se bira talent. Kad dva lika pređu nivo odjednom, kao nakon rata, to se nije moglo znati. Sada piše ime i nivo: „Dongon Swiftblade · level 2” i „Dongon reached level 2: choose one permanent talent.”

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.189 testova u 69 datoteka prolazi (ranije 1.145 u 64); novi: `hints.test.tsx` (8), `resource-tokens.test.tsx` (6), `music-pacing.test.ts` (12), `war-timing.test.ts` (10), `war-news.test.ts` (5) i po jedan u `game-audio`, `decision-design` i `event-turn-audit` |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta |
| Ranije sačuvane partije | 27 partija iz prethodnih prolaza (25 prije revizija, jedna cijela kampanja s revizijom 2 od 3.809 naredbi) učitava se i odigra s novim engineom |
| AI kampanje s revizijom 3 | četiri završene partije, svaka s identičnim replayem (tabela ispod) |
| `audit:session`, Kel’Thuzad seed 2005 | 3.727 provjerenih stanja, 73 borbe, 40 događaja, identičan replay |
| Chromium, AI vodi svih šest likova | 3 minute (121 naredba, 4 poteza) na konačnom buildu: bez zastoja i bez grešaka u konzoli |
| Chromium, rat | Partija dovedena pravim naredbama do jednog poteza prije osvajanja rata: **End turn** daje obavijest o ratu, izbor talenta za dva lika koja su prešla nivo, zatim potez Horde 9; Chronicle ima zapis rata s oznakom poteza 9 |
| Chromium, muzika (pravi Web Audio) | Prva fraza počinje na 0,09 s, pojačava se do pune glasnoće za 1,5 s, stišava se od 50,5 s i završava na 54,55 s; sljedeća počinje na 104,54 s, nakon pauze od 50 s, i traje tri ciklusa. Bez grešaka u konzoli. |
| Chromium, savjetnik i žetoni | 1366 × 768 i 1280 × 720: kartica savjetnika s prijedlogom staje iznad akcija; telefon 390 × 844: kartica, prijedlog, list lika i borba. Žetoni provjereni za likove 2. i 5. nivoa na listu lika i 1. i 5. nivoa u borbi. |

AI kampanje s revizijom pravila 3, uz provjeru stanja nakon svake naredbe:

| Komanda | Naredbi | Questova | Ishod | Replay |
| --- | --- | --- | --- | --- |
| `npm run simulate -- 2005 kelthuzad` | 3.726 | 49 | Alijansa pobjeđuje Kel’Thuzada | identičan |
| `npm run simulate -- 23 kelthuzad casters` | 3.809 | 58 | Horda pobjeđuje Kel’Thuzada | identičan |
| `npm run simulate -- 71 nefarian casters` | 1.082 | 17 | neriješeno kod Bulwarka | identičan |
| `npm run simulate -- 99 kazzak casters` | 6.088 | 72 | Horda pobjeđuje Kazzaka | identičan |

Brojevi su isti kao s revizijom 2. AI ne igra na ratove, pa novi redoslijed u ove četiri partije nije promijenio nijednu odluku. U kampanji 2005 Horda je osvojila The Andorhal War (naredba 3.185), u koraku u kojem je izvučen The Hinterlands War; u ostale tri (pet, pet i dva izvučena rata) nijedan nije osvojen.
