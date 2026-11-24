export function floorOf(element){return element.floor??0;}
export function floorCount(plan){return plan.floors??1;}
const rooms=['Yotoqxona','Oshxona','Zal','Hammom','Koridor'];
export function wallSegments(plan){
 const walls=[];
 for(const element of plan.elements){
  const floor=floorOf(element),height=element.height??plan.height,thickness=element.thickness??.15;
  if(element.type==='Devor')walls.push({id:element.id,owner:element.id,x:element.x,z:element.y,w:element.w,d:element.d,height,floor,color:element.color});
  if(rooms.includes(element.type)){
   const {x,y,w,d}=element;
   walls.push(
    {id:element.id+'-north',owner:element.id,x,z:y,w,d:thickness,height,floor,color:element.color},
    {id:element.id+'-south',owner:element.id,x,z:y+d-thickness,w,d:thickness,height,floor,color:element.color},
    {id:element.id+'-west',owner:element.id,x,z:y+thickness,w:thickness,d:Math.max(.01,d-2*thickness),height,floor,color:element.color},
    {id:element.id+'-east',owner:element.id,x:x+w-thickness,z:y+thickness,w:thickness,d:Math.max(.01,d-2*thickness),height,floor,color:element.color});
  }
 }
 return walls.filter((wall,index)=>walls.findIndex(other=>other.floor===wall.floor&&Math.abs(other.x-wall.x)<.001&&Math.abs(other.z-wall.z)<.001&&Math.abs(other.w-wall.w)<.001&&Math.abs(other.d-wall.d)<.001)===index);
}
export function wallPieces(plan,wall){
 const alongX=wall.w>=wall.d,length=alongX?wall.w:wall.d;
 const openings=plan.elements.filter(element=>['Eshik','Deraza','Panoramali oyna'].includes(element.type)&&floorOf(element)===wall.floor&&element.x<wall.x+wall.w+.001&&element.x+element.w>wall.x-.001&&element.y<wall.z+wall.d+.001&&element.y+element.d>wall.z-.001).map(element=>{
  const offset=(alongX?element.x:element.y)-(alongX?wall.x:wall.z);
  const start=Math.max(0,offset);
  const end=Math.min(length,offset+(alongX?element.w:element.d));
  const bottom=element.type==='Eshik'?0:element.sill??(element.type==='Panoramali oyna'?.2:1);
  const top=Math.min(wall.height,bottom+(element.height??(element.type==='Eshik'?2.1:element.type==='Panoramali oyna'?2.4:1.2)));
  return {start,end,bottom,top};
 }).filter(opening=>opening.end>opening.start&&opening.top>opening.bottom);
 const xs=[...new Set([0,length,...openings.flatMap(o=>[o.start,o.end])])].sort((a,b)=>a-b);
 const ys=[...new Set([0,wall.height,...openings.flatMap(o=>[o.bottom,o.top])])].sort((a,b)=>a-b);
 const pieces=[];
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
  const midX=(xs[i]+xs[i+1])/2,midY=(ys[j]+ys[j+1])/2;
  if(openings.some(o=>midX>o.start&&midX<o.end&&midY>o.bottom&&midY<o.top))continue;
  const w=alongX?xs[i+1]-xs[i]:wall.w,d=alongX?wall.d:xs[i+1]-xs[i];
  pieces.push({x:wall.x+(alongX?xs[i]:0),z:wall.z+(alongX?0:xs[i]),y:ys[j]+wall.floor*plan.height,w,d,h:ys[j+1]-ys[j],owner:wall.owner,color:wall.color});
 }
 return pieces;
}
export function modelMetrics(plan){
 const walls=wallSegments(plan);
 let wallVolume=0,wallArea=0;
 for(const wall of walls)for(const piece of wallPieces(plan,wall)){
  wallVolume+=piece.w*piece.d*piece.h;
  wallArea+=(wall.w>=wall.d?piece.w:piece.d)*piece.h;
 }
 let concreteVolume=plan.width*plan.depth*floorCount(plan)*.16;
 for(const element of plan.elements){
  if(element.type==='Ustun')concreteVolume+=Math.PI*(Math.min(element.w,element.d)/2)**2*(element.height??plan.height);
 }
 const w=plan.width+.4,d=plan.depth+.4,h=plan.roofHeight??1.5;
 const roofArea=!plan.roof?0:plan.roofShape==='gable'?2*d*Math.hypot(w/2,h):
   plan.roofShape==='hip'?w*Math.hypot(d/2,h)+d*Math.hypot(w/2,h):w*d;
 return {concreteVolume,roofArea,area:plan.width*plan.depth*floorCount(plan),footprint:plan.width*plan.depth,wallVolume,wallArea,rooms:plan.elements.filter(e=>rooms.includes(e.type)).length};
}
