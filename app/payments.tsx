'use client';

import {useCallback,useEffect,useState} from 'react';
import {ArrowRight,Banknote,ClipboardList,History,LayoutList,Plus,RefreshCw,Send,Settings,User,CheckCircle2,X,Loader2} from 'lucide-react';
import {api,fmt,json,type UserProfile} from './shared';

type Status = 'pending'|'paid'|'rejected';
type Tab = 'balance'|'admin';

interface Transaction {
  type: string; label: string; amount: number; reference: string; created: string;
}
interface PayoutRequest {
  id: number; userId: number; user: string; userName: string; amount: number;
  method: string; details: string; status: Status; created: string; processedAt: string|null;
}
interface Wage {
  id: number; userId: number; user: string; userName: string; amount: number;
  reference: string; created: string;
}

const METHODS = [
  {value:'karta',label:'Bank karta'},
  {value:'click',label:'Click'},
  {value:'payme',label:'Payme'},
  {value:'naqd',label:'Naqd pul'},
] as const;

export function Payments({profile}:{profile:UserProfile}) {
  const [tab,setTab] = useState<Tab>('balance');
  const [checked,setChecked] = useState(false);
  const [isAdmin,setIsAdmin] = useState<boolean|undefined>(undefined);
  const [balance,setBalance] = useState(0);
  const [transactions,setTransactions] = useState<Transaction[]>([]);
  const [requests,setRequests] = useState<PayoutRequest[]>([]);
  const [wages,setWages] = useState<Wage[]>([]);
  const [notice,setNotice] = useState('');
  const [loading,setLoading] = useState(false);

  const [payoutAmount,setPayoutAmount] = useState('');
  const [payoutMethod,setPayoutMethod] = useState<'karta'|'click'|'payme'|'naqd'>('karta');
  const [payoutDetails,setPayoutDetails] = useState('');
  const [wageUserId,setWageUserId] = useState('');
  const [wageAmount,setWageAmount] = useState('');
  const [wageReference,setWageReference] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, txs] = await Promise.all([
        api<{amount:number;currency:string}>('payments/balance'),
        api<Transaction[]>('payments/transactions'),
      ]);
      setBalance(bal.amount);
      setTransactions(txs);
      try {
        await api<{admin:boolean}>('payments/access');
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      }
      if (isAdmin === true) {
        const [reqs, wag] = await Promise.all([
          api<PayoutRequest[]>('payments/payout-requests'),
          api<Wage[]>('payments/wages'),
        ]);
        setRequests(reqs);
        setWages(wag);
      }
    } catch (error) {
      setNotice((error as Error).message || 'Ma’lumotlarni yuklab bo‘lmadi.');
    } finally {
      setLoading(false);setChecked(true);
    }
  },[isAdmin]);

  useEffect(()=>{load();},[load]);

  async function requestPayout() {
    const amount = Number(payoutAmount);
    if (!amount || amount < 1) {setNotice('Miqdorni kiriting.');return;}
    if (!payoutDetails.trim()) {setNotice('Karta raqami yoki telefonni kiriting.');return;}
    setLoading(true);
    try {
      await api('payments/payout-request', json('POST', {
        amount, method: payoutMethod, details: payoutDetails.trim(),
      }));
      setPayoutAmount('');setPayoutDetails('');
      setNotice('Pul yechish arizangiz qabul qilindi.');
      await load();
    } catch (error) {
      setNotice((error as Error).message || 'Ariza yuborilmadi.');
    } finally {setLoading(false);}
  }

  async function accrueWage() {
    const userId = Number(wageUserId);
    const amount = Number(wageAmount);
    if (!userId || !amount || amount < 1) {setNotice('Foydalanuvchi ID va miqdori to‘g‘ri kiriting.');return;}
    if (!wageReference.trim()) {setNotice('Izoh (sabab) kiriting.');return;}
    setLoading(true);
    try {
      await api('payments/wages', json('POST', {
        user_id: userId, amount, reference: wageReference.trim(),
      }));
      setWageUserId('');setWageAmount('');setWageReference('');
      setNotice('Ish haqi hisobga o‘tkazildi.');
      await load();
    } catch (error) {
      setNotice((error as Error).message || 'Ish haqi qo‘shilmadi.');
    } finally {setLoading(false);}
  }

  async function handlePayout(id: number, status: Status) {
    if (!confirm(status === 'paid' ? 'Arizaga pul yechildi deb tasdiqlaysizmi?' : 'Arizani rad etaysizmi?')) return;
    setLoading(true);
    try {
      await api(`payments/payout-requests/${id}/${status}`, {method:'POST'});
      setNotice(status === 'paid' ? 'Pul yechish tasdiqlandi.' : 'Ariza rad etildi.');
      await load();
    } catch (error) {
      setNotice((error as Error).message || 'Amal bajarilmadi.');
    } finally {setLoading(false);}
  }

  const statusLabel = {pending:'Kutilmoqda',paid:'Yechildi',rejected:'Rad etildi'};
  const statusTone = {pending:'amber',paid:'green',rejected:'rose'};

  if(!checked)return <div className="session-loading" role="status"><p>Balans tekshirilmoqda…</p></div>;

  return (
    <section className="panel payments-panel">
      <h2><Banknote size={20}/> Balans va pul yechish</h2>
      <div className="payments-tabs">
        <button onClick={()=>setTab('balance')} className={tab==='balance'?'tab active':'tab'}>Balans va tarix</button>
        <button onClick={()=>setTab('admin')} className={tab==='admin'?'tab active':'tab'} disabled={isAdmin===false}>Boshqaruv (admin)</button>
      </div>

      {tab==='balance' && (
        <>
          <div className="payments-grid">
            <div className="card balance-card">
              <div className="card-title">Joriy balans</div>
              <div className="balance-amount">{fmt(balance)} so'm</div>
              <p className="muted">Minimal yechish: {fmt(10000)} so'm</p>
              <div className="form-row">
                <label>Miqdor (so'm)</label>
                <input type="number" min="1" value={payoutAmount} onChange={e=>setPayoutAmount(e.target.value)}/>
              </div>
              <div className="form-row">
                <label>Usul</label>
                <select value={payoutMethod} onChange={e=>setPayoutMethod(e.target.value as any)}>
                  {METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Karta raqami yoki telefon</label>
                <input value={payoutDetails} onChange={e=>setPayoutDetails(e.target.value)} placeholder="8600 …"/>
              </div>
              <button className="primary" onClick={requestPayout} disabled={loading}>{loading?'Yuborilmoqda…':<><Send size={16}/> Pul yechish arizasi yuborish</>}</button>
            </div>

            <div className="card history-card">
              <div className="card-header"><div className="card-title">Tranzaksiya tarixi</div><RefreshCw size={16} onClick={load} className="icon-button" title="Yangilash"/></div>
              {transactions.length===0 && <p className="muted">Hech qanday tranzaksiya yo‘q.</p>}
              <table>
                <thead><tr><th>Sana</th><th>Turi</th><th>Miqdor</th><th>Izoh</th></tr></thead>
                <tbody>
                  {transactions.map(({type,label,amount,reference,created}) => (
                    <tr key={created+type+amount}>
                      <td>{new Date(created).toLocaleString('uz-UZ')}</td>
                      <td><span className={`badge ${type==='wage'?'badge-green':'badge-gray'}`}>{label}</span></td>
                      <td className={type==='payout'?'text-negative':'text-positive'}>
                        {(type==='payout'?'-':'+')}{fmt(amount)} so'm
                      </td>
                      <td>{reference||'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab==='admin' && (
        <>
          {isAdmin===false && <div className="notice">Bu bo‘lim faqat administrator uchun. Hisobga kirlang va qayta urinib ko‘ring.</div>}
          {isAdmin!==false && (
            <>
              <div className="payments-grid">
                <div className="card">
                  <div className="card-title">Ish haqi qo‘shish (ustaga)</div>
                  <p className="muted">Foydalanuvchi ID’sini /api/me sahifasidan yoki ro‘yxatdan oling.</p>
                  <div className="form-row"><label>Foydalanuvchi ID</label><input type="number" min="1" value={wageUserId} onChange={e=>setWageUserId(e.target.value)}/></div>
                  <div className="form-row"><label>Miqdor (so'm)</label><input type="number" min="1" value={wageAmount} onChange={e=>setWageAmount(e.target.value)}/></div>
                  <div className="form-row"><label>Izoh (masalan, «Mart - ish haqi»)</label><input value={wageReference} onChange={e=>setWageReference(e.target.value)}/></div>
                  <button className="primary" onClick={accrueWage} disabled={loading}>{loading?'Qabul qilinmoqda…':<><Plus size={16}/> Ish haqini hisoblash</>}</button>
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title">Pul yechish arizalari</div></div>
                  {requests.length===0 && <p className="muted">Kutilayotgan arizalar yo‘q.</p>}
                  <table>
                    <thead><tr><th>Foydalanuvchi</th><th>Miqdor</th><th>Usul</th><th>Holat</th><th>Amal</th></tr></thead>
                    <tbody>
                      {requests.map(req => (
                        <tr key={req.id}>
                          <td>{req.user}</td>
                          <td>{fmt(req.amount)} so'm</td>
                          <td>{req.method}</td>
                          <td><span className={`badge ${statusTone[req.status]}`}>{statusLabel[req.status]}</span></td>
                          <td className="actions">
                            {req.status==='pending' && (
                              <>
                                <button onClick={()=>handlePayout(req.id,'paid')} className="icon-button" title="Tasdiqlash"><CheckCircle2 size={16}/></button>
                                <button onClick={()=>handlePayout(req.id,'rejected')} className="icon-button" title="Rad etish"><X size={16}/></button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card">
                <div className="card-title">Ish haqi tarixi</div>
                {wages.length===0 && <p className="muted">Ish haqlari yozilmagan.</p>}
                <table>
                  <thead><tr><th>Sana</th><th>Foydalanuvchi</th><th>Miqdor</th><th>Izoh</th></tr></thead>
                  <tbody>
                    {wages.map(w => (
                      <tr key={w.id}>
                        <td>{new Date(w.created).toLocaleString('uz-UZ')}</td>
                        <td>{w.user}</td>
                        <td>{fmt(w.amount)} so'm</td>
                        <td>{w.reference||'-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {notice && <div role="status" className="notice">{notice}<button aria-label="Yopish" onClick={()=>setNotice('')}<X size={16}/></button></div>}
    </section>
  );
}