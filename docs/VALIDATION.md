# Provjera v0.6 · 27. 9. 2026.

Aktivni paket: `base-2005-faq-1.4-v6`. Detalji opreme, špilova, FAQ ispravki, varijanti i botova su u [RULES-AUDIT-V6.md](RULES-AUDIT-V6.md).

- `npm test`: **225/225** testova u **12** datoteka. Vitest sada eksplicitno uključuje `tests/`, da ignorisane lokalne radne kopije ne budu testirane kao dio ovog projekta.
- `npm run check:render`: **621 prikaz**, uključujući class deck i editor opreme za svih 16 likova; bez neispravnih tekstualnih vrijednosti.
- `npm run build`: TypeScript, server check i Vite prolaze. Preostaju ranija upozorenja za dvije Zod PURE anotacije i veličinu glavnog JS bundlea.
- Nove regresije obuhvataju sve klasne špilove, višestruki trening, cijenu instant/active moći, premještanje i ponovno opremanje, ljubimce, slotove/trait/stance/add-on/unique pravila, talente, Stoneform, Town redoslijed, obje varijante i očuvanje prethodnog savea.
- React testovi prolaze za kupovinu iz class decka, nivoe i budžet, Town redoslijed, pet refresh, setup varijante i obnovljeni tok Spellbooka.

## Pune kampanje v0.6

Simulacije provjeravaju resurse, torbu i mjesta nakon naredbi, zatim porede završno stanje s replayom.

| Naredba | Naredbe | Questovi | Završna smjena | Ishod | Replay |
| --- | ---: | ---: | ---: | --- | --- |
| `npm run simulate -- 2005 kelthuzad` | 968 | 12 | 30 | Alijansa | identičan |
| `npm run simulate -- 71 nefarian casters` | 484 | 3 | 25 | remi | identičan |
| `npm run simulate -- 99 kazzak casters` | 1383 | 15 | 30 | Alijansa | identičan |

Ovi rezultati potvrđuju završene tokove i determinističnost. Ne dokazuju optimalnu strategiju niti pobjedu botova nad svakim Overlordom. Promjena Town redoslijeda zadržava prethodno ponašanje kada `recoverAfter` nije naveden, kao u ovim bot komandama.

## Ograničenje vizuelne provjere

Browser kontrola vratila je prazan inventar, a otvaranje IAB-a nije bilo dostupno. Computer Use fallback zaustavljen je pri lokalnoj navigaciji jer alat nije mogao dovoljno pouzdano utvrditi trenutni URL na Windowsu. Daljnje upravljanje preglednikom nije pokušavano. Zato novi raspored ličnog lista nije potvrđen screenshotom stvarnog browsera. DOM testovi i server render ostaju zasebni dokazi, bez tvrdnje da potvrđuju odsustvo preklapanja pri svim veličinama prozora.

Autosave koristi v6 ključ; v4/v3 zapis ostaje dostupan za preuzimanje. Ne vrši se automatski replay starih komandi pod promijenjenim pravilima.

---

# Historijska provjera v0.4 · centralna 2D mapa

Aktivni paket: `base-2005-faq-1.4-map-v4`. Osnovni set i FAQ ostaju isti; mapa sada koristi precrtane poligone i njihove zajedničke granice.

## Automatizovane provjere

- `npm test`: **157/157** u sedam datoteka. Sačuvano je 129 prethodnih regresija; dodata su 23 testa mape/pravilnika/questova/kamere i pet React DOM testova korisničkih tokova.
- `npm run check:render`: **572 prikaza** svih karata, likova, kampanje i borbe; bez `undefined`, `NaN` ili React upozorenja.
- `npm run build`: TypeScript strict, NodeNext server check i Vite produkcijski build. Postojeća upozorenja: dvije Zod PURE anotacije i glavni JS bundle iznad 500 kB prije gzipa.
- Nezavisna geometrijska provjera putem Shapely: svih **67 poligona validno**, bez pozitivne površine preklapanja. Svi centri su unutar svog polja i svih 67 polja pripada jednoj povezanoj mreži kretanja.
- Za svaku dozvoljenu vezu provjereno je da prikazana pješačka putanja ostaje unutar dva povezana poligona. Time su obuhvaćeni i uski, konkavni prolazi.

Testovi pravilnika pokrivaju dvije regije za jednu akciju, odbijanje trećeg koraka, Southshore → Sorrow Hill → Chillwind Point, četiri letne tačke po frakciji, zabranu tuđeg početnog polja, crne granice i uglove, plave prepreke pri hodanju i letu te prolaz kroz zelene/crvene quest ciljeve.

Quest testovi provjeravaju početne tokene i javne brojače špilova, pomjeranje tokena s preostalim figurama, uklanjanje ciljeva, stabilne reference karata i izvlačenje zamjene sa smanjenjem špila i novim spawnovima. Redoslijed špilova nije u javnom `GameView`.

## Interakcije i render

React DOM testovi u jsdom potvrđuju:

1. World view ostaje nepomičan dok se ne uključi **Interact with map**.
2. Zoom, povlačenje, Escape i vraćanje fokusa rade kroz stvarne event handlere komponente.
3. Povlačenje ne odabire slučajno polje.
4. Odabir regije daje pregled; akcija se troši tek na **Putuj ovdje**.
5. Quest karte i tokeni koriste iste reference, a špilovi dopuštaju samo legalnu zamjenu.

`npm run render:map` izrađuje **2070 × 1380** PNG iz stvarne SVG komponente i stilova mape, sa ugrađenim teksturama i portretima. `screenshots/02-map-regions.png` je vizuelno pregledan. To je render ploče, ne screenshot cijele aplikacije.

**Ograničenje:** alat za preglednik vratio je prazan inventar; pokušaji otvaranja lokalne igre u IAB-u i Chromeu vratili su `Browser is not available`. Zato nije potvrđen raspored cijele stranice niti stvarne gestikulacije u pregledniku. DOM testovi i SVG pregled navedeni su odvojeno, bez pripisivanja browser provjere.

## Pune kampanje na novoj mapi

Svaki potez provjerava resurse, torbu i mjesta. Završena partija se ponavlja iz svih komandi i poredi završno stanje.

| Naredba | Potezi | Questovi | Završna smjena | Ishod | Replay |
| --- | ---: | ---: | ---: | --- | --- |
| `npm run simulate -- 2005 kelthuzad` | 1346 | 13 | 30 | Alijansa | identičan |
| `npm run simulate -- 71 nefarian casters` | 722 | 4 | 25 | remi | identičan |
| `npm run simulate -- 99 kazzak casters` | 879 | 7 | 30 | Alijansa | identičan |

Ovo potvrđuje navedene tokove, ne optimalnu strategiju botova ili sve kombinacije karata. Online sobe ostaju na čekanju.

## Izvori i kompatibilnost

[MAP.md](MAP.md) navodi fotografije, stranice pravilnika i interpretaciju granica. Konture su pojednostavljeno ručno precrtavanje fotografija, bez tvrdnje da je korišten ravan službeni sken. Quest podaci dolaze iz prethodno provjerenog arhiva od 560 skenova.

v0.4 ima odvojeni autosave. Originalna v0.3 partija ostaje na starom ključu, dostupna za preuzimanje u postavkama. Stari putevi se ne izvršavaju neprimjetno na novoj topologiji.
