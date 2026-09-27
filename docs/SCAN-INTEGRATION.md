# Uvoz skenova osnovne igre

Izvor je korisnikov [Base game folder](https://drive.google.com/drive/folders/16QJMxNP7FFRpa5tJYYDE2DWjPmHEKrZH). Uvoz 27. 9. 2026. uključuje svih 560 datoteka, 1.041.999.963 bajta. Svaka je provjerena prema veličini i potpisu PNG/PDF formata te ima SHA-256 u [manifestu](sources/base-scans-manifest.json). Originali su lokalno u `.local-data/scans/`; ne ulaze u produkcijski bundle. Izvorni folder nije mijenjan.

Zbirka sadrži 216 klasnih karata, 120 predmeta, 80 questova, 52 događaja, 16 listova likova i dvije njihove poleđine, šest strana Overlord listova, dvije reference, 43 slike tokena, 22 poleđine špilova i dodatni Warrior PDF. Glavna ploča nije u ovom folderu.

OCR je služio kao radni prijepis. Brojevi, boje kockica, Spot oznake, troškovi, nagrade i rasporedi provjereni su iz slika. Karte sada imaju podatke, izvršive efekte i veze na izvorne skenove u `src/data/base/`. FAQ korekcije su zabilježene zasebno. Razvojni fixture paket ostaje odvojen i nije aktivni lokalni set.

Vizuelna referenca za desktop raspored: [fotografija igre na stolu](https://www.ebgl.org/current.php?g=2). Centralna mapa, lični list s opremom, dvije frakcijske grupe questova, trgovac i špilovi te odvojene borbene zone daju raspored za Warforged Chronicles. Skenovi služe kao izvor teksta i mehanika; korisnički interfejs koristi vlastite ilustracije, bronzu, kamen i pergament.

## Stanje integracije

- Preuzimanje i manifest: završeno, 560/560.
- Radni OCR: završeno, 494 slike kartica i listova; tokeni, poleđine špilova i dodatni PDF nisu OCR zadaci.
- Vizuelna transkripcija i izvršive skripte: unesene za kompletan osnovni set. Obuhvat i preostale provjere su u [RULES-COVERAGE.md](RULES-COVERAGE.md).
- Novi desktop sto, katalog svih komponenti, 16 individualnih portreta i tri Overlord ilustracije: uključeni u aktivnu aplikaciju.
- Regresije, provjera prikaza i tri pune simulacije s replayem: rezultati u [VALIDATION.md](VALIDATION.md). To nije iscrpna potvrda svih kombinacija karata.
- Topologija originalne mape: još treba izvor glavne ploče.
- Online sobe ostaju na holdu; desktop i lokalni AI ostaju cilj.
