# Izvori i mogućnosti

## Dopuna 27. 9. 2026. · pravila i način igre

Pravilnik i FAQ ponovo su korišteni za provjeru setupa, slotova, Class decka, vremena plaćanja energije i obje službene varijante. Rezultati su u [RULES-AUDIT-V6.md](RULES-AUDIT-V6.md).

[BGG Basegame review iz 2008.](https://boardgamegeek.com/thread/321278/world-of-warcraft-basegame-review) opisuje različite razvojne putanje klasa i njihov utjecaj na ponovnu igru. [On the docks of Southshore](https://boardgamegeek.com/thread/89200/on-the-docks-of-southshore) naglašava utrku dvije frakcije i koordinaciju. Dostupni su bili indeksirani odlomci kroz pretragu; direktni pristup objema stranicama vratio je 403. Nije pregledan gameplay video.

[Toboldova recenzija od 2. januara 2006.](https://tobolds.blogspot.com/2006/01/world-of-warcraft-board-game-review.html) daje dodatni kontekst razvoja lika, ekipnih questova i trajanja PvP-a. Recenzije služe razumijevanju prioriteta igrača; brojke i izuzeci implementirani su prema službenom pravilniku i FAQ-u.

Praktičan rezultat za botove: više treninga u jednoj akciji, kompatibilna kombinacija opreme, vrednovanje talenata u odnosu na naučene moći, izbjegavanje hodanja tamo–nazad i pažljiviji izbor broja učesnika borbe. To je naša interpretacija strategije, ne novo pravilo igre.

## Ranije istraživanje infrastrukture

Provjereno 26. 9. 2026. Fokus: FFG društvena igra iz 2005, ne WoW TCG, Hearthstone ili Wrath of the Lich King / Pandemic igra.

## Postoji li API?

Nisam pronašao dokumentiran javni REST API s kartama i pravilima ove društvene igre. [Blizzardov WoW Game Data API](https://community.developer.battle.net/documentation/world-of-warcraft/game-data-apis) služi videoigri. WoWBGAssist ima Java interfejs `CardApiService`, ali on poziva lokalnu bazu aplikacije; to nije udaljeni web API.

Praktična osnova je vlastiti JSON katalog uz provjerene skripte efekata. U ovom projektu je katalog već dostupan na `/assets/reference/manifest.json`, a definicije novog enginea su u `src/rules/`, a probni set u `src/data/development-pack.ts`. Stari `src/data/content.ts` pripada sačuvanom vizuelnom prototipu.

## Repozitoriji s upotrebljivim datotekama

| Izvor | Šta je stvarno pronađeno | Status u projektu |
| --- | --- | --- |
| [eidonia/WowBGAssist](https://github.com/eidonia/WowBGAssist) | Android pomoćnik, lokalna Java baza, 278 JPG datoteka karata i 39 PNG prikaza stvorenja | Preuzeto 273 lica + 5 poleđina + 39 prikaza; pretraživi katalog, izvor i hash za svaku sliku |
| [WarHatch/WoW-BG-app](https://github.com/WarHatch/WoW-BG-app) | JSON definicije 16 originalnih likova s vrijednostima zdravlja/energije kroz nivoe | Referentni prikaz u Junacima; odvojeno od igrivog balansa prototipa |
| [Kelsam WoW board-game alati](https://tabletop.kelsam.net/projects/world-of-warcraft-the-board-game/) | Pomoćnici za borbu i bacanje kockica, poveznice na varijante | Istražen pomoćni izvor; nije baza kompletnih karata |

WowBGAssist pin: `a68e639528069028a98de490602f93a93020a061`. WoW-BG-app pin: `9a6a70d916a02182edcc7b261739a36bd0555d3d`. Uvoz ne pokreće preuzeti Java ili Lua kod.

## Skenovi ploče i TTS zbirke

| Izvor | Opis i provjera |
| --- | --- |
| [Fizztastic TTS zbirka](https://steamcommunity.com/sharedfiles/filedetails/?id=421997566) | Autor navodi više od 1.400 skeniranih karata, teksture 4096 px, ploče i modele za osnovnu igru i proširenja. Potencijalno najpotpuniji izvor. To je tvrdnja autora; sadržaj paketa nije lokalno provjeren. |
| [Fizztastic, samo osnovna igra](https://steamcommunity.com/sharedfiles/filedetails/?id=438466088) | Odvojena Workshop stranica osnovne igre. |
| [LBart scripted](https://steamcommunity.com/sharedfiles/filedetails/?id=894096915) | Autor opisuje skriptirano postavljanje likova, Overlorda i protivnika zadataka te podršku proširenjima. |
| [Franco scripted](https://steamcommunity.com/sharedfiles/filedetails/?id=1629973544) | Još jedna zbirka s proširenjima i skriptama; opis upućuje na novije izdanje. |
| [Hearthstone Edition remix](https://steamcommunity.com/sharedfiles/filedetails/?id=3128028926) | Prerađena varijanta. Ne treba je miješati s preciznim pravilima iz 2005. |
| [JudgeHype originalna ploča](https://worldofwarcraft.judgehype.com/image/16487/) | Dostupna fotografija 1600 × 1108 px. Lokalno spremljena kao `public/assets/original-board.jpg` i prikazana u igri. Vidljivi su pregibi i perspektiva: nije ravan visokorezolucijski sken. |
| [BGG datoteke osnovne igre](https://boardgamegeek.com/boardgame/17223/world-of-warcraft-the-boardgame/files) | Indeks zajedničkih materijala. Pojedini downloadi mogu zahtijevati korisnički račun. |
| [BGG Shadow of War](https://boardgamegeek.com/boardgame/22823/world-of-warcraft-the-boardgame-shadow-of-war) | Vidljive poveznice na print-data ZIP datoteke klasa i zadataka. Proširenje; nije uvezeno. |

Steam API preuzimanje u ovoj mreži vraća FortiGate blokadu aplikacije Steam. Zbog toga TTS save JSON, teksture i 3D modeli nisu preuzeti niti integrirani. Workshop opis može se pregledati, ali to ne potvrđuje dostupnost svih vanjskih linkova iz paketa. Povijesni `wowtbg.lancelot.dk` indeks spomenut u modovima nije se uspješno otvorio.

Kad je TTS save JSON dostupan u normalnom dopuštenom okruženju, sljedeći korak je parsirati `CustomDeck` / `FaceURL` / `BackURL`, dimenzije atlasa i objekte ploče. Lua skripte treba prvo pregledati; njihove efekte potom prenijeti u testirane naredbe enginea. Sam sken ili TTS model ne daje automatski izvršiva pravila.

## Službeni pravilnik

[FFG pravilnik, 40 stranica](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf), [FAQ v1.4](https://www.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf) i [FFG arhiva](https://www.fantasyflightgames.com/en/more/product-document-archive/) osnova su za usporedbu. Prototip prati osnovni redoslijed poteza, putovanje i redoslijed boja u borbi. Detaljna odstupanja navedena su u aplikaciji i dokumentu ENGINE.md; ova verzija ne tvrdi potpunu usklađenost.

## 2D, 2.5D ili 3D

| Pristup | Primjena |
| --- | --- |
| React + SVG/CSS, implementirano | Jasna ploča, DOM pristupačnost, galerija karata, efekti i brz lokalni razvoj. Najjednostavnija osnova za provjeru pravila. |
| [Phaser](https://docs.phaser.io/) | 2D Canvas/WebGL prikaz s bogatijim efektima, spriteovima i animacijama; može koristiti isti TypeScript engine. |
| [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) | Perspektivna ploča, karte kao mesh objekti, figurice i bacanje 3D kockica. Za kvalitetan rezultat trebaju odgovarajući modeli i teksture. |
| [Three.js WebGPURenderer](https://threejs.org/manual/pages/webgpurenderer) | Alternativni renderer s automatskim povratkom na WebGL 2; prije izbora treba testirati ciljane preglednike i podržane efekte. |

Preporuka za nastavak: zadržati čisti engine i dovršiti baznu igru, zatim dodati 2.5D prikaz ploče. Potpuni 3D je izvediv, ali u ovoj verziji nije izrađen. Unity je također moguća zasebna implementacija; njegovo okruženje i build na ovom računaru nisu provjereni.
