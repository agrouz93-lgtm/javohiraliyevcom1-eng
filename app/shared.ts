export type Point = {x: number; y: number};
export type Item = Point & {id: string; type: string; pieces: number; w: number; h: number; confidence?: number};
export type Element = Point & {id: string; type: string; w: number; d: number;floor?:number;height?:number;sill?:number;thickness?:number;color?:string;furniture?:{id:string;version:number;name:string;category:string;modelUrl:string;dimensions:{width:number;height:number;depth:number};material:string;price:number|null;rotation:number;roomId?:string}};
export type Plan = {width: number; depth: number; lotWidth: number; lotDepth: number; height: number; style: string; roof: boolean;floors?:number;wallFinish?:'plaster'|'brick'|'wood'|'concrete';roofShape?:'flat'|'gable'|'hip';roofHeight?:number;roofMaterial?:'tile'|'metal'|'concrete'; ceiling?:boolean; materials?:{wall:string;floor:string;roof:string;ceiling:string}; elements: Element[]};
export type Kind = 'measurement' | 'materials' | 'plan' | 'estimate';
export type Entry = {id: string; title: string; kind: Kind; rows: string[][]; payload: Record<string, unknown>};
export type RecordRow = {data: Entry; updated: string};
export type Save = (kind: Kind, title: string, rows: string[][], payload: Record<string, unknown>, id?: string) => Promise<void>;

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let response;
  try { response = await fetch('/api/' + url, init); }
  catch { throw new Error('Serverga ulanib bo‘lmadi.'); }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(typeof data?.detail === 'string' ? data.detail : 'So‘rov bajarilmadi (' + response.status + ').');
  }
  return response.json();
}

export const json = (method: string, data: unknown) => ({
  method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
});
export const fmt = (value: number) => new Intl.NumberFormat('uz-UZ', {maximumFractionDigits: 2}).format(value);
export const id = () => globalThis.crypto.randomUUID();

export function download(name: string, value: Blob) {
  const android = (window as Window & {UstaAndroid?:{save:(filename:string, base64:string)=>void}}).UstaAndroid;
  if (android) {
    const reader = new FileReader();
    reader.onload = () => android.save(name, String(reader.result).split(',',2)[1]);
    reader.readAsDataURL(value);
    return;
  }
  const url = URL.createObjectURL(value);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

