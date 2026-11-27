import {measurePerspectiveArea, polygon} from './domain.mjs';
import {findA4Paper, findMeasurementMarker, markerMeters, paperDimensions} from './measurement-marker.mjs';
import {suggestPhotoOutline} from './vision.mjs';

function contains(points, probe) {
  let inside = false;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if ((a.y > probe.y) !== (b.y > probe.y) &&
        probe.x < (b.x - a.x) * (probe.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function findFloorReference(data, width, height, outline) {
  return outline.length >= 3 ? findMeasurementMarker(data, width, height, point => contains(outline, point)) : [];
}

export function calibrateFloor(data, width, height, outline, paperPlacement) {
  if (outline.length < 3) return null;
  const marker = findFloorReference(data, width, height, outline);
  const measured = measurePerspectiveArea(outline, marker, markerMeters, markerMeters);
  if (!measured) {
    if (!paperPlacement) return null;
    const paper = findA4Paper(data, width, height, point => contains(outline, point), paperPlacement);
    if (!measurePerspectiveArea(outline, paper, paperDimensions.length, paperDimensions.width)) return null;
    return {points: paper, ...paperDimensions, source: 'paper'};
  }
  const fallback = {points: marker, length: markerMeters, width: markerMeters, source: 'marker'};
  if (outline.length !== 4) return fallback;

  // A verified rectangular room provides longer edges for estimating perspective than the small marker.
  const normalized = measurePerspectiveArea(marker, outline, 1, 1);
  if (!normalized) return fallback;
  let dxSquared = 0, dySquared = 0;
  normalized.outline.forEach((point, i, points) => {
    const next = points[(i + 1) % points.length];
    dxSquared += (point.x - next.x) ** 2;
    dySquared += (point.y - next.y) ** 2;
  });
  const length = markerMeters * Math.sqrt(2 / dxSquared);
  const breadth = markerMeters * Math.sqrt(2 / dySquared);
  const square = measurePerspectiveArea(marker, outline, length, breadth);
  if (!square || square.sides.some(side => Math.abs(side / markerMeters - 1) > .1) ||
      Math.abs(square.area / markerMeters ** 2 - 1) > .1 ||
      Math.abs(length * breadth / measured.area - 1) > .22) return fallback;
  return {points: outline, length, width: breadth, source: 'marker'};
}

export function visibleFloorPolygon(boundary) {
  // Only close a single continuous trace across the frame; the closing edges belong to the picture crop.
  if (boundary.length !== 1) return [];
  const [line] = boundary;
  if (line.length < 3 || line[0].x > .06 || line.at(-1).x < .94) return [];
  return [...line, {x: line.at(-1).x, y: 1}, {x: line[0].x, y: 1}];
}

function sampleColor(data, width, height, probe) {
  const x = Math.round(probe.x * (width - 1)), y = Math.round(probe.y * (height - 1));
  const channels = [[], [], []];
  for (let row = Math.max(0, y - 2); row <= Math.min(height - 1, y + 2); row++) {
    for (let column = Math.max(0, x - 2); column <= Math.min(width - 1, x + 2); column++) {
      const index = (row * width + column) * 4;
      for (let channel = 0; channel < 3; channel++) channels[channel].push(data[index + channel]);
    }
  }
  return channels.map(values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]);
}

// Look for a fully visible, color-consistent surface in the lower part of the frame.
export function suggestRoomOutline(data, width, height) {
  if (width < 16 || height < 16 || data.length !== width * height * 4) return [];
  const probes = [{x: .52, y: .74}, {x: .42, y: .83}, {x: .62, y: .83}, {x: .5, y: .63}];
  let floor = [], score = 0;
  for (const probe of probes) {
    const color = sampleColor(data, width, height, probe);
    const mask = new Uint8ClampedArray(data.length).fill(255);
    for (let index = 0; index < data.length; index += 4) {
      const r = data[index] - color[0], g = data[index + 1] - color[1], b = data[index + 2] - color[2];
      if (r * r + g * g + b * b < 4800) mask[index] = mask[index + 1] = mask[index + 2] = 0;
    }
    const candidate = suggestPhotoOutline(mask, width, height);
    if (candidate.length < 3 || !contains(candidate, probe) ||
        candidate.some(({x, y}) => x <= .015 || x >= .985 || y <= .015 || y >= .985)) continue;
    const area = polygon(candidate, 1)?.area ?? 0;
    const overlap = probes.filter(point => contains(candidate, point)).length;
    const candidateScore = area * overlap;
    if (area >= .06 && area < .78 && overlap >= 2 && candidateScore > score) {
      floor = candidate;
      score = candidateScore;
    }
  }
  return floor;
}

function colorSums(data, width, height) {
  const stride = (width + 1) * 3;
  const sums = new Int32Array(stride * (height + 1));
  for (let y = 1; y <= height; y++) {
    for (let x = 1; x <= width; x++) {
      const index = y * stride + x * 3;
      const pixel = ((y - 1) * width + x - 1) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const i = index + channel;
        sums[i] = data[pixel + channel] + sums[i - 3] + sums[i - stride] - sums[i - stride - 3];
      }
    }
  }
  return (left, top, right, bottom, channel) => {
    const upper = top * stride + channel, lower = bottom * stride + channel;
    return sums[lower + right * 3] - sums[lower + left * 3] - sums[upper + right * 3] + sums[upper + left * 3];
  };
}

// A cropped room cannot be closed as a polygon. Trace only supported changes between the floor and the surfaces above it.
export function suggestVisibleFloorBoundary(data, width, height) {
  if (width < 24 || height < 24 || data.length !== width * height * 4) return [];
  const spacing = Math.max(2, Math.ceil(width / 86));
  const columns = Array.from({length: Math.floor((width - 1) / spacing)}, (_, i) => (i + 1) * spacing);
  const band = Math.max(2, Math.round(height * .022));
  const firstRow = Math.max(2 * band, Math.round(height * .1));
  const rowCount = Math.min(height - band, Math.round(height * .77)) - firstRow;
  const steps = Math.min(5, Math.ceil(spacing * .85));
  const stepCount = 2 * steps + 1;
  const stateCount = rowCount * stepCount;
  const summed = colorSums(data, width, height);
  const contrast = columns.map(x => {
    const left = Math.max(0, x - spacing), right = Math.min(width, x + spacing + 1);
    const floorRow = Math.floor(height * .76);
    const average = (top, bottom, channel) => summed(left, top, right, bottom, channel) / ((right - left) * (bottom - top));
    const floorColor = [0, 1, 2].map(channel => average(floorRow, height, channel));
    return Float32Array.from({length: rowCount}, (_, offset) => {
      const y = firstRow + offset;
      let delta = 0;
      for (let channel = 0; channel < 3; channel++) {
        const above = summed(left, y - band, right, y, channel);
        const below = summed(left, y, right, y + band, channel);
        delta += (above - below) ** 2;
      }
      const edge = Math.sqrt(delta / 3) / ((right - left) * band);
      // Compare chroma so a shadow on the floor is not penalized simply for being darker.
      const tint = (top, bottom) => {
        const red = average(top, bottom, 0), green = average(top, bottom, 1), blue = average(top, bottom, 2);
        return Math.hypot(red - blue - (floorColor[0] - floorColor[2]), green - blue - (floorColor[1] - floorColor[2]));
      };
      const before = tint(Math.max(0, y - 4 * band), y - band);
      const after = tint(y + band, Math.min(height, y + 4 * band));
      const towardFloor = Math.max(-24, Math.min(12, (before - after) * .4));
      return Math.max(0, edge - after * .35 + towardFloor);
    });
  });

  const backtrack = new Int8Array(columns.length * stateCount);
  let previous = new Float32Array(stateCount).fill(-Infinity);
  let next = new Float32Array(stateCount);
  for (let column = 0; column < columns.length; column++) {
    for (let row = 0; row < rowCount; row++) {
      const evidence = Math.min(contrast[column][row], 48) - (row / rowCount) * 10;
      for (let step = 0; step < stepCount; step++) {
        const index = row * stepCount + step;
        const priorRow = row - (step - steps);
        let score = column === 0 ? 0 : -Infinity, priorStep = steps;
        if (column > 0 && priorRow >= 0 && priorRow < rowCount) {
          for (let direction = 0; direction < stepCount; direction++) {
            const candidate = previous[priorRow * stepCount + direction] - Math.abs(step - direction) * 3.2;
            if (candidate > score) { score = candidate; priorStep = direction; }
          }
        }
        next[index] = score + evidence - .25 * Math.abs(step - steps);
        backtrack[column * stateCount + index] = priorStep;
      }
    }
    [previous, next] = [next, previous];
  }
  let index = 0;
  for (let i = 1; i < previous.length; i++) if (previous[i] > previous[index]) index = i;
  const trace = new Array(columns.length);
  for (let column = columns.length - 1; column >= 0; column--) {
    const row = Math.floor(index / stepCount), step = index % stepCount;
    trace[column] = {x: columns[column] / width, y: (firstRow + row) / height, evidence: contrast[column][row]};
    index = (row - step + steps) * stepCount + backtrack[column * stateCount + index];
  }

  const segments = [];
  let start = 0, last = -1;
  trace.forEach((point, i) => {
    if (point.evidence < 9) return;
    if (i - last > 5) {
      if (last - start >= columns.length * .13) segments.push(trace.slice(start, last + 1));
      start = i;
    } else if (last < 0) start = i;
    last = i;
  });
  if (last - start >= columns.length * .13) segments.push(trace.slice(start, last + 1));
  if (segments.reduce((count, segment) => count + segment.length, 0) < columns.length * .4) return [];
  return segments.map(segment => segment.map(({x, y}) => ({x, y})));
}

export function measuredDimensions(outline, useReferenceAxes = false) {
  let longest = 0, axisX = 1, axisY = 0;
  if (!useReferenceAxes) outline.forEach((point, index) => {
    const next = outline[(index + 1) % outline.length];
    const dx = next.x - point.x, dy = next.y - point.y;
    const side = Math.hypot(dx, dy);
    if (side > longest) { longest = side; axisX = dx / side; axisY = dy / side; }
  });
  const along = outline.map(point => point.x * axisX + point.y * axisY);
  const across = outline.map(point => point.y * axisX - point.x * axisY);
  const a = Math.max(...along) - Math.min(...along);
  const b = Math.max(...across) - Math.min(...across);
  return {length: Math.max(a, b), width: Math.min(a, b)};
}
