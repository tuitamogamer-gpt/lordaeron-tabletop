# Dotjerivanje dizajna · 21. 11. 2026.

Zahtjev: „Unaprijedi još dizajn.”

Snimljeno je 40 ekrana na 1440×900 i pregledano njih dvadesetak, redom kojim ih igrač najčešće vidi. Sto, mapa, borba, trgovina, špilovi klasa, biblioteka karata i dogovor sa saborcima nisu tražili izmjenu. Šest mjesta jeste.

## Šta je nađeno i šta je sada

### List lika (Characters i stranica Heroes)

- **Zaglavlje je stajalo na okviru.** „CHRONICLES OF LORDAERON” je dodirivalo gornji rub, a ime klase („PALADIN”) ulazilo je pod ugaoni dragulj. Zaglavlje je sada unutar okvira; ime klase je uklonjeno jer već piše na portretu („Human · Paladin”).
- **Opremljene karte su visile u sredini kolona dvaput viših od njih.** Sada stoje odmah ispod naziva mjesta, a ispod svake piše **ime karte i šta ona radi** („+2 red dice · +1 Reroll”, „Preparation: +2 blue dice”). Štampani tekst se u toj veličini ne može pročitati.
- Nazivi mjesta zauzimaju istu visinu, pa su karte u jednoj liniji; ranije je mjesto s nazivom u tri reda guralo svoju kartu niže.
- **Na niskom ekranu (1280×720) donji red karata ulazio je pod donju traku okvira.** Karta se sada smanji na visinu koja postoji; natpis ispod nje prikazuje se samo gdje ima mjesta.
- Na telefonu su dugmad u zaglavlju lista izlazila 15 px izvan ekrana (postojalo je i prije ovog prolaza). Sada prelaze u novi red.

### Hronika

- Bilo je **šest visokih kutija po stranici**, svaka s jednim kratkim redom: 26 stranica za 155 unosa.
- Sada je 12 unosa po stranici (13 stranica), **grupisanih po potezu**, s naslovom „Turn 16 · 2 entries”.
- Svaki unos ima **znak svoje vrste** i boju ruba: putovanje, odmor, grad, borba (crveno), poraz, pobjeda (zlatno), iskustvo (zeleno), Event (ljubičasto), predmeti.
- **Imena likova su istaknuta** u rečenici.

### Pregled Encounter decka

- Uska kolona teksta bila je gurnuta u sredinu, karta Overlorda mala i daleko desno, a zadnje dugme odsječeno pri dnu.
- Sada su dvije kolone koje počinju od vrha: lijevo špil s tri broja kao pločicama, desno **veća karta Overlorda i njegova pravila borbe ispod nje**. Ništa nije odsječeno.

### Vodič kroz pravila

- Šest kartica bilo je razvučeno preko stranice, svaka s tri reda teksta.
- Kartica „Victory” je i dalje opisivala jedini završetak koji su kampanje nekad imale („The track repeats after turn 30…”), što od jučer nije tačno.
- Sada je **osam kartica, po četiri u redu**, svaka s kratkim uvodom i tri tačke: postavljanje, dvije akcije, putovanje, borba, questovi i nagrade, razmjena, kako kampanja završava (oba završetka), AI i lokalna igra.

### Špilovi questova

- U dnevniku questova tri špila samo pokazuju koliko questova ostaje, ali ih je opće pravilo za onemogućenu dugmad crtalo s 44 % jačine, kao da su van igre. Sada su u punoj jačini. Kod izbora zamjenskog questa prazan špil ostaje zatamnjen.

### Prozor odmora

- Hrana je bila padajuća lista u kojoj je na većini odmora pisalo „No food in your bag”. Sada se bira **na svojoj karti**, kao i svaki drugi predmet, a kad hrane nema, prozor to i ne pita.

## Šta nije dirano

- Pravila igre, naredbe i sačuvane partije.
- Ekrani koji su u pregledu bili u redu (nabrojani na vrhu).
- Postavke („Your game”) se na 900 px visine i dalje skrolaju unutar prozora.

## Provjera

- **1.687 testova** (bilo ih je 1.679): osam novih u `tests/design-polish.test.tsx`, za sažetak karte, natpise na listu lika, hroniku i vodič. Testovi hronike i odmora prilagođeni su novoj veličini stranice i izboru hrane na karti.
- `npm run build` i `npm run check:render` prolaze.
- U pregledniku:
  - list lika, sve kartice (Equipment, Spellbook, Bag, Talents, Class deck) na 1440×900, 1280×720, 1366×768 i 1920×1080: nijedna karta nije odsječena i ništa se ne skrola;
  - hronika, vodič, pregled Encounter decka i dnevnik questova na 1440×900;
  - prozor odmora s hranom u rancu;
  - hronika, vodič, Heroes, pregled Encounter decka i odmor na 390×844: bez vodoravnog skrolanja.
- Nije gledano: vodič i pregled Encounter decka između 1000 i 1199 px širine (vodič tamo prelazi na dvije kolone, što je pokriveno samo stilom) i hronika s praznim filterom na telefonu.

## Fajlovi

- `src/campaign/design-polish.css`: svi stilovi ovog prolaza; učitava se poslije `party-items.css`, a `clean-layout.css` ostaje zadnji.
- `src/campaign/card-gist.ts`: šta karta radi, u jednom redu.
- `src/campaign/CharacterSheet.tsx`, `Chronicle.tsx`, `EncounterPanel.tsx`, `RulesGuide.tsx`, `RestEditor.tsx`.
