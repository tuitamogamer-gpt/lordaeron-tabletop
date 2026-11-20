# Izbor se vidi, ne čita · 20. 11. 2026.

Zahtjev: „Kada izađu eventi, recimo event koji traži guranje plavih na susjedna polja, mapa mora biti vidljiva jer igrači ne znaju gdje guraju. To se mora raditi na mapi. Kada izađe event pa se može kupiti item po pola cijene, cijene moraju biti prikazane uz ikonice itema, a ne samo uz imena, jer ljudi ne znaju kako ti itemi izgledaju. Uvijek mora biti nekakav highlight. Uvijek moraju biti dostupne informacije, a ne da se te stvari rade na osnovu imena.”

Pravila i engine nisu mijenjani: svaki izbor i dalje šalje istu naredbu koju su pravila već provjerila. Mijenjano je gdje i kako se izbor pravi.

## Šta je nađeno

Svaka odluka iz Event karte bila je prozor preko zamućene mape, s dugmadima na kojima piše samo ime:

- **The Beasts of Lordaeron**: sedam stranica dugmadi, „Gnoll · Balnir Farmstead → Venomweb Vale”. Mapa se nije vidjela, pa se nije znalo ni gdje grupa stoji ni gdje je polje u koje ide.
- **Goblin Zeppelin**, Nefarianov korak i **oživljavanje** lika: spisak imena polja.
- **Traveling Merchants**: „Sofeea: Rakzur Club”, bez slike karte i bez cijene. **Goblin Merchant** i danak Bossu isto.
- **Another Path to Power**: tri padajuće liste s imenima talenata.
- **Professions and Crafts**: „take gold”, „recover (1 health)”, bez toga koliko se dobija.
- **Pun ranac** (nagrada, grad, kupovina): padajuća lista „Discard Ley Staff”.
- Kad bot pomjeri plavu grupu, najava je svijetlila polje na kojem stoji *bot*, a ne polje u koje je grupa otišla.

## Šta je sada

### Odluke o poljima prave se na mapi

Za guranje plavih, cepelin, Nefarianov korak i oživljavanje otvara se puna mapa (`map-decision.ts`, `Map.tsx`, `MapDecision.tsx`):

- Polja koja nisu izbor potamne. **Grupe koje se smiju pomjeriti svijetle plavo**, s prstenom oko žetona. Kad se grupa uzme (klik na polje ili na žeton), **polja u koja smije svijetle žuto**, a kamera se približi na njih.
- Prelazak mišem preko žutog polja crta put do njega; klik ga bira (zeleno, s kvačicom). Ništa se ne šalje prije dugmeta u dnu.
- U dnu mape stoji Event karta (uveća se na hover), tekst karte, koraci „1 Pick a group · 2 Pick a region · 3 Confirm”, žeton grupe s „Balnir Farmstead → Venomweb Vale”, šta već stoji na odredištu i dugme **Move the group here**. Tu su i **Move no group** i **Pick another group**.
- Uz ime lika piše čiji je potez i koji po redu: „Grumbaz Crowsblood · Horde · group 1 of 2”.
- Hover preko polja i žetona radi kao i inače, pa se prije izbora vidi šta gdje stoji.
- **Look at the table** (Esc) vraća na sto da se nešto pogleda; odluka čeka iza dugmeta **Decide on the map**.
- Nude se tačno polja koja pravila prihvataju: početna polja frakcija, polja s protivničkim likom i polja s istom vrstom plavih nisu osvijetljena.
- Kad odlučuje bot, mapa se ne otvara; najava njegovog poteza sada svijetli polje u koje je grupa otišla i put od polja na kojem je stajala.

### Itemi se biraju na kartama, s cijenama

- **Traveling Merchants**: cijela ponuda kao karte (do 16 na ekranu, u dva reda). Ispod svake ime, **štampana cijena precrtana i pola cijene pored nje** sa žetonom zlata, i dugme „Buy · 4 gold”. Item za koji nema zlata ostaje na stolu, siv, s „Needs 7 gold”. Gore stoji koliko lik ima zlata i koliko mu je mjesta u rancu.
- **Goblin Merchant**: karte iz ranca s „+3” i „Sell · +3 gold”. **Danak Bossu**: karte iz ranca s „Contribute”.
- **Pun ranac**: bira se na kartama iz ranca, a izabrana nosi traku DISCARD. Isto u nagradi za quest i u gradskoj trgovini, gdje dugme sada nosi i cijenu („Add purchase · 3 gold”).
- **Another Path to Power**: svaki talent je karta; izabere se mjesto, pa zamjena među kartama istog ili nižeg nivoa. Zlato umjesto talenata piše s iznosom.
- **Professions and Crafts**: svaka opcija pokazuje žeton i ishod („Gold 5 → 7”, „Health 1 → 2 · Energy 0 → 1”).

### Sitnije

- U borbi, uz izbor groblja piše koliko je polja daleko od mjesta pada („Graveyard · … · 2 regions from Balnir Farmstead”).

## Šta nije dirano

- Izbor groblja **u toku borbe** i dalje je dugme u sobi za borbu (mapa je iza nje); dobio je samo udaljenost.
- **New Horizons** (zamjena questa) ostaje red po questu s oznakom, imenom i nagradom.
- Padajuće liste u trgovini među saborcima (izbor saborca), hrana pri odmoru i izbor kockica za moć u borbi nisu mijenjane.

## Provjera

- **1.634 testa** (16 novih u `tests/visible-choices.test.tsx`): mapa nudi tačno naredbe koje pravila prihvataju, ništa se ne šalje prije potvrde, cijene su pola štampane (kupovina naviše, prodaja naniže), pun ranac se rješava na kartama, bot-ov potez se najavljuje na odredištu.
- `npm run build` i `npm run check:render` prolaze.
- U pregledniku (1440×900, 1280×720 i 390×844) odigrano iz snimljenih partija: guranje plavih (sam i s botovima, gdje se mapa zatvori dok bot igra i opet otvori za sljedeću grupu), cepelin, Nefarianov korak, kupovina po pola cijene s praznim i punim rancem, prodaja, danak, talenti, zanati, nagrada i grad s punim rancem.
- Oživljavanje van borbe je rijetko (šteta od Event karte) i nije nađeno u odigranim partijama; pokriveno je testom na mapi, ne snimkom ekrana.
