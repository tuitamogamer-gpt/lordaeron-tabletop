# Čisti redovi i funkcionalnije opremanje · 20. 11. 2026.

Zahtjev: „Sredi sve stvari oko dizajna da bude clean, ima nekad nekih preloma i redova koji vise. Onaj equip opreme na kraju turna malo sredi da bude funkcionalniji.”

Pravila igre nisu mijenjana.

## 1. Prelomi i redovi koji vise

**Kako je traženo.** Skripta je otvorila 35 ekrana u pregledniku (sto, sve kartice panela, puna mapa, grad, odmor, opremanje, četiri stanja borbe, nagrade, talent, aukcija, pet event odluka, tri koraka postavke, vijeće, postavke, pravila, biblioteka karata, likovi, hronika) na 1440 × 900 i 1280 × 720 i za svaki blok teksta izmjerila redove: zadnji red koji je patrljak, kratak natpis u dva reda, tekst odsječen vlastitim okvirom i tekst koji izlazi iz okvira.

**Nađeno** (1440 × 900, strogi prag): 11 patrljaka i prelomljenih natpisa i 2 teksta koja izlaze iz okvira. Primjeri: „COMBAT AREA · ROUND / 1”, „Melee / / Defense” i „Blocks, then / strikes” u borbi, „Train · 1 / action” i „Printed / sheet” na kartonu lika, „Choose a compatible / card” u slotu, napomene u postavci i pravilima koje završavaju jednom ili dvije riječi u zadnjem redu, „Actions” koji izlazi iz svoje kolone na stolu.

**Sada.** Novi stil `clean-layout.css`, učitan posljednji:
- **Tekući tekst ne ostavlja jednu riječ samu u zadnjem redu** (`text-wrap: pretty`), svuda.
- **Naslovi, natpisi i dugmad koji trebaju dva reda lome se na redove jednake dužine** (`text-wrap: balance`), umjesto punog reda i patrljka. Isto za kratke napomene od dva-tri reda.
- **Broj i njegova jedinica ostaju u jednom redu** (zlato, oznaka questa, brojači).
- Pojedinačno: natpisi traka kockica u borbi su u jednom redu (kolona je šira); „COMBAT AREA · ROUND 1” ide cijeli ispod imena frakcije; „Actions” ima svoju širinu; dugmad na kartonu lika ne lome riječi.

Poslije izmjene isti pregled nalazi 2 slučaja na oba ekrana: ime lika na pločici portreta, koje je namjerno u dva reda.

## 2. Opremanje na kraju poteza

**Nađeno.**
- Karte za izabrani slot stajale su u koloni širokoj oko 185 px, s opisima u četiri reda, pored praznog panela od 360 px rezervisanog za veliku kartu koja se ne prikazuje kad je slot prazan.
- Šta lik ima, a nije opremljeno (moć naučena ovog poteza, predmet u rancu), nije se vidjelo dok se ne otvori baš onaj slot u koji staje.
- Naziv slota „Instant / Active / constant” lomio se u dva reda i gurao kartu naniže; velika karta je izlazila iz panela i sjekla svoj natpis.
- Poslije potvrde prozor se zatvarao, pa se za sljedećeg lika moralo ponovo kliknuti „Equip …”.

**Sada.**
- **Not equipped**: red iznad slotova sa svim kartama koje lik ima, a nisu u slotu. Svaka pokazuje sliku, ime, cijenu u energiji i slot u koji ide („Slot 02 →”). Jedan klik je stavi tamo i otvori taj slot. Bira se izabrani slot ako karta u njega staje, inače prvi slobodan u koji staje.
- **„+3 to equip”** na slotu kaže koliko neopremljenih karata u njega staje.
- **Suggest a loadout** popuni slotove opremom koju bi izabrao AI lik s tim kartama i tom energijom. Ništa se ne snima dok igrač ne potvrdi; „Reset changes” vraća staro.
- **Karte za slot su puni redovi** s imenom i opisom u jednom redu; kad nema velike karte, redovi zauzimaju cijeli panel. Velika karta uzima visinu koja je ostala i njen natpis ostaje vidljiv.
- **Potvrda ide na sljedećeg lika**: u zaglavlju piše „Then Sofeea, Zowka”, uz dugme „Next: Sofeea”, a prozor se zatvara tek poslije posljednjeg.
- Naziv slota je jedan red („Instant/Active/constant”, puni naziv na hover).

Na telefonu su novi alati u zaglavlju u svom redu ispod imena, a red Not equipped ispod svog naslova; prozor na 390 px nema vodoravni višak (prva verzija ga je imala, 27 px, ispravljeno prije objave). Ostatak izgleda za telefon nije mijenjan.

## 3. Sitno uz zonu borbe

U borbi frakcija na niskom ekranu tri polja su red pločica; sada svaka nosi boju svoje posude (plava, crvena, jantarna) umjesto iste smeđe.

## Provjera

- **1.659 testova** (7 novih u `tests/equipment-quick.test.tsx`): red neopremljenih karata i slot u koji svaka ide; jedan klik stavlja kartu i otvara slot, a ništa se ne šalje prije potvrde; prijedlog opreme je isti kao izbor planera i može se poništiti; najava sljedećeg lika; pravila preloma su u stilu koji se učitava posljednji.
- Pregled preloma: 13 nalaza prije, 2 poslije (oba namjerna), na 1440 × 900; na 1280 × 720 isto 2.
- U pregledniku: opremanje ratnika s tri naučene moći i štitom u rancu, klik na „Thunder Clap → Slot 02”, „Suggest a loadout” (4 slota promijenjena), potvrda prelazi na Sofeeu.
- `npm run build` i `npm run check:render` prolaze.

## Granice

- Pregled preloma je rađen na dvije desktop veličine; telefon nije pregledan ovom skriptom.
- Skripta mjeri tekst koji je na ekranu u trenutku snimka; stanja koja nisu u spisku (npr. svaki pojedini event, kraj kampanje) nisu izmjerena, ali globalna pravila preloma važe i za njih.
- `text-wrap: pretty` i `balance` podržavaju noviji preglednici (Chrome 117+, Safari 17.5+, Firefox 121+ za balance); stariji lome kao prije.
