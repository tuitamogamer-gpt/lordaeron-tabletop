# Moć se igra jednim klikom, a list kaže odakle energija · 12. 11. 2026.

Prijava: u borbi nije jasno kako se aktivira sposobnost, a kod Warriora „Charge ne daje 1 energiju, pa se Heroic Strike ne može koristiti”.

Pravila borbe se ne mijenjaju i nema nove revizije pravila: engine je Charge primjenjivao ispravno. Mijenja se prozor borbe, koji to nije pokazivao.

## Charge i Heroic Strike

Na listu Warriora piše: „Start of your Dice Pool step: Gain 1 Energy. At the end of combat, lose any Energy in excess of your capacity.” Heroic Strike košta 2 energije, a Warrior 1. nivoa ima kapacitet 1. Charge daje energiju tek kad Warrior postane napadač, tj. na početku njegovog Dice Pool koraka.

Tri situacije u kojima je izgledalo da Charge ne radi:

| Situacija | Šta je list pisao | Šta piše sada |
| --- | --- | --- |
| Bira se ko napada (borba s više likova, ili isključen **Auto-continue steps**) | Energy 1 / 1 · Heroic Strike: „Needs 2 energy · 1 available” · Charge: „Automatic effect” · „No optional abilities available for Grumbaz at this step.” | „Charge gives +1 when Grumbaz attacks: 2 to spend” · Heroic Strike: „Ready when Grumbaz attacks · 2 energy with Charge” · na dugmetu: „Grumbaz attacks · 2 red, 1 green dice · 2 energy · Heroic Strike ready” |
| Druga runda, nakon što je Heroic Strike odigran u prvoj | Energy 1 / 1 · „Needs 2 energy · 1 available” | „Needs 2 energy · Grumbaz has 1 · Charge gives 1 each round”. Energija iznad kapaciteta ostaje do kraja borbe, pa je Heroic Strike na 1. nivou dostupan svake druge runde. |
| U Ranged mjestu je luk ili puška | Charge se nije vidio nigdje, bez objašnjenja | „Charge lies under Laminated Recurve Bow and gives no energy”. Pravilnik, str. 14: karta stavljena preko odštampane karte zamjenjuje njen učinak, a prekrivena karta „is no longer considered to be equipped”. |

Kad Warrior napada, iznad moći piše: „Grumbaz · energy 2 / 1 · +1 from Charge this round · 1 above capacity is lost when combat ends”.

Isto važi za svaku kartu koja sama daje energiju: Arcane Intellect, Icicle Rod, Lorekeeper’s Ring.

Prozor do ovih rečenica dolazi tako što naredbu „lik napada” odigra na kopiji javnog stanja (`attackPreview` u `src/campaign/combat-readiness.ts`) i pročita energiju, kockice i moći koje postaju dostupne. Ta naredba ne baca kockice i ne vuče karte, pa pregled ne otkriva ništa skriveno; test provjerava da prava naredba zatim da isti rezultat.

## Aktivacija jednim klikom

Ranije: red s dugmetom **Available +** → otvara se pregled → **Use … · n energy**. Sada svaka moć koja se može odigrati ima svoj red s dugmetom **Use** i cijenom na njemu. Klik je odigra odmah.

- Red pokazuje sličicu karte (prelazak mišem ili dodir otvara cijelu kartu), ime, učinak riječima („+1 red dice · +1 Reroll”) i energiju prije i poslije („Energy 2 → 0”).
- Moć s izborom (jačina, plaćanje, meta, kockice) ima izbor u istom redu, kao dugmad. Prva dozvoljena opcija je već odabrana, pa jedan klik i dalje radi. Više od šest opcija ide u padajući meni.
- Dvije kockice iste boje s istim brojem su isti izbor. Ranije je npr. Parry nudio tri jednaka dugmeta, po jedno za svaku crvenu kockicu.
- Odigrana moć ostaje ispisana s učinkom („✓ Heroic Strike +1 red dice · +1 Reroll”). Kad ih je više od tri, ispisuju se samo imena.
- **Take back** vraća posljednju moć dok ništa nije bačeno: energija se vraća, kockica odlazi, a naredba se briše iz sačuvane kampanje. Radi i Ctrl+Z. Moć koja baca kockicu (kockica dodata nakon bacanja, nezavisno ponovno bacanje) ne može se vratiti, kao ni bacanje, izbor napadača ili prelazak u sljedeći korak.

## List lika u borbi

List ima dva dijela.

**Gore, za čitanje:** lik, zdravlje i energija, i svaka karta na listu s onim što radi ili zašto čeka. Primjeri: „+1 red dice · applied this round”, „Used this round”, „Use after rerolls, in Sofeea’s own attack”, „Only in Grumbaz’s own attack”, „Grumbaz has attacked this round · next round”, „Needs: equipped: Cat Form”.

**Dole, zajedno:** energija za trošenje, moći koje se sada mogu odigrati i glavna akcija koraka (**Roll**, **Keep results**, **Bank successful hits**…). Tu su i moći drugih igračevih likova koje se mogu odigrati tokom tuđeg napada, s imenom lika, pa ih ne treba tražiti po karticama.

Ostalo:

- Kad korak ima samo jedan nastavak, to dugme je zlatno.
- Polja za broj kockica („Choose your dice pool”) su sklopljena iza dugmeta **Roll fewer dice**. Otvorena su odmah samo kad lik ima Stun ili Curse.
- Dok napada AI lik, vide se i njegove odigrane moći.

## Kockice leže uz svoju kartu

Ispod svake nebačene kockice piše karta zbog koje je uzeta: „Battle Stance”, „Rusty Sword”, „Slarkskin”, a nakon klika na Use i „Heroic Strike”. Nakon bacanja tu stoji rezultat, a izvor ostaje u opisu kockice.

## Telefon

Na ekranu 390 × 844 moći su počinjale 600 px ispod ruba ekrana, ispod dugmeta Roll. Sada:

- Sto (protivnik, kockice, Combat Area) se skrola gore, a donji dio lista stoji na dnu ekrana: energija, moći s dugmetom Use i glavna akcija.
- Gornji dio lista je sklopljen u jedan red („Grumbaz ♥ 4/4 ⚡ 2/1”, uz Stun i Curse kad ih ima). Dugme **Sheet** ga otvara.
- Sto se sam pomjeri na dio o kojem je korak: kockice dok se priprema i baca, Combat Area dok se brane i dijele rane, vrh kad je borba gotova.
- Glavna akcija je preko cijele širine, a sporedne po dvije u redu. Ranije su četiri dugmeta u koraku ponovnog bacanja prekrivala kockice.
- Prekidači **Auto-play bots** i **Auto-continue steps** su u jednom niskom redu.

## Kraće čekanje

Nakon moći i nakon izbora napadača prozor je 2,2 sekunde bio zaključan, a prvu sekundu je prikazivao stanje od prije klika. Ta dva događaja nemaju ishod koji treba najaviti, pa se učinak sada vidi odmah, a zaključavanje traje 0,6 sekundi. Scena ispiše ime odigrane karte. Razmjene udaraca (odbrana, rane, melee) i dalje imaju punu animaciju.

## Oprema: karta preko odštampane karte

U prozoru **Character management**, kad se karta stavi preko odštampane, piše šta se gubi: „Scimitar covers Rusty Sword. A covered starting card is not equipped: Rusty Sword does nothing while it lies underneath (+1 red dice).” Na mjestu piše „covers Rusty Sword”. Za Warriora je to važno kod Ranged mjesta: luk ili puška tamo isključuju Charge.

## Šta nije mijenjano i šta nije provjereno

- Engine i pravila borbe su isti; sačuvane kampanje se učitavaju i igraju kao ranije.
- AI ne bira drugačije nego prije.
- Ne znam koja je od tri situacije iz tabele bila ona iz prijave.
- Raspored je provjeren u Chromiumu s emulacijom telefona, ne na stvarnom uređaju.
- Uklonjeni su stilovi starog prikaza: `ability-choice.css` i 34 pravila za `.combat-skill-list` i `.combat-skill-group` u šest datoteka, koja više nijedna komponenta nije koristila.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.260 testova u 75 datoteka prolazi (ranije 1.234 u 73). Novi: `combat-readiness.test.ts` (15: pregled napada, razlozi čekanja, izvor energije, druga runda, prekriveni Charge, vraćanje moći) i `combat-play.test.tsx` (9: izbor napadača, moći i glavna akcija zajedno, kockice uz kartu, Take back, sklopljeni list, prava kampanja, napomena u opremi). `ability-choices-ui.test.tsx` je prepisan za jedan klik (18 testova, ranije 16), a dva testa u `combat-ui.test.tsx` usklađena. |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta |
| Chromium, Warrior s Heroic Strikeom, 1366 × 768 | Use → treća crvena kockica s natpisom „Heroic Strike”, energija 2 → 0, Rerolls 0 → 1, Roll 3 D8 → Roll 4 D8. Take back → sve se vraća i sačuvana kampanja završava naredbom izbora napadača. Zatim cijela runda do pobjede. |
| Chromium, borba s dva i s tri lika | Dugmad za izbor napadača s pregledom; borba s tri lika pokazala je da duga lista karata izgura donji dio lista izvan ekrana, što je ispravljeno |
| Chromium, završna bitka, likovi 5. nivoa | Tri moći u redu (Earth Shock, Frost Shock, Parry), Parry s jednim izborom kockice umjesto tri ista |
| Chromium, AI saveznik napada | Njegove moći ostaju ispisane („Sofeea · Dire Wand”, „Sofeea · Crimson Robe”) |
| Chromium, 390 × 844 i 360 × 740 | Use i Roll su na ekranu bez skrolanja; sto se pomjera kroz korake (položaj 128 → 326 → 372 → 414 → 0 px); otvoren list se skrola |
| Chromium, 1280 × 720, 1920 × 1080, 1024 × 768, 820 × 1180 | Bez vodoravnog skrolanja, ništa ne izlazi iz prozora, donji dio lista je cijeli vidljiv s jednom i s tri moći |
| Chromium, AI vodi svih šest likova | 3 minute: 148 naredbi, 5 poteza, bez zastoja i bez grešaka u konzoli |
