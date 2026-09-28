# Puna 2v2 partija · 28. 9. 2026.

**Ishod: Horde je pobedila Kel’Thuzada u 25. potezu. Oba Horde lika su preživela.**

Partija je odigrana u Chromeu na lokalnoj aplikaciji, od New game do ekrana **Horde wins!**. Horde odluke su unosene kroz interfejs; Alliance odluke donosili su botovi. Nije menjano stanje igre, seed, rezultat kockica ili redosled špilova tokom igranja.

## Postavka i dokazi

| Frakcija | Lik | Klasa | Kontrola |
| --- | --- | --- | --- |
| Horde | Grumbaz Crowsblood | Warrior | Codex kroz UI |
| Horde | Sofeea Icecall | Mage | Codex kroz UI |
| Alliance | Brandon Lightstone | Paladin | Balanced bot |
| Alliance | Burbon Fang | Hunter | Balanced bot |

- Paket: `base-2005-faq-1.4-v6`, content hash `4c24b6cf`.
- Seed iz završnog izvoza: `3374075278`.
- Standardna pravila za četiri lika, Kel’Thuzad; obe opcione varijante isključene.
- `Autoplay battle` isključen. `Auto-resolve` obrađivao je korake sa jednim ishodom; Horde moći, mete, rerollovi, nagrade i oprema birani su kroz UI.
- Prethodna kampanja ostala je sačuvana preko aplikacijskog backup mehanizma.
- [Originalni izvoz svih 684 naredbe](playtests/horde-2v2-2026-09-28.session.json).
- [Audit 685 stanja, faza, borbi, događaja i likova](playtests/horde-2v2-2026-09-28.audit.json).

Replay se proverava naredbom:

```powershell
npx tsx scripts/audit-session.ts docs/playtests/horde-2v2-2026-09-28.session.json docs/playtests/horde-2v2-2026-09-28.audit.json
```

Skripta ne bira niti generiše poteze. Prolazi kroz strogi import i ponovo primenjuje izvezene naredbe, proverava resurse, broj akcija, torbu, nivoe, pripadnost naučenih karata klasi, kockice i faze, pa poredi završna stanja. Ovo je provera determinističnosti i invarijanti engine-a; nije drugi, nezavisno implementiran pravilnik.

## Provereni tokovi

Završena je **19 borbi**, **15 questova** i izvučeno **17 event karata**. Odigrano je 40 napada likova, 32 obična rerolla, 53 aktivacije sposobnosti, 49 putovanja, 48 potvrda opreme, 24 dodele predmetnih nagrada, dva respawna i dve razmene. Broj event karata uključuje različite primerke sa istim nazivom.

| Oblast | Zapaženo u partiji |
| --- | --- |
| Akcije i kretanje | Dve akcije po liku; dva susedna koraka za jednu Travel akciju; let preko prijateljskih tačaka; Trusty Mount omogućio tri koraka. Plave grupe zaustavljale su putovanje i imale prioritet za Challenge. |
| Grupna borba | Oba pozvana lika trošila su akciju. Lik bez preostale akcije nije mogao da se pridruži. Mešovita zelena/crvena grupa obrađena je zajedno; crveni Gnoll izabran je kao prva ranged meta. |
| Trening i Town | Više moći naučeno jednom akcijom; prodaja, kupovina i trening u istom Town obračunu; izbor mesta oporavka između transakcija. |
| Oprema | Trening je prvo popunjavao spellbook. Oprema potvrđivana u management fazi; aktivne moći plaćene pri opremanju; zadržavanje iste opreme nije ponovo naplaćeno. Provereni stance, slotovi, level uslov, Shield/Helmet dodaci i potion predmeti izuzeti iz kapaciteta torbe. |
| Quest nagrade | XP i zlato raspodeljeni partyju; obavezni talenti pri level-upu; više uzastopnih izvlačenja sa izborom jednog predmeta; named reward; izbor zamenskog zelenog/žutog/crvenog questa. |
| Borbeni redosled | Priprema, bacanje, moći posle bacanja, običan i nezavisan reroll, efekat protivnika, tokeni, ranged, odbrana, rane, melee/attrition i višerundne borbe. |
| Posebni efekti | Ghoul je blokirao obične rerollove; Arcane Focus korišćen kao nezavisan reroll; Gnoll/Murloc efekti, Crusader grupe, Wildkin uklanjanje moći kod botova i Spider Stun. |
| Smrt i oporavak | Oba Alliance bota poražena su u odvojenim borbama u 4. potezu i vratila se preko respawna. Kampanja je nastavila normalno. |
| Razmena i aukcije | Besplatna razmena posle akcije između saveznika u istoj regiji; osvojeni Boots of Endurance i Trusty Mount; botovi donosili sopstvene aukcijske odluke. |
| Događaji | Merchants, Subterfuge, War, Arcane Corruption, New Horizons, Beasts, Goblin Merchant, Zeppelin, Plague/Plaguewinds i retraining/gold izbor. Subterfuge dozvolio je Alliance botovima Horde questove. Plague menjao attack; Beasts pomerao plave prepreke. |
| Završetak i čuvanje | Overlord pobeda odmah završila kampanju. Dalje akcije onemogućene. Posle reload-a ostali su turn 25, Horde pobeda i tačno dva Alliance bota. Browser error/warn log bio je prazan. |

## Završna borba

Kel’Thuzad u Stratholmeu imao je threat **7**, attack **16** i health **18**. Sofeea je koristila Cone of Cold, Fire Blast, Dire Wand i Arcane Missiles, zatim Minor Agility Potion i Arcane Focus. Impact je smanjio njen prag, a Combustion je preko pet Spot rezultata dodao pet crvenih kockica: ukupno **sedam crvenih**, u dozvoljenoj fizičkoj zalihi.

Grumbaz je koristio Rend i Impale. Kel’Thuzadov efekat oduzeo mu je četiri zdravlja za dva niska crvena/plava rezultata. Pre odbrane party je imao **8 ranged + 8 melee + 2 attrition = 18 štete**, uz **5 armor**. Odbrana `8 + 5 = 13` protiv attacka 16 ostavila je tri rane: jednu Grumbazu, dve Sofeei. Resolution je pobedio Overlorda u prvoj rundi.

| Lik | Nivo | XP | Health | Energy |
| --- | ---: | ---: | ---: | ---: |
| Grumbaz | 4 | 19 | 6 | 5 |
| Sofeea | 4 | 19 | 4 | 5 |
| Brandon | 4 | 20 | 9 | 6 |
| Burbon | 4 | 20 | 8 | 6 |

## Ispravke pronađene igranjem

1. **Duplirane Challenge opcije:** jedan red se ranije prikazivao za svaku figuru iste grupe. Sada jedna kombinacija grupe i saveznika ima jednu opciju; posebne mete i različiti party sastavi ostaju odvojeni.
2. **Wildkin izbori kod drugih protivnika:** generator je nudio uklanjanje moći i kod Kel’Thuzada/Ghoula/Murloca, gde ta naredba nije uklanjala moći. Sada takve izbore nudi samo za stvarni Wildkin efekat, uz proveru imuniteta.
3. **Ghoul reroll prikaz:** ranije se prikazivao pozitivni reroll bonus iako ga je engine blokirao. Sada jasno piše da su obični rerollovi blokirani.
4. **Level-up i loot:** tokom obaveznog izbora talenata poruka je pogrešno tvrdila da predmet prima drugi igrač/AI. Sada traži završetak izbora talenata.
5. **Arcane Corruption opis:** dopunjen je domet četiri regije, odnosno osam uz Spread the Plague, uz odgovarajuće zaokruživanje gubitka energije. Engine je već koristio taj domet.
6. **Rest opis:** precizirano je da odmor skida Curse samo u prijateljskom gradu.
7. **Klik tokom promene borbene faze:** React je ponovo koristio isto dugme za novu odluku, pa je započeti klik na odbranu mogao završiti kao dodela rane. Dugmad sada imaju identitet vezan za fazu i konkretnu naredbu. Slanje iz starog prikaza odbija se ako je stanje već promenjeno; brzi ponovljeni klik više ne preskače sledeću odluku. Problem je reprodukovan regresionim testom pre ispravke, a oba scenarija proverena su posle nje.
8. **Najava nakon pobede:** završena kampanja više ne najavljuje budući event ili final PvP. Prikazuje `Campaign complete`, potvrđeno u stvarnom browseru.

Izmene nisu menjale bacanja, resurse ili ishod snimljene partije. Njen izvoz uspešno se reprodukuje i posle izmena.

## Završne provere i granice

- `npm test`: **323/323** testova, **20/20** datoteka. Osam novih regresija pokriva grupisanje izazova, Ghoul prikaz, Wildkin izbore, klik tokom promene faze i brzo ponavljanje klika. Stvarni Wildkin efekat i ručni izbor sledeće borbene odluke ostaju očuvani.
- `npm run build`: prolaze TypeScript, server provera i Vite build. Ostala su postojeća upozorenja o Zod PURE komentarima i veličini bundlea.
- Audit: **684 naredbe / 685 proverenih stanja**, identičan replay, `phase: finished`, `winner: horde`, `turn: 25`.
- Stvarni browser: pregledan borbeni ekran i ekran pobede; potvrđeni autosave, reload i raspodela kontrole 2 ljudska lika / 2 bota.

U ovom prolazu nije nađena nelegalna akcija niti pogrešan završni obračun. Jedna partija ne dokazuje svaku kombinaciju svih karata. Final PvP posle 30. poteza nije aktiviran jer je kampanja pravilno završena porazom Overlorda; Nefarian, Kazzak, šest likova i opcione varijante nisu igrani u ovom prolazu. Šira automatizovana pokrivenost opisana je u [RULES-COVERAGE.md](RULES-COVERAGE.md).

Referentna pravila: [službeni pravilnik](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf) i [FAQ 1.4](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf).
