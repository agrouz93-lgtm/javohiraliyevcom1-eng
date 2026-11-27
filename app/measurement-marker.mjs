import {polygon, projectiveRectangle} from './domain.mjs';

export const markerMeters = .18;
export const paperDimensions = {length: .297, width: .21};
export const markerPattern = [
  '1111111',
  '1101101',
  '1011011',
  '1110001',
  '1001111',
  '1101001',
  '1111111',
];

const grid = markerPattern.length;
const turn = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

function fitEdge(start, end, rows, columns, top, left) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const vertical = Math.abs(dy) > Math.abs(dx);
  const {low, high} = vertical ? rows : columns;
  const offset = vertical ? top : left;
  const independentStart = vertical ? start.y : start.x;
  const independentDelta = vertical ? dy : dx;
  const dependentStart = vertical ? start.x : start.y;
  const dependentDelta = vertical ? dx : dy;
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < low.length; i++) {
    const x = i + offset;
    const fraction = (x - independentStart) / independentDelta;
    if (fraction < .1 || fraction > .9 || high[i] === -1) continue;
    const expected = dependentStart + fraction * dependentDelta;
    // The edge lies between the last pixel of this component and its neighbor.
    const nearerLow = Math.abs(low[i] - expected) < Math.abs(high[i] - expected);
    const y = nearerLow ? low[i] - .5 : high[i] + .5;
    if (Math.abs(y - expected) > 2.5) continue;
    n++; sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const determinant = n * sxx - sx * sx;
  if (n < 8 || determinant <= 0) return null;
  const slope = (n * sxy - sx * sy) / determinant;
  const intercept = (sy - slope * sx) / n;
  return {a: vertical ? 1 : -slope, b: vertical ? -slope : 1, c: intercept};
}

function componentCorners(pixels, count, width, top, bottom, leftmost, rightmost) {
  const left = new Int32Array(bottom - top + 1).fill(width);
  const right = new Int32Array(left.length).fill(-1);
  const upper = new Int32Array(rightmost - leftmost + 1).fill(bottom + 1);
  const lower = new Int32Array(upper.length).fill(-1);
  for (let i = 0; i < count; i++) {
    const x = pixels[i] % width, y = Math.floor(pixels[i] / width);
    const row = y - top, column = x - leftmost;
    left[row] = Math.min(left[row], x);
    right[row] = Math.max(right[row], x);
    upper[column] = Math.min(upper[column], y);
    lower[column] = Math.max(lower[column], y);
  }
  const points = [];
  for (let row = 0; row < left.length; row++) {
    if (right[row] === -1) continue;
    points.push({x: left[row], y: row + top});
    if (right[row] !== left[row]) points.push({x: right[row], y: row + top});
  }
  points.sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (sorted) => {
    const hull = [];
    for (const point of sorted) {
      while (hull.length > 1 && turn(hull.at(-2), hull.at(-1), point) <= 0) hull.pop();
      hull.push(point);
    }
    return hull.slice(0, -1);
  };
  const hull = [...half(points), ...half(points.reverse())];
  while (hull.length > 4) {
    let remove = 0, smallest = Infinity;
    for (let i = 0; i < hull.length; i++) {
      const area = turn(hull.at(i - 1), hull[i], hull[(i + 1) % hull.length]);
      if (area < smallest) { remove = i; smallest = area; }
    }
    hull.splice(remove, 1);
  }
  if (hull.length !== 4) return [];
  const edges = hull.map((point, index) => fitEdge(point, hull[(index + 1) % 4],
    {low: left, high: right}, {low: upper, high: lower}, top, leftmost));
  if (edges.some(edge => !edge)) return hull;
  const refined = hull.map((_, index) => {
    const p = edges.at(index - 1), q = edges[index];
    const det = p.a * q.b - p.b * q.a;
    return {x: (p.c * q.b - p.b * q.c) / det, y: (p.a * q.c - p.c * q.a) / det};
  });
  return refined.every(({x, y}, i) => Math.hypot(x - hull[i].x, y - hull[i].y) < 4) ? refined : hull;
}

function markerCode(luma, width, height, corners) {
  const map = projectiveRectangle(corners);
  if (!map) return false;
  const values = [];
  for (let row = 0; row < grid; row++) {
    const v = (row + .5) / grid;
    for (let column = 0; column < grid; column++) {
      const u = (column + .5) / grid;
      const w = 1 + map.gx * u + map.gy * v;
      const x = Math.floor((map.origin.x + map.a * u + map.b * v) / w * width);
      const y = Math.floor((map.origin.y + map.c * u + map.d * v) / w * height);
      values.push(luma[y * width + x]);
    }
  }
  if (values.some(value => value === undefined)) return false;
  // The component can start at any corner. Bright and dark cells must both match the code.
  for (let angle = 0; angle < 4; angle++) {
    let darkestWhite = 255, brightestBlack = 0;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const value = values[y * grid + x];
        if (markerPattern[y][x] === '1') brightestBlack = Math.max(brightestBlack, value);
        else darkestWhite = Math.min(darkestWhite, value);
      }
    }
    if (darkestWhite - brightestBlack >= 42) return true;
    values.splice(0, values.length, ...values.map((_, i) => values[(grid - 1 - i % grid) * grid + Math.floor(i / grid)]));
  }
  return false;
}

function* quadrilaterals(mask, width, height, onFloor) {
  const queue = new Int32Array(mask.length);
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) continue;
    let count = 1, top = height, bottom = 0, left = width, right = 0;
    mask[start] = 0;
    queue[0] = start;
    function visit(index) {
      if (mask[index]) {
        mask[index] = 0;
        queue[count++] = index;
      }
    }
    for (let i = 0; i < count; i++) {
      const pixel = queue[i];
      const x = pixel % width, y = Math.floor(pixel / width);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
      if (x > 0) visit(pixel - 1);
      if (x < width - 1) visit(pixel + 1);
      if (y > 0) visit(pixel - width);
      if (y < height - 1) visit(pixel + width);
    }
    if (count < 175 || top === 0 || left === 0 || bottom === height - 1 || right === width - 1 ||
        right - left < 22 || bottom - top < 22 || right - left > width / 2 || bottom - top > height / 2) continue;
    const corners = componentCorners(queue, count, width, top, bottom, left, right);
    if (corners.length !== 4 || corners.some((point, i) => {
      const next = corners[(i + 1) % 4];
      return Math.hypot(point.x - next.x, point.y - next.y) < 22;
    })) continue;
    const points = corners.map(({x, y}) => ({x: (x + .5) / width, y: (y + .5) / height}));
    if (points.every(onFloor)) yield {points, corners, count, size: (right - left) * (bottom - top)};
  }
}

export function findMeasurementMarker(data, width, height, onFloor) {
  if (width < 32 || height < 32 || data.length !== width * height * 4) return [];
  const luma = new Uint8Array(width * height);
  for (let i = 0; i < luma.length; i++) {
    const index = 4 * i;
    luma[i] = (77 * data[index] + 150 * data[index + 1] + 29 * data[index + 2]) >> 8;
  }
  const mask = Uint8Array.from(luma, value => Number(value < 106));
  let marker = [], bestSize = 0;
  for (const {points, size} of quadrilaterals(mask, width, height, onFloor)) {
    if (size <= bestSize || !markerCode(luma, width, height, points)) continue;
    marker = points;
    bestSize = size;
  }
  return marker;
}

export function findA4Paper(data, width, height, onFloor, placement) {
  if (width < 32 || height < 32 || data.length !== width * height * 4) return [];
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    const red = data[i * 4], green = data[i * 4 + 1], blue = data[i * 4 + 2];
    const min = Math.min(red, green, blue), max = Math.max(red, green, blue);
    mask[i] = Number(min >= 162 && max - min <= 44);
  }
  let paper = [];
  for (const {points, corners, count} of quadrilaterals(mask, width, height, onFloor)) {
    if (!projectiveRectangle(points)) continue;
    const fill = count / (polygon(corners, 1)?.area || 1);
    if (fill < .88 || fill > 1.09) continue;
    const horizontal = corners.map((point, index) => {
      const next = corners[(index + 1) % 4];
      return Math.abs(next.x - point.x) / Math.hypot(next.x - point.x, next.y - point.y);
    });
    const first = (horizontal[0] + horizontal[2]) / 2;
    const second = (horizontal[1] + horizontal[3]) / 2;
    // Preserve the specified long edge even when the viewer rotates the photograph.
    if (Math.max(first, second) < .7 || Math.abs(first - second) < .25) continue;
    if (paper.length) return [];
    paper = (first > second) === (placement === 'horizontal') ? points : [...points.slice(1), points[0]];
  }
  return paper;
}

export function measurementMarkerPdf() {
  const size = markerMeters * 1000 * 72 / 25.4;
  const cell = size / grid;
  const left = (595.276 - size) / 2;
  const bottom = (841.89 - size) / 2;
  const number = value => value.toFixed(4);
  const squares = [];
  markerPattern.forEach((row, y) => Array.from(row).forEach((value, x) => {
    if (value === '1') squares.push(`${number(left + x * cell)} ${number(bottom + (grid - 1 - y) * cell)} ${number(cell + .001)} ${number(cell + .001)} re f`);
  }));
  const stream = [
    '0 g', ...squares,
    'BT /F1 14 Tf 43 735 Td (USTA PRO - 18 x 18 cm) Tj ET',
    'BT /F1 11 Tf 43 713 Td (100% / Actual size. Qora kvadrat tomoni 18 cm.) Tj ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((value, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${value}\nendobj\n`;
    return String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  const xref = pdf.length;
  return pdf + `xref\n0 6\n0000000000 65535 f \n${offsets.join('')}trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${xref}\n%%EOF\n`;
}
