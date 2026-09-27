# Osnovna igra + FAQ · stanje v0.3

Izvori: [pravilnik](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf), [FAQ 1.4](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf), [dostavljeni skenovi](SCAN-INTEGRATION.md). Primjenjuju se samo odjeljci osnovne igre. Shadow of War i ostala proširenja nisu uključena.

Aktivni paket `base-2005-faq-1.4-scans-v3` ima sve komponente osnovnog seta. `officialComplete` provjerava broj komponenti i zabilježene izvore; nije tvrdnja da su sve međusobne kombinacije iscrpno testirane.

| Sistem | Implementirano | Preostala provjera |
| --- | --- | --- |
| Setup | 4/6 likova, jedinstvene klase, frakcije, originalni slotovi, rasne moći, početni questovi i trgovac | Šira igranja različitih postava |
| Mapa | 67 regija, letovi, dvije etape, plave blokade, Teleport, Portal, Summon, Intercept, posebna putovanja | Topologija i oznake prema ravnom skenu glavne ploče |
| Akcije | Svih pet; višestruke gradske transakcije, više treninga, hrana, posebne akcijske moći | Duge sekvence kroz UI |
| Inventar | Sedam mjesta, osobine, addon funkcije, unique moći, kapaciteti, aktivni trošak, torba i razmjena | Strategija botova pri višekartnom opremanju |
| Klase | 108 Power i 108 Talent karata iz devet klasa; automatski, uslovni i izborni efekti | Iscrpno testiranje svih kombinacija i efekata u istom vremenskom prozoru |
| Predmeti | 46 triangle, 30 square, 16 circle, 28 special; četiri aukcijska predmeta | Balans i strategija njihovog korištenja |
| Questovi | Svih 80, obje frakcije, spawnovi, konačne zalihe figura, nagrade i zamjene | Vrlo dugo iscrpljivanje svih zamjenskih špilova |
| Borba | PvE/PvP, d8, fizičke zalihe boja, Spot, promjene, nezavisni reroll, Stun/Curse, pogoci, rane, ljubimci, poraz i oživljavanje | Sve konkurentne reakcije u grupnoj borbi |
| Minioni | 13 vrsta, raspoložive boje i originalne vrijednosti iz referentnog lista | Više grupnih kombinacija u igranju |
| Događaji | 47 + 5 Kel’Thuzad; bonusi, aukcije, kupovina, retrening, putovanja, premještanje grupa, bounty, trofeji, ratovi, kuga, sedam boss događaja | Više preklapanja trajnih događaja |
| Overlordi | Oba profila svakog bossa; pet Kazzakovih tragova, Nefarian Fate i Bulwark, Kel’Thuzadove sposobnosti i događaji | Tumačenje izbora Spot kockica za Kel’Thuzadov Attrition u složenim kombinacijama |
| Završnica | Pobjeda nad Overlordom, završni PvP, prisilni Nefarian obračun, remi | Dodatna igranja do pobjede nad svakim bossom |
| AI | Zaseban planer, legalni kandidati, tri stila, procjena borbe i novih događaja | Dublji planovi ekipe, razmjena, dugoročni razvoj likova |
| Autosave | Poseban ključ v0.3, hash sadržaja, strogi import i deterministički replay | Import različitih verzija namjerno nije podržan |
| Online | Server i regresijski testovi sačuvani, UI isključen | Na čekanju po korisnikovoj odluci |

## Primijenjene FAQ ispravke

Shadowguard djeluje u Defense fazi; Slice and Dice na kraju Reroll koraka; Arcane Missiles zahtijeva prethodnu upotrebu i neizgubljeno zdravlje u neposredno prethodnoj rundi iste borbe; Arcane Focus ima nezavisan reroll. Pyric Caduceus je ranged, Crackling Staff se aktivira poslije Dice Poola, plavi Scroll je Lesser Spirit, a Brutes in the Barrows koristi Infectis Scar.

Judgement je besplatan i ne skida Seal; normalna Seal sposobnost i Judgement mogu se koristiti iste runde. Blessing of Kings je talent. Druid forme prate tip mjesta, dok itemi prate i osobinu. Oživljeni lik i dalje se računa poraženim za akcije, loot i nagrade. Nefarianov limit dopušta izbor pogodaka, bez obaveze da upravo osmice idu u damage/defense.

Kandidati iz `legalActions` nisu sve moguće kombinacije argumenata. Engine validira stvarnu naredbu; UI pruža pune transakcije, opremu, retrening i ručni odabir kockica. Botovi koriste enumerirane kandidate.
