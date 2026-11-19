# Tempo igre uživo, dogovor sa saborcima i dorada borbe · 19. 11. 2026.

Zahtjev: „I dalje je igra prebrza. Treba da bude nešto sporija. Dakle, akcije, kada se rade, borba — sve treba da bude prirodnije, nešto sporije, tako da osmisli način kako da to izgleda bliže onoj igri kakva je u pravom smislu igranja uživo. Borba je okej, ali još malo treba dorade. […] AI često samo prati mog saborca, odnosno mene. […] da imamo nekakav izbor na početku, prije svakog našeg turna, da možemo da se dogovorimo i izaberemo opcije: ideš sam, ideš sa mnom ili idem ja s tobom.”

Tri dijela: sto sada uzima vrijeme koje uzima pravi sto, saborci igraju po dogovoru koji se pravi prije poteza, a u borbi je popravljeno ono što je našao pregled borbe iz ugla igrača. Pravila igre nisu mijenjana: nema nove revizije pravila i sačuvane kampanje se igraju isto.

## 1. Tempo: kako izgleda igra uživo

Objavljena verzija je izmjerena u Chromiumu prije izmjene, tempo Normal, 1366 × 768.

| Šta je mjereno | Prije | Sada |
| --- | --- | --- |
| Potez bota na mapi, od prethodnog do sljedećeg | oko 2,5 s | oko 5 s (protivnik), oko 6 s (saborac, s objašnjenjem) |
| Borba dva bota, jedna runda, do ishoda | oko 39 s | oko 50 s |
| Ishod razmjene udaraca na ekranu | 1,2 s | 1,9 s |
| Kockice | sve stanu u istom trenutku, 1,35 s | staju jedna po jedna: 1,85 s za jednu, 2,6 s za sedam |
| Četiri koraka bez odluke poslije igračevog bacanja | oko 5 s, svaki 1,2 s | 3,2 do 3,7 s: bacanje se gleda jednom, ostali su kratki |

Ideja: na pravom stolu igrač pogleda tablu prije nego što posegne za figurom, figuru nosi polje po polje, kockice ne padnu sve odjednom, a ostali pročitaju bacanje prije nego što se s njim išta uradi. Te stanke su sada u igri, i nisu sve iste dužine.

### Na mapi

- **Bot prvo razmišlja.** Prije poteza stoji mala najava s portretom („Sofeea is thinking…”), a polje na kojem lik stoji svijetli, pa se zna u koju figuru gledati prije nego što krene. Traje oko 1 do 2 s, prema vrsti poteza: duže prije borbe, kraće prije odmora. Potez se ne otkriva unaprijed. Klik ili razmaknica ga odigra odmah. Knjigovodstvo (oprema, kraj faze) nema tu stanku.
- **Figura hoda polje po polje**, 0,6 s po polju, i zastane na polju kroz koje prolazi. Važi i za igračeve vlastite figure. Pri tome je nađeno da figura ranije uopšte nije klizila između polja, iako je tako pisalo: bila je nacrtana unutar svog polja, pa se u novom polju crtala iznova i samo bi se tamo pojavila. Figure likova sada imaju svoj sloj na mapi.
- **Saborac kaže zašto.** Ispod najave poteza saborca stoji razlog planera: „— Heading for the quest “Legacy of Evil” in Shining Strand; 1 more Travel action after this one.” Protivnička frakcija svoje razloge ne govori.
- **Najave stoje duže**: putovanje 1,4 s i 0,6 s po polju, odmor 2,6 s (1,7), izazov 3,0 s (2,0), karta nagrade 5,0 s (4,2), karta događaja 7,2 s (6,2), predaja poteza 3,2 s (2,4).
- **Najava izblijedi prije nego što dođe sljedeća**, pa se dvije ne smijene u jednom kadru.
- **Stanke nisu metronom.** Svaka je između 85 % i 115 % svoje dužine, uvijek ista za isti trenutak partije.

### U borbi

- **Kockice staju jedna po jedna** (130 ms razmaka), a pri ponovnom bacanju vrte se samo one koje se bacaju ponovo.
- **Žetoni se broje u zonu borbe jedan po jedan** (150 ms).
- **Razmjena udaraca traje 3,2 s** umjesto 2,2 s, a njen ishod stoji 1,9 s. Polaganje pogodaka je kraće (1,9 s), moć i novi napadač 1,0 s.
- **Botovi daju vremena onome što se čita**: bačene kockice 2,6 s, zbir prije udarca protivnika 2,4 s, prije uzvraćanja 2,2 s, ishod 4,2 s. Korak u kojem nema šta odlučiti ni pročitati je kratak (0,7 s). Ranije je svaki korak trajao isto, oko 1,1 s.
- **Igračevi koraci koji idu sami** (Auto-continue steps): bacanje se gleda 1,4 s, prazni koraci poslije njega 0,45 s, a zbir prije udarca 1,9 s.

### Postavka

**Pace of the table** množi sve gore navedeno: Relaxed × 1,5, Brisk oko × 0,6. **Off** vraća sto kakav je bio: bez najava, bez razmišljanja i hodanja, sa starim vremenima borbe. **Step by step** nema stanku razmišljanja, jer svaka najava ionako čeka klik.

## 2. Dogovor sa saborcima

### Zašto je bot išao za igračem

Bot je računao na igračevog lika gdje god taj stajao: troje se bori bolje nego dvoje, pa je plan s igračem uvijek izlazio najbolji. Igrač o tome nije znao ništa. Kad se igračev lik postavi na polje sa stvorenjem zadatka, oba bota su birala isti plan: „This move reaches the quest “Legacy of Evil”, to fight there with an ally.” Tako je bilo svakog poteza.

### Tri dogovora

| Dogovor | Šta bot radi |
| --- | --- |
| **Go your own way** (ideš sam) | Bira svoj cilj. Ne računa na igračeve likove, ne poziva ih i ne dira ono što stoji na polju gdje su oni. Dva saborca koja idu sama mogu ići zajedno. |
| **Come with me** (ideš sa mnom) | Dolazi do igračevog lika čim se on pomjeri (ili odmah, ako igrač već stoji uz nešto za borbu), čuva akcije za njegov Challenge i bori se samo uz njega. |
| **Lead, I follow** (idem ja s tobom) | Bira cilj za sebe i igrača zajedno, kreće prvi da se vidi kuda, čeka tamo i poziva u borbu kad igrač stigne. Bez njega tu borbu ne počinje. |

Bot bez dogovora (protivnička frakcija, sto bez igrača na toj strani) planira kao ranije.

### Vijeće prije poteza

Prije svakog poteza igračeve frakcije otvara se **Party plan**. Za svakog saborca stoje tri opcije, a ispod svake šta bi on tada uradio:

> **Go your own way** · Quest “A Scourge of Ghouls” in Deathknell · with Zowka · 1 Travel away · low risk
> **Come with me** · Joins Grumbaz in Brill (already there) · fights where Grumbaz fights
> **Lead, I follow** · Quest “Legacy of Evil” in Shining Strand with Grumbaz · 1 Travel away for both · low risk together

- Redove piše isti planer koji zatim igra, pod tim dogovorom, pa bot radi ono što je u vijeću pisalo.
- Na računaru prozor stoji uz desni rub i tabla se vidi: polje o kojem opcija govori svijetli dok je miš ili fokus na opciji.
- Oznaka „Sofeea suggests” stoji na onome što bi saborac sam izabrao (zajedno, kad to vrijedi jasno više nego sam).
- S dva saborca tri dugmeta postavljaju isto za oba: **All alone**, **All with me**, **They lead**.
- Zadnji dogovor ostaje izabran, pa je **Play the turn** (Enter) dovoljan kad se ništa ne mijenja.
- **Party plan** na stolu otvara vijeće u bilo kom trenutku poteza. U postavkama se bira da li se otvara samo: „Ask before each of my turns” ili „Keep the last plan”.
- Dok je vijeće otvoreno, botovi čekaju. **Allies first** je sada i u njemu.

### Tokom poteza

- **Ideš sam**: saborac igra poslije igrača, kao i do sada.
- **Ideš sa mnom**: poslije igračevog poteza saborac odmah dolazi na isto polje. Izmjereno: igrač putuje, 3 s kasnije (koliko traje Undo) kreće prvi saborac, pa drugi; oba stignu s jednom akcijom i mogu u igračev Challenge.
- **Idem ja s tobom**: saborac kreće prije igrača. **Hint** tada šalje igračevog lika za njim („Joining Sofeea in Shining Strand”), a kad igrač stigne, saborac ga pita da uđe u borbu (prozor „An ally asks for help”).

## 3. Borba

Borba je odigrana kao što je igra igrač, korak po korak, na 1366 × 768, 1280 × 720 i telefonu: dva lika, lik s pozvanim botom, poraz jedinog lika, Curse i boss s deset kockica. Nađeno i popravljeno:

| Nađeno | Sada |
| --- | --- |
| Zbir runde je obećavao pobjedu do koje družina ne dođe: liku s 2 zdravlja pisalo je „2 wounds incoming · 3 of 3 damage: Crusader falls”, a borba je završila porazom | „2 wounds incoming: Grumbaz falls unless healed · the fight is lost before the party strikes”; u zbiru „2 wounds · Grumbaz falls” i „3 of 3 · not struck”. Važi kad su svi bacili, jer dotad pogoci i armor još mogu zaustaviti rane |
| Ishod bacanja se vidio dok su se kockice još vrtjele | Dok se vrte, zbir ostaje onaj od prije bacanja, korak se zove „Rolling” |
| Poraz lika najavljen kao liječenje: „Restoring strength · Grumbaz +1 health” | „Grumbaz falls · leaves the fight and returns to Brill” |
| Korak s palim likom: dugmad „Revive Grumbaz at Brill”, naslov i dalje „Assign wounds” | Naslov „Grumbaz has fallen”, obavijest iznad dugmadi, dugmad „Grumbaz returns to Brill · Starting region · with 1 health and 1 energy” i isto za groblje; piše i koliko rana još čeka |
| Moć koja doda žeton najavljena kao pogoci bacanja („Hits secured”), 2,5 s | „Crimson Robe · +1 armor”, kratko |
| Napad protivnika zvao se „Ranged volley” čim je u zoni ležao jedan žeton štete | „Crusader attacks”; „Ranged strike” samo kad ranged pogoci odlučuju |
| Četiri prazna koraka poslije svakog bacanja, svaki 1,2 s | Bacanje se gleda jednom, prazni koraci su kratki |
| Popis „In this battle” odsječen na 1366 × 768 (vidio se 21 px) | Ispod 900 px visine ga nema: zdravlje i energija svakog lika su na karticama lista |
| **Select misses** nije radio ništa kad nema promašaja za ponovno bacanje | Onemogućen, a **Keep results** je glavno dugme |
| Naslov „Your decision” uz „Battle in motion…” ili u borbi koju igrač samo gleda | „Rolling”, „Battle in motion”, „Continues by itself”, „Watching” ili „Your decision”, prema stanju |
| Na ekranu nižem od 740 px ishod razmjene nije pisao nigdje, jer je scena tamo sakrivena | Red iznad dugmadi tada kaže ishod |
| „Remove 1 / 1 dice” je i bacao kockice | „Remove 1 / 1 dice & roll” |
| Tačkica rane je bez kraja animirala sjenu; u pregledniku bez prikaza broj kadrova je pao s 53 na 20 | Treperi providnošću, šest puta |

## Provjera

Sve je mjereno u Chromiumu na konačnoj verziji, 1366 × 768 ako nije rečeno drugačije.

| Šta | Rezultat |
| --- | --- |
| Četiri minute igre, igrač s dva saborca koji idu sami | 62 naredbe, dvije borbe, bez grešaka u konzoli |
| Četiri minute, oba saborca „sa mnom” | 70 naredbi, vijeće otvoreno prije oba igračeva poteza, obje borbe zajedničke, bez grešaka |
| Četiri minute, dva lika po frakciji, saborac vodi | saborac kreće prvi, igrač za njim, zajednička borba, igračev lik na nivou 2 u trećem potezu; bez grešaka |
| Vijeće na 1366 × 768, 1280 × 720, 1920 × 1080 i telefonu (390 × 844) | staje bez vodoravnog pomjeranja; s dva saborca na nižem ekranu popis se pomjera, a **Play the turn** ostaje na dnu |
| Sto s novim dugmetom na 1280 × 720, 1024 × 768 i telefonu | bez vodoravnog pomjeranja; ispod 1200 px širine uz akcije stoji samo **Party plan** |
| Borba dva lika odigrana ručno, i borba jedinog lika do poraza | bez grešaka; tekstovi iz tabele gore |
| Planer pod svakim dogovorom | bez dogovora oba bota idu na igračevo polje; „ideš sam” bira drugi zadatak; „sa mnom” i „ti vodiš” rade kako piše |
| Put kroz dva polja, položaj figure mjeren svakih 40 ms | 23 različita položaja, sa zastankom od 0,44 s na prvom polju; prije izmjene dva položaja (polazak i cilj) |
| Vijeće za dva saborca | 43 do 117 ms u planeru |

`npm test`: **1.608 testova** u 94 datoteke, 59 više nego u prethodnom prolazu. Novi su `tests/ai-orders.test.ts` (planer pod dogovorom i vijeće), `tests/party-plan.test.tsx` (prozor, otvaranje prije poteza, razmišljanje bota), `tests/table-time.test.ts` (vremena) i `tests/combat-polish.test.tsx` (nalazi iz borbe). Tri ranija testa su usklađena: poziv u borbu sada dolazi od saborca koji vodi, nagrada bota ima stanku razmišljanja, i novo ime dugmeta. `npm run build` i `npm run check:render` (621) prolaze.

## Granice

- Tempo je moja procjena onoga što je traženo („nešto sporije”). Potez bota na mapi je sada oko dva puta sporiji, a borba botova oko 30 %. Kome je previše ili premalo, bira **Brisk** ili **Relaxed**.
- Bot koji vodi čeka igrača. Ako igrač ne dođe, on tog poteza samo odmara ili trenira; plan se mijenja u vijeću.
- „Ideš sam” izbjegava polje na kojem igrač stoji, ali ne zna kuda igrač tek namjerava. Vijeće zato kaže kuda saborac ide.
- Kad igrač vodi više likova iste frakcije, „sa mnom” prati najbližeg.
- Savjetnik (**Hint**) zna za dogovor samo kad saborac vodi.
- Vijeće na telefonu prekriva tablu, pa se osvijetljeno polje tamo ne vidi.
- PvP borba u ovom prolazu nije ponovo igrana.
- Nije mijenjano iz pregleda borbe: pobjeda i dalje piše „The battle is won…” i u sceni i u sažetku, a lik bez kockica i dalje prolazi sve korake napada.
- Provjereno je u Chromiumu, na računaru i u emulaciji telefona. Safari, Firefox i pravi uređaji nisu isprobani.

## Datoteke

- `src/ai/orders.ts`: tri dogovora i kome pripadaju. `src/ai/strategy.ts`, `src/ai/planner.ts`: planiranje po dogovoru, šta bot smije dok igrač još ima akcije. `src/ai/council.ts`, `client.ts`, `worker.ts`: vijeće.
- `src/campaign/PartyPlan.tsx`, `party-plan.ts`, `party-plan.css`: prozor i čuvanje dogovora.
- `src/campaign/table-time.ts`: sva vremena stola na jednom mjestu. `stage.ts`, `Stage.tsx`, `stage.css`: najava razmišljanja, razlog saborca, duže najave. `Map.tsx`: figura na putu i sloj figura likova.
- `src/campaign/Combat.tsx`, `CombatScene.tsx`, `CombatArea.tsx`, `D8.tsx`, `combat-flow.ts`, `combat-forecast.ts`, `combat-report.ts`, `combat-round.css`, `dice.css`: tempo i nalazi iz borbe.
- `src/Campaign.tsx`, `src/campaign/Tabletop.tsx`, `bot-turns.ts`: povezivanje.
