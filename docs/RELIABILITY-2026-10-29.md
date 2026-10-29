# Oporavak, deployevi i sitne greške · 29. 10. 2026.

Ovaj prolaz traži greške koje igrač stvarno može pogoditi: pad prikaza, otvoren tab tokom novog deploya, spor telefon i preklapanja u interfejsu. Uz to je odigrano 12 novih AI kampanja s auditom stanja poslije svake naredbe.

## Pad i novi deploy

- **Ekran za oporavak.** Aplikacija nije imala nijedan error boundary, pa je svaka greška pri prikazu ostavljala potpuno prazan ekran. Sada se prikazuje poruka s dugmadima **Reload the game** i **Download the autosave**, uz tehničke detalje greške. Partija se čuva poslije svakog poteza, pa ponovno učitavanje nastavlja tamo gdje je igrač stao.
- **Otvoren tab tokom deploya.** Novi deploy briše dijelove koda prethodnog builda. Tab otvoren prije deploya tražio bi ih pri prvom lijenom učitavanju (borba, AI worker) i dobio grešku. Sada se stranica jednom sama ponovo učita i nastavi iz autosavea. Ako i drugi pokušaj u istoj minuti ne uspije, prikazuje se ekran za oporavak umjesto beskonačnog osvježavanja.
- **AI worker koji se ne učita** sada traži osvježavanje stranice. Ranije je poruka glasila „Try Step bot again”, što u tom slučaju nikad ne pomaže. Greška unutar AI-ja i dalje nudi novi pokušaj.
- **Rok za AI odluku: 30 → 90 s.** Najsporije odluke u ovim simulacijama trajale su 1,5–8,4 s na serveru. Sporiji Android telefon može biti nekoliko puta sporiji, pa bi rok od 30 s zaustavio automatsko igranje, a novi pokušaj bi zapeo na istoj odluci. Rok i dalje hvata pravo zaglavljivanje workera.

Provjereno u Chromiumu: iz builda je uklonjen dio koda za borbu, kao da ga je obrisao novi deploy. Stranica se učitala tačno dva puta, prikazala ekran „The game was updated”, a autosave se preuzeo kao `lordaeron-autosave.json`.

## Interfejs

- **Return to combat** i dugme sažetka kampanje stajali su preko **Challenge** i **Run AI / Pause AI** na svim veličinama ekrana. Sada stoje iznad trake s akcijama; na 1280×720, 1366×768, 1920×1080, 820×1180 i 390×844 ne prekrivaju nijednu kontrolu.
- **Undo na telefonu** je gurao **Management** izvan ekrana i stranica se skrolala vodoravno (433 px na ekranu od 390 px). Kontrole poteza sada prelaze u drugi red.
- **Ctrl+Z** se ne izvršava dok je otvoren dijalog, npr. pravljenje nove kampanje, pa potez u pozadini ostaje netaknut.
- **Zumiranje s dva prsta:** kad se od tri prsta dignu dva, mapa više ne skače, jer se početna tačka gesta ponovo postavi.

## Testovi

Na prvom pokretanju poslije restarta okruženja pale su dvije provjere slika karata. Svaka čita stotine datoteka, a Vitest proglašava i sinhroni test neuspjelim kada potraje duže od roka. Na hladnom disku to je prešlo 5 s, odnosno 30 s. Pri kasnijim pokretanjima obje prolaze. Isto se desilo jednom render testu cijelog stola dok su paralelno radile tri simulacije. Zadani rok testa je sada 20 s, a za dvije provjere vezane za disk 60 s i 180 s. Prave greške u provjerama i dalje padaju odmah.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.080 testova u 53 datoteke prolaze; novi `app-error-boundary.test.tsx` i test za worker koji se ne učita |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta bez `undefined` / `NaN` |
| Chromium, 5 veličina, 183 ekrana | bez odsječenog teksta, elemenata izvan ekrana, vodoravnog skrolanja, premalih dugmadi i grešaka u konzoli |
| Automatsko igranje na 390×844, 25 minuta | AI kampanja do 19. poteza, bez grešaka, zastoja i vodoravnog skrolanja |

## Simulacije

| Seed | Overlord | Likovi | Naredbe | Questovi | Ishod | Najsporija odluka |
| --- | --- | --- | --- | --- | --- | --- |
| 301 | Kel’Thuzad | standardni | 5.343 | 70 | Horda | 8,4 s |
| 302 | Kazzak | standardni | 3.791 | 47 | Alijansa | 6,8 s |
| 303 | Nefarian | standardni | 1.225 | 18 | neriješeno | 1,5 s |
| 304 | Kel’Thuzad | casters | 4.667 | 71 | Horda | 5,9 s |
| 305 | Kazzak | casters | 4.963 | 70 | Horda | 7,3 s |
| 306 | Nefarian | casters | 1.564 | 21 | neriješeno | 2,5 s |
| 307 | Kel’Thuzad | standardni | 5.150 | 70 | Horda | 5,9 s |
| 308 | Kazzak | standardni | 2.209 | 34 | Alijansa | 3,9 s |
| 309 | Nefarian | standardni | 1.490 | 22 | neriješeno | 5,3 s |
| 310 | Kel’Thuzad | casters | 4.827 | 71 | Horda | 5,6 s |
| 311 | Kazzak | casters | 4.736 | 71 | Horda | 5,7 s |
| 312 | Nefarian | casters | 2.020 | 33 | neriješeno | 3,5 s |

Sve kampanje su završene bez zastoja, audit stanja je prošao poslije svake naredbe, a replay je identičan. Nezavisni `audit:session` za seed 303 provjerio je 1.226 stanja. Simulacije su radile po tri paralelno, pa su vremena odluka nešto veća nego na neopterećenom računaru.

Sve četiri Nefarian kampanje završile su neriješeno: niko ga nije zaustavio prije Bulwarka, a obje frakcije su izgubile prisilnu završnu borbu. To je pravilo varijante, a ne greška enginea; AI-ju i dalje nedostaje plan za Nefarianov pohod.

Ponavljanje:

```sh
npm run simulate -- 303 nefarian default --output .local-data/review-2026-10-29/nefarian.session.json
npm run audit:session -- .local-data/review-2026-10-29/nefarian.session.json .local-data/review-2026-10-29/nefarian.audit.json
```
