# Tabla kao na stolu · 30. 10. 2026.

## Kako igra izgleda uživo

Izvor je zvanični [pravilnik](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf), str. 2–7: popis komponenti, fotografije i dijagram „The Play Area”. Fotografija originalne table je u `public/assets/original-board.jpg`.

- **Tabla:** presavijena tabla leži u sredini stola. Uz njen lijevi rub odštampan je trag iskustva (Experience Track) s nivoima, a uz donji rub trag poteza (Turn Track) od 30 polja sa simbolima za Event karte i nove predmete kod trgovca. Na njoj su i polje za Overlorda, prostor za borbu i mjesto za Merchant špil.
- **Figure:** 120 jednobojnih plastičnih figura stvorenja u 13 vrsta. Zelene i crvene su ciljevi questova, plave su nezavisne prepreke. Uz njih je 16 sivih figura likova.
- **Žetoni:** okrugli portretni žetoni likova idu na trag iskustva i na nivo lika. Tu su još heksagonalni quest žetoni frakcija i žeton-pješčani sat koji se pomjera po tragu poteza. Health (crvene kapi) i energy (plavi štitovi) prate se tokenima na listu lika.
- **Raspored:** igrači Horde sjede s jedne strane table, igrači Alijanse s druge. Svaki pred sobom ima list lika, a okrenuti questovi frakcije stoje pored table.

Recenzenti opisuju „bezbroj šarenih minijatura na kartografskoj tabli” ([Unwinnable](https://unwinnable.com/?p=89984)). Broj komponenti potvrđuje i [Wikipedia](https://en.wikipedia.org/wiki/World_of_Warcraft:_The_Board_Game).

## Šta je preneseno

- **Trag poteza na tabli.** Ispod mape stoji 30 utisnutih polja. Event polja imaju ljubičastu kartu, a polja trgovca bijeli trougao, plavi kvadrat ili ljubičasti krug, u bojama špilova predmeta. Na trenutnom potezu stoji pješčani sat u boji frakcije koja igra. Odigrana polja su prigušena, a na kraju piše **End** ili, u varijanti Defeat the Overlord, krug trake. Čitač ekrana dobija sažetak s brojem poteza i sljedećim Event poljem.
- **Trag iskustva uz lijevi rub.** Portretni žetoni svih šest likova penju se po XP-u prema nivou 5, u stazi svoje frakcije (crvena Horda, plava Alijansa). Zelene pločice označavaju nivoe 2–5, kao na originalnoj tabli. Prikazuje se kad pored mape ima dovoljno prostora (desktop), a na tabletu i telefonu nema bočnog prostora, pa ga nema.
- **Plastične figure.** Stvorenja na tabli su jednobojna: zelena, crvena ili plava, kao figure iz kutije. Boja je odmah vidljiva i iz daleka, a oblik stvorenja ostaje prepoznatljiv. Likovi ostaju portreti u boji, kao portretni žetoni.
- **Fizička tabla.** Blagi prelomi dijele mapu na šest panela presavijene table, a tamni odštampani okvir i rub table uokviruju mapu.

## Asseti

`scripts/prepare-plastic-tokens.ts` pravi 39 jednobojnih verzija (13 stvorenja × 3 boje) iz postojećih portreta u `public/assets/tokens/`. Rezultat je u `public/assets/tokens/plastic/`, ukupno oko 330 KB. Bojenje se radi unaprijed, ne filterom u pregledniku, da pomjeranje i zumiranje mape na telefonu ostanu glatki.

```sh
npx tsx scripts/prepare-plastic-tokens.ts
```

## Šta nije preneseno

- **Prostor igrača oko table.** Listovi likova, karte i questovi i dalje su u desnoj koloni i radnim panelima, a ne poredani oko table kao na stolu. Na ekranu laptopa taj raspored bi previše smanjio mapu.
- **Figure likova.** Figure se ne prikazuju kao sive minijature, jer portret jasnije pokazuje ko je ko.
- **Tokeni health i energy.** Health i energy su brojevi, a ne gomilice tokena.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.086 testova u 55 datoteka prolaze; 3 nova u `board-tracks.test.tsx` |
| `npm run build`, `npm run check:render` | prolaze |
| Chromium, 5 veličina, 183 ekrana | bez odsječenog teksta, elemenata izvan ekrana, vodoravnog skrolanja i grešaka u konzoli |
| Mapa preko cijelog ekrana | tragovi se ne prikazuju, a figure i prelomi ostaju |
