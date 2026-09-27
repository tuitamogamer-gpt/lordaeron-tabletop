import { BASE_PACK as p } from '../data/base';
import type { EventCard, Overlord, Reward } from '../rules/model';
export const deckSymbol:Record<string,string>={triangle:'△',square:'□',circle:'○',special:'✦'};
export const regionName=(id:string)=>p.regions.find(r=>r.id===id)?.name??id;
export const rewardText=(r:Reward)=>[`${r.gold} zlata`,`${r.xp} XP`,...r.items.map(i=>`${i.draw} ${deckSymbol[i.deck]}`),...(r.special??[]).map(id=>p.cards.find(c=>c.id===id)?.name??id)].join(' · ');
export const bossRules:Record<string,string>={
 kazzak:'Reroll −1. Na kraju koraka pogodaka izgubi 1 zdravlje i smanji Attrition za 1 za svaku crvenu/plavu jedinicu ili dvojku. Samo jedan od pet skrivenih tragova je pravi Kazzak.',
 nefarian:'Attrition vrijednost se prepolovi, zaokruženo gore. Broj daljinskih i bliskih pogodaka ograničen je brojem crvenih/plavih osmica; višak ide u iscrpljivanje. Sudbina pomjera Nefariana prema Bulwarku. Dolazak odmah pokreće završne borbe.',
 kelthuzad:'Poslije rerolla izgubi 2 zdravlja za svaku crvenu/plavu jedinicu ili dvojku. Attrition je ograničen brojem neiskorištenih crvenih/plavih 6+ rezultata koje Spot označi. Ako preživi razrješenje, ukloni 4/6 daljinskih pogodaka (4/6 likova).',
 dungin:'Na kraju borbene runde ukloni 4 daljinska pogotka.',
 zaeldarr:'Na kraju borbene runde ukloni 2 daljinska pogotka. Pri izvlačenju svaki lik predaje jedan predmet iz torbe; pobjednici dijele te predmete.',
 spilskin:'Prije razrješenja ukloni sve žetone iscrpljivanja.',
 spectral:'Na kraju borbene runde svaki učesnik dobija 2 Stun žetona. Pri izvlačenju svaki lik ostavlja polovinu zlata, zaokruženo dolje; pobjednici dijele zalihu.',
 daecris:'Na kraju borbene runde svaki učesnik dobija 1 Stun; ukloni 3 daljinska pogotka po učesniku.',
 cauldrons:'Poslije rerolla ukloni 1 daljinski pogodak za svaku jedinicu. Svaka frakcija ima samo jedan pokušaj. Pobjeda daje žetone koji poništavaju Kel’Thuzadov dodatni napad +4.',
 boregore:'Na početku borbene runde ukloni 2 daljinska pogotka. Jedan pobjednik uzima Light of Ages: +4 daljinska pogotka na početku borbe s Kel’Thuzadom.',
};
export function overlordText(o:Overlord){return bossRules[o.combat]??'';}
export function eventText(e:EventCard):string{
 if(e.boss)return `${regionName(e.boss.region)} · ${bossRules[e.boss.combat]} Nagrada jačoj frakciji: ${rewardText(e.boss.strong)}. Slabijoj: ${rewardText(e.boss.weak)}.`;
 const descriptions:Record<string,string>={
  hatreds:'Prva frakcija koja pobijedi u PvP-u dobija nagradu za svakog pobjedničkog učesnika: jača 8 zlata i 1 XP; slabija 4 zlata i 2 XP.',
  professions:'Svaki lik bira: zlato u iznosu svog nivoa ili isti broj zdravlja i energije, raspoređen po izboru.',
  horizons:'Svaka frakcija može zamijeniti jedan svoj quest novim zelenim, žutim ili crvenim. Plava stvorenja odbačenog questa ostaju na mapi.',
  zeppelin:'Od najmanjeg ukupnog XP-a: svaki lik može otputovati do prijateljske letne tačke bez protivničkih likova.',
  merchants:'Od najmanjeg ukupnog XP-a: svaki lik može kupiti jedan predmet po polovini cijene, zaokruženo gore.',
  beasts:'Frakcije naizmjenično pomjeraju po dvije različite grupe plavih stvorenja do dvije susjedne regije. Grupa ne smije završiti kod protivničkog lika ili iste vrste plavih stvorenja.',
  retrain:'Svaki lik bira: zamijeni svoje talente talentima istog ili nižeg nivoa, ili uzmi dvostruki nivo u zlatu.',
  subterfuge:'Frakcije mogu napadati stvorenja protivničkih questova. Nagrada daje 1 XP manje; zamjenski quest pripada izvornoj frakciji.',
  bounty:'Označen je po jedan nasumični lik iz obje frakcije. Kada prvi označeni lik bude poražen, svaki lik suprotne frakcije dobija 3 XP.',
  sell:'Od najmanjeg ukupnog XP-a: svaki lik može prodati jedan predmet iz torbe za polovinu cijene, zaokruženo dolje.',
  ears:'Do sljedećeg izvlačenja događaja, poražena plava stvorenja daju 1 XP i polovinu svog napada u zlatu, zaokruženo dolje. Nagrada se dijeli.',
  cleanse:'Skupljaj poražena plava stvorenja. Prva frakcija s ukupnim napadom trofeja 10 ili više daje svakom svom liku 4 zlata i 2 XP.',
  winds:'Travel kroz Western i Eastern Plaguelands troši 1 dodatnu energiju. Plava stvorenja u tim zonama daju 2 XP. Događaj prestaje kada tamo nema plavih stvorenja.',
  'soul-taint':'Likovi do četiri regije od Kel’Thuzada gube polovinu zdravlja, zaokruženo gore; uz Spread the Plague domet je osam regija.',
  plague:'Postavi kugu u Marris Stead, Hearthglen i Andorhal. Čudovišta u pogođenim zonama imaju +2 napada. Poslije svoje akcije možeš potrošiti 3 energije za čišćenje žetona i 1 XP.',
  'arcane-corruption':'Likovi gube polovinu energije: zaokruženo dolje, ili gore ako je Spread the Plague aktivan.',
  auction:'Svaki lik daje jednu tajnu ponudu. Najviša ponuda osvaja predmet; izjednačenja se rješavaju bacanjem. Predmet se gubi pri porazu.',
 };
 if(e.script==='war'){const war=e.effects.find(a=>a.op==='war');if(war?.op==='war')return `Zauzmi ${war.regions.map(regionName).join(' i ')} te ih zadrži do kraja protivničke smjene. Svaki lik pobjedničke frakcije dobija ${rewardText(war.reward)}; slabija frakcija ${rewardText(war.weakReward??war.reward)}.`;}
 return descriptions[e.script??'']??e.effects.map(a=>a.op==='gold'?`${a.amount} zlata`:a.op==='merchant'?`${a.count} novih predmeta`:'').join(' · ');
}
