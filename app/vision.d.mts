export function detectRegions(rgba: Uint8ClampedArray, width: number, height: number, threshold?: number, light?: boolean, minimum?: number): {x:number;y:number;w:number;h:number;pixels:number}[];
export function arithmetic(left:number, operation:string, right:number): number;
export function detectPhotoRegions(rgba:Uint8ClampedArray,width:number,height:number,minimum?:number):{x:number;y:number;w:number;h:number;pixels:number}[];
