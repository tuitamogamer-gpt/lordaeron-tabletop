# Borba kao na stolu · 10. 11. 2026.

Mehanika borbe se ne mijenja. Mijenja se izgled, da više liči na originalnu igru: polje borbe sa žetonima kakvo je odštampano na tabli, podaci o protivniku na prelazak mišem i manje kontrole za sposobnosti.

## Polje borbe s table

Na originalnoj tabli „COMBAT AREA” je odštampan dvaput (dole desno i gore lijevo, za obje strane stola, vidi `public/assets/original-board.jpg`). To su tri kruga koja se preklapaju: veliki **Damage**, srednji **Defense** i manji **Attrition**. Uz njih su sličice kocki koje ih pune: plava kocka uz Damage, crvena i zelena uz Defense. Igrači u krugove stavljaju hit i armor žetone.

U igri je to sada isto:

- Tri preklopljena kruga s natpisnim pločicama, kao na tabli.
- U krugu leže pravi žetoni iz skenova: crveni hit žeton za svaki hit i zeleni armor žeton za svaki armor. Bez skenova to su nacrtani žetoni.
- Ranged hitovi (plave kocke) idu u Damage, melee hitovi (crvene) i armor (zelene) u Defense, a hitovi od sposobnosti u Attrition. Uz svaki krug je oznaka boje kocke.
- Svaki krug ima tačan broj na znački. Kad žetona ima više nego što stane (12 u Damage, po 6 hitova i armora u Defense, 5 u Attrition), ostatak piše kao „+n”.
- Žetoni padaju u krug s kratkom animacijom, koja je isključena kad sistem traži manje pokreta.
- Naslov polja pokazuje frakciju i trenutnu rundu („COMBAT AREA · ROUND 3”). Ispod kruga ostaje objašnjenje koraka i broj rana za raspodjelu.

**Raspored:** na računaru polje stoji desno od kocki, kao na stolu: kocke se bacaju lijevo, a hitovi idu u krugove. Ranije je bilo ispod kocki, na 1366×768 odsječeno ispod ivice ekrana. U PvP-u su dva manja polja, jedno za svaku frakciju. Na telefonu je polje ispod kocki, a legenda boja je ispod krugova.

## Protivnik na prelazak mišem

Portret i ime protivnika u zaglavlju borbe, kao i protivnik u sceni borbe, otvaraju karticu na prelazak mišem ili fokus tastaturom:

- **Stvorenja:** grupe po vrsti i boji figure (npr. „2 × Murloc · zelena figura · cilj questa”, „plava figura · nezavisna”), s pragom (Threat), napadom i zdravljem, koliko ih je već poraženo i pravilom stvorenja.
- **Overlord ili boss događaja:** ime, vrijednosti i njegova pravila borbe.
- **PvP:** heroji obje frakcije s nivoom, zdravljem i energijom.

Kartica je opis tog elementa (`aria-describedby`), pa je čitač ekrana pročita i bez miša.

## Sposobnosti

Desno su sposobnosti bile velike karte (oko 140×200 px u okvirima od pola ekrana), pa su potiskivale izbor kocki i bacanje. Sada je svaka karta jedan red: mala sličica (prelazak preko nje i dalje otvara cijelu kartu), mjesto, ime i stanje („Automatic effect”, „Used this round”, potrebna energija). Spremne sposobnosti imaju i dugme **Available +**. Klik otvara opcije ispod reda (jačina, kocke, energija prije i poslije) i dugme **Use … · n energy**.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.122 testa u 60 datoteka prolaze; novi: tri kruga s oznakama kocki i rundom, žetoni po jedan po hitu i armoru s „+n” (`scan-assets.test.tsx`), kartica protivnika za grupe stvorenja i Overlorda (`combat-area.test.tsx`) |
| `npm run build`, `npm run check:render` | prolaze; 621 komponenta |
| Chromium, 1366×768 | polje borbe cijelo vidljivo pored kocki, bez skrolanja; žetoni u krugovima; kartica protivnika za stvorenje i bossa (s pravilom); otvorena sposobnost staje u desnu kolonu |
| Chromium, 1280×720, 1920×1080, 390×844 | bez vodoravnog skrolanja; na telefonu je polje ispod kocki |
