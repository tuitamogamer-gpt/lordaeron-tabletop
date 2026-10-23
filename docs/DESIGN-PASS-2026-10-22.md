# Dizajn: čitljivost, dosije i odluke · 22. 10. 2026.

Svi ekrani igre snimljeni su u Chromiumu na 1280×720, 1366×768 i 1920×1080: setup, sto, svi paneli, akcije, mapa, stranice, postavke i 14 sačuvanih stanja partije (nagrade, događaj, aukcija, talent, faze borbe, borba s bossom, završetak). Za svaki ekran automatski audit traži odsječen tekst, elemente izvan ekrana, skrolanje stranice i sitan tekst.

## Ispravke

- **Dosije lika.** Okvir je slika rastegnuta preko cijelog lista, a njegov donji lijevi ukras zauzima oko petinu visine. Prekrivao je natpis Curse i dugme Manage, najjače na 1920×1080. Lijeva kolona sada završava iznad ukrasa, a dugmad **Manage** i **Train** su u zaglavlju dosijea. Rasna sposobnost je kompaktan red s imenom i efektom. Duga imena se više ne lome usred riječi, a red s klasom se skriva kada je portret nizak. Dvocifreno zdravlje ostaje u jednom redu.
- **Bossovi događaja.** U borbi protiv npr. The Abomination of Darrowshire prikazivala se lobanja s natpisom „Encounter”. Zaglavlje i bojno polje sada pokazuju ime i ilustraciju bossa.
- **Aukcija.** Šest polja preko cijele širine tražilo je skrolanje. Predmet je sada lijevo, a ponuđači u mreži s portretom, zlatom, stepperom −/+ i dugmetom **Seal bid**. Ko je već ponudio vidi se kao zapečaćen, bez iznosa.
- **New Horizons.** Umjesto 18 dugmadi tipa „Grumbaz: Terror in the Fields → green” sa straničenjem, svaki quest je jedan red s dugmadima za zeleni, žuti i crveni špil i brojem preostalih karata, uz **Keep every quest**.
- **Čitljivost.** Na skoro svakom ekranu bilo je teksta od 6–8 px, npr. „ROLLED HITS” od 6 px i „Threat level” od 7 px. Završni sloj stila podiže te grupe na 9–10 px; SVG oznake mape i kockica se skaliraju s pogledom i nisu dirane. Na ekranima od 1700×950 ključni natpisi rastu još jedan korak.
- **Sitnice.** Opis Deadly PvP koristi cijeli red, a ukrasni natpis scene borbe, koji je na svakoj veličini bio ispod portreta heroja, uklonjen je.

| Tekst od 8,5 px ili manje | Prije | Poslije |
| --- | --- | --- |
| 1366×768 | 630 | 3 |
| 1280×720 | 669 | 3 |
| 1920×1080 | 471 | 18 |

Preostala tri su natpis „LEVEL” u bedžu nivoa širine 35 px. Na sve tri veličine audit ne nalazi odsječen tekst, elemente izvan ekrana niti greške u konzoli.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.066 testova u 49 datoteka prolaze; 4 nova u `decision-design.test.tsx` |
| `npm run build` | prolazi |
| `npm run check:render` | 621 komponenta, bez `undefined` / `NaN` |
| Chromium, 3 veličine × 39 ekrana | bez odsječenog teksta, elemenata izvan ekrana i grešaka u konzoli |

## Drugi krug · 23. 10. 2026.

- **Dnevnik u koloni stola.** Na ekranima od 900 px visine, ispod Overlord kartice, prikazuju se aktivni questovi frakcije odabranog lika s oznakom, regijama i napretkom. Klik pokazuje quest na mapi, a knjiga otvara ciljeve i nagrade. Na nižim ekranima kolona ostaje nepromijenjena.
- **Nagrade.** Karta je veća i stoji pored panela za preuzimanje. Primalac se bira portretom sa stanjem torbe umjesto padajuće liste, a zaglavlje nagrade je sabijeno da sve stane na laptop ekran.
- **Novi talent.** Dijalog prati broj ponuđenih talenata i centrira karte, umjesto stranice sa šest kolona koju tri karte pune do pola.
- **Dosije na 1280×720.** Sedma kolona opreme klizila je ispod desnog okvira. Svih sedam kolona sada staje unutar okvira, a dugme dodatka opreme je visoko 24 px umjesto 18.

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.067 testova u 49 datoteka prolaze |
| Chromium, 3 veličine × 39 ekrana | bez odsječenog teksta, elemenata izvan ekrana, premalih dugmadi i grešaka u konzoli |

## Treći krug · 23. 10. 2026.

- **Završni ekran kampanje.** Umjesto natpisa „Alliance wins! 10 turns” prikazuje se sažetak: pobjednik i način završetka (pad Overlorda s imenima heroja koji su ostali na nogama, finalna PvP bitka ili Nefarianov neriješen ishod), broj odigranih poteza, završeni questovi po frakciji i heroji obje frakcije s nivoom i zlatom. Pobjednička frakcija je istaknuta. Dugmad vode u Chronicle, na sto ili u novu kampanju; sa stola se sažetak vraća dugmetom **Campaign summary**.
- **Tačno trajanje.** U kampanjama Defeat the Overlord traka od 30 polja kreće ispočetka, a ekran je prikazivao samo trenutni potez. Sačuvana partija koja je završila u 3. krugu na 10. potezu sada pokazuje **70 turns played · Lap 3 · turn 10 of 30**.
- **Sto nakon kraja.** Podnožje stola piše „The campaign is over” umjesto „1 of 2 actions remaining”.
- **Učitavanje.** React (69 KB gzip) i biblioteke zod i lucide (31 KB gzip) idu u zasebne pakete. Oni se rijetko mijenjaju, pa ostaju u kešu preglednika: nakon deploya se ponovo preuzima 244 KB umjesto 346 KB (gzip). Lijeno učitavanje stranica Card library, Rules i Chronicle nije urađeno jer zajedno imaju oko 12 KB; najveći dio paketa su podaci igre, engine i React.

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.071 test u 50 datoteka prolazi; 4 nova u `campaign-summary.test.tsx` |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta |
| Chromium, 3 veličine × 39 ekrana | bez odsječenog teksta, elemenata izvan ekrana, premalih dugmadi i grešaka u konzoli; sažetak staje i na 1280×720 |

## Granice

Uvećanje cijelog interfejsa na velikim ekranima nije izvedivo bez prepravke rasporeda: CSS `zoom` skalira i `100dvh`, pa raspored vezan za visinu ekrana prelazi ekran. Na visokim ekranima taj prostor sada koristi dnevnik questova.
