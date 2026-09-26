export type Faction = 'horde' | 'alliance';
export type ClassId = 'warrior' | 'mage' | 'hunter' | 'druid' | 'paladin' | 'priest' | 'rogue' | 'shaman' | 'warlock';
export type DiceColor = 'red' | 'blue' | 'green';
export type Pool = Record<DiceColor, number>;
export type Effect = { op: 'dice'; color: DiceColor; amount: number } | { op: 'armor' | 'attrition' | 'reroll' | 'heal'; amount: number };
export interface Ability { id: string; name: string; classId: ClassId; icon: string; description: string; cost: number; price: number; level: number; effects: Effect[]; color: string; }
export interface HeroDefinition { id: string; name: string; classId: ClassId; race: string; faction: Faction; portrait: number; health: number; energy: number; pool: Pool; color: string; role: string; }
export interface Hero { id: string; location: string; health: number; energy: number; level: number; xp: number; gold: number; actions: number; learned: string[]; equipment: string[]; }
export interface Region { id: string; name: string; zone: string; x: number; y: number; neighbors: string[]; town?: Faction; flight?: Faction; description: string; level: number; }
export interface Enemy { id: string; name: string; region: string; threat: number; attack: number; health: number; count: number; kind: 'quest' | 'independent' | 'boss'; faction?: Faction; xp: number; gold: number; icon: string; }
export interface Quest { id: string; name: string; description: string; faction: Faction; enemyId: string; region: string; xp: number; gold: number; tier: number; }
export interface Item { id: string; name: string; description: string; price: number; level: number; slot: 'weapon' | 'armor' | 'trinket'; effects: Effect[]; icon: string; color: string; }
export interface Die { id: number; color: DiceColor; value: number; heroId: string; rerolled: boolean; }
export interface Battle { enemyId: string; participants: string[]; round: number; stage: 'prepare' | 'rolled' | 'resolved'; dice: Die[]; remaining: number; damage: number; melee: number; armor: number; attrition: number; rerolls: Record<string, number>; used: Record<string, string[]>; report: string[]; outcome?: 'victory' | 'defeat' | 'fled'; }
export interface LogEntry { id: number; turn: number; text: string; kind: 'move' | 'combat' | 'reward' | 'event' | 'system'; }
export interface WorldEvent { title: string; description: string; }
export interface GameState { version: 1; mode: 'lordaeron-prototype'; seed: number; turn: number; faction: Faction; heroes: Hero[]; enemies: Enemy[]; quests: Quest[]; completedQuests: string[]; battle: Battle | null; log: LogEntry[]; event: WorldEvent; status: 'playing' | 'victory' | 'expired'; winner?: Faction; }
export type Command = { type: 'travel'; heroId: string; destination: string } | { type: 'rest'; heroId: string; health: number } | { type: 'train'; heroId: string; abilityIds: string[] } | { type: 'town'; heroId: string; itemId?: string } | { type: 'challenge'; heroId: string; enemyId: string; allies?: string[] } | { type: 'roll'; powers: Record<string, string[]> } | { type: 'reroll'; dieIds: number[] } | { type: 'resolve' } | { type: 'nextRound' } | { type: 'flee' } | { type: 'closeBattle' } | { type: 'endTurn' };
