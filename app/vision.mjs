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
      boxes.push({x:minX/width,y:minY/height,w:(maxX-minX+1)/width,h:(maxY-minY+1)/height,pixels:tail});
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

// Separates visible foreground from a near-uniform photo background using RGB distance.
export function detectPhotoRegions(rgba,width,height,minimum=40){
  const samples=[];
  for(let x=0;x<width;x+=Math.max(1,Math.floor(width/80)))for(const y of [0,height-1])samples.push((y*width+x)*4);
  for(let y=0;y<height;y+=Math.max(1,Math.floor(height/80)))for(const x of [0,width-1])samples.push((y*width+x)*4);
  const median=channel=>samples.map(offset=>rgba[offset+channel]).sort((a,b)=>a-b)[Math.floor(samples.length/2)];
  const background=[median(0),median(1),median(2)];
  const distances=new Float32Array(width*height);
  const histogram=new Uint32Array(256);
  for(let i=0;i<distances.length;i++){
    const j=i*4;
    const distance=Math.min(255,Math.hypot(rgba[j]-background[0],rgba[j+1]-background[1],rgba[j+2]-background[2])/Math.sqrt(3));
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
  threshold=Math.max(22,threshold);
  const mask=new Uint8ClampedArray(rgba.length).fill(255);
  for(let i=0;i<distances.length;i++)if(distances[i]>threshold)mask[i*4]=mask[i*4+1]=mask[i*4+2]=0;
  return detectRegions(mask,width,height,150,false,minimum);
}
