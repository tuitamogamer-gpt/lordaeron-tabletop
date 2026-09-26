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
export type Timing = 'pool' | 'after-pool' | 'reroll' | 'after-reroll' | 'tokens' | 'defense' | 'wound' | 'round-end' | 'action' | 'equip';
export interface DiceFilter { colors?: Color[]; values?: number[]; min?: number; }
export type Condition =
 | { kind: 'previous-use'; cardId?: string; unharmed?: boolean }
 | { kind: 'equipped'; cardId: string }
 | { kind: 'dice'; filter: DiceFilter; atLeast: number }
 | { kind: 'no-color'; color: Color }
 | { kind: 'pvp' };
export type Effect =
 | { op: 'dice'; color: Color; amount: number }
 | { op: 'resource'; resource: 'health' | 'energy' | 'gold'; amount: number; gain?: boolean; target?: 'self' | 'friendly' | 'pet' }
 | { op: 'stat'; stat: 'reroll' | 'attrition' | 'armor' | 'threat'; amount: number }
 | { op: 'token'; box: 'damage' | 'defense' | 'attrition' | 'armor'; amount: number }
 | { op: 'change'; color?: Color; value: number; filter: DiceFilter; count: number }
 | { op: 'spot'; filter: DiceFilter; count: number; effects: Effect[] }
 | { op: 'remove'; filter: DiceFilter; count: number; effects: Effect[] }
 | { op: 'if'; condition: Condition; then: Effect[]; otherwise?: Effect[] }
 | { op: 'condition'; condition: 'curse' | 'stun'; amount: number; target?: 'self' | 'friendly' }
 | { op: 'discard-self' }
 | { op: 'heal-pet'; amount: number };
export interface Ability { id: string; timing: Timing; effects: Effect[]; cost?: number; requires?: string; }
export interface Card { id: string; name: string; kind: 'power' | 'talent' | 'item' | 'racial'; type: SlotType; level: number; price: number; energy: number; trait?: string; functionTrait?: string; addon?: boolean; unique?: string; soulbound?: boolean; bagExempt?: boolean; printed?: boolean; classId?: ClassId; deck?: ItemDeck; petHealth?: number; abilities: Ability[]; description: string; image?: string; source: Source; }
export type CreatureRule = 'murloc' | 'gnoll' | 'ghoul' | 'crusader' | 'naga' | 'spider' | 'worgen' | 'wildkin' | 'ogre' | 'wraith' | 'doomguard' | 'drake' | 'infernal' | 'none';
export interface Creature { id: string; name: string; rule: CreatureRule; stats: Record<Color, { threat: number; attack: number; health: number }>; stock: Pool; description: string; image: string; source: Source; }
export interface Spawn { creature: string; color: Color; region: string; count: number; }
export interface Reward { xp: number; gold: number; items: { deck: ItemDeck; draw: number }[]; special?: string[]; }
export interface Quest { id: string; name: string; faction: Faction; tier: Tier; level: number; spawns: Spawn[]; reward: Reward; source: Source; }
export type EventEffect =
 | { op: 'gold'; amount: number; faction: 'all' | 'stronger' | 'weaker' }
 | { op: 'merchant'; deck: ItemDeck; count: number }
 | { op: 'spawn'; spawns: Spawn[] }
 | { op: 'war'; regions: [string, string]; reward: Reward }
 | { op: 'auction'; item: string }
 | { op: 'overlord'; attack?: number; health?: number; threat?: number };
export interface EventCard { id: string; name: string; fate: 0 | 1 | 2; bonus: boolean; effects: EventEffect[]; overlord?: string; source: Source; }
export interface Overlord { id: string; name: string; region: string; stats: Record<4 | 6, { threat: number; attack: number; health: number }>; combat: 'none' | 'nefarian' | 'kelthuzad' | 'kazzak'; route?: string[]; source: Source; }
export interface ContentPack { id: string; name: string; officialComplete: boolean; regions: Region[]; characters: Character[]; cards: Card[]; creatures: Creature[]; quests: Quest[]; events: EventCard[]; overlords: Overlord[]; xp: number[]; track: Record<number, 'event' | ItemDeck>; }
export interface Equipped { card?: string; addons: string[]; }
export interface Hero { id: string; location: string; health: number; energy: number; gold: number; level: number; xp: number; actions: number; curse: number; stun: number; learned: string[]; talents: string[]; bag: string[]; slots: Equipped[]; pets: Record<string, number>; auctionItems: string[]; talentChoices: number[]; }
export interface Enemy { id: string; creature: string; color: Color; region: string; quest?: string; faction?: Faction; }
export interface Die { id: number; color: Color; value: number; rerolled: boolean; spotted: boolean; removed: boolean; }
export interface Boxes { damage: number; defense: number; armor: number; attrition: number; }
export interface Attack { heroId: string; dice: Die[]; pool: Pool; removed: Pool; reroll: number; attrition: number; armor: number; threat: number; used: string[]; paid: string[]; woundStart: number; }
export type BattleStage = 'attacker' | 'pool' | 'penalty' | 'after-pool' | 'reroll' | 'after-reroll' | 'tokens' | 'defense' | 'wounds' | 'resolution' | 'round-end' | 'over';
export interface Battle { kind: 'pve' | 'pvp' | 'final'; region: string; participants: string[]; defeated: string[]; enemies: string[]; boss?: string; round: number; stage: BattleStage; first: Faction; nextFaction: Faction; acted: string[]; active?: Attack; boxes: Record<Faction, Boxes>; lostDice: Pool; previous: Record<string, { cards: string[]; harmed: boolean }>; current: Record<string, { cards: string[]; harmed: boolean }>; wounds: Record<Faction, number>; afterWounds?: 'resolution' | 'round-end'; armorDone: Faction[]; winner?: Faction | 'draw'; report: string[]; }
export interface RewardState { faction: Faction; quest?: string; eligible: string[]; items: { deck: ItemDeck; draw: number }[]; special: string[]; offered: string[]; offeredDeck?: ItemDeck; replacement: boolean; }
export interface War { id: string; regions: [string, string]; reward: Reward; }
export interface Auction { event: string; item: string; bids: Record<string, number>; }
export interface Log { id: number; turn: number; text: string; }
export interface State { version: 2; pack: string; revision: number; rng: number; phase: 'actions' | 'management' | 'combat' | 'reward' | 'event' | 'final-management' | 'finished'; turn: number; faction: Faction; heroes: Hero[]; enemies: Enemy[]; quests: string[]; completed: string[]; questDecks: Record<Faction, Record<Tier, string[]>>; itemDecks: Record<ItemDeck, string[]>; merchant: string[]; eventDeck: string[]; eventDiscard: string[]; eventSeen: string[]; wars: War[]; auction?: Auction; overlord: { id: string; region: string; attack: number; health: number; threat: number }; battle?: Battle; reward?: RewardState; tradeWindow: boolean; finalReady: string[]; managed: string[]; respawns: string[]; winner?: Faction | 'draw'; log: Log[]; }
export interface Setup { seed: number; roster: string[]; overlord: string; }
export interface AbilityArgs { dice?: number[]; target?: string; color?: Color; }
export type TownOperation = { op: 'buy'; card: string; discard?: string } | { op: 'sell'; card: string } | { op: 'train'; card: string };
export type Command =
 | { type: 'travel'; hero: string; path: string[] }
 | { type: 'rest'; hero: string; health: number }
 | { type: 'train'; hero: string; cards: string[] }
 | { type: 'town'; hero: string; health: number; operations: TownOperation[] }
 | { type: 'challenge'; hero: string; target: string; allies: string[] }
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
