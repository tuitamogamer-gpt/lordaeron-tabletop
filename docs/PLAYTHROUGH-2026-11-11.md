# Prolaz kroz igru i provjera pravila · 11. 11. 2026.

Igra je odigrana u Chromiumu korak po korak (setup, putovanje, izazov, sve faze borbe, poraz i oživljavanje, potez AI-ja, nagrade, talenti, zamjena questa, događaji, Rest, Train, Town, Chronicle, Rules, telefon), a engine je upoređen sa zvaničnim pravilnikom ([wowrules.pdf](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf), 40 strana). FAQ 1.4 nije bio dostupan: FFG-ov server je za tu datoteku vraćao grešku 503, pa su FAQ ispravke ostale kako su ranije unesene.

## Pravila ispravljena prema pravilniku

| Pravilo | Pravilnik | Šta je igra radila | Sada |
| --- | --- | --- | --- |
| Kel’Thuzadov limit Attritiona | List Overlorda: Attrition „can be no greater than the number of [crvenih ili plavih 6+] he can spot”. Str. 19: bossovo pravilo i sposobnost lika smiju „spotati” istu kockicu. | Brojala je samo kockice koje nijedna karta nije iskoristila, a one koje je brojala zaključavala je za kasnije sposobnosti. Jedna crvena osmica koju je već iskoristio početni luk spuštala je Attrition 1 na 0. | Broji se svaka crvena ili plava kockica sa 6+, i ona koju je karta već iskoristila, a nijedna se ne troši. |
| Akcije poraženog lika | Str. 26: poraženi lik gubi preostale akcije samo „if defeated during his own faction turn”. | Lik kojeg je događaj oborio na kraju protivnikovog poteza gubio je obje akcije svog sljedećeg poteza. | Akcije se gube samo ako lik padne u potezu svoje frakcije. |
| Zadnja šansa za liječenje | Str. 26: nakon gubitka zadnjeg zdravlja lik dobija „one last chance” da upotrijebi sposobnost koja vraća zdravlje, npr. napitak. | Van borbe (kad zdravlje uzme događaj) nudila je samo izbor groblja. | Lik može popiti napitak liječenja i ostati na mjestu. Prozor **Hero revival** nudi napitak uz groblja. |

Druga dva slučaja pogađaju samo Kel’Thuzadove događaje Soul Taint i Spread the Plague, koji uzimaju zdravlje van borbe.

**Započete kampanje se ne mijenjaju.** Sačuvana partija je lista naredbi koja se pri učitavanju ponovo odigra; pod izmijenjenim pravilima neka od tih naredbi mogla bi postati nelegalna i partija se ne bi učitala. Zato kampanja pamti reviziju pravila (`variants.rules`): nove kampanje su tada počinjale s revizijom 2 (sada 3), a ranije započete nemaju oznaku i zadržavaju pravila s kojima su igrane. **Settings** na dnu piše koja pravila koristi otvorena kampanja.

### Provjereno i ostavljeno

> Naknadno, istog dana: ratovi se od revizije pravila 3 ocjenjuju na kraju poteza, a za odustajanje od akcije postoji dugme **Pass**. Vidi [ADVISOR-TOKENS-WARS-2026-11-11.md](ADVISOR-TOKENS-WARS-2026-11-11.md). Razmjena je ostala kako je opisana.

- **Ratovi (War karte).** Pravilnik nagradu daje „at the end of your enemy’s faction turn”, dakle nakon Event koraka; igra rat provjerava prije pomjeranja markera i Event koraka. Razlika se vidi samo kad je rat izvučen dok protivnik slučajno već stoji u obje regije: tada bi po pravilniku nagradu dobio odmah, a u igri je dobija potez kasnije. Ispravka traži preuređenje kraja poteza i nastavka nakon nagrada, pa nije rađena.
- **Razmjena.** Pravilnik (str. 36) razmjenu veže za lik koji je upravo završio akciju; igra je dozvoljava bilo koja dva saveznika u istoj regiji nakon bilo čije akcije. Tekst pravilnika je dvosmislen.
- **Preskakanje akcije.** Pravilnik kaže da lik „may take two actions”; igra traži da se obje potroše (Rest je uvijek dostupan), a pored plavog stvorenja traži Challenge, kao u primjeru na str. 11.

### Poklapa se s pravilnikom

Setup, redoslijed poteza i traka s 30 polja; Travel (dva koraka, let kao jedan korak, zaustavljanje kod plavog stvorenja, zabranjena protivnička početna regija); Rest 2× i 3× nivo sa skidanjem Cursea; Town i cijene; Challenge i grupe; redoslijed borbe, ograničenje od 7 kockica, jedan reroll, prenošenje Damage žetona; svih 13 stvorenja; PvP; XP, zlato i predmeti (primjeri sa str. 22 daju iste brojeve); pragovi nivoa 4/10/18/28; poraz i groblja; Stun i Curse; questovi, torba, događaji i aukcije; vrijednosti i pravila sva tri Overlorda.

## Nađeno igranjem

- **Žetoni izvan svoje regije.** Žetoni su stajali na fiksnom odmaku od imena regije: heroji iznad, stvorenja ispod, quest oznake desno. U malim regijama to ih je stavljalo preko granice. Heroj u Nightmare Vale stajao je na stvorenjima Stillwater Ponda, pa se nije vidjelo ko je u kojoj regiji. Sada svaki žeton uzima slobodno mjesto unutar granica svoje regije (`src/campaign/token-layout.ts`). Na 98 pozicija iz AI partija, s prosječno 37 žetona na tabli:

  | Po poziciji | Prije | Poslije |
  | --- | --- | --- |
  | Žetoni sa središtem izvan svoje regije | 11,4 | 0 |
  | Žetoni koji prelaze granicu za više od 10 jedinica | 21,8 | 6,3 |
  | Parovi žetona koji se preklapaju | 2,1 | 0,6 |
  | Preklapanja sa žetonom iz druge regije | 1,3 | 0,5 |
  | Prekrivena imena regija | 12,1 | 2,3 |

  U regijama premalim za sve svoje žetone (npr. Balnir Farmstead s tri grupe stvorenja i quest oznakom) dio preklapanja ostaje.
- **Putovanje ostavlja igrača u mapi.** Nakon **Travel here** igra je ostajala u mapi preko cijelog ekrana, bez akcija. Sada se vraća na sto, gdje su druga akcija i **Undo travel**.
- **Chronicle s internim oznakama.** Pisalo je „Zowka Shattertusk travels to pestilent.” i „alliance begins faction turn 16.”. Zapisi sada koriste imena i govore šta se desilo: „Grumbaz Crowsblood travels to Nightmare Vale.”, „Sofeea Icecall rests: +2 energy.”, „Zowka Shattertusk learns Rockbiter Weapon and Healing Wave.”, „Grumbaz Crowsblood, Sofeea Icecall and Zowka Shattertusk challenge 2 × Crusader in The Undercity.”, „The Alliance begins faction turn 2.”. Već sačuvane partije dobijaju nove zapise pri učitavanju.
- **Train.** Iznad moći za koju lik nema zlata pisalo je „Ready to learn”, a dugme ispod „Not enough gold”. Sada piše „Needs 6 gold”.
- **Tekstovi borbe.** Nakon izgubljene borbe pisalo je „Collect your rewards below”; sada piše da se pali likovi vraćaju na groblje ili u početnu regiju. „1 wounds to assign” je sada „1 wound”. Brojač „3 / 21 D8” je sada „3 D8 ROLLED”.

Bez nalaza: setup, redoslijed faza borbe i automatsko nastavljanje, Crusaderovo pravilo, poraz i oživljavanje, prozori nagrada, talenta, zamjene questa i događaja, Rest i Town, stranica Rules, sto i borba na telefonu.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.145 testova u 64 datoteke prolaze; novi: `rulebook-audit.test.ts` (10: tri pravila, revizija pravila i ponašanje ranije započetih kampanja), `token-layout.test.ts` (5), `chronicle-notes.test.ts` (3), `playthrough-fixes.test.tsx` (5) |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta |
| AI kampanje s novim pravilima | četiri završene partije, svaka s identičnim replayem (tabela ispod) |
| `audit:session`, Kel’Thuzad casters seed 23 | 3.810 provjerenih stanja, 87 borbi, identičan replay |
| Chromium, AI vodi svih šest likova | 5 minuta (210 naredbi, 7 poteza) prije izmjena i 2,5 minute (95 naredbi) na konačnom buildu: bez zastoja i bez grešaka u konzoli |
| Chromium, ručno | putovanje vraća na sto; Chronicle piše imena; žetoni Nightmare Vale stoje unutar regije |

AI kampanje s revizijom pravila 2, uz provjeru stanja nakon svake naredbe:

| Komanda | Naredbi | Questova | Ishod | Replay |
| --- | --- | --- | --- | --- |
| `npm run simulate -- 2005 kelthuzad` | 3.726 | 49 | Alijansa pobjeđuje Kel’Thuzada | identičan |
| `npm run simulate -- 23 kelthuzad casters` | 3.809 | 58 | Horda pobjeđuje Kel’Thuzada | identičan |
| `npm run simulate -- 71 nefarian casters` | 1.082 | 17 | neriješeno kod Bulwarka | identičan |
| `npm run simulate -- 99 kazzak casters` | 6.088 | 72 | Horda pobjeđuje Kazzaka | identičan |

