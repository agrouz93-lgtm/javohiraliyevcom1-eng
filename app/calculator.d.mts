export type CalculatorState={display:string;stored:number|null;operator:string|null;fresh:boolean;last:{operator:string;right:number}|null;expression:string;error:string};
export const initialCalculator:CalculatorState;
export function calculatorStep(state:CalculatorState,key:string):CalculatorState;
