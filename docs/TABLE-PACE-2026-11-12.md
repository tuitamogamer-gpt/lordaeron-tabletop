# Sto korak po korak: karta događaja, najave, zvučni znakovi i tempo · 12. 11. 2026.

Zahtjev: „Generalno, malo uspori. Dakle, kad izađe event karta, daj sliku event karte. Dakle, malo budi detaljniji. Nemoj samo ono kao nešto se izdešava i gotovo. Dakle, malo sporije, s nekim animacijama. Možeš imati i one neke audio-uskočice. […] daj te neke korake, međukorake, da se to vidi, da ne bude samo ono kao scriptovano: trrr, gotovo.”

## Šta je bilo

Karta događaja se izvlačila i rješavala u jednom trenutku: zvuk, kratka poruka u uglu, i sljedeći potez je već počeo. Potez bota se vidio samo kao figure koje skaču po mapi.

## Šta je sada

Svaka promjena igre se razloži na korake, a koraci se prikazuju jedan po jedan. Igra je u tom trenutku već odigrana i sačuvana; koraci je samo pokazuju.

**Karta na sredini stola** (veliki prikaz, sa slikom):

| Korak | Šta se vidi | Trajanje (Normal) |
| --- | --- | --- |
| Karta događaja | Odštampano lice karte se okrene, tekst izlazi red po red. Ako slijedi odluka, piše „A decision follows”; ako karta vuče još jednu, „Bonus card: another Event follows”; ako se Overlord pomjerio, piše kuda. | 6,2 s |
| Dobijen rat | karta rata i koja polja je frakcija držala | 4,6 s |
| Novi zadatak | karta zadatka, koja stvorenja i gdje se pojavljuju, nagrada; polje na mapi svijetli | 4,2 s |
| Završen zadatak | karta zadatka i nagrada | 3,2 s |

**Najava preko table** (traka s portretom):

| Korak | Šta se vidi | Trajanje (Normal) |
| --- | --- | --- |
| Potez bota: putovanje | „Sofeea travels to Brightwater Lake · From Brill”; polje svijetli, put se iscrta, a figura klizi do novog polja (0,9 s) | 1,9 s |
| Potez bota: odmor, trening, grad, izazov, moć, portal, prizivanje, talent, nagrada, propušten potez | ko, šta i gdje, uz kartu kad je ima | 1,1 do 2,2 s |
| Poraz lika | gdje se lik vraća | 2,6 s |
| Novi nivo | novi kapacitet | 2,8 s |
| Overlord se pomjera | kuda | 2,6 s |
| Nova roba kod trgovca | imena predmeta | 2,4 s |
| Potez prelazi na drugu frakciju | grb frakcije i broj poteza | 2,4 s |

Redoslijed unutar jedne promjene: potez bota, porazi, završeni zadaci, nivoi, karte događaja, Overlord, rat, trgovac, novi zadaci, pa predaja poteza.

Igračev vlastiti potez se ne najavljuje njemu samom. Najavljuju se njegove posljedice: završen zadatak, novi nivo, karta događaja na kraju poteza. Unutar borbe nema najava, jer prozor borbe ima svoje faze.

## Sve čeka dok se korak ne vidi

Dok ima koraka za prikaz, botovi ne igraju dalje, prozor borbe se ne otvara, a prozori s odlukama čekaju. Tako karta događaja stoji na stolu prije nego što igra zatraži odluku o njoj.

- Klik, razmaknica ili Enter: sljedeći korak.
- Escape ili **Skip all**: preskače sve što čeka.
- Miš zadržan na karti drži je otvorenom dok se čita; vrijeme teče ponovo kad miš ode.
- **Naknadno, istog dana:** karta se više ne zadržava mišem nego dugmetom **Hold** na njoj, dodat je tempo **Step by step** u kojem svaka najava čeka klik, a botovi igraju sami bez „Run AI”: [BOT-TURNS-2026-11-12.md](BOT-TURNS-2026-11-12.md).
- Najkraće trajanje koraka je 0,7 s, kojim god tempom.

Karta događaja sada leži i pored odluke koju traži, pa se ne mora pamtiti šta je na njoj pisalo.

## Tempo

U postavkama je **Pace of the table**:

| Tempo | Trajanje koraka | Pauza botova između poteza |
| --- | --- | --- |
| Relaxed | × 1,5 | × 1,5 |
| Normal (zadano) | × 1 | × 1 |
| Brisk | × 0,55 | × 0,6 |
| Off | bez najava, kao ranije | × 1 |

Izbor se pamti u pretraživaču (`lordaeron-pace-v1`). Uz uključeno „smanjeno kretanje” u sistemu, karte i trake se samo kratko pretope (0,2 s), osvijetljeno polje ne trepće, a figure ne klize.

## Zvuk uz korak

Snimljeni znakovi (događaj, novi zadatak, završen zadatak, nivo, poraz, predaja poteza) sada sviraju kad se njihov korak pojavi, a ne svi odjednom u trenutku promjene.

Koraci bez snimka imaju kratke zvučne znakove koje pretraživač sam proizvodi (Web Audio): koraci za putovanje, rog za predaju poteza i rat, bubanj za kartu događaja, zvonce za odmor i završen zadatak, list papira za trening i talent, tamni ton za Overlorda, tup udar za poraz. Nisu datoteke i za njih nisu trošeni Fish Audio krediti. Idu kroz isti kanal kao ostali zvučni efekti, pa prate njegovu jačinu i isključenje zvuka.

Izmjereno u Chromiumu: vrhovi 0,31 do 0,58, prosječna jačina −27 do −17 dB. Kako zvuče na zvučnicima nije ocijenjeno sluhom, samo izmjereno.

## Šta nije mijenjano i šta nije provjereno

- Pravila i engine su isti; najave ne mijenjaju nijednu naredbu ni sačuvanu kampanju.
- Borba ima svoje faze od ranije ([COMBAT-PLAY-2026-11-12.md](COMBAT-PLAY-2026-11-12.md)) i ovdje nije usporavana.
- Partija s botovima sada traje duže, i to je namjera: u tri minute botovi su ranije odigrali 148 naredbi, a s najavama na Normal 91. Ko hoće stari tempo, bira Off ili Brisk.
- Nije provjereno na stvarnom telefonu.

## Provjera

Brojke važe za cijeli prolaz od 12. 11. 2026.: ovaj dokument, [GAIN-REGAIN-2026-11-12.md](GAIN-REGAIN-2026-11-12.md) i [MAP-AUDIT-2026-11-12.md](MAP-AUDIT-2026-11-12.md).

- `npm test`: **1.346 testova** u 80 datoteka, svi prolaze. Novi u ovom prolazu: `stage.test.tsx` (24), `map-corrections.test.tsx` (30), `gain-regain.test.ts` (11), `lying-board.test.ts` (10), `lying-board-ui.test.tsx` (7) i dopune u `resource-tokens`, `combat-readiness` i `map-ui`.
- `npm run build` i `npm run check:render` (621 prikaz) prolaze.
- Karta događaja je u Chromiumu ostala na stolu 6,0 s, a traka predaje poteza 2,4 s.
- Četiri cijele AI kampanje pod revizijom pravila 4, na ispravljenoj mapi (`npm run simulate`), sve završene, bez zastoja, a sačuvana partija se ponovo odigra u isto stanje:

  | Seed | Overlord | Likovi | Naredbi | Zadataka | Nivoi na kraju | Ishod |
  | --- | --- | --- | --- | --- | --- | --- |
  | 2005 | Kel’Thuzad | standardni | 3.043 | 30 | 5, 5, 5, 5, 5, 5 | pobjeda Alijanse |
  | 7 | Nefarian | standardni | 1.387 | 19 | 3, 3, 3, 4, 3, 4 | remi |
  | 31 | Kazzak | casteri | 2.641 | 30 | 5, 5, 5, 5, 5, 5 | pobjeda Alijanse |
  | 1912 | Kel’Thuzad | casteri | 2.067 | 26 | 5, 5, 5, 5, 5, 4 | pobjeda Horde |

  Remi protiv Nefariana s likovima na nivou 3–4 poznat je od ranije ([AI-NEFARIAN-2026-10-30.md](AI-NEFARIAN-2026-10-30.md)) i nije posljedica ovog prolaza.
- Rad u pregledniku: botovi su vodili svih šest likova četiri minute na ležećoj tabli, s najavama na Normal (1366 × 768). Odigrano je 117 naredbi do četvrtog poteza, bez zastoja i bez grešaka u konzoli.
- 39 sačuvanih kampanja iz ranijih prolaza (oko 34.000 naredbi) završava u istom stanju kao prije izmjene mape.
