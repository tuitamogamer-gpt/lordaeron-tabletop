# Pokrivenost osnovne igre

Izvori: [službeni pravilnik](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf) i [FAQ 1.4](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf), samo odjeljci osnovne igre. Shadow of War Encounter Deck i ostala proširenja nisu u scopeu.

Oznaka „implementirano” znači da postoji izvršiv mehanizam i relevantni testovi. Ne znači da je kompletan originalni sadržaj provjeren ili da su sve međusobne kombinacije pokrivene.

| Sistem | Status | Otvoreno |
| --- | --- | --- |
| Setup | 4/6 likova, frakcije, jedinstvena klasa, zlato, resursi, questovi, trgovac | Originalne početne karte i rasporedi listova |
| Mapa | 67 čvorova, dvije etape, let, početne regije, blue blokada | Provjera svih veza i oznaka prema ravnom skenu |
| Akcije | Travel, Rest, Train, Town, Challenge; redoslijed likova; dvije akcije | Posebne izmjene akcija koje daju originalne karte |
| Grad i trgovina | Više uređenih transakcija, prodaja za pola naviše, trening, oporavak | Originalni trgovčev špil |
| Razmjena | Bag predmeti i zlato, ista regija, poslije akcije, soulbound zabrana | Strategija botova za razmjenu |
| Upravljanje | Slotovi, osobine, nivoi, aktivna energija, unique moći, dodaci, torba | Tačni slotovi originalnih likova, sve specifične iznimke |
| Questovi | Obje frakcije, konačne figure, izbor boje špila, nagrade, više dovršenih questova | Svih 80 originalnih tekstova; iscrpljeni svi mogući zamjenski špilovi |
| XP i talenti | Podjela, bonus/penal, nivoi, obnova resursa, izbor talenta | Originalnih 108 talenata i promjene kapaciteta njihovim efektima |
| PvE | Individualni napadi, redoslijed, d8, kapice, reroll, Spot, tri borbena polja | Karte sa dodatnim podfazama i posebnim prekidima |
| Rane / smrt | Pojedinačna raspodjela, ljubimci, posljednja prilika, respawn, XP poraženima | Specifična oživljavanja; nasumični redoslijed istovremenih povrataka |
| Stun / Curse | Gubitak kockica, reroll/attrition, odmor i čišćenje pri porazu | Interakcije sa svim originalnim imunostima |
| Minioni | 13 skriptiranih vrsta i 39 skupova vrijednosti | Provjera community vrijednosti originalnim listom |
| PvP | Frakcijsko izmjenjivanje, prijetnja nivo+2, oklop, simultane rane, plijen | Sve posebne klasne/PvP FAQ kombinacije |
| Eventi | Bonus lanci, aukcije, ratni zadaci, trgovac, spawn, jača/slabija frakcija | Svih 47 + 5 Kel’Thuzad tekstova i njihovih posebnih efekata |
| Tracker i završnica | 30 poteza, finalna priprema, puni resursi, završni PvP, pobjeda/remi | Završni pregled svih detalja FAQ-a |
| Overlord | Generički izazov/pobjeda, skaliranje 4/6, ruta/Fate i Nefarian hit-limit mehanizam | Originalni Kel’Thuzad, Kazzak, Nefarian profili i svi posebni efekti |
| Skriptni sistem | Tipizirani borbeni AST bez evala, trošak, uslovi, izbori, sekundarne zavisnosti | Neborbene sposobnosti, dinamički kapaciteti i specifične klasne iznimke |
| AI | Poseban heuristički planer, javno stanje, tri lokalna stila | Duboka strategija, bolji višekartni planovi, više stilova na serveru |
| Multiplayer | Autoritativne odluke, sobe, kontrola mjesta, saglasnost, revizije, reconnect | Stvarni Vercel/Redis test, računi, oporavak izgubljene sesije |

## Brojevi originalnog seta

16 likova; 108 Power + 108 Talent karata; 120 predmeta; 80 questova; 47 osnovnih događaja + 5 dodatnih Kel’Thuzad događaja; 13 vrsta stvorenja; tri Overlord lista.

Razvojni set namjerno nosi `officialComplete: false`. Ima 80 probnih questova za kampanje bez ranog iscrpljivanja špila, sedam probnih događaja, generičke klasne sposobnosti i jednog izmišljenog razvojnog protivnika. Jednaki brojevi questova nisu dokaz originalne transkripcije.

## FAQ kontrola pri uvozu

Posebno provjeriti Shadowguard, Slice and Dice, Arcane Missiles/Arcane Focus, Pyric Caduceus, Crackling Staff, pogrešno imenovani Scroll, Horde quest Brutes and Barrows, Judgment/Seal, Blessing of Kings, Stoneform, Resurrection/Reincarnation, Mend Pet i Nefarianov limit pogodaka. Ovi nazivi su lista za provjeru, ne tvrdnja da su odgovarajuće originalne karte već skriptirane.

Nedostajući tekst se ne zamjenjuje nagađanjem. Nakon uvoza svaka takva karta treba konkretan test primjene i novu verziju paketa sadržaja. Sken je dokaz sadržaja; novi dizajn sistem ostaje isti.
