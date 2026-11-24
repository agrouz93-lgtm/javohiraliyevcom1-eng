'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,KeyRound,Mail,Phone,ShieldCheck} from 'lucide-react';
import {api,json} from './shared';
import {Brand} from './branding';
import {Robot} from './robot';

type Method='login'|'register'|'request'|'reset'|'phone';
export type UserProfile={id:string|number;email:string|null;name:string;avatar:string;phone:string|null};
export function AuthScreen({onLogin,onGuest,resetToken='',initialMethod='login'}:{
  onLogin:(profile:UserProfile)=>void;onGuest?:()=>void;resetToken?:string;initialMethod?:Method;
}){
  const [method,setMethod]=useState<Method>(initialMethod);
  const [config,setConfig]=useState<{google:boolean;phone:boolean;google_url?:string}>({google:false,phone:false});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');
  const [phone,setPhone]=useState('');
  const [sent,setSent]=useState(false);
  useEffect(()=>{
    let active=true;
    api<typeof config>('auth/config').then(value=>{if(active){setConfig(value);}}).catch(()=>{});
    const params=new URLSearchParams(location.search);
    if(params.has('auth_error')){
      setError('Google orqali kirish bekor qilindi. Qayta urinib ko‘ring.');
      history.replaceState(null,'',location.pathname+location.hash);
    }
    return ()=>{active=false;};
  },[]);
  function change(next:Method){setMethod(next);setError('');setStatus('');}
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');setStatus('');
    const form=Object.fromEntries(new FormData(event.currentTarget));
    try {
      if(method==='phone'){
        if(!config.phone) throw new Error('Telefon orqali kirish hali sozlanmagan.');
        await api('auth/phone/'+(sent?'verify':'send'),json('POST',sent?{phone,code:form.code}:{phone}));
        if(!sent){setSent(true);setStatus('SMS kodi yuborildi.');return;}
      } else if(method==='request'||method==='reset'){
        await api('password/'+method,json('POST',method==='reset'?{token:resetToken,password:form.password}:form));
        change('login');
        setStatus(method==='request'?'Agar hisob mavjud bo‘lsa, tiklash havolasi emailga yuboriladi.':'Parol yangilandi. Hisobga kiring.');
        return;
      } else {
        await api(method,json('POST',form));
      }
      onLogin(await api<UserProfile>('me'));
    }catch(cause){setError((cause as Error).message);}
    finally{setBusy(false);}
  }
  return <div className="welcome-screen">
    <header className="welcome-header"><Brand/><span className="secure-label"><ShieldCheck size={16}/> Shaxsiy qurilish ish maydoni</span></header>
    <main className="welcome-grid">
      <section className="welcome-visual">
        <div className="eyebrow">G‘OYADAN — TAYYOR LOYIHAGACHA</div>
        <h1>Birga quramiz.<br/><span>Aniq hisoblaymiz.</span></h1>
        <Robot/>
        <div className="robot-caption"><span className="dot"/><span>Sizning qurilish yordamchingiz</span></div>
        <div className="welcome-benefits"><span>01 · O‘lchov</span><span>02 · Materiallar</span><span>03 · Uy dizayni</span></div>
      </section>
      <section className="login-panel">
        <div className="hello-icon">👋</div><h2>Assalomu alekum!</h2><h3>Usta PRO ga xush kelibsiz!</h3>
        <p>Qurilish, o‘lchov, sanoq, smeta va uy dizayni uchun zamonaviy platforma.</p>
        <div className="auth-tabs"><button aria-pressed={method!=='phone'} onClick={()=>change('login')}><Mail size={16}/> Email</button><button aria-pressed={method==='phone'} onClick={()=>change('phone')}><Phone size={16}/> Telefon</button></div>
        <form onSubmit={submit}>
          <h3 className="form-heading">{{login:'Hisobga kirish',register:'Yangi hisob ochish',request:'Parolni tiklash',reset:'Yangi parol',phone:'Telefon orqali kirish'}[method]}</h3>
          {method==='phone'?<>
            <label>Telefon raqami<input required type="tel" autoComplete="tel" pattern="[+][1-9][0-9]{7,14}" placeholder="+998901234567" value={phone} disabled={sent} onChange={event=>setPhone(event.target.value)}/></label>
            {sent&&<label>SMS kodi<input required name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,8}" maxLength={8}/></label>}
            {!config.phone&&<p className="provider-note">SMS xizmati hali sozlanmagan.</p>}
          </>:<>
            {method!=='reset'&&<label>Email<input required name="email" type="email" autoComplete="email" placeholder="ismingiz@email.uz" maxLength={254}/></label>}
            {method!=='request'&&<label>Parol<input required name="password" type="password" minLength={10} maxLength={128} placeholder="Kamida 10 belgi" autoComplete={method==='login'?'current-password':'new-password'}/></label>}
          </>}
          {error&&<p role="alert" className="auth-error">{error}</p>}{status&&<p role="status">{status}</p>}
          <button className="primary auth-submit" disabled={busy||(method==='phone'&&!config.phone)}>{busy?'Kutilmoqda…':method==='phone'?(sent?'Kodni tasdiqlash':'SMS kod olish'):{login:'Kirish',register:'Ro‘yxatdan o‘tish',request:'Tiklash havolasini yuborish',reset:'Parolni yangilash'}[method]} <ArrowRight size={17}/></button>
          {method==='login'&&<button type="button" className="text-button" onClick={()=>change('request')}><KeyRound size={14}/> Parolni unutdingizmi?</button>}
        </form>
        <div className="auth-switch"><span>{method==='register'?'Hisobingiz bormi?':'Yangi foydalanuvchimisiz?'}</span><button className="text-button" onClick={()=>change(method==='register'?'login':'register')}>{method==='register'?'Kirish':'Ro‘yxatdan o‘tish'}</button></div>
        {sent&&method==='phone'&&<button onClick={()=>{setSent(false);setStatus('');}}>Boshqa raqam kiritish</button>}
        {onGuest&&<button className="offline-button" onClick={onGuest}>Oflayn qurilish vositalarini ochish →</button>}
      </section>
    </main><footer className="welcome-footer">USTA PRO · O‘lchang. Rejalang. Quring.</footer>
  </div>;
}
