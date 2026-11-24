import type {Plan} from './shared';
export type Wall={id:string;owner:string;x:number;z:number;w:number;d:number;height:number;floor:number;color?:string};
export type Piece={x:number;z:number;y:number;w:number;d:number;h:number;owner:string;color?:string};
export function floorOf(element:{floor?:number}):number;
export function floorCount(plan:Plan):number;
export function wallSegments(plan:Plan):Wall[];
export function wallPieces(plan:Plan,wall:Wall):Piece[];
export function modelMetrics(plan:Plan):{concreteVolume:number;roofArea:number;area:number;footprint:number;wallVolume:number;wallArea:number;rooms:number};
