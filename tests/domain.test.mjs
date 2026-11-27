import test from 'node:test';
import assert from 'node:assert/strict';
import { rectangle, polygon, measurePhotoArea, measurePerspectiveArea, countMaterials, validPlan, suggestPlan, estimate } from '../app/domain.mjs';

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

test('Photo measurement uses the aspect ratio and the known reference length', () => {
  const a = {x: .2, y: .2}, b = {x: .6, y: .2}, c = {x: .6, y: .6}, d = {x: .2, y: .6};
  const points = [a, b, c, d];
  const result = measurePhotoArea(points, [a, b], 12, 1.5);
  assert.ok(Math.abs(result.area - 96) < 1e-9);
  assert.ok(Math.abs(result.perimeter - 40) < 1e-9);
  assert.equal(measurePhotoArea([a, c, b, d], [a, b], 12, 1.5), null);
  assert.equal(measurePhotoArea(points, [a, a], 12, 1.5), null);
  assert.equal(measurePhotoArea(points, [a, b], 0, 1.5), null);
});

test('A four-corner reference recovers the area of a separate L-shaped outline in an oblique photo', () => {
  const photo = ([x, y]) => {
    const depth = 1 + .026 * x + .04 * y;
    return {x: (.08 + .052 * x + .01 * y) / depth, y: (.17 + .01 * x + .071 * y) / depth};
  };
  const outline = [[0, 0], [12, 0], [12, 4], [8, 4], [8, 8], [0, 8]].map(photo);
  const reference = [[2, 1], [6, 1], [6, 4], [2, 4]].map(photo);
  const result = measurePerspectiveArea(outline, reference, 4, 3);
  assert.ok(Math.abs(result.area - 80) < 1e-9);
  assert.ok(Math.abs(result.perimeter - 40) < 1e-9);
  assert.equal(measurePerspectiveArea(outline, reference.slice(0, 3), 4, 3), null);
  assert.equal(measurePerspectiveArea(outline, [reference[0], reference[2], reference[1], reference[3]], 4, 3), null);
  assert.equal(measurePerspectiveArea(outline, reference, 0, 3), null);
});
