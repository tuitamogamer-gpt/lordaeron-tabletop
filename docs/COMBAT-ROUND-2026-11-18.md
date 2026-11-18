# Borba: obračun runde, rane, PvP i ishod · 18. 11. 2026.

Zahtjev: „Sređuj Combat dalje i dizajn i UI i mehaniku.”

Borba je odigrana u Chromiumu korak po korak u svim oblicima (stvorenje, grupa, boss, Stun/Curse, kasna igra s deset kockica, PvP dvoboj i PvP dva na dva), na računaru i na telefonu, a pravila motora su ponovo upoređena s pravilnikom. Pravila se slažu, pa motor pravila nije mijenjan. Mijenjano je ono što igrač vidi i koliko čeka: prozor sada sam kaže na šta se runda svodi, dugmad za rane kažu šta rana ostavlja liku, PvP pokazuje obje zone borbe i govori riječima stola, niz rana ide tri puta brže, a kraj borbe ima sažetak.

## Mehanika: šta je provjereno

Prema tekstu pravilnika (str. 27–36) provjereno je i slaže se:

- skup kockica (najviše 7 po boji, manje za izgubljene i uklonjene), jedno ponovno bacanje po kockici, žetoni po boji (plava u Damage, crvena u Defense, zelena kao armor);
- Ranged Strike, Damage i Resolution protiv stvorenja i bossova, redoslijed kojim stvorenja padaju, šteta koja ostaje za sljedeću rundu;
- PvP: prag pogotka je najviši nivo protivnika + 2, frakcije se smjenjuju u napadu, svaki armor žeton poništava jedan protivnički ranged ili melee pogodak **i** jedan attrition, preostali ranged pogoci su rane, a u Resolutionu slabija strana prima razliku;
- Stun (dvije kockice po žetonu ili poraz, skida se poslije borbe) i Curse (jedna kockica, REROLL −1, ATTRITION −1, ostaje poslije borbe);
- sastav borbe: jedna vrsta stvorenja, a quest i nezavisna stvorenja se nikad ne bore zajedno.

Nije nađeno pravilo koje motor igra drugačije od pravilnika. Zato nema nove revizije pravila i sačuvane kampanje se igraju isto kao prije. Pravila pojedinih stvorenja s referentnog lista nisu ponovo čitana sa skena.

## Šta je nađeno

Objavljena verzija je snimljena i izmjerena prije izmjene, na 1366 × 768 ako nije rečeno drugačije.

- **Scena je kroz cijelu borbu ponavljala jedan red**: „Ranged first. Hold the line. Strike back.” Ishod razmjene bio je ispisan nešto više od sekunde, dok traje najava razmjene, a zatim ga je zamijenio taj red. Na ekranima nižim od 740 px (npr. 1280 × 720) scena je sakrivena, pa tamo nije pisalo ništa.
- **Rundu je igrač računao sam.** Četiri brojke na krugovima, a nigdje koliko rana stiže ni da li protivnik pada.
- **Dugmad za rane nisu govorila ništa o zdravlju.** „Artumnis takes a wound” je izgledalo isto za lika s jednim zdravljem i za lika s pet. U borbi s bossom prvi klik je oborio lika.
- **Niz rana je trajao.** Kad rane padaju same na jedinog lika, dvije su trajale 6,3 s. Poslije ručno dodijeljene rane dugmad su stajala zaključana 2,4 s.
- **PvP nije pokazivao drugu zonu borbe.** Zone su bile jedna ispod druge u stupcu od 310 px, pa je druga većim dijelom bila ispod ruba. Na telefonu je bila ispod doka.
- **PvP dugmad su bila sirov ispis naredbe**: „horde: armor (0 ranged / 1 melee)”. Frakcija bez armora je svake runde morala kliknuti „horde: armor (0 ranged / 0 melee)”. Korak poslije ponovnog bacanja zvao se „Creature effect” i imao dugme „Resolve creature effect”, iako u PvP-u stvorenja nema.
- **PvP rane obje frakcije stajale su u jednom redu**, bez oznake čija je koja.
- **Natpis „ROLLED HITS” je bio odsječen** na desnom rubu svog stupca, i na računaru i na telefonu.
- **Popis „In this battle” je bio odsječen.** Stupac sa zonom borbe bio je visok koliko i tabla s kockicama i nimalo više: 305 px na 1366 × 768, a 288 px na 1920 × 1080, gdje je ispod njega ostajalo oko 200 px praznog mjesta.
- **Pobjeda je obećavala nagradu „below”**, a ispod nije bilo ničeg, i to i poslije borbe koja ne završava quest. Šta je borba koštala nije pisalo.
- **Curse se nije vidio tamo gdje se broji.** Ispod kockica je pisalo „Rerolls 0 · Attrition 0”, jer se negativan broj prikazuje kao nula.
- **Novo stanje je bljesnulo prije animacije razmjene**: „Assign wounds”, pa opet „Defense”, pa „Assign wounds”.

## Šta je sada

### Na šta se runda svodi

Ispod krugova zone borbe stoje dva zbira:

> **Enemy attack** · 4 attack − 2 hits − 1 armor · **1 wound**
> **Party damage** · 0 ranged + 2 melee + 1 attrition · **3 of 3 · falls**

Prvi je ono što protivnik radi družini, drugi ono što družina radi njemu. Ako Ranged Strike obara nekog prije napada, to je treći red, a napad se računa bez njega. Ispod zbirova piše čije se kockice broje i ko još napada („with Grumbaz’s dice as they lie · Sofeea still to attack”), a kad su svi napali, šta ostaje za sljedeću rundu i šta od toga uzima pravilo protivnika („Zaeldarr the Outcast’s rule removes 2 damage tokens: 4 of 6 stay for the next round”).

Brojeve ne računa prikaz nego motor pravila: koraci Defense faze se odigraju na kopiji javnog stanja i pročita se ishod. Zato zbir ne može reći jedno, a dugme uraditi drugo. Kockice napada koji je u toku broje se kako leže, uključujući pravilo stvorenja. Ništa se ne predviđa: bacanja koja tek slijede nisu u zbiru.

Na telefonu, gdje je zona borbe iznad doka, isto stoji u jednoj rečenici iznad glavnog dugmeta („1 wound incoming · 3 of 3 damage: Crusader falls”).

### Scena govori gdje je runda

Umjesto jednog reda za sve korake, scena sada kaže ko je na redu i šta taj korak donosi: „Sofeea rolls 1 hit of 2 dice · 3 wounds incoming · 1 of 3 damage”, „Crusader hits for 4 · 3 stopped · 1 wound to assign”, „Round 1 is over · 4 damage tokens stay for the next round”, „Sofeea gives up 8 dice · Stun 4: two dice each”. Najava razmjene nosi isti račun: „Crusader attacks for 4 · 3 stopped · 1 wound to assign”.

### Korak poslije ponovnog bacanja

Prije nego što se pritisne dugme, piše šta pravilo protivnika uzima s kockica kako leže: „Murloc: Grumbaz loses 1 health”, i upozorenje ako bi lik time pao. Kad pravilo s tih kockica nema šta uzeti, korak se zove „After rerolls”, a dugme „Continue to hits”. U PvP-u se stvorenje više ne spominje.

### Ko prima ranu

Svaki lik ima dugme s portretom, zdravljem prije i poslije („Health 4 → 3”) i žetonima zdravlja, od kojih jedan treperi. Rana koja uzima zadnje zdravlje je crveno označena i piše „Last Health: Artumnis falls”. Ljubimac koji prima ranu umjesto vlasnika ima svoj red. Iznad dugmadi stoji koliko rana još treba dodijeliti, a u PvP-u svaka frakcija ima svoj red sa svojim brojem.

Zdravlje i energija svakog lika stoje i na njegovoj kartici na vrhu lista, pa se ne mora otvarati list po list. Do četiri lika staje u jedan red, pet i šest u dva.

### Niz rana

Rana poslije koje ih još ima pada u kratkom otkucaju umjesto u punoj razmjeni, a kad rane idu same na jedinog lika, pauza između njih je kraća. Zadnja rana i dalje dobija punu razmjenu.

| Mjera, izmjereno u Chromiumu | Prije | Sada |
| --- | --- | --- |
| Dvije rane same na jedinom liku, od pojave koraka do sljedećeg | 6,3 s | 3,6 s |
| Zaključana dugmad poslije ručne rane, dok ih još ima (tri rane zaredom) | oko 2,4 s | oko 0,75 s |

### PvP

- **Obje zone borbe se vide odjednom.** Na telefonu, tabletu i na ekranu računara nižem od 900 px svaka zona je red od tri pločice s brojevima (Damage, Defense s armorom, Attrition). Na višem ekranu ostaju krugovi, jedni ispod drugih.
- **Poređenje strana** stoji ispod zona čim u njima ima žetona: „Melee + attrition: Horde 2 · Alliance 0”. Dok armor nije iskorišten, pored toga piše koliko ga ko još ima, a ne ko gubi: armor poništava i melee i attrition, pa prije njega ishod nije poznat. Na telefonu ista rečenica stoji iznad dugmadi.
- **Dugmad za armor govore šta poništavaju**: „Alliance armor: cancel 1 melee + 1 attrition”, „Horde: no armor to use”.
- **Frakcija koja nema šta birati ne klikće.** Uz uključen **Auto-continue steps** njen korak armora ide sam, i onda kad druga frakcija još bira.

### Ishod

Pored dugmeta koje zatvara borbu stoji sažetak: ko je pao i u koliko rundi, šta je borba koštala svakog lika („Grumbaz −1 health”, „Sofeea fell”) i quest koji je njome završen, s nagradom. Rečenica o nagradi stoji samo kad borba zaista završava quest; inače piše „Finish combat to continue”.

### Sitnije

- Natpis uz broj pogodaka je „HITS” i staje u svoj stupac.
- Opisi redova kockica su kraći („Strikes first”, „Blocks, then strikes”, „Absorbs damage”), pa tabla s deset kockica staje u prozor na 1366 × 768.
- Ispod kockica piše i cijena Cursea: „Rerolls 0 · Attrition 0 · Curse −3 on both”.
- Stupac sa zonom borbe sada zauzima svu preostalu visinu prozora.
- Najava razmjene se postavlja prije iscrtavanja, pa novo stanje više ne bljesne.

## Provjera

Sve je snimljeno i mjereno u Chromiumu na konačnoj verziji.

| Šta | Rezultat |
| --- | --- |
| Borba odigrana korak po korak na 1366 × 768, **Auto-continue steps** isključen: dva lika protiv stvorenja (16 koraka), boss s tri lika (50), Stun/Curse (38), kasna igra s deset kockica (24), PvP dvoboj (43), PvP dva na dva (50), PvP tri na tri (30) | bez grešaka u konzoli. Snimljen je svaki korak, a pregledani su koraci s obračunom, ranama, armorom i ishodom |
| Isto na telefonu: dva lika protiv stvorenja (16), PvP dvoboj (45), boss (50) | bez grešaka u konzoli |
| Korak s obračunom i PvP korak armora na 1280 × 720, 1920 × 1080 i tabletu | sve staje, ništa nije odsječeno; na 1920 × 1080 PvP zadržava krugove |
| PvP dvoboj s uključenim **Auto-continue steps** | Defense faza prolazi bez klika na armor (ranije dva klika svake runde) |
| Zbir runde naspram motora pravila, u testovima | 13 stvorenja u tri boje, mješovite grupe, 3 Overlorda i svi event bossovi, po tri sjemena: u svakom koraku Defense i Resolution motor uradi ono što je zbir rekao |
| 43 ekrana na računaru (1366 × 768), telefonu i tabletu u oba položaja | bez grešaka u konzoli, bez vodoravnog pomjeranja, bez odsječenog teksta i bez kontrola izvan ekrana |
| Igra samih botova | 2 minute, 53 naredbe, bez zastoja i grešaka (i 3 minute, 82 naredbe, prije posljednjih izmjena natpisa) |
| Jedan igračev lik i pet botova | 60 s, 26 naredbi, 0 klikova umjesto botova, bez grešaka |

Poslije tog prolaza naslov zone u PvP-u je još sveden u jedan red („ALLIANCE · COMBAT AREA · ROUND 2” se lomio prije broja). PvP ekrani su zatim ponovo snimljeni na pet veličina, bez grešaka.

`npm test`: **1.549 testova** u 90 datoteka, 98 više nego u prethodnom prolazu. Novi su `tests/combat-forecast.test.ts` (zbir runde i njegovo slaganje s motorom), `tests/combat-round.test.tsx` (prikaz: zbirovi, scena, rane, korak poslije ponovnog bacanja, PvP, ishod) i `tests/combat-pace.test.ts` (niz rana i automatski korak armora). Jedno ranije očekivanje je usklađeno s novim tekstom pobjede. `npm run build` i `npm run check:render` (621) prolaze.

## Granice

- Zbir runde važi za tokene i kockice kako leže. Ne zna za moći koje igrač tek može odigrati ni za bacanja koja slijede.
- Kad stvorenja u borbi imaju dvije boje i igrač bira koja prva padaju, zbir računa redoslijed koji motor uzima sam (najslabija prva).
- Protiv Nefariana, kad pogodaka ima više nego osmica, igrač bira koji idu u Attrition; tada se kockice napada u toku ne broje u zbir dok se ne polože.
- U PvP-u zbir ne predviđa rane prije nego što se armor iskoristi; pokazuje stanje obje zone i koliko armora ko ima.
- Na ekranu nižem od 740 px scena je i dalje sakrivena; tamo rundu nose zbirovi ispod krugova.
- Pregled 43 ekrana nema PvP borbu među prizorima; PvP je provjeren posebnim igranjem.
- Rana na ljubimcu i redovi kartica za pet i šest likova provjereni su u testu, odnosno na jednom snimku, a ne u cijeloj odigranoj borbi.
- Ocjena izgleda je moja, sa snimaka. Provjereno je u Chromiumu, na računaru i u emulaciji telefona i tableta. Safari, Firefox i pravi uređaji nisu isprobani.

## Datoteke

- `src/campaign/combat-forecast.ts`: zbir runde iz motora pravila, pravilo protivnika na kockicama kako leže, poređenje strana u PvP-u.
- `src/campaign/combat-report.ts`: riječi scene, izbor ko prima ranu, natpisi armora, ishod borbe.
- `src/campaign/Combat.tsx`, `CombatArea.tsx`, `CombatScene.tsx`, `CombatCharacterSheet.tsx`: prikaz.
- `src/campaign/combat-flow.ts`, `src/Campaign.tsx`: kratak otkucaj za niz rana, automatski korak armora, najava razmjene prije iscrtavanja.
- `src/campaign/combat-round.css`: izgled novih dijelova, PvP pločice, visina stupca.
- `tests/combat-forecast.test.ts`, `tests/combat-round.test.tsx`, `tests/playthrough-fixes.test.tsx`.
