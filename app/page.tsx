'use client';

import {useCallback,useEffect,useState} from 'react';
import {FurnitureStore} from './furniture-store';
import {HomeDashboard} from './home-dashboard';
import {AuthScreen,type UserProfile} from './auth-screen';
import {Brand,Splash} from './branding';
import {Assistant} from './assistant';
import {ArrowDownToLine, ArrowRight, Bell, Banknote, Bot, Box, Calculator, ChevronDown, ClipboardList, FolderOpen, House, Layers3, LogOut, Menu, ScanLine, Settings, ShieldCheck, Sparkles, X} from 'lucide-react';
import {api, fmt, id, json, type Entry, type RecordRow, type Save} from './shared';
import {CameraTool} from './camera';
import {Estimate} from './estimate';
import {Planner} from './planner';
import {Payments} from './payments';

const pages = [
  {name:'Bosh sahifa', icon:House, tone:'violet'},
  {name:'Kamera 1 — O‘lchash', icon:ScanLine, tone:'blue', desc:'Rasm yoki kamera orqali maydon va perimetrni o‘lchang.'},
  {name:'Kamera 2 — Sanash', icon:Layers3, tone:'green', desc:'Qurilish materiallarini aniqlang va dona hisobini yuriting.'},
  {name:'Uy dizayni', icon:Box, tone:'violet', desc:'Uyingiz rejasini 2D chizing va 3D ko‘rinishda tekshiring.'},
  {name:'Kalkulyator', icon:Calculator, tone:'amber', desc:'Material sarfi, ish haqi va yakuniy smetani hisoblang.'},
  {name:'Loyihalarim', icon:FolderOpen, tone:'violet'},
  {name:'Hisobotlar', icon:ClipboardList, tone:'blue'},
  {name:'Sozlamalar', icon:Settings, tone:'green'},
  {name:'AI Usta yordamchi',icon:Bot,tone:'violet',desc:'Qurilish bo‘yicha savol va hisoblar uchun yordamchi.'},
  {name:'Mebel do‘koni',icon:Box,tone:'amber'},
  {name:'Balans va pul yechish',icon:Banknote,tone:'green',desc:'Balansni kuzating, ish haqini ko‘ring va pul yechish arizasi yuboring.'},
];
const mobilePages = [[0, 'Bosh'], [1, 'O‘lchov'], [2, 'Sanoq'], [3, 'Dizayn'], [4, 'Smeta']] as const;

export default function Home() {
  const [page, setPage] = useState(0);
  const [intro, setIntro] = useState(true);
  const [menu, setMenu] = useState(false);
  const [user, setUser] = useState('');
  const [profile,setProfile]=useState<UserProfile>();
  const [checked,setChecked]=useState(false);
  const [guest,setGuest]=useState(true);
  const [notifications,setNotifications]=useState(false);
  const [profileMenu,setProfileMenu]=useState(false);
  const [recordsLoading,setRecordsLoading]=useState(false);
  const finishIntro=useCallback(()=>setIntro(false),[]);
  const [auth, setAuth] = useState<'login'|'reset'|null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [notice, setNotice] = useState('');

  const [resetToken,setResetToken] = useState('');
  const [opened, setOpened] = useState<Entry>();
  const [selected, setSelected] = useState('');
  const active = records.find(row => row.data.id === selected);
  const reportRows = active ? [active] : records;

  function signedIn(account:UserProfile){
    setProfile(account);setUser(account.email||account.phone||String(account.id));
    setGuest(false);setAuth(null);setPage(0);
  }
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),7000);
    const reset=new URLSearchParams(location.hash.slice(1)).get('reset');
    if(reset){setResetToken(reset);setAuth('reset');history.replaceState(null,'',location.pathname+location.search);}
    api<UserProfile>('me',{signal:controller.signal}).then(account=>{if(!reset)signedIn(account);}).catch(()=>{}).finally(()=>setChecked(true));
    return ()=>{clearTimeout(timer);controller.abort();};
  },[]);

  useEffect(() => {
    if (!user) return;
    let current = true;
    setRecordsLoading(true);
    api<RecordRow[]>('projects').then(rows => {if (current) setRecords(rows);}).catch((error: Error) => {if (current) setNotice(error.message);}).finally(()=>{if(current)setRecordsLoading(false);});
    return () => {current = false;};
  }, [user]);

  function go(index: number, entry?: Entry) {
    if(guest&&[5,6,10].includes(index)){setAuth('login');return;}
    setOpened(entry);
    setPage(index);
    setMenu(false);
    setNotice('');
  }

  const save: Save = async (kind, title, rows, payload, entryId) => {
    if (!user) {
      setAuth('login');
      throw new Error('Loyihani saqlash uchun hisobga kiring va qayta saqlang.');
    }
    await api('projects', json('PUT', {id: entryId ?? id(), title, kind, rows, payload}));
    setRecords(await api<RecordRow[]>('projects'));
    setNotice('Loyiha saqlandi.');
  };

  async function logout() {
    try {
      await api('logout', {method:'POST'});
      setUser('');
      setProfile(undefined);setGuest(true);
      setRecords([]);
      setSelected('');
      go(0);
    } catch (error) {setNotice((error as Error).message);}
  }

  async function remove(entryId: string) {
    if (!confirm('Loyihani o‘chirasizmi?')) return;
    try {
      await api('projects/' + entryId, {method:'DELETE'});
      setRecords(previous => previous.filter(row => row.data.id !== entryId));
      setNotice('Loyiha o‘chirildi.');
    } catch (error) {setNotice((error as Error).message);}
  }

  const openIndex = {measurement:1, materials:2, plan:3, estimate:4};
  if(intro)return <Splash ready={checked} complete={finishIntro}/>;
  if(!checked)return <div className="session-loading" role="status"><Brand/><p>Sessiya tekshirilmoqda…</p></div>;
  if(!user&&(!guest||auth))return <AuthScreen onLogin={signedIn} resetToken={resetToken}
    initialMethod={auth==='reset'?'reset':'login'} onGuest={()=>{setGuest(true);setAuth(null);setPage(0);}}/>;
  const displayName=profile?.name||profile?.email?.split('@')[0]||profile?.phone||'Usta';
  return <div className={page===0?'shell home-active':'shell'}>
    {menu && <button className="menu-backdrop" aria-label="Menyuni yopish" onClick={() => setMenu(false)}/>}
    <aside id="workspace-menu" className={menu ? 'sidebar visible' : 'sidebar'} onKeyDown={event => {if (event.key === 'Escape') {setMenu(false);document.getElementById('menu-toggle')?.focus();}}}>
      <Brand/>
      <div className="nav-label">ISH MAYDONI</div>
      <nav>{[0,1,2,3,4,9,5,6,8,7,10].map(index => {const {name,icon:Icon}=pages[index];return <button hidden={guest&&[5,6,10].includes(index)} key={name} onClick={() => go(index)} className={page === index ? 'nav active' : 'nav'}><Icon size={18}/>{name}</button>;})}</nav>
      <div className="sidebar-foot"><div className="dot"/><span>USTA PRO</span></div>
    </aside>
    <div className="main">
      <header className="topbar"><button id="menu-toggle" className="icon-button mobile" aria-label={menu ? 'Menyuni yopish' : 'Menyuni ochish'} aria-expanded={menu} aria-controls="workspace-menu" onClick={() => setMenu(!menu)}>{menu ? <X size={22}/> : <Menu size={22}/>}</button><div className="header-brand"><Brand/></div><div className="crumb"><span className="crumb-prefix">Ish maydoni /</span> <b>{pages[page].name}</b></div><button className="notification-button" aria-label="Bildirishnomalar" aria-expanded={notifications} onClick={()=>setNotifications(!notifications)}><Bell size={19}/></button><button className="profile" aria-label="Profil menyusi" aria-expanded={profileMenu} onClick={() => user ? setProfileMenu(!profileMenu) : setAuth('login')}><span className="avatar">{profile?.avatar?<img src={profile.avatar} alt="" referrerPolicy="no-referrer"/>:displayName[0].toUpperCase()}</span><span>{guest?'Kirish':displayName}</span><ChevronDown size={15}/></button></header>
      {profileMenu&&<div className="profile-popover"><strong>{displayName}</strong><small>{profile?.email||profile?.phone}</small><button onClick={()=>{setProfileMenu(false);go(7);}}>Profil va sozlamalar</button><button onClick={()=>{setProfileMenu(false);void logout();}}><LogOut size={16}/> Chiqish</button></div>}
      {notifications&&<div className="notification-popover"><h2>So‘nggi saqlangan ishlar</h2>{!records.length&&<p>Hozircha bildirishnomalar yo‘q.</p>}{records.slice(0,4).map(({data,updated})=><button key={data.id} onClick={()=>{setNotifications(false);go(openIndex[data.kind],data);}}><strong>{data.title}</strong><small>{new Date(updated).toLocaleString('uz-UZ')}</small></button>)}</div>}
      <main className="content">
      {notice && <div role="status" className="notice">{notice}<button aria-label="Yopish" onClick={() => setNotice('')}><X size={16}/></button></div>}
      {page === 0 ? <HomeDashboard name={displayName} records={records} loading={recordsLoading} navigate={go} allTools={()=>setMenu(true)}/> : <>
        <div className="section-title page-title"><div><h1>{pages[page].name}</h1></div></div>
        {page === 1 && <CameraTool key={opened?.id ?? 'measure'} mode="measurement" initial={opened} save={save}/>}
        {page === 2 && <CameraTool key={opened?.id ?? 'count'} mode="materials" initial={opened} save={save}/>}
        {page === 3 && <Planner key={(opened?.id??'plan')+user} initial={opened} save={save} owner={profile?String(profile.id):'offline'}/>}
        {page === 4 && <Estimate key={opened?.id ?? 'estimate'} initial={opened} save={save}/>}
        {page === 5 && <section className="panel">
          {!user && <button className="primary" onClick={() => setAuth('login')}>Hisobga kirish</button>}
          {recordsLoading&&<p role="status">Loyihalar yuklanmoqda…</p>}
          {user && !recordsLoading && !records.length && <p>Saqlangan loyihalar yo‘q.</p>}
          {records.map(({data,updated}) => <div className="record" key={data.id}><div><strong>{data.title}</strong><small>{new Date(updated).toLocaleString('uz-UZ')}</small></div><button onClick={() => go(openIndex[data.kind], data)}>Ochish</button><button onClick={() => {setSelected(data.id); go(6);}}>Hisobot</button><button onClick={() => remove(data.id)}>O‘chirish</button></div>)}
        </section>}
        {page === 6 && <section className="panel report">
          <div className="toolbar no-print"><select aria-label="Hisobot tanlash" value={selected} onChange={event => setSelected(event.target.value)}><option value="">Barcha hisobotlar</option>{records.map(({data}) => <option key={data.id} value={data.id}>{data.title}</option>)}</select><button disabled={!reportRows.length} onClick={() => {location.href = "/api/report.pdf" + (active ? "?project=" + active.data.id : "");}}><ArrowDownToLine size={17}/> PDF yuklash</button><button disabled={!reportRows.length} onClick={() => window.print()}>Chop etish</button></div>
          {!reportRows.length && <p>Hisobot uchun avval loyiha yoki hisobni saqlang.</p>}
          {reportRows.map(({data, updated}) => <article key={data.id}><h2>{data.title}</h2><p>{new Date(updated).toLocaleString('uz-UZ')}</p><table><tbody>{data.rows.map(([label,value], index) => <tr key={index}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table></article>)}
          {reportRows.length > 0 && <p>{fmt(reportRows.length)} ta saqlangan natija</p>}
        </section>}
        {page===9&&<FurnitureStore records={records} owner={profile?String(profile.id):'offline'} onCreate={()=>go(3)} onPlace={entry=>{
          const owner=profile?String(profile.id):'offline';
          const draft=entry.id==='draft';
          const key='usta-planner-draft:'+owner+(draft?'':':'+entry.id);
          try{localStorage.setItem(key,JSON.stringify(entry.payload.plan));}catch{}
          go(3,draft?{...entry,id:'draft'}:entry);
        }}/>}
        {page===8&&<Assistant/>}
        {page === 10 && <Payments profile={profile as UserProfile}/>}
        {page === 7 && <section className="panel"><h2><ShieldCheck size={20}/> Hisob va sessiya</h2><p>{displayName}</p><p>{profile?.email||profile?.phone||'Oflayn rejim'}</p>{user ? <button onClick={logout}><LogOut size={16}/> Chiqish</button> : <button onClick={() => setAuth('login')}>Kirish</button>}</section>}
      </>}
      </main>
    </div>
    <nav className="bottom-nav" aria-label="Mobil navigatsiya">{mobilePages.map(([index, label]) => {
      const Icon = pages[index].icon;
      return <button key={index} aria-current={page === index ? 'page' : undefined} onClick={() => go(index)}><Icon size={19}/>{label}</button>;
    })}</nav>
    <button hidden={page===8} className="assistant-fab" aria-label="AI Usta yordamchini ochish" onClick={()=>go(8)}><Bot size={24}/><span>AI Usta</span></button>
  </div>;
}
