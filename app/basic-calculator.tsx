'use client';
import {useReducer} from 'react';
import {calculatorStep,initialCalculator} from './calculator.mjs';

const keys=['AC','±','%','÷','7','8','9','×','4','5','6','-','1','2','3','+','⌫','0','.','='];
const labels:Record<string,string>={'AC':'Hammasini tozalash','±':'Ishorani almashtirish','%':'Foiz','÷':'Bo‘lish','×':'Ko‘paytirish','-':'Ayirish','+':'Qo‘shish','⌫':'Oxirgi raqamni o‘chirish','.':'Kasr belgisi','=':'Natijani hisoblash'};
export function BasicCalculator(){
  const [state,press]=useReducer(calculatorStep,initialCalculator);
  function keyboard(event:React.KeyboardEvent){
    const key=({'Enter':'=','Escape':'AC','Backspace':'⌫','Delete':'AC','*':'×','/':'÷',',':'.'} as Record<string,string>)[event.key]??event.key;
    if(keys.includes(key)){event.preventDefault();press(key);}
  }
  return <section className="panel basic-calculator">
    <div className="calc-heading"><h2>Kalkulyator</h2></div>
    <div className="pocket-calculator" tabIndex={0} onKeyDown={keyboard} aria-label="Raqamli kalkulyator">
      <div className="calc-screen"><div className="calc-expression">{state.expression||'Hisobni kiriting'}</div>
        <output aria-live="polite" aria-label="Hisob natijasi" className={state.error?'calc-result has-error':'calc-result'}>{state.error||state.display.replace('.',',')}</output>
      </div>
      <div className="calc-keys">{keys.map(key=><button type="button" key={key} aria-label={labels[key]??key} className={key==='='?'calc-equal':key==='AC'?'calc-clear':['+','-','×','÷'].includes(key)?'calc-operator':''} aria-pressed={['+','-','×','÷'].includes(key)?state.operator===key:undefined} onClick={()=>press(key)}>{key}</button>)}</div>
    </div>
  </section>;
}
