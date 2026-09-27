# Provjera v0.3 · osnovni set iz skenova

Aktivni paket: `base-2005-faq-1.4-scans-v3`. Testovi pokrivaju osnovnu igru i FAQ; proširenja nisu učitana.

## Automatizovana provjera

- `npm test`: **129/129** u pet datoteka. Od toga je 43 testa za podatke iz skenova i njihove interakcije; 86 postojećih regresija ostaje aktivno.
- `npm run check:render`: **572 prikaza** — sve karte/listovi, kampanja i borbeni prozor — bez `undefined`, `NaN` ili React upozorenja u renderu.
- `npm run build`: TypeScript strict, NodeNext server check i Vite produkcijski build. Zodove dvije PURE anotacije daju build upozorenja; Rollup ih uklanja. Glavni bundle prelazi preporuku od 500 kB prije gzipa.
- Svih 560 preuzetih datoteka ima provjerenu veličinu, PNG/PDF potpis i SHA-256. Originali ostaju u ignorisanoj lokalnoj mapi.

Posebni testovi obuhvataju FAQ korekcije, Spot i fizičku zalihu kockica, trošak/discount/ponavljanje, grupne reakcije, forme, ljubimce, Talente, Portal bez pomjeranja castera, opremanje Concentration Aure, Hood slot, čišćenje kuge nakon grupnog izazova, boss događaje, skriveni Kazzakov identitet i Nefarianovu ranu završnicu. Referencije među klasnim kartama su provjerene.

## Pune simulacije

Svaki potez provjerava nenegativne cjelobrojne resurse, torbu i broj mjesta. Zatim se cijela partija izveze, strogo parsira i ponovi; porede se sva završna polja, nezavisno od redoslijeda JSON ključeva.

| Naredba | Potezi enginea | Questovi | Završna smjena | Ishod | Replay |
| --- | ---: | ---: | ---: | --- | --- |
| `npm run simulate -- 2005 kelthuzad` | 1.020 | 11 | 30 | Horda, završni PvP | identičan |
| `npm run simulate -- 71 nefarian casters` | 697 | 7 | 25 | remi nakon Bulwarka | identičan |
| `npm run simulate -- 99 kazzak casters` | 787 | 7 | 30 | Alijansa, završni PvP | identičan |

Ove postave ukupno uključuju svih devet klasa. Simulacije potvrđuju završiv tok za navedene partije. Ne potvrđuju optimalnu strategiju botova, balans, pobjedu nad svakim Overlordom ni svaku kombinaciju karata. Boss efekti i direktne pobjede zasebno se provjeravaju scenarijskim testovima.

## Interfejs

Ugrađeni preglednik učitao je novi desktop sto i puni DOM sa stvarnim questovima, šest individualnih portreta, sedam mjesta, 30 smjena i Kel’Thuzad profilom. Nisu zabilježene JavaScript greške. DOM geometrija je provjerena na 1280 × 800, 1440 × 900 i 1920 × 1080: stranica nema horizontalno ni vertikalno prelijevanje, a questovi i lični panel po potrebi imaju vlastito skrolanje. Privremena veličina preglednika je vraćena na početnu.

**Ograničenje ovog prolaza:** preglednički alat nije uspio priključiti svoj webview. Screenshot i ulazne naredbe završavaju timeoutom, iako čitanje DOM-a radi. Pokušani su dokumentovani screenshot, semantički i pristupačni klik te novi tab. Zato ručno odigravanje novog interfejsa i završni vizuelni screenshot pregled nisu označeni kao završeni. Render audit ne zamjenjuje takav pregled.

Glavna mapa i dalje čeka ravan sken radi konačne topologije. Online sobe su na čekanju; Redis i cloud multiplayer nisu dio ove provjere. Stariji UI testovi i v0.2 rezultati nisu predstavljeni kao potvrda novog interfejsa.
