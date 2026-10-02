# Potpune slike karata i fizičke D8 · 3. oktobar 2026.

Lice svake karte je jedna završna WebP slika. Naziv, nivo, pravila, sve jačine i cijena utisnuti su u istu sliku s ilustracijom i okvirom. React više ne preklapa lice HTML tekstom, SVG foreignObject elementima ili zasebnim CSS panelima. Thumbnail, character slot i veliki pregled koriste isti asset. Kontrole za kupovinu, odabir i igranje ostaju izvan odštampane karte; čitači ekrana dobijaju potpuni transkript kroz alt opis.

## Sadržaj i izrada

- 406 moći, talenata, predmeta, početnih i rasnih sposobnosti.
- 80 questova, 52 eventa i 13 stvorenja.
- 6 Overlord referenci: tačne zasebne vrijednosti za četiri i šest likova.
- 16 referenci likova, uključujući kapacitete i početne slotove.

Ukupno **573** slike u `public/assets/card-faces/v9/`. Od toga 550 ima 768×1152 px, a 23 imaju duži pergament radi čitljivosti. Execute zadržava svih pet izričitih jačina. Veći linearni nizovi predstavljeni su tačnom formulom s rasponom; test proširuje formule i poredi svaku opciju s engineom. Strength of the Wild provjerava sve raspodjele pogodaka prije sažimanja. Ni jedna opcija nije zamijenjena natpisom „hover for all“.

Novi okvir napravljen je ugrađenim **imagegen** alatom; postojeće imagegen ilustracije zadržane su u punom kadru. Tačan tekst iz izvršivog paketa rasteriziran je u procesu pripreme slika. Tekst nije prepušten generativnom modelu. Ovo je kombinacija generirane grafike i provjerenog odštampanog teksta, završena kao jedna slika po karti.

Izvori i ponavljanje:

- `public/assets/card-faces/frame-v9.webp`: novi pregledani imagegen okvir.
- `src/campaign/raster-card-text.ts`: sav tekst i pravila za slike.
- `scripts/bake-card-faces.ts`: raspored, mjerenje fontova i WebP izvoz; `npm run cards:bake`.
- `src/data/raster-card-faces.json`: putanje, dimenzije, transkript i fingerprint.
- `src/data/raster-card-metadata.json`: izvori ilustracija, redovi teksta i provjera granica.
- `npm run check:cards`: pokrivenost, stale podaci, dimenzije, margine i ekvivalentnost opcija.

Reprodukcija slika koristi Windows Arial/Arial Bold/Georgia Bold. Druge lokacije fontova mogu se dati kroz `CARD_BODY_FONT`, `CARD_BOLD_FONT` i `CARD_TITLE_FONT`. Produkcijski build koristi već pripremljene WebP datoteke i ne zahtijeva ove fontove.

## D8 i tok borbe

Referenca je [službeni FFG pravilnik iz 2005.](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf), str. 2 i 5 za kockice, 27–30 za PvE i 32–33 za PvP.

D8 koristi osam trouglastih ploha pravilnog oktaedra, šest vrhova i dvanaest ivica. Nova orijentacija jasno prikazuje gornju i bočne plohe. Zasićena crvena, plava i zelena plastika, bijeli brojevi, osvjetljenje prema normalama ploha i kratko kotrljanje zamjenjuju izgled pljosnatog trougla. Spremne kockice imaju odštampane brojeve; njihov status ostaje „prepared“. Mali D8 simboli uz pravila dijele istu geometriju i boje.

Borba prikazuje tri fizička polja: **Damage**, **Defense** i **Attrition**. Crveni melee pogoci i zeleni armor tokeni zajedno su u Defense polju. Objašnjenje prati fazu obračuna. PvP tekst više ne tvrdi da melee blokira dolazni ranged napad niti da se PvP šteta prenosi u sljedeći krug. Postojeća Overlord-only kampanja ostaje projektna varijanta prema ranijem zahtjevu.

## Provjera

- Svih **1.016 testova u 45 datoteka** prolazi (`npm test -- --maxWorkers=2`).
- TypeScript klijent/server i produkcijski Vite build prolaze; build uključuje svih 573 datoteka.
- SSR provjera svih 621 prikaza prolazi bez `undefined` ili `NaN`.
- Provjerene raster datoteke i kontaktni list `screenshots/raster-card-contact-sheet-v9.png`.
- Browser provjera na 1280×720: biblioteka bez prelijevanja stranice; šest potpunih slika učitano; nema tekstualnih čvorova na licima; veliki pregled čuva izvorne proporcije; borba i dugmad dostupni.
- Browser screenshot nije dostupan u ovoj sesiji; vizuelni pregled izveden je nad završnim assetima, a raspored dodatno provjeren kroz stvarni DOM i dimenzije.

## Imagegen prompt

Built-in imagegen, jedna nova slika, bez API fallbacka:

> Use case: ui-mockup. Asset type: production imagegen card frame for the digital adaptation of World of Warcraft: The Board Game (2005). Generate ONE premium portrait fantasy card template, exactly 2:3 proportion, straight on, full bleed. This is a reusable printed card frame to be composited with game-specific illustration and authoritative typeset text, then saved as ONE flattened image. Physical feel of a 2005 board game, warm aged ivory vellum, dark bronze and restrained gold filigree, beautifully detailed but no glowing effects. Precise normalized layout: outer frame 0-100%; dark shallow bronze HEADER band y=0-7%; empty illustration window x=6%-94%, y=7%-42% filled with a uniform very dark pine green; dark bronze TITLE band y=42%-51%; uniformly very light warm ivory RULES panel x=6%-94%, y=51%-93%; narrow dark bronze FOOTER band y=93%-100%. Rules panel must be clean light nearly white cream, extremely subtle paper grain, no marks. All four borders visible, elegant small carved ornaments restricted to corners and borders, no projections outside rectangle. No letters, no numbers, no glyphs, no logos, no text, no dice, no painting or scenery inside either empty window. No perspective, no scene background, no multiple cards. 1024x1536 portrait image.
