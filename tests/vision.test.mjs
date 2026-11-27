import test from 'node:test';
import assert from 'node:assert/strict';
import {detectRegions, detectPhotoRegions, suggestPhotoOutline, arithmetic} from '../app/vision.mjs';

function image(width,height) {
  const data = new Uint8ClampedArray(width*height*4).fill(255);
  function fill(x,y,w,h,color=0) {
    for (let row=y;row<y+h;row++) for(let col=x;col<x+w;col++) {
      const offset=(row*width+col)*4;
      data[offset]=data[offset+1]=data[offset+2]=color;
    }
  }
  return {data,fill};
}
test('Photographed/drawn separate marks are detected without touching the screen',()=>{
  const {data,fill}=image(100,80);
  fill(10,10,12,15);fill(40,10,12,15);fill(70,40,12,15);
  assert.equal(detectRegions(data,100,80).length,3);
});
test('Outlined square with an interior mark is counted once',()=>{
  const {data,fill}=image(80,80);
  fill(10,10,40,40);fill(13,13,34,34,255);fill(20,20,6,6);
  assert.equal(detectRegions(data,80,80).length,1);
});
test('Blank frame and edge background are not objects',()=>{
  assert.equal(detectRegions(image(40,40).data,40,40).length,0);
  const {data,fill}=image(40,40);fill(0,0,40,40);
  assert.equal(detectRegions(data,40,40).length,0);
});
test('Calculator and zero division',()=>{
  assert.equal(arithmetic(12,'×',8),96);
  assert.equal(arithmetic(40,'÷',10),4);
  assert.equal(arithmetic(2.5,'+',1.5),4);
  assert.throws(()=>arithmetic(12,'÷',0));
});
test('Photo counting separates colored objects on a uniform background',()=>{
  const width=180,height=100;
  const data=new Uint8ClampedArray(width*height*4).fill(255);
  const colors=[[220,80,30],[50,120,220],[50,180,80]];
  colors.forEach((color,index)=>{
    for(let y=25;y<70;y++)for(let x=15+index*55;x<50+index*55;x++){
      const offset=(y*width+x)*4;
      data.set([...color,255],offset);
    }
  });
  assert.equal(detectPhotoRegions(data,width,height).length,3);
});
test('Photo counting retains separated light and dark objects', () => {
  const {data, fill} = image(150, 120);
  fill(15, 15, 35, 30, 225);
  fill(60, 15, 35, 30, 25);
  fill(105, 55, 25, 35, 60);
  assert.equal(detectPhotoRegions(data, 150, 120).length, 3);
});

test('The suggested photo outline follows a rotated object and ignores small marks', () => {
  const {data, fill} = image(100, 100);
  fill(8, 8, 6, 6, 30);
  for (let y = 20; y <= 80; y++) {
    const half = 30 - Math.abs(y - 50);
    fill(50 - half, y, 2 * half + 1, 1, 30);
  }
  const outline = suggestPhotoOutline(data, 100, 100);
  assert.equal(outline.length, 4);
  assert.ok(outline.every(point => Math.abs((Math.abs(point.x - .505) + Math.abs(point.y - .505)) * 100 - 30) <= 1.5));
  assert.deepEqual(suggestPhotoOutline(image(100, 100).data, 100, 100), []);
});

test('An L-shaped footprint retains its inward corner and area', () => {
  const {data, fill} = image(100, 100);
  fill(20, 20, 60, 25, 25);
  fill(20, 45, 35, 35, 25);
  const outline = suggestPhotoOutline(data, 100, 100);
  assert.equal(outline.length, 6);
  assert.ok(outline.some(({x, y}) => x === .55 && y === .45));
  const doubledArea = outline.reduce((sum, point, index) => {
    const next = outline[(index + 1) % outline.length];
    return sum + point.x * next.y - point.y * next.x;
  }, 0);
  assert.ok(Math.abs(doubledArea / 2 * 10000 - 2725) < 1e-8);
});
