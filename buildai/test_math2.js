function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const NULL = String.fromCharCode(0);
  const FUNC_NAMES = new Set(['sin','cos','tan','asin','acos','atan','sqrt','log','ln','abs','round','ceil','floor','pow','min','max']);
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ') { i++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '(' || ch === ')' || ch === ',') {
      tokens.push({type:'op', value:ch});
      i++;
      continue;
    }
    if (ch === '.') { tokens.push({type:'number', value:'0.'}); i++; continue; }
    if (/[0-9.]/.test(ch)) { let num=''; while (i<expr.length && /[0-9.]/.test(expr[i])) { num+=expr[i]; i++; } if (!/^\d+(\.\d+)?$/.test(num) && !/^\d*\.?\d+$/.test(num)) throw new Error('Invalid number: '+num); tokens.push({type:'number', value:num}); continue; }
    if (ch === 'π') { tokens.push({type:'const', value:'PI'}); i++; continue; }
    if (ch === 'e') { tokens.push({type:'const', value:'E'}); i++; continue; }
    if (/[a-zA-Z]/.test(ch)) { let name=''; while (i<expr.length && /[a-zA-Zπ]/.test(expr[i])) { name+=expr[i]; i++; } const normalized=name.replace(/π/g,'').toLowerCase(); if (normalized==='pi') tokens.push({type:'const',value:'PI'}); else if (normalized==='e') tokens.push({type:'const',value:'E'}); else if (FUNC_NAMES.has(normalized)) tokens.push({type:'func',value:normalized}); else throw new Error('Invalid function: '+name); continue; }
    throw new Error('Invalid char: '+ch);
  }
  tokens.push({type:'op', value:NULL});
  return tokens;
}
function applyFunction(name, args) {
  switch(name){
    case 'sin': return Math.sin(args[0]);
    case 'cos': return Math.cos(args[0]);
    case 'tan': return Math.tan(args[0]);
    case 'asin': return Math.asin(args[0]);
    case 'acos': return Math.acos(args[0]);
    case 'atan': return Math.atan(args[0]);
    case 'sqrt': return Math.sqrt(args[0]);
    case 'log': return Math.log10(args[0]);
    case 'ln': return Math.log(args[0]);
    case 'abs': return Math.abs(args[0]);
    case 'round': return Math.round(args[0]);
    case 'ceil': return Math.ceil(args[0]);
    case 'floor': return Math.floor(args[0]);
    case 'pow': return Math.pow(args[0],args[1]);
    case 'min': return Math.min(...args);
    case 'max': return Math.max(...args);
    default: throw new Error('Unknown function');
  }
}
function evaluate(expr) {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const consume = (v) => { if (peek().value !== v) return false; next(); return true; };
  const parseExpression = () => {
    let left = parseTerm();
    while (peek().value === '+' || peek().value === '-') { const op = next().value; const right = parseTerm(); left = op === '+' ? left + right : left - right; }
    return left;
  };
  const parseTerm = () => {
    let left = parseFactor();
    while (peek().value === '*' || peek().value === '/' || peek().value === '%') { const op = next().value; const right = parseFactor(); if (op==='*') left*=right; else if (op==='/') { if (right===0) throw new Error('Division by zero'); left/=right; } else { left=(left/100)*right; } }
    return left;
  };
  const parseFactor = () => { if (peek().value === '-') { next(); return -parseFactor(); } if (peek().value === '+') { next(); return parseFactor(); } return parsePrimary(); };
  const parsePrimary = () => {
    const tok = peek();
    if (tok.type === 'number') { next(); return parseFloat(tok.value); }
    if (tok.type === 'const') { next(); if (tok.value === 'PI') return Math.PI; if (tok.value === 'E') return Math.E; throw new Error('Unknown constant'); }
    if (tok.type === 'func') { next(); if (!consume('(')) throw new Error('Expected ('); const args=[]; args.push(parseExpression()); while (consume(',')) args.push(parseExpression()); if (!consume(')')) throw new Error('Expected )'); return applyFunction(tok.value, args); }
    if (tok.value === '(') { next(); const val = parseExpression(); if (!consume(')')) throw new Error('Expected )'); return val; }
    throw new Error('Expected expression');
  };
  const result = parseExpression();
  if (peek().value !== String.fromCharCode(0)) throw new Error('Invalid expression');
  return result;
}
const tests = [
  ['1+2*3', 7],
  ['(1+2)*3', 9],
  ['10/4', 2.5],
  ['600*10%', 60],
  ['sqrt(16)+2', 6],
  ['sin(pi/2)', 1],
  ['pow(2,3)', 8],
  ['200+10%', 200.1],
  ['log10(100)', 2],
  ['ln(e)', 1],
  ['7%2', 0.07],
  ['10-5+3', 8],
  ['2*(3+4)', 14],
  ['0.5+0.25', 0.75],
  ['30%20', 6],
  ['abs(-5)+2', 7],
  ['min(3,4,5)', 3],
  ['max(3,4,5)', 5],
  ['5/0', null],
  ['1+)', null],
];
let failed = 0;
for (const [expr, expected] of tests) {
  try {
    const r = evaluate(expr);
    if (expected === null) { console.log('PASS ' + expr + ' threw'); }
    else {
      const ok = Math.abs(r - expected) < 1e-9;
      console.log((ok?'PASS':'FAIL') + ' ' + expr + ' = ' + r + ' (expected ' + expected + ')');
      if (!ok) failed++;
    }
  } catch (e) {
    if (expected === null) { console.log('PASS ' + expr + ' threw: ' + e.message); }
    else { console.log('ERROR ' + expr + ' -> ' + e.message); failed++; }
  }
}
console.log(failed === 0 ? 'ALL PASSED' : failed + ' FAILED');
process.exit(failed === 0 ? 0 : 1);
