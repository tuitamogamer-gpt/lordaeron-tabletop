# Popravke i završni sloj dizajna · 14. 11. 2026.

Zahtjev: „Idemo popravi sve i napravi da ima Premium dizajn feel.”

Urađeno je dvoje. Svaki ekran igre je snimljen i izmjeren na tri veličine, pa je popravljeno ono što je bilo pokvareno. Zatim je preko cijele igre prešao jedan završni sloj: veličina teksta, dugmad, okviri, naslovi, pokret, opisi iznad kontrola i ekran učitavanja.

## Kako je traženo šta ne valja

Skripta otvara 43 ekrana iz pripremljenih stanja partije: postavljanje kampanje, sto, mapu, svih šest panela, akcije, borbu u šest stanja, odluke, najave, postavke i stranice. Svaki snima na 1366 × 768, 1920 × 1080 i telefonu od 390 px. To je 129 snimaka. Poslije popravki je isto izmjereno i na tabletu u oba položaja (1080 × 810 i 810 × 1080), što je otkrilo stavku 14.

Na svakom ekranu mjeri: greške u konzoli, vodoravno pomjeranje stranice, kontrole izvan ekrana, odsječen tekst, slike koje se nisu učitale, mete za prst manje od 32 px i veličinu svakog teksta. Kontrola izvan ekrana se ne broji ako stoji u redu koji se pomjera prstom (kartice panela, traka akcija, izbor lika). Snimke sam zatim pregledao.

## Šta je bilo pokvareno

| # | Gdje | Šta | Sada |
| --- | --- | --- | --- |
| 1 | Encounter deck, telefon | Pregled je imao raspored samo od 1000 px naviše. Ispod toga se tekst slijevao jedan preko drugog. | Čitljiv raspored u jednoj koloni |
| 2 | Party controls, telefon | Lista likova u dvije kolone izlazila je van ekrana. | Jedna kolona |
| 3 | Aukcija | Imena su se lomila usred riječi: „GRUMBA Z CROWSBL OOD”. | Ime u jednom redu; jedan lik po redu gdje dva ne stanu |
| 4 | Panel Quests | Kolone Horde i Alijanse stajale su na različitim visinama. | Poravnate |
| 5 | Detalj karte | Tekst pravila bio je svijetao na pergamentu i nije se mogao pročitati. Kolona s pravilima bila je široka 130 px pored karte od 320 px. | Taman tekst, širi prozor |
| 6 | Card library, Heroes, Chronicle, Rules | Dugmad **Management** / **End turn** i **Undo** stajala su i na ovim stranicama. Slučajan klik je mogao završiti fazu. | Samo na stolu; drugdje **Back to the table** |
| 7 | Partija bez botova | „Bot move”, „Automatic bots”, prekidač „Auto-play bots” i „Run AI” prikazivali su se iako nijednog lika ne vodi AI. | Skriveni kad nema botova |
| 8 | Postavke, telefon | Izbor „AI characters” bio je širi od ekrana. Tu grešku sam unio 12. 11. | Staje u red |
| 9 | Rest, telefon | Dobitak („+0”) je bio ispisan preko vrijednosti. | Dva reda, bez preklapanja |
| 10 | Paneli, telefon | Sedam kartica panela stajalo je u četiri reda iznad sadržaja. | Jedan red koji se pomjera; otvorena kartica ostaje vidljiva |
| 11 | Telefon i tablet | Dugme za zatvaranje 30 × 30 px, prekidači u borbi visoki 16 px. Kartice, straničenje, filteri nivoa, dugmad na traci mape, savjetnik, list lika, koraci postavljanja, ponuda na aukciji i dugmad najave između 26 i 30 px. | 40 do 42 px |
| 12 | Ekran na dodir | Na devet mjesta je pisalo „Hover”, „Click” ili „press Esc”: novi talent, trening, grad, oprema, list lika, borba, biblioteka karata i puni prikaz karte. | „Tap” |
| 13 | Svuda | Tekst od 8 do 9,5 px na 161 vrsti elemenata. | 10,5 px ili više; nekoliko sitnih oznaka na 10 px (niže) |
| 14 | Mapa preko cijelog ekrana, uspravan tablet | Dugme „Done interacting” je virilo 27 px van ekrana. Uzrok je popravka 11: šira dugmad za prst su zauzela mjesto u traci. | Traka ostavlja naslov i lomi se u dva reda do 920 px širine, kao što je već radila ispod 760 px |
| 15 | Ekran na dodir | Slovo tipke pored dugmeta („Hint H”, „Interact with map F”, brojevi akcija) tamo gdje nema tastature. | Skriveno |

Greške u konzoli, vodoravno pomjeranje i neučitane slike nisu nađeni ni prije ni poslije.

## Veličina teksta

Sitni tekst je podignut na 10,5 px, pa je gotovo sav tekst na toj veličini ili iznad nje. Na tačno 10 px je ostalo osam vrsta sitnih oznaka na tijesnim mjestima, na primjer „LEVEL” na portretu, veznik između kockica u tekstu pravila i broj „+N” u polju borbe. Ispod 10 px su samo lica karata i natpisi na mapi, koji su slike i prate svoju razmjeru, te natpisi na pločicama polja borbe (8,5 do 9,5 px), koji su dio crteža i ne bi stali veći.

Pravila nisu pisana napamet. Skripta je na sva tri ekrana našla svaki element s tekstom ispod 10,5 px i za njega napravila selektor. Drugi prolaz je provjerio da pravilo nigdje ne bi smanjilo veći tekst; gdje bi, pravilo je suženo ili izostavljeno. Raniji sloj `readability.css`, koji je držao pod na 9 do 10 px, podignut je na istu vrijednost.

Mjereno poslije, na 43 ekrana: ispod 10 px je na svakoj veličini jedna vrsta elemenata (pločice polja borbe), a između 10 i 10,5 px pet do sedam vrsta. Nijedan tekst nije odsječen i nijedna kontrola nije izašla van ekrana zbog većeg teksta.

## Završni sloj

**Glavno dugme je zlatno.** U borbi su „Roll” i „Use” već bili zlatni, a u ostatku igre isto dugme je bilo crveno s reljefnim rubom. Sada je jedna stvar koju treba uraditi sljedeću svuda iste boje. Gdje se isti izbor nudi više puta (ponuda za svakog lika na aukciji, jedan od tri talenta), dugmad su obrub koji se ispuni kad se na njega pokaže, jer šest punih dugmadi u nizu ne može sva biti glavna. „Bot move” ispod odluke je također obrub.

**Ostala dugmad** su tamno staklo sa zlatnom linijom. Sva imaju stanje pod mišem, pritisnuto stanje i vidljiv fokus s tastature.

**Zaglavlje.** Stranica na kojoj si označena je zlatom umjesto crvenom kutijom.

**Paneli stola** imaju tanku liniju, slabo svjetlo uz gornji rub i sjenu ispod. Savjetnik za potez više nije jedina plava kutija na zlatnom stolu.

**Okviri.** Reljefni i užlijebljeni rubovi su zamijenjeni tankom linijom na panelu mape, zaglavlju prozora, dugmetu za zatvaranje, kartama događaja i oznakama stvorenja.

**Naslovi** su ispisani zlatom koje je svjetlije odozgo. Naslov u dva reda je jednako osvijetljen u oba.

**Pokret.** Prozor stiže za petinu sekunde, stranica za četvrtinu, karta se malo podigne pod mišem, a preko zlatnog dugmeta pređe svjetlo. Sve je isključeno kad sistem traži manje pokreta.

**Opis iznad kontrole.** Kontrole se objašnjavaju sistemskim opisom koji stiže poslije duge sekunde i izgleda drugačije na svakom računaru. Sada isti tekst stiže za trećinu sekunde, u izgledu igre, i unutar otvorenog prozora. Radi samo gdje postoji miš.

**Ekran učitavanja.** Prije nego što se igra učita vidi se grb, ime i linija koja se kreće, umjesto praznog tamnog ekrana.

Uz to: trake za pomjeranje, boja označenog teksta i polja za unos u istom izgledu.

## Šta nije dirano

- Tri vrste okvira prozora (paneli, dijalozi, postavljanje kampanje) ostaju kakve su bile.
- Raspored stola, mapa, borba i pravila nisu mijenjani.
- Zlatno dugme svuda je vidljiva promjena. Ako ne odgovara, mijenja se na jednom mjestu: treći dio `src/campaign/finish.css`.

## Provjera

| Šta | Rezultat |
| --- | --- |
| 43 ekrana na računaru (1366 × 768 i 1920 × 1080) | bez grešaka u konzoli, bez vodoravnog pomjeranja, bez odsječenog teksta, bez neučitanih slika i bez kontrola izvan ekrana |
| 43 ekrana na telefonu (390 px) i na tabletu u oba položaja | isto; izvan ekrana su samo kontrole u redovima koji se pomjeraju prstom. Od meta manjih od 32 px ostali su kvadratići za označavanje (17 px, unutar svog reda) i polja i žetoni na samoj mapi |
| Tekst ispod 10 px | samo natpisi na pločicama polja borbe, na svakoj veličini; na tačno 10 px pet do sedam vrsta sitnih oznaka |
| Opis iznad kontrole | stiže 350 ms nakon što miš stane, i na stolu i unutar prozora; sistemski opis se vraća kad miš ode |
| Ekran učitavanja | vidljiv dok skripte nisu učitane |
| Igra samih botova, bez ijednog klika | 3 minute, 82 naredbe, do trećeg poteza Horde, bez zastoja i grešaka |
| Igra s jednim igračevim likom i pet botova | 150 s, 70 naredbi, 0 klikova zbog botova, 6 igračevih koraka, bez grešaka |

Sve je mjereno u Chromiumu na konačnoj verziji. Izuzetak je ekran od 1920 × 1080, mjeren prije posljednjih izmjena, koje važe samo za ekran na dodir i za širine do 920 px.

`npm test`: **1.425 testova** u 86 datoteka, 11 više nego u prethodnom prolazu. Novi `tests/audit-repairs.test.tsx` (6) drži popravke koje test može držati: kontrole poteza samo na stolu, kontrole botova samo kad botova ima, ime na aukciji, natpis za ekran na dodir. `tests/tooltips.test.ts` (5) pokriva opis iznad kontrole. Popravke rasporeda žive u stylesheetu i provjerene su u pregledniku. `npm run build` i `npm run check:render` (621) prolaze.

## Granice

- Tablet je mjeren tek poslije popravki, pa za njega nema slike „prije”. Izuzetak je stavka 14, koja je provjerena i na objavljenoj verziji: tamo dugme staje.
- Kvadratići za označavanje su 17 px, ali je meta cijeli red u kojem stoje. Polja i žetoni na mapi su na ekranu na dodir manji od 32 px dok se mapa ne uveća; to je razmjera mape, ne veličina dugmeta.
- Ocjena izgleda je moja, sa snimaka. Mjeri se da li nešto strši, da li je tekst odsječen i koliki je; ne mjeri se da li je lijepo.
- Provjereno je u Chromiumu, na računaru i u emulaciji telefona i tableta. Safari, Firefox i pravi uređaji nisu isprobani. Dvije stvari se oslanjaju na novije mogućnosti preglednika: osvjetljenje naslova po redu (`1lh`) i opis iznad otvorenog prozora (popover). Bez prve je naslov u dva reda osvijetljen kao cjelina; bez druge se opis stavlja unutar prozora.
- Pravila za veličinu teksta su napravljena iz današnjeg izgleda ekrana. Nova kontrola sa sitnim tekstom neće biti obuhvaćena dok se popis ne napravi ponovo.

## Datoteke

- `src/campaign/finish.css`: četiri dijela, redom popravke, tekst, izgled, opis. Učitava se zadnji.
- `src/campaign/readability.css`, `responsive.css`: podignut pod.
- `src/campaign/tooltips.ts`: opis iznad kontrole.
- `index.html`: ekran učitavanja.
- `src/Campaign.tsx`, `WorldDecision.tsx`, `Combat.tsx`, `Tabletop.tsx`, `Interactions.tsx`: kontrole poteza i botova, ime na aukciji.
- `src/campaign/pointer.ts` i natpisi u `parts.tsx`, `BaseCatalog.tsx`, `CharacterSheet.tsx`, `ClassDeck.tsx`, `CombatCharacterSheet.tsx`, `EquipmentEditor.tsx`: „Tap” na ekranu na dodir.
- `tests/audit-repairs.test.tsx`, `tests/tooltips.test.ts`.
