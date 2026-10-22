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

## Granice

Uvećanje cijelog interfejsa na velikim ekranima nije izvedivo bez prepravke rasporeda: CSS `zoom` skalira i `100dvh`, pa raspored vezan za visinu ekrana prelazi ekran. Donja polovina desne kolone na 1920×1080 i dalje je prazna.
