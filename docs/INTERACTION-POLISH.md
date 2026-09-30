# Dorada interakcija · 30. septembar 2026.

Ovaj prolaz dorađuje lokalni desktop interfejs bez promjene pravila, sadržaja karata ili formata sačuvane partije.

- **Trening:** klik na kartu otvara njene detalje. Dodavanje moći ostaje zasebna radnja. Detalji se otvaraju iznad treninga, pa zatvaranje čuva filter, stranicu, odabrane moći i fokus. Prikazuje se preostalo zlato nakon odabira. Potvrda treninga ostaje vidljiva i na desktop ekranu visine 720 px, uz cijela lica karata.
- **Odmor:** prije potvrde se vidi rezultat za zdravlje, energiju i kletve. Pregled koristi isti reducer i istu naredbu kao potvrđena akcija, uključujući potrošenu hranu. Odmor bez oporavka jasno prikazuje da ipak troši akciju.
- **Automatski potezi:** pregled karata i otvoreni paneli pauziraju automatiku, uključujući već pokrenuto planiranje. Povratak na tablu nastavlja igru. Run bots u Party controls zatvara panel i pokreće poteze; pojedinačni bot potez ostaje dostupan u panelu.
- **Borba:** uklonjene kockice nestaju iz odabira prije slanja naredbe. Redoslijed odabira je vidljiv, odabir se može očistiti, a Stun/Curse prikazuje koliko kockica još treba izabrati ili ukloniti iz odabira.
- **Oprema:** namjerno izabrani viškovi za trgovca ostaju sačuvani dok su važeći. Nepotrebni odabiri se uklanjaju. Pravila dodataka mogu se pročitati prije opremanja.
- **Modali i pregledi:** klik unutar praznog dijela panela ili povlačenje prema pozadini više ne zatvara panel. Složeni modali pravilno vraćaju fokus. Pregledi karata se zatvaraju klikom izvan, promjenom fokusa ili prozora, i tipkom Escape.

Provjere: **971 test** u 38 datoteka prolazi (`npm test -- --maxWorkers=2`). Produkcijski build i serverski TypeScript prolaze. Provjera renderovanja prolazi za **621 prikaz**, bez neispravnog teksta. Browser provjera koristi desktop prikaz 1280 × 720; u konzoli nema zabilježenih grešaka ni upozorenja.

Prvi paralelni prolaz uz istovremeni build prekoračio je pet sekundi u četiri UI testa. Puni prolaz s dva testna procesa prolazi bez povećanja timeouta.
