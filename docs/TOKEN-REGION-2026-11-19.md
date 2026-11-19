# Na kojem polju šta stoji · 19. 11. 2026.

Zahtjev: „Tokeni protivnika nisu vidljivi na kojoj su lokaciji. Meni se desi da dođem na jednu lokaciju i čini mi se da je smješten na toj lokaciji za quest, međutim, nije. Mora biti jasno i treba biti na hoveru. Kada hoverujem preko tokena gdje je neprijatelj, da vidim na kojoj se lokaciji nalazi i da ne mogu pogriješiti.”

Pravila i engine nisu mijenjani. Mijenjano je gdje žeton stoji na mapi, šta kaže kad se pokaže na njega i šta piše uz dugme za putovanje.

## Šta je nađeno

Mapa je snimljena uvećano tri puta i izmjerena na 60 početnih postavki (997 žetona stvorenja).

- **Žetoni su stajali preko granica.** Raspored je čuvao ime polja prije nego položaj žetona: žeton je radije prelazio granicu nego da prekrije ime. Preko granice je dosezalo 24 % žetona stvorenja na početku kampanje i 38 % kad na poljima stoje i likovi; najgori je imao središte 7 jedinica od granice, uz poluprečnik 17. Mjesta je bilo: najuže polje je duboko 23 jedinice.
- **Oznaka zadatka (H03, A07) stajala je preko granice pet puta od šest** (84 %). Bila je zaseban žeton, velik kao žeton lika, pa je često stajala između dva polja i nije govorila u kojem je zadatak.
- **Hover je polje pominjao sitno.** Ime polja je stajalo u redu od 9 px iznad naslova („GREEN CREATURES · GARREN’S HAUNT”), a na mapi se ništa nije osvijetlilo.
- **Objašnjenje je prekrivalo žeton o kojem govori.** Kad nije imalo mjesta iznad ili ispod, gurnuto je preko njega.
- **Uz dugme Travel here pisalo je samo „1 creatures”**, bez toga koja i čija.
- **Broj „1” uz svako pojedinačno stvorenje** dodatno je prekrivao granicu.

## Šta je sada

### Žeton stoji u svom polju

Figura (stvorenje, lik, Overlord) sada prvo ostaje unutar granice, pa tek onda čuva ime polja; dvije figure se i dalje ne smiju prekriti.

| Žetoni stvorenja koji dosežu preko granice | Prije | Sada |
| --- | --- | --- |
| Početak kampanje, 60 postavki | 239 od 997 (24 %) | 21 od 997 (2 %) |
| Likovi stoje uz stvorenja | 377 od 997 (38 %) | 63 od 997 (6 %) |
| Žetoni likova u istoj postavci | 212 od 360 (59 %) | 5 od 360 (1 %) |

Preostali slučajevi su polja na kojima stoji više stvorenja i likova nego što stane.

### Oznaka zadatka je zastavica na žetonu stvorenja

Umjesto zasebnog žetona, H03 je mala zastavica na uglu žetona onog stvorenja o kojem zadatak govori, u boji svoje frakcije. Stvorenje kaže gdje, zastavica kaže koji zadatak. Klik i hover rade kao prije. Bira se ugao koji je najdublje u polju i najmanje prekriva.

Pojedinačno stvorenje više nema broj; broj stoji od dva naviše.

### Hover

Pokazivanje na žeton stvorenja, zastavicu zadatka, lika, Overlorda ili oznaku na tabli:

- **osvijetli cijelo polje** na kojem to stoji (svijetla ispuna i obrub po granici polja);
- **ispiše ime polja na pločici** iznad ili ispod polja, gdje ga nijedan žeton ne prekriva;
- **zaokruži svako stvorenje tog polja**;
- u objašnjenju, odmah ispod naslova, krupno piše **„Stands in Corrahn’s Dagger”**, a ispod koliko je to daleko liku u ruci: „Grumbaz stands here.”, „Grumbaz reaches it with this Travel action (2 regions).” ili „Farther than Grumbaz travels with one action.”

Pokazivanje na **samo polje** radi isto i kaže šta na njemu stoji: „Creatures stand here: 1 × Crusader · blue · stops movement; 1 × Wraith · green · quest H09 Shadows of War”, ili **„No creatures stand here.”**

Objašnjenje više ne prekriva ono o čemu govori: kad nema mjesta iznad ili ispod, staje pored polja.

### Uz dugme za putovanje

U punoj mapi, uz izabrano odredište stoji šta je na njemu: „1 × Crusader · green · quest H04 A Darkness in Brightwater” ili „No creatures stand here”. U redu puta, pored dugmeta **Travel here**, piše „In Brightwater Lake: 1 × Crusader · green” ili **„Nothing to fight in Garren’s Haunt”**. Tako se prije potvrde vidi da li je stvorenje zaista tamo.

## Provjera

| Šta | Rezultat |
| --- | --- |
| Položaj žetona na 60 postavki, dvaput (početak i likovi uz stvorenja) | brojevi u tabeli gore |
| Hover preko stvorenja, zastavice i polja u Chromiumu, 1366 × 768 | polje osvijetljeno, pločica s imenom, objašnjenje pored polja; bez grešaka u konzoli |
| Puna mapa: odredište sa stvorenjem, bez stvorenja i dva polja daleko | tekst uz odredište i uz dugme tačan u sva tri slučaja |
| `npm test` | **1.618 testova** u 95 datoteka; novi `tests/token-region.test.tsx` (10) |
| `npm run build`, `npm run check:render` (621) | prolaze |

Dva ranija testa su usklađena: objašnjenje sada staje pored žetona kad ispod nema mjesta, a oznaka zadatka je manja.

## Granice

- **Ime polja je češće djelimično prekriveno.** To je cijena: žeton koji ostaje u polju stoji bliže njegovoj sredini, gdje je ime. Na 60 postavki ime dotiče oko 460 do 530 od oko 2.000 žetona i zastavica, ranije oko 160. Pločica s imenom na hoveru to nadoknađuje.
- Na početku kampanje tri lika u glavnom gradu i dalje ne stanu cijela u polje.
- Na telefonu nema hovera: dodir bira polje, a šta na njemu stoji piše uz odredište u punoj mapi.
- Zastavica je manja od ranijeg žetona zadatka (30 × 24 umjesto 48 × 38 jedinica), pa je i meta za klik manja.
- Kad stvorenje ima dvije boje na istom polju, zaokružena su oba, a objašnjenje ih navodi posebno.
- Provjereno je u Chromiumu na računaru. Safari, Firefox i pravi telefon nisu isprobani.

## Datoteke

- `src/campaign/token-layout.ts`: figura ostaje u polju (`HOLD`, `FIGURE_MARGIN`, `WEIGHTS`), zastavica zadatka (`TAG`).
- `src/campaign/Map.tsx`, `MapTokens.tsx`, `map.css`: osvijetljeno polje, pločica s imenom, red „Stands in…”, objašnjenje pored polja, tekst uz odredište.
- `tests/token-region.test.tsx`; usklađeni `tests/map-ui.test.tsx` i `tests/map-services.test.tsx`.
