# AI protiv Nefariana i sitno peglanje · 30. 10. 2026.

## Problem

U prethodnom pregledu sve četiri kampanje protiv Nefariana završile su neriješeno. Nefarian se pomjera prema Bulwarku sa svakom kartom događaja koja nosi simbol sudbine. Kad stigne, svaka frakcija se mora sama boriti protiv njega (39 zdravlja i 18 napada u igri sa šest likova), a ako obje izgube, partija je neriješena.

Analiza zapisa je pokazala dvije stvari:

- AI ga nijednom nije napao prije dolaska. Hitnost napada na Overlorda rasla je tek od drugog kruga trake, a Nefarian obično stigne već oko 25. poteza prvog kruga.
- Heroji su završnu borbu dočekivali potrošeni, npr. s 4/9 i 3/6 energije. U jednoj partiji frakciji je do pobjede nedostajalo 3 štete.

## Izmjena

- **Hitnost.** Napad na Nefariana vrijedi više sa svakom regijom koju pređe prema Bulwarku. Čekanje ne izbjegava borbu, a napad u trenutku koji frakcija sama bira može se izvesti punim snagama. Ako ne uspije, obje završne borbe i dalje slijede.
- **Priprema.** Kad je Nefarian jedan događaj od Bulwarka, odmor vrijedi dva i po puta više, da heroji dočekaju završnu borbu punog zdravlja i energije.
- Za Kel’Thuzada i Kazzaka ništa se ne mijenja. Kazzak seed 308 odigran je ponovo identično: 2.209 naredbi, pobjeda Alijanse.

## Mjerenje

Ista 24 seeda (polovina sa standardnim likovima, polovina s casterima) odigrana su sa starim i novim AI-jem. Simulacije su determinističke, pa razlika dolazi samo od izmjene.

| | Stari AI | Novi AI |
| --- | --- | --- |
| Pobjede protiv Nefariana | 1 / 24 | 4 / 24 |
| Prosječna najveća šteta u završnoj borbi | 23,6 | 24,8 |
| Nedostajuće zdravlje i energija svih heroja pri dolasku | 15,6 | 10,6 |
| Prosječan nivo heroja pri dolasku | 3,73 | 3,70 |

Novi AI je pobijedio u seedovima 313, 329, 330 i 332, a stari samo u 330. Dodatne pobjede su upravo partije u kojima je stari AI bio blizu: 37 → 47, 32 → 41 i 35 → 39 štete. Nijedna partija koju je stari AI dobio nije izgubljena.

Pobjeda protiv Nefariana i dalje je rijetka. Heroji su pri njegovom dolasku na nivou 3–4, a AI za takvu družinu računa praktično 0% šanse. Sa tri heroja na nivou 5 računa 62–73%, i takva družina je pobijedila sa 47 štete. Brži razvoj do nivoa 5 prije Nefarianovog dolaska ostaje otvoren zadatak za AI.

## Interfejs

- **Scena borbe na telefonu.** Figure su zauzimale po 84 px, pa je tekstu u sredini ostajalo 18 px. Naslov poput „Artumnis prepares an attack” lomio se riječ po riječ, a ikona mačeva je znala prelaziti preko teksta. Ispod 600 px figure i razmaci su manji, pa naslov staje u dva reda.
- **Pristupačnost.** Automatska provjera (axe) na glavnim ekranima našla je prekršaje samo na novom sažetku kampanje: njegovo zaglavlje čitalo se kao drugo zaglavlje stranice, a napomene su stajale direktno u listi statistike. Nakon ispravke provjera ne nalazi nijedan prekršaj.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.083 testa u 54 datoteke prolaze; 3 nova u `ai-nefarian.test.ts` |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta |
| 48 Nefarian simulacija (24 seeda × stari i novi AI) | sve završene, replay identičan |
| Chromium, 5 veličina, 183 ekrana | bez odsječenog teksta, elemenata izvan ekrana, vodoravnog skrolanja i grešaka u konzoli |
| axe, 9 ekrana | 0 prekršaja |

Ponavljanje jedne partije:

```sh
npm run simulate -- 313 nefarian default --output .local-data/review-2026-10-30/nefarian-313.session.json
```
