# Pravila, špilovi i lični list · v0.6

Pregled 27. 9. 2026. Paket: `base-2005-faq-1.4-v6`. Osnova su [službeni pravilnik osnovne igre](https://www.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf), [FAQ 1.4](https://www.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf) i prethodno uvezeni skenovi. Proširenja nisu dio ovog paketa.

## Pregled poglavlja

| Pravilnik | Engine i interfejs |
| --- | --- |
| Komponente i setup, str. 2–8 | 16 likova, devet različitih klasa, 4/6 likova, ravnomjerne frakcije, početni resursi, gradovi, questovi, trgovac i profil Overlorda. Svaki lik ima odvojeni skup od 12 moći i 12 talenata. |
| Akcije, str. 8–12 | Dvije akcije po liku, kretanje, letovi, plave prepreke, odmor, izazov, višestruki trening i Town transakcije. Oporavak se može smjestiti prije, između ili poslije transakcija, ili preskočiti. |
| Upravljanje i sheet, str. 12–19 | Tip mjesta, osobine predmeta, nivo, jedinstvene kategorije, Warrior stance, prekrivanje štampane karte i add-on funkcije. Instant se plaća pri korištenju; active pri opremanju. Talenti ostaju trajni, izvan mjesta za opremu. |
| Questovi i nagrade, str. 20–23 | Postojeći engine obrađuje quest špilove, spawnove, konačne zalihe, XP/nivoe, izbor talenata, raspodjelu nagrada i zamjene. |
| Trgovac i događaji, str. 24–26 | Kupovina/prodaja, torba, soulbound, višestruke transakcije, događaji i njihove odluke. Prodaja opremljenog predmeta je dopušten izuzetak od management pravila. |
| Borba i PvP, str. 27–34 | Dice Pool, reroll, Spot, vrijeme efekata, zalihe boja, tokeni, odbrana, rane, poraz, ljubimci i PvP. Postojeće borbene regresije ostaju uključene. |
| Overlordi i završnica, str. 34–35 | Tri Overlorda, profili za 4/6 likova, njihove posebne mehanike, pobjeda ili završni PvP. |
| Manje igrača i druga pravila, str. 35–36 | Kontrola više likova, manji broj questova za četiri lika, razmjena predmeta iz torbe i zlata nakon akcije, Stun i Curse. |
| Varijante, str. 37 | Setup sada nudi Deadly PvP i Defeat the Overlord. Podrazumijevano su isključene. |

Ova tabela povezuje poglavlja s implementacijom. Nije dokaz da je iscrpno testirana svaka kombinacija svih karata; [matrica pokrivenosti](RULES-COVERAGE.md) bilježi granice provjere.

## Ispravke u ovoj verziji

- Class decks je zaseban panel, dostupan i iz ličnog lista. Prikazuje preostale karte, nivo, cijenu, naučene moći, izabrane talente i trošak energije. Spellbook prikazuje samo stvarno kupljene moći.
- Trening ima korpu: više dostupnih moći kupuje se jednom akcijom. Talenti se besplatno biraju pri nivoima 2–5, prema upravo dostignutom nivou.
- Zadržavanje aktivne moći u istom mjestu ne troši energiju. Premještanje ili ponovno opremanje plaća se ponovo. Popusti se računaju pri stvarnom opremanju; Concentration Aura ne umanjuje vlastiti trošak.
- Ljubimac se može ukloniti i ponovo opremiti u istom managementu, uz novi trošak i obnovljeno zdravlje. Samo potvrđivanje neizmijenjene opreme ne liječi ga besplatno. To prati FAQ objašnjenje liječenja ljubimaca.
- Stoneform prema FAQ-u može zamijeniti rezultat 1/2 rezultatom 3 bilo koje dostupne boje, uz provjeru fizičke zalihe kockica.
- Deadly PvP daje objema frakcijama pune rane iz protivničkog damage polja; pri istovremenom porazu porede se neapsorbirane rane. Defeat the Overlord nakon 30. poteza vraća marker na početak i u daljim krugovima dodaje ljubičaste predmete na item oznakama.
- Town editor omogućava redoslijed oporavka i provjerava kapacitet upravo na tom mjestu transakcije.

## Čitljivost i botovi

Lični list koristi šira polja, eksplicitne kolone za ilustraciju i naziv, normalnu visinu redova i prelamanje dugih imena. Naslovi imaju Cinzel, tekst pravila Georgia, a kratke oznake Inter. Tekst pravila na listu je 16 px; mali efekti više ne zavise od skučenih kartica. Više jačina iste sposobnosti može se proširiti bez ponavljanja cijele kartice u osnovnom prikazu.

Bot planira cijelu opremu kroz ograničeno pretraživanje, a reducer provjerava svaki rezultat. Vrednuje kompatibilnost, kategorije, energiju, ljubimce, sinergije i odbačene predmete. Može kupiti više moći jednim treningom. Bonus za okupljanje više ne nadjačava udaljavanje od quest cilja, a dodatni borci imaju trošak utrošenih akcija. Ovo je heuristički planer, bez garancije optimalne igre.

Kontekst razvoja lika i frakcijske utrke provjeren je kroz dostupne odlomke [BGG recenzije iz 2008.](https://boardgamegeek.com/thread/321278/world-of-warcraft-basegame-review), [On the docks of Southshore](https://boardgamegeek.com/thread/89200/on-the-docks-of-southshore) i [Toboldovu recenziju iz januara 2006.](https://tobolds.blogspot.com/2006/01/world-of-warcraft-board-game-review.html). Iz toga proizlazi fokus na razvoj klase, trošak putovanja i zajednički napredak frakcije. Recenzije nisu izvor izuzetaka od službenih pravila. Direktno otvaranje BGG stranica vratilo je 403; korišten je tekst dostupan kroz pretragu.

## Dokazi i granice

`npm test`: 225 prolaznih testova u 12 datoteka. `npm run check:render`: 621 prikaz, bez neispravnih tekstualnih vrijednosti. TypeScript, server provjera i produkcijski build prolaze. Tri pune kampanje završavaju s identičnim replayom; rezultati su u [VALIDATION.md](VALIDATION.md).

Stvarni pregled novog rasporeda u pregledniku nije potvrđen. Browser kontrola nije imala dostupan tab; Computer Use fallback zaustavljen je jer alat nije mogao pouzdano utvrditi URL na Windowsu. Poslije tog zaustavljanja nije korišten drugi put za upravljanje preglednikom. DOM testovi i server render ne potvrđuju vizuelno odsustvo preklapanja na svim rezolucijama.

Novi autosave koristi `lordaeron-base-save-v6`. Prethodni v4/v3 zapis ostaje netaknut i dostupan za preuzimanje; promijenjena pravila ne izvršavaju stare komande neprimjetno.
