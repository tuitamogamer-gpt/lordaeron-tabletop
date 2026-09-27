# Warforged Chronicles · desktop sto v3

Skenovi su izvori teksta, pravila i vrijednosti. Interfejs koristi vlastite ilustracije i predloške. Referenca za raspored je [fizički sto osnovne igre](https://www.ebgl.org/current.php?g=2): centralna ploča, questovi obje frakcije, lični listovi, špilovi i tracker.

## Raspored

Lijevo su dva zasebna frakcijska quest panela, svaki sa svojim pomicanjem. U sredini su Overlord, ilustrirana mapa, akcije i aktivni svjetski događaji. Desno su portreti družine, lični resursi, rasna sposobnost, upravljanje i AI. Ispod mape je lični list sa sedam mjesta, torbom i talentima. Na dnu je svih 30 frakcijskih smjena. Hood of Shadow proširuje list na osam mjesta.

Klesani kamen, bronzani rubovi, pergament, tamna dvorana i oslikani portreti daju Warcraft ton. Cinzel služi imenima, Inter objašnjenjima i brojkama. Crvena/plava signaliziraju frakciju, ali tekst i ikone ostaju prisutni. `prefers-reduced-motion` isključuje animacije.

Svih 16 junaka ima vlastiti portret u novom 4×4 atlasu. Kazzak, Nefarian i Kel’Thuzad imaju zasebne portrete u atlasu 3×1. Ostaju prethodno generirani atlas 13 stvorenja, ikone klasa i akcija, mapa, grbovi, okvir i teksture. Tačni promptovi su u [IMAGEGEN-BASE.md](IMAGEGEN-BASE.md) i [IMAGEGEN-WARCRAFT.md](IMAGEGEN-WARCRAFT.md).

## Komponente

`Tabletop.tsx` i `tabletop.css` organizuju sto. `CardFrame` u `design-system.tsx` daje vrstu/nivo, art, ime, trenutak aktivacije, efekat i vrijednosti. `GameCard`, `CharacterCard`, `QuestCard`, `EventCardView`, `CreatureCard` i `OverlordCard` koriste taj okvir. `rules-text.ts` prevodi izvršive efekte u čitljiv tekst; `event-text.ts` opisuje trajne događaje i bossove.

`BaseCatalog` pretražuje kompletan osnovni set po vrsti, klasi, frakciji i špilu. Prikazuje 24 karte po stranici. Detalj kartice pokazuje sve jačine efekta i poveznicu na izvorni sken. Skenovi nisu pozadine karata.

`Combat` grupiše dozvoljene sposobnosti po karti; izbor uključuje jačinu, cilj i kockice. `WorldDecision` vodi aukcije, događaje, retrening, nagrade, talente i povratak poraženih likova. `EquipmentEditor` podržava i posebno osmo mjesto. Sve naredbe prolaze kroz isti reducer.

## Mapa i kontrole

SVG sloj drži 67 interaktivnih regija, veze, portrete likova, stvorenja, Overlorda, Kazzakove tragove i kugu/boss događaje. Putanje dolaze iz grafa, a ne iz piksela ilustracije. Ravan sken glavne ploče ostaje potreban za završnu provjeru veza i letnih oznaka.

Miš: točkić za zoom, povlačenje za pomak, klik za regiju. Kontrole: centriranje na junaka, izbor regije i putanje, cijela mapa, proširen prikaz. Tastatura: 1–5 akcije, F proširena mapa; u mapi +/−/0 i strelice. Nema posebnog mobilnog rasporeda; minimalna desktop širina je 1220 px.

Provjera prikaza i trenutna ograničenja pregledničkog alata dokumentovani su u [VALIDATION.md](VALIDATION.md).
