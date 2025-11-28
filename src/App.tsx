import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  History, CheckCircle, XCircle, Zap, FastForward, Code, 
  ArrowRight, Settings, Save, Activity, 
  BrainCircuit, Network, Cpu, Clock, Split, Scan, Keyboard, 
  Compass, HelpCircle, Eye, EyeOff, Wrench
} from 'lucide-react';

// --- Types ---

type GamePhase = 'IDLE' | 'WARMUP' | 'PLAYING' | 'FEEDBACK';

type GeneratorType = 
  | 'FLUX_FEATURE'    
  | 'FLUX_COMPARISON' 
  | 'FLUX_OPPOSITION' 
  | 'FLUX_HIERARCHY'  
  | 'FLUX_CAUSAL'     
  | 'FLUX_SPATIAL'    
  | 'FLUX_DEICTIC'    
  | 'FLUX_CONDITIONAL'
  | 'FLUX_ANALOGY';   

type DictionaryPos = 'LEFT' | 'RIGHT';

interface ContextDictionary { [key: string]: string; }

interface StimulusData {
  type: GeneratorType;
  dictionary: ContextDictionary;
  dictionaryPos: DictionaryPos;
  visuals: any; 
  textQuery: string;
  logicProof: string; 
  contextColors?: string[]; 
}

interface HistoryItem {
  result: string;
  stimulus: StimulusData;
}

interface LogEntry {
  id: number;
  timestamp: string;
  elo: number;
  nBackItem: HistoryItem | null;
  currentItem: HistoryItem;
  userAnswer: boolean;
  isMatch: boolean;
  isCorrect: boolean;
  reactionTime: number;
  isRepair?: boolean; // Track if this was a repair turn
}

interface GameConfig {
  nBackLevel: number;
  baseTimer: number; 
  isPracticeMode: boolean;
  practiceType?: GeneratorType; 
}

// --- Generators ---

const NONSENSE_SYLLABLES = ['ZID', 'LUM', 'VEX', 'KOR', 'JAX', 'QIN', 'YOM', 'TEP', 'WEX', 'BUP', 'SAF', 'GEX'];
const SHAPES = ['SQUARE', 'CIRCLE', 'TRIANGLE', 'DIAMOND'];
const COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
const DIRECTIONS = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
const ICONS = ['♦', '★', '▲', '▼', '●', '■', '⚡', '❄', '∞', '§']; 

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateCode = (used: string[]) => {
  let code = getRandomItem(NONSENSE_SYLLABLES);
  while (used.includes(code)) code = getRandomItem(NONSENSE_SYLLABLES);
  return code;
};

const shuffleEntries = (obj: Record<string, string>): Record<string, string> => {
  const entries = Object.entries(obj);
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  return Object.fromEntries(entries);
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- Generator Functions
// 1. FLUX FEATURE
const generateFluxFeature = (prevResult: string | null, forceMatch: boolean): { stim: StimulusData, result: string } => {
  const relations = ['MATCH_COLOR', 'MATCH_SHAPE', 'EXACT', 'NONE'];
  let result = getRandomItem(relations);
  if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult;
  else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
  const codeColor = generateCode([]); const codeShape = generateCode([codeColor]); const codeExact = generateCode([codeColor, codeShape]);
  const dict = shuffleEntries({ [codeColor]: 'MATCH_COLOR', [codeShape]: 'MATCH_SHAPE', [codeExact]: 'EXACT_MATCH' });
  const start = { shape: getRandomItem(SHAPES), color: getRandomItem(COLORS) }; let end = { ...start };
  if (result === 'MATCH_COLOR') { end.color = start.color; end.shape = getRandomItem(SHAPES.filter(s => s !== start.shape)); }
  else if (result === 'MATCH_SHAPE') { end.shape = start.shape; end.color = getRandomItem(COLORS.filter(c => c !== start.color)); }
  else if (result === 'NONE') { end.shape = getRandomItem(SHAPES.filter(s => s !== start.shape)); end.color = getRandomItem(COLORS.filter(c => c !== start.color)); }
  let activeCode = '';
  if (result === 'MATCH_COLOR') activeCode = codeColor; else if (result === 'MATCH_SHAPE') activeCode = codeShape; else if (result === 'EXACT') activeCode = codeExact; else activeCode = getRandomItem([codeColor, codeShape, codeExact]);
  return { stim: { type: 'FLUX_FEATURE', dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', visuals: { start, end }, textQuery: `VERIFY: ${activeCode}`, logicProof: `(Color: ${start.color===end.color?'=':'!='}) & (Shape: ${start.shape===end.shape?'=':'!='})` }, result };
};

// 2. FLUX COMPARISON
const generateFluxComparison = (prevResult: string | null, forceMatch: boolean): { stim: StimulusData, result: string } => {
  const relations = ['GREATER', 'LESSER'];
  let result = getRandomItem(relations);
  if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult;
  else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
  const items = shuffleArray(['A', 'B', 'C']); const hub = items[0]; const leaf1 = items[1]; const leaf2 = items[2];
  const visualSwap = Math.random() > 0.5; const visualLeft = visualSwap ? leaf2 : leaf1; const visualRight = visualSwap ? leaf1 : leaf2;
  const colorOptions = [{ name: 'RED', class: 'from-red-900/40 to-red-900/10' }, { name: 'BLUE', class: 'from-blue-900/40 to-blue-900/10' }, { name: 'GREEN', class: 'from-emerald-900/40 to-emerald-900/10' }, { name: 'PURPLE', class: 'from-purple-900/40 to-purple-900/10' }];
  const c1 = getRandomItem(colorOptions); const c2 = getRandomItem(colorOptions.filter(c => c.name !== c1.name));
  const iconBase = getRandomItem(ICONS); const meaning1 = Math.random() > 0.5 ? '>' : '<'; const meaning2 = meaning1 === '>' ? '<' : '>';   
  const dict = shuffleEntries({ [`${iconBase} (${c1.name})`]: meaning1, [`${iconBase} (${c2.name})`]: meaning2 });
  let targetRel1 = result === 'GREATER' ? '>' : '<'; let targetRel2 = result === 'GREATER' ? '<' : '>'; 
  const colorForLeaf1 = meaning1 === targetRel1 ? c1 : c2; const colorForLeaf2 = meaning2 === targetRel2 ? c2 : c1;
  const visualLeftColor = visualSwap ? colorForLeaf2 : colorForLeaf1; const visualRightColor = visualSwap ? colorForLeaf1 : colorForLeaf2;
  return { stim: { type: 'FLUX_COMPARISON', dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', contextColors: [visualLeftColor.class, visualRightColor.class], visuals: { hub, leftLeaf: visualLeft, rightLeaf: visualRight, icon: iconBase, isSwapped: visualSwap }, textQuery: `DERIVE: ${leaf1} vs ${leaf2}`, logicProof: result === 'GREATER' ? `(${leaf1} > ${hub} > ${leaf2})` : `(${leaf1} < ${hub} < ${leaf2})` }, result };
};

// 3. FLUX OPPOSITION
const generateFluxOpposition = (prevResult: string | null, forceMatch: boolean): { stim: StimulusData, result: string } => {
  const relations = ['SAME', 'OPPOSITE', 'DIFFERENT']; let result = getRandomItem(relations);
  if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult;
  else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
  const pool = ['A', 'B', 'C', 'X', 'Y', 'Z', 'J', 'K', 'L']; const nodes = shuffleArray(pool).slice(0, 3); const n1 = nodes[0]; const n2 = nodes[1]; const n3 = nodes[2];
  const c1 = getRandomItem(ICONS); const c2 = getRandomItem(ICONS.filter(i => i !== c1)); const c3 = getRandomItem(ICONS.filter(i => ![c1, c2].includes(i))); const c4 = getRandomItem(ICONS.filter(i => ![c1, c2, c3].includes(i))); const cNeutral = getRandomItem(ICONS.filter(i => ![c1, c2, c3, c4].includes(i)));
  const dict = shuffleEntries({ [c1]: 'IDENTICAL', [c2]: 'IDENTICAL', [c3]: 'INVERT', [c4]: 'INVERT', [cNeutral]: 'NEUTRAL' });
  const sameIcons = [c1, c2]; const oppIcons = [c3, c4]; let link1Type = 'SAME', link2Type = 'SAME';
  if (result === 'DIFFERENT') { if (Math.random() > 0.5) { link1Type = 'NEUTRAL'; link2Type = Math.random() > 0.5 ? 'SAME' : 'OPP'; } else { link2Type = 'NEUTRAL'; link1Type = Math.random() > 0.5 ? 'SAME' : 'OPP'; } } 
  else if (result === 'SAME') { link1Type = Math.random() > 0.5 ? 'SAME' : 'OPP'; link2Type = link1Type; } 
  else { link1Type = Math.random() > 0.5 ? 'SAME' : 'OPP'; link2Type = link1Type === 'SAME' ? 'OPP' : 'SAME'; }
  const getIcon = (type: string) => { if (type === 'NEUTRAL') return cNeutral; if (type === 'SAME') return getRandomItem(sameIcons); return getRandomItem(oppIcons); };
  const icon1 = getIcon(link1Type); const icon2 = getIcon(link2Type);
  const isSwapped = Math.random() > 0.5; const visualChain = isSwapped ? [ { l: n3, icon: icon2, r: n2 }, { l: n2, icon: icon1, r: n1 } ] : [ { l: n1, icon: icon1, r: n2 }, { l: n2, icon: icon2, r: n3 } ];
  return { stim: { type: 'FLUX_OPPOSITION', dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', visuals: { chain: visualChain }, textQuery: `DERIVE: ${n1} vs ${n3}`, logicProof: `${link1Type} + ${link2Type} = ${result}` }, result };
};

// 4. FLUX HIERARCHY (Strict Polysemy + Query Reversal)
const generateFluxHierarchy = (prevResult: string | null, forceMatch: boolean): { stim: StimulusData, result: string } => {
    const relations = ['HIGHER', 'LOWER', 'SAME'];
    let result = getRandomItem(relations); // This is the ANSWER the user must arrive at
    
    if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult;
    else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
  
    // 1. Generate 4 Unique Symbols
    const c1 = getRandomItem(ICONS);
    const c2 = getRandomItem(ICONS.filter(i => i !== c1));
    const c3 = getRandomItem(ICONS.filter(i => ![c1, c2].includes(i)));
    const c4 = getRandomItem(ICONS.filter(i => ![c1, c2, c3].includes(i)));

    const dict = shuffleEntries({ 
        [c1]: 'PARENT_OF', 
        [c2]: 'PARENT_OF', 
        [c3]: 'CHILD_OF', 
        [c4]: 'CHILD_OF' 
    });

    const parentIcons = [c1, c2];
    const childIcons = [c3, c4];

    // SCRAMBLE LABELS
    const pool = ['A', 'B', 'C', 'X', 'Y', 'Z', 'J', 'K', 'L', 'Q', 'R', 'S'];
    const nodes = shuffleArray(pool).slice(0, 3); 
    // nodes[0]=Left, nodes[1]=Pivot, nodes[2]=Right

    // 2. DECIDE QUERY DIRECTION (The Reversal Logic)
    // Normal: Ask Left vs Right.
    // Reverse: Ask Right vs Left.
    const isReverseQuery = Math.random() > 0.5;

    // 3. CALCULATE REQUIRED VISUAL RELATION
    // If we want the answer to be HIGHER, but we are asking in REVERSE...
    // The Visuals must show LOWER. (If C > A, then A < C).
    
    let requiredVisual = result;
    if (isReverseQuery) {
        if (result === 'HIGHER') requiredVisual = 'LOWER';
        else if (result === 'LOWER') requiredVisual = 'HIGHER';
        // SAME remains SAME
    }

    // 4. SETUP LINKS BASED ON REQUIRED VISUAL
    let link1Type = 0;
    let link2Type = 0; 

    if (requiredVisual === 'HIGHER') { link1Type = 1; link2Type = 1; }
    else if (requiredVisual === 'LOWER') { link1Type = -1; link2Type = -1; }
    else { 
        if (Math.random() > 0.5) { link1Type = -1; link2Type = 1; } 
        else { link1Type = 1; link2Type = -1; } 
    }

    // Select Icons
    const iconAB = link1Type === 1 ? getRandomItem(parentIcons) : getRandomItem(childIcons);
    const poolBC = link2Type === 1 ? parentIcons : childIcons; 
    const iconBC = getRandomItem(poolBC.filter(i => i !== iconAB));

    // Construct the Query String
    const queryText = isReverseQuery 
        ? `GENERATION: ${nodes[2]} vs ${nodes[0]}` // Right vs Left
        : `GENERATION: ${nodes[0]} vs ${nodes[2]}`; // Left vs Right

    // Proof string for feedback
    // Show net visual, then apply reversal if needed
    const visualNet = link1Type + link2Type;
    const proofString = isReverseQuery
        ? `Visual(${visualNet > 0 ? '+2' : (visualNet < 0 ? '-2' : '0')}) * Flip = ${result}`
        : `Net: ${visualNet > 0 ? '+2' : (visualNet < 0 ? '-2' : '0')} = ${result}`;

    return {
        stim: {
            type: 'FLUX_HIERARCHY',
            dictionary: dict,
            dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT',
            visuals: { nodes, linkAB: iconAB, linkBC: iconBC }, 
            textQuery: queryText, 
            logicProof: proofString
        },
        result // This is the user's N-Back target
    };
};

// 5. FLUX CAUSAL
const generateFluxCausal = (prevResult: string | null, forceMatch: boolean): { stim: StimulusData, result: string } => {
    const relations = ['TRIGGER', 'BLOCK']; let result = getRandomItem(relations);
    if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult; else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
    const codeAct1 = generateCode([]); const codeAct2 = generateCode([codeAct1]); const codeInh1 = generateCode([codeAct1, codeAct2]); const codeInh2 = generateCode([codeAct1, codeAct2, codeInh1]);
    const dict = shuffleEntries({ [codeAct1]: 'ACTIVATE', [codeAct2]: 'ACTIVATE', [codeInh1]: 'INHIBIT', [codeInh2]: 'INHIBIT' });
    const acts = [codeAct1, codeAct2]; const inhs = [codeInh1, codeInh2];
    const pool = ['A', 'B', 'C', 'X', 'Y', 'Z', 'P', 'Q', 'R']; const nodes = shuffleArray(pool).slice(0, 3); const n1 = nodes[0], n2 = nodes[1], n3 = nodes[2]; 
    let link1 = Math.random() > 0.5 ? 1 : -1; let link2 = result === 'TRIGGER' ? link1 : -link1;
    const op1 = link1 === 1 ? getRandomItem(acts) : getRandomItem(inhs); const pool2 = link2 === 1 ? acts : inhs; const op2 = getRandomItem(pool2.filter(op => op !== op1));
    const isReverse = Math.random() > 0.5;
    return { stim: { type: 'FLUX_CAUSAL', dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', visuals: { nodes: [n1, n2, n3], ops: [op1, op2], isReverse }, textQuery: `NET EFFECT: ${n1} on ${n3}`, logicProof: `${link1===1?'+':'-'} * ${link2===1?'+':'-'} = ${result==='TRIGGER'?'+':'-'}` }, result };
};

// 6. FLUX SPATIAL
const generateFluxSpatial = (prevResult: string | null, forceMatch: boolean): { stim: StimulusData, result: string } => {
    const relations = ['NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST']; let result = getRandomItem(relations);
    if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult; else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
    const codeN = generateCode([]); const codeS = generateCode([codeN]); const codeE = generateCode([codeN, codeS]); const codeW = generateCode([codeN, codeS, codeE]);
    const dict = shuffleEntries({ [codeN]: 'NORTH', [codeS]: 'SOUTH', [codeE]: 'EAST', [codeW]: 'WEST' });
    let moves: string[] = []; 
    if (result === 'NORTH_EAST') moves = [codeN, codeE]; if (result === 'NORTH_WEST') moves = [codeN, codeW]; if (result === 'SOUTH_EAST') moves = [codeS, codeE]; if (result === 'SOUTH_WEST') moves = [codeS, codeW];
    moves = shuffleArray(moves);
    return { stim: { type: 'FLUX_SPATIAL', dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', visuals: { sequence: moves }, textQuery: 'NET VECTOR FROM START', logicProof: `Sum(${moves.join(', ')}) = ${result}` }, result };
};

// 7. FLUX DEICTIC
const generateFluxDeictic = (prevResult: string | null, forceMatch: boolean): { stim: StimulusData, result: string } => {
  const relations = ['LEFT', 'RIGHT', 'FRONT', 'BACK']; let result = getRandomItem(relations);
  if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult; else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
  const codeMe = generateCode([]); const codeYou = generateCode([codeMe]); const dict = shuffleEntries({ [codeMe]: 'ME (SAME)', [codeYou]: 'YOU (OPPOSITE)' });
  const timeFrame = Math.random() > 0.5 ? 'NOW' : 'THEN';
  let activeCode = Math.random() > 0.5 ? codeMe : codeYou; let activeFace = getRandomItem(['NORTH', 'EAST', 'SOUTH', 'WEST']);
  const dirMap = { 'NORTH': 0, 'EAST': 1, 'SOUTH': 2, 'WEST': 3 }; const faceIdx = dirMap[activeFace as keyof typeof dirMap];
  const idShift = activeCode === codeMe ? 0 : 2; const timeShift = timeFrame === 'NOW' ? 0 : 1; const totalShift = idShift + timeShift;
  const effectiveFaceIdx = (faceIdx + totalShift) % 4;
  let offset = 0; if (result === 'RIGHT') offset = 1; if (result === 'BACK') offset = 2; if (result === 'LEFT') offset = 3;
  const targetAbsIdx = (effectiveFaceIdx + offset) % 4; const targetAbsDir = DIRECTIONS[targetAbsIdx];
  let targetPos = 4; if (targetAbsDir === 'NORTH') targetPos = 1; if (targetAbsDir === 'EAST') targetPos = 5; if (targetAbsDir === 'SOUTH') targetPos = 7; if (targetAbsDir === 'WEST') targetPos = 3;
  return { stim: { type: 'FLUX_DEICTIC', dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', visuals: { activeCode, activeFace, activePos: 4, targetPos, timeFrame, effectiveFaceIdx }, textQuery: `PERSPECTIVE: ${activeCode} (${timeFrame})`, logicProof: `${activeCode} at ${activeFace} + ${timeFrame} = Target` }, result };
};

// 8. FLUX CONDITIONAL
const generateFluxConditional = (prevResult: string | null, forceMatch: boolean): { stim: StimulusData, result: string } => {
    const relations = ['RED', 'BLUE']; let result = getRandomItem(relations);
    if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult; else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
    const startColor = Math.random() > 0.5 ? 'RED' : 'BLUE'; let needsInvert = startColor !== result;
    const codeKeep = generateCode([]); const codeInvert = generateCode([codeKeep]); const modifierCode = needsInvert ? codeInvert : codeKeep;
    const dict = shuffleEntries({ [codeKeep]: 'KEEP_COLOR', [codeInvert]: 'INVERT_COLOR' });
    return { stim: { type: 'FLUX_CONDITIONAL', dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', visuals: { startColor, modifier: modifierCode }, textQuery: 'DETERMINE FINAL COLOR', logicProof: `${startColor} + ${modifierCode} = ${result}` }, result };
};

// 9. FLUX ANALOGY
const generateFluxAnalogy = (prevResult: string | null, forceMatch: boolean): { stim: StimulusData, result: string } => {
    const relations = ['ANALOGOUS', 'NON_ANALOGOUS']; let result = getRandomItem(relations);
    if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult; else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
    const c1 = generateCode([]); const c2 = generateCode([c1]); const c3 = generateCode([c1, c2]); const c4 = generateCode([c1, c2, c3]);
    const dict = shuffleEntries({ [c1]: 'CAUSES', [c2]: 'CAUSES', [c3]: 'PREVENTS', [c4]: 'PREVENTS' });
    const rel1 = Math.random() > 0.5 ? 'CAUSES' : 'PREVENTS'; let rel2 = result === 'ANALOGOUS' ? rel1 : (rel1 === 'CAUSES' ? 'PREVENTS' : 'CAUSES');
    const sym1 = rel1 === 'CAUSES' ? (Math.random()>0.5?c1:c2) : (Math.random()>0.5?c3:c4);
    const sym2 = rel2 === 'CAUSES' ? (Math.random()>0.5?c1:c2) : (Math.random()>0.5?c3:c4);
    return { stim: { type: 'FLUX_ANALOGY', dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', visuals: { net1: { left: 'A', op: sym1, right: 'B' }, net2: { left: 'X', op: sym2, right: 'Y' } }, textQuery: 'RELATION MATCH?', logicProof: `${rel1} vs ${rel2} = ${result}` }, result }
};

// --- Helpers ---

// Entropy Timer Cost Function
const getComplexityCost = (stim: StimulusData): number => {
  switch (stim.type) {
    case 'FLUX_FEATURE': return 1;
    case 'FLUX_COMPARISON': return 2;
    case 'FLUX_OPPOSITION': return 2;
    case 'FLUX_HIERARCHY': return 3;
    case 'FLUX_CAUSAL': return 3;
    case 'FLUX_SPATIAL': return 3;
    case 'FLUX_DEICTIC': return stim.visuals.timeFrame === 'THEN' ? 6 : 4;
    case 'FLUX_CONDITIONAL': return 5;
    case 'FLUX_ANALOGY': return 5;
    default: return 1;
  }
};

const BlurredLogicBox = ({ label, result, proof, isCurrent, revealOverride }: { label: string, result: string, proof: string, isCurrent?: boolean, revealOverride?: boolean }) => {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { setRevealed(false); }, [result, proof]);
  // If override is true, force reveal
  const isVisible = revealOverride || revealed;

  return (
    <button onClick={() => setRevealed(true)} className={`mt-auto w-full text-center relative group transition-all duration-200 text-left ${isCurrent ? 'p-3 bg-black rounded-xl border border-slate-700 shadow-lg' : 'p-2 bg-slate-950 rounded-xl border border-slate-800'}`}>
       <div className="text-[10px] text-slate-600 uppercase font-bold tracking-wider mb-1 flex justify-between items-center px-1"><span>{label}</span>{!isVisible && <EyeOff className="w-3 h-3 opacity-50" />}{isVisible && <Eye className="w-3 h-3 opacity-50 text-emerald-500" />}</div>
       <div className={`transition-all duration-300 ${isVisible ? 'blur-none' : 'blur-md select-none opacity-50'}`}><div className={`font-black ${isCurrent ? 'text-2xl text-white' : 'text-lg text-slate-300'}`}>{result}</div><div className={`text-[10px] mt-1 font-mono p-1 rounded border ${isCurrent ? 'text-purple-400 bg-slate-900 border-slate-800' : 'text-slate-600 bg-black/50 border-transparent'}`}>{proof}</div></div>
       {!isVisible && (<div className="absolute inset-0 flex items-center justify-center z-10"><div className="bg-slate-900/90 border border-slate-700 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 uppercase shadow-xl group-hover:text-white group-hover:border-slate-500 transition-colors">Click to Reveal</div></div>)}
    </button>
  );
};

const VisualRenderer: React.FC<{ stim: StimulusData, isRepairMode?: boolean }> = ({ stim, isRepairMode }) => {
  const [revealHint, setRevealHint] = useState(false);
  useEffect(() => { setRevealHint(false); }, [stim]);
  
  // In Repair Mode, force the hint to be visible for Deictic
  const showHint = revealHint || (isRepairMode && stim.type === 'FLUX_DEICTIC');

  if (stim.type === 'FLUX_FEATURE') {
    const { start, end } = stim.visuals;
    const ShapeIcon = ({s}: {s:any}) => {
       const colorMap: any = { RED: 'text-red-500', BLUE: 'text-blue-500', GREEN: 'text-emerald-500', YELLOW: 'text-yellow-400' };
       const c = colorMap[s.color];
       const sz = "w-24 h-24 md:w-32 md:h-32 transition-all filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]";
       let icon = <div className={`${c} ${sz} bg-current rounded-none opacity-90`} />;
       if (s.shape === 'CIRCLE') icon = <div className={`${c} ${sz} bg-current rounded-full opacity-90`} />;
       else if (s.shape === 'TRIANGLE') icon = <div className={`${c} ${sz} w-0 h-0 border-l-[48px] border-r-[48px] border-b-[96px] md:border-l-[64px] md:border-r-[64px] md:border-b-[128px] border-l-transparent border-r-transparent border-b-current opacity-90`} />;
       else if (s.shape === 'DIAMOND') icon = <div className={`${c} ${sz} rotate-45 bg-current rounded-sm opacity-90`} />;
       return (<div className="flex flex-col items-center gap-2">{icon}<div className="flex gap-2 text-[10px] md:text-xs font-mono text-slate-500 uppercase tracking-widest bg-black/40 px-2 py-1 rounded"><span>{s.color}</span><span className="text-slate-700">|</span><span>{s.shape}</span></div></div>);
    };
    return (<div className="flex items-center gap-8 md:gap-16"><div className="p-4 md:p-8 bg-slate-800/50 rounded-[2rem] border border-slate-700 backdrop-blur-sm"><ShapeIcon s={start} /></div><div className="flex flex-col items-center gap-1"><div className="h-px w-12 bg-slate-600"></div><Scan className="w-6 h-6 text-slate-500" /><div className="h-px w-12 bg-slate-600"></div></div><div className="p-4 md:p-8 bg-slate-800/50 rounded-[2rem] border border-slate-700 backdrop-blur-sm"><ShapeIcon s={end} /></div></div>);
  }

  if (stim.type === 'FLUX_COMPARISON') {
    const { hub, leftLeaf, rightLeaf, icon } = stim.visuals;
    const { contextColors } = stim;
    return (<div className="flex flex-col gap-4 w-full items-center justify-center"><div className="relative flex items-center gap-2 md:gap-4 bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden px-6 py-6 md:px-12 md:py-8 w-full max-w-lg">{contextColors && (<div className="absolute inset-0 flex z-0"><div className={`w-1/2 h-full bg-gradient-to-r ${contextColors[0]}`}></div><div className={`w-1/2 h-full bg-gradient-to-l ${contextColors[1]}`}></div></div>)}<div className="relative z-10 flex flex-col items-center gap-2 flex-1"><div className="text-3xl md:text-5xl font-black text-white drop-shadow-md">{leftLeaf}</div></div><div className="relative z-10 w-10 h-10 md:w-12 md:h-12 bg-black/80 border border-slate-500 rounded-lg flex items-center justify-center text-yellow-400 text-xl md:text-2xl shadow-xl">{icon}</div><div className="relative z-10 w-16 h-16 md:w-24 md:h-24 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center text-3xl md:text-5xl font-black text-black shadow-2xl mx-2">{hub}</div><div className="relative z-10 w-10 h-10 md:w-12 md:h-12 bg-black/80 border border-slate-500 rounded-lg flex items-center justify-center text-yellow-400 text-xl md:text-2xl shadow-xl">{icon}</div><div className="relative z-10 flex flex-col items-center gap-2 flex-1"><div className="text-3xl md:text-5xl font-black text-white drop-shadow-md">{rightLeaf}</div></div></div></div>);
  }

  if (stim.type === 'FLUX_OPPOSITION') {
    const { chain } = stim.visuals;
    return (<div className="flex flex-col gap-4 w-full items-center scale-75 md:scale-100"><div className="flex items-center gap-0"><div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center font-bold text-white z-10 text-xl">{chain[0].l}</div><div className="w-24 h-8 md:w-32 md:h-10 bg-slate-800 border-y-2 border-slate-700 flex items-center justify-center -mx-2"><span className="text-purple-400 font-bold text-2xl">{chain[0].icon}</span></div><div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center font-bold text-slate-500 z-10 text-xl">{chain[0].r}</div><div className="w-24 h-8 md:w-32 md:h-10 bg-slate-800 border-y-2 border-slate-700 flex items-center justify-center -mx-2"><span className="text-purple-400 font-bold text-2xl">{chain[1].icon}</span></div><div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center font-bold text-white z-10 text-xl">{chain[1].r}</div></div></div>);
  }

  if (stim.type === 'FLUX_HIERARCHY') {
      const { nodes, linkAB, linkBC } = stim.visuals;
      return (<div className="relative flex items-end justify-center h-48 w-64 md:w-80 gap-8 md:gap-16"><div className="z-10 w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-full border-2 border-slate-600 flex items-center justify-center text-xl md:text-2xl font-black text-white shadow-lg">{nodes[0]}</div><div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-14 h-14 md:w-16 md:h-16 bg-slate-900 rounded-full border-2 border-purple-500/50 flex items-center justify-center text-xl md:text-2xl font-black text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]">{nodes[1]}</div><div className="z-10 w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-full border-2 border-slate-600 flex items-center justify-center text-xl md:text-2xl font-black text-white shadow-lg">{nodes[2]}</div><svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"><line x1="20%" y1="80%" x2="50%" y2="20%" stroke="#475569" strokeWidth="2" /><line x1="80%" y1="80%" x2="50%" y2="20%" stroke="#475569" strokeWidth="2" /></svg><div className="absolute top-[40%] left-[30%] -translate-x-1/2 -translate-y-1/2 bg-black border border-slate-700 rounded px-1.5 py-0.5 z-20"><span className="text-emerald-400 text-lg md:text-xl font-bold">{linkAB}</span></div><div className="absolute top-[40%] right-[30%] translate-x-1/2 -translate-y-1/2 bg-black border border-slate-700 rounded px-1.5 py-0.5 z-20"><span className="text-emerald-400 text-lg md:text-xl font-bold">{linkBC}</span></div></div>)
  }

  if (stim.type === 'FLUX_CAUSAL') {
      const { nodes, ops, isReverse } = stim.visuals;
      const renderNodes = isReverse ? [...nodes].reverse() : nodes;
      const renderOps = isReverse ? [...ops].reverse() : ops;
      const arrowRotation = isReverse ? 'rotate-180' : '';
      return (<div className="flex flex-row items-center gap-2 md:gap-4 scale-75 md:scale-100"><div className="px-4 py-3 bg-slate-800 rounded-lg text-white font-bold border border-slate-600 shadow-lg">{renderNodes[0]}</div><ArrowRight className={`text-slate-500 w-6 h-6 ${arrowRotation}`}/><div className="w-12 h-12 border-2 border-slate-600 bg-black rounded flex items-center justify-center text-purple-400 font-bold text-xl shadow-[0_0_10px_rgba(168,85,247,0.2)]">{renderOps[0]}</div><ArrowRight className={`text-slate-500 w-6 h-6 ${arrowRotation}`}/><div className="px-3 py-2 bg-slate-900 text-slate-400 text-sm rounded border border-slate-800 font-mono">{renderNodes[1]}</div><ArrowRight className={`text-slate-500 w-6 h-6 ${arrowRotation}`}/><div className="w-12 h-12 border-2 border-slate-600 bg-black rounded flex items-center justify-center text-purple-400 font-bold text-xl shadow-[0_0_10px_rgba(168,85,247,0.2)]">{renderOps[1]}</div><ArrowRight className={`text-slate-500 w-6 h-6 ${arrowRotation}`}/><div className="px-4 py-3 bg-slate-800 rounded-lg text-white font-bold border border-slate-600 shadow-lg">{renderNodes[2]}</div></div>)
  }

  if (stim.type === 'FLUX_SPATIAL') {
      const { sequence } = stim.visuals;
      return (<div className="flex flex-col items-center gap-6"><div className="flex items-center gap-3"><Compass className="w-8 h-8 text-emerald-400 animate-pulse" /><div className="text-slate-500 font-mono text-sm uppercase">Origin: (0,0)</div></div><div className="flex gap-4">{sequence.map((code: string, i: number) => (<div key={i} className="flex flex-col items-center gap-2"><div className="text-xs text-slate-600 font-bold">Step {i+1}</div><div className="w-16 h-16 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-purple-400 font-black text-xl shadow-lg">{code}</div></div>))}</div><div className="text-xs text-slate-500 font-mono">Calculate Final Vector</div></div>)
  }

  if (stim.type === 'FLUX_DEICTIC') {
    const cells = Array(9).fill(null);
    const { activeFace, activeCode, activePos, targetPos, timeFrame, effectiveFaceIdx } = stim.visuals;
    const rot = { 'NORTH': 'rotate-0', 'EAST': 'rotate-90', 'SOUTH': 'rotate-180', 'WEST': '-rotate-90' }[activeFace as string];
    const dirNames = ['N', 'E', 'S', 'W']; const currentViewDir = dirNames[effectiveFaceIdx];
    return (<div className="flex flex-col items-center gap-4"><div className="relative"><div className="grid grid-cols-3 gap-1 md:gap-3 p-2 bg-slate-800 rounded-2xl border border-slate-700 shadow-inner">{cells.map((_, i) => (<div key={i} className="w-8 h-8 md:w-20 md:h-20 bg-slate-900 rounded-lg md:rounded-xl flex items-center justify-center relative transition-all">{i === targetPos && <div className="w-2 h-2 md:w-6 md:h-6 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-500/50" />}{i === activePos && (<div className={`transform transition-all ${rot}`}><div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] md:border-l-[16px] md:border-r-[16px] md:border-b-[32px] border-l-transparent border-r-transparent border-b-emerald-500 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /><div className="absolute -top-4 md:-top-8 left-1/2 -translate-x-1/2 text-[8px] md:text-xs font-bold text-purple-300 bg-black/80 px-1 rounded">{activeCode}</div></div>)}</div>))}</div><button onClick={() => setRevealHint(true)} className="absolute -right-16 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-600 p-2 rounded flex flex-col items-center cursor-pointer hover:border-slate-400 transition-colors group" title="Click to Reveal Answer"><div className="text-[10px] text-slate-500 uppercase group-hover:text-slate-300 transition-colors">View</div><div className={`text-xl font-black text-white transition-all duration-300 ${showHint ? 'blur-none' : 'blur-md select-none'}`}>{currentViewDir}</div>{!showHint && <HelpCircle className="w-3 h-3 text-slate-600 mt-1 absolute bottom-1" />}</button></div><div className="flex items-center gap-4 text-xs font-mono bg-slate-900/50 p-2 rounded"><div className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400"/><span className={timeFrame === 'THEN' ? 'text-red-400' : 'text-emerald-400'}>{timeFrame}</span></div><span className="text-slate-600">|</span><div className="text-slate-400">Target is to my...?</div></div></div>);
  }

  if (stim.type === 'FLUX_CONDITIONAL') {
      const { startColor, modifier } = stim.visuals;
      return (<div className="flex flex-col items-center gap-6"><div className="flex items-center gap-4"><div className={`w-20 h-20 rounded-full border-4 border-slate-700 shadow-xl ${startColor === 'RED' ? 'bg-red-600' : 'bg-blue-600'}`}></div><ArrowRight className="w-8 h-8 text-slate-500" /><div className="flex flex-col items-center gap-2"><div className="text-xs text-slate-500 font-bold uppercase">Apply Rule</div><div className="w-20 h-20 bg-slate-900 border border-slate-600 rounded-xl flex items-center justify-center text-yellow-400 font-black text-xl shadow-lg">{modifier}</div></div><ArrowRight className="w-8 h-8 text-slate-500" /><div className="w-20 h-20 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 font-bold text-4xl">?</div></div></div>)
  }

  if (stim.type === 'FLUX_ANALOGY') {
      const { net1, net2 } = stim.visuals;
      const NetBlock = ({n}: {n:any}) => (<div className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700"><span className="font-bold text-white">{n.left}</span><ArrowRight className="w-3 h-3 text-slate-500"/><span className="text-yellow-400 font-bold text-xl">{n.op}</span><ArrowRight className="w-3 h-3 text-slate-500"/><span className="font-bold text-white">{n.right}</span></div>);
      return (<div className="flex flex-col items-center gap-4"><NetBlock n={net1} /><div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-widest"><Split className="w-4 h-4" /> Compare To</div><NetBlock n={net2} /></div>)
  }

  return null;
};

// --- Main Engine ---

export default function ProjectOmegaUltimate() {
  
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<GameConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('OMEGA_CONFIG_ULTIMATE');
      if (saved) return JSON.parse(saved);
    }
    return { nBackLevel: 1, baseTimer: 10, isPracticeMode: false };
  });

  const [realElo, setRealElo] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('OMEGA_REAL_ELO_ULTIMATE');
      return saved ? parseInt(saved, 10) : 1000;
    }
    return 1000;
  });

  const [activeElo, setActiveElo] = useState(1000);
  const [isButtonsFlipped, setIsButtonsFlipped] = useState(false);

  // --- REPAIR MODE STATES ---
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isRepairMode, setIsRepairMode] = useState(false);
  const [repairSuccesses, setRepairSuccesses] = useState(0);
  const [repairTargetType, setRepairTargetType] = useState<GeneratorType | null>(null);
  const [repairTargetResult, setRepairTargetResult] = useState<string>('');

  useEffect(() => { if (!config.isPracticeMode) setActiveElo(realElo); }, [config.isPracticeMode, realElo]);
  useEffect(() => { localStorage.setItem('OMEGA_REAL_ELO_ULTIMATE', realElo.toString()); }, [realElo]);
  useEffect(() => { localStorage.setItem('OMEGA_CONFIG_ULTIMATE', JSON.stringify(config)); }, [config]);

  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentItem, setCurrentItem] = useState<HistoryItem | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startTimeRef = useRef(0);
  const [tempConfig, setTempConfig] = useState<GameConfig>(config);
  
  const getPracticeEloFromType = (t?: GeneratorType) => {
      if (!t) return 1000;
      const map: Record<GeneratorType, number> = {
          'FLUX_FEATURE': 1000,
          'FLUX_COMPARISON': 1100,
          'FLUX_OPPOSITION': 1200,
          'FLUX_HIERARCHY': 1300,
          'FLUX_CAUSAL': 1400,
          'FLUX_SPATIAL': 1500,
          'FLUX_DEICTIC': 1600,
          'FLUX_CONDITIONAL': 1700,
          'FLUX_ANALOGY': 1800
      };
      return map[t];
  };

  const updateElo = (isCorrect: boolean) => {
    // Only update Elo if NOT in repair mode
    if (isRepairMode) return;
    
    const K = 10;
    const diff = Math.round(K * ((isCorrect ? 1 : 0) - 0.5));
    setActiveElo(p => Math.max(0, p + diff));
    if (!config.isPracticeMode) setRealElo(p => Math.max(0, p + diff));
  };

  const nextTurn = useCallback(() => {
    const n = config.nBackLevel;
    const histLen = history.length;
    if (histLen < n && phase !== 'WARMUP' && !isRepairMode) setPhase('WARMUP');
    if (histLen >= n && phase !== 'PLAYING' && !isRepairMode) setPhase('PLAYING');

    setIsButtonsFlipped(Math.random() > 0.5);

    let type: GeneratorType = 'FLUX_FEATURE';
    
    if (isRepairMode && repairTargetType) {
        // LOCK to the failed type
        type = repairTargetType;
    } else if (config.isPracticeMode && config.practiceType) {
        type = config.practiceType;
    } else {
        if (activeElo >= 1100) type = 'FLUX_COMPARISON';
        if (activeElo >= 1200) type = 'FLUX_OPPOSITION';
        if (activeElo >= 1300) type = 'FLUX_HIERARCHY';
        if (activeElo >= 1400) type = 'FLUX_CAUSAL';
        if (activeElo >= 1500) type = 'FLUX_SPATIAL';
        if (activeElo >= 1600) type = 'FLUX_DEICTIC';
        if (activeElo >= 1700) type = 'FLUX_CONDITIONAL';
        if (activeElo >= 1800) type = 'FLUX_ANALOGY';
    }

    // Generate Turn
    const shouldMatch = Math.random() > 0.5;
    // In Repair Mode, we don't have a valid n-back, so we pass null/false to generator
    // but we WILL enforce the match logic manually below
    const prevNItem = (!isRepairMode && histLen >= n) ? history[histLen - n] : null;
    const prevResult = prevNItem ? prevNItem.result : null;

    let turnData;
    switch(type) {
      case 'FLUX_FEATURE': turnData = generateFluxFeature(prevResult, shouldMatch); break;
      case 'FLUX_COMPARISON': turnData = generateFluxComparison(prevResult, shouldMatch); break;
      case 'FLUX_OPPOSITION': turnData = generateFluxOpposition(prevResult, shouldMatch); break;
      case 'FLUX_HIERARCHY': turnData = generateFluxHierarchy(prevResult, shouldMatch); break;
      case 'FLUX_CAUSAL': turnData = generateFluxCausal(prevResult, shouldMatch); break;
      case 'FLUX_SPATIAL': turnData = generateFluxSpatial(prevResult, shouldMatch); break;
      case 'FLUX_DEICTIC': turnData = generateFluxDeictic(prevResult, shouldMatch); break;
      case 'FLUX_CONDITIONAL': turnData = generateFluxConditional(prevResult, shouldMatch); break;
      case 'FLUX_ANALOGY': turnData = generateFluxAnalogy(prevResult, shouldMatch); break;
      default: turnData = generateFluxFeature(prevResult, shouldMatch);
    }

    const newItem: HistoryItem = { result: turnData.result, stimulus: turnData.stim };
    
    // REPAIR MODE LOGIC (Updated for Active Verification)
    if (isRepairMode) {
        const makeMatch = Math.random() > 0.5;
        
        if (makeMatch) {
            setRepairTargetResult(newItem.result);
        } else {
            // Generate a valid distractor for the current type
            let possible: string[] = [];
            switch(type) {
                case 'FLUX_FEATURE': possible = ['MATCH_COLOR', 'MATCH_SHAPE', 'EXACT', 'NONE']; break;
                case 'FLUX_COMPARISON': possible = ['GREATER', 'LESSER']; break;
                case 'FLUX_OPPOSITION': possible = ['SAME', 'OPPOSITE', 'DIFFERENT']; break;
                case 'FLUX_HIERARCHY': possible = ['HIGHER', 'LOWER', 'SAME']; break;
                case 'FLUX_CAUSAL': possible = ['TRIGGER', 'BLOCK']; break;
                case 'FLUX_SPATIAL': possible = ['NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST']; break;
                case 'FLUX_DEICTIC': possible = ['LEFT', 'RIGHT', 'FRONT', 'BACK']; break;
                case 'FLUX_CONDITIONAL': possible = ['RED', 'BLUE']; break;
                case 'FLUX_ANALOGY': possible = ['ANALOGOUS', 'NON_ANALOGOUS']; break;
                default: possible = [newItem.result]; 
            }
            // Pick a result that is NOT the true result
            const distractor = getRandomItem(possible.filter(r => r !== newItem.result));
            setRepairTargetResult(distractor || newItem.result); 
        }
    }

    setCurrentItem(newItem);
    setHistory(prev => [...prev, newItem]);
    setTurnCount(c => c + 1);
    
    // --- ENTROPY TIMER ---
    if (config.baseTimer === -1) { 
        setTimer(100); 
    } else {
      // Calculate Cost
      const cost = getComplexityCost(newItem.stimulus);
      const difficultyMod = Math.max(0, (activeElo - 1000) / 1000);
      // Formula: Base + (Cost * 0.5) - (Diff * 4) -> Ensure min 3s
      // Actually, we want time to INCREASE with cost.
      // Base (e.g. 10s) is usually fine. Let's ADD time for hard tasks.
      const extraTime = (cost - 1) * 1.5; // +1.5s per complexity point above 1
      const totalTime = Math.max(3, config.baseTimer + extraTime - (difficultyMod * 2));
      
      setTimer(totalTime);
    }
    
    startTimeRef.current = Date.now();
  }, [activeElo, history, config, phase, isRepairMode, repairTargetType]);

  const handleAnswer = useCallback((userMatch: boolean) => {
    
    // --- REPAIR MODE ANSWER LOGIC ---
  if (isRepairMode && currentItem) {
        // Logic: Does the displayed Target match the Actual Result?
        const isTargetActuallyTrue = currentItem.result === repairTargetResult;
        
        // User said MATCH (True) or NO (False). Did they get it right?
        const isCorrect = userMatch === isTargetActuallyTrue;
        
        if (isCorrect) {
            const newStreak = repairSuccesses + 1;
            setRepairSuccesses(newStreak);
            if (newStreak >= 3) {
                // Escape Repair Mode
                setIsRepairMode(false);
                setRepairTargetType(null);
                setConsecutiveFailures(0);
                setRepairSuccesses(0);
            }
        } else {
            setRepairSuccesses(0); // Reset streak on fail
        }
        
        // Log it (isMatch tracks if the Question was True, userAnswer tracks if they agreed)
        setLogs(prev => [{
            id: turnCount, timestamp: new Date().toLocaleTimeString(), elo: activeElo, 
            nBackItem: null, 
            currentItem: currentItem, userAnswer: userMatch, 
            isMatch: isTargetActuallyTrue, 
            isCorrect: isCorrect, reactionTime: Date.now() - startTimeRef.current,
            isRepair: true
        }, ...prev]);
        
        setPhase('FEEDBACK');
        return;
    }

    // --- STANDARD LOGIC ---
    const n = config.nBackLevel;
    if (history.length <= n) { nextTurn(); return; }
    const current = history[history.length - 1];
    const target = history[history.length - 1 - n];
    const isMatch = current.result === target.result;
    const isCorrect = userMatch === isMatch;
    
    // Check for failure streak
    if (!isCorrect) {
        setConsecutiveFailures(p => p + 1);
        if (consecutiveFailures + 1 >= 3) {
            // Trigger Repair
            setIsRepairMode(true);
            setRepairTargetType(current.stimulus.type);
            setRepairSuccesses(0);
        }
    } else {
        setConsecutiveFailures(0);
    }

    updateElo(isCorrect);
    setLogs(prev => [{
      id: turnCount, timestamp: new Date().toLocaleTimeString(), elo: activeElo, nBackItem: target, currentItem: current, userAnswer: userMatch, isMatch, isCorrect, reactionTime: Date.now() - startTimeRef.current
    }, ...prev]);
    setPhase('FEEDBACK');
  }, [config.nBackLevel, history, turnCount, activeElo, isRepairMode, repairSuccesses, consecutiveFailures, currentItem, nextTurn]); // Added dependencies

  const handleContinue = useCallback(() => {
     if (history.length < config.nBackLevel && !isRepairMode) setPhase('WARMUP');
     else setPhase('PLAYING');
     nextTurn();
  }, [history.length, config.nBackLevel, nextTurn, isRepairMode]);

  useEffect(() => {
    if ((phase === 'PLAYING' || phase === 'WARMUP') && timer > 0 && config.baseTimer !== -1) {
      timerRef.current = setInterval(() => {
        setTimer(t => { if (t <= 0.1) { if (phase === 'PLAYING') handleAnswer(false); else nextTurn(); return 0; } return t - 0.1; });
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, timer, config.baseTimer, handleAnswer, nextTurn]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (phase === 'PLAYING' || phase === 'WARMUP') {
            const isLeft = e.code === 'KeyD' || e.code === 'ArrowLeft';
            const isRight = e.code === 'KeyJ' || e.code === 'ArrowRight';
            if (!isLeft && !isRight) return;
            if (isButtonsFlipped) { if (isLeft) handleAnswer(true); else handleAnswer(false); } 
            else { if (isLeft) handleAnswer(false); else handleAnswer(true); }
        }
        if (phase === 'FEEDBACK' && e.code === 'Enter') handleContinue();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isButtonsFlipped, handleAnswer, handleContinue]);

  const init = () => { setHistory([]); setLogs([]); setTurnCount(0); setPhase('WARMUP'); setTimeout(nextTurn, 0); };
  const resetRealElo = () => { if (confirm("Reset ACTUAL Elo Rating to 1000?")) { setRealElo(1000); if (!config.isPracticeMode) setActiveElo(1000); setPhase('IDLE'); } };
  const openSettings = () => { setTempConfig(config); setShowSettings(true); };
  const saveSettings = () => { setConfig(tempConfig); if (tempConfig.isPracticeMode) setActiveElo(getPracticeEloFromType(tempConfig.practiceType)); else setActiveElo(realElo); setPhase('IDLE'); setHistory([]); setLogs([]); setShowSettings(false); };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-slate-200 font-sans flex flex-col p-2 md:p-4 selection:bg-purple-500/40 relative">
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0" style={{ backgroundImage: 'radial-gradient(circle at center, #1e1b4b 0%, #000 70%)' }} />
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-4 border-b border-slate-800 pb-2 z-10 px-2 flex-shrink-0">
        <div className="flex items-center gap-2"><div className="p-1.5 bg-white text-black font-black text-lg rounded shadow-[0_0_15px_rgba(255,255,255,0.3)]">Ω</div><div><div className="font-bold tracking-widest text-base md:text-lg leading-none">OMEGA</div><div className="text-[10px] text-slate-500 uppercase font-mono hidden md:block leading-none">Ultimate RFT Engine</div></div></div>
        <div className="flex items-center gap-4 md:gap-8 text-xs font-mono uppercase"><div className="text-right"><div className="text-slate-500 text-[10px]">{config.isPracticeMode ? 'PRAC ELO' : 'REAL ELO'}</div><div className={`${config.isPracticeMode ? 'text-yellow-400' : 'text-emerald-400'} font-bold text-base flex items-center gap-2 justify-end`}>{activeElo} {!config.isPracticeMode && (<button onClick={resetRealElo} className="opacity-0 hover:opacity-100 transition-opacity text-red-500"><XCircle className="w-3 h-3"/></button>)}</div></div><button onClick={openSettings} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"><Settings className="w-5 h-5" /></button></div>
      </div>
      
      {/* REPAIR MODE BANNER */}
      {isRepairMode && (
          <div className="absolute top-16 left-0 w-full bg-red-900/90 text-white text-center py-1 text-xs font-bold uppercase tracking-widest z-50 animate-pulse border-y border-red-500">
              <Wrench className="w-3 h-3 inline mr-2"/> JAMMED GUN PROTOCOL: REPAIRING {repairTargetType?.replace('FLUX_', '')} ({repairSuccesses}/3)
          </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-purple-400"/> CONFIGURATION</h2><button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white"><XCircle className="w-6 h-6"/></button></div>
              <div className="flex flex-col gap-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">N-Back Level: <span className="text-white text-base ml-2">{tempConfig.nBackLevel}</span></label><input type="range" min="1" max="9" step="1" value={tempConfig.nBackLevel} onChange={(e) => setTempConfig(p => ({...p, nBackLevel: parseInt(e.target.value)}))} className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"/></div>
              <div className="flex flex-col gap-2"><div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Timer Base</label><div className="flex items-center gap-2"><span className={`text-xs ${tempConfig.baseTimer === -1 ? 'text-slate-600' : 'text-purple-400'}`}>INFINITE</span><button onClick={() => setTempConfig(p => ({...p, baseTimer: p.baseTimer === -1 ? 10 : -1}))} className={`w-10 h-5 rounded-full relative transition-colors ${tempConfig.baseTimer === -1 ? 'bg-purple-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${tempConfig.baseTimer === -1 ? 'left-6' : 'left-1'}`} /></button></div></div>{tempConfig.baseTimer !== -1 && (<input type="range" min="3" max="30" step="1" value={tempConfig.baseTimer} onChange={(e) => setTempConfig(p => ({...p, baseTimer: parseInt(e.target.value)}))} className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"/>)}</div><div className="h-px bg-slate-800 w-full my-2"/>
              <div className="flex flex-col gap-4"><div className="flex justify-between items-center"><div><div className="text-sm font-bold text-white">PRACTICE MODE</div></div><button onClick={() => setTempConfig(p => ({...p, isPracticeMode: !p.isPracticeMode}))} className={`w-12 h-6 rounded-full relative transition-colors ${tempConfig.isPracticeMode ? 'bg-yellow-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${tempConfig.isPracticeMode ? 'left-7' : 'left-1'}`} /></button></div>{tempConfig.isPracticeMode && (<div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col gap-3"><div className="flex justify-between items-center"><label className="text-xs font-bold text-yellow-500 uppercase">Select Frame</label><span className="text-xs text-slate-400 font-mono">Elo Locked</span></div><div className="grid grid-cols-2 gap-2">{[{ id: 'FLUX_FEATURE', label: 'Feature', elo: 1000 }, { id: 'FLUX_COMPARISON', label: 'Comparison', elo: 1100 }, { id: 'FLUX_OPPOSITION', label: 'Opposition', elo: 1200 }, { id: 'FLUX_HIERARCHY', label: 'Hierarchy', elo: 1300 }, { id: 'FLUX_CAUSAL', label: 'Causal', elo: 1400 }, { id: 'FLUX_SPATIAL', label: 'Spatial', elo: 1500 }, { id: 'FLUX_DEICTIC', label: 'Deictic', elo: 1600 }, { id: 'FLUX_CONDITIONAL', label: 'Conditional', elo: 1700 }, { id: 'FLUX_ANALOGY', label: 'Analogy', elo: 1800 }].map((mode) => (<button key={mode.id} onClick={() => setTempConfig(p => ({...p, practiceType: mode.id as GeneratorType}))} className={`text-[10px] md:text-xs font-bold p-2 rounded border transition-all ${tempConfig.practiceType === mode.id ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'}`}>{mode.label} <span className="opacity-50">({mode.elo})</span></button>))}</div></div>)}</div>
              <button onClick={saveSettings} className="mt-4 w-full py-3 bg-white text-black font-black rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> SAVE & RESTART</button>
           </div>
        </div>
      )}
      {/* Main */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 overflow-hidden">
        {phase === 'IDLE' && (<div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-3xl text-center shadow-2xl mx-auto w-full max-w-4xl animate-in fade-in zoom-in-95"><h1 className="text-3xl md:text-5xl font-black text-white mb-6">COGNITIVE FLUX</h1><p className="text-slate-400 text-sm md:text-base mb-10 leading-relaxed">Ultimate Relational Frame Training.<br/>Decode the <span className="text-purple-400 font-bold">Blind Cipher</span>. Match the Logic to N-{config.nBackLevel}.</p><div className="flex justify-center gap-6 mb-10 text-slate-500"><div className="flex flex-col items-center gap-2"><Cpu className="w-6 h-6"/><span>Cipher</span></div><div className="flex flex-col items-center gap-2"><Network className="w-6 h-6"/><span>Graph</span></div><div className="flex flex-col items-center gap-2"><BrainCircuit className="w-6 h-6"/><span>Logic</span></div></div><div className="text-xs text-slate-500 font-mono flex items-center justify-center gap-2 mb-8 bg-slate-950/50 p-2 rounded border border-slate-800"><Keyboard className="w-4 h-4"/> <span>Use Keys:</span><span className="bg-slate-800 px-1 rounded text-white">D / ←</span><span>or</span><span className="bg-slate-800 px-1 rounded text-white">J / →</span></div><button onClick={init} className="w-full py-5 bg-white text-black font-black tracking-widest rounded-xl hover:bg-slate-200 transition-transform hover:scale-[1.02] flex items-center justify-center gap-3 text-lg"><Zap className="w-5 h-5 fill-current"/> INITIALIZE</button></div>)}
        {(phase === 'WARMUP' || phase === 'PLAYING') && currentItem && (
          <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 gap-4 md:gap-8">
              <div className={`w-full flex-1 flex flex-col lg:flex-row gap-4 items-center justify-center min-h-0 ${currentItem.stimulus.dictionaryPos === 'RIGHT' ? 'lg:flex-row-reverse' : ''}`}>
                 <div className="flex-1 p-4 md:p-8 bg-slate-900 border border-slate-700 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center gap-4 w-full h-full max-h-[60vh]"><VisualRenderer stim={currentItem.stimulus} isRepairMode={isRepairMode} /><div className="bg-black px-4 py-2 rounded-lg text-slate-300 font-mono text-sm md:text-lg border border-slate-800 tracking-wider shadow-inner mt-4">{currentItem.stimulus.textQuery}</div></div>
                 <div className="w-full lg:w-64 flex flex-col gap-2 p-4 bg-slate-900/80 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-xl h-fit"><div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-2"><Code className="w-3 h-3 text-purple-400"/> Cipher Key</div>{Object.entries(currentItem.stimulus.dictionary).map(([k,v]) => (<div key={k} className="px-3 py-2 bg-black rounded-lg border border-slate-800 text-xs font-mono flex justify-between items-center group"><span className="text-purple-400 font-bold text-lg">{k}</span><span className="text-slate-600">=</span><span className="text-slate-200 font-bold">{v}</span></div>))}</div>
              </div>
              <div className="w-full flex flex-col gap-4 flex-shrink-0">
                 {config.baseTimer !== -1 ? (<div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-100 ease-linear ${timer<3?'bg-red-500':'bg-white'}`} style={{width: `${(timer/((config.baseTimer + (getComplexityCost(currentItem.stimulus)-1)*1.5) - (Math.max(0, (activeElo-1000)/1000)*2)))*100}%`}} /></div>) : (<div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner flex items-center justify-center"><div className="w-full h-full bg-slate-800 animate-pulse" /></div>)}
                 <div className="flex gap-4 w-full justify-center">
                     {/* IF REPAIR MODE: Force simple CONFIRM/FAIL */}
                     {isRepairMode ? (
                         <div className="flex flex-col items-center gap-4 w-full">
                             <div className="text-yellow-400 font-black text-xl uppercase tracking-widest bg-slate-900/80 px-6 py-2 rounded-xl border border-yellow-500/30">
                                 VERIFY: {repairTargetResult}
                             </div>
                             <div className="flex gap-4 w-full">
                                <button onClick={() => handleAnswer(false)} className="flex-1 py-4 bg-slate-900 border-2 border-red-900/50 text-red-500 font-black text-xl rounded-2xl hover:bg-red-900/20 transition-all shadow-lg active:scale-95">
                                    FALSE
                                    <div className="text-[10px] opacity-50 mt-1 font-mono">D / ←</div>
                                </button>
                                <button onClick={() => handleAnswer(true)} className="flex-1 py-4 bg-slate-900 border-2 border-emerald-900/50 text-emerald-500 font-black text-xl rounded-2xl hover:bg-emerald-900/20 transition-all shadow-lg active:scale-95">
                                    TRUE
                                    <div className="text-[10px] opacity-50 mt-1 font-mono">J / →</div>
                                </button>
                             </div>
                         </div>
                     ) : (
                         isButtonsFlipped ? (<><button onClick={() => handleAnswer(true)} className="flex-1 py-4 md:py-6 bg-slate-900 border-2 border-slate-800 text-slate-400 font-black text-xl md:text-2xl rounded-2xl hover:bg-slate-800 hover:text-emerald-400 hover:border-emerald-500/50 transition-all active:scale-95 shadow-lg group">MATCH<div className="text-[10px] text-slate-600 font-mono mt-1 group-hover:text-emerald-500/50 transition-colors">D / ←</div></button><button onClick={() => handleAnswer(false)} className="flex-1 py-4 md:py-6 bg-slate-900 border-2 border-slate-800 text-slate-400 font-black text-xl md:text-2xl rounded-2xl hover:bg-slate-800 hover:text-red-400 hover:border-red-500/50 transition-all active:scale-95 shadow-lg group">NO<div className="text-[10px] text-slate-600 font-mono mt-1 group-hover:text-red-500/50 transition-colors">J / →</div></button></>) : (<><button onClick={() => handleAnswer(false)} className="flex-1 py-4 md:py-6 bg-slate-900 border-2 border-slate-800 text-slate-400 font-black text-xl md:text-2xl rounded-2xl hover:bg-slate-800 hover:text-red-400 hover:border-red-500/50 transition-all active:scale-95 shadow-lg group">NO<div className="text-[10px] text-slate-600 font-mono mt-1 group-hover:text-red-500/50 transition-colors">D / ←</div></button><button onClick={() => handleAnswer(true)} className="flex-1 py-4 md:py-6 bg-slate-900 border-2 border-slate-800 text-slate-400 font-black text-xl md:text-2xl rounded-2xl hover:bg-slate-800 hover:text-emerald-400 hover:border-emerald-500/50 transition-all active:scale-95 shadow-lg group">MATCH<div className="text-[10px] text-slate-600 font-mono mt-1 group-hover:text-emerald-500/50 transition-colors">J / →</div></button></>)
                     )}
                 </div>
              </div>
          </div>
        )}
        {phase === 'FEEDBACK' && logs.length > 0 && logs[0].currentItem && (
          <div className="w-full h-full max-h-full flex flex-col animate-in zoom-in-95 overflow-hidden">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col h-full overflow-hidden">
                 <div className={`p-4 flex flex-shrink-0 justify-between items-center ${logs[0].isCorrect ? 'bg-emerald-950/30 text-emerald-400' : 'bg-red-950/30 text-red-400'} border-b border-slate-800`}><div className="flex items-center gap-3">{logs[0].isCorrect ? <CheckCircle className="w-6 h-6"/> : <XCircle className="w-6 h-6"/>}<h2 className="text-xl md:text-2xl font-black tracking-tight">{logs[0].isCorrect ? 'VERIFIED' : 'FAILED'}</h2></div><div className="text-xs font-mono opacity-70 bg-black/30 px-2 py-1 rounded">{Math.round(logs[0].reactionTime)}ms</div></div>
                 <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 min-h-0">
                    {/* Only show N-Back item if NOT repair mode */}
                    {!logs[0].isRepair && logs[0].nBackItem && (
                        <div className="p-4 flex flex-col items-center opacity-60 bg-slate-950/30"><div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800"><History className="w-3 h-3"/> N-{config.nBackLevel}</div><div className="mb-2 scale-[0.65] origin-center"><VisualRenderer stim={logs[0].nBackItem.stimulus} /></div><BlurredLogicBox label="Target Logic" result={logs[0].nBackItem.result} proof={logs[0].nBackItem.stimulus.logicProof} /></div>
                    )}
                    {/* Current Item */}
                    <div className={`p-4 flex flex-col items-center bg-slate-900/50 ${logs[0].isRepair ? 'col-span-2' : ''}`}><div className="text-[10px] font-bold text-emerald-500 uppercase mb-2 flex items-center gap-2 px-3 py-1 bg-emerald-900/10 rounded-full border border-emerald-500/20"><Activity className="w-3 h-3"/> Current</div><div className="mb-2 scale-[0.75] origin-center"><VisualRenderer stim={logs[0].currentItem.stimulus} isRepairMode={logs[0].isRepair} /></div><BlurredLogicBox label="Derived Logic" result={logs[0].currentItem.result} proof={logs[0].currentItem.stimulus.logicProof} isCurrent={true} revealOverride={logs[0].isRepair} /></div>
                 </div>
                 <div className="p-4 bg-slate-950 border-t border-slate-800 text-center flex flex-col items-center gap-3 flex-shrink-0">
                    {!logs[0].isRepair && (<div className="flex flex-col items-center gap-1"><div className="text-xs text-slate-400">Logic Check: <span className="text-white font-bold px-1">{logs[0].currentItem.result}</span> vs <span className="text-slate-400 font-bold px-1">{logs[0].nBackItem ? logs[0].nBackItem.result : '???'}</span></div><div className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-0.5 rounded-full ${logs[0].isMatch ? 'bg-blue-900/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>{logs[0].isMatch ? 'MATCH FOUND' : 'NO MATCH'}</div></div>)}
                    <button onClick={handleContinue} className="w-full py-4 bg-white text-black font-black text-lg tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-3 rounded-xl">CONTINUE <FastForward className="w-5 h-5 fill-current"/></button>
                    <div className="text-[10px] text-slate-500 font-mono mt-2">Press ENTER</div>
                 </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}