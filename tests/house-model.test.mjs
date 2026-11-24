import test from 'node:test';
import assert from 'node:assert/strict';
import {wallSegments,wallPieces,modelMetrics} from '../app/house-model.mjs';
import {validPlan} from '../app/domain.mjs';
const plan={width:12,depth:8,lotWidth:14,lotDepth:10,height:3,style:'Modern',roof:true,floors:4,elements:[{id:'wall',type:'Devor',floor:0,x:0,y:0,w:4,d:.25}]};
test('Actual wall opening subtracts geometry volume',()=>{
 const initial=modelMetrics(plan);
 const next={...plan,elements:[...plan.elements,{id:'door',type:'Eshik',floor:0,x:1,y:0,w:1,d:.25,height:2}]};
 assert.equal(initial.wallVolume,3);
 assert.equal(modelMetrics(next).wallVolume,2.5);
 assert.ok(wallPieces(next,wallSegments(next)[0]).length>1);
});
test('Opening does not cut a different floor and areas include all floors',()=>{
 const next={...plan,elements:[...plan.elements,{id:'window',type:'Deraza',floor:1,x:1,y:0,w:1,d:.25,height:1}]};
 assert.equal(modelMetrics(next).wallVolume,3);
 assert.equal(modelMetrics(next).area,384);
 assert.ok(validPlan(next));
 assert.ok(validPlan({...plan,floors:undefined,elements:plan.elements.map(e=>({...e,floor:undefined}))}));
 assert.equal(validPlan({...plan,floors:0}),false);
});
test('Partly overlapping opening removes only intersecting wall volume',()=>{
 const shifted={...plan,elements:[{...plan.elements[0],x:2},{id:'partial',type:'Eshik',x:1,y:0,w:2,d:.25,height:2}]};
 assert.equal(modelMetrics(shifted).wallVolume,2.5);
});
