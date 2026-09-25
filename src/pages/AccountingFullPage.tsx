// ============================================
// Accounts & Expenses - All in One Page
// Add Cheque + Add Expense + View + Search
// Receipt Image Size: 3x5 inches (300x500px)
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card, StatCard } from '../components/UI/Card';
import { Button, IconButton } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Table, StatusBadge } from '../components/UI/Table';
import { Modal, ConfirmDialog, Toast } from '../components/UI/Modal';
import { PieChart, BarChart } from '../components/UI/Charts';
import { ImageUpload } from '../components/UI/ImageUpload';
import { ImageModal } from '../components/UI/ImageModal';
import { canWrite } from '../utils/platform';
import { formatDate, formatCurrency, formatNumber, safeNumber, exportToCSV, exportToPDF } from '../utils/helpers';
import {
  Cheque, Expense, EXPENSE_CATEGORIES,
  createCheque, deleteCheque,
  createExpense, getExpensesByCheque, deleteExpense, updateExpense,
  getAccountingStats, getExpensesByDateRange, getChequeWithImage, getExpenseWithImage,
  canAddExpense, getOverdueAmount, getSpentAmount, overdueNote, statusForBalance,
} from '../database/accountingService';

interface Props { userId: string; }
type Tab = 'dashboard' | 'add-cheque' | 'add-expense' | 'cheques' | 'reports';

export const AccountingFullPage: React.FC<Props> = ({ userId: _u }) => {
  void _u;
  const [tab, setTab] = useState<Tab>('dashboard');
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [selectedCheque, setSelectedCheque] = useState<Cheque|null>(null);
  const [chequeExps, setChequeExps] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'|'warning'|'info'}|null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDelCheque, setShowDelCheque] = useState(false);
  const [showDelExp, setShowDelExp] = useState(false);
  const [showEditExp, setShowEditExp] = useState(false);
  const [editExp, setEditExp] = useState<Expense|null>(null);
  const [delExpId, setDelExpId] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [reportData, setReportData] = useState<Expense[]>([]);

  // Image Preview State
  const [previewImg, setPreviewImg] = useState<{ src: string; title: string } | null>(null);

  const [stats, setStats] = useState({ totalReceived:0, totalExpenses:0, totalRemaining:0, totalOverdue:0, overdueCount:0, overdueCheques:0, totalCheques:0, activeCheques:0, exhaustedCheques:0, categoryBreakdown:{} as Record<string,number>, monthlyExpenses:{} as Record<string,number>, recentExpenses:[] as Expense[], cheques:[] as Cheque[] });

  // Cheque form
  const [chq, setChq] = useState({ companyName:'', chequeNumber:'', chequeAmount:0, chequeDate:'', bankName:'', notes:'', chequeImage:'' });
  // Expense form
  const [exp, setExp] = useState({ chequeId:'', amount:0, category:'', description:'', receiptImage:'', expenseDate:'', vendorName:'', referenceNo:'', paymentFor:'' });

  // ⭐ v2 — OVERDUE LOCK helpers
  // Purane data ka status bhi balance se hi tay hota hai (overdue = negative balance)
  const effStatus = (c:Cheque) => statusForBalance(c.remainingBalance, true, c.status);
  const note = (c?:Cheque|null) => (c ? overdueNote(c) : '');
  const chqLabel = (c:Cheque) => { const st = effStatus(c); if(st==='cancelled') return 'CANCELLED'; if(st==='overdue') return 'OVERDUE'; return c.remainingBalance===0?'FULLY USED (0 BALANCE)':'ACTIVE'; };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // ⭐ FIX #6: pehle getAllCheques() + getAccountingStats() dono chalte the —
      // dono andar se saare cheques/expenses read karte hain (dohra kaam).
      // Ab ek hi call — stats ke saath cheques bhi mil jate hain.
      const s = await getAccountingStats();
      setCheques([...s.cheques].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
      setStats(s);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{load();},[load]);

  // ⭐ v3 — selected cheque (balance se directly, koi extra state nahi)
  const selChq = cheques.find(x => x.id === exp.chequeId) || null;
  const selChqBal = selChq ? selChq.remainingBalance : 0;
  const selNote = note(selChq);

  const refresh = async () => {
    // FIX #6: ek hi read (stats ke andar cheques bhi hain)
    const s = await getAccountingStats();
    setCheques([...s.cheques].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
    if(selectedCheque){const u=s.cheques.find(c=>c.id===selectedCheque.id);if(u){setSelectedCheque(u);setChequeExps(await getExpensesByCheque(u.id));}}
    setStats(s);
  };

  const filtered = cheques.filter(c=>{if(!search) return true; const q=search.toLowerCase(); return c.chequeNumber.toLowerCase().includes(q)||c.companyName.toLowerCase().includes(q)||c.bankName.toLowerCase().includes(q);});
  const openDetail = async (c:Cheque)=>{
    setSelectedCheque(c);
    const list = await getExpensesByCheque(c.id);
    setChequeExps(list);
    setShowDetail(true);
    // ⭐ bari images alag media node mein hain — detail khulne par lao
    try {
      const [chqFull, ...expsFull] = await Promise.all([
        getChequeWithImage(c.id),
        ...list.map(x => getExpenseWithImage(x.id)),
      ]);
      if (chqFull) setSelectedCheque(prev => (prev && prev.id === c.id ? { ...prev, ...chqFull } : prev));
      setChequeExps(expsFull.filter(Boolean) as Expense[]);
    } catch (e) { console.warn('media load fail:', e); }
  };

  // ADD CHEQUE
  const handleAddCheque = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await createCheque({companyName:chq.companyName,chequeNumber:chq.chequeNumber,chequeAmount:chq.chequeAmount,chequeDate:chq.chequeDate,bankName:chq.bankName,notes:chq.notes,chequeImage:chq.chequeImage});
      setToast({message:'✅ Cheque added!',type:'success'});
      setChq({companyName:'',chequeNumber:'',chequeAmount:0,chequeDate:'',bankName:'',notes:'',chequeImage:''});
      load();
    } catch(err:unknown){setToast({message:err instanceof Error?err.message:'Error',type:'error'});}
    finally{setBusy(false);}
  };

  // ADD EXPENSE
  const handleAddExpense = async (e:React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createExpense({chequeId:exp.chequeId,amount:exp.amount,category:exp.category,description:exp.paymentFor||exp.description,receiptImage:exp.receiptImage,expenseDate:exp.expenseDate,vendorName:exp.vendorName,referenceNo:exp.referenceNo});
      setToast({message:'✅ Expense added! Balance updated.',type:'success'});
      setExp({chequeId:exp.chequeId,amount:0,category:'',description:'',receiptImage:'',expenseDate:'',vendorName:'',referenceNo:'',paymentFor:''});
      load();
    } catch(err:unknown){setToast({message:err instanceof Error?err.message:'Error',type:'error'});}
    finally{setBusy(false);}
  };

  // DELETE
  const doDelCheque = async ()=>{if(!selectedCheque) return;setBusy(true);try{await deleteCheque(selectedCheque.id);setToast({message:'Deleted',type:'success'});setShowDelCheque(false);setShowDetail(false);load();}catch{setToast({message:'Failed',type:'error'});}finally{setBusy(false);}};
  const doDelExp = async ()=>{if(!delExpId) return;setBusy(true);try{await deleteExpense(delExpId);setToast({message:'Deleted, balance restored',type:'success'});setShowDelExp(false);await refresh();}catch{setToast({message:'Failed',type:'error'});}finally{setBusy(false);}};
  const doEditExp = async (e:React.FormEvent)=>{e.preventDefault();if(!editExp) return;setBusy(true);try{await updateExpense(editExp.id,editExp);setToast({message:'Updated!',type:'success'});setShowEditExp(false);setEditExp(null);await refresh();}catch(err:unknown){setToast({message:err instanceof Error?err.message:'Error',type:'error'});}finally{setBusy(false);}};

  // REPORT
  const genReport = async ()=>{if(!reportStart||!reportEnd){setToast({message:'Select dates',type:'warning'});return;}setReportData(await getExpensesByDateRange(reportStart,reportEnd));};
  const exportRepCSV = ()=>{exportToCSV(reportData.map((e,i)=>{
    const chq=cheques.find(c=>c.id===e.chequeId);
    return {'Invoice No':`INV-${String(i+1).padStart(4,'0')}`,'Cheque No':chq?.chequeNumber||'-','Company':chq?.companyName||'-','Date':formatDate(e.expenseDate),'Category':e.category,'For':e.description,'Vendor':e.vendorName,'Ref':e.referenceNo,'Amount':e.amount,'Cheque Status':chq?chqLabel(chq):'-'};
  }),'QIS_Expense_Report');setToast({message:'Exported',type:'success'});};
  const exportRepPDF = ()=>{const t=reportData.reduce((s,e)=>s+e.amount,0);const rows=reportData.map((e,i)=>{
    const chq=cheques.find(c=>c.id===e.chequeId);
    return `<tr><td>INV-${String(i+1).padStart(4,'0')}</td><td>${chq?.chequeNumber||'-'}</td><td>${formatDate(e.expenseDate)}</td><td>${e.category}</td><td>${e.description}</td><td>${e.vendorName}</td><td>${formatCurrency(e.amount)}</td><td>${chq?chqLabel(chq):'-'}</td></tr>`;
  }).join('');exportToPDF(`<h2>Queen International School — Expense Report</h2><p>Period: ${formatDate(reportStart)} — ${formatDate(reportEnd)}</p><p>Total Expenses: ${formatCurrency(t)}</p><p>Total Records: ${reportData.length}</p><table><thead><tr><th>Invoice</th><th>Cheque</th><th>Date</th><th>Category</th><th>For</th><th>Vendor</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`,'QIS Expense Report');};

  const catChart = Object.entries(stats.categoryBreakdown).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([l,v],i)=>({label:l,value:v,color:['#6366f1','#3b82f6','#10B981','#f43f5e','#8b5cf6','#ec4899'][i%6]}));
  const monthChart = Object.entries(stats.monthlyExpenses).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([l,v])=>({label:new Date(l+'-01').toLocaleDateString('en-US',{month:'short',year:'2-digit'}),value:v,color:'#6366f1'}));
  const catOpts = EXPENSE_CATEGORIES.map(c=>({value:c,label:c}));
  // ⭐ v3 — overdue/fully used cheques bhi list mein (expense add ho sakta hai), sirf CANCELLED alag
  const chqOpts = [
    // ⭐ FIX (CRITICAL): corrupt records (remainingBalance undefined) par
    // .toLocaleString() throw karta tha → white screen. Ab safe + corrupt filter.
    ...cheques.filter(c=>canAddExpense(c) && c.chequeNumber).map(c=>({value:c.id,label:`${safeNumber(c.remainingBalance)<0?'⚠️':'✅'} ${c.chequeNumber} — ${c.companyName||'(no company)'} (${safeNumber(c.remainingBalance)<0?`OVERDUE AED ${formatNumber(Math.abs(safeNumber(c.remainingBalance)))}`:`Bal: AED ${formatNumber(c.remainingBalance)}`})`})),
    ...cheques.filter(c=>!canAddExpense(c)).map(c=>({value:c.id,label:`⛔ ${c.chequeNumber} — ${c.companyName} (CANCELLED)`})),
  ];
  const chqCols = [
    {key:'sno',header:'#',render:(_c:Cheque,i?:number)=><span className="text-slate-400 font-bold">{(i??0)+1}</span>},
    {key:'chequeNumber',header:'Cheque No',render:(c:Cheque)=> c.chequeNumber
        ? <span className="font-mono font-bold text-slate-800">{c.chequeNumber}</span>
        : <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">⚠️ Corrupt record — delete karein</span>},
    {key:'companyName',header:'Company',render:(c:Cheque)=><span className="font-bold text-slate-700">{c.companyName}</span>},
    {key:'chequeAmount',header:'Amount',render:(c:Cheque)=><span className="font-bold text-slate-800">{formatCurrency(c.chequeAmount)}</span>},
    {key:'spent',header:'Spent',render:(c:Cheque)=><span className="text-rose-600 font-bold">{formatCurrency(c.chequeAmount-c.remainingBalance)}</span>},
    {key:'bal',header:'Balance',render:(c:Cheque)=><span className={`font-bold ${c.remainingBalance>0?'text-emerald-600':'text-rose-600'}`}>{formatCurrency(c.remainingBalance)}</span>},
    {key:'od',header:'⚠️ Overdue',render:(c:Cheque)=>getOverdueAmount(c)>0?<span className="font-bold text-red-700">{formatCurrency(getOverdueAmount(c))}</span>:<span className="text-slate-300">—</span>},
    {key:'st',header:'Status',render:(c:Cheque)=>{
      const st = effStatus(c);
      if(st==='overdue') return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-blink">⚠️ OVERDUE</span>;
      if(st==='exhausted'||c.remainingBalance===0) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">✅ FULLY USED (khula)</span>;
      if(st==='cancelled') return <StatusBadge status="expired" text="CANCELLED"/>;
      return <StatusBadge status="safe" text="ACTIVE"/>;
    }},
    {key:'dt',header:'Date',render:(c:Cheque)=><span className="text-slate-500 font-semibold text-xs">{formatDate(c.chequeDate)}</span>},
    {key:'a',header:'⚙️',render:(c:Cheque)=><IconButton size="sm" onClick={()=>openDetail(c)} title="View"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></IconButton>},
  ];

  // ⭐ FIX #10: pehle poora page blank + spinner dikhta tha jab tak saara data
  // na aa jaye. Ab page foran khulta hai, sirf chhota sa "loading" strip dikhta hai.

  return (
    <div className="p-6 space-y-8 ">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-800 tracking-normal">Accounts & Expenses</h1><p className="text-slate-400 font-bold text-sm mt-1">Queen International School — Expenditure Dashboard</p></div>
        <Button variant="secondary" onClick={()=>{exportToCSV(cheques.map((c,i)=>({'#':i+1,'Cheque':c.chequeNumber,'Company':c.companyName,'Amount':c.chequeAmount,'Spent':c.chequeAmount-c.remainingBalance,'Balance':c.remainingBalance,'Overdue':getOverdueAmount(c),'Status':chqLabel(c),'Date':formatDate(c.chequeDate)})),'QIS_Cheques');setToast({message:'Exported',type:'success'});}}>📊 Export All</Button>
      </div>

      {loading&&<div className="flex items-center gap-2 text-[12px] font-bold text-slate-500 bg-white border border-slate-100 rounded-[6px] px-3 py-2"><span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-indigo-600 border-b-indigo-600 border-r-slate-200 border-l-slate-200"/> Data load ho raha hai…</div>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-white rounded-[6px] p-1.5 border border-slate-100 shadow-sm">
        {(([['dashboard','📊 Dashboard'],['add-cheque','➕ Add Cheque'],['add-expense','💸 Add Expense'],['cheques','📝 All Cheques'],['reports','📄 Reports']] as [Tab,string][]).filter(([id])=>canWrite()||!['add-cheque','add-expense'].includes(id))).map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} className={`px-4 py-2.5 rounded-[6px] text-sm font-bold transition-all ${tab===id?'bg-indigo-600 text-white shadow-md shadow-indigo-100':'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
        ))}
      </div>

      {/* ======== DASHBOARD ======== */}
      {tab==='dashboard'&&(<div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard title="Total Received" value={formatCurrency(stats.totalReceived)} color="orange" icon={<span className="text-2xl">📥</span>}/>
          <StatCard title="Total Expenses" value={formatCurrency(stats.totalExpenses)} color="red" icon={<span className="text-2xl">📤</span>}/>
          <StatCard title="Remaining" value={formatCurrency(stats.totalRemaining)} color={stats.totalRemaining>=0?'green':'red'} icon={<span className="text-2xl">💰</span>}/>
          <StatCard title={stats.totalOverdue>0?`⚠️ OVERDUE (${stats.overdueCount})`:'Overdue'} value={formatCurrency(stats.totalOverdue)} color={stats.totalOverdue>0?'red':'green'} icon={<span className="text-2xl">🚨</span>}/>
          <StatCard title="Cheques" value={`${stats.activeCheques}/${stats.totalCheques}`} color="blue" icon={<span className="text-2xl">📝</span>}/>
        </div>
        {stats.totalOverdue>0&&(
          <div className="p-4 rounded-[6px] bg-amber-50 border-2 border-amber-300 flex flex-wrap items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1 min-w-[260px]">
              <p className="font-bold text-amber-900">{stats.overdueCount} cheque(s) OVERDUE — total {formatCurrency(stats.totalOverdue)} jama</p>
              <p className="text-sm text-amber-800">Yeh cheques band NAHI hain — expense add hota rahega aur extra amount isi cheque par OVERDUE mein jama hoti rahegi.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={()=>setTab('cheques')}>📝 Overdue Cheques Dekhein</Button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6"><h3 className="font-semibold text-gray-800 mb-4">📊 By Category</h3>{catChart.length>0?<PieChart data={catChart} size={180}/>:<p className="text-center text-gray-400 py-6">No data</p>}</Card>
          <Card className="p-6"><h3 className="font-semibold text-gray-800 mb-4">📈 Monthly</h3>{monthChart.length>0?<BarChart data={monthChart} height={180}/>:<p className="text-center text-gray-400 py-6">No data</p>}</Card>
        </div>
        {/* All Cheques with Images on Dashboard */}
        <Card className="p-6"><h3 className="font-semibold text-gray-800 mb-4">📝 All Cheques Overview</h3>
          {cheques.length===0?<p className="text-center text-gray-400 py-6">No cheques yet</p>:(
            <div className="space-y-4">{cheques.map((c)=>(
              <div key={c.id} className="p-4 bg-white rounded-[6px] border border-gray-100 hover:border-slate-200 cursor-pointer transition-all" onClick={()=>openDetail(c)}>
                <div className="flex items-start gap-4">
                  {/* Cheque Image */}
                  {(c.chequeThumb||c.chequeImage) ? (
                    <img src={c.chequeThumb||c.chequeImage} alt="Cheque" style={{width:'200px',height:'120px'}} className="rounded-[6px] border-2 border-slate-200 bg-slate-50 flex-shrink-0"/>
                  ) : (
                    <div style={{width:'200px',height:'120px'}} className="rounded-[6px] border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0"><span className="text-3xl">📝</span></div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-gray-800">{c.chequeNumber} — {c.companyName}</p>
                        <p className="text-gray-500 text-sm">{c.bankName||'No bank'} • {formatDate(c.chequeDate)}</p>
                      </div>
                      <StatusBadge status={effStatus(c)==='active'?'safe':effStatus(c)==='exhausted'?'warning':'expired'} text={effStatus(c)==='overdue'?'⚠️ OVERDUE':c.remainingBalance===0?'✅ FULLY USED':'ACTIVE'}/>
                    </div>
                    <div className={`grid ${c.remainingBalance<0?'grid-cols-4':'grid-cols-3'} gap-3 mt-3`}>
                      <div className="p-2 bg-blue-50 rounded-[6px] text-center"><p className="text-xs text-black font-bold">Total</p><p className="font-bold text-blue-800">{formatCurrency(c.chequeAmount)}</p></div>
                      <div className="p-2 bg-red-50 rounded-[6px] text-center"><p className="text-xs text-black font-bold">Spent</p><p className="font-bold text-red-700">{formatCurrency(c.chequeAmount-c.remainingBalance)}</p></div>
                      <div className={`p-2 rounded-[6px] text-center ${c.remainingBalance>=0?'bg-emerald-50':'bg-red-50'}`}><p className="text-xs text-black font-bold">{c.remainingBalance>=0?'Balance':'Balance'}</p><p className={`font-bold ${c.remainingBalance>=0?'text-emerald-700':'text-red-700'}`}>{formatCurrency(c.remainingBalance)}</p></div>
                      {c.remainingBalance<0&&<div className="p-2 bg-red-100 rounded-[6px] text-center border-2 border-red-300"><p className="text-xs text-black font-bold">⚠️ OVERDUE</p><p className="font-bold text-red-800">{formatCurrency(Math.abs(c.remainingBalance))}</p></div>}
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 mt-3 overflow-hidden"><div className={`h-full rounded-full ${c.remainingBalance>0?'bg-gradient-to-r from-indigo-600 to-blue-600':'bg-red-500'}`} style={{width:`${Math.min(100,((c.chequeAmount-c.remainingBalance)/c.chequeAmount)*100)}%`}}/></div>
                  </div>
                </div>
              </div>
            ))}</div>
          )}
        </Card>

        {/* Recent Expenses - CLICKABLE to open cheque detail */}
        <Card className="p-6"><h3 className="font-semibold text-black mb-4">🕐 Recent Expenses</h3>
          {stats.recentExpenses.length===0?<p className="text-center text-gray-400 py-6">No expenses</p>:(<div className="space-y-2">{stats.recentExpenses.map((e,i)=>{
            const parentCheque = cheques.find(c=>c.id===e.chequeId);
            return (
            <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-[6px] border border-slate-100 cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-100 transition-all" onClick={()=>{if(parentCheque) openDetail(parentCheque);}}>
              <div className="flex items-center gap-3"><span className="text-black font-bold w-6">{i+1}</span>
                {(e.receiptThumb||e.receiptImage)&&<img src={e.receiptThumb||e.receiptImage} alt="" style={{width:'48px',height:'48px'}} className="rounded-[6px] border border-slate-200"/>}
                <div>
                  <p className="text-black font-bold text-sm">{e.description||e.category}</p>
                  <p className="text-black text-xs">{e.category} • {formatDate(e.expenseDate)}</p>
                  {parentCheque&&<p className="text-indigo-600 text-xs font-bold">📝 {parentCheque.chequeNumber} — {parentCheque.companyName}</p>}
                </div>
              </div>
              <span className="text-red-700 font-bold text-lg">{formatCurrency(e.amount)}</span>
            </div>
          );})}</div>)}
        </Card>
      </div>)}

      {/* ======== ADD CHEQUE ======== */}
      {tab==='add-cheque'&&(
        <form onSubmit={handleAddCheque}>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <Card className="p-6 xl:col-span-1"><h2 className="font-semibold text-gray-800 mb-4">📷 Cheque Image</h2><ImageUpload label="Upload Cheque Photo" value={chq.chequeImage} onChange={b=>setChq({...chq,chequeImage:b})} onClear={()=>setChq({...chq,chequeImage:''})} previewSize="lg"/></Card>
            <Card className="p-6 xl:col-span-3">
              <h2 className="font-semibold text-gray-800 mb-6">📝 Cheque Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Cheque Number" value={chq.chequeNumber} onChange={e=>setChq({...chq,chequeNumber:e.target.value})} placeholder="CHQ-001" required/>
                <Input label="Company / Issued By" value={chq.companyName} onChange={e=>setChq({...chq,companyName:e.target.value})} placeholder="Company" required/>
                <Input label="Amount (AED)" type="number" value={chq.chequeAmount||''} onChange={e=>setChq({...chq,chequeAmount:parseFloat(e.target.value)||0})} required/>
                <Input label="Date" type="date" value={chq.chequeDate} onChange={e=>setChq({...chq,chequeDate:e.target.value})} required/>
                <Input label="Bank" value={chq.bankName} onChange={e=>setChq({...chq,bankName:e.target.value})}/>
                <Input label="Notes" value={chq.notes} onChange={e=>setChq({...chq,notes:e.target.value})}/>
              </div>
              {chq.chequeAmount>0&&<div className="mt-6 p-4 bg-emerald-50 rounded-[6px] border border-emerald-200 text-center"><p className="text-xs text-gray-500">Available Balance</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(chq.chequeAmount)}</p></div>}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <Button type="button" variant="secondary" onClick={()=>setChq({companyName:'',chequeNumber:'',chequeAmount:0,chequeDate:'',bankName:'',notes:'',chequeImage:''})}>Reset</Button>
                <Button type="submit" isLoading={busy}>💾 Save Cheque</Button>
              </div>
            </Card>
          </div>
        </form>
      )}

      {/* ======== ADD EXPENSE ======== */}
      {tab==='add-expense'&&(
        <form onSubmit={handleAddExpense}>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <Card className="p-6 xl:col-span-1"><h2 className="font-semibold text-gray-800 mb-4">📷 Receipt Image</h2><ImageUpload label="Upload Receipt / Invoice" value={exp.receiptImage} onChange={b=>setExp({...exp,receiptImage:b})} onClear={()=>setExp({...exp,receiptImage:''})} previewSize="lg"/></Card>
            <Card className="p-6 xl:col-span-3">
              <h2 className="font-semibold text-gray-800 mb-6">💸 Expense Details</h2>
              <Select label="Select Cheque (Deduct From)" value={exp.chequeId} onChange={e=>setExp({...exp,chequeId:e.target.value})} options={chqOpts} required/>

              {/* ⭐ v3 — OVERDUE info (block NAHI: expense add hota rahega) */}
              {selNote&&(
                <div className="my-4 p-4 rounded-[6px] bg-amber-50 border-2 border-amber-300">
                  <p className="font-bold text-amber-900">⚠️ {selChq&&getOverdueAmount(selChq)>0?`Is cheque par ${formatCurrency(getOverdueAmount(selChq))} OVERDUE jama hai`:'Cheque ka balance khatam hai'}</p>
                  <p className="text-sm text-amber-800 mt-1">Expense phir bhi add ho jayega — extra amount isi cheque par OVERDUE mein jama hoti rahegi.</p>
                </div>
              )}

              {exp.chequeId&&<div className={`my-4 p-4 rounded-[6px] border ${selChqBal-exp.amount<0?'bg-amber-50/70 border-amber-200':'bg-slate-50 border-slate-200'}`}><div className={`grid ${selChqBal-exp.amount<0?'grid-cols-4':'grid-cols-3'} gap-4 text-center`}>
                <div><p className="text-xs text-black font-bold">Cheque Balance</p><p className={`text-xl font-bold ${selChqBal<0?'text-red-700':'text-emerald-700'}`}>{formatCurrency(selChqBal)}</p></div>
                <div><p className="text-xs text-black font-bold">This Expense</p><p className="text-xl font-bold text-red-600">{formatCurrency(exp.amount)}</p></div>
                <div><p className="text-xs text-black font-bold">After Deduction</p><p className={`text-xl font-bold ${selChqBal-exp.amount>=0?'text-emerald-700':'text-red-700'}`}>{formatCurrency(selChqBal-exp.amount)}</p></div>
                {selChqBal-exp.amount<0&&<div className="p-2 bg-red-100 rounded-[6px] border border-red-300"><p className="text-xs text-black font-bold">⚠️ OVERDUE (JAMA HOGA)</p><p className="text-xl font-bold text-red-700">{formatCurrency(Math.abs(selChqBal-exp.amount))}</p></div>}
              </div></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input label="Payment For (Purpose)" value={exp.paymentFor} onChange={e=>setExp({...exp,paymentFor:e.target.value})} placeholder="What is this payment for?" required/>
                <Select label="Category" value={exp.category} onChange={e=>setExp({...exp,category:e.target.value})} options={catOpts} required/>
                <Input label="Amount (AED)" type="number" value={exp.amount||''} onChange={e=>setExp({...exp,amount:parseFloat(e.target.value)||0})} required/>
                <Input label="Date" type="date" value={exp.expenseDate} onChange={e=>setExp({...exp,expenseDate:e.target.value})} required/>
                <Input label="Vendor / Paid To" value={exp.vendorName} onChange={e=>setExp({...exp,vendorName:e.target.value})}/>
                <Input label="Invoice / Ref No" value={exp.referenceNo} onChange={e=>setExp({...exp,referenceNo:e.target.value})}/>
              </div>
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <Button type="button" variant="secondary" onClick={()=>setExp({chequeId:exp.chequeId,amount:0,category:'',description:'',receiptImage:'',expenseDate:'',vendorName:'',referenceNo:'',paymentFor:''})}>Reset</Button>
                <Button type="submit" isLoading={busy}>💾 Save Expense</Button>
              </div>
            </Card>
          </div>
        </form>
      )}

      {/* ======== ALL CHEQUES ======== */}
      {tab==='cheques'&&(<div className="space-y-6">
        <Card className="p-4"><Input placeholder="Search cheque, company, bank..." value={search} onChange={e=>setSearch(e.target.value)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}/></Card>
        <Table columns={chqCols} data={filtered} keyField="id" onRowDoubleClick={openDetail} emptyMessage="No cheques"/>
        <p className="text-sm text-gray-400">{filtered.length} cheques</p>
      </div>)}

      {/* ======== REPORTS ======== */}
      {tab==='reports'&&(<div className="space-y-6">
        <Card className="p-6"><h3 className="font-semibold text-gray-800 mb-4">📄 Date Range Report</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <Input label="From" type="date" value={reportStart} onChange={e=>setReportStart(e.target.value)}/>
            <Input label="To" type="date" value={reportEnd} onChange={e=>setReportEnd(e.target.value)}/>
            <Button onClick={genReport}>🔍 Generate</Button>
            {reportData.length>0&&<><Button variant="secondary" onClick={exportRepCSV}>📊 CSV</Button><Button variant="secondary" onClick={exportRepPDF}>📄 PDF</Button></>}
          </div>
        </Card>
        {reportData.length>0&&<Card className="p-6">
          <div className="flex justify-between mb-4"><h3 className="font-bold text-black">{reportData.length} expenses</h3><span className="font-bold text-red-700 text-xl">Total: {formatCurrency(reportData.reduce((s,e)=>s+e.amount,0))}</span></div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">{reportData.map((e,i)=>{
            const chq = cheques.find(c=>c.id===e.chequeId);
            const invoiceNo = `INV-${String(i+1).padStart(4,'0')}`;
            return (
            <div key={e.id} className="p-5 bg-white rounded-[6px] border border-gray-200 hover:border-slate-200 transition-all">
              {/* Invoice & Cheque Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-indigo-50 text-orange-800 rounded-[6px] font-bold text-sm">{invoiceNo}</span>
                  {chq&&<span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-[6px] font-bold text-sm">📝 {chq.chequeNumber}</span>}
                  {chq&&<span className="text-black font-bold text-sm">{chq.companyName}</span>}
                  {chq&&chq.remainingBalance<0&&<span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold animate-blink">OVERDUE</span>}
                </div>
                <span className="text-red-700 font-bold text-xl">{formatCurrency(e.amount)}</span>
              </div>

              <div className="flex items-start gap-4">
                {/* Cheque Image */}
                {chq?.chequeImage&&(
                  <div className="flex-shrink-0">
                    <p className="text-xs text-black font-bold mb-1">📝 Cheque:</p>
                    <img src={chq.chequeImage} alt="Cheque" style={{width:'180px',height:'110px'}} className="rounded-[6px] border-2 border-blue-200 bg-blue-50" onClick={()=>chq.chequeImage && setPreviewImg({ src: chq.chequeImage, title: `Cheque: ${chq.chequeNumber}` })}/>
                  </div>
                )}

                {/* Expense Details */}
                <div className="flex-1">
                  <p className="text-black font-bold text-lg">{e.description||e.category}</p>
                  <p className="text-black font-bold text-sm mt-1">📂 {e.category} • 🏪 {e.vendorName||'—'} • 📅 {formatDate(e.expenseDate)}</p>
                  {e.referenceNo&&<p className="text-black text-sm mt-1">🔢 Ref: {e.referenceNo}</p>}
                </div>

                {/* Receipt Image */}
                {e.receiptImage&&(
                  <div className="flex-shrink-0">
                    <p className="text-xs text-black font-bold mb-1">📷 Receipt:</p>
                    <img src={e.receiptImage} alt="Receipt" style={{width:'200px',height:'300px'}} className="rounded-[6px] border-2 border-slate-200 bg-slate-50" onClick={()=>e.receiptImage && setPreviewImg({ src: e.receiptImage, title: `Receipt for ${e.description || e.category}` })}/>
                  </div>
                )}
              </div>
            </div>
          );})}</div>
        </Card>}
      </div>)}

      {/* ======== CHEQUE DETAIL MODAL ======== */}
      <Modal isOpen={showDetail} onClose={()=>setShowDetail(false)} title="📋 Cheque Details & Expenses" size="xl">
        {selectedCheque&&(<div className="space-y-6">
          {/* Cheque Image Display */}
          {selectedCheque.chequeImage && (
            <div>
              <p className="text-xs text-indigo-600 font-medium mb-2">📷 Cheque Image:</p>
              <img src={selectedCheque.chequeImage} alt="Cheque" style={{width:'500px',height:'300px'}} className="rounded-[6px] border-2 border-slate-200 bg-slate-50 shadow-md" onClick={()=>selectedCheque.chequeImage && setPreviewImg({ src: selectedCheque.chequeImage, title: `Cheque: ${selectedCheque.chequeNumber}` })}/>
            </div>
          )}

          <div className={`grid grid-cols-2 ${selectedCheque.remainingBalance<0?'md:grid-cols-5':'md:grid-cols-4'} gap-4`}>
            <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-100 text-center"><p className="text-xs text-black font-bold">Cheque No</p><p className="text-lg font-bold text-black">{selectedCheque.chequeNumber}</p></div>
            <div className="p-3 bg-blue-50 rounded-[6px] border border-blue-100 text-center"><p className="text-xs text-black font-bold">Total Amount</p><p className="text-lg font-bold text-blue-800">{formatCurrency(selectedCheque.chequeAmount)}</p></div>
            <div className="p-3 bg-red-50 rounded-[6px] border border-red-100 text-center"><p className="text-xs text-black font-bold">Total Spent</p><p className="text-lg font-bold text-red-700">{formatCurrency(selectedCheque.chequeAmount-selectedCheque.remainingBalance)}</p></div>
            <div className={`p-3 rounded-[6px] border text-center ${selectedCheque.remainingBalance>=0?'bg-emerald-50 border-emerald-100':'bg-red-50 border-red-100'}`}><p className="text-xs text-black font-bold">{selectedCheque.remainingBalance>=0?'Remaining':'Remaining'}</p><p className={`text-lg font-bold ${selectedCheque.remainingBalance>=0?'text-emerald-700':'text-red-700'}`}>{formatCurrency(selectedCheque.remainingBalance)}</p></div>
            {selectedCheque.remainingBalance<0&&<div className="p-3 bg-red-200 rounded-[6px] border-2 border-red-400 text-center animate-blink"><p className="text-xs text-black font-bold">⚠️ OVERDUE</p><p className="text-lg font-bold text-red-900">{formatCurrency(Math.abs(selectedCheque.remainingBalance))}</p></div>}
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-400 text-xs">Company</p><p className="text-gray-800 font-medium">{selectedCheque.companyName}</p></div>
            <div><p className="text-gray-400 text-xs">Bank</p><p className="text-gray-800">{selectedCheque.bankName||'-'}</p></div>
            <div><p className="text-gray-400 text-xs">Date</p><p className="text-gray-800">{formatDate(selectedCheque.chequeDate)}</p></div>
          </div>
          {selectedCheque.notes&&<div><p className="text-gray-400 text-xs">Notes</p><p className="text-gray-800">{selectedCheque.notes}</p></div>}
          <div className="bg-gray-100 rounded-full h-4 overflow-hidden"><div className={`h-full rounded-full ${selectedCheque.remainingBalance>0?'bg-gradient-to-r from-indigo-600 to-blue-600':'bg-red-500'}`} style={{width:`${Math.min(100,((selectedCheque.chequeAmount-selectedCheque.remainingBalance)/selectedCheque.chequeAmount)*100)}%`}}/></div>
          <p className="text-center text-xs text-gray-500">{(((selectedCheque.chequeAmount-selectedCheque.remainingBalance)/selectedCheque.chequeAmount)*100).toFixed(1)}% used</p>

          {/* ⭐ v3 — OVERDUE info (block nahi) */}
          {getOverdueAmount(selectedCheque)>0&&(
            <div className="p-4 rounded-[6px] bg-amber-50 border-2 border-amber-300">
              <p className="font-bold text-amber-900">⚠️ OVERDUE: {formatCurrency(getOverdueAmount(selectedCheque))} jama</p>
              <p className="text-sm text-amber-800 mt-1">Total kharcha {formatCurrency(getSpentAmount(selectedCheque))} — cheque amount {formatCurrency(selectedCheque.chequeAmount)} se zyada. Naye expenses add hote rahenge, overdue barhti rahegi.</p>
            </div>
          )}

          {canWrite()&&<Button variant="danger" onClick={()=>setShowDelCheque(true)}>🗑️ Delete Cheque</Button>}

          {/* Expenses with BIG Receipt Images */}
          <div><h4 className="font-semibold text-gray-800 mb-3">📋 Expenses ({chequeExps.length})</h4>
            {chequeExps.length===0?<div className="text-center py-6 text-gray-400 bg-gray-50 rounded-[6px]">No expenses</div>:(
              <div className="space-y-4 max-h-[500px] overflow-y-auto">{chequeExps.map((ex,i)=>(
                <div key={ex.id} className="p-4 bg-white rounded-[6px] border border-gray-100 hover:border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <span className="text-gray-400 font-medium w-6 pt-1">{i+1}</span>
                      <div className="flex-1">
                        <p className="text-gray-800 font-semibold text-lg">{ex.description||ex.category}</p>
                        <p className="text-gray-500 text-sm mt-1">📂 {ex.category} • 🏪 {ex.vendorName||'No vendor'} • 📅 {formatDate(ex.expenseDate)}</p>
                        {ex.referenceNo&&<p className="text-gray-400 text-xs mt-1">Ref: {ex.referenceNo}</p>}
                        
                        {/* RECEIPT IMAGE - 300x500 (3x5 inch at 100dpi) */}
                        {(ex.receiptThumb||ex.receiptImage)&&(
                          <div className="mt-4">
                            <p className="text-xs text-indigo-600 font-medium mb-2">📷 Receipt:</p>
                            <img src={ex.receiptThumb||ex.receiptImage} alt="Receipt"
                              style={{ width:'300px', height:'500px' }}
                              className="rounded-[6px] border-2 border-slate-200 bg-slate-50 cursor-pointer hover:opacity-90 shadow-md"
                              onClick={()=>setPreviewImg({ src: ex.receiptImage||ex.receiptThumb||'', title: `Receipt: ${ex.description || ex.category}` })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                      <span className="text-red-600 font-bold text-xl">{formatCurrency(ex.amount)}</span>
                      <div className="flex gap-1">
                        {canWrite()&&<IconButton size="sm" onClick={()=>{setEditExp({...ex});setShowEditExp(true);}} title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></IconButton>}
                        {canWrite()&&<IconButton size="sm" variant="danger" onClick={()=>{setDelExpId(ex.id);setShowDelExp(true);}}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></IconButton>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}</div>
            )}
          </div>
        </div>)}
      </Modal>

      {/* EDIT EXPENSE */}
      <Modal isOpen={showEditExp} onClose={()=>{setShowEditExp(false);setEditExp(null);}} title="✏️ Edit Expense" size="lg">
        {editExp&&(<form onSubmit={doEditExp} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Category" value={editExp.category} onChange={e=>setEditExp({...editExp,category:e.target.value})} options={catOpts} required/>
            <Input label="Amount" type="number" value={editExp.amount||''} onChange={e=>setEditExp({...editExp,amount:parseFloat(e.target.value)||0})} required/>
            <Input label="Date" type="date" value={editExp.expenseDate} onChange={e=>setEditExp({...editExp,expenseDate:e.target.value})} required/>
            <Input label="Vendor" value={editExp.vendorName} onChange={e=>setEditExp({...editExp,vendorName:e.target.value})}/>
            <Input label="Reference" value={editExp.referenceNo} onChange={e=>setEditExp({...editExp,referenceNo:e.target.value})}/>
            <Input label="Description" value={editExp.description} onChange={e=>setEditExp({...editExp,description:e.target.value})}/>
          </div>
          <ImageUpload label="📷 Receipt" value={editExp.receiptImage} onChange={b=>setEditExp({...editExp,receiptImage:b})} onClear={()=>setEditExp({...editExp,receiptImage:''})} previewSize="lg"/>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200"><Button variant="secondary" type="button" onClick={()=>setShowEditExp(false)}>Cancel</Button><Button type="submit" isLoading={busy}>💾 Update</Button></div>
        </form>)}
      </Modal>

      <ConfirmDialog isOpen={showDelCheque} onClose={()=>setShowDelCheque(false)} onConfirm={doDelCheque} title="🗑️ Delete Cheque" message={`Delete "${selectedCheque?.chequeNumber}"? All expenses deleted too.`} confirmText="Delete" variant="danger" isLoading={busy}/>
      <ConfirmDialog isOpen={showDelExp} onClose={()=>setShowDelExp(false)} onConfirm={doDelExp} title="🗑️ Delete Expense" message="Delete? Balance restored." confirmText="Delete" variant="danger" isLoading={busy}/>

      {previewImg && (
        <ImageModal
          isOpen={!!previewImg}
          onClose={() => setPreviewImg(null)}
          imageSrc={previewImg.src}
          title={previewImg.title}
        />
      )}

      {toast&&<Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
};
