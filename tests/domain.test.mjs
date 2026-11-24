import test from 'node:test';
import assert from 'node:assert/strict';
import { rectangle, polygon, countMaterials, validPlan, suggestPlan, estimate } from '../app/domain.mjs';

test('12 × 8 m: 96 m² va 40 m', () => {
  assert.deepEqual(rectangle(12, 8), { area: 96, perimeter: 40 });
  const outline = [{x: 0, y: 0}, {x: 120, y: 0}, {x: 120, y: 80}, {x: 0, y: 80}];
  assert.ok(Math.abs(polygon(outline, 0.1).area - 96) < 1e-9);
  assert.equal(polygon(outline, 0.1).perimeter, 40);
  assert.equal(polygon(outline, 0), null);
});

test('4 to‘plam × 10 dona va qo‘lda tahrirlash', () => {
  const items = Array.from({length: 4}, (_, id) => ({id, type: 'Shifer', pieces: 10}));
  assert.equal(countMaterials(items).Shifer, 40);
  items[0].pieces = 6;
  items[1].type = 'Taxta';
  assert.deepEqual(countMaterials(items.slice(0, 3)), {Shifer: 16, Taxta: 10});
});

test('Reja JSON orqali qayta ochiladi va tekshiriladi', () => {
  const plan = suggestPlan('12×8 metr, 3 xona, oshxona va hammomli zamonaviy uy yarat');
  const reopened = JSON.parse(JSON.stringify(plan));
  assert.ok(validPlan(reopened));
  assert.deepEqual(reopened, plan);
  assert.equal(reopened.elements.length, 5);
  reopened.elements[0].w = 50;
  assert.equal(validPlan(reopened), false);
});

test('Chiqindi, narx, ustama va ish haqi', () => {
  const result = estimate('tile', 2, 2, 1, 0.25, 10, 100, 5, 500);
  assert.equal(result.quantity, 18);
  assert.equal(result.total, 2390);
});

