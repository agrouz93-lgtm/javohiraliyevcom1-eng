import { useState, useCallback } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Lock, Unlock, FileText, Save, Trash2, Plus, Settings as SettingsIcon } from 'lucide-react';

type CalcMode = 'simple' | 'scientific' | 'secret';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
interface Token {
  type: 'number' | 'op' | 'func' | 'const';
  value: string;
}
const FUNC_NAMES = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sec', 'csc', 'cot',
  'sqrt', 'log', 'ln', 'log2',
  'abs', 'round', 'ceil', 'floor', 'trunc',
  'pow', 'min', 'max',
]);

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ') { i += 1; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '(' || ch === ')') {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    if (ch === '.') { tokens.push({ type: 'number', value: '0.' }); i += 1; continue; }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i += 1; }
      if (!/^\d+(\.\d+)?$/.test(num) && !/^\d*\.?\d+$/.test(num)) throw new Error('Noto\'g\'ri son');
      tokens.push({ type: 'number', value: num });
      continue;
    }
    if (ch === 'π') { tokens.push({ type: 'const', value: 'PI' }); i += 1; continue; }
    if (ch === 'e') { tokens.push({ type: 'const', value: 'E' }); i += 1; continue; }
    if (/[a-zA-Z]/.test(ch)) {
      let name = '';
      while (i < expr.length && /[a-zA-Zπ]/.test(expr[i])) { name += expr[i]; i += 1; }
      while (i < expr.length && /[0-9]/.test(expr[i])) { name += expr[i]; i += 1; }
      const normalized = name.replace(/π/g, '').toLowerCase();
      if (normalized === 'pi') { tokens.push({ type: 'const', value: 'PI' }); }
      else if (normalized === 'e') { tokens.push({ type: 'const', value: 'E' }); }
      else if (FUNC_NAMES.has(normalized)) { tokens.push({ type: 'func', value: normalized }); }
      else throw new Error('Noto\'g\'ri funksiya');
      continue;
    }
    throw new Error('Noto\'g\'ri belgi');
  }
  tokens.push({ type: 'op', value: '\0' });
  return tokens;
}

function applyFunction(name: string, args: number[]): number {
  switch (name) {
    case 'sin': return Math.sin(args[0]);
    case 'cos': return Math.cos(args[0]);
    case 'tan': return Math.tan(args[0]);
    case 'asin': return Math.asin(args[0]);
    case 'acos': return Math.acos(args[0]);
    case 'atan': return Math.atan(args[0]);
    case 'sec': return 1 / Math.cos(args[0]);
    case 'csc': return 1 / Math.sin(args[0]);
    case 'cot': return 1 / Math.tan(args[0]);
    case 'sqrt': return Math.sqrt(args[0]);
    case 'log': return Math.log10(args[0]);
    case 'ln': return Math.log(args[0]);
    case 'log2': return Math.log2(args[0]);
    case 'abs': return Math.abs(args[0]);
    case 'round': return Math.round(args[0]);
    case 'ceil': return Math.ceil(args[0]);
    case 'floor': return Math.floor(args[0]);
    case 'trunc': return Math.trunc(args[0]);
    case 'pow': return Math.pow(args[0], args[1]);
    case 'min': return Math.min(...args);
    case 'max': return Math.max(...args);
    default: throw new Error('Noto\'g\'ri funksiya');
  }
}

function evaluate(expr: string): number {
  const tokens = tokenize(expr);
  let pos = 0;

  const peek = (): Token => tokens[pos];
  const next = (): Token => tokens[pos++];
  const consume = (v: string): boolean => {
    if (peek().value !== v) return false;
    next();
    return true;
  };

  const parseExpression = (): number => {
    let left = parseTerm();
    while (peek().value === '+' || peek().value === '-') {
      const op = next().value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parseFactor();
    while (peek().value === '*' || peek().value === '/') {
      const op = next().value;
      const right = parseFactor();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Nolga bo\'lish imkoni yo\'q');
        left /= right;
      } else {
        left = (left / 100) * right;
      }
    }
    return left;
  };

  const parseFactor = (): number => {
    if (peek().value === '-') { next(); return -parseFactor(); }
    if (peek().value === '+') { next(); return parseFactor(); }
    return parsePrimary();
  };

  const parsePrimary = (): number => {
    const tok = peek();
    if (tok.type === 'number') {
      next();
      let val = parseFloat(tok.value);
      if (peek().value === '%') { next(); val = val / 100; }
      return val;
    }
    if (tok.type === 'const') {
      next();
      if (tok.value === 'PI') return Math.PI;
      if (tok.value === 'E') return Math.E;
      throw new Error('Unknown constant');
    }
    if (tok.type === 'func') {
      next();
      if (!consume('(')) throw new Error('Expected (');
      const args: number[] = [];
      args.push(parseExpression());
      while (consume(',')) args.push(parseExpression());
      if (!consume(')')) throw new Error('Expected )');
      return applyFunction(tok.value, args);
    }
    if (tok.value === '(') {
      next();
      const val = parseExpression();
      if (!consume(')')) throw new Error('Expected )');
      return val;
    }
    throw new Error('Expected expression');
  };

  const result = parseExpression();
  if (peek().value !== '\0') throw new Error('Invalid expression');
  return result;
}

function safeEval(expr: string): number {
  const result = evaluate(expr);
  if (!isFinite(result) || isNaN(result)) throw new Error('Invalid result');
  return result;
}

let ANS_MEM = 0;

export function CalculatorPage() {
  const { language, appPin, setAppPin, verifyPin } = useAppStore();
  const [mode, setMode] = useState<CalcMode>('simple');
  const [display, setDisplay] = useState('0');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ expr: string; res: string }[]>([]);
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [creatingPin, setCreatingPin] = useState(false);
  const [pinConfirm, setPinConfirm] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  const tKey = (key: string) => {
    const trans: Record<string, Record<string, string>> = {
      invalidExpr: { uz: "Noto'g'ri ifoda", ru: 'Неверное выражение', en: 'Invalid expression' },
      divZero: { uz: "Nolga bo'lish mumkin emas", ru: 'Деление на ноль', en: 'Division by zero' },
      invalidRes: { uz: "Noto'g'ri natija", ru: 'Неверный результат', en: 'Invalid result' },
    };
    return trans[key]?.[language] || key;
  };

  const addToHistory = (expr: string, res: string) => {
    setHistory((prev) => [{ expr, res }, ...prev].slice(0, 50));
  };

  const clear = () => {
    setDisplay('0');
    setResult(null);
    setError(null);
  };

  const backspace = () => {
    setError(null);
    setDisplay((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const append = (ch: string) => {
    setError(null);
    if (display === '0' && ch !== '.') setDisplay(ch);
    else setDisplay((prev) => prev + ch);
  };

  const toggleSign = () => {
    setError(null);
    setDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : prev === '0' ? '0' : '-' + prev));
  };

  const calculate = useCallback(() => {
    try {
      setError(null);
      const val = safeEval(display);
      const resStr = Number.isInteger(val) ? val.toString() : val.toFixed(6).replace(/\.?0+$/, '');
      ANS_MEM = val;
      setResult(resStr);
      addToHistory(display, resStr);
      setDisplay(resStr);
    } catch (err: any) {
      setError(err.message || tKey('invalidRes'));
      setResult(null);
    }
  }, [display, tKey]);

  const handleOp = (op: string) => {
    setError(null);
    append(op);
  };

  const createPin = () => {
    if (pinInput.length !== 6) return;
    setAppPin(pinInput);
    setCreatingPin(false);
    setPinInput('');
    setSecretUnlocked(true);
  };

  const confirmPin = () => {
    if (pinConfirm !== pinInput) {
      setPinConfirm('');
      setError('PIN-kodlar mos kelmadi');
      return;
    }
    createPin();
  };

  const tryUnlock = async () => {
    const ok = await verifyPin(pinInput);
    if (ok) {
      setSecretUnlocked(true);
      setError(null);
      setPinInput('');
    } else {
      setError('Noto\'g\'ri PIN-kod');
    }
  };

  const addNote = () => {
    if (!newNoteTitle.trim()) return;
    const note: Note = {
      id: Date.now().toString(),
      title: newNoteTitle,
      content: newNoteContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [note, ...prev]);
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  const deleteNote = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  const tabs = [
    { key: 'simple' as CalcMode, label: t(language, 'simpleCalc') },
    { key: 'scientific' as CalcMode, label: t(language, 'scientificCalc') },
    { key: 'secret' as CalcMode, label: t(language, 'secretCalc') },
  ];

  const keyRows = [
    ['C', '⌫', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['+/-', '0', '.', '='],
  ];

  const sciRows = [
    ['sin', 'cos', 'tan', 'sqrt'],
    ['log', 'ln', 'pow', 'π'],
    ['ans', '(', ')', 'C'],
  ];

  return (
    <div className="min-h-screen bg-[#061426]">
      <div className="max-w-xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-[#F5F8FF]">{t(language, 'calculator')}</h1>
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant={mode === tab.key ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setMode(tab.key);
                  setError(null);
                  setResult(null);
                }}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {mode === 'secret' && !appPin && !creatingPin && !secretUnlocked && (
          <div className="max-w-md mx-auto mt-6">
            <Card className="p-8 text-center">
              <Lock className="w-12 h-12 text-[#1677FF] mx-auto mb-4" />
              <h2 className="text-[#F5F8FF] font-semibold mb-2">Maxfiy papka</h2>
              <p className="text-[#9EB7D3] text-sm mb-6">PIN-kod yarating. Maxfiy ma'lumotlar shifrlangan saqlanadi.</p>
              <div className="space-y-3">
                <input
                  autoFocus
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 xonali PIN"
                  className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-4 py-3 text-center text-lg tracking-wider"
                />
                <Button className="w-full" onClick={createPin} disabled={pinInput.length !== 6}>
                  PIN-kodni tasdiqlash
                </Button>
              </div>
            </Card>
          </div>
        )}

        {mode === 'secret' && creatingPin && (
          <div className="max-w-md mx-auto mt-6">
            <Card className="p-8 text-center">
              <h2 className="text-[#F5F8FF] font-semibold mb-2">PIN tasdiqlash</h2>
              <p className="text-[#9EB7D3] text-sm mb-6">Yangi PIN-kodni qaytadan kiriting</p>
              <div className="space-y-3">
                <input
                  autoFocus
                  type="password"
                  maxLength={6}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="Takrorlang"
                  className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-4 py-3 text-center text-lg tracking-wider"
                />
                <Button className="w-full" onClick={confirmPin} disabled={pinConfirm.length !== 6}>
                  Tasdiqlash
                </Button>
              </div>
            </Card>
          </div>
        )}

        {mode === 'secret' && appPin && !secretUnlocked && (
          <div className="max-w-md mx-auto mt-6">
            <Card className="p-8 text-center">
              <Lock className="w-12 h-12 text-[#29B6FF] mx-auto mb-4" />
              <h2 className="text-[#F5F8FF] font-semibold mb-2">Kirish uchun PIN</h2>
              <p className="text-[#9EB7D3] text-sm mb-6">Maxfiy papkaga kirish uchun PIN-kodingizni kiriting</p>
              <div className="space-y-3">
                <input
                  autoFocus
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN-kod"
                  className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-4 py-3 text-center text-lg tracking-wider"
                />
                <div className="flex gap-2">
                  <Button className="w-1/2" onClick={tryUnlock} disabled={pinInput.length !== 6}>
                    Kirish
                  </Button>
                  <Button variant="outline" className="w-1/2 text-sm" onClick={() => setMode('simple')}>
                    Bekor
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {!mode.startsWith('secret') || secretUnlocked ? (
          <div className={`max-w-xl mx-auto px-6 ${mode === 'secret' ? 'mt-6' : 'mt-8'}`}>
            <div className="bg-[#0A1D33] border border-[#174D78] rounded-2xl p-6 min-h-[220px] flex flex-col justify-between shadow-xl shadow-[#1677FF]/10">
              <div className="text-right">
                <div className="text-[#6B7C93] text-xs mb-1 font-mono">{history.length ? history[0].expr : ''}</div>
                <div className="text-4xl font-bold text-[#F5F8FF] font-mono mb-2">{display}</div>
                {error ? (
                  <div className="text-[#FF6B6B] text-sm mb-4">{error}</div>
                ) : (
                  result && <div className="text-[#22C99A] text-sm font-mono">= {result}</div>
                )}
              </div>
            </div>

            {mode !== 'secret' ? (
              <div className="mt-6 grid grid-cols-4 gap-3">
                {keyRows.map((row) =>
                  row.map((key) => (
                    <Button
                      key={`${row.join('-')}-${key}`}
                      variant={key === '=' ? 'primary' : key === 'C' ? 'outline' : 'secondary'}
                      className="h-14 text-lg font-medium"
                      onClick={() => {
                        if (key === 'C') clear();
                        else if (key === '⌫') backspace();
                        else if (key === '+/-') toggleSign();
                        else if (key === '=') calculate();
                        else handleOp(key);
                      }}
                    >
                      {key}
                    </Button>
                  ))
                )}
                {mode === 'scientific' && [
                  'sin', 'cos', 'tan', 'sqrt', 'log', 'ln', 'pow', 'ans', '(', ')',
                ].map((f) => (
                  <Button key={f} variant="outline" size="sm" onClick={() => append(f + (f === 'ans' ? '' : '('))}>
                    {f}
                  </Button>
                ))}
              </div>
            ) : null}

            {history.length > 0 && mode !== 'secret' && (
              <div className="mt-6">
                <div className="flex justify-between mb-2">
                  <h3 className="text-[#9EB7D3] text-sm font-medium">{t(language, 'history')}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setHistory([])}>
                    {t(language, 'delete')}
                  </Button>
                </div>
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <Card key={i} className="p-3" onClick={() => setDisplay(h.expr)}>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#9EB7D3]">{h.expr}</span>
                        <span className="text-[#22C99A] font-mono">{h.res}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {mode === 'secret' && secretUnlocked && (
          <div className="max-w-2xl mx-auto px-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Unlock className="w-5 h-5 text-[#22C99A]" />
                <h2 className="text-[#F5F8FF] font-semibold">Maxfiy eslatmalar</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSecretUnlocked(false)}>
                Qayta qulflash
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-[#F5F8FF] font-semibold mb-4">Yangi eslatma</h3>
                <div className="space-y-3">
                  <input
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder="Sarlavha"
                    className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2"
                  />
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Matn"
                    rows={3}
                    className="w-full bg-[#0A1D33] border border-[#174D78] rounded-lg text-[#F5F8FF] px-3 py-2"
                  />
                  <Button className="w-full" onClick={addNote}>
                    <Plus className="w-4 h-4 mr-2" /> Saqlash
                  </Button>
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="text-[#F5F8FF] font-semibold mb-4">Eslatmalar</h3>
                {notes.length === 0 ? (
                  <p className="text-[#6B7C93] text-sm text-center">Eslatmalar yo'q</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((n) => (
                      <div key={n.id} className="p-3 bg-[#0A1D33] rounded border border-[#174D78]">
                        <div className="flex justify-between mb-1">
                          <span className="text-[#F5F8FF] font-medium text-sm">{n.title}</span>
                          <Button variant="ghost" size="sm" onClick={() => deleteNote(n.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-[#9EB7D3] text-xs">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
