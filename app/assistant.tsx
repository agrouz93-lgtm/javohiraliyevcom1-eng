'use client';
import {useRef,useState} from 'react';
import {Send,Trash2} from 'lucide-react';
import {api,json} from './shared';
import {Robot} from './robot';

type Message={role:'user'|'assistant';content:string};
export function Assistant(){
  const [messages,setMessages]=useState<Message[]>([]);
  const [text,setText]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const pending=useRef(false);
  async function send(event:React.FormEvent){
    event.preventDefault();
    if(!text.trim()||pending.current)return;
    const question=text.trim();
    const next:Message[]=messages.at(-1)?.role==='user'&&messages.at(-1)?.content===question?messages:[...messages,{role:'user',content:question}];
    pending.current=true;setBusy(true);setError('');setMessages(next);setText('');
    try{
      const reply=await api<{content:string}>('assistant',json('POST',{messages:next.slice(-19)}));
      setMessages([...next,{role:'assistant',content:reply.content}]);
    }catch(cause){
      const message=(cause as Error).message;
      setError(/\(50[0234]\)|ulanib/.test(message)?'AI xizmatiga ulanish yo‘q. Xabaringiz saqlandi.':message);
      setText(question);
    }finally{pending.current=false;setBusy(false);}
  }
  return <section className="panel chat-panel">
    <div className="chat-heading"><Robot compact/><div><h2>AI Usta yordamchi</h2><p>Qurilish hisobi va loyihangiz bo‘yicha savol bering.</p></div><button aria-label="Suhbatni tozalash" disabled={busy||!messages.length} onClick={()=>{setMessages([]);setError('');}}><Trash2 size={17}/></button></div>
    <div className="chat-messages" aria-live="polite">
      {!messages.length&&<p className="chat-empty">Masalan, «12 × 8 metrli polga qancha plitka kerak?» deb so‘rang.</p>}
      {messages.map((message,index)=><div className={'chat-message '+message.role} key={index}><small>{message.role==='user'?'Siz':'AI Usta'}</small><p>{message.content}</p></div>)}
      {busy&&<p role="status">AI javob tayyorlamoqda…</p>}
    </div>
    {error&&<p className="auth-error" role="alert">{error}</p>}
    <form className="chat-input" onSubmit={send}><label className="sr-only" htmlFor="usta-question">Savolingiz</label><textarea onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}} id="usta-question"  value={text} onChange={event=>setText(event.target.value)} placeholder="Qurilish bo‘yicha savolingiz…" maxLength={3000} required rows={2}/><button className="primary" disabled={busy||!text.trim()} aria-label="Xabar yuborish"><Send size={20}/></button></form>
  </section>;
}

