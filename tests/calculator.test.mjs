import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatorStep,initialCalculator} from '../app/calculator.mjs';
const calc=keys=>keys.reduce(calculatorStep,{...initialCalculator});
test('Keypad multiplication, decimal and chained calculation',()=>{
 assert.equal(calc(['1','2','×','8','=']).display,'96');
 assert.equal(calc(['0','.','1','+','0','.','2','=']).display,'0.3');
 assert.equal(calc(['2','+','3','×','4','=']).display,'20');
});
test('Percent, repeat equals, operator replacement',()=>{
 assert.equal(calc(['2','0','0','+','1','0','%','=']).display,'220');
 assert.equal(calc(['5','+','2','=','=']).display,'9');
 assert.equal(calc(['8','+','×','2','=']).display,'16');
});
test('Division error, reset and editing',()=>{
 assert.match(calc(['8','÷','0','=']).error,/Nol/);
 assert.equal(calc(['8','÷','0','=','3']).display,'3');
 assert.equal(calc(['1','2','⌫']).display,'1');
 assert.equal(calc(['5','±']).display,'-5');
 assert.equal(calc(['9','AC']).display,'0');
});

