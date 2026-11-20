# Žetoni rata i bossa, raspoređivanje početnih questova i oslikana zona borbe · 20. 11. 2026.

Zahtjev: „Ne vidim nigdje oznake za War tokene. Moraju biti vidljivi tokeni za War, oni kao mačevi, na mapi. Kada je War aktivan, mora biti u Active Encounters, a ne u Discarded. Isto tako za bosseve token koji ide za bosseve, kada izađe kao encounter. Na početku, za početne setup questove, želim animaciju kako se raspoređuju, da znamo gdje su, za obje frakcije. Combat area dizajniraj da fino izgleda (OpenArt), a ne da budu kao SVG.”

Pravila igre nisu mijenjana.

## 1. Rat na mapi i u Active encounters

**Nađeno.** Rat (The Silverpine War i ostala četiri) nije imao ništa na mapi: njegova dva polja su stajala samo u tekstu karte. U panelu Encounter deck rat je bio u **Discard pile**, a ne u **Active encounters**, iako traje dok ga neko ne dobije.

**Sada.**
- Na svakom od dva polja rata leži **žeton s ukrštenim mačevima**. Oba polja su crveno omeđena i spojena tačkastom linijom, pa se par vidi na prvi pogled, i na stolu i u punoj mapi.
- Hover preko žetona pojača oba polja i liniju i kaže: ime rata, šta treba (držati oba polja do kraja protivničkog poteza), nagradu, ko trenutno stoji na kojem polju i gdje leži drugi žeton.
- Najava Event karte za rat osvijetli jedno od njegovih polja.
- **Active encounters** sada sadrži ratove koji traju i sve što je još na tabli; **Discard pile** ih više ne pokazuje. Kad se rat dobije, karta prelazi u odbačene, a žetoni nestaju.

## 2. Boss kao encounter

Boss koji izađe iz špila bio je na mapi ljubičasti romb s uzvičnikom. Sada na njegovom polju stoji **oslikani žeton bossa** (rogata lobanja u ljubičastom polju), s ljubičastim sjajem. Na stolu, gdje je tabla mala, žetoni rata i bossa su crtani veći.

## 3. Raspoređivanje početnih questova

**Nađeno.** Nova kampanja je počinjala s već postavljenom tablom: sve figure svih deset početnih questova stajale su odjednom, a gdje je čiji quest moglo se saznati samo iz spiska.

**Sada.** Nova kampanja počinje kao za stolom (`stage.ts > setupBeats`):
1. „The Horde’s quests are laid out”, pa quest po quest: gore se pokaže karta questa s imenom i redom „1 × Crusader (green) in Brightwater Lake · 1 × Gnoll (blue) in Balnir Farmstead”.
2. U tom trenutku se **figure tog questa spuste na svoja polja** odozgo, polje po polje, a polja zasvijetle bojom frakcije. Dok quest ne dođe na red, njegovih figura nema na tabli (i plavih koje je on postavio).
3. Isto za Alijansu, pa najava prvog poteza.

Oko 36 sekundi pri tempu Normal za deset questova. Klik ili razmaknica ide na sljedeći, **Skip all** postavi sve odjednom. S tempom **Off** tabla je odmah postavljena kao prije. Učitana ili nastavljena partija ne ponavlja postavku.

## 4. Zona borbe

Tri kruga (Damage, Defense, Attrition) bila su nacrtana CSS prelivima. Sada su to **tri oslikane posude na kožnoj podlozi ratnog stola**: plava čelična s bronzanim obodom za Damage, crvena kožna u okovanom obodu za Defense, tamna jantarna u bazaltu sa zlatom za Attrition. Natpisi, žetoni pogodaka i oklopa, brojači i zbir runde ostali su pravi tekst i pravi žetoni preko slike, na istim mjestima.

## Slike (OpenArt)

Sve slike su napravljene 20. 11. 2026. na OpenArt-u, model **Seedream 5.5**, 1K, po dvije varijante od kojih je jedna izabrana. Po cjenovniku je to 144 kredita (6 zahtjeva × 2 slike × 12); stvarno naplaćen iznos nije provjeravan. To su slike napravljene za ovaj projekat, ne skenovi štampane igre. Izvorni PNG-ovi su u `.local-data/imagegen-sources/openart-2026-11-20/` (ne ulaze u repozitorij); `scripts/prepare-combat-art.ts` ih obrezuje na predmet i snima kao WebP.

| Fajl | Veličina | Pozadina |
| --- | --- | --- |
| `public/assets/combat/damage.webp` | 512 × 513, 48 kB | providna |
| `public/assets/combat/defense.webp` | 512 × 512, 58 kB | providna |
| `public/assets/combat/attrition.webp` | 448 × 450, 43 kB | providna |
| `public/assets/combat/mat.webp` | 768 × 512, 40 kB | puna |
| `public/assets/tokens/war.webp` | 160 × 160, 10 kB | providna |
| `public/assets/tokens/boss-encounter.webp` | 178 × 176, 12 kB | providna |

Zajednički dio prompta za tri posude: „Production game UI asset for a fantasy strategy board game combat board: ONE perfectly circular shallow tray seen exactly from above, orthographic top-down, no perspective, centered and filling the whole square frame edge to edge. […] dark and calm, EMPTY so that game tokens can be laid on it. Hand-painted chunky Warcraft III / vanilla World of Warcraft craftsmanship, bold sculpted top-left highlights, dark crevices, rich jewel colour, tactile painterly material. Isolated object on a transparent background. Absolutely NO text, letters, numbers, runes, tokens, coins, dice, weapons or objects inside the tray, no shadow outside the rim.”

- **Damage:** „Thick hammered antique bronze rim with a ring of small rivets and four angular arrowhead ornaments at the compass points. The wide flat interior is deep sapphire-blue enamelled steel with a faint engraved crosshair and subtle scratches”.
- **Defense:** „Thick forged dark iron and bronze rim shaped like the edge of a round shield, with heavy rivets and four small angular shield-boss ornaments at the compass points. The wide flat interior is deep crimson tooled leather with a faint embossed round shield pattern”.
- **Attrition:** „Thick dark carved basalt rim inlaid with a thin band of hammered gold and four small ember-orange gems at the compass points. The wide flat interior is scorched dark amber-brown stone with faint glowing cracks near the rim”.
- **Podloga:** „Production game UI background texture for the combat board of a fantasy strategy board game: a flat war-table surface seen exactly from above, orthographic, filling the entire image edge to edge. Dark stained oak planks covered by a worn deep-green leather playing mat with a thin tooled gold border line near the edges and small hammered bronze studs in the four corners. Very dark, low contrast and calm in the middle […] Absolutely NO text, letters, numbers, runes, symbols, circles, tokens, dice, weapons or any objects on the mat.”
- **Žeton rata:** „Production board game token for a fantasy strategy game map: ONE round cardboard-and-metal war marker seen exactly from above […] A thick hammered steel rim with small rivets around a dark crimson enamel field; on it two large crossed broadswords in bright polished steel with golden hilts, blades crossing in the middle, bold simple silhouette readable at 32 pixels. […] Isolated object on a transparent background. NO text, letters, numbers, banners or extra objects, no shadow outside the rim.”
- **Žeton bossa:** isto, s „A thick spiked dark iron and tarnished gold rim around a deep violet enamel field; on it one large horned demon skull in pale bone with glowing amber eyes, facing the viewer”.

## Provjera

- **1.652 testa** (7 novih u `tests/board-encounters.test.tsx`): žeton rata na oba polja i par označen; nema žetona kad rat završi; boss kao oslikani žeton; rat i boss u Active encounters, a ne u Discard pile; početni questovi se otkrivaju redom Horda pa Alijansa, svaki jednom, s plavim figurama; figure questa nisu na tabli dok ne dođe na red; slike postoje i stilovi ih koriste.
- U pregledniku (1440 × 900): nova partija kroz postavku odigrala je svih deset najava redom, s brojem figura na tabli koji raste od 0; partija s ratom i bossom pokazuje žetone na stolu i u punoj mapi, hover i panel; borba protiv stvorenja i borba frakcija pokazuju nove posude i podlogu.
- `npm run build` i `npm run check:render` prolaze.

## Granice

- Štampana igra ima svoje žetone za rat i bossa; skenova tih žetona u projektu nema, pa su ovi oslikani iznova i ne tvrde da su isti kao štampani.
- Animacija postavke je pregledana na desktop širini; na telefonu nije posebno provjeravana.
- Posude su ugrađene u postojeći raspored tri kruga; raspored žetona unutar njih nije mijenjan.
