# AI protiv Overlorda i automatika · 22. 10. 2026.

Ovaj prolaz popravlja dvije stvari koje su kvarile duže partije s AI-jem: automatika je stajala nakon svakog novog questa, a AI ekipe gotovo nikad nisu napadale Overlorda. Pravila igre nisu mijenjana.

## Automatika i tekst karata

- Uz **Run AI** svaki novi quest otvarao je prozor **A new quest enters play**. Otvoren prozor pauzira automatiku, pa partija bez igrača nije išla dalje. Dok automatika radi, izvlačenje se sada samo najavljuje porukom i oznakom **NEW**. Prikaz ostaje dostupan dugmetom, a bez automatike se otvara sam kao i ranije.
- Crocolisk Steak i Meditation potpuno obnavljaju zdravlje i energiju. Podaci to izražavaju iznosom koji nijedan kapacitet ne dostiže, pa je tekst glasio „Recover 100 health”. Sada piše **Recover all health · Recover all energy**. Ponovo je iscrtan samo tekst pravila na tri odštampane karte. Naslov, ilustracija i podnožje ostali su piksel za piksel isti; korišten je font metrički jednak Arialu.

## Zašto AI nije napadao Overlorda

Duga kampanja protiv Kel’Thuzada, seed **1**, nije završila ni nakon **6.000 naredbi** i tri kruga trake, iako su svi likovi bili na nivou 5. Nijedna strana nije izazvala Overlorda. Mjerenje je pokazalo tri uzroka:

1. Planer je razmatrao samo pet najbližih ciljeva, pa je udaljena jazbina Overlorda često ispadala iz izbora.
2. Procjena borbe je zbrajala **sve jačine** iste moći. Blessing of Protection ima sedam jačina, pa je jedan paladin dobijao oko 20 oklopa po rundi. Slaba ekipa je zato izgledala jaka, a jaka slaba.
3. Procjena je preskakala moći koje djeluju nakon bacanja (Blood Thirst, Purge, Piercing Howl, Elemental Fury), precjenjivala štetu od vlastitih niskih kockica i gledala samo prosječan ishod. Protiv bossa koji se liječi, prosjek nikad ne završava borbu, iako sretnija bacanja to često uspiju.

## Izmjene u AI-ju

- Overlord je uvijek među razmatranim ciljevima, ma koliko bio daleko.
- Grupa jačina vrijedi koliko njena najbolja jačina, nikad zbir svih.
- Moći nakon bacanja broje se po stvarnoj vjerovatnoći: Spot bonus prema šansi da se tražene kockice pojave, instant moći uz cijenu energije koju naplaćuje i engine. Execute je izostavljen jer nosi kaznu.
- Ponovna bacanja idu prvo na opasne strane kockica, pa je procjena štete od niskih kockica realnija.
- Kada prosječan ishod ne dobija borbu, AI računa i šansu za pobjedu iz rasipanja kockica.
- Za bossove se priznaje izmjerenih **1,2×** žetona. U stvarnim borbama ekipe su protiv Overlorda ostvarivale 1,13–1,23× procijenjenih žetona, jer prazne energiju u prvoj rundi i spajaju moći.
- U režimu Defeat the Overlord hitnost raste od drugog kruga trake, kao što u klasičnom režimu raste prema potezu 30.

## Provjera procjene

Ista ekipa nivoa 4–5 odigrala je po 16–20 stvarnih borbi s AI-jem protiv svakog Overlorda. Tabela poredi stvarni udio pobjeda s procjenom AI-ja.

| Ekipa | Stvarno | Stara procjena | Nova procjena |
| --- | --- | --- | --- |
| Kel’Thuzad, Horda, seed 3 | 30% | 0,0002% | 1% |
| Kel’Thuzad, Alliance, seed 3 | 0% | 27% | 19% |
| Kazzak, Horda, seed 22 | 88% | 11% | 60% |
| Kazzak, Alliance, seed 22 | 88% | 10% | 69% |
| Kel’Thuzad, Horda, seed 23 | 69% | 23% | 76% |
| Kel’Thuzad, Alliance, seed 23 | 44% | 2% | 40% |

Prosječna apsolutna greška pala je s 0,46 na 0,18. Prva Kel’Thuzad ekipa i dalje je potcijenjena, a druga precijenjena: kombinacije poput Berserker → Blood Thirst i Enrage ostaju izvan ove heuristike.

## Cijele kampanje

| Kampanja | Stari AI | Novi AI |
| --- | --- | --- |
| Kel’Thuzad, seed 1 | nije završena nakon 6.000 naredbi | Alliance pobjeđuje, 4.645 naredbi |
| Kel’Thuzad, casters, seed 23 | nije završena nakon 2.500 naredbi | Horda pobjeđuje, 3.809 naredbi |
| Kazzak, seed 22 | Alliance, 2.698 naredbi | Alliance, 3.302 naredbe |
| Kazzak, seed 3 | Alliance, 3.145 naredbi | Alliance, 3.142 naredbe |
| Nefarian, seed 2 | remi, 1.501 naredba | Alliance, 1.723 naredbe |
| Nefarian, seed 24 | Horda, 1.820 naredbi | Alliance, 1.772 naredbe |
| Nefarian, casters, seed 21 | remi, 730 naredbi | remi, 844 naredbe |

Poginuli likovi po izazovu pali su sa 0,19–0,35 na 0,04–0,09 u šest kampanja; Nefarian casters ostaje na 0,6 zbog prisilnih završnih borbi. Prosječna odluka traje 21–91 ms, a najsporija 5,6 s, slično ranijim 5,0 s. U browseru planiranje radi u Web Workeru.

## Provjera

| Provjera | Rezultat |
| --- | --- |
| `npm test` | 1.062 testa u 48 datoteka prolaze; 6 novih |
| `npm run build` | TypeScript aplikacije i servera te Vite build prolaze |
| `audit:session`, Kazzak seed 22 | 3.303 provjerena stanja, identičan replay |
| `audit:session`, Kel’Thuzad casters seed 23 | 3.810 provjerenih stanja, identičan replay |
| Chromium 1366×768 | Setup, svi paneli, putovanje, izazov, borba, nagrade i talenti bez grešaka u konzoli |
| Chromium, svih šest likova pod AI-jem | 13 poteza za 10 minuta kroz borbe, nagrade, nove questove, događaje i opremu, bez zastoja |

Testovi u `ai-forecast.test.ts` pokrivaju najbolju jačinu umjesto zbira, kasne moći i njihovu cijenu, stalno razmatranje Overlorda i procjenu sretnih bacanja. `quest-visibility.test.tsx` pokriva najavu questa bez otvaranja prozora.

[Mašinski čitljiv sažetak](playtests/ai-overlord-2026-10-22.json).

## Granice

Pravilnik i FAQ nisu bili dostupni iz ovog okruženja, pa pravila borbe s Overlordom nisu mijenjana ni dodatno provjerena. Faktor 1,2 izmjeren je na dvije ekipe i odnosi se samo na bossove. Procjena ostaje heuristika: AI i dalje može pogrešno procijeniti pojedinačnu ekipu.
