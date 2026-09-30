# Desktop tok bez suvišnog skrolanja · 30. septembar 2026.

Ovaj prolaz dorađuje raspored i interakcije za desktop. Pravila igre i format sačuvane partije ostaju kompatibilni.

- Biblioteka koristi jednu vrstu karata po stranici: šest moći/predmeta ili tri referentne karte. Pretraga, filteri i paginacija ostaju vidljivi. Referentna karta otvara cijelo lice i odvojena čitljiva pravila; promjena širine zadržava položaj u zbirci.
- Setup ima zbijene izbore veličine table, dvije mreže likova i tabove Overview / Starting quests / Shuffle. Svih deset početnih questova staje na ekran prije proširivanja detalja. Primarna akcija ostaje u footeru, a povratak na istu veličinu table čuva odabrane likove.
- Oprema koristi bounded slot/picker raspored, odvojene stranice za dodatke i vidljiv obračun energije, torbe i potvrde. Town drži oporavak i resurse iznad karata, a transakcije, undo i potvrdu ispod njih. Trade ima paginirane inventare i pregled resursa nakon razmjene.
- Encounter panel ima Overview / Active encounters / Discard pile / Turn track. Duži špilovi se pregledaju po tri karte; cijela pravila su dostupna iznad panela bez gubitka otvorene stranice. Overlord pravila su uz puni portret i borbene vrijednosti.
- Chronicle prikazuje šest zapisa po stranici, uz pretragu po imenima i filter poteza. Rules razdvaja kratki vodič i sadržaj/izvore.
- Kratko pojavljivanje panela ne animira dimenzije rasporeda. Reduced motion isključuje nove animacije.

Provjere: **990 testova u 42 datoteke prolazi** (`npm test -- --maxWorkers=2`). TypeScript, serverski TypeScript i produkcijski build prolaze. `npm run check:render` provjerava **621 prikaz** bez `undefined` i `NaN`.

Browser provjera uključuje 1280 × 720 i 1366 × 768. Na 1280 × 720 biblioteka, kompletna pravila, Chronicle, svi osnovni setup koraci, pregled početnih questova, Encounter pregled/traka, Town i potvrda opreme ostaju u okviru prozora. Eksplicitno prošireni quest detalji i izuzetno duga referentna pravila imaju lokalni overflow da sadržaj ostane dostupan. Oprema i Chronicle provjereni su i kroz uvezeni replay koji prelazi u management fazu, u odvojenom localhost testnom porijeklu.

Novi stylesheetovi učitavaju se iz browser entrypointa, tako da se React komponente i dalje mogu statički renderovati iz Node skripti.
