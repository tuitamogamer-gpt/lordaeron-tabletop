/** Base game, 2005 + FAQ 1.4. Data and rules are intentionally independent of rendering. */
export type Faction = 'horde' | 'alliance';
export type ClassId = 'warrior' | 'mage' | 'hunter' | 'druid' | 'paladin' | 'priest' | 'rogue' | 'shaman' | 'warlock';
export type Color = 'red' | 'blue' | 'green';
export type Pool = Record<Color, number>;
export type Tier = 'grey' | 'green' | 'yellow' | 'red';
export type ItemDeck = 'triangle' | 'square' | 'circle' | 'special';
export type SlotType = 'melee' | 'ranged' | 'armor' | 'instant' | 'active' | 'general' | 'bag';
export interface Source { url: string; reference: string; status: 'verified' | 'community' | 'fixture'; }
export interface Region { id: string; name: string; zone: string; x: number; y: number; neighbors: string[]; town?: Faction | 'both'; flight?: Faction | 'both'; graveyard?: boolean; home?: Faction; }
export interface Slot { types: SlotType[]; traits: string[]; stanceOnly?: boolean; printed?: string; }
export interface Character { id: string; name: string; faction: Faction; classId: ClassId; portrait: number; race: string; capacities: { health: number; energy: number }[]; slots: Slot[]; racial?: string; source: Source; }
export type Timing = 'pool' | 'after-pool' | 'reroll' | 'after-reroll' | 'tokens' | 'defense' | 'wound' | 'round-end' | 'action' | 'equip' | 'turn-start' | 'combat-end' | 'round-start' | 'energy-spent' | 'rest' | 'learn' | 'after-tokens';
export interface DiceFilter { colors?: Color[]; values?: number[]; min?: number; }
export type Condition =
 | { kind: 'previous-use'; cardId?: string; unharmed?: boolean }
 | { kind: 'equipped'; cardId: string }
 | { kind: 'dice'; filter: DiceFilter; atLeast: number }
 | { kind: 'no-color'; color: Color }
 | { kind: 'opponents'; min:number }
 | { kind: 'pvp' }
 | { kind: 'first-round' }
 | { kind: 'reroll-at-least'; amount:number }
 | { kind: 'owned'; cardId:string }
 | { kind: 'used'; cardId: string }
 | { kind: 'used-any'; cards: string[] }
 | { kind: 'opponent-defeated' }
 | { kind: 'trait'; traits: string[] }
 | { kind: 'has-damage' }
 | { kind: 'round'; min: number }
 | { kind: 'strong-enemy' };
export type Effect =
 | { op: 'dice'; color: Color; amount: number }
 | { op: 'resource'; resource: 'health' | 'energy' | 'gold'; amount: number; gain?: boolean; target?: 'self' | 'friendly' | 'pet' }
 | { op: 'stat'; stat: 'reroll' | 'attrition' | 'armor' | 'threat'; amount: number }
 | { op: 'token'; box: 'damage' | 'defense' | 'attrition' | 'armor'; amount: number }
 | { op: 'change'; repeat?:boolean; delta?: number; color?: Color; value?: number; filter: DiceFilter; count: number }
 | { op: 'spot'; filter: DiceFilter; count: number; effects: Effect[] }
 | { op: 'remove'; filter: DiceFilter; count: number; effects: Effect[] }
 | { op: 'if'; condition: Condition; then: Effect[]; otherwise?: Effect[] }
 | { op: 'condition'; condition: 'curse' | 'stun'; amount: number; target?: 'self' | 'friendly' }
 | { op: 'discard-self' }
 | { op: 'heal-pet'; amount: number }
 | { op: 'judgement' }
 | { op: 'prevent'; amount: number }
 | { op: 'restrict'; limit?:number; scope: 'pool' | 'reroll'; colors: Color[] }
 | { op: 'reroll-all' }
 | { op: 'unequip-self' }
 | { op: 'flag'; key: string; amount: number }
 | { op: 'damage-reserve'; scope?:'defense'; amount: number }
 | { op: 'damage-all'; amount: number }
 | { op: 'remove-all'; filter: DiceFilter }
 | { op: 'reroll-selected'; filter: DiceFilter; max: number | 'level' }
 | { op: 'unequip-choice'; cards: string[] }
 | { op: 'defeat-independent' }
 | { op:'combo-add'; amount:number }
 | { op:'combo-spend'; amount:number }
 | { op:'equip-power'; card:string; slot?:number }
 | {op:'group-resource';resource:'health'|'energy';amount:number;gain?:boolean}
 | {op:'group-dice';color:Color;amount:number}
 | {op:'creature-dice';color:Color;divisor:number}
 | {op:'active-effects';effects:Effect[]}
 | {op:'heal-reaction';amount:number}
 | {op:'revive';self:boolean;amount:number|'level';fixedHealth?:number}
 | {op:'resource-level';resource:'health'|'energy';gain?:boolean}
 | {op:'clamp';resource:'health'|'energy'}
 | {op:'equip-demon'}
 | {op:'remove-chosen';count:number}
 | {op:'dice-choice';amount:number}
 | {op:'move-tokens';from:keyof Boxes;to:keyof Boxes;amount:number}
 | {op:'opponent-tokens';box:keyof Boxes;amount:number}
 | { op: 'escape' }
 | { op:'preset'; color:Color; values:number[] }
 | { op:'redirect-hits'; color:Color; box:'damage'|'defense'; count:number }
 | { op:'sacrifice-pet'; box:'damage'|'defense'|'attrition'; multiplier:number };
export interface Ability { perAttacker?:boolean; reaction?:'friendly-damage'|'defeat'; startOnly?:boolean; friendlyTiming?: boolean; freeIf?: Condition; id: string; timing: Timing; effects: Effect[]; cost?: number; usageGroup?: string; requires?: string; automatic?: boolean; condition?: Condition; judgement?: boolean; }
export interface Card { travelEnergy?:number;extraInstantSlot?:boolean; retainOnce?:string[]; leaveBlue?:boolean;powerDiscount?:number;equipFreeTraits?:string[]; enhance?:{card:string;timing:Timing;effects:Effect[]}[];petCapacity?:{trait:string;amount:number}; healSplash?:{cards:string[];amount:number};freeInstantOnce?:boolean;instantDiscount?:number; finisher?:boolean;comboBonus?:{card:string;amount:number};comboMultiplier?:number;spotOverride?:{cards:string[];min:number};retainAfterUse?:string[]; cardRepeat?: {card:string;uses:number};discount?:{cards:string[];amount:number};travelPower?:{extra:number;unequip:boolean;oncePerTurn?:boolean};
 equipOverride?: {slot:SlotType;traits:string[];maxLevel:number};
 aura?: {timing:Timing;effects:Effect[];condition?:Condition}[];
 poolPenalty?: Partial<Pool>; intercept?: boolean;
 actionPower?: 'teleport'|'portal'|'prayer'|'summon'|'lay-on-hands'; instantRepeat?: {uses:number;surcharge:number}; travelLimit?: number; immune?: CreatureRule[]; capacity?: { health?: number; energy?: number }; travelThroughBlue?: boolean; id: string; name: string; kind: 'power' | 'talent' | 'item' | 'racial'; type: SlotType; level: number; price: number; energy: number; trait?: string; functionTrait?: string; addon?: boolean; unique?: string; soulbound?: boolean; bagExempt?: boolean; printed?: boolean; classId?: ClassId; deck?: ItemDeck; petHealth?: number; abilities: Ability[]; description: string; image?: string; source: Source; }
export type CreatureRule = 'murloc' | 'gnoll' | 'ghoul' | 'crusader' | 'naga' | 'spider' | 'worgen' | 'wildkin' | 'ogre' | 'wraith' | 'doomguard' | 'drake' | 'infernal' | 'none';
export interface Creature { id: string; name: string; rule: CreatureRule; stats: Record<Color, { threat: number; attack: number; health: number }>; stock: Pool; description: string; image: string; source: Source; }
export interface Spawn { creature: string; color: Color; region: string; count: number; }
export interface Reward { xp: number; gold: number; items: { deck: ItemDeck; draw: number }[]; special?: string[]; }
export interface Quest { id: string; name: string; faction: Faction; tier: Tier; level: number; spawns: Spawn[]; reward: Reward; source: Source; }
export type EventEffect =
 | { op: 'gold'; amount: number; faction: 'all' | 'stronger' | 'weaker' }
 | { op: 'merchant'; deck: ItemDeck; count: number }
 | { op: 'spawn'; spawns: Spawn[] }
 | { op: 'war'; regions: [string, string]; reward: Reward; weakReward?:Reward;perHero?:boolean }
 | { op: 'auction'; item: string }
 | { op: 'overlord'; attack?: number; health?: number; threat?: number };
export interface EventCard { script?:EventScript;boss?:EventBoss; id: string; name: string; fate: 0 | 1 | 2; bonus: boolean; effects: EventEffect[]; overlord?: string; source: Source; }
export interface Overlord { id: string; name: string; region: string; stats: Record<4 | 6, { threat: number; attack: number; health: number }>; combat: 'none' | 'nefarian' | 'kelthuzad' | 'kazzak'; route?: string[]; source: Source; }
export interface ContentPack { id: string; name: string; officialComplete: boolean; regions: Region[]; characters: Character[]; cards: Card[]; creatures: Creature[]; quests: Quest[]; events: EventCard[]; overlords: Overlord[]; xp: number[]; track: Record<number, 'event' | ItemDeck>; }
export interface Equipped { card?: string; addons: string[]; }
export interface Hero { id: string; location: string; health: number; energy: number; gold: number; level: number; xp: number; actions: number; curse: number; stun: number; learned: string[]; talents: string[]; bag: string[]; slots: Equipped[]; pets: Record<string, number>; auctionItems: string[]; talentChoices: number[]; }
export interface Enemy { id: string; creature: string; color: Color; region: string; quest?: string; faction?: Faction; }
export interface Die { source?:string; fixed?:boolean; hitBox?:'damage'|'defense'; id: number; color: Color; value: number; rerolled: boolean; spotted: boolean; removed: boolean; }
export interface Boxes { damage: number; defense: number; armor: number; attrition: number; }
export interface Attack { poolLimits?:Partial<Pool>; rerollStarted?:boolean; placed?: Boxes; flags?: Record<string,number>; forbidden?: { pool?: Color[]; reroll?: Color[] }; heroId: string; dice: Die[]; pool: Pool; removed: Pool; reroll: number; attrition: number; armor: number; threat: number; used: string[]; paid: string[]; woundStart: number; }
export interface DamageRecord { defense?:boolean; before: number; amount: number; prevented: number; harmedBefore: boolean; }
export type BattleStage = 'attacker' | 'pool' | 'penalty' | 'after-pool' | 'reroll' | 'after-reroll' | 'tokens' | 'after-tokens' | 'defense' | 'wounds' | 'resolution' | 'round-end' | 'over';
export interface Battle { killed?:Enemy[]; once?:string[];defenseLosses?:Record<string,number>;defenseSpent?:Record<string,number>; counters?:Record<string,number>; damageTaken?: Record<string,number>; damageSpent?: Record<string,number>; losses?: Record<string, DamageRecord>; kind: 'pve' | 'pvp' | 'final'; region: string; participants: string[]; defeated: string[]; enemies: string[]; boss?: string; round: number; stage: BattleStage; first: Faction; nextFaction: Faction; acted: string[]; active?: Attack; boxes: Record<Faction, Boxes>; lostDice: Pool; previous: Record<string, { cards: string[]; harmed: boolean }>; current: Record<string, { cards: string[]; harmed: boolean }>; wounds: Record<Faction, number>; afterWounds?: 'resolution' | 'round-end'; armorDone: Faction[]; winner?: Faction | 'draw'; report: string[]; }
export interface RewardState { replacementFaction?:Faction;extraItems?:string[];relic?:string; faction: Faction; quest?: string; eligible: string[]; items: { deck: ItemDeck; draw: number }[]; special: string[]; offered: string[]; offeredDeck?: ItemDeck; replacement: boolean; }
export interface War { weakReward?:Reward;perHero?:boolean; id: string; regions: [string, string]; reward: Reward; }
export interface Auction { event: string; item: string; bids: Record<string, number>; }
export interface Log { id: number; turn: number; text: string; }
export interface State { factions?:Record<string,Faction>; world?:WorldEvent[];eventFlow?:EventFlow;lastAction?:string;lastActions?:string[];travelPowers?:string[];nefarianFinal?:Faction[];kazzak?:KazzakToken[]; pendingPortal?: string; energySpent?: string[]; travels?: Record<string,number>; turnStarted?: number; version: 2; pack: string; revision: number; rng: number; phase: 'actions' | 'management' | 'combat' | 'reward' | 'event' | 'final-management' | 'finished'; turn: number; faction: Faction; heroes: Hero[]; enemies: Enemy[]; quests: string[]; completed: string[]; questDecks: Record<Faction, Record<Tier, string[]>>; itemDecks: Record<ItemDeck, string[]>; merchant: string[]; eventDeck: string[]; eventDiscard: string[]; eventSeen: string[]; wars: War[]; auction?: Auction; overlord: { id: string; region: string; attack: number; health: number; threat: number }; battle?: Battle; reward?: RewardState; tradeWindow: boolean; finalReady: string[]; managed: string[]; respawns: string[]; winner?: Faction | 'draw'; log: Log[]; }
export interface Setup { seed: number; roster: string[]; overlord: string; }
export interface AbilityArgs { removeDice?:number[]; colors?:Color[]; slot?:number; free?:boolean;secondaryTarget?:string;health?:number; targets?:string[]; discard?: string; dice?: number[]; target?: string; color?: Color; }
export type TownOperation = { op: 'buy'; card: string; discard?: string } | { op: 'sell'; card: string } | { op: 'train'; card: string };
export type Command =
 | {type:'event-choice';hero:string;choice:EventChoiceArgs}
 | {type:'purify';hero:string}
 | {type:'peek';hero:string;region:string}
 | {type:'claim-relic';hero:string}
 | { type: 'travel'; hero: string; path: string[]; power?: string }
 | { type: 'power-action'; hero:string;card:string }
 | { type:'summon';hero:string;target:string }
 | { type: 'portal'; hero: string; allies: string[]; self?:boolean }
 | { type: 'rest'; hero: string; health: number; food?: string }
 | { type: 'train'; hero: string; cards: string[] }
 | { type: 'town'; hero: string; health: number; operations: TownOperation[] }
 | { type: 'challenge'; hero: string; target: string; allies: string[]; region?: string }
 | { type: 'trade'; hero: string; to: string; items: string[]; gold: number; receiveItems: string[]; receiveGold: number }
 | { type: 'endActions' }
 | { type: 'manage'; hero: string; slots: Equipped[]; discard: string[] }
 | { type: 'endManagement' }
 | { type: 'talent'; hero: string; card: string }
 | { type: 'attacker'; hero: string }
 | { type: 'ability'; hero: string; card: string; ability: string; args?: AbilityArgs }
 | { type: 'roll'; omit?: Pool }
 | { type: 'penalty'; dice: number[] }
 | { type: 'reroll'; dice: number[] }
 | { type: 'advance'; targets?: string[] }
 | { type: 'monster'; unequip?: string[] }
 | { type: 'tokens'; toAttrition?: number[] }
 | { type: 'armor'; faction: Faction; damage: number; defense: number }
 | { type: 'wound'; hero: string; pet?: string }
 | { type: 'respawn'; hero: string; region: string }
 | { type: 'reward'; hero: string; card: string; discard?: string }
 | { type: 'quest'; tier: Exclude<Tier, 'grey'> }
 | { type: 'bid'; hero: string; amount: number }
 | { type: 'loot'; hero: string; from: string; card: string; discard?: string }
 | { type: 'closeBattle' };

export type EventScript='hatreds'|'professions'|'horizons'|'zeppelin'|'merchants'|'beasts'|'retrain'|'subterfuge'|'bounty'|'sell'|'ears'|'cleanse'|'winds'|'war'|'boss'|'soul-taint'|'plague'|'arcane-corruption'|'auction';
export interface EventBoss {region:string;stats:{threat:number;attack:number;health:number};combat:'dungin'|'zaeldarr'|'spilskin'|'spectral'|'daecris'|'cauldrons'|'boregore';strong:Reward;weak:Reward;tribute?:'gold'|'item';perFaction?:boolean;relic?:string;}
export interface WorldEvent {cleared?:boolean;id:string;tokens:string[];attempts:Faction[];gold:number;items:string[];trophies:Record<Faction,Enemy[]>;}
export interface EventStep {kind:'professions'|'horizons'|'zeppelin'|'merchants'|'beasts'|'retrain'|'sell'|'tribute'|'nefarian';hero:string;faction?:Faction;}
export interface EventFlow {event:string;steps:EventStep[];started:boolean;moved:string[];}
export interface EventChoiceArgs {mode?:'skip'|'gold'|'recover'|'talents';health?:number;card?:string;discard?:string;region?:string;quest?:string;tier?:Exclude<Tier,'grey'>;enemy?:string;talents?:string[];}
export interface KazzakToken {region:string;real:boolean;known:Faction[];revealed:boolean;}
