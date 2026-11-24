'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,Square} from 'lucide-react';
type Recognition={lang:string;continuous:boolean;interimResults:boolean;start:()=>void;abort:()=>void;onresult:((event:{results:{[index:number]:{[index:number]:{transcript:string}}}})=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;onstart:(()=>void)|null};
export function PlannerVoice({apply}:{apply:(text:string)=>void}){
 const instance=useRef<Recognition|null>(null);
 const [listening,setListening]=useState(false),[transcript,setTranscript]=useState(''),[error,setError]=useState('');
 useEffect(()=>()=>{instance.current?.abort();},[]);
 function start(){
  const browser=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  const Constructor=browser.SpeechRecognition??browser.webkitSpeechRecognition;
  if(!Constructor){setError('Bu brauzer ovoz tanishni qo‘llamaydi. Matndan reja maydonidan foydalaning.');return;}
  instance.current?.abort();const recognition=new Constructor();instance.current=recognition;
  recognition.lang='uz-UZ';recognition.continuous=false;recognition.interimResults=false;
  recognition.onstart=()=>setListening(true);recognition.onend=()=>setListening(false);
  recognition.onerror=event=>{setListening(false);setError(event.error==='not-allowed'?'Mikrofon ruxsati berilmadi.':'Ovoz tanilmadi: '+event.error);};
  recognition.onresult=event=>{const text=event.results[0][0].transcript;setTranscript(text);try{apply(text);setError('');}catch(cause){setError((cause as Error).message);}};
  try{recognition.start();}catch{setError('Mikrofonni ochib bo‘lmadi.');}
 }
 return <div className="planner-voice"><button onClick={listening?()=>instance.current?.abort():start}>{listening?<Square size={17}/>:<Mic size={17}/>} {listening?'To‘xtatish':'Ovozli buyruq'}</button><small>«Qavat qo‘sh», «Xona qo‘sh», «Devor qo‘sh», «Deraza qo‘sh», «Derazani kattalashtir», «Tomni qora qil». O‘zbekcha tanish brauzer xizmatiga bog‘liq.</small>{transcript&&<p>{transcript}</p>}{error&&<p role="alert">{error}</p>}</div>;
}
