# Porijeklo materijala

## Referentni resursi

| Lokalna datoteka | Izvor | Napomena |
| --- | --- | --- |
| `public/assets/reference/*` | [eidonia/WowBGAssist](https://github.com/eidonia/WowBGAssist/tree/a68e639528069028a98de490602f93a93020a061) | 273 lica predmeta, 5 poleđina, 39 prikaza stvorenja; tačni URL-ovi i SHA-256 u manifestu |
| `public/assets/original-characters.json` | [WoW-BG-app Classes.json](https://github.com/WarHatch/WoW-BG-app/blob/9a6a70d916a02182edcc7b261739a36bd0555d3d/constants/Classes/Classes.json) | 16 originalnih likova; prikazani kao referenca |
| `public/assets/original-board.jpg` | [JudgeHype fotografija](https://worldofwarcraft.judgehype.com/image/16487/), [direktna slika](https://worldofwarcraft.judgehype.com/screenshots/images/divers/boardgame4.jpg) | 1600 × 1108; fotografija fizičke ploče, nije čist sken |

Za preuzete repozitorije nije utvrđena licenca koja pokriva originalne slike. Izvori i nosioci prava ostaju odvojeni od vlastitog koda. Dostupnost materijala na webu nije licenca za njihovo javno objavljivanje. Produkcijska verzija i status hostinga navedeni su u README-u.

## Generirane ilustracije

Sljedeće dvije slike nastale su alatom za generiranje slika, kao nova grafika prototipa. Nisu skenovi fizičke igre. Alat je sam odabrao rezoluciju; izvorne PNG datoteke su kopirane bez precrtavanja. CSS prikazuje portrete iz atlasa 3 × 3. Datum: 26. 9. 2026.

- `public/assets/lordaeron.png` — ilustrirana karta, 1536 × 1024, tamna fantasy paleta. Gameplay oznake i putevi su zasebni SVG/HTML elementi.
- `public/assets/heroes.png` — devet portreta u atlasu 3 × 3.

### Prompt za mapu

```text
Use case: stylized-concept. Asset type: large landscape illustrated map background for a premium World of Warcraft 2005 inspired digital board game. Paint an original highly detailed top down fantasy cartographic map of Lordaeron, northern Eastern Kingdoms, in the nostalgic hand painted Blizzard fantasy art style, cinematic moody dark greens, desaturated teal seas, ochre parchment terrain, ruined gothic castles. Aspect ratio 3:2 landscape. Geography: western left edge contains dark sea with rocky coastline, central southwest deep Silverpine pine forests and ruined keep, south center golden rolling Hillsbrad farmlands with a small stone seaside port, snowy Alterac mountains at exact center, gloomy Tirisfal northern northwest, eerie sickly yellow Western Plaguelands northern center, purple diseased forests and large gothic castle in northeast Eastern Plaguelands, green rugged Hinterlands southeast with dwarf mountain fortress, lake east of snowy mountains. Birds eye map view, subtle relief illustrated terrain, small buildings and individually painted trees, paths and rivers. All edges dark vignette blending to black. Fill frame with geography and terrain with no UI. NO TEXT, NO LABELS, NO lettering, no logo, no compass, no icons, no border, no visible grid. This is background art only: all map labels and gameplay locations will be overlaid separately.
```

### Prompt za portrete

```text
Use case: stylized-concept. Asset type: single 3 by 3 hero portrait atlas texture for a Warcraft inspired fantasy board game. A square image divided into exactly nine equal square panels in a clean 3 by 3 grid with NO gutters NO borders NO text, each of nine head and shoulder painted portraits occupies its own panel edge to edge. Consistent premium Blizzard fantasy card illustration, bold shapes, fine brushwork, dramatic chiaroscuro rim lighting, atmospheric dark background per panel. Row one left to right: 1 fierce green male orc warrior with tusks scarred face iron spiked heavy pauldrons and reddish background; 2 undead female mage pale blue gray skin luminous icy eyes violet hood with teal magic; 3 rugged male dwarf hunter magnificent red beard leather armor green forest background. Row two left to right: 4 female night elf druid with long ears purple skin flowing teal hair moonlit green forest; 5 blonde human male paladin ornate gold plate armor and blue cloak warm light; 6 blue male troll priest with long tusks white face markings and glowing golden light. Row three left to right: 7 human female rogue leather hood and daggers, dark amber eyes and purple background; 8 huge male tauren shaman bovine face long horns and ritual beads blue lightning background; 9 gnome female warlock huge green eyes pink hair and purple robes with fel green light. Center each face within its own square and show full head including hair/horns. Nine distinct portraits, no text whatsoever, no frames, no logos.
```

## Osnovni set iz skenova · v0.3

Svih 560 korisnikovih originala preuzeto je u ignorisanu lokalnu mapu; inventar, porijeklo i SHA-256 nalaze se u [manifestu](sources/base-scans-manifest.json). Aktivna igra koristi transkribirane podatke iz `src/data/base/`, uz službeni FAQ. Stari community podaci ostaju referenca.

`public/assets/warcraft/characters-base.webp` zamjenjuje atlas od devet likova sa 16 individualnih portreta. `public/assets/warcraft/bosses-base.webp` prikazuje tri originalno nacrtana Overlorda. Tačni promptovi i izvori su u [IMAGEGEN-BASE.md](IMAGEGEN-BASE.md). Desktop sto koristi mapu, ličnu ploču, frakcijske questove i traku poteza, inspirisan [rasporedom fizičke igre](https://www.ebgl.org/current.php?g=2).

## Ostalo

Cinzel i Inter fontovi dolaze iz lokalnih `@fontsource` paketa, s licencama isporučenim u tim paketima. Ikone su iz `lucide-react`. Favicon, SVG putanje, CSS efekti i sintetizirani zvuk poteza nastali su za ovaj projekt. Za rad aplikacije nije potreban vanjski CDN.


## Warforged Chronicles · dizajn sistem v2

Igriva kampanja koristi novu ilustraciju mape i portrete, ne referentnu fotografiju ploče. Karte opreme, moći, talenata, questova, događaja, stvorenja i Overlorda prikazuje kodirani Warforged Chronicles predložak. Sedam novih imagegen WebP datoteka u `public/assets/warcraft/` obuhvata mapu, dvoranu, okvir, pergament, dva grba, 16 ikona akcija/sposobnosti i 16 polja atlasa stvorenja/Overlorda/događaja/plijena. Sve su generirane za projekt; tačni promptovi su u [IMAGEGEN-WARCRAFT.md](IMAGEGEN-WARCRAFT.md). Te ilustracije ne mijenjaju skriptirana pravila.

`public/assets/reference-text.json` čuva 271 transkripciju item tekstova iz community baze. Izdanje je neprovjereno, `scripted: false`; tekst nije automatski ušao u igrivi set. `src/data/reference-creatures.json` je izvor community vrijednosti za 13 vrsta i tri boje. `src/data/original-characters.json` je radna kopija kapaciteta likova.
