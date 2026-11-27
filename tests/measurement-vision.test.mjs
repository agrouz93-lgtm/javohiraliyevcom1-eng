import assert from 'node:assert/strict';
import test from 'node:test';
import {measurePerspectiveArea, polygon, projectiveRectangle} from '../app/domain.mjs';
import {markerMeters, markerPattern, measurementMarkerPdf, paperDimensions} from '../app/measurement-marker.mjs';
import {calibrateFloor, findFloorReference, measuredDimensions, suggestRoomOutline, suggestVisibleFloorBoundary, visibleFloorPolygon} from '../app/measurement-vision.mjs';

test('Room vision favors the enclosed floor in the lower part of the photograph', () => {
  const width = 120, height = 100;
  const image = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const floor = y >= 51 && y < 94 && x >= 28 - (y - 51) / 4 && x < 89 + (y - 51) / 4;
      image.set(floor ? [132, 85, 51, 255] : y < 60 ? [181, 193, 207, 255] : [98, 108, 127, 255], (y * width + x) * 4);
    }
  }
  const contour = suggestRoomOutline(image, width, height);
  assert.ok(contour.length >= 4);
  assert.ok(Math.min(...contour.map(point => point.y)) >= .49);
  assert.ok(Math.max(...contour.map(point => point.y)) >= .92);
  assert.ok(polygon(contour, 1).area > .22);
});

test('A rectified room exposes real dimensions and perimeter', () => {
  const a = {x: .2, y: .2}, b = {x: .7, y: .25};
  const c = {x: .82, y: .82}, d = {x: .11, y: .75};
  const reference = [a, b, c, d];
  const result = measurePerspectiveArea(reference, reference, 6, 4);
  const dimensions = measuredDimensions(result.outline);
  assert.ok(Math.abs(result.area - 24) < 1e-9);
  assert.ok(Math.abs(result.perimeter - 20) < 1e-9);
  assert.ok(Math.abs(dimensions.length - 6) < 1e-9);
  assert.ok(Math.abs(dimensions.width - 4) < 1e-9);
});

test('A blank image does not produce a floor candidate', () => {
  const width = 120, height = 100;
  const image = new Uint8ClampedArray(width * height * 4).fill(128);
  assert.deepEqual(suggestRoomOutline(image, width, height), []);
  assert.deepEqual(suggestVisibleFloorBoundary(image, width, height), []);
});

test('A patterned floor cut by the frame produces a visible edge without a closed room outline', () => {
  const width = 240, height = 150;
  const boundary = x => .22 + .38 * Math.abs(x - .52);
  const image = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = Math.floor(x / 8) + Math.floor(y / 5);
      const pattern = tile % 2 ? 18 : -18;
      const floor = [120 + pattern, 96 + pattern, 63 + pattern, 255];
      const wall = x < width * .52 ? [40, 55, 105, 255] : [173, 185, 201, 255];
      image.set(y / height >= boundary(x / width) ? floor : wall, 4 * (y * width + x));
    }
  }
  assert.deepEqual(suggestRoomOutline(image, width, height), []);
  const points = suggestVisibleFloorBoundary(image, width, height).flat();
  assert.ok(points.length > 50);
  assert.ok(points.at(-1).x - points[0].x > .85);
  const meanError = points.reduce((total, point) => total + Math.abs(point.y - boundary(point.x)), 0) / points.length;
  assert.ok(meanError < .025, `Mean edge deviation: ${meanError}`);
});

function roomFrame(kind) {
  const width = 1350, height = 1000;
  const floor = [{x: .22, y: .48}, {x: .78, y: .48}, {x: .94, y: .94}, {x: .06, y: .94}];
  const length = 4.8, depth = 3.2;
  const {origin, a, b, c, d, gx, gy} = projectiveRectangle(floor);
  const image = new Uint8ClampedArray(width * height * 4);
  const size = markerPattern.length;
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const x = (column + .5) / width, y = (row + .5) / height;
      const p = a - x * gx, q = b - x * gy, r = c - y * gx, s = d - y * gy;
      const det = p * s - r * q;
      const u = ((x - origin.x) * s - (y - origin.y) * q) / det;
      const v = ((y - origin.y) * p - (x - origin.x) * r) / det;
      let color = u >= 0 && u <= 1 && v >= 0 && v <= 1 ? [165, 119, 87] : [194, 208, 226];
      const paper = kind === 'paper' || kind === 'two-papers';
      const tagU = (u - .37) * length / (paper ? paperDimensions.length : markerMeters);
      const tagV = (v - .71) * depth / (paper ? paperDimensions.width : markerMeters);
      if (paper) {
        const secondU = (u - .61) * length / paperDimensions.length;
        const onPaper = tagU >= 0 && tagU < 1 || kind === 'two-papers' && secondU >= 0 && secondU < 1;
        if (onPaper && tagV >= 0 && tagV < 1) color = [242, 242, 242];
      } else if (tagU >= -.07 && tagU < 1.07 && tagV >= -.07 && tagV < 1.07) {
        color = [242, 242, 242];
        if (tagU >= 0 && tagU < 1 && tagV >= 0 && tagV < 1) {
          const x = Math.floor(tagU * size), y = Math.floor(tagV * size);
          const ink = kind === 'plain' || markerPattern[x][size - 1 - y] === '1';
          if (ink) color = [25, 25, 25];
        }
      }
      image.set([...color, 255], (row * width + column) * 4);
    }
  }
  return {width, height, floor, image, area: length * depth};
}

test('Confirmed white A4 supplies a metric scale automatically', () => {
  const {image, width, height, floor, area} = roomFrame('paper');
  assert.equal(calibrateFloor(image, width, height, floor), null);
  const reference = calibrateFloor(image, width, height, floor, 'horizontal');
  assert.equal(reference?.source, 'paper');
  const measurement = measurePerspectiveArea(floor, reference.points, reference.length, reference.width);
  assert.ok(Math.abs(measurement.area / area - 1) < .08, `Expected near ${area} m², got ${measurement.area} m²`);
});

test('Multiple white sheets leave the calibrating sheet ambiguous', () => {
  const {image, width, height, floor} = roomFrame('two-papers');
  assert.equal(calibrateFloor(image, width, height, floor, 'horizontal'), null);
});

test('A visible-area polygon requires a continuous edge across the picture', () => {
  const left = {x: .025, y: .3}, center = {x: .5, y: .21}, right = {x: .98, y: .35};
  assert.deepEqual(visibleFloorPolygon([[left, center], [right]]), []);
  assert.deepEqual(visibleFloorPolygon([[{x: .4, y: .3}, center, right]]), []);
  assert.deepEqual(visibleFloorPolygon([[left, center, right]]).slice(-2), [{x: .98, y: 1}, {x: .025, y: 1}]);
});

test('A rotated marker in an oblique room photograph calibrates area without user points', () => {
  const {width, height, floor, image, area} = roomFrame('coded');
  const reference = findFloorReference(image, width, height, floor);
  assert.equal(reference.length, 4);
  const calibration = calibrateFloor(image, width, height, floor);
  assert.ok(calibration);
  const result = measurePerspectiveArea(floor, calibration.points, calibration.length, calibration.width);
  assert.ok(Math.abs(result.area / area - 1) < .05, `Expected near ${area} m², got ${result.area} m²`);
  assert.deepEqual(findFloorReference(image, width, height, floor.map(point => ({x: point.x, y: point.y - .3}))), []);
});

test('An ordinary black square does not supply a metric scale', () => {
  const {width, height, floor, image} = roomFrame('plain');
  assert.deepEqual(findFloorReference(image, width, height, floor), []);
});

test('The printable marker PDF points to its own cross-reference table', () => {
  const pdf = measurementMarkerPdf();
  const offset = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
  assert.match(pdf, /^%PDF-1.4/);
  assert.equal(pdf.slice(offset, offset + 4), 'xref');
  assert.match(pdf, /18 x 18 cm/);
});
