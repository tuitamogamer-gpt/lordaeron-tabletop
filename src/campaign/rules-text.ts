import type { Card, Condition, DiceFilter, Effect } from '../rules/model';
import { BASE_PACK } from '../data/base';
const names=new Map(BASE_PACK.cards.map(c=>[c.id,c.name]));
const readable=(text:string)=>text.replace(/\b[a-z]+(?:-[a-z0-9]+)+\b/g,id=>names.get(id)??id);
export const colorName={red:'crvena',blue:'plava',green:'zelena'};
export const boxName={damage:'daljinski pogoci',defense:'bliski pogoci',attrition:'iscrpljivanje',armor:'oklop'};
export function filterText(f:DiceFilter){return `${f.colors?.map(c=>colorName[c]).join('/')??'bilo koja boja'}${f.values?` · ${f.values.join('/')}`:f.min?` · ${f.min}+`:''}`;}
export const conditionText=(c:Condition):string=>readable(rawConditionText(c));
function rawConditionText(c:Condition):string{
 switch(c.kind){
  case 'previous-use':return `korištena prethodne runde${c.unharmed?', bez izgubljenog zdravlja':''}`;
  case 'equipped':return `opremljena ${c.cardId}`;
  case 'dice':return `najmanje ${c.atLeast} (${filterText(c.filter)})`;
  case 'no-color':return `bez ${colorName[c.color]} kockica`;
  case 'opponents':return `najmanje ${c.min} protivnika`;
  case 'pvp':return 'PvP borba';case 'first-round':return 'prva borbena runda';
  case 'opponent-defeated':return 'preživio si borbu i najmanje jedan protivnik je poražen';
  case 'trait':return `opremljeno: ${c.traits.join(' / ')}`;case 'has-damage':return 'upravo izgubljeno zdravlje';
  case 'round':return `runda ${c.min} ili kasnije`;case 'strong-enemy':return 'crveno stvorenje, Overlord ili PvP';
  case 'reroll-at-least':return `Reroll vrijednost najmanje ${c.amount}`;
  case 'owned':return `imaš ${c.cardId}`;
  case 'used':return `ove runde korištena ${c.cardId}`;case 'used-any':return `ove runde korištena ${c.cards.join(' / ')}`;
 }
}
export const effectText=(e:Effect):string=>readable(rawEffectText(e));
function rawEffectText(e:Effect):string{
 switch(e.op){
  case 'dice':return `+${e.amount} ${colorName[e.color]} kockica`;
  case 'stat':return `${e.amount>=0?'+':''}${e.amount} ${e.stat==='reroll'?'Reroll':e.stat==='attrition'?'Attrition':e.stat==='armor'?'Armor':'Threat'}`;
  case 'resource':return `${e.amount<0?'Potroši':e.gain?'Dobij':'Oporavi'} ${Math.abs(e.amount)} ${e.resource==='health'?'zdravlja':e.resource==='energy'?'energije':'zlata'}${e.target==='friendly'?' savezniku':''}${e.gain?' (može preko kapaciteta)':''}`;
  case 'spot':return `Spot ${e.count} (${filterText(e.filter)}) → ${e.effects.map(effectText).join('; ')}`;
  case 'remove':return `Ukloni ${e.count} (${filterText(e.filter)}) → ${e.effects.map(effectText).join('; ')}`;
  case 'change':return `Promijeni ${e.count} (${filterText(e.filter)}) → ${e.delta?`vrijednost +${e.delta}, najviše 8`:e.value??'ista vrijednost'}${e.color?`, ${colorName[e.color]}`:''}`;
  case 'discard-self':return 'Odbaci ovu kartu';case 'condition':return `${e.amount>=0?'+':''}${e.amount} ${e.condition}`;
  case 'heal-pet':return `Ljubimac: oporavi ${e.amount} zdravlja`;
  case 'if':return `Ako ${conditionText(e.condition)}: ${e.then.map(effectText).join('; ')}${e.otherwise?`; inače ${e.otherwise.map(effectText).join('; ')}`:''}`;
  case 'token':return `+${e.amount} ${boxName[e.box]}`;
  case 'judgement':return 'Razriješi Judgement opremljenog Seala, bez skidanja Seala';
  case 'prevent':return `Spriječi gubitak ${e.amount} zdravlja`;
  case 'restrict':return `${e.scope==='pool'?'Ne bacaj':'Ne ponavljaj'} ${e.colors.map(c=>colorName[c]).join('/')} kockice`;
  case 'reroll-all':return 'Nezavisno ponovi sve preostale kockice';case 'unequip-self':return 'Skini ovu kartu';
  case 'flag':return e.key==='revenge'?'Svaki tvoj žeton oklopa u ovom koraku daje i 1 iscrpljivanje':e.key==='adrenaline'?'Svaka 2 tvoja daljinska pogotka u ovom koraku oporavljaju 1 energiju':e.key==='ice-barrier'?'Svaki tvoj daljinski pogodak u ovom koraku daje i 1 oklop':'Na kraju daljinskog napada očisti vlastita tri polja pogodaka';
  case 'damage-reserve':return `Potroši ${e.amount} Enrage tokena sačuvanih za izgubljeno zdravlje`;
  case 'damage-all':return `Svaki učesnik borbe gubi ${e.amount} zdravlja`;
  case 'remove-all':return `Ukloni sve (${filterText(e.filter)})`;
  case 'reroll-selected':return `Nezavisno ponovi do ${e.max==='level'?'svog nivoa':e.max} kockica (${filterText(e.filter)})`;
  case 'unequip-choice':return `Skini jednu od moći: ${e.cards.join(' / ')}`;
  case 'defeat-independent':return 'Porazi jedno plavo stvorenje iz ove borbe';
  case 'resource-level':return `${e.gain?'Dobij':'Oporavi'} ${e.resource==='health'?'zdravlje':'energiju'} u iznosu svog nivoa`;
  case 'clamp':return `Izgubi ${e.resource==='health'?'zdravlje':'energiju'} preko kapaciteta`;
  case 'remove-chosen':return `Ukloni ${e.count} drugih neiskorištenih kockica po izboru`;
  case 'dice-choice':return `Baci ${e.amount} novih kockica odabranih boja`;
  case 'move-tokens':return `Premjesti ${e.amount}: ${boxName[e.from]} → ${boxName[e.to]}`;
  case 'opponent-tokens':return `+${e.amount} ${boxName[e.box]} po protivniku`;
  case 'equip-demon':return 'Ako nemaš opremljenog Demona, opremi naučenog Demona u odabrano mjesto';
  case 'group-resource':return `Svi prijateljski učesnici ${e.gain?'dobiju':'oporave'} ${e.amount} ${e.resource==='health'?'zdravlja':'energije'}`;
  case 'group-dice':return `+${e.amount} ${colorName[e.color]} kockica po prijateljskom učesniku`;
  case 'creature-dice':return `Dodaj ${colorName[e.color]} kockice: Attack odabranog stvorenja / ${e.divisor}, zaokruženo dolje`;
  case 'active-effects':return `Aktivni saveznik: ${e.effects.map(effectText).join('; ')}`;
  case 'heal-reaction':return `Saveznik koji je upravo izgubio zdravlje oporavlja do ${e.amount} zdravlja`;
  case 'revive':return `${e.self?'Ti':'Poraženi saveznik'} ostaje u regiji i oporavlja ${e.amount==='level'?'tvoj nivo':e.amount} zdravlja/energije po izboru. I dalje se računa kao poražen.`;
  case 'combo-add':return `Postavi ${e.amount} tokena na opremljeni Finishing Move`;
  case 'combo-spend':return `Potroši ${e.amount} combo tokena s ove karte`;
  case 'equip-power':return `Opremi naučenu moć ${e.card}`;
  case 'preset':return `Prije bacanja postavi ${e.color} kockice na ${e.values.join(' i ')}`;
  case 'redirect-hits':return `Do ${e.count} ${colorName[e.color]} kockica koje pogađaju daje ${boxName[e.box]}`;
  case 'sacrifice-pet':return `Skini ljubimca; za svako njegovo preostalo zdravlje dobiješ ${e.multiplier} ${boxName[e.box]}`;
  case 'escape':return 'Napusti PvE borbu i ostani u istoj regiji';
 }
}
export function staticCardText(c:Card):string[]{
 const result:string[]=[];
 if(c.powerDiscount)result.push(`Sve tvoje moći koštaju ${c.powerDiscount} energije manje, najmanje 0.`);
 if(c.equipFreeTraits)result.push(`Bez energije za opremanje: ${c.equipFreeTraits.join(', ')}.`);
 if(c.retainOnce)result.push(`Pri prvoj upotrebi u borbi zadrži: ${c.retainOnce.join(', ')}.`);
 if(c.actionPower==='lay-on-hands')result.push('Neposredno prije svoje akcije potpuno oporavi zdravlje.');
 if(c.enhance)for(const e of c.enhance)result.push(`${e.card}: ${e.effects.map(effectText).join('; ')} pri svakoj upotrebi.`);
 if(c.petCapacity)result.push(`${c.petCapacity.trait}: kapacitet zdravlja +${c.petCapacity.amount}.`);
 if(c.actionPower==='summon')result.push('Prije svoje akcije premjesti odabranog prijateljskog lika iz bilo koje regije u svoju.');
 if(c.freeInstantOnce)result.push('Jednom po borbi možeš upotrijebiti instant moć bez energije.');
 if(c.instantDiscount)result.push(`Instant moći koštaju ${c.instantDiscount} energije manje, najmanje 0.`);
 if(c.healSplash)result.push(`${c.healSplash.cards.join(', ')} liječe i drugog saveznika za do ${c.healSplash.amount}.`);
 if(c.actionPower==='prayer')result.push('Jedna akcija: svi saveznici u tvojoj regiji potpuno oporave zdravlje. Zatim skini ovu moć.');
 if(c.finisher)result.push('Finishing Move: combo tokeni traju do kraja ove borbe.');
 if(c.spotOverride)result.push(`Za ${c.spotOverride.cards.join(', ')} Spot prag je ${c.spotOverride.min}+.`);
 if(c.comboBonus)result.push(`${c.comboBonus.card} dodaje +${c.comboBonus.amount} combo token.`);
 if(c.comboMultiplier)result.push(`Svako polaganje combo tokena daje ${c.comboMultiplier} puta toliko tokena.`);
 if(c.retainAfterUse)result.push(`Pri upotrebi zadrži: ${c.retainAfterUse.join(', ')}.`);
 if(c.description&&!c.abilities.length)result.push(c.description);
 if(c.cardRepeat)result.push(`${c.cardRepeat.card} možeš upotrijebiti ${c.cardRepeat.uses} puta po rundi.`);
 if(c.discount)result.push(`Energija −${c.discount.amount}: ${c.discount.cards.join(', ')}.`);
 if(c.travelPower)result.push(`Travel: ${c.travelPower.unequip?'skini ovu moć za ':''}+${c.travelPower.extra} regiju.`);
 if(c.capacity?.health)result.push(`Kapacitet zdravlja +${c.capacity.health}`);
 if(c.capacity?.energy)result.push(`Kapacitet energije +${c.capacity.energy}`);
 if(c.travelThroughBlue)result.push(`Tokom putovanja nastavi kroz regije s plavim stvorenjima.${c.leaveBlue?' Možeš i započeti Travel u takvoj regiji.':''}`);
 if(c.travelLimit)result.push(`Najviše ${c.travelLimit} Travel akcija po frakcijskoj smjeni.`);
 if(c.immune)result.push(`Imunitet na posebnu sposobnost: ${c.immune.join(', ')}.`);
 if(c.equipOverride)result.push(`U ${c.equipOverride.slot} mjesto može ${c.equipOverride.traits.join('/')} do nivoa ${c.equipOverride.maxLevel}.`);
 if(c.poolPenalty)result.push(`Prije bacanja ukloni ako možeš: ${Object.entries(c.poolPenalty).map(([c,n])=>`${n} ${c}`).join(', ')}.`);
 if(c.intercept)result.push('Challenge u susjednoj regiji: odmah se premjesti tamo. Možeš napustiti plava stvorenja; saveznici u odredištu mogu se pridružiti.');
 if(c.actionPower==='teleport')result.push('Jedna akcija: potroši X energije i pomjeri se X susjednih regija, bez zaustavljanja pri ulasku među plava stvorenja.');
 if(c.actionPower==='portal')result.push('Neposredno prije svoje akcije: ti i odabrani saveznici iz iste regije vratite se u početnu regiju frakcije.');
 if(c.instantRepeat)result.push(`Instant moći možeš koristiti ${c.instantRepeat.uses} puta po rundi; ponovna upotreba košta +${c.instantRepeat.surcharge} energije.`);
 for(const a of c.aura??[])result.push(`Svi prijateljski učesnici: ${a.effects.map(effectText).join('; ')}${a.condition?` ako ${conditionText(a.condition)}`:''}.`);
 if(c.bagExempt)result.push('Ne zauzima mjesto u torbi.');if(c.trait==='Scroll'||c.trait==='Potion')result.push(`Najviše jedan ${c.trait} po borbenoj rundi.`);
 if(c.travelEnergy)result.push(`Poslije Travel akcije oporavi ${c.travelEnergy} energije.`);
 if(c.extraInstantSlot)result.push('Dobijaš dodatno mjesto za Instant moć. Predmet se gubi pri porazu.');
 return result.map(readable);
}
