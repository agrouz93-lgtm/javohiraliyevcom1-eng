import {arithmetic} from './vision.mjs';

export const initialCalculator = {display:'0',stored:null,operator:null,fresh:false,last:null,expression:'',error:''};
function numberText(value) {
  if (!Number.isFinite(value)) throw new Error('Natija juda katta.');
  return String(Number(value.toPrecision(12)));
}
export function calculatorStep(state,key) {
  if (key==='AC') return {...initialCalculator};
  const current=state.error?{...initialCalculator}:state;
  try {
    if (/^[0-9]$/.test(key)) {
      const display=current.fresh||current.display==='0'?key:current.display+key;
      return display.replace(/[-.]/g,'').length>14?current:{...current,display,fresh:false,error:''};
    }
    if(key==='.') return {...current,display:current.fresh?'0.':current.display.includes('.')?current.display:current.display+'.',fresh:false};
    if(key==='⌫') return {...current,display:current.fresh?'0':current.display.slice(0,-1).replace(/^-$|^$/,'0'),fresh:false};
    if(key==='±') return {...current,display:numberText(-Number(current.display))};
    if(key==='%') {
      const value=Number(current.display);
      const result=current.stored!==null&&['+','-'].includes(current.operator)?current.stored*value/100:value/100;
      return {...current,display:numberText(result),fresh:false};
    }
    if(['+','-','×','÷'].includes(key)) {
      const value=Number(current.display);
      const stored=current.operator&&!current.fresh?arithmetic(current.stored,current.operator,value):value;
      return {...current,display:numberText(stored),stored,operator:key,fresh:true,last:null,expression:numberText(stored)+' '+key};
    }
    if(key==='=') {
      const operator=current.operator??current.last?.operator;
      if(!operator)return current;
      const right=current.operator?Number(current.display):current.last.right;
      const left=current.operator?current.stored:Number(current.display);
      return {...current,display:numberText(arithmetic(left,operator,right)),stored:null,operator:null,fresh:true,last:{operator,right},expression:numberText(left)+' '+operator+' '+numberText(right)+' ='};
    }
    return current;
  } catch(error) {return {...current,error:error.message,fresh:true};}
}
