import { GameIcon } from './campaign/GameIcon';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { BASE_PACK as p, DEFAULT_SETUP } from './data/base';
import { card, character, contentFor, faction } from './rules/common';
import { apply, createGame } from './rules/game';
import { legalActions } from './rules/legal';
import { importSession, MAX_SESSION_SIZE, newSession } from './rules/session';
import { view } from './rules/view';
import type { Command, Setup } from './rules/model';
import { type Difficulty } from './ai/planner';
import { PlannerClient } from './ai/client';
import { botOwns, decisionOwners } from './multiplayer/ownership';
import { Icon, Modal } from './components';
import { TownEditor, EquipmentEditor, TradeEditor } from './campaign/Interactions';
import { GameCard, HeroPortrait, factionLabel, phaseLabel } from './campaign/parts';
import { FactionCrest } from './campaign/Art';
import Tabletop, { type TablePanel } from './campaign/Tabletop';
import BaseCatalog from './campaign/BaseCatalog';
import Chronicle from './campaign/Chronicle';
import RulesGuide from './campaign/RulesGuide';
import ClassDeck from './campaign/ClassDeck';
import WorldDecision from './campaign/WorldDecision';
import RestEditor from './campaign/RestEditor';
import SaveManager from './campaign/SaveManager';
import BuildStamp from './campaign/BuildStamp';
import { audio, SoundControls, SoundToggle, useCombatAudio, useGameAudio } from './campaign/audio';
import { warNews } from './campaign/war-news';
import Stage from './campaign/Stage';
import { actionCue, beats, loadPace, paceFactor, PACES, savePace, type Beat, type Pace } from './campaign/stage';
import { hintCandidates, hintLabel, type Hint } from './campaign/hints';
import CampaignSetup from './campaign/CampaignSetup';
import QuestActivity from './campaign/QuestReveal';
import CampaignSummary from './campaign/CampaignSummary';
import { UNDO_DEPTH, undoable, undoName } from './campaign/undo';
import CharacterSheet, { CardRules, startingHero } from './campaign/CharacterSheet';
import { AUTO_CONTINUE_MS, bookkeepingStep, combatCandidates, COMBAT_STEP_MS, DICE_SETTLE_MS, rollSignature, useCombatPresentation } from './campaign/combat-flow';
import ChallengeDialog from './campaign/ChallengeDialog';
import ChallengeInvite from './campaign/ChallengeInvite';
import { invitedPlayers, inviteKey, jointChallenges, type Challenge } from './campaign/invitations';
import { useTooltips } from './campaign/tooltips';
import { BOT_PATIENCE_MS, botCombatDelay, botsDecide, loadAuto, playerClaims, playerDecides, playerToAct, saveAuto, turnKey, UNDO_GRACE_MS } from './campaign/bot-turns';
import { BOTS_KEY as BOTS, loadBots, loadCampaign, PREVIOUS_SAVE_KEY, readSave, RECOVERY_SAVE_KEY, recoverySave, SAVE_KEY as SAVE } from './campaign/saves';
const CampaignCombat=lazy(()=>import('./campaign/Combat'));
const DesignGallery=lazy(()=>import('./campaign/DesignGallery'));
const LEGACY_SAVE='lordaeron-base-save-v6',AUTO_CONTINUE='lordaeron-base-auto-continue';
function legacy(){try{return localStorage.getItem(LEGACY_SAVE)??localStorage.getItem('lordaeron-base-save-v4')??localStorage.getItem('lordaeron-base-save-v3');}catch{return null;}}
function downloadSession(raw:string,name:string){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
type Panel=TablePanel|'new'|'settings'|null;
export default function Campaign(){
 const[legacySave]=useState(legacy),[previousSave,setPreviousSave]=useState(()=>readSave(PREVIOUS_SAVE_KEY));
 const[game,setGame]=useState(loadCampaign),[page,setPage]=useState('board'),[panel,setPanel]=useState<Panel>(()=>game.needsSetup?'new':null),[heroId,setHeroId]=useState(DEFAULT_SETUP.roster[0]),[selected,setSelected]=useState('brill'),[toast,setToast]=useState(()=>{try{return legacySave&&!localStorage.getItem(SAVE)?"Equipment and combat rules have been updated. Your previous game is preserved; download a copy in Settings.":'';}catch{return '';}}),[detailCard,setDetailCard]=useState(p.cards[0].id);
 const[recoveredSave]=useState(()=>game.unreadableSave??recoverySave()),[saveUnavailable,setSaveUnavailable]=useState(!!game.storageUnavailable),[importBusy,setImportBusy]=useState(false);
 const[bots,setBots]=useState<string[]>(()=>loadBots(game.session.setup.roster)),[auto,setAuto]=useState(loadAuto),[difficulty,setDifficulty]=useState<Difficulty>('balanced'),[botReason,setBotReason]=useState('');
 const[training,setTraining]=useState<string[]>([]),[exportJSON,setExportJSON]=useState(''),[codexHero,setCodexHero]=useState(DEFAULT_SETUP.roster[0]),[mapFocus,setMapFocus]=useState(false),[detailOpen,setDetailOpen]=useState(false),[summaryHidden,setSummaryHidden]=useState(false),[undoStack,setUndoStack]=useState<{game:ReturnType<typeof loadCampaign>;command:Command}[]>([]);
 const[combatOpen,setCombatOpen]=useState(false),[combatResolve,setCombatResolve]=useState(true),[settledRoll,setSettledRoll]=useState('');
 const[autoContinue,setAutoContinue]=useState(()=>{try{return localStorage.getItem(AUTO_CONTINUE)!=='false';}catch{return true;}});
 useEffect(()=>{try{localStorage.setItem(AUTO_CONTINUE,String(autoContinue));}catch{/* The preference only lasts this session. */}},[autoContinue]);
 const[questSession,setQuestSession]=useState(0),[revealSetup,setRevealSetup]=useState(false),[questOpen,setQuestOpen]=useState(false),[workspaceOpen,setWorkspaceOpen]=useState(false);
 const file=useRef<HTMLInputElement>(null),importRequest=useRef(0),current=useRef(game);current.current=game;
 const currentBots=useRef(bots);currentBots.current=bots;
 const planner=useRef<PlannerClient|null>(null),botRequest=useRef<symbol|null>(null);
 useEffect(()=>()=>{planner.current?.dispose();planner.current=null;botRequest.current=null;},[bots,difficulty,panel,detailOpen,workspaceOpen,questOpen,mapFocus,page,importBusy,auto,combatResolve]);
 useEffect(()=>{if(botRequest.current){planner.current?.dispose();planner.current=null;botRequest.current=null;}},[game.state]);
 const controlled=game.state.heroes.filter(h=>!bots.includes(h.id)).map(h=>h.id);
 const state=useMemo(()=>view(game.state,controlled),[game.state,bots]),allLegal=useMemo(()=>legalActions(p,game.state),[game.state]);
 const presentation=useCombatPresentation(state);
 useTooltips();
 // The table's pace: each thing that happens is shown by itself before the next (campaign/stage.ts). The bots and the dialogs wait for it.
 const[pace,setPace]=useState<Pace>(loadPace),[queue,setQueue]=useState<Beat[]>([]),staged=queue.length>0&&page==='board';
 useEffect(()=>{savePace(pace);if(pace==='off')setQueue([]);},[pace]);
 // The bots keep the same pace between their own moves, on the table and in combat.
 const tempo=pace==='off'?1:Math.max(0.6,paceFactor(pace));
 useGameAudio(p,game.needsSetup?undefined:state,pace!=='off');
 useCombatAudio(p,game.needsSetup?undefined:state,presentation);
 const lastView=useRef<typeof state|undefined>(undefined);
 useEffect(()=>{const news=game.needsSetup?undefined:warNews(p,lastView.current,state);lastView.current=game.needsSetup?undefined:state;if(news)setToast(news);},[state,game.needsSetup]);
 const legal=allLegal.filter(c=>decisionOwners(p,state,c).some(id=>controlled.includes(id)));
 const h=state.heroes.find(h=>h.id===heroId)??state.heroes[0];
 // A bot's invitation to its challenge, waiting for the player's answer, and the characters who declined this faction turn.
 const[invitation,setInvitation]=useState<{command:Challenge;reason:string;source:typeof game.state}>(),declined=useRef(new Set<string>());
 const automationPaused=importBusy||!!panel||detailOpen||workspaceOpen||questOpen||mapFocus||page!=='board'||!!invitation||staged;
 // The bots play on their own (campaign/bot-turns.ts). In his own faction's turn the player's characters act first, unless he
 // lets his allies go ahead; and while a decision dialog is open for a choice of his own, the bots wait behind it.
 const[ahead,setAhead]=useState(''),holding=playerToAct(p,state,legal,controlled)&&ahead!==turnKey(state),contested=playerDecides(state,legal);
 // Run AI from the table means now: the bots go ahead in this turn. Switched on in Settings, they keep to the player's turn.
 const playBots=(on:boolean,now=on)=>{setAuto(on);saveAuto(on);if(now)setAhead(turnKey(state));},toggleBots=()=>playBots(!auto);
 const can=(type:Command['type'])=>legal.some(c=>c.type===type&&(!('hero'in c)||c.hero===h.id));
 const nextPhase=game.needsSetup?undefined:legal.find(c=>c.type==='endActions'||c.type==='endManagement');
 const availableBotMoves=state.phase==='combat'?combatCandidates(p,state,allLegal,bots,{resolve:true,campaignAuto:auto,difficulty}):allLegal.filter(c=>botOwns(p,game.state,c,bots));
 const botReady=availableBotMoves.length>0;
 // What the bots may do on the table: their own moves, and challenges that ask a player's character along.
 const tableMoves=(s:typeof game.state,legalNow:Command[])=>[...legalNow.filter(c=>botOwns(p,s,c,currentBots.current)),...jointChallenges(s,legalNow,currentBots.current,declined.current)];
 const afterHumanResponse=state.phase==='combat'?combatCandidates(p,state,allLegal,bots,{resolve:true,campaignAuto:auto,difficulty,humanResponsePassed:true}):[];
 const botResponsePending=!availableBotMoves.length&&afterHumanResponse.length>0;
 useEffect(()=>{
  try{
   // Preserve backups before replacing the autosave, including when storage is full.
   if(recoveredSave)localStorage.setItem(RECOVERY_SAVE_KEY,recoveredSave);
   if(previousSave)localStorage.setItem(PREVIOUS_SAVE_KEY,previousSave);
   if(game.needsSetup)return;
   localStorage.setItem(SAVE,JSON.stringify(game.session));localStorage.setItem(BOTS,JSON.stringify(bots));setSaveUnavailable(false);
  }catch{setSaveUnavailable(true);}
 },[game,bots,recoveredSave,previousSave]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),8000);return()=>clearTimeout(t);},[toast]);
 useEffect(()=>{const next=state.heroes.find(h=>faction(p,h.id)===state.faction&&controlled.includes(h.id))??state.heroes.find(h=>faction(p,h.id)===state.faction);if(next){setHeroId(next.id);setSelected(next.location);}},[state.faction]);
 useEffect(()=>{window.scrollTo(0,0);},[page]);
 const send=(c:Command)=>{if(current.current.needsSetup)return false;try{const before=current.current;const next={state:apply(p,before.state,c),session:{...before.session,commands:[...before.session.commands,c]}};current.current=next;setGame(next);
  // Only a human's choice that rolled and revealed nothing can be taken back; anything else closes the undo history.
  const human=decisionOwners(p,before.state,c).some(id=>!currentBots.current.includes(id));
  if(pace!=='off'){const shown=beats(contentFor(p,next.state),before.state,next.state,c,!human);if(shown.length)setQueue(waiting=>[...waiting,...shown]);}
  // A bot's action is heard with its announcement; a player's own action, and every action while nothing is announced, at once.
  const acted=before.state.phase==='combat'?undefined:actionCue(contentFor(p,next.state),before.state,next.state,c);if(acted&&(pace==='off'||human))audio.cue(acted);
  setUndoStack(stack=>human&&undoable(before.state,next.state,c)?[...stack.slice(1-UNDO_DEPTH),{game:before,command:c}]:[]);return true;}catch(e){setToast((e as Error).message);return false;}};
 const undo=()=>{const last=undoStack.at(-1);if(!last||current.current!==game)return;setQueue([]);planner.current?.dispose();planner.current=null;botRequest.current=null;current.current=last.game;setGame(last.game);setUndoStack(stack=>stack.slice(0,-1));setPanel(null);setMapFocus(false);if('hero'in last.command){const id=last.command.hero;setHeroId(id);const hero=last.game.state.heroes.find(hero=>hero.id===id);if(hero)setSelected(hero.location);}const what=undoName(last.command);setToast(last.command.type==='ability'?`${card(p,last.command.card).name} taken back: nothing was spent.`:`${what[0].toUpperCase()}${what.slice(1)} undone.`);};
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||e.shiftKey||(e.target as HTMLElement).closest('input,select,textarea,[contenteditable=true]'))return;const dialogs=[...document.querySelectorAll('dialog[open]')],inCombat=undoStack.at(-1)?.command.type==='ability'&&dialogs.length===1&&dialogs[0].classList.contains('combat-room');if(!undoStack.length||page!=='board'||panel||dialogs.length&&!inCombat)return;e.preventDefault();undo();};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);});
 // A rendered combat control must never act on a newer combat state.
 const sendCombat=(c:Command)=>{const human=decisionOwners(p,state,c).some(id=>!currentBots.current.includes(id));const acknowledge=state.battle?.stage==='over'&&c.type==='closeBattle';if(!diceRolling&&!presentation.busy&&current.current.state===game.state&&(human||acknowledge))send(c);};
 const planMove=async(candidates:Command[],valid=()=>true,humanResponsePassed=false,explain=false)=>{
  if(botRequest.current||current.current.needsSetup||importBusy)return;
  const source=current.current.state;
  const seats=currentBots.current;
  if(!candidates.length){setToast("A human player acts next.");return;}
  const request=Symbol();botRequest.current=request;
  try{
   planner.current??=new PlannerClient();
   const decision=await planner.current.plan(view(source,bots),candidates,difficulty,{independent:source.heroes.filter(v=>!seats.includes(v.id)).map(v=>v.id)});
   const fresh=!!decision&&botRequest.current===request&&valid()&&current.current.state===source&&currentBots.current===seats;
   // The planner found nothing worth doing (bots without actions while a player still has some): say so when asked for a move.
   if(!decision&&explain&&botRequest.current===request&&current.current.state===source)setToast('The AI characters have nothing useful to do now. A human player acts next.');
   // The bot wants a player's character beside it: ask, do not draft.
   if(fresh&&decision.command.type==='challenge'&&invitedPlayers(decision.command,seats).length){botRequest.current=null;setInvitation({command:decision.command,reason:decision.reason,source});}
   else if(fresh&&botOwns(p,source,decision.command,currentBots.current)){
    const stillBotWindow=source.phase!=='combat'||combatCandidates(p,view(source),legalActions(p,source),currentBots.current,{resolve:true,campaignAuto:auto,difficulty,humanResponsePassed}).length>0;
    if(stillBotWindow){botRequest.current=null;setBotReason(decision.reason);send(decision.command);}
   }
  }catch(e){if(botRequest.current===request&&valid()&&current.current.state===source){setAuto(false);setCombatResolve(false);setToast((e as Error).message);}}
  finally{if(botRequest.current===request)botRequest.current=null;}
 };
 const botStep=()=>{if(state.phase==='combat'&&(diceRolling||presentation.busy))return;void planMove(state.phase==='combat'?availableBotMoves:tableMoves(game.state,allLegal),()=>true,false,true);};
 useEffect(()=>{setInvitation(v=>v&&v.source!==game.state?undefined:v);},[game.state]);
 const joinInvitation=()=>{const v=invitation;setInvitation(undefined);if(v&&v.source===current.current.state)send(v.command);};
 const declineInvitation=()=>{
  const v=invitation;setInvitation(undefined);if(!v)return;
  for(const id of invitedPlayers(v.command,currentBots.current))declined.current.add(inviteKey(v.source,id));
  if(v.source===current.current.state)void planMove(tableMoves(v.source,legalActions(p,v.source)));
 };
 // The move advisor: the planner weighs the selected character's own actions on request. Its own worker keeps it apart from the bots' turn.
 const advisor=useRef<PlannerClient|null>(null),hintRequest=useRef(0);
 const[hint,setHint]=useState<Hint&{command?:Command;source?:typeof game.state}>();
 useEffect(()=>{hintRequest.current++;setHint(undefined);},[game.state,heroId,bots]);
 useEffect(()=>()=>{advisor.current?.dispose();advisor.current=null;},[]);
 const hintMoves=game.needsSetup||state.phase!=='actions'?[]:hintCandidates(legal,h.id);
 const askHint=async()=>{
  if(!hintMoves.length||hint?.busy)return;
  const source=current.current.state,request=++hintRequest.current;
  setHint({busy:true});
  try{
   advisor.current??=new PlannerClient();
   const decision=await advisor.current.plan(view(source,controlled),hintMoves,difficulty);
   if(hintRequest.current!==request)return;
   setHint(decision?{busy:false,label:hintLabel(p,view(source,controlled),decision.command),reason:decision.reason,command:decision.command,source}:{busy:false,error:'The advisor found no move to suggest.'});
  }catch(e){if(hintRequest.current===request)setHint({busy:false,error:(e as Error).message.replace('Try Step bot again.','Ask again.')});}
 };
 const useHint=()=>{if(hint?.command&&hint.source===current.current.state)send(hint.command);};
 // What the advisor expects of one exact challenge: the Challenge dialog shows it under the party the player has put together.
 const assessChallenge=async(c:Command)=>{advisor.current??=new PlannerClient();return (await advisor.current.plan(view(current.current.state,controlled),[c],difficulty))?.reason;};
 const passHumanResponse=()=>{if(!botResponsePending||diceRolling||presentation.busy)return;void planMove(afterHumanResponse,()=>true,true);};
 useEffect(()=>{if(!auto||!botReady||automationPaused||state.phase==='combat'||holding||contested)return;let cancelled=false;const t=setTimeout(()=>{void planMove(tableMoves(game.state,allLegal),()=>!cancelled);},undoStack.length?Math.max(UNDO_GRACE_MS,550*tempo):550*tempo);return()=>{cancelled=true;clearTimeout(t);};},[auto,botReady,automationPaused,game.state,bots,difficulty,tempo,holding,contested,undoStack.length>0]);
 const rollingKey=rollSignature(state),diceRolling=!!rollingKey&&rollingKey!==settledRoll;
 useEffect(()=>{if(!rollingKey){setSettledRoll('');return;}const t=setTimeout(()=>setSettledRoll(rollingKey),DICE_SETTLE_MS);return()=>clearTimeout(t);},[rollingKey]);
 useEffect(()=>{setCombatOpen(state.phase==='combat');},[state.phase]);
 const automaticCombat=useMemo(()=>combatCandidates(p,state,allLegal,bots,{resolve:combatResolve,campaignAuto:auto,difficulty}),[game.state,allLegal,bots,combatResolve,auto,difficulty]);
 // A player's lone bookkeeping continuation advances by itself; every real decision still waits.
 const autoStep=autoContinue?bookkeepingStep(state,legal,allLegal,availableBotMoves.length>0):undefined;
 // The power a player used last stays on offer to take back until anything else happens: see undoable().
 const lastUndo=undoStack.at(-1)?.command,takenBack=lastUndo?.type==='ability'&&state.battle?{hero:lastUndo.hero,card:lastUndo.card,undo}:undefined;
 useEffect(()=>{if(!autoStep||diceRolling||presentation.busy||automationPaused||!combatOpen)return;const source=game.state;const t=setTimeout(()=>{if(current.current.state===source)send(autoStep);},AUTO_CONTINUE_MS);return()=>clearTimeout(t);},[autoStep,diceRolling,presentation.busy,automationPaused,combatOpen,game.state]);
 // The result of a fight the bots fought stays up long enough to be read before they close it; step by step, it waits to be closed.
 const combatDelay=botCombatDelay(automaticCombat,COMBAT_STEP_MS,tempo,pace==='step');
 useEffect(()=>{if(!automaticCombat.length||diceRolling||presentation.busy||automationPaused||combatDelay===undefined)return;let cancelled=false;const source=game.state;const t=setTimeout(()=>{if(cancelled||current.current.state!==source)return;const allowed=combatCandidates(p,view(source),allLegal,currentBots.current,{resolve:combatResolve,campaignAuto:auto,difficulty});if(!allowed.length)return;if(allowed.length===1)send(allowed[0]);else void planMove(allowed,()=>!cancelled);},combatDelay);return()=>{cancelled=true;clearTimeout(t);};},[automaticCombat,diceRolling,presentation.busy,automationPaused,game.state,combatDelay]);
 const chooseHero=(id:string)=>{setHeroId(id);setSelected(state.heroes.find(h=>h.id===id)!.location);};
 const open=(next:Panel)=>{if(next==='train')setTraining([]);setDetailOpen(false);setPanel(next);};
 const inspect=(id:string)=>{setDetailCard(id);setDetailOpen(true);};
 const closeAfter=(c:Command)=>{if(send(c)){setPanel(null);if(c.type==='manage')setToast(`${character(p,c.hero).name.split(' ')[0]}’s equipment is ready. Loadout saved.`);if(c.type==='train')setToast('Powers learned. Equip them during equipment management.');}};
 const replaceCampaign=(next:ReturnType<typeof importSession>,human:string,nextBots:string[])=>{
  if(!current.current.needsSetup)setPreviousSave(JSON.stringify(current.current.session));
  planner.current?.dispose();planner.current=null;botRequest.current=null;setQueue([]);
  current.current=next;setGame(next);setBots(nextBots);setHeroId(human);setSelected(next.state.heroes.find(hero=>hero.id===human)!.location);
  setAhead('');setMapFocus(false);setBotReason('');setTraining([]);setExportJSON('');setDetailOpen(false);setWorkspaceOpen(false);setSummaryHidden(false);setUndoStack([]);
  setCombatOpen(next.state.phase==='combat');setSettledRoll('');setQuestSession(n=>n+1);setRevealSetup(false);setQuestOpen(false);setPanel(null);setPage('board');
 };
 const reset=(setup:Setup,human:string,newBots:boolean)=>{try{const next={state:createGame(p,setup),session:newSession(p,setup)},humanId=setup.roster.includes(human)?human:setup.roster[0];importRequest.current++;setImportBusy(false);replaceCampaign(next,humanId,newBots?setup.roster.filter(id=>id!==humanId):[]);}catch(e){setToast((e as Error).message);}};
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.ctrlKey||e.metaKey||e.altKey||(e.target as HTMLElement).closest('input,select,textarea,dialog,[contenteditable=true]')||panel||game.needsSetup||document.querySelector('dialog[open]'))return;const action=(['travel','rest','train','town','challenge'] as const)[Number(e.key)-1];if(action&&page==='board'&&can(action)){e.preventDefault();if(action==='travel')setMapFocus(true);else open(action);}if(e.key.toLowerCase()==='f'&&page==='board')setMapFocus(v=>!v);if(e.key.toLowerCase()==='h'&&page==='board'&&!mapFocus&&hintMoves.length){e.preventDefault();void askHint();}if(e.key==='Escape'&&mapFocus)setMapFocus(false);};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);});
 const exportSave=()=>{const raw=JSON.stringify(game.session,null,2);setExportJSON(raw);try{downloadSession(raw,`lordaeron-${game.state.turn}.json`);}catch{setPanel('settings');setToast('Copy the game backup below and save it as a JSON file.');}};
 const importFile=async(f?:File)=>{
  if(!f)return;const request=++importRequest.current,source=current.current;setImportBusy(true);
  try{
   if(f.size>MAX_SESSION_SIZE)throw new Error('The game file is too large. Choose a file smaller than 4 MB.');
   const text=await f.text();if(request!==importRequest.current)return;
   if(current.current!==source)throw new Error('Your campaign changed while the file was opening. Import it again to continue.');
   const next=importSession(p,text),human=next.state.heroes.find(hero=>faction(p,hero.id)===next.state.faction)??next.state.heroes[0];
   replaceCampaign(next,human.id,[]);setToast('Game verified by replaying every move. All characters are under your control; assign AI in Settings.');
  }catch(e){if(request===importRequest.current)setToast((e as Error).message);}
  finally{if(request===importRequest.current){setImportBusy(false);if(file.current)file.current.value='';}}
 };
 const title=panel==='new'?"New campaign":panel==='settings'?"Your game":panel==='rest'?"Rest":panel==='train'?"Train":panel==='town'?"Town market":panel==='challenge'?"Choose a challenge":panel==='manage'?"Character management":panel==='trade'?"Trade with an ally":card(p,detailCard).name;
 const decision=(state.phase==='reward'||!!state.auction||!!state.eventFlow?.steps.length||state.heroes.some(h=>h.talentChoices.length)||state.respawns.length>0)&&state.phase!=='combat';
 useEffect(()=>{if(page!=='board'||panel||detailOpen||decision||state.phase==='combat')setMapFocus(false);},[page,panel,detailOpen,decision,state.phase]);
 // A decision that only the bots can make is theirs: they make it, and the stage shows what they chose. Its dialog comes up
 // only when they take long over it, so that the game never waits unseen.
 const theirs=botsDecide(decision,auto,botReady,legal),[overdue,setOverdue]=useState(false);
 useEffect(()=>{setOverdue(false);if(!theirs||staged)return;const t=setTimeout(()=>setOverdue(true),BOT_PATIENCE_MS);return()=>clearTimeout(t);},[theirs,staged,game.state]);
 return <div className={`campaign-app campaign-page-${page} ${page==='board'?'desktop-tabletop':''}`}>
 <header className="topbar"><button className="wordmark" onClick={()=>setPage('board')}><span className="brand-crest"><GameIcon name="melee" size={35}/></span><span><strong>WORLD <small>of</small> WARCRAFT</strong><em>THE BOARD GAME <i/> 2005 + FAQ</em></span></button><nav className="topnav" aria-label="Main navigation">{[['board',"Campaign"],['cards',"Card library"],['heroes',"Heroes"],['journal',"Chronicle"],['rules',"Rules"]].map(([id,label])=><button key={id} className={page===id?'active':''} aria-current={page===id?'page':undefined} onClick={()=>setPage(id)}>{label}</button>)}</nav><div className="header-right"><button className={`session-badge ${saveUnavailable?'save-unavailable':''}`} onClick={()=>open('settings')} title={saveUnavailable?'Autosave is unavailable. Export your game before closing this tab.':'Local game · Manage saved games'}><i/>{saveUnavailable?'SAVE UNAVAILABLE':'LOCAL GAME'}</button><button className="icon-button" aria-label="New game" title="Set up a new campaign" onClick={()=>open('new')}><Icon name="plus"/></button><SoundToggle/><button className="icon-button" aria-label="Settings" onClick={()=>open('settings')}><Icon name="settings"/></button></div></header>
 <main className="campaign-main"><div className="campaign-title"><div><div className="eyebrow"><span className="chapter-dot"/>LORDAERON <span className="slash">/</span> A WAR OF TWO FACTIONS</div><h1>Fate of the kingdom<span>{phaseLabel[state.phase]}</span></h1></div><div className="campaign-turn"><FactionCrest faction={state.faction}/><span className={state.faction}>{factionLabel(state.faction)}</span><b>{state.turn}<small> / 30{state.lap?` · lap ${state.lap}`:''}</small></b>{page==='board'&&undoStack.length>0&&<button className="quiet-button undo-button" title="Undo (Ctrl+Z) · only moves that rolled no dice and revealed no cards" onClick={undo}><Icon name="reset" size={15}/>Undo {undoName(undoStack.at(-1)!.command)}</button>}{page==='board'?<button className="quiet-button" disabled={!nextPhase} onClick={()=>nextPhase&&send(nextPhase)}>{state.phase==='actions'?"Management":"End turn"}<Icon name="arrow"/></button>:!game.needsSetup&&<button className="quiet-button" onClick={()=>setPage('board')}>Back to the table<Icon name="arrow"/></button>}</div></div>
 {page==='board'&&game.needsSetup&&<section className="campaign-welcome"><span className="sheet-eyebrow">A WAR OF TWO FACTIONS</span><h2>Your adventure begins here.</h2><p>Prepare the table, choose your characters and discover how your first turn works.</p><button className="gold-button" onClick={()=>open('new')}>Set up a campaign <Icon name="arrow"/></button></section>}
 {page==='board'&&!game.needsSetup&&<Tabletop key={questSession} state={state} h={h} legal={legal} controlled={controlled} bots={bots} takeControl={id=>{setBots(previous=>previous.filter(bot=>bot!==id));chooseHero(id);}} auto={auto} holding={auto&&holding&&botReady} alliesFirst={()=>setAhead(turnKey(state))} botReady={botReady} botReason={botReason} hint={hint} onHint={hintMoves.length?()=>{void askHint();}:undefined} onUseHint={useHint} onDismissHint={()=>{hintRequest.current++;setHint(undefined);}} selectHero={chooseHero} selected={selected} selectRegion={setSelected} inspect={inspect} open={open} send={send} botStep={botStep} toggleBots={toggleBots} focused={mapFocus} toggleFocus={()=>setMapFocus(v=>!v)} notify={setToast} spotlight={staged&&queue[0].region?{region:queue[0].region,from:queue[0].from,path:queue[0].path}:undefined} combatOpen={combatOpen} toggleCombat={()=>setCombatOpen(v=>!v)} onWorkspaceChange={setWorkspaceOpen} questActivity={<QuestActivity key={questSession} state={state} autoRevealSetup={revealSetup} announceOnly={auto||pace!=='off'} suspended={!!panel||detailOpen||workspaceOpen||decision||state.phase==='combat'} onOpenChange={visible=>{setQuestOpen(visible);if(visible)setRevealSetup(false);}} onLocate={region=>{setSelected(region);setMapFocus(true);}}/>}/>}
 {page==='cards'&&<BaseCatalog inspect={inspect}/>}
 {page==='heroes'&&<section className="character-codex"><div className="character-roster">{p.characters.map(c=><button key={c.id} aria-pressed={codexHero===c.id} onClick={()=>setCodexHero(c.id)}><HeroPortrait id={c.id} small/><span><strong>{c.name.split(' ')[0]}</strong><small>{c.classId} · {factionLabel(c.faction)}</small></span></button>)}</div><CharacterSheet key={codexHero} hero={state.heroes.find(h=>h.id===codexHero)??startingHero(codexHero)} inspect={inspect} preview/></section>}
 {page==='design'&&<Suspense fallback={<p>Loading…</p>}><DesignGallery/></Suspense>}
 {page==='journal'&&<Chronicle log={state.log}/>}
 {page==='rules'&&<RulesGuide onSetup={()=>open('new')} onDesign={()=>setPage('design')}/>}
 </main>
 {toast&&<div className="toast" role="status"><Icon name="help"/>{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={()=>setToast('')}><Icon name="x" size={14}/></button></div>}
 {!game.needsSetup&&<Suspense fallback={combatOpen?<p>Preparing combat…</p>:null}><CampaignCombat state={state} legal={state.battle?.stage==='over'?[...legal,...allLegal.filter(c=>c.type==='closeBattle'&&!legal.some(h=>h.type==='closeBattle'))]:legal} busy={diceRolling} presentation={presentation} send={sendCombat} botStep={botStep} botReady={botReady} auto={auto} toggleBots={toggleBots} open={combatOpen&&!staged} onClose={()=>setCombatOpen(false)} bots={bots} resolve={combatResolve} toggleResolve={()=>setCombatResolve(v=>!v)} botResponsePending={botResponsePending} onPassHumanWindow={passHumanResponse} automationPending={!!automaticCombat.length&&combatDelay!==undefined} autoContinue={autoContinue} toggleAutoContinue={()=>setAutoContinue(v=>!v)} autoStep={autoStep} takeBack={takenBack}/></Suspense>}
 {state.phase==='combat'&&!combatOpen&&!staged&&<button className="combat-docked" onClick={()=>setCombatOpen(true)}><Icon name="swords"/><span>Return to combat<small>Round {state.battle?.round} · {phaseLabel[state.battle?.stage??'combat']}</small></span><Icon name="arrow" size={14}/></button>}
 {page==='board'&&!game.needsSetup&&<Stage queue={queue} pace={pace} next={()=>setQueue(waiting=>waiting.slice(1))} clear={()=>setQueue([])}/>}
 {decision&&!staged&&(!theirs||overdue)&&<WorldDecision key={`${state.phase}-${state.eventFlow?.event}-${state.eventFlow?.steps[0]?.hero}-${state.heroes.find(h=>h.talentChoices.length)?.id}-${state.reward?.offered.join()}`} state={state} legal={legal} send={send} inspect={inspect} botStep={botStep} botReady={botReady} auto={auto} toggleBots={toggleBots} waiting={playerClaims(state,legal)&&botReady} hasBots={bots.length>0}/>}
 {state.phase==='finished'&&page==='board'&&(summaryHidden?<button className="combat-docked summary-docked" onClick={()=>setSummaryHidden(false)}><Icon name="trophy"/><span>Campaign summary<small>{state.winner==='draw'?'Draw':`${factionLabel(state.winner??'')} wins`}</small></span><Icon name="arrow" size={14}/></button>:<CampaignSummary state={state} onNew={()=>open('new')} onChronicle={()=>setPage('journal')} onHide={()=>setSummaryHidden(true)}/>)}
 <input ref={file} type="file" accept=".json,application/json" hidden onChange={e=>void importFile(e.target.files?.[0])}/>
 {panel&&<Modal title={title} wide={['new','town','manage','trade','train'].includes(panel)} className={panel==='new'?'setup-modal':panel==='manage'?'equipment-modal':panel==='train'?'training-modal':panel==='town'?'town-modal':''} onClose={()=>setPanel(null)}>
 {panel==='rest'&&<RestEditor key={h.id} state={game.state} hero={h} legal={legal} send={closeAfter}/>}
 {panel==='train'&&<div className="dialog-content training-dialog"><ClassDeck key={h.id} hero={h} inspect={inspect} selected={training} toggle={id=>setTraining(v=>v.includes(id)?v.filter(c=>c!==id):[...v,id])}/><div className="training-receipt"><span><strong>{training.length} {training.length===1?'power':'powers'} selected</strong><small>Purchase → Spellbook → Equip during management</small></span><button className="gold-button" disabled={!can('train')||!training.length||training.reduce((n,id)=>n+card(p,id).price,0)>h.gold} onClick={()=>closeAfter({type:'train',hero:h.id,cards:training})}>Learn · {training.reduce((n,id)=>n+card(p,id).price,0)} / {h.gold} gold · 1 action</button></div></div>}
 {panel==='town'&&<TownEditor hero={h} merchant={state.merchant} busy={false} send={closeAfter}/>}
 {panel==='manage'&&<EquipmentEditor key={h.id} hero={h} busy={!can('manage')} send={closeAfter}/>}
 {panel==='trade'&&<TradeEditor hero={h} heroes={state.heroes} busy={false} send={closeAfter}/>}
 {panel==='challenge'&&<ChallengeDialog key={h.id} state={state} hero={h.id} legal={legal} bots={bots} send={closeAfter} assess={assessChallenge}/>}
 {panel==='settings'&&<div className="dialog-content"><SaveManager needsSetup={!!game.needsSetup} unavailable={saveUnavailable} importing={importBusy} previous={previousSave} recovered={recoveredSave} legacy={legacySave} exported={exportJSON} onExport={exportSave} onImport={()=>file.current?.click()} onDownload={(raw,name)=>{setExportJSON(raw);try{downloadSession(raw,name);}catch{setToast('Copy the game backup below and save it as a JSON file.');}}} onRestore={()=>{if(!previousSave)return;try{const next=importSession(p,previousSave),human=next.state.heroes.find(hero=>faction(p,hero.id)===next.state.faction)??next.state.heroes[0];importRequest.current++;setImportBusy(false);replaceCampaign(next,human.id,[]);setToast('Previous campaign restored. All characters are under your control; assign AI in Settings.');}catch(e){setToast((e as Error).message);}}}/><SoundControls/><label className="setting-row">Pace of the table<select aria-label="Pace of the table" value={pace} onChange={e=>setPace(e.target.value as Pace)}>{PACES.map(v=><option key={v.id} value={v.id}>{v.label} · {v.note}</option>)}</select></label><label className="setting-row">AI characters<select aria-label="AI characters" value={auto?'on':'off'} onChange={e=>playBots(e.target.value==='on',false)}><option value="on">Play on their own · your characters act first</option><option value="off">Wait for “Run AI”</option></select></label><label className="setting-row">Bot play style<select value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}><option value="balanced">Balanced</option><option value="cautious">Cautious</option><option value="aggressive">Aggressive</option></select></label><div className="bot-seats">{state.heroes.map(hero=><label key={hero.id}><HeroPortrait id={hero.id} small/><span>{character(p,hero.id).name}</span><input type="checkbox" checked={bots.includes(hero.id)} onChange={e=>setBots(v=>e.target.checked?[...v,hero.id]:v.filter(id=>id!==hero.id))}/>AI</label>)}</div><button className="gold-button full-width" onClick={()=>open('new')}>New campaign</button><p className="muted">Online rooms are not yet available. Export a backup to continue on another device.</p><BuildStamp rules={game.needsSetup?undefined:state.variants?.rules??1}/></div>}
 {panel==='new'&&<>{game.unreadableSave&&<p className="setup-recovery-notice" role="alert">Your saved game could not be opened. Its original file is preserved. <button className="quiet-button" onClick={()=>open('settings')}>Open save recovery</button></p>}<CampaignSetup onStart={reset} onCancel={()=>setPanel(null)} existing={!game.needsSetup}/></>}
 </Modal>}
 {invitation&&invitation.source===game.state&&!staged&&<Modal title="An ally asks for help" onClose={declineInvitation}><ChallengeInvite state={state} command={invitation.command} reason={invitation.reason} bots={bots} onJoin={joinInvitation} onDecline={declineInvitation}/></Modal>}
 {detailOpen&&<Modal title={card(p,detailCard).name} className="card-detail-modal" onClose={()=>setDetailOpen(false)}><div className="card-detail"><GameCard card={card(p,detailCard)}/><div>{panel==='train'&&<button className="quiet-button" onClick={()=>setDetailOpen(false)}>← Back to training</button>}<h3>{card(p,detailCard).name}</h3><p>Level {card(p,detailCard).level} · {card(p,detailCard).trait||card(p,detailCard).type} · {card(p,detailCard).energy} energy</p><CardRules value={card(p,detailCard)}/><a className="source-link" href={card(p,detailCard).source.url} target="_blank" rel="noreferrer">Original card ↗</a></div></div></Modal>}
 </div>;
}
