# Provjera karata, sposobnosti i frakcijskih poteza · 28. 9. 2026.

Provjera je pronašla i ispravila sedam problema u aktivnoj kampanji `src/rules`. Svih 52 event karata, 108 klasnih moći i 108 talenata uključeno je u nove regresijske provjere. Postojeći testovi prije izmjena prolazili su 323/323; prošireni skup prolazi **823/823**.

## Ispravke

| Problem | Ispravljeno ponašanje |
| --- | --- |
| Soul Taint je uvijek zaokruživao gubitak zdravlja naviše | Bez Spread the Plague zaokružuje naniže: 5 HP → 3 HP, a 1 HP ostaje 1 HP. Uz kugu zaokružuje naviše: 5 HP → 2 HP. Ispravljen je i tekst u interfejsu. |
| Inner Focus nije imao ponuđenu besplatnu aktivaciju | Igrač i AI mogu izabrati instant moć bez troška energije, čak i sa 0 energije, jednom po borbi. |
| Holy Specialization nije nudio dodatnu metu | Uz Lesser Heal / Greater Heal može se izabrati drugi prijateljski učesnik za dodatna 2 HP. Njegovo ime je prikazano u izboru. |
| Nature’s Swiftness je zanemarivao Hood of Shadow | Healing Wave može se opremiti i u dodatni osmi instant slot. |
| Opremanje preko sposobnosti moglo je duplirati istu moć | Engine odbija postavljanje iste fizičke karte u drugi slot. |
| Foul Plaguewinds je ostajao nakon premještanja posljednje plave grupe | The Beasts of Lordaeron sada uklanja Plaguewinds čim više nema plavih stvorenja u Plaguelands oblastima, prije naredne karte u bonus lancu. |
| Subterfuge je davao izbor zamjene pobjednicima | Nagradu uzimaju pobjednici, a novi quest bira originalna frakcija. Isto vlasništvo odluke koriste lokalni igrači i AI. |

Soul Taint je provjeren i na originalnom lokalnom skenu `Event Cards/Layer 10.png`. Za ostale relevantne tekstove korišteni su lokalni skenovi/prijepisi iz [manifesta izvora](sources/base-scans-manifest.json), [službeni pravilnik](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/wowrules.pdf) i [FAQ 1.4](https://images-cdn.fantasyflightgames.com/ffg_content/WoWBG/WoW_FAQ__v1_4.pdf).

## Jedan potez, jedna frakcija

Postojeća provjera u engineu već ograničava obične akcije na aktivnu frakciju. Novi testovi prolaze cijelih 30 poteza s četiri i šest likova: **Horda → Alijansa → Horda → Alijansa**, po 15 poteza svakoj frakciji.

Svaki junak aktivne frakcije koristi dvije akcije; redoslijed među njenim junacima je slobodan. Zatim svi potvrđuju opremu. Ako traka pokrene događaj, prvo se dovrše njegove odluke, aukcije i bonus lanac, pa druga frakcija preuzima obične akcije. Dnevnik sada izričito bilježi početak svakog frakcijskog poteza.

Provjere odbijaju akcije i preparatorne magije neaktivne frakcije, prerano završavanje akcija, treću akciju istog junaka i prekid neposredne akcije nakon Portal / Ritual of Summoning / Lay on Hands. Ratne nagrade, izbor talenta i kraj event lanca ne daju dodatni potez. Varijanta Defeat the Overlord pravilno prelazi iz 30. poteza u novi krug, opet s Hordom.

Odbrana u PvP borbi i izričite odluke event karata mogu uključivati protivničku frakciju. To su dijelovi te borbe ili događaja; ne troše novi frakcijski potez i ne dopuštaju protivniku obične akcije.

## Pokrivenost

| Provjere | Obuhvat |
| --- | --- |
| [Eventi i potezi](../tests/event-turn-audit.test.ts) | Svaka od 52 karte kroz završetak managementa i predaju poteza; stvarne kupovine, prodaje, oporavak, retrening, putovanje, nagrade, kuga, Subterfuge, svih sedam event bossova i dvije pune trake od 30 poteza. |
| [Klasne karte](../tests/class-card-audit.test.ts) | Učenje i legalno opremanje svih 108 moći; izbor svih 108 talenata; izvršavanje 136 grupa ili uslovnih varijanti izbornih sposobnosti; 42 numeričke provjere pasivnih učinaka; akcijske magije, ponavljanje, popusti, kombinacije i limiti. |
| [Kontrole sposobnosti](../tests/ability-choices-ui.test.tsx) | React kontrole za besplatni Inner Focus i imenovanje/izbor dodatne mete Holy Specialization; provjera stvarno poslane naredbe. |

Za efekte s više mogućih brojeva kockica ili tokena provjerena je reprezentativna legalna veličina i ograničenje upotrebe. Ovo pokriva katalog i konkretne kombinacije navedene u testovima, a nije iscrpna provjera svih mogućih kombinacija karata, bacanja i rasporeda učesnika.

## Završene partije i ponavljanje zapisa

| Postava | Seed | Naredbe | Završetak | Ponavljanje |
| --- | --- | ---: | --- | --- |
| Kel’Thuzad, zadana postava | 2005 | 1.385 | Horda, završni PvP u potezu 30 | Identično |
| Nefarian, casters | 71 | 1.064 | Remi, prisilni završetak u potezu 25 | Identično |
| Kazzak, casters | 99 | 1.484 | Horda, završni PvP u potezu 30 | Identično |
| Ranije sačuvana ručna 2v2 partija | 3374075278 | 684 | Horda, Kel’Thuzad u potezu 25 | Identično |

Tri AI partije prošle su 3.933 naredbe uz provjere resursa i determinističkog replaya. Ranija [2v2 partija](FULL-GAME-FLOW-2V2.md) uspješno prolazi strogi import i audit svih 685 stanja.

`npm run build` prolazi, uključujući TypeScript provjeru aplikacije, testova i servera. `npm run check:render` uspješno prikazuje 621 komponentu bez `undefined` ili `NaN` teksta. Provjera interfejsa u ovom prolazu koristi React testove i serversko renderovanje; nije odigrana nova ručna partija u browseru. Izmjene su lokalne i nisu objavljene na produkciju.

Reprodukcija:

```sh
npm test
npm run build
npm run check:render
npm run simulate -- 2005 kelthuzad
npm run simulate -- 71 nefarian casters
npm run simulate -- 99 kazzak casters
npx tsx scripts/audit-session.ts docs/playtests/horde-2v2-2026-09-28.session.json .local-data/event-turn-audit-replay.json
```
