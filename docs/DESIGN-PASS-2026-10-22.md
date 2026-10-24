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

## Četvrti krug · 23. 10. 2026.

- **Undo.** Pogrešan Travel ili Rest više nije konačan. Nakon poteza se pored **End turn** pojavljuje dugme **Undo travel**, **Undo rest** i slično; isto radi Ctrl+Z (Cmd+Z na Macu). Može se vratiti do 12 uzastopnih poteza.
- **Bez varanja.** Vraćaju se samo Travel, Rest, Train, Town, Trade i opremanje, i to samo ako potez nije koristio slučajnost, nije promijenio nijedan skriveni špil ni stvorenja na mapi i nije otvorio borbu, događaj, aukciju ili nagradu. Challenge, kraj poteza i potezi AI-ja zatvaraju historiju poništavanja, pa se kockice ne mogu ponovo bacati, a karta se ne može vidjeti pa vratiti. U sačuvanoj partiji od 3.302 naredbe svih 512 takvih poteza ispunjava taj uslov.
- **Izbor sljedećeg questa.** Na 1366×768 i 1280×720 dugmad ispod karata špilova bila su ispod ruba dijaloga. Prazan red opcija više ne zauzima prostor, a karte špilova se smanjuju prema visini ekrana; dijalog staje bez skrolanja na sve tri veličine.

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.074 testa u 51 datoteci prolaze; 3 nova u `undo.test.ts` |
| Chromium | Rest → Ctrl+Z vraća akciju i autosave na prethodno stanje; 3 veličine × 39 ekrana bez odsječenog teksta, elemenata izvan ekrana i grešaka u konzoli |

## Peti krug · 24. 10. 2026.

Igra je imala fiksnu minimalnu širinu od 1.024 px. Na tabletu u uspravnom položaju (820×1180) mapa je bila sitna, sa mnogo praznog prostora iznad i ispod nje, a stranice Card library, Chronicle i Rules skrolale su se vodoravno. Na telefonu (390×844) mapa je bila stisnuta u traku širine oko 50 px.

- **Sto ispod 1.000 px.** Mapa zauzima cijelu širinu u svojim proporcijama, ispod nje su prečice, aktivni lik i Overlord (dvije kolone na tabletu, jedna na telefonu), a traka s akcijama ostaje prikačena na dnu ekrana i klizi vodoravno. **Interact with map** otvara mapu preko cijelog ekrana, gdje se pomjera prevlačenjem prsta.
- **Zaglavlje.** Natpis se više ne lomi u dva reda; na telefonu ostaje samo grb, a navigacija klizi vodoravno.
- **Stranice.** Bez vodoravnog skrolanja na tabletu i telefonu.
- **Paneli i odluke na telefonu.** Kartice radnog prostora stoje po dvije u redu. Dnevnik questova prikazuje jedan quest po redu (ranije su naslovi bili široki nekoliko slova). U aukciji i New Horizons dugmad prelaze u drugi red, pa imena ostaju čitljiva. Zaglavlje borbe više ne gura **Back to map** izvan ekrana.
- Sva pravila su u novom `src/campaign/responsive.css` i vrijede samo ispod 1.000 px, pa je desktop raspored nepromijenjen.

| Veličina | Vodoravno skrolanje | Elementi izvan ekrana |
| --- | --- | --- |
| 820×1180 prije / poslije | 3 / 0 | 27 / 1 (ispod ruba stranice Heroes) |
| 390×844 prije / poslije | 37 / 0 | 80 / 0* |

\* Na telefonu se sto skrola uspravno; elementi ispod prvog ekrana se ne broje.

| Provjera | Rezultat |
| --- | --- |
| `npm test`, `npm run build` | 1.074 testa prolaze; build prolazi |
| Chromium, 1366×768, 1280×720, 1920×1080 | nepromijenjeno: bez odsječenog teksta, elemenata izvan ekrana i grešaka u konzoli |

## Šesti krug · 24. 10. 2026.

- **Zumiranje s dva prsta.** Na mapi preko cijelog ekrana razmicanje prstiju zumira oko tačke gdje je pokret počeo, a pomjeranje oba prsta pomjera mapu. Kad se jedan prst digne, drugi nastavlja pomjerati mapu bez skoka. Dodir i dalje bira regiju, a miš, točkić i tastatura rade kao ranije. Provjereno u Chromiumu sa simuliranim dodirom: 200% → 400% razmicanjem, 400% → 120% skupljanjem, pomjeranje jednim prstom i izbor regije dodirom.
- **Upute na mapi.** Na uređajima na dodir piše „Drag · pan, Pinch · zoom, Tap · select” umjesto uputa za točkić i Shift.
- **Instaliranje na početni ekran.** Dodani su manifest, ikone 192 i 512 px (i maskirana verzija za Android) i ikona za iOS. Ikona je grb iz zaglavlja igre. Igra se otvara preko cijelog ekrana, bez trake preglednika. Chromium ne prijavljuje nijednu prepreku za instaliranje.
- **Kraj kampanje.** Dugme **Run AI** se više ne prikazuje kada je kampanja završena.
- **Sitan tekst na telefonu.** Opisi akcija, likova u borbi, izbora likova i Overlorda u setupu podignuti su na 9,5–10 px. Na 390×844 tekst od 8,5 px ili manje pao je sa 76 na 0, a na 820×1180 sa 61 na 0.

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.076 testova u 52 datoteke prolaze; 2 nova u `map-pinch.test.ts` |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta |
| Chromium, 3 desktop veličine × 39 ekrana | nepromijenjeno, bez grešaka u konzoli |

## Granice

Igra nema offline režim: slike karata zauzimaju oko 230 MB, pa ih service worker ne može unaprijed sačuvati. Partije su ipak lokalne i ne trebaju server.

Uvećanje cijelog interfejsa na velikim ekranima nije izvedivo bez prepravke rasporeda: CSS `zoom` skalira i `100dvh`, pa raspored vezan za visinu ekrana prelazi ekran. Na visokim ekranima taj prostor sada koristi dnevnik questova.
