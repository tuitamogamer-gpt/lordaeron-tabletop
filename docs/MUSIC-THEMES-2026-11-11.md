# Sedam muzičkih tema i petlje bez rupe · 11. 11. 2026.

Igra je imala dvije teme, jednu za mapu i jednu za borbu. Sada ih ima sedam: četiri za mapu, dvije za borbu i jednu za borbu s Overlordom. Pri obradi je nađena i ispravljena rupa od 51 ms tišine na svakom ponavljanju stare dvije teme.

## Šta se čuje

| Scena | Teme (redom) | Fraze | Pauze između fraza |
| --- | --- | --- | --- |
| Mapa | `map`, `map-road`, `map-blight`, `map-council` | 4, 3 ili 4 ciklusa (54 s ili 41 s) | 40 s, 60 s, 50 s |
| Borba | `battle`, `battle-charge` | 5 ili 4 ciklusa (68 s ili 54 s) | 15 s, 25 s, 20 s |
| Borba s Overlordom ili drugim bossom | `boss`, zatim `battle` | 5 ili 4 ciklusa | 12 s, 18 s, 15 s |

- Svaka fraza svira sljedeću temu svoje scene, pa se ista tema vrati tek nakon ostalih. Na mapi je to svakih šest do sedam minuta.
- Na mapi i u borbi sesija počinje nasumično odabranom temom. Borba s bossom uvijek počinje temom `boss`.
- Pauze su kraće nego jutros (bile su 50–100 s na mapi), jer se muzika sada mijenja.
- Ostalo je kao u [rasporedu po frazama](ADVISOR-TOKENS-WARS-2026-11-11.md): muzika borbe počinje s borbom, mapa nakon borbe sačeka kraj svoje pauze, a uključivanje zvuka ili pomjeranje glasnoće pušta muziku odmah.

Tema koja ne odgovara uklanja se brisanjem njenog imena iz `THEMES` u `src/campaign/audio.tsx`.

## Nove teme (Fish Audio)

Vlasnik je odobrio trošak od oko 8.000 kredita po isječku. Napravljeno je pet isječaka od 15 sekundi modelom heygen-video-1 (480p, 16:9); koristi se samo zvučni zapis.

| | Krediti |
| --- | --- |
| 5 × 15 s | 39.750 (5 × 7.950) |
| Stanje prije | 212.088 |
| Stanje poslije | 172.338 |

| Tema | Opis iz prompta | Izmjereno na snimku |
| --- | --- | --- |
| `map-road` | blaga pastoralna muzika u hodu: lutnja, drvena flauta, ručni bubanj, violončelo | ujednačena (raspon 9 dB), tonovi F, G, C, E, puls oko 78 ili 156 u minuti |
| `map-blight` | spora, mračna: niski gudači, solo violončelo, daleko zvono, tihi hor | pojačava se iz tišine (raspon 20 dB), tonovi C, F, C♯ |
| `map-council` | dostojanstven marš umjerenog tempa: bubanj, timpani, limeni koral, gudači | ujednačena (8 dB), tonovi D, C, F, B♭, puls oko 67 ili 134 |
| `battle-charge` | brza, užurbana: gudački ostinato, doboš i taiko, trube i rogovi | ujednačena (6 dB), ton F, puls oko 156 |
| `boss` | zloslutna, teška i spora: ogromni bubnjevi, orgulje, duboki muški hor, zvono | pet sekundi tiše, zatim udar i puna snaga (raspon 15 dB), tonovi D, F, A, C |

Muziku ne mogu čuti. Provjere su mjerenja: sve teme su tonalne, bez tišina i bez padova glasnoće. Da li zvuče kako treba, presuđuje se slušanjem u igri.

Promptovi:

- **map-road:** „A lone rider on a winding road through green hills at dawn, a walled town far ahead, mist in the valleys. Soundtrack: gentle pastoral medieval fantasy folk music with a steady walking pulse - a fingerpicked lute, a wooden flute melody, a soft hand drum, a quiet cello drone. Instrumental music only, no voices, no speech, no singing, no sound effects.”
- **map-blight:** „Slow camera drift through a ruined, mist-covered village at dusk, dead trees and a faint sickly green glow on the horizon. Soundtrack: slow, brooding dark fantasy music with a slow steady pulse - low sustained strings, a lonely solo cello melody, a distant deep bell, a soft dark choir pad humming. Wordless and instrumental music only, no speech, no lyrics, no sound effects.”
- **map-council:** „Slow camera drift along a castle wall at sunset where red and blue banners fly above a war council table covered with maps. Soundtrack: noble, resolute medieval fantasy march at a moderate steady tempo - a field drum and soft timpani, a warm brass chorale, strings carrying a hopeful melody. Instrumental music only, no voices, no speech, no singing, no sound effects.”
- **battle-charge:** „Close-up of a fantasy war band on a hilltop at dusk - drummers, horn and trumpet players - playing as banners stream in the wind. Soundtrack: fast, urgent epic fantasy battle music with a galloping steady rhythm - a rapid string ostinato, snare and big taiko drums, bold trumpet and horn calls, cymbal swells. Instrumental music only, no voices, no speech, no singing, no sound effects.”
- **boss:** „A towering dark sorcerer-king on a frozen throne in a vast ruined citadel, cold blue light, snow drifting through broken arches. Soundtrack: ominous, monumental dark fantasy boss-battle music with a heavy, slow, steady rhythm - massive low drums, a pipe organ, a deep male choir singing a wordless "oh", dissonant low brass, a tolling bell. Wordless and instrumental music only, no speech, no lyrics, no sound effects.”

## Rupa na ponavljanju

Petlja nastaje tako što se zadnjih 1,5 s isječka pretopi u prvih 1,5 s. Zvučni zapis ovih isječaka počinje 51 ms nakon nulte sekunde, a skripta je rezala po vremenu. Početak je zato bio 51 ms kraći od kraja i na svakom ponavljanju je ostajala 51 ms tišine. To je važilo i za dvije teme od 10. 11.; u opisu tog prolaza pisalo je da su petlje „bez šava”, što nije bilo tačno.

`scripts/prepare-audio.py` sada:

1. reže po broju uzoraka od prvog dekodiranog, pa su početak i kraj jednako dugi;
2. ujednačava glasnoću na tri uzastopna perioda i zadržava srednji, jer normalizacija drugačije tretira početak i kraj ulaza;
3. u datoteci ostavlja 0,2 s iste muzike prije i poslije perioda od 13,6 s. Igra ponavlja između te dvije oznake, pa tačka ponavljanja leži usred neprekinutog zvuka, šta god MP3 koder i dekoder preglednika radili na rubovima datoteke.

Svih sedam tema ima glasnoću između −21,1 i −21,5 LUFS.

Datoteke su u novoj mapi `public/assets/audio/themes/` (7 × 197 kB); stara `music/` je uklonjena. Preglednik datoteke pod `/assets` čuva jedan dan, a novi kod ne smije dobiti staru datoteku bez dodatka od 0,2 s.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.198 testova u 69 datoteka prolazi (ranije 1.189). `music-pacing.test.ts` ima 21 test umjesto 12: redoslijed tema, nasumični početak, tema bossa, oznake ponavljanja, tema koja se ne može učitati, postojanje svih sedam datoteka i slaganje perioda s brojevima u skripti. |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta |
| Chromium, ponavljanje (pravi dekoder i Web Audio) | Svaka tema se dekodira na tačno 14,000 s. Dva perioda odsvirana kroz iste oznake koje koristi igra: nivo u prozorima od 10 ms prije i poslije tačke ponavljanja je ravan (npr. `map`: −29, −27, −28 pa −27, −27, −28 dB), a skok uzorka na samoj tački (0,002–0,016) manji je od običnih skokova u muzici (0,021–0,030). |
| Chromium, raspored | Mapa: fraza teme `map-blight` od 0,09 s do 54,55 s, pauza 40 s, zatim `map-council` na 94,62 s. Borba s bossom: tema `boss` počinje na prvi klik. Bez grešaka u konzoli. |
| Chromium, AI vodi svih šest likova sa zvukom | 2 minute (81 naredba, 3 poteza, više prelaza između mape i borbe): bez zastoja i bez grešaka u konzoli |
