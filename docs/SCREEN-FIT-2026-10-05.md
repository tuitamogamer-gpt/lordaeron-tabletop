# Prilagodba desktop ekranu i tok borbe · 5. oktobar 2026.

Prvi prolaz s pravim Chromiumom (Playwright, 1280×720, 1366×768 i 1920×1080) umjesto jsdom provjera. Pravila igre, sadržaj karata i format sačuvane partije su nepromijenjeni.

## Šta je bilo pogrešno

- **Borba (1366×768):** prag (threat), zajednički totali, popis družine i pravila stvorenja bili su ispod ruba arene bez ikakvog znaka da se može skrolati; natpis „THREAT LEVEL” presječen na pola. Mreža karata u desnom panelu rezala je karte na pola jer su kontrole za bacanje zauzimale 225 px. Kompaktna pravila `max-height:760px` nisu obuhvaćala 768 px, najčešću visinu laptopa, pa je 720 px izgledao bolje od 768 px.
- **Borba, tok:** jedan samostalni PvE krug tražio je oko jedanaest klikova bez ikakve odluke („Continue to rerolls”, „Keep results” bez dostupnih ponovnih bacanja, „Resolve creature effect”, „Bank successful hits”, „Start next round”…). Dugmad „Grumbaz: wound” i „Grumbaz: Brill” nisu objašnjavala šta rade.
- **Lični list (Characters, Heroes):** sadržaj je sjedio preko naslikanog okvira; Curse/Stun red i dugmad Manage/Train prelazili su donji rub, a oznaka klase gornji desni ornament.
- **Setup, korak Characters:** izbor „Your character” i uputa bili su skriveni ispod mreže likova bez indikatora skrolanja.
- **Mapa:** nakon klika na AI lik mapa je javljala samo „Travel is currently unavailable.”; kada je na potezu frakcija koju vodi isključivo AI, sto nije govorio šta dalje.
- **Quests panel:** zalutali ugao okvira (`.table-frame:before`) iznad brojača questova.

## Promjene

- `src/campaign/screen-fit.css` (učitava se posljednji): arena borbe je flex kolona s vidljivom trakom skrolanja; kompaktniji encounter, vremenska traka, scena i polja kockica; totali (Damage / Defense / Attrition) dolaze odmah ispod kockica, bez dupliranog naslova i velike threat trake. Prag se prikazuje kao kompaktna oznaka u zaglavlju kockica. Desni panel koristi container query jedinice tako da prvi red karata uvijek stane u prostor iznad kontrola; birač kockica je jedan red; popis likova se sakriva kad je u borbi samo jedan lik. Na visinama do 740 px scena bojišta se sakriva u korist kockica i totala.
- Breakpointi `max-height:760px` u `combat.css`, `combat-choices.css` i `ability-choice.css` sada su `800px`.
- **Auto-continue steps** (prekidač u podnožju borbe, uključen podrazumijevano, pamti se u `lordaeron-base-auto-continue`): kada je jedina legalna naredba igrača knjigovodstvena (`advance`, `tokens`, `monster`, jedini mogući `attacker` ili `wound`) i ni jedan bot nema potez na čekanju, ona se šalje sama nakon `AUTO_CONTINUE_MS` (900 ms). Bacanje, ponovna bacanja, sposobnosti, ishod, oživljavanje i svaki izbor između više meta ili likova ostaju ručni. Logika je u `bookkeepingStep` (`combat-flow.ts`), s testovima.
- Natpisi: „Grumbaz takes a wound”, „Revive Grumbaz at Brill”; `commandLabel` daje „take a wound” i „revive at …”.
- Lični list: unutrašnji razmak prati naslikani okvir (`--dossier-inset`, 3,6 % širine), a racial karta, mreža opreme i galerije koriste preostalu visinu umjesto fiksnih vrijednosti.
- Setup: mreža likova skrola unutar koraka, a izbor igrača ostaje vidljiv iznad podnožja.
- Mapa objašnjava da AI vodi odabrani lik; sto prikazuje obavijest „turn belongs to the AI” s dugmetom **Play AI turn** kada aktivna frakcija nema ljudskog igrača.
- `scripts/snapshot-states.ts`: izvozi sesije na zanimljivim odlukama (nagrade, talenti, eventi, aukcija, management, više vrsta borbe) radi pregleda UI-ja u browseru.

## Provjera

- `npm test`, `npm run build` i TypeScript klijent/server prolaze.
- Playwright snimci prije i poslije na 1280×720, 1366×768 i 1920×1080: setup, sto, svi paneli, akcije, sve stranice, borba kao igrač (putovanje, izazov, krugovi, poraz, oživljavanje), nagrade, talenti, eventi, aukcija i management. Konzola bez grešaka i upozorenja.
