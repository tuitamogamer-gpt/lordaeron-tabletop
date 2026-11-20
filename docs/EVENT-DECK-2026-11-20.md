# Da li je špil eventa promiješan · 20. 11. 2026.

Zahtjev: „Provjeri i evente. Čini mi se da ne idu random, nego da uvijek idu isti. Uvijek mora biti šaflovan špil.”

## Šta je nađeno

**Špil se miješa, i to nasumično za svaku partiju.** Provjereno na tri načina:

- **Sjeme.** Četiri nove partije započete kroz postavku u pregledniku dobile su četiri različita sjemena (338204692, 3765867487, 3742293445, 996262205). Postavka izvlači novo sjeme iz `crypto.getRandomValues` svaki put kad se otvori.
- **Raspodjela.** Na 4.000 nasumičnih sjemena svaka karta je prva onoliko često koliko joj pripada: New Horizons 11,9 % (očekivano 11,5 %), karte s jednim primjerkom 1,7 do 2,4 % (očekivano 1,9 %). Prosječno mjesto svake karte u špilu je između 24,9 i 26,3 (sredina je 25,5).
- **Redoslijed.** 200 uzastopnih sjemena daje 200 različitih redoslijeda.

**Zašto ipak izgleda kao da su uvijek isti.** Špil ima 52 karte, ali samo 29 različitih imena:

| Karta | Primjeraka | U koliko partija od 30 poteza se pojavi |
| --- | --- | --- |
| New Horizons | 6 | 87 % |
| The Beasts of Lordaeron, Auction House, Professions and Crafts | po 4 | oko 76 % |
| Old Hatreds, Bounty | po 3 | oko 70 % |
| karte s dva primjerka | 2 | oko 53 % |
| karte s jednim primjerkom (bossovi, ratovi …) | 1 | oko 32 % |

Partija od 30 poteza ima devet event koraka i u njima okrene u prosjeku 16 karata (1,8 po koraku, jer karta s oznakom za još jednu kartu vuče sljedeću). Tako se u gotovo svakoj partiji vide iste četiri-pet karata s više primjeraka, a svaka rijetka u svakoj trećoj. Sastav odgovara skeniranom špilu: svaka od 52 karte ima svoj sken.

**Jedna stvarna rupa.** Kad se špil potroši, odbačene karte se **nisu miješale u novi špil**: eventa više nije bilo do kraja partije. U običnoj partiji od 30 poteza do toga ne dolazi, ali u zadanoj varijanti „Defeat the Overlord”, gdje se staza ponavlja u krugovima, špil se isprazni unutar tri kruga u 20 % partija.

## Šta je sada

- **Potrošen špil se pravi iznova** (`rules/events.ts > reshuffleEvents`): odbačene karte se promiješaju u novi špil i hronika to zabilježi. U novi špil ne ulaze karte koje su još u igri: boss ili trajni efekat na tabli, rat koji traje, i Auction House čiji predmet neki lik drži (da se isti predmet ne pojavi dvaput).
- **Nova revizija pravila (5).** Važi za nove kampanje. Kampanje započete ranije igraju se kako su igrane, jer se sačuvana partija ponavlja naredbu po naredbu.
- **U panelu Encounter deck piše da je špil promiješan**, a nova kartica **Deck contents** pokazuje od čega je: svako ime, koliko primjeraka ima i koliko puta je do sada izašlo. Discard pile pokazuje ono što je odbačeno od posljednjeg miješanja.

Samo miješanje pri postavci nije mijenjano: bilo je ispravno.

## Provjera

- **1.645 testova** (7 novih u `tests/event-deck.test.tsx`): špil je permutacija svih karata kampanje, isto sjeme daje isti redoslijed, a 200 sjemena 200 različitih; svaka karta je prva jednako često (3.000 sjemena, pet standardnih devijacija); postavka svaki put izvlači novo sjeme; potrošen špil se pravi iznova bez karata u igri, različito od partije do partije; kampanja pod revizijom 4 ostaje bez eventa kao prije.
- Dvije partije koje su botovi odigrali sa špilom od četiri karte: špil se ispraznio u desetom potezu, napravljen je novi od 49 karata i partija je išla dalje do 27. poteza, bez karte koja bi istovremeno bila u špilu i u igri.
- `npm run build` i `npm run check:render` prolaze.

## Granice

- Da li je sastav špila tačan prema štampanoj igri nije provjeravano van skenova koji su u projektu.
- Pravilnik iz 2005. nije ponovo čitan za slučaj praznog špila; u partiji od 30 poteza on se i ne može isprazniti. Miješanje odbačenih karata je odluka za varijantu s krugovima.
