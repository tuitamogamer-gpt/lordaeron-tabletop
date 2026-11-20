# Razmjena i podjela nagrada · 20. 11. 2026.

Zahtjev: „Dodaj mogućnosti razmjene itema kad su karakteri na istom polju. Isto tako, dozvoli igraču da rasporedi iteme od quest rewards kako želi.”

## Šta je nađeno

- **Razmjena je postojala u pravilima, ali je nijedno dugme nije otvaralo.** Naredba `trade`, njen prozor poslije akcije i ekran `TradeEditor` bili su tu, a `open('trade')` se nije pozivao nigdje. Igrač nije mogao doći do razmjene.
- **Nagradu je igrač mogao dati samo svom liku.** Pravila dopuštaju da item dobije bilo koji lik koji je preživio borbu, ali je odluka o naredbi `reward` pripadala samo liku koji prima item. Zato je pod „Give to” stajao samo igračev lik, a AI saborac koji se borio uz njega nije bio ponuđen.
- Ekran razmjene je bio spisak imena s kvačicama i padajuća lista saboraca, bez slike karte.
- Razmjena nije ostavljala trag u hronici.

## Šta je sada

### Razmjena

- **Dugme Trade stoji uz pet akcija** čim saborac stoji na istom polju kao odabrani lik: lica saboraca, „with Sofeea · free” i tipka **T**. Isto dugme („Trade · free”) je i na listu lika.
- Razmjena je besplatna i ne troši akciju. Po pravilniku (str. 36) otvara se poslije akcije: dok u potezu frakcije niko ništa nije odigrao, dugme je sivo i kaže „after an action”. Sivo je i kad je odabran AI lik, kad nije potez te frakcije ili kad čeka druga odluka, i svaki put piše zašto.
- **Ekran razmjene pokazuje oba ranca kao karte.** Klik na kartu je daje ili uzima (zlatni okvir i kvačica); prelazak mišem otvara cijelu kartu. Ispod svake piše šta ona vrijedi onome ko bi je dobio:
  - zeleno: „Can equip now · in place of Solid Iron Maul” ili „· free slot”;
  - žuto: „Can equip at level 3”;
  - crveno: „Cannot equip Mace”;
  - plavo: „Used from the bag” (napici, svici, hrana).
- Zlato se daje brojačem (− / +). Saborac se bira dugmadima s portretom; uz AI lika piše „AI ally”.
- U dnu stoji šta ko daje i stanje poslije: „Bag 2 / 3 · 4 → 5 gold”. Ranac drži tri itema: ako bi se prepunio, piše čiji i dugme ne šalje razmjenu.
- Mijenja se ono što je u rancu. Item koji lik nosi prvo se skine u opremanju na kraju poteza. Soulbound itemi ostaju kod vlasnika.
- Razmjena se piše u hroniku („Grumbaz gives Scimitar and 2 gold to Sofeea and receives Dull Blade.”). Kad razmjenjuju dva bota, sto to najavi kartom koja je promijenila ruke.

### Podjela nagrada

- **Svaki item iz nagrade igrač daje kome hoće od likova koji su preživjeli borbu**: svom liku ili saborcu, i kad saborca vodi AI. Uz svako ime stoji ista procjena kao u razmjeni, nivo i popunjenost ranca.
- Unaprijed je označen lik kojem item najviše vrijedi (ko ga može nositi odmah, pa ko kasnije); kad vrijedi jednako, igračev lik prije AI lika. Izbor druge karte iz ponude nudi primaoca iznova.
- Dugme kaže šta radi: „Give Neophyte's Robe to Sofeea”.
- **Bot ne uzima nagradu dok je igračev lik u grupi.** Odluku dijele svi preživjeli učesnici, kao redoslijed napada i rane. Kad su svi preživjeli botovi, biraju sami kao i do sada.
- U sobi za više igrača item dat liku druge osobe čeka njen pristanak, kao razmjena. Dat svom liku ili botu, ide odmah.

## Šta nije dirano

- Pravilo razmjene je isto: saveznici na istom polju, poslije bilo čije akcije u potezu svoje frakcije, samo itemi iz ranca i zlato. Razmjena prije prve akcije i u opremanju na kraju poteza i dalje nije dozvoljena.
- Koliko se karata vuče i koliko zadržava iz nagrade (vuče se koliko piše, zadržava jedna) nije mijenjano.
- Naredbe i format sačuvane partije su isti, pa stare partije rade bez izmjene. Revizija pravila ostaje 5.
- Plijen poslije PvP borbe i relikvija bossa nisu dobili novi ekran; relikvija je dobila samo isto dijeljenje odluke.

## Provjera

- **1.675 testova** (bilo ih je 1.659): 14 novih u `tests/party-items.test.tsx` i dva više u `tests/equipment-flow.test.tsx`, gdje su dva testa starog ekrana razmjene zamijenjena s četiri. Testovi u još četiri fajla prilagođeni su novom dugmetu i novom ponašanju nagrade. Novi testovi pokrivaju:
  - nagrada: ko odlučuje, ko je ponuđen, pristanak u sobi;
  - procjena itema: što nazove „Can equip now”, pravila zaista dopuštaju da se opremi, za svaki item i svakog lika;
  - razmjena: dugme je otvoreno tačno kad pravila prihvataju razmjenu, zapis u hronici, najava razmjene botova;
  - sto: dugme uz akcije i na listu lika, slanje razmjene.
- `npm run build` i `npm run check:render` prolaze.
- U pregledniku, iz tri sačuvane partije: dugme na stolu (otvoreno i sivo), ekran razmjene i prozor nagrade s dva primaoca na 1440×900, 1280×720, 1024×768 i 390×844. Nigdje nema vodoravnog skrolanja; na telefonu se ekran razmjene skrola okomito.
- Prozor nagrade je na 1280×720 i ranije skrolao 38 px s jednim primaocem; sada s dva primaoca staje bez skrolanja.
- Nije gledano u pregledniku: tri primaoca odjednom (partija sa šest likova), dugme na listu lika i razmjena između dva čovjeka u sobi. Prva dva pokrivaju stilovi i testovi, treće test servera.

## Fajlovi

- `src/campaign/trade.ts`: `itemFit` (šta item vrijedi liku) i `tradeDesk` (s kim se može mijenjati i zašto ne još).
- `src/campaign/Interactions.tsx`: novi `TradeEditor`.
- `src/campaign/RewardResolution.tsx`: primaoci s procjenom.
- `src/multiplayer/ownership.ts`, `server/rooms.ts`: ko odlučuje o nagradi i čiji se pristanak traži.
- `src/rules/game.ts`, `src/campaign/stage.ts`: zapis u hronici i najava.
- `src/campaign/Tabletop.tsx`, `src/campaign/CharacterSheet.tsx`, `src/Campaign.tsx`: dugmad i tipka **T**.
- `src/campaign/party-items.css`: stilovi.
