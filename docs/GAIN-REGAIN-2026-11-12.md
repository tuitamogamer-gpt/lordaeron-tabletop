# Gain ide iznad kapaciteta, Regain ne · revizija pravila 4 · 12. 11. 2026.

Zahtjev: „charge warrioru daje excess mana, to moraš generalno ispraviti kod svih. Gain znači ide iznad kapaciteta, a ako se ne potroši, gubi se na kraju.”

## Pravilo

Pravilnik, str. 13: sposobnost koja liku daje da **gain** zdravlje ili energiju može ga podići iznad kapaciteta „for that ability’s duration”. Sposobnost koja daje da **regain** ne može: staje na kapacitetu. Svaka gain karta sama kaže kada višak odlazi.

## Šta je provjereno

Pročitana je riječ odštampana na svakoj karti osnovne igre koja daje zdravlje ili energiju, sa skenova, i upoređena s podacima igre.

**Gain, 10 karata:**

| Karta | Šta daje | Kada višak odlazi |
| --- | --- | --- |
| Charge (Warrior) | 1 energiju na početku svakog svog Dice Pool koraka | na kraju borbe |
| Bloodrage (Warrior) | 2 energije za svako potrošeno zdravlje | na kraju borbe |
| Unbridled Wrath (Warrior) | 1 energiju za crvenu kockicu koja pokazuje 7 ili 8, nakon ponovnog bacanja | na kraju borbe |
| Arcane Intellect (Mage) | 1 energiju na početku svog Dice Pool koraka | na kraju borbe |
| Divine Spirit (Priest) | 3 energije svakom u grupi na početku prve runde | na kraju borbe |
| Power Word: Fortitude (Priest) | 1 zdravlje svakom u grupi, u Dice Pool koraku | na kraju borbe |
| Sacrifice (Warlock) | zdravlje za žrtvovanog Voidwalkera | na kraju runde |
| Anger Management (Warrior), Mental Strength (Priest), Blessing of Kings (Paladin) | talenti koji podižu kapacitet i pri učenju daju isto toliko | ne odlazi, jer je kapacitet veći |

**Regain, 24 karte:** Advisor’s Gnarled Staff, Arcane Meditation, Arcane Mind, Cannibalize, Crocolisk Steak, Deathcoil, Expansive Mind, Greater Healing Potion, Greater Mana Potion, Holy Shield, Icicle Rod, Lesser Healing Potion, Lesser Mana Potion, Lorekeeper’s Ring, Mana Tide Totem, Meditation, Minor Healing Potion, Minor Mana Potion, Omen of Clarity, Regeneration, Relentless Strikes, Robe of Power, Siphon Life, Tranquility.

Podaci igre su se slagali sa svih 34 karte: gain karte su i ranije išle iznad kapaciteta, regain karte su stajale na njemu, a višak se skidao kad se borba zatvori. Charge je dakle već radio kako zahtjev traži. Warrior s kapacitetom 1 ima nakon prvog napada 2 energije, a nakon drugog 3 ako ih ne potroši.

## Šta je bilo pogrešno

Jedna stvar. Višak se skidao samo likovima koji su u trenutku zatvaranja borbe još bili u njoj.

Mage koji je od Arcane Intellecta dobio energiju iznad kapaciteta, pa iz borbe izašao Ice Blockom („no longer participating in the combat”), zadržao bi taj višak trajno. Zadržao bi i Stun.

Od **revizije pravila 4** lik koji napusti borbu u tom trenutku gubi zdravlje i energiju iznad kapaciteta i svoj Stun, jer je za njega borba završena. Kampanje započete prije revizije 4 nastavljaju po starom, da se sačuvana partija ne bi odigrala drugačije nego što je igrana.

## Šta se sada vidi

Pravilo se ranije nije vidjelo na listu lika, pa je višak izgledao kao greška.

- Žetoni iznad kapaciteta imaju isprekidan rub, a uz brojku stoji „+n”. Opis kaže: „n above capacity: gained, and lost when the combat ends”.
- List u borbi to isto piše za zdravlje, kao što je već pisao za energiju. Za Sacrifice piše da zdravlje odlazi na kraju runde.

## Šta nije mijenjano

- Nijedna karta nije promijenila učinak. Lista od 10 gain i 24 regain karte je sada zapisana u testu, pa će svaka buduća izmjena podataka koja pomjeri kartu iz jedne grupe u drugu oboriti test.
- Gain izvan borbe (talenti koji podižu kapacitet) nema višak koji bi se gubio.

## Provjera

`tests/gain-regain.test.ts` (11 testova): odštampana riječ za svaku kartu, Charge dvije runde zaredom, Bloodrage, Arcane Intellect, Icicle Rod koji staje na kapacitetu, skidanje viška svim učesnicima na kraju borbe, Ice Block pod revizijom 4 i pod revizijom 3. Oznaka žetona: `tests/resource-tokens.test.tsx` i `tests/combat-readiness.test.ts`.

Brojke cijelog prolaza su u [TABLE-PACE-2026-11-12.md](TABLE-PACE-2026-11-12.md#provjera).
