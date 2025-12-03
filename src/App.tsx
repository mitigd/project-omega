import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  History, CheckCircle, XCircle, Zap, FastForward, Code, 
  ArrowRight, Settings, Save, Activity, 
  BrainCircuit, Network, Cpu, Clock, Split, Scan, 
  Compass, HelpCircle, Eye, EyeOff, Wrench, BookOpen, 
  X, Ban 
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
  isNegated?: boolean; 
  tier: number; // Track complexity tier for debugging/scoring
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
  isRepair?: boolean; 
  timedOut?: boolean;
}

interface GameConfig {
  nBackLevel: number;
  baseTimer: number; 
  isPracticeMode: boolean;
  practiceType?: GeneratorType | 'MIXED';
}

// --- Generators Helpers ---

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

// --- ELO TIER CALCULATOR ---
const getTier = (elo: number): number => {
    if (elo < 1200) return 1;
    if (elo < 1500) return 2;
    return 3;
};

// --- Meta Modifier: Applies Negation Only (Tier 3 Only) ---
const applyMetaModifiers = (data: { stim: StimulusData, result: string }, tier: number): { stim: StimulusData, result: string } => {
    let { stim, result } = data;
    
    // NEGATION CURSE: Only active at Tier 3 (Mastery)
    if (tier >= 3 && Math.random() < 0.30) {
        let invertedResult = result;
        const opposites: Record<string, string> = {
            'GREATER': 'LESSER', 'LESSER': 'GREATER',
            'SAME': 'OPPOSITE', 'OPPOSITE': 'SAME', 'DIFFERENT': 'SAME', 
            'HIGHER': 'LOWER', 'LOWER': 'HIGHER',
            'TRIGGER': 'BLOCK', 'BLOCK': 'TRIGGER', 
            'RED': 'BLUE', 'BLUE': 'RED', 
            'LEFT': 'RIGHT', 'RIGHT': 'LEFT', 'FRONT': 'BACK', 'BACK': 'FRONT',
            'NORTH_EAST': 'SOUTH_WEST', 'SOUTH_WEST': 'NORTH_EAST',
            'NORTH_WEST': 'SOUTH_EAST', 'SOUTH_EAST': 'NORTH_WEST',
            'NO_CHANGE': '180_FLIP', '180_FLIP': 'NO_CHANGE',
            '90_RIGHT': '90_LEFT', '90_LEFT': '90_RIGHT',
            'ANALOGOUS': 'NON_ANALOGOUS', 'NON_ANALOGOUS': 'ANALOGOUS',
            'MATCH_COLOR': 'NONE', 'MATCH_SHAPE': 'NONE', 'EXACT': 'NONE'
        };

        if (opposites[result]) {
            stim.isNegated = true;
            stim.dictionary['NIX'] = 'NOT (INVERT)'; 
            invertedResult = opposites[result];
            stim.logicProof = `NOT(${stim.logicProof}) = ${invertedResult}`;
            result = invertedResult;
        }
    }
    return { stim, result };
};


// 1. FLUX FEATURE
const generateFluxFeature = (prevResult: string | null, forceMatch: boolean, tier: number): { stim: StimulusData, result: string } => {
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
  
  return { stim: { type: 'FLUX_FEATURE', tier, dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', visuals: { start, end }, textQuery: `VERIFY: ${activeCode}`, logicProof: `(Color: ${start.color===end.color?'=':'!='}) & (Shape: ${start.shape===end.shape?'=':'!='})` }, result };
};

// 2. FLUX COMPARISON
const generateFluxComparison = (prevResult: string | null, forceMatch: boolean, tier: number): { stim: StimulusData, result: string } => {
  const relations = ['GREATER', 'LESSER'];
  let result = getRandomItem(relations);
  if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult;
  else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
  
  const items = tier === 1 ? ['A', 'B', 'C'] : shuffleArray(['A', 'B', 'C']);
  const hub = items[0]; const leaf1 = items[1]; const leaf2 = items[2];
  
  const visualSwap = tier >= 2 && Math.random() > 0.5;
  const visualLeft = visualSwap ? leaf2 : leaf1; const visualRight = visualSwap ? leaf1 : leaf2;
  
  const colorOptions = [
      { name: 'RED', class: 'from-red-900/40 to-red-900/10' }, 
      { name: 'BLUE', class: 'from-blue-900/40 to-blue-900/10' }, 
      { name: 'GREEN', class: 'from-emerald-900/40 to-emerald-900/10' }, 
      { name: 'PURPLE', class: 'from-purple-900/40 to-purple-900/10' }
  ];

  // 1. Calculate Logic
  const rel1 = result === 'GREATER' ? '>' : '<'; 
  const rel2 = result === 'GREATER' ? '<' : '>'; 

  // 2. Determine Visual Meanings
  const meaningL = visualLeft === leaf1 ? rel1 : rel2;
  const rawMeaningR = visualRight === leaf2 ? rel2 : rel1;
  const meaningR = rawMeaningR === '>' ? '<' : '>'; 

  let dict: Record<string, string> = {};
  let visualLeftColor, visualRightColor;
  let visualLeftIcon, visualRightIcon;

  if (tier >= 3) {
      // TIER 3: Contextual
      // FIX: Force cR to be different from cL
      const cL = getRandomItem(colorOptions);
      const cR = getRandomItem(colorOptions.filter(c => c.name !== cL.name)); 
      
      const iconL = getRandomItem(ICONS);
      const iconR = getRandomItem(ICONS.filter(i => i !== iconL));
      
      dict = shuffleEntries({ 
          [`${iconL} (${cL.name})`]: meaningL, 
          [`${iconR} (${cR.name})`]: meaningR 
      });
      
      visualLeftColor = cL; visualRightColor = cR;
      visualLeftIcon = iconL; visualRightIcon = iconR;

  } else {
      // TIER 1 & 2: Standard
      const iconBase = getRandomItem(ICONS);
      const iconGr = iconBase;
      const iconLs = getRandomItem(ICONS.filter(i => i !== iconBase));
      
      dict = shuffleEntries({ [iconGr]: '>', [iconLs]: '<' });
      
      visualLeftIcon = meaningL === '>' ? iconGr : iconLs;
      visualRightIcon = meaningR === '>' ? iconGr : iconLs;

      visualLeftColor = colorOptions[0]; visualRightColor = colorOptions[0]; 
  }

  return { 
      stim: { 
          type: 'FLUX_COMPARISON', 
          tier, 
          dictionary: dict, 
          dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', 
          contextColors: tier >= 3 ? [visualLeftColor.class, visualRightColor.class] : undefined, 
          visuals: { 
              hub, 
              leftLeaf: visualLeft, 
              rightLeaf: visualRight, 
              leftIcon: visualLeftIcon,   
              rightIcon: visualRightIcon, 
              isSwapped: visualSwap 
          }, 
          textQuery: `DERIVE: ${leaf1} vs ${leaf2}`, 
          logicProof: result === 'GREATER' ? `(${leaf1} > ${hub} > ${leaf2})` : `(${leaf1} < ${hub} < ${leaf2})` 
      }, 
      result 
  };
};

// 3. FLUX OPPOSITION
const generateFluxOpposition = (prevResult: string | null, forceMatch: boolean, tier: number): { stim: StimulusData, result: string } => {
  const relations = ['SAME', 'OPPOSITE', 'DIFFERENT']; 
  let result = getRandomItem(relations);
  
  if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult;
  else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));

  // 1. Randomize Nodes
  const pool = tier === 1 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'X', 'Y', 'Z', 'J', 'K', 'L']; 
  const nodes = shuffleArray(pool).slice(0, 3); 
  const n1 = nodes[0]; const n2 = nodes[1]; const n3 = nodes[2];

  // 2. Generate Icons & Dictionary
  const c1 = getRandomItem(ICONS); 
  const c2 = getRandomItem(ICONS.filter(i => i !== c1)); 
  let dict: Record<string, string> = {};
  
  // Store pools for selection
  let sameIcons: string[] = [];
  let oppIcons: string[] = [];
  let neutralIcons: string[] = [];

  if (tier >= 3) {
      // T3: Polysemy (2 Identical, 2 Invert, 1 Neutral)
      const c3 = getRandomItem(ICONS.filter(i => ![c1, c2].includes(i))); 
      const c4 = getRandomItem(ICONS.filter(i => ![c1, c2, c3].includes(i))); 
      const cNeutral = getRandomItem(ICONS.filter(i => ![c1, c2, c3, c4].includes(i)));
      
      dict = shuffleEntries({ 
          [c1]: 'IDENTICAL', [c2]: 'IDENTICAL', 
          [c3]: 'INVERT', [c4]: 'INVERT', 
          [cNeutral]: 'NEUTRAL' 
      });
      
      sameIcons = [c1, c2];
      oppIcons = [c3, c4];
      neutralIcons = [cNeutral];
  } else {
      // T1/T2: Single code per rule
      const cNeutral = getRandomItem(ICONS.filter(i => ![c1, c2].includes(i)));
      dict = shuffleEntries({ [c1]: 'IDENTICAL', [c2]: 'INVERT', [cNeutral]: 'NEUTRAL' });
      sameIcons = [c1];
      oppIcons = [c2];
      neutralIcons = [cNeutral];
  }

  // 3. Determine Logic Links
  let link1Type = 'SAME', link2Type = 'SAME';
  if (result === 'DIFFERENT') { 
      if (Math.random() > 0.5) { link1Type = 'NEUTRAL'; link2Type = Math.random() > 0.5 ? 'SAME' : 'OPP'; } 
      else { link2Type = 'NEUTRAL'; link1Type = Math.random() > 0.5 ? 'SAME' : 'OPP'; } 
  } else if (result === 'SAME') { 
      link1Type = Math.random() > 0.5 ? 'SAME' : 'OPP'; 
      link2Type = link1Type; 
  } else { 
      link1Type = Math.random() > 0.5 ? 'SAME' : 'OPP'; 
      link2Type = link1Type === 'SAME' ? 'OPP' : 'SAME'; 
  }

  // 4. Select Icons (CRITICAL FIX: Ensure Distinctness)
  const getPool = (type: string) => {
      if (type === 'NEUTRAL') return neutralIcons;
      if (type === 'SAME') return sameIcons;
      return oppIcons;
  };

  // Pick First Icon
  const icon1 = getRandomItem(getPool(link1Type));
  
  // Pick Second Icon
  // Filter out icon1 from the pool available for link 2.
  // In T3, this forces use of the synonym. In T1/T2, pool size is 1, so filtering empties it.
  let pool2 = getPool(link2Type).filter(i => i !== icon1);
  
  // Fallback for T1/T2 or Neutral (where pool size is 1): If empty, reuse the icon.
  if (pool2.length === 0) pool2 = getPool(link2Type);
  
  const icon2 = getRandomItem(pool2);

  // Visual Scramble
  const isSwapped = tier >= 2 && Math.random() > 0.5; 
  const visualChain = isSwapped 
      ? [ { l: n3, icon: icon2, r: n2 }, { l: n2, icon: icon1, r: n1 } ] 
      : [ { l: n1, icon: icon1, r: n2 }, { l: n2, icon: icon2, r: n3 } ];
  
  return { 
      stim: { 
          type: 'FLUX_OPPOSITION', 
          tier, 
          dictionary: dict, 
          dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', 
          visuals: { chain: visualChain }, 
          textQuery: `DERIVE: ${n1} vs ${n3}`, 
          logicProof: `${link1Type} + ${link2Type} = ${result}` 
      }, 
      result 
  };
};

// 4. FLUX HIERARCHY
const generateFluxHierarchy = (prevResult: string | null, forceMatch: boolean, tier: number): { stim: StimulusData, result: string } => {
    const relations = ['HIGHER', 'LOWER', 'SAME']; 
    let result = getRandomItem(relations);
    if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult; 
    else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
    
    // 1. SETUP ICONS & DICTIONARY
    const c1 = getRandomItem(ICONS); 
    const c2 = getRandomItem(ICONS.filter(i => i !== c1)); 
    const c3 = getRandomItem(ICONS.filter(i => ![c1, c2].includes(i))); 
    const c4 = getRandomItem(ICONS.filter(i => ![c1, c2, c3].includes(i)));
    
    let dict: Record<string, string> = {};
    let parentIcons: string[] = [];
    let childIcons: string[] = [];

    if (tier >= 3) {
        // T3: Polysemy (2 codes for Parent, 2 for Child)
        dict = shuffleEntries({ 
            [c1]: 'PARENT_OF', [c2]: 'PARENT_OF', 
            [c3]: 'CHILD_OF', [c4]: 'CHILD_OF' 
        });
        parentIcons = [c1, c2];
        childIcons = [c3, c4];
    } else {
        // T1/T2: Simple (1 code each)
        dict = shuffleEntries({ [c1]: 'PARENT_OF', [c2]: 'CHILD_OF' });
        parentIcons = [c1];
        childIcons = [c2];
    }

    const pool = tier === 1 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'X', 'Y', 'Z', 'J', 'K', 'L', 'Q', 'R', 'S']; 
    const nodes = shuffleArray(pool).slice(0, 3); 
    
    const isReverseQuery = tier >= 2 && Math.random() > 0.5;
    let requiredVisual = result;
    if (isReverseQuery) { 
        if (result === 'HIGHER') requiredVisual = 'LOWER'; 
        else if (result === 'LOWER') requiredVisual = 'HIGHER'; 
    }
    
    let link1Type = 0; 
    let link2Type = 0; 
    if (requiredVisual === 'HIGHER') { link1Type = 1; link2Type = 1; } 
    else if (requiredVisual === 'LOWER') { link1Type = -1; link2Type = -1; } 
    else { 
        if (Math.random() > 0.5) { link1Type = -1; link2Type = 1; } 
        else { link1Type = 1; link2Type = -1; } 
    }
    
    // 2. SELECT ICONS (CRITICAL FIX: Ensure Distinctness)
    
    // Pick First Icon
    const pool1 = link1Type === 1 ? parentIcons : childIcons;
    const iconAB = getRandomItem(pool1);

    // Pick Second Icon
    const pool2 = link2Type === 1 ? parentIcons : childIcons;
    
    // FILTER: Remove the icon used in Link 1 from the available options for Link 2.
    // In Tier 3, this forces the use of the synonym (e.g. if c1 used, force c2).
    // In Tier 1/2, the pool only has 1 item, so filtering would empty it. We check length.
    let availableForBC = pool2.filter(i => i !== iconAB);
    
    // If filtering emptied the pool (Tier 1/2), put the item back.
    if (availableForBC.length === 0) availableForBC = pool2;
    
    const iconBC = getRandomItem(availableForBC);

    const queryText = isReverseQuery ? `GENERATION: ${nodes[2]} vs ${nodes[0]}` : `GENERATION: ${nodes[0]} vs ${nodes[2]}`;
    const visualNet = link1Type + link2Type;
    const proofString = isReverseQuery ? `Visual(${visualNet}) * Flip = ${result}` : `Net: ${visualNet} = ${result}`;
    
    return { 
        stim: { 
            type: 'FLUX_HIERARCHY', 
            tier, 
            dictionary: dict, 
            dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', 
            visuals: { nodes, linkAB: iconAB, linkBC: iconBC }, 
            textQuery: queryText, 
            logicProof: proofString 
        }, 
        result 
    };
};

// 5. FLUX CAUSAL
// 5. FLUX CAUSAL (Tier 1: Simple, Tier 2: Chromatic, Tier 3: Viral)
const generateFluxCausal = (prevResult: string | null, forceMatch: boolean, tier: number): { stim: StimulusData, result: string } => {
    // Result Types: T1/T2 use TRIGGER/BLOCK. T3 uses RED/BLUE.
    const relationsSimple = ['TRIGGER', 'BLOCK'];
    const relationsViral = ['RED', 'BLUE'];
    
    let result = getRandomItem(tier >= 3 ? relationsViral : relationsSimple);
    
    // N-Back Match Logic
    const currentRelations = tier >= 3 ? relationsViral : relationsSimple;
    if (forceMatch && prevResult && currentRelations.includes(prevResult)) {
        result = prevResult;
    } else if (!forceMatch && prevResult) {
        // If tier changed, prevResult might not be in currentRelations.
        // Just pick random if so, or filter if valid.
        const validOptions = currentRelations.filter(r => r !== prevResult);
        if (validOptions.length > 0) result = getRandomItem(validOptions);
    }
  
    // SETUP
    const pool = tier === 1 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'X', 'Y', 'Z', 'P', 'Q', 'R'];
    const nodes = shuffleArray(pool).slice(0, 3);
    // Generate colors for everyone (T1 ignores them, T2/T3 use them)
    const colors = [
        Math.random() > 0.5 ? 'RED' : 'BLUE', 
        Math.random() > 0.5 ? 'RED' : 'BLUE', 
        Math.random() > 0.5 ? 'RED' : 'BLUE'
    ];
    
    const isReverse = tier >= 2 && Math.random() > 0.5;

    let dict: Record<string, string> = {};
    let op1 = '', op2 = '';

    if (tier >= 3) {
        // --- TIER 3: VIRAL MUTATION (The Unbreakable Logic) ---
        const c1 = generateCode([]); const c2 = generateCode([c1]); 
        const c3 = generateCode([c1, c2]); const c4 = generateCode([c1, c2, c3]);
        
        dict = shuffleEntries({ 
            [c1]: 'INFECT_MATCH', [c2]: 'INFECT_MATCH', 
            [c3]: 'INFECT_DIFF', [c4]: 'INFECT_DIFF' 
        });
        
        const matchOps = [c1, c2]; 
        const diffOps = [c3, c4];
        const allOps = [...matchOps, ...diffOps];
        
        // Solver Logic
        const applyVirus = (op: string, s: string, d: string) => {
            const success = matchOps.includes(op) ? s === d : s !== d;
            if (success) return d === 'RED' ? 'BLUE' : 'RED'; // Flip
            return d; // Stay
        };
        
        let found = false;
        // Brute force a valid path to the desired Result (Final Color)
        for(let i=0; i<50; i++){
            const t1 = getRandomItem(allOps); 
            const t2 = getRandomItem(allOps);
            
            const n2 = applyVirus(t1, colors[0], colors[1]); // N2 might flip
            const n3 = applyVirus(t2, n2, colors[2]);        // N3 might flip
            
            if (n3 === result) { 
                op1=t1; op2=t2; found=true; break; 
            }
        }
        if(!found) { op1=c1; op2=c1; } // Fail-safe

    } else if (tier === 2) {
        // --- TIER 2: CHROMATIC GATING (Conditional Logic) ---
        // This was the "Pass Blue / Block Red" logic
        const c1 = generateCode([]); const c2 = generateCode([c1]); const c3 = generateCode([c1, c2]);
        dict = shuffleEntries({ 
            [c1]: 'BLOCK_RED', 
            [c2]: 'BLOCK_BLUE', 
            [c3]: 'PASS' 
        });
        
        const allOps = [c1, c2, c3];

        // Helper Logic
        const checkPass = (op: string, c: string) => {
            if (op === c3) return true; // Pass
            if (op === c1 && c === 'RED') return false; // Block Red
            if (op === c2 && c === 'BLUE') return false; // Block Blue
            return true; // (e.g. BlockRed vs Blue = Pass)
        };

        let found = false;
        // Brute force valid path to Result (Trigger/Block)
        for(let i=0; i<50; i++){
            const t1 = getRandomItem(allOps); 
            const t2 = getRandomItem(allOps);
            
            // Flow: N1 -> t1 -> N2 -> t2 -> N3
            const pass1 = checkPass(t1, colors[0]);
            // If pass1 failed, signal never reaches N2, so pass2 is irrelevant (Block)
            const pass2 = pass1 ? checkPass(t2, colors[1]) : false;
            
            const outcome = pass2 ? 'TRIGGER' : 'BLOCK';
            
            if (outcome === result) {
                op1 = t1; op2 = t2; found = true; break;
            }
        }
        if(!found) { op1=c3; op2=c3; }

    } else {
        // --- TIER 1: SIMPLE BLOCK/TRIGGER ---
        const c1 = generateCode([]); const c2 = generateCode([c1]);
        dict = shuffleEntries({ [c1]: 'ACTIVATE', [c2]: 'INHIBIT' });
        const link1 = Math.random() > 0.5 ? 1 : -1;
        const link2 = result === 'TRIGGER' ? link1 : -link1; // Double neg logic
        op1 = link1===1 ? c1 : c2; 
        op2 = link2===1 ? c1 : c2;
    }

    return {
        stim: {
            type: 'FLUX_CAUSAL', 
            tier, 
            dictionary: dict, 
            dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT',
            visuals: { nodes, nodeColors: colors, ops: [op1, op2], isReverse },
            textQuery: tier >= 3 ? `FINAL COLOR OF ${nodes[2]}?` : `NET EFFECT: ${nodes[0]} on ${nodes[2]}`,
            logicProof: tier >= 3 ? `Viral Mutation -> ${result}` : `Chain Logic -> ${result}`
        },
        result
    };
};

// 6. FLUX SPATIAL 
const generateFluxSpatial = (prevResult: string | null, forceMatch: boolean, tier: number): { stim: StimulusData, result: string } => {
    // Determine Result Category based on Tier
    let relations: string[] = [];
    if (tier === 3) {
        relations = ['NO_CHANGE', '90_RIGHT', '90_LEFT', '180_FLIP']; // Rotational Delta
    } else {
        relations = ['NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST']; // Quadrants (T1 & T2)
    }
    
    let result = getRandomItem(relations);
    if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult;
    else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));

    // Generate Codes
    const c1 = generateCode([]); 
    const c2 = generateCode([c1]); 
    const c3 = generateCode([c1, c2]); 
    const c4 = generateCode([c1, c2, c3]);
    
    let dict: Record<string, string> = {};
    let moves: string[] = [];

    if (tier === 1) {
        // --- TIER 1: ABSOLUTE MOVES (North/South/East/West) ---
        dict = shuffleEntries({ [c1]: 'NORTH', [c2]: 'SOUTH', [c3]: 'EAST', [c4]: 'WEST' });
        
        // Reverse engineer the path (Simple summation)
        if (result === 'NORTH_EAST') moves = [c1, c3]; // N + E
        else if (result === 'NORTH_WEST') moves = [c1, c4]; // N + W
        else if (result === 'SOUTH_EAST') moves = [c2, c3]; // S + E
        else if (result === 'SOUTH_WEST') moves = [c2, c4]; // S + W
        
        moves = shuffleArray(moves); // Order doesn't matter for T1
        
    } else {
        // --- TIER 2 & 3: RELATIVE MOVES (Turtle Graphics) ---
        const codeFwd = c1, codeR = c2, codeL = c3, codeU = c4;
        
        dict = shuffleEntries({ 
            [codeFwd]: 'FORWARD', 
            [codeR]: 'TURN_RIGHT', 
            [codeL]: 'TURN_LEFT', 
            [codeU]: 'U_TURN' 
        });

        const ops = [codeFwd, codeR, codeL, codeU];
        let validSequence: string[] = [];
        let attempts = 0;
        
        // Brute force a valid sequence (Simulate the turtle)
        while (validSequence.length === 0 && attempts < 200) {
            attempts++;
            // Generate random 3-step sequence
            const seq = [getRandomItem(ops), getRandomItem(ops), getRandomItem(ops)];
            
            let x = 0, y = 0;
            let heading = 0; // 0=N, 1=E, 2=S, 3=W
            
            for (const move of seq) {
                if (move === codeR) heading = (heading + 1) % 4;
                else if (move === codeL) heading = (heading + 3) % 4;
                else if (move === codeU) heading = (heading + 2) % 4;
                else if (move === codeFwd) {
                    if (heading === 0) y++;      // North
                    else if (heading === 1) x++; // East
                    else if (heading === 2) y--; // South
                    else if (heading === 3) x--; // West
                }
            }
            
            let outcome = '';
            
            if (tier === 2) {
                // Tier 2: Check Quadrant
                if (x > 0 && y > 0) outcome = 'NORTH_EAST';
                else if (x < 0 && y > 0) outcome = 'NORTH_WEST';
                else if (x > 0 && y < 0) outcome = 'SOUTH_EAST';
                else if (x < 0 && y < 0) outcome = 'SOUTH_WEST';
            } else {
                // Tier 3: Check Heading Delta (Start was 0/North)
                if (heading === 0) outcome = 'NO_CHANGE';
                else if (heading === 1) outcome = '90_RIGHT';
                else if (heading === 2) outcome = '180_FLIP';
                else if (heading === 3) outcome = '90_LEFT';
            }

            if (outcome === result) {
                validSequence = seq;
            }
        }
        
        // Safety Fallback (If random gen fails, which is rare but possible)
        if (validSequence.length === 0) {
            if (tier === 2) {
                 // Simple relative paths to quadrants
                 if (result === 'NORTH_EAST') validSequence = [codeFwd, codeR, codeFwd];
                 else if (result === 'NORTH_WEST') validSequence = [codeFwd, codeL, codeFwd];
                 else if (result === 'SOUTH_EAST') validSequence = [codeR, codeFwd, codeFwd]; // Face E, Move, Move
                 else validSequence = [codeL, codeFwd, codeFwd]; // Face W, Move, Move (Wait, S/W requires turning)
                 // Correction for South fallback: Turn U, Fwd, Turn...
                 if (result === 'SOUTH_EAST') validSequence = [codeU, codeFwd, codeL, codeFwd]; 
                 if (result === 'SOUTH_WEST') validSequence = [codeU, codeFwd, codeR, codeFwd];
            } else {
                 // Simple heading changes
                 if (result === 'NO_CHANGE') validSequence = [codeR, codeL, codeFwd];
                 else if (result === '90_RIGHT') validSequence = [codeFwd, codeR, codeFwd];
                 else if (result === '90_LEFT') validSequence = [codeFwd, codeL, codeFwd];
                 else validSequence = [codeR, codeR, codeFwd];
            }
        }
        moves = validSequence;
    }

    return {
        stim: {
            type: 'FLUX_SPATIAL',
            tier,
            dictionary: dict,
            dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT',
            visuals: { sequence: moves },
            textQuery: tier >= 3 ? 'NET HEADING CHANGE' : 'NET QUADRANT',
            logicProof: `Simulation Path -> ${result}`
        },
        result
    };
};

// 7. FLUX DEICTIC
const generateFluxDeictic = (prevResult: string | null, forceMatch: boolean, tier: number): { stim: StimulusData, result: string } => {
  const relations = ['LEFT', 'RIGHT', 'FRONT', 'BACK']; let result = getRandomItem(relations);
  if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult; else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
  
  const codeMe = generateCode([]); const codeYou = generateCode([codeMe]); 
  const dict = shuffleEntries({ [codeMe]: 'ME (SAME)', [codeYou]: 'YOU (OPPOSITE)' });

  // T1: No Time. T2+: Time included.
  const timeFrame = tier >= 2 ? (Math.random() > 0.5 ? 'NOW' : 'THEN') : 'NOW';
  
  let activeCode = Math.random() > 0.5 ? codeMe : codeYou; 
  let activeFace = getRandomItem(['NORTH', 'EAST', 'SOUTH', 'WEST']);
  
  // Logic ... (Standard)
  const dirMap = { 'NORTH': 0, 'EAST': 1, 'SOUTH': 2, 'WEST': 3 }; const faceIdx = dirMap[activeFace as keyof typeof dirMap];
  const idShift = activeCode === codeMe ? 0 : 2; 
  const timeShift = timeFrame === 'NOW' ? 0 : 2; 
  const totalShift = idShift + timeShift;
  const effectiveFaceIdx = (faceIdx + totalShift) % 4;
  
  let offset = 0; if (result === 'RIGHT') offset = 1; if (result === 'BACK') offset = 2; if (result === 'LEFT') offset = 3;
  const targetAbsIdx = (effectiveFaceIdx + offset) % 4; const targetAbsDir = DIRECTIONS[targetAbsIdx];
  let targetPos = 4; if (targetAbsDir === 'NORTH') targetPos = 1; if (targetAbsDir === 'EAST') targetPos = 5; if (targetAbsDir === 'SOUTH') targetPos = 7; if (targetAbsDir === 'WEST') targetPos = 3;

  return { stim: { type: 'FLUX_DEICTIC', tier, dictionary: dict, dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', visuals: { activeCode, activeFace, activePos: 4, targetPos, timeFrame, effectiveFaceIdx }, textQuery: `PERSPECTIVE: ${activeCode} (${timeFrame})`, logicProof: `${activeCode} at ${activeFace} + ${timeFrame} = Target` }, result };
};

// 8. CONDITIONAL & 9. ANALOGY (Always High Elo, so effectively Tier 3 logic always)
const generateFluxConditional = (prevResult: string | null, forceMatch: boolean, tier: number): { stim: StimulusData, result: string } => {
    const relations = ['RED', 'BLUE']; 
    let result = getRandomItem(relations);
    if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult; 
    else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
    
    const wordText = Math.random() > 0.5 ? 'RED' : 'BLUE'; 
    const inkColor = Math.random() > 0.5 ? 'RED' : 'BLUE'; 
    const shape = Math.random() > 0.5 ? 'CIRCLE' : 'SQUARE';
    
    const codeKeep = generateCode([]); 
    const codeInvert = generateCode([codeKeep]);
    const mapCircle = Math.random() > 0.5 ? 'READ_TEXT' : 'READ_INK'; 
    const mapSquare = mapCircle === 'READ_TEXT' ? 'READ_INK' : 'READ_TEXT';
    
    const dict = shuffleEntries({ [codeKeep]: 'KEEP_VALUE', [codeInvert]: 'INVERT_VALUE', ['(CIRCLE)']: mapCircle, ['(SQUARE)']: mapSquare });
    
    const rule = shape === 'CIRCLE' ? mapCircle : mapSquare; 
    const baseValue = rule === 'READ_TEXT' ? wordText : inkColor;
    let chosenCode = baseValue === result ? codeKeep : codeInvert;
    
    return { 
        stim: { 
            type: 'FLUX_CONDITIONAL', 
            tier, // <--- ADDED THIS
            dictionary: dict, 
            dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', 
            visuals: { wordText, inkColor, shape, modifier: chosenCode }, 
            textQuery: 'DETERMINE FINAL COLOR', 
            logicProof: `(${shape}=${rule} -> ${baseValue}) + ${chosenCode} = ${result}` 
        }, 
        result 
    };
};

// 9. FLUX ANALOGY 
const generateFluxAnalogy = (prevResult: string | null, forceMatch: boolean, tier: number): { stim: StimulusData, result: string } => {
    const relations = ['ANALOGOUS', 'NON_ANALOGOUS']; 
    let result = getRandomItem(relations);
    if (forceMatch && prevResult && relations.includes(prevResult)) result = prevResult; 
    else if (!forceMatch && prevResult) result = getRandomItem(relations.filter(r => r !== prevResult));
    
    // 1. Generate 4 Unique Codes
    const c1 = generateCode([]); 
    const c2 = generateCode([c1]); 
    const c3 = generateCode([c1, c2]); 
    const c4 = generateCode([c1, c2, c3]);
    
    // 2. Map Meanings (2 Causes, 2 Prevents)
    const dict = shuffleEntries({ [c1]: 'CAUSES', [c2]: 'CAUSES', [c3]: 'PREVENTS', [c4]: 'PREVENTS' });
    
    const causesPool = [c1, c2];
    const preventsPool = [c3, c4];

    // 3. Determine Relationships
    const rel1 = Math.random() > 0.5 ? 'CAUSES' : 'PREVENTS'; 
    
    let rel2 = '';
    if (result === 'ANALOGOUS') rel2 = rel1;
    else rel2 = rel1 === 'CAUSES' ? 'PREVENTS' : 'CAUSES';

    // 4. Select Symbols (CRITICAL FIX: Force Distinctness)
    const getPool = (r: string) => r === 'CAUSES' ? causesPool : preventsPool;

    const sym1 = getRandomItem(getPool(rel1));
    
    // Get the pool for the second relation
    const pool2 = getPool(rel2);
    
    // Filter sym1 out of pool2. 
    // If rel1 == rel2 (Analogous), this prevents using the same symbol twice.
    // If rel1 != rel2 (Non-Analogous), the pools are different anyway, so filter does nothing.
    const sym2 = getRandomItem(pool2.filter(s => s !== sym1));

    return { 
        stim: { 
            type: 'FLUX_ANALOGY', 
            tier, 
            dictionary: dict, 
            dictionaryPos: Math.random() > 0.5 ? 'LEFT' : 'RIGHT', 
            visuals: { 
                net1: { left: 'A', op: sym1, right: 'B' }, 
                net2: { left: 'X', op: sym2, right: 'Y' } 
            }, 
            textQuery: 'RELATION MATCH?', 
            logicProof: `${rel1} (${sym1}) vs ${rel2} (${sym2}) = ${result}` 
        }, 
        result 
    }
};

// --- Helpers ---

const getComplexityCost = (stim: StimulusData): number => {
  if (stim.isNegated) return 4; 
  switch (stim.type) {
    case 'FLUX_FEATURE': return 1;
    case 'FLUX_COMPARISON': return 2;
    case 'FLUX_OPPOSITION': return 2;
    case 'FLUX_HIERARCHY': return 3;
    case 'FLUX_CAUSAL': return stim.tier >= 3 ? 4 : 3;
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
  const isVisible = revealOverride || revealed;
  return (
    <button onClick={() => setRevealed(true)} className={`mt-auto w-full text-center relative group transition-all duration-200 text-left ${isCurrent ? 'p-3 bg-black rounded-xl border border-slate-700 shadow-lg' : 'p-2 bg-slate-950 rounded-xl border border-slate-800'}`}>
       <div className="text-[10px] text-slate-600 uppercase font-bold tracking-wider mb-1 flex justify-between items-center px-1"><span>{label}</span>{!isVisible && <EyeOff className="w-3 h-3 opacity-50" />}{isVisible && <Eye className="w-3 h-3 opacity-50 text-emerald-500" />}</div>
       <div className={`transition-all duration-300 ${isVisible ? 'blur-none' : 'blur-md select-none opacity-50'}`}><div className={`font-black ${isCurrent ? 'text-2xl text-white' : 'text-lg text-slate-300'}`}>{result}</div><div className={`text-[10px] mt-1 font-mono p-1 rounded border ${isCurrent ? 'text-purple-400 bg-slate-900 border-slate-800' : 'text-slate-600 bg-black/50 border-transparent'}`}>{proof}</div></div>
       {!isVisible && (<div className="absolute inset-0 flex items-center justify-center z-10"><div className="bg-slate-900/90 border border-slate-700 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 uppercase shadow-xl group-hover:text-white group-hover:border-slate-500 transition-colors">Click to Reveal</div></div>)}
    </button>
  );
};

// --- VISUAL RENDERER ---
const VisualRenderer: React.FC<{ stim: StimulusData, isRepairMode?: boolean }> = ({ stim, isRepairMode }) => {
  const [revealHint, setRevealHint] = useState(false);
  useEffect(() => { setRevealHint(false); }, [stim]);
  const showHint = revealHint || (isRepairMode && stim.type === 'FLUX_DEICTIC');

  const renderContent = () => {
      // 1. FEATURE
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
      // 2. COMPARISON
      if (stim.type === 'FLUX_COMPARISON') {
        const { hub, leftLeaf, rightLeaf, leftIcon, rightIcon } = stim.visuals;
        const { contextColors } = stim;
        return (
            <div className="flex flex-col gap-4 w-full items-center justify-center">
                <div className="relative flex items-center gap-2 md:gap-4 bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden px-6 py-6 md:px-12 md:py-8 w-full max-w-lg">
                    {/* Context Backgrounds (Tier 3 Only) */}
                    {contextColors && (
                        <div className="absolute inset-0 flex z-0">
                            <div className={`w-1/2 h-full bg-gradient-to-r ${contextColors[0]}`}></div>
                            <div className={`w-1/2 h-full bg-gradient-to-l ${contextColors[1]}`}></div>
                        </div>
                    )}
                    
                    {/* Left Side */}
                    <div className="relative z-10 flex flex-col items-center gap-2 flex-1">
                        <div className="text-3xl md:text-5xl font-black text-white drop-shadow-md">{leftLeaf}</div>
                    </div>
                    
                    {/* Left Icon */}
                    <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 bg-black/80 border border-slate-500 rounded-lg flex items-center justify-center text-yellow-400 text-xl md:text-2xl shadow-xl">
                        {leftIcon}
                    </div>
                    
                    {/* Hub */}
                    <div className="relative z-10 w-16 h-16 md:w-24 md:h-24 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center text-3xl md:text-5xl font-black text-black shadow-2xl mx-2">
                        {hub}
                    </div>
                    
                    {/* Right Icon */}
                    <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 bg-black/80 border border-slate-500 rounded-lg flex items-center justify-center text-yellow-400 text-xl md:text-2xl shadow-xl">
                        {rightIcon}
                    </div>
                    
                    {/* Right Side */}
                    <div className="relative z-10 flex flex-col items-center gap-2 flex-1">
                        <div className="text-3xl md:text-5xl font-black text-white drop-shadow-md">{rightLeaf}</div>
                    </div>
                </div>
            </div>
        );
      }
      // 3. OPPOSITION
      if (stim.type === 'FLUX_OPPOSITION') {
        const { chain } = stim.visuals;
        return (<div className="flex flex-col gap-4 w-full items-center scale-75 md:scale-100"><div className="flex items-center gap-0"><div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center font-bold text-white z-10 text-xl">{chain[0].l}</div><div className="w-24 h-8 md:w-32 md:h-10 bg-slate-800 border-y-2 border-slate-700 flex items-center justify-center -mx-2"><span className="text-purple-400 font-bold text-2xl">{chain[0].icon}</span></div><div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center font-bold text-slate-500 z-10 text-xl">{chain[0].r}</div><div className="w-24 h-8 md:w-32 md:h-10 bg-slate-800 border-y-2 border-slate-700 flex items-center justify-center -mx-2"><span className="text-purple-400 font-bold text-2xl">{chain[1].icon}</span></div><div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center font-bold text-white z-10 text-xl">{chain[1].r}</div></div></div>);
      }
      // 4. HIERARCHY
      if (stim.type === 'FLUX_HIERARCHY') {
          const { nodes, linkAB, linkBC } = stim.visuals;
          return (<div className="relative flex items-end justify-center h-48 w-64 md:w-80 gap-8 md:gap-16"><div className="z-10 w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-full border-2 border-slate-600 flex items-center justify-center text-xl md:text-2xl font-black text-white shadow-lg">{nodes[0]}</div><div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-14 h-14 md:w-16 md:h-16 bg-slate-900 rounded-full border-2 border-purple-500/50 flex items-center justify-center text-xl md:text-2xl font-black text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]">{nodes[1]}</div><div className="z-10 w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-full border-2 border-slate-600 flex items-center justify-center text-xl md:text-2xl font-black text-white shadow-lg">{nodes[2]}</div><svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"><line x1="20%" y1="80%" x2="50%" y2="20%" stroke="#475569" strokeWidth="2" /><line x1="80%" y1="80%" x2="50%" y2="20%" stroke="#475569" strokeWidth="2" /></svg><div className="absolute top-[40%] left-[30%] -translate-x-1/2 -translate-y-1/2 bg-black border border-slate-700 rounded px-1.5 py-0.5 z-20"><span className="text-emerald-400 text-lg md:text-xl font-bold">{linkAB}</span></div><div className="absolute top-[40%] right-[30%] translate-x-1/2 -translate-y-1/2 bg-black border border-slate-700 rounded px-1.5 py-0.5 z-20"><span className="text-emerald-400 text-lg md:text-xl font-bold">{linkBC}</span></div></div>)
      }
      // 5. CAUSAL
      if (stim.type === 'FLUX_CAUSAL') {
          const { nodes, ops, isReverse, nodeColors } = stim.visuals;
          
          // Check if we are in Tier 1 (Simple Logic) by checking if dictionary has 'ACTIVATE'
          // If so, ignore the Red/Blue colors and make them Gray to prevent confusion.
          const isTier1 = Object.values(stim.dictionary).includes('ACTIVATE');
          
          const renderNodes = isReverse ? [...nodes].reverse() : nodes;
          const renderColors = isReverse ? [...nodeColors].reverse() : nodeColors;
          const renderOps = isReverse ? [...ops].reverse() : ops;
          const arrowRotation = isReverse ? 'rotate-180' : '';
          
          const getNodeStyle = (color: string) => {
              if (isTier1) return 'border-slate-500 text-slate-300 bg-slate-800'; // Tier 1 Neutral
              return color === 'RED' 
                  ? 'border-red-500 text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                  : 'border-blue-500 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
          };

          return (
              <div className="flex flex-row items-center gap-2 md:gap-4 scale-75 md:scale-100">
                 <div className={`px-4 py-3 bg-slate-900 rounded-lg font-bold border-2 ${getNodeStyle(renderColors[0])}`}>{renderNodes[0]}</div>
                 <ArrowRight className={`text-slate-500 w-6 h-6 ${arrowRotation}`}/>
                 <div className="w-12 h-12 border-2 border-slate-600 bg-black rounded flex items-center justify-center text-purple-400 font-bold text-xl shadow-[0_0_10px_rgba(168,85,247,0.2)]">{renderOps[0]}</div>
                 <ArrowRight className={`text-slate-500 w-6 h-6 ${arrowRotation}`}/>
                 <div className={`px-4 py-3 bg-slate-900 rounded-lg font-bold border-2 ${getNodeStyle(renderColors[1])}`}>{renderNodes[1]}</div>
                 <ArrowRight className={`text-slate-500 w-6 h-6 ${arrowRotation}`}/>
                 <div className="w-12 h-12 border-2 border-slate-600 bg-black rounded flex items-center justify-center text-purple-400 font-bold text-xl shadow-[0_0_10px_rgba(168,85,247,0.2)]">{renderOps[1]}</div>
                 <ArrowRight className={`text-slate-500 w-6 h-6 ${arrowRotation}`}/>
                 <div className={`px-4 py-3 bg-slate-900 rounded-lg font-bold border-2 ${getNodeStyle(renderColors[2])}`}>{renderNodes[2]}</div>
              </div>
          )
      }
      // 6. SPATIAL
      if (stim.type === 'FLUX_SPATIAL') {
          const { sequence } = stim.visuals;
          return (<div className="flex flex-col items-center gap-6"><div className="flex items-center gap-3"><Compass className="w-8 h-8 text-emerald-400 animate-pulse" /><div className="text-slate-500 font-mono text-sm uppercase">Origin: (0,0)</div></div><div className="flex gap-4">{sequence.map((code: string, i: number) => (<div key={i} className="flex flex-col items-center gap-2"><div className="text-xs text-slate-600 font-bold">Step {i+1}</div><div className="w-16 h-16 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-purple-400 font-black text-xl shadow-lg">{code}</div></div>))}</div><div className="text-xs text-slate-500 font-mono">Calculate Final Vector</div></div>)
      }
      // 7. DEICTIC
      if (stim.type === 'FLUX_DEICTIC') {
        const cells = Array(9).fill(null);
        const { activeFace, activeCode, activePos, targetPos, timeFrame, effectiveFaceIdx } = stim.visuals;
        const rot = { 'NORTH': 'rotate-0', 'EAST': 'rotate-90', 'SOUTH': 'rotate-180', 'WEST': '-rotate-90' }[activeFace as string];
        const dirNames = ['N', 'E', 'S', 'W']; const currentViewDir = dirNames[effectiveFaceIdx];
        return (<div className="flex flex-col items-center gap-4"><div className="relative"><div className="grid grid-cols-3 gap-1 md:gap-3 p-2 bg-slate-800 rounded-2xl border border-slate-700 shadow-inner">{cells.map((_, i) => (<div key={i} className="w-8 h-8 md:w-20 md:h-20 bg-slate-900 rounded-lg md:rounded-xl flex items-center justify-center relative transition-all">{i === targetPos && <div className="w-2 h-2 md:w-6 md:h-6 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-500/50" />}{i === activePos && (<div className={`transform transition-all ${rot}`}><div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] md:border-l-[16px] md:border-r-[16px] md:border-b-[32px] border-l-transparent border-r-transparent border-b-emerald-500 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /><div className="absolute -top-4 md:-top-8 left-1/2 -translate-x-1/2 text-[8px] md:text-xs font-bold text-purple-300 bg-black/80 px-1 rounded">{activeCode}</div></div>)}</div>))}</div><button onClick={() => setRevealHint(true)} className="absolute -right-16 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-600 p-2 rounded flex flex-col items-center cursor-pointer hover:border-slate-400 transition-colors group" title="Click to Reveal Answer"><div className="text-[10px] text-slate-500 uppercase group-hover:text-slate-300 transition-colors">View</div><div className={`text-xl font-black text-white transition-all duration-300 ${showHint ? 'blur-none' : 'blur-md select-none'}`}>{currentViewDir}</div>{!showHint && <HelpCircle className="w-3 h-3 text-slate-600 mt-1 absolute bottom-1" />}</button></div><div className="flex items-center gap-4 text-xs font-mono bg-slate-900/50 p-2 rounded"><div className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400"/><span className={timeFrame === 'THEN' ? 'text-red-400' : 'text-emerald-400'}>{timeFrame}</span></div><span className="text-slate-600">|</span><div className="text-slate-400">Target is to my...?</div></div></div>);
      }
      // 8. CONDITIONAL
      if (stim.type === 'FLUX_CONDITIONAL') {
          const { wordText, inkColor, shape, modifier } = stim.visuals;
          const textColorClass = inkColor === 'RED' ? 'text-red-500' : 'text-blue-500'; const borderColorClass = 'border-slate-500';
          return (<div className="flex flex-col items-center gap-6"><div className="flex items-center gap-4"><div className={`relative flex items-center justify-center w-24 h-24 border-4 bg-slate-900 ${borderColorClass} ${shape === 'CIRCLE' ? 'rounded-full' : 'rounded-xl'}`}><span className={`font-black text-2xl ${textColorClass}`}>{wordText}</span><div className="absolute -bottom-6 text-[10px] text-slate-500 uppercase font-bold tracking-widest">{shape}</div></div><ArrowRight className="w-8 h-8 text-slate-500" /><div className="flex flex-col items-center gap-2"><div className="text-xs text-slate-500 font-bold uppercase">Apply</div><div className="w-20 h-20 bg-slate-900 border border-slate-600 rounded-xl flex items-center justify-center text-yellow-400 font-black text-xl shadow-lg">{modifier}</div></div><ArrowRight className="w-8 h-8 text-slate-500" /><div className="w-20 h-20 rounded-full border-4 border-slate-800 bg-slate-950 flex items-center justify-center text-slate-600 font-bold text-4xl">?</div></div></div>)
      }
      // 9. ANALOGY
      if (stim.type === 'FLUX_ANALOGY') {
          const { net1, net2 } = stim.visuals;
          const NetBlock = ({n}: {n:any}) => (<div className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700"><span className="font-bold text-white">{n.left}</span><ArrowRight className="w-3 h-3 text-slate-500"/><span className="text-yellow-400 font-bold text-xl">{n.op}</span><ArrowRight className="w-3 h-3 text-slate-500"/><span className="font-bold text-white">{n.right}</span></div>);
          return (<div className="flex flex-col items-center gap-4"><NetBlock n={net1} /><div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-widest"><Split className="w-4 h-4" /> Compare To</div><NetBlock n={net2} /></div>)
      }
      return null;
  };

  return (
      <div className={`relative p-6 rounded-3xl transition-all duration-500 ${stim.isNegated ? 'border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] bg-red-950/20' : ''}`}>
          {stim.isNegated && (<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-1.5 rounded-full font-black tracking-widest text-xs shadow-lg flex items-center gap-2 z-50 border-2 border-red-400"><Ban className="w-4 h-4" /> LOGIC INVERTED</div>)}
          {renderContent()}
      </div>
  );
};

// --- Tutorial Modal ---
const TutorialModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-400"/> OMEGA FIELD GUIDE
            </h2>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest mt-1">
              System Mechanics & Hidden Calculations
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* THE GOLDEN RULE */}
          <div className="col-span-1 md:col-span-2 bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl text-center">
            <h3 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-1">The Golden Rule</h3>
            <p className="text-slate-300 text-sm">
              Never match the pictures. Never match the words.<br/>
              <strong className="text-white">Match the Hidden Result.</strong>
            </p>
          </div>

          {/* --- RESTORED: ADAPTIVE INTENSITY TIERS --- */}
          <div className="col-span-1 md:col-span-2 bg-slate-950 p-5 rounded-xl border border-slate-800">
             <div className="text-purple-400 font-black text-lg mb-4 flex items-center gap-2">
                 <Activity className="w-5 h-5" /> ADAPTIVE INTENSITY SYSTEM
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col gap-2">
                   <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                       <strong className="text-white">TIER 1 (Novice)</strong>
                       <span className="text-slate-500 font-mono">&lt; 1200 Elo</span>
                   </div>
                   <ul className="list-disc list-inside text-slate-400 space-y-1">
                      <li>Linear Visuals (Left-to-Right)</li>
                      <li>Simple Dictionaries (1:1)</li>
                      <li>Static Buttons</li>
                      <li>Absolute Spatial (NE/NW)</li>
                   </ul>
                </div>
                
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col gap-2">
                   <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                       <strong className="text-emerald-400">TIER 2 (Advanced)</strong>
                       <span className="text-slate-500 font-mono">1200 - 1500</span>
                   </div>
                   <ul className="list-disc list-inside text-slate-400 space-y-1">
                      <li>Scrambled Topology</li>
                      <li>Context Colors Active</li>
                      <li><strong className="text-white">Button Flipping</strong></li>
                      <li>Relative Spatial (Turning)</li>
                   </ul>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col gap-2">
                   <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                       <strong className="text-yellow-400">TIER 3 (Master)</strong>
                       <span className="text-slate-500 font-mono">1500+</span>
                   </div>
                   <ul className="list-disc list-inside text-slate-400 space-y-1">
                      <li>Polysemy (Synonyms)</li>
                      <li>Viral Mutation (Causal)</li>
                      <li>Rotational Delta (Spatial)</li>
                      <li><strong className="text-red-400">Negation Curse</strong></li>
                   </ul>
                </div>
             </div>
          </div>

          {/* 1. Feature */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-emerald-400 font-black text-lg mb-2">1. FEATURE</div>
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">The Attribute Filter</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              The Code defines the Rule. The Visuals are the Suspect. 
              <br/><br/>
              <strong>Calculation:</strong> Does the visual obey the code?
              <br/>
              <span className="text-white font-mono bg-black px-1 rounded">MATCH_COLOR</span> vs <span className="text-white font-mono bg-black px-1 rounded">NONE</span>.
            </p>
          </div>

          {/* 2. Comparison */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-emerald-400 font-black text-lg mb-2">2. COMPARISON</div>
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">The Pivot Scale</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Find the Hub. Check the Symbol + Context (Color).
              <br/><br/>
              <strong>Tier 1-2:</strong> Distinct Symbols (Star vs Circle).
              <br/>
              <strong>Tier 3:</strong> Contextual (Same Symbol, Different Color).
              <br/><br/>
              <strong>Result:</strong> If A &gt; Hub and C &lt; Hub... <span className="text-white font-mono bg-black px-1 rounded">A &gt; C</span> (GREATER).
            </p>
          </div>

          {/* 3. Opposition */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-emerald-400 font-black text-lg mb-2">3. OPPOSITION</div>
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Polarity Math</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Ignore the pictures. Read the semantic meaning.
              <br/><br/>
              <strong>Calculation:</strong> Opposite (-1) x Opposite (-1) = <span className="text-white font-mono bg-black px-1 rounded">SAME (+1)</span>.
            </p>
          </div>

          {/* 4. Hierarchy */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-emerald-400 font-black text-lg mb-2">4. HIERARCHY</div>
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">The Elevator</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Track movement from Subject to Object.
              <br/><br/>
              <strong>Calculation:</strong> Parent (+1) + Parent (+1) = <span className="text-white font-mono bg-black px-1 rounded">+2 (HIGHER)</span>.
              <br/>
              <em className="text-xs opacity-50">Watch out for Query Reversal!</em>
            </p>
          </div>

          {/* 5. Causal */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-emerald-400 font-black text-lg mb-2">5. CAUSAL</div>
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Flow & Mutation</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              <strong>Tier 1-2 (Gating):</strong> Gates block specific colors. If blocked, signal dies. (Result: TRIGGER or BLOCK).
              <br/><br/>
              <strong>Tier 3 (Viral):</strong> Gates <strong className="text-white">FLIP</strong> the color if successful.
              <br/>
              <em className="text-xs opacity-50">You must update the Middle Node's color before solving Link 2.</em>
            </p>
          </div>

          {/* 6. Spatial */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-emerald-400 font-black text-lg mb-2">6. SPATIAL</div>
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Navigation</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              You start at (0,0) facing <strong>NORTH</strong>.
              <br/><br/>
              <strong>Tier 1-2:</strong> Absolute Moves (North/South). Sum the vector.
              <br/>
              <strong>Tier 3:</strong> Relative Turns (Left/Right). Track your heading state.
            </p>
          </div>

          {/* 7. Deictic */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-emerald-400 font-black text-lg mb-2">7. DEICTIC</div>
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">The Ghost Camera</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Don't trust your eyes. Calculate your <strong>True Rotation</strong>.
              <br/><br/>
              <strong>Logic:</strong>
              <br/>
              1. <strong>YOU:</strong> Flip 180° (Opposite Seat).
              <br/>
              2. <strong>THEN:</strong> Flip 180° (Opposite Time).
              <br/>
              From that *new* spot, where is the target?
            </p>
          </div>

          {/* 8. Conditional */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-emerald-400 font-black text-lg mb-2">8. CONDITIONAL</div>
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">The Prism (Boolean Logic)</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              The universe is binary: <strong className="text-red-400">RED</strong> or <strong className="text-blue-400">BLUE</strong>.
              <br/><br/>
              <strong>1. Filter:</strong> Use the Shape to grab the value (Ink or Text).
              <br/>
              <strong>2. Modify:</strong> Apply the Code (Keep or Invert).
            </p>
          </div>

          {/* 9. Analogy */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 col-span-1 md:col-span-2">
            <div className="text-emerald-400 font-black text-lg mb-2">9. ANALOGY</div>
            <div className="text-xs text-slate-500 uppercase font-bold mb-2">The Meta-Match</div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Don't compare the items. Compare the <strong>Relationships</strong>.
              <br/><br/>
              <strong>Calculation:</strong>
              <br/>
              Net 1 (Causes) vs Net 2 (Prevents) = <span className="text-white font-mono bg-black px-1 rounded">NON-ANALOGOUS</span>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- Main Engine ---

export default function ProjectOmegaUltimate() {
  
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const blockState = useRef({ type: 'FLUX_FEATURE' as GeneratorType, remaining: 0 });
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

  const [activeElo, setActiveElo] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('OMEGA_REAL_ELO_ULTIMATE');
      return saved ? parseInt(saved, 10) : 1000;
    }
    return 1000;
  });
  const [isButtonsFlipped, setIsButtonsFlipped] = useState(false);

  // --- REPAIR MODE STATES ---
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [isRepairMode, setIsRepairMode] = useState(false);
  const [repairSuccesses, setRepairSuccesses] = useState(0);
  const [repairTargetType, setRepairTargetType] = useState<GeneratorType | null>(null);
  const [repairTargetResult, setRepairTargetResult] = useState<string>('');

  useEffect(() => { 
    setActiveElo(realElo); 
  }, [config.isPracticeMode, realElo]);
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
  const frameQueue = useRef<GeneratorType[]>([]);

  const updateElo = (isCorrect: boolean) => {
    if (isRepairMode) return;
    const K = 10;
    const diff = Math.round(K * ((isCorrect ? 1 : 0) - 0.5));
    setActiveElo(p => Math.max(0, p + diff));
    if (!config.isPracticeMode) setRealElo(p => Math.max(0, p + diff));
  };

const nextTurn = useCallback(() => {
    const n = config.nBackLevel;
    //const histLen = history.length;

    let isBlockSwitch = false;
    let type: GeneratorType = 'FLUX_FEATURE';
    
    if (isRepairMode && repairTargetType) {
        type = repairTargetType;
    } else if (config.isPracticeMode && config.practiceType && config.practiceType !== 'MIXED') {
        type = config.practiceType;
    } else {
        // --- BLOCK SCHEDULING WITH BAG SYSTEM ---
        if (blockState.current.remaining <= 0) {
            
            // 1. REFILL THE BAG IF EMPTY
            if (frameQueue.current.length === 0) {
                const allTypes: GeneratorType[] = [
                    'FLUX_FEATURE', 'FLUX_COMPARISON', 'FLUX_OPPOSITION',
                    'FLUX_HIERARCHY', 'FLUX_CAUSAL', 'FLUX_SPATIAL',
                    'FLUX_DEICTIC', 'FLUX_CONDITIONAL', 'FLUX_ANALOGY'
                ];
                frameQueue.current = shuffleArray(allTypes);

                // 2. ANTI-REPEAT CHECK (Across Deck Resets)
                // If the new top card is the same as the last played block, swap it to the bottom.
                if (frameQueue.current[0] === blockState.current.type) {
                    const first = frameQueue.current.shift();
                    if (first) frameQueue.current.push(first);
                }
            }

            // 3. DRAW NEXT CARD
            const newType = frameQueue.current.shift();
            
            if (newType) {
                blockState.current.type = newType;
                
                // DYNAMIC BLOCK LENGTH
                // Formula: (N-Back Level * 3) + Random(3 to 8)
                const baseRunway = n * 3;
                const variance = Math.floor(Math.random() * 6) + 3;
                blockState.current.remaining = baseRunway + variance;
                
                isBlockSwitch = true;
            }
        }
        
        type = blockState.current.type;
        blockState.current.remaining--;
    }
    
    // --- HANDLE PHASE TRANSITIONS ---
    if (isBlockSwitch && !isRepairMode) {
        setPhase('WARMUP');
    } else if (!isRepairMode) {
        // If Block Switch happened, history length is effectively 0 for N-Back purposes
        // But we physically reset the array later, so this check ensures logic holds
        const effectiveHistory = isBlockSwitch ? 0 : history.length;
        if (effectiveHistory < n) setPhase('WARMUP');
        else setPhase('PLAYING');
    }

    const tier = getTier(activeElo);
    setIsButtonsFlipped(tier >= 2 && Math.random() > 0.5);

    // --- GENERATE STIMULUS ---
    const shouldMatch = Math.random() > 0.5;
    const prevNItem = (!isBlockSwitch && !isRepairMode && history.length >= n) ? history[history.length - n] : null;
    const prevResult = prevNItem ? prevNItem.result : null;

    let turnData;
    let generated: { stim: StimulusData, result: string };

    switch(type) {
      case 'FLUX_FEATURE': generated = generateFluxFeature(prevResult, shouldMatch, tier); break;
      case 'FLUX_COMPARISON': generated = generateFluxComparison(prevResult, shouldMatch, tier); break;
      case 'FLUX_OPPOSITION': generated = generateFluxOpposition(prevResult, shouldMatch, tier); break;
      case 'FLUX_HIERARCHY': generated = generateFluxHierarchy(prevResult, shouldMatch, tier); break;
      case 'FLUX_CAUSAL': generated = generateFluxCausal(prevResult, shouldMatch, tier); break;
      case 'FLUX_SPATIAL': generated = generateFluxSpatial(prevResult, shouldMatch, tier); break;
      case 'FLUX_DEICTIC': generated = generateFluxDeictic(prevResult, shouldMatch, tier); break;
      case 'FLUX_CONDITIONAL': generated = generateFluxConditional(prevResult, shouldMatch, tier); break;
      case 'FLUX_ANALOGY': generated = generateFluxAnalogy(prevResult, shouldMatch, tier); break;
      default: generated = generateFluxFeature(prevResult, shouldMatch, tier);
    }

    turnData = generated;

    if (!isRepairMode) { 
        turnData = applyMetaModifiers(turnData, tier);
    }

    const newItem: HistoryItem = { result: turnData.result, stimulus: turnData.stim };
    
    // Repair Mode Target Logic
    if (isRepairMode) {
        const makeMatch = Math.random() > 0.5;
        if (makeMatch) setRepairTargetResult(newItem.result);
        else {
            let possible: string[] = [];
            switch(type) {
                case 'FLUX_FEATURE': possible = ['MATCH_COLOR', 'MATCH_SHAPE', 'EXACT', 'NONE']; break;
                case 'FLUX_COMPARISON': possible = ['GREATER', 'LESSER']; break;
                case 'FLUX_OPPOSITION': possible = ['SAME', 'OPPOSITE', 'DIFFERENT']; break;
                case 'FLUX_HIERARCHY': possible = ['HIGHER', 'LOWER', 'SAME']; break;
                case 'FLUX_CAUSAL': possible = ['TRIGGER', 'BLOCK', 'RED', 'BLUE']; break;
                case 'FLUX_SPATIAL': possible = ['NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST', 'NO_CHANGE', '90_RIGHT', '90_LEFT', '180_FLIP']; break;
                case 'FLUX_DEICTIC': possible = ['LEFT', 'RIGHT', 'FRONT', 'BACK']; break;
                case 'FLUX_CONDITIONAL': possible = ['RED', 'BLUE']; break;
                case 'FLUX_ANALOGY': possible = ['ANALOGOUS', 'NON_ANALOGOUS']; break;
                default: possible = [newItem.result]; 
            }
            const distractor = getRandomItem(possible.filter(r => r !== newItem.result));
            setRepairTargetResult(distractor || newItem.result); 
        }
    }

    setCurrentItem(newItem);

    // --- HISTORY UPDATE (Reset on Switch) ---
    if (isBlockSwitch && !isRepairMode) {
        setHistory([newItem]); 
    } else {
        setHistory(prev => [...prev, newItem]);
    }
    
    setTurnCount(c => c + 1);
    
    if (config.baseTimer === -1) { setTimer(100); } 
    else {
      const cost = getComplexityCost(newItem.stimulus);
      const difficultyMod = Math.max(0, (activeElo - 1000) / 1000);
      const extraTime = (cost - 1) * 1.5;
      const totalTime = Math.max(3, config.baseTimer + extraTime - (difficultyMod * 2));
      setTimer(totalTime);
    }
    
    startTimeRef.current = Date.now();

  }, [activeElo, history, config, phase, isRepairMode, repairTargetType]);

  const handleAnswer = useCallback((userMatch: boolean, isTimeout = false) => {
    
    // --- REPAIR MODE ANSWER LOGIC ---
    if (isRepairMode && currentItem) {
        const isTargetActuallyTrue = currentItem.result === repairTargetResult;
        const isCorrect = isTimeout ? false : (userMatch === isTargetActuallyTrue);
        
        if (isCorrect) {
            const newStreak = repairSuccesses + 1;
            setRepairSuccesses(newStreak);
            if (newStreak >= 3) {
                setIsRepairMode(false);
                setRepairTargetType(null);
                setConsecutiveFailures(0);
                setRepairSuccesses(0);
            }
        } else {
            setRepairSuccesses(0); 
        }
        
        setLogs(prev => [{
            id: turnCount, timestamp: new Date().toLocaleTimeString(), elo: activeElo, nBackItem: null, currentItem: currentItem, userAnswer: userMatch, isMatch: isTargetActuallyTrue, isCorrect: isCorrect, reactionTime: Date.now() - startTimeRef.current, isRepair: true, timedOut: isTimeout
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
    const isCorrect = isTimeout ? false : (userMatch === isMatch);
    
    if (!isCorrect) {
        setConsecutiveFailures(p => p + 1);
        if (consecutiveFailures + 1 >= 3) {
            setIsRepairMode(true);
            setRepairTargetType(current.stimulus.type);
            setRepairSuccesses(0);
        }
    } else {
        setConsecutiveFailures(0);
    }

    updateElo(isCorrect);
    setLogs(prev => [{
      id: turnCount, timestamp: new Date().toLocaleTimeString(), elo: activeElo, nBackItem: target, currentItem: current, userAnswer: userMatch, isMatch: isMatch, isCorrect: isCorrect, reactionTime: Date.now() - startTimeRef.current, timedOut: isTimeout
    }, ...prev]);
    setPhase('FEEDBACK');
  }, [config.nBackLevel, history, turnCount, activeElo, isRepairMode, repairSuccesses, consecutiveFailures, currentItem, nextTurn, repairTargetResult]);

  const handleContinue = useCallback(() => {
     if (history.length < config.nBackLevel && !isRepairMode) setPhase('WARMUP');
     else setPhase('PLAYING');
     nextTurn();
  }, [history.length, config.nBackLevel, nextTurn, isRepairMode]);

  useEffect(() => {
    if ((phase === 'PLAYING' || phase === 'WARMUP') && timer > 0 && config.baseTimer !== -1) {
      timerRef.current = setInterval(() => {
        setTimer(t => { if (t <= 0.1) { if (phase === 'PLAYING') handleAnswer(false, true); else nextTurn(); return 0; } return t - 0.1; });
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
            if (isRepairMode) {
               if (isLeft) handleAnswer(false); else handleAnswer(true); 
            } else if (isButtonsFlipped) { 
               if (isLeft) handleAnswer(true); else handleAnswer(false); 
            } else { 
               if (isLeft) handleAnswer(false); else handleAnswer(true); 
            }
        }
        if (phase === 'FEEDBACK' && e.code === 'Enter') handleContinue();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isButtonsFlipped, handleAnswer, handleContinue, isRepairMode]);

  const init = () => { setHistory([]); setLogs([]); setTurnCount(0); setPhase('WARMUP'); setTimeout(nextTurn, 0); };
  const resetRealElo = () => { if (confirm("Reset ACTUAL Elo Rating to 1000?")) { setRealElo(1000); if (!config.isPracticeMode) setActiveElo(1000); setPhase('IDLE'); } };
  const openSettings = () => { setTempConfig(config); setShowSettings(true); };
  const saveSettings = () => { setConfig(tempConfig); setActiveElo(realElo); setPhase('IDLE'); setHistory([]); setLogs([]); setShowSettings(false); };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-slate-200 font-sans flex flex-col p-2 md:p-4 selection:bg-purple-500/40 relative">
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0" style={{ backgroundImage: 'radial-gradient(circle at center, #1e1b4b 0%, #000 70%)' }} />
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-4 border-b border-slate-800 pb-2 z-10 px-2 flex-shrink-0">
        <div className="flex items-center gap-2"><div className="p-1.5 bg-white text-black font-black text-lg rounded shadow-[0_0_15px_rgba(255,255,255,0.3)]">Ω</div><div><div className="font-bold tracking-widest text-base md:text-lg leading-none">OMEGA</div><div className="text-[10px] text-slate-500 uppercase font-mono hidden md:block leading-none">Ultimate RFT Engine</div></div></div>
        <div className="flex items-center gap-4 md:gap-8 text-xs font-mono uppercase"><div className="text-right"><div className="text-slate-500 text-[10px]">{config.isPracticeMode ? 'PRAC ELO' : 'REAL ELO'}</div><div className={`${config.isPracticeMode ? 'text-yellow-400' : 'text-emerald-400'} font-bold text-base flex items-center gap-2 justify-end`}>{activeElo} {!config.isPracticeMode && (<button onClick={resetRealElo} className="opacity-0 hover:opacity-100 transition-opacity text-red-500"><XCircle className="w-3 h-3"/></button>)}</div></div><button onClick={() => setShowTutorial(true)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white" title="How to Play"><BookOpen className="w-5 h-5" /></button><button onClick={openSettings} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"><Settings className="w-5 h-5" /></button></div>
      </div>
      
      {/* REPAIR MODE BANNER */}
      {isRepairMode && (<div className="absolute top-16 left-0 w-full bg-red-900/90 text-white text-center py-1 text-xs font-bold uppercase tracking-widest z-50 animate-pulse border-y border-red-500"><Wrench className="w-3 h-3 inline mr-2"/> JAMMED GUN PROTOCOL: REPAIRING {repairTargetType?.replace('FLUX_', '')} ({repairSuccesses}/3)</div>)}
      
      {/* WARMUP BANNER */}
      {phase === 'WARMUP' && !isRepairMode && (
          <div className="absolute top-16 left-0 w-full bg-blue-900/90 text-white text-center py-1 text-xs font-bold uppercase tracking-widest z-50 border-y border-blue-500 animate-pulse">
              NEW SYSTEM DETECTED: CALIBRATING N-{config.nBackLevel} BUFFER...
          </div>
      )}

      {/* Settings & Tutorial Modals */}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-purple-400"/> CONFIGURATION</h2><button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white"><XCircle className="w-6 h-6"/></button></div>
              <div className="flex flex-col gap-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">N-Back Level: <span className="text-white text-base ml-2">{tempConfig.nBackLevel}</span></label><input type="range" min="1" max="9" step="1" value={tempConfig.nBackLevel} onChange={(e) => setTempConfig(p => ({...p, nBackLevel: parseInt(e.target.value)}))} className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"/></div>
              <div className="flex flex-col gap-2"><div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Timer Base</label><div className="flex items-center gap-2"><span className={`text-xs ${tempConfig.baseTimer === -1 ? 'text-slate-600' : 'text-purple-400'}`}>INFINITE</span><button onClick={() => setTempConfig(p => ({...p, baseTimer: p.baseTimer === -1 ? 10 : -1}))} className={`w-10 h-5 rounded-full relative transition-colors ${tempConfig.baseTimer === -1 ? 'bg-purple-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${tempConfig.baseTimer === -1 ? 'left-6' : 'left-1'}`} /></button></div></div>{tempConfig.baseTimer !== -1 && (<input type="range" min="3" max="30" step="1" value={tempConfig.baseTimer} onChange={(e) => setTempConfig(p => ({...p, baseTimer: parseInt(e.target.value)}))} className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"/>)}</div><div className="h-px bg-slate-800 w-full my-2"/>
              <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                      <div><div className="text-sm font-bold text-white">PRACTICE MODE</div></div>
                      <button onClick={() => setTempConfig(p => ({...p, isPracticeMode: !p.isPracticeMode}))} className={`w-12 h-6 rounded-full relative transition-colors ${tempConfig.isPracticeMode ? 'bg-yellow-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${tempConfig.isPracticeMode ? 'left-7' : 'left-1'}`} /></button>
                  </div>

                  {tempConfig.isPracticeMode && (
                     <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-yellow-500 uppercase">Simulation Difficulty</label>
                            <span className="text-xs text-slate-400 font-mono">Locked to Real Elo ({realElo})</span>
                        </div>
                        
                        {/* MIXED MODE BUTTON */}
                        <button 
                            onClick={() => setTempConfig(p => ({...p, practiceType: 'MIXED'}))}
                            className={`w-full py-3 font-bold text-sm rounded border transition-all mb-2 flex items-center justify-center gap-2
                            ${tempConfig.practiceType === 'MIXED' || !tempConfig.practiceType
                                ? 'bg-yellow-500 text-black border-yellow-500' 
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                        >
                            <Activity className="w-4 h-4"/> MIXED MODE (ALL FRAMES)
                        </button>

                        {/* INDIVIDUAL FRAMES GRID */}
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'FLUX_FEATURE', label: 'Feature' },
                                { id: 'FLUX_COMPARISON', label: 'Comparison' },
                                { id: 'FLUX_OPPOSITION', label: 'Opposition' },
                                { id: 'FLUX_HIERARCHY', label: 'Hierarchy' },
                                { id: 'FLUX_CAUSAL', label: 'Causal' },
                                { id: 'FLUX_SPATIAL', label: 'Spatial' },
                                { id: 'FLUX_DEICTIC', label: 'Deictic' },
                                { id: 'FLUX_CONDITIONAL', label: 'Conditional' },
                                { id: 'FLUX_ANALOGY', label: 'Analogy' }
                            ].map((mode) => (
                                <button
                                  key={mode.id}
                                  onClick={() => setTempConfig(p => ({...p, practiceType: mode.id as GeneratorType}))}
                                  className={`text-[10px] md:text-xs font-bold p-2 rounded border transition-all 
                                  ${tempConfig.practiceType === mode.id 
                                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                                      : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                     </div>
                  )}
              </div>
              <button onClick={saveSettings} className="mt-4 w-full py-3 bg-white text-black font-black rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> SAVE & RESTART</button>
           </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 overflow-hidden">
        {phase === 'IDLE' && (
          <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-3xl text-center shadow-2xl mx-auto w-full max-w-4xl animate-in fade-in zoom-in-95">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-6">COGNITIVE FLUX</h1>
            <p className="text-slate-400 text-sm md:text-base mb-10 leading-relaxed">Ultimate Relational Frame Training.<br/>Decode the <span className="text-purple-400 font-bold">Blind Cipher</span>. Match the Logic to N-{config.nBackLevel}.</p>
            <div className="flex justify-center gap-6 mb-10 text-slate-500"><div className="flex flex-col items-center gap-2"><Cpu className="w-6 h-6"/><span>Cipher</span></div><div className="flex flex-col items-center gap-2"><Network className="w-6 h-6"/><span>Graph</span></div><div className="flex flex-col items-center gap-2"><BrainCircuit className="w-6 h-6"/><span>Logic</span></div></div>
            <div className="flex flex-col items-center w-full gap-4">
                <button onClick={() => setShowTutorial(true)} className="px-8 py-3 bg-slate-800 text-slate-300 font-bold tracking-widest rounded-xl hover:bg-slate-700 transition-transform hover:scale-105 flex items-center justify-center gap-2 text-xs border border-slate-700"><BookOpen className="w-4 h-4"/> HOW TO PLAY</button>
                <button onClick={init} className="w-full max-w-md py-5 bg-white text-black font-black tracking-widest rounded-xl hover:bg-slate-200 transition-transform hover:scale-[1.02] flex items-center justify-center gap-3 text-lg shadow-xl shadow-white/10"><Zap className="w-5 h-5 fill-current"/> INITIALIZE</button>
            </div>
          </div>
        )}
        {(phase === 'WARMUP' || phase === 'PLAYING') && currentItem && (
          <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 gap-4 md:gap-8">
              <div className={`w-full flex-1 flex flex-col lg:flex-row gap-4 items-center justify-center min-h-0 ${currentItem.stimulus.dictionaryPos === 'RIGHT' ? 'lg:flex-row-reverse' : ''}`}>
                 <div className="flex-1 p-4 md:p-8 bg-slate-900 border border-slate-700 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center gap-4 w-full h-full max-h-[60vh]"><VisualRenderer stim={currentItem.stimulus} isRepairMode={isRepairMode} /><div className="bg-black px-4 py-2 rounded-lg text-slate-300 font-mono text-sm md:text-lg border border-slate-800 tracking-wider shadow-inner mt-4">{currentItem.stimulus.textQuery}</div></div>
                 <div className="w-full lg:w-64 flex flex-col gap-2 p-4 bg-slate-900/80 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-xl h-fit"><div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-2"><Code className="w-3 h-3 text-purple-400"/> Cipher Key</div>{Object.entries(currentItem.stimulus.dictionary).map(([k,v]) => (<div key={k} className="px-3 py-2 bg-black rounded-lg border border-slate-800 text-xs font-mono flex justify-between items-center group"><span className="text-purple-400 font-bold text-lg">{k}</span><span className="text-slate-600">=</span><span className="text-slate-200 font-bold">{v}</span></div>))}</div>
              </div>
              <div className="w-full flex flex-col gap-4 flex-shrink-0">
                 {config.baseTimer !== -1 ? (<div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-100 ease-linear ${timer<3?'bg-red-500':'bg-white'}`} style={{width: `${(timer/((config.baseTimer + (getComplexityCost(currentItem.stimulus)-1)*1.5) - (Math.max(0, (activeElo-1000)/1000)*2)))*100}%`}} /></div>) : (<div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner flex items-center justify-center"><div className="w-full h-full bg-slate-800 animate-pulse" /></div>)}
                 <div className="flex gap-4 w-full justify-center">
                     {isRepairMode ? (
                         <div className="flex flex-col items-center gap-4 w-full">
                             <div className="text-yellow-400 font-black text-xl uppercase tracking-widest bg-slate-900/80 px-6 py-2 rounded-xl border border-yellow-500/30">VERIFY: {repairTargetResult}</div>
                             <div className="flex gap-4 w-full">
                                <button onClick={() => handleAnswer(false)} className="flex-1 py-4 bg-slate-900 border-2 border-red-900/50 text-red-500 font-black text-xl rounded-2xl hover:bg-red-900/20 transition-all shadow-lg active:scale-95">FALSE<div className="text-[10px] opacity-50 mt-1 font-mono">D / ←</div></button>
                                <button onClick={() => handleAnswer(true)} className="flex-1 py-4 bg-slate-900 border-2 border-emerald-900/50 text-emerald-500 font-black text-xl rounded-2xl hover:bg-emerald-900/20 transition-all shadow-lg active:scale-95">TRUE<div className="text-[10px] opacity-50 mt-1 font-mono">J / →</div></button>
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
                 <div className={`p-4 flex flex-shrink-0 justify-between items-center ${logs[0].isCorrect ? 'bg-emerald-950/30 text-emerald-400' : 'bg-red-950/30 text-red-400'} border-b border-slate-800`}><div className="flex items-center gap-3">{logs[0].isCorrect ? <CheckCircle className="w-6 h-6"/> : <XCircle className="w-6 h-6"/>}<h2 className="text-xl md:text-2xl font-black tracking-tight">{logs[0].timedOut ? 'TIMEOUT' : (logs[0].isCorrect ? 'VERIFIED' : 'FAILED')}</h2></div><div className="text-xs font-mono opacity-70 bg-black/30 px-2 py-1 rounded">{Math.round(logs[0].reactionTime)}ms</div></div>
                 <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 min-h-0">
                    {!logs[0].isRepair && logs[0].nBackItem && (<div className="p-4 flex flex-col items-center opacity-60 bg-slate-950/30"><div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800"><History className="w-3 h-3"/> N-{config.nBackLevel}</div><div className="mb-2 scale-[0.65] origin-center"><VisualRenderer stim={logs[0].nBackItem.stimulus} /></div><BlurredLogicBox label="Target Logic" result={logs[0].nBackItem.result} proof={logs[0].nBackItem.stimulus.logicProof} /></div>)}
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