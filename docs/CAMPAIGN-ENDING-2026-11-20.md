# Kako se kampanja završava · 20. 11. 2026.

Pitanje, uz sliku završnog ekrana na kojem piše „34 turns played · Lap 2 · turn 4 of 30”: „Kako 34. turn? Na turn 30 ide mass PvP.”

## Šta je nađeno

- **Svaka nova kampanja igrala se po varijanti „Defeat the Overlord”** (pravilnik, str. 37): nema završne borbe, a poslije 30. poteza traka kreće ispočetka (lap 2, 3…) dok Overlord ne padne. Zato je partija sa slike završila u drugom krugu, na 4. potezu: 30 + 4 = 34.
- Postavljanje partije to nije davalo na izbor. Pisalo je samo „Campaign objective · Defeat the Overlord”, kao napomena.
- Standardni završetak (završna PvP borba kad 30. potez prođe, a Overlord još stoji) postojao je u pravilima igre, ali se do njega moglo doći samo uvozom starije partije.
- Kad se do završne pripreme ipak dođe, ekran ju je opisivao riječima običnog opremanja: „Prepare your party’s equipment” i dugme „End turn”, koje zapravo počinje završnu borbu.
- Završni ekran je poslije završne borbe pisao „The Alliance wins the final battle in final.”

## Šta je sada

- **Postavljanje pita kako se kampanja završava**, na prvom koraku, uz veličinu stola:
  - **Final battle after turn 30** (standardna pravila, sada zadano): frakcija koja prva pobijedi Overlorda pobjeđuje odmah; ako on još stoji kad prođe 30. potez, frakcije se sretnu u jednoj završnoj PvP borbi.
  - **Defeat the Overlord** (varijanta, str. 37): bez završne borbe; traka poslije 30. poteza kreće ispočetka i igra se dok Overlord ne padne.
- Izbor se vidi i na zadnjem koraku postavljanja („Ends: final battle after turn 30”).
- **Kraj 30. poteza se najavi**: „Turn 30 is over · The final battle”, uz to koja se frakcija sprema prva i napada.
- Završna priprema se zove **Prepare for the final battle** i kaže da su svi likovi vraćeni na puno zdravlje i energiju. Kad su svi spremni, dugme je **Begin the final battle** (u zaglavlju „Final battle”).
- Završni ekran piše „The Alliance wins the final battle after turn 30.”

## Šta nije dirano

- Pravila oba završetka su ista kao prije; mijenjano je samo koji je zadan i kako se bira.
- **Započete kampanje zadržavaju završetak s kojim su počele.** Partija započeta kao „Defeat the Overlord” i dalje ide u krugove.
- Online sobe i testovi motora i dalje koriste svoje zadano postavljanje.

## Provjera

- **1.679 testova** (bilo ih je 1.675):
  - `tests/campaign-ending.test.tsx` (3 nova): kraj 30. poteza vodi u završnu pripremu i najavljuje se, varijanta kreće u novi krug, a dugme „Begin the final battle” šalje naredbu koja otvara borbu sa svim likovima;
  - `tests/class-deck-ui.test.tsx`: postavljanje nudi oba završetka, standardni je zadan, a izbor varijante ide u kampanju (jedan test zamijenjen s dva);
  - prilagođeni su testovi u `setup-flow` i `campaign-summary`.
- `npm run build` i `npm run check:render` prolaze.
- **Cijela partija po standardnim pravilima** odigrana je s AI-jem (četiri lika, sjeme 41): 967 naredbi do kraja 30. poteza, završna priprema, završna borba od 11 rundi, „The Alliance wins!”.
- U pregledniku, iz te partije:
  - ekran postavljanja s izborom na 1440×900, 1280×720 i 390×844, bez skrolanja prozora;
  - kraj 30. poteza: Alijansa završi potez, sto pređe u „Final PvP preparation”, botovi se opreme, igračev lik potvrdi opremu, „Begin the final battle” otvori borbu „Final showdown”, a botovi i igrač u njoj biraju napadača i bacaju kockice;
  - završni ekran poslije završne borbe.
- Nije odigrano rukom u pregledniku: završna borba od prve do zadnje runde (skripta za klikanje je stala na rerollu, pa je borba dovršena kroz motor pravila) i najava „The final battle” s uključenim tempom stola (pokrivena testom).

## Fajlovi

- `src/campaign/CampaignSetup.tsx`, `src/campaign/setup-flow.css`: izbor završetka.
- `src/campaign/Tabletop.tsx`, `src/Campaign.tsx`: natpisi završne pripreme.
- `src/campaign/stage.ts`: najava završne borbe.
- `src/campaign/CampaignSummary.tsx`: rečenica završnog ekrana.
