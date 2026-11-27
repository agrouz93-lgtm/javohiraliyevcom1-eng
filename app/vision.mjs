// Counts separated foreground regions. It does not infer objects hidden behind others.
export function detectRegions(rgba, width, height, threshold = 150, light = false, minimum = 20) {
  if (rgba.length !== width * height * 4 || width < 1 || height < 1) throw new Error('Invalid image');
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    const offset = i * 4;
    const alpha = rgba[offset + 3] / 255;
    const gray = (rgba[offset] * .299 + rgba[offset + 1] * .587 + rgba[offset + 2] * .114) * alpha + 255 * (1 - alpha);
    mask[i] = light ? Number(gray > threshold) : Number(gray < threshold);
  }
  return connectedRegions(mask, width, height, minimum);
}

function connectedRegions(mask, width, height, minimum, onRegion) {
  const queue = new Int32Array(mask.length);
  const boxes = [];
  for (let seed = 0; seed < mask.length; seed++) {
    if (!mask[seed]) continue;
    let head = 0, tail = 1, minX = width, minY = height, maxX = 0, maxY = 0;
    let border = false;
    queue[0] = seed;
    mask[seed] = 0;
    while (head < tail) {
      const current = queue[head++];
      const x = current % width, y = Math.floor(current / width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      border ||= x === 0 || y === 0 || x === width - 1 || y === height - 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (mask[next]) {mask[next] = 0; queue[tail++] = next;}
        }
      }
    }
    if (!border && tail >= minimum && maxX > minX && maxY > minY) {
      const box = {x:minX/width,y:minY/height,w:(maxX-minX+1)/width,h:(maxY-minY+1)/height,pixels:tail};
      boxes.push(box);
      onRegion?.(queue.subarray(0, tail), box);
    }
  }
  // A mark inside a closed outline belongs to the same visible silhouette.
  return boxes.filter((box,index) => !boxes.some((outer,other) => other !== index &&
    outer.x <= box.x && outer.y <= box.y && outer.x+outer.w >= box.x+box.w &&
    outer.y+outer.h >= box.y+box.h && outer.pixels > box.pixels))
    .sort((a,b) => a.y-b.y || a.x-b.x);
}

export function arithmetic(left, operation, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) throw new Error('Sonlarni tekshiring.');
  switch (operation) {
    case '+': return left + right;
    case '-': return left - right;
    case '×': return left * right;
    case '÷':
      if (right === 0) throw new Error('Nolga bo‘lish mumkin emas.');
      return left / right;
    default: throw new Error('Amalni tanlang.');
  }
}

function photoMask(rgba, width, height) {
  if (rgba.length !== width * height * 4 || width < 1 || height < 1) throw new Error('Invalid image');
  const samples=[];
  for(let x=0;x<width;x+=Math.max(1,Math.floor(width/80)))for(const y of [0,height-1])samples.push((y*width+x)*4);
  for(let y=0;y<height;y+=Math.max(1,Math.floor(height/80)))for(const x of [0,width-1])samples.push((y*width+x)*4);
  const sortedSample = channel => samples.map(offset => rgba[offset + channel]).sort((a, b) => a - b);
  const background = [0, 1, 2].map(channel => sortedSample(channel)[Math.floor(samples.length / 2)]);
  const distanceFromBackground = offset => {
    const opacity = rgba[offset + 3] / 255;
    return Math.hypot(rgba[offset] - background[0], rgba[offset + 1] - background[1], rgba[offset + 2] - background[2]) * opacity / Math.sqrt(3);
  };
  const borderDistances = samples.map(distanceFromBackground).sort((a, b) => a - b);
  const noise = borderDistances[Math.floor(borderDistances.length * .8)];
  const distances=new Float32Array(width*height);
  const histogram=new Uint32Array(256);
  for(let i=0;i<distances.length;i++){
    const distance=distanceFromBackground(i*4);
    distances[i]=distance;histogram[Math.round(distance)]++;
  }
  let sum=0;for(let i=0;i<256;i++)sum+=i*histogram[i];
  let weight=0,partial=0,best=-1,threshold=30;
  for(let i=0;i<255;i++){
    weight+=histogram[i];partial+=i*histogram[i];
    if(!weight||weight===distances.length)continue;
    const variance=weight*(distances.length-weight)*(partial/weight-(sum-partial)/(distances.length-weight))**2;
    if(variance>best){best=variance;threshold=i;}
  }
  const backgroundFloor = noise * 1.5 + 6;
  threshold = Math.max(17, backgroundFloor, Math.min(threshold, backgroundFloor + 15));
  return Uint8Array.from(distances, distance => Number(distance > threshold));
}

export function detectPhotoRegions(rgba, width, height, minimum = 40) {
  return connectedRegions(photoMask(rgba, width, height), width, height, minimum);
}

function outerBoundary(region, width, height) {
  const solid = new Uint8Array(width * height);
  for (const pixel of region) solid[pixel] = 1;
  const stride = width + 1;
  const edges = new Uint8Array(stride * (height + 1));
  for (const pixel of region) {
    const corner = pixel + Math.floor(pixel / width);
    // Each exposed pixel edge faces clockwise around the foreground.
    if (!solid[pixel - width]) edges[corner] |= 1;
    if (!solid[pixel + 1]) edges[corner + 1] |= 2;
    if (!solid[pixel + width]) edges[corner + stride + 1] |= 4;
    if (!solid[pixel - 1]) edges[corner + stride] |= 8;
  }
  const steps = [1, stride, -1, -stride];
  const point = index => ({x: index % stride, y: Math.floor(index / stride)});
  let largest = [], largestArea = 0;
  for (let start = 0; start < edges.length; start++) {
    while (edges[start]) {
      const contour = [];
      let index = start, direction = Math.log2(edges[start] & -edges[start]);
      let area = 0;
      while (edges[index] & (1 << direction)) {
        edges[index] ^= 1 << direction;
        const current = point(index);
        contour.push(current);
        index += steps[direction];
        const next = point(index);
        area += current.x * next.y - current.y * next.x;
        if (index === start) break;
        const right = (direction + 1) % 4;
        const left = (direction + 3) % 4;
        if (edges[index] & (1 << right)) direction = right;
        else if (!(edges[index] & (1 << direction))) direction = left;
      }
      if (index === start && area > largestArea) { largest = contour; largestArea = area; }
    }
  }
  return largest;
}

function simplifyPath(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const segments = [[0, points.length - 1]];
  while (segments.length) {
    const [start, end] = segments.pop();
    const a = points[start], b = points[end];
    const dx = b.x - a.x, dy = b.y - a.y;
    const squaredLength = dx ** 2 + dy ** 2;
    let split = -1, maxDistance = tolerance;
    for (let i = start + 1; i < end; i++) {
      const x = points[i].x - a.x, y = points[i].y - a.y;
      const position = squaredLength ? Math.max(0, Math.min(1, (x * dx + y * dy) / squaredLength)) : 0;
      const distance = Math.hypot(x - position * dx, y - position * dy);
      if (distance > maxDistance) { split = i; maxDistance = distance; }
    }
    if (split !== -1) { keep[split] = 1; segments.push([start, split], [split, end]); }
  }
  return points.filter((_, i) => keep[i]);
}

export function suggestPhotoOutline(rgba, width, height) {
  let region = new Int32Array(0), bestBounds = .025;
  connectedRegions(photoMask(rgba, width, height), width, height, Math.max(40, width * height * .0015), (pixels, box) => {
    const bounds = box.w * box.h;
    if (bounds > bestBounds) { region = pixels.slice(); bestBounds = bounds; }
  });
  if (!region.length) return [];
  const outline = outerBoundary(region, width, height);
  if (outline.length < 4) return [];
  const first = outline[0];
  let opposite = 0, farthest = 0;
  for (let i = 1; i < outline.length; i++) {
    const distance = (outline[i].x - first.x) ** 2 + (outline[i].y - first.y) ** 2;
    if (distance > farthest) { farthest = distance; opposite = i; }
  }
  const tolerance = Math.max(1, Math.max(width, height) * .0015);
  const forward = simplifyPath(outline.slice(0, opposite + 1), tolerance);
  const back = simplifyPath([...outline.slice(opposite), first], tolerance);
  const corners = [...forward.slice(0, -1), ...back.slice(0, -1)];
  return corners.length <= 100 ? corners.map(({x, y}) => ({x: x / width, y: y / height})) : [];
}
