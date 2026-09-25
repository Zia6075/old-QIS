// ============================================
// Accounting System - Full Cheque & Expense
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card, StatCard } from '../components/UI/Card';
import { Button, IconButton } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Table, StatusBadge } from '../components/UI/Table';
import { Modal, ConfirmDialog, Toast } from '../components/UI/Modal';
import { PieChart, BarChart } from '../components/UI/Charts';
import { ImageUpload } from '../components/UI/ImageUpload';
import { formatDate, formatCurrency, formatNumber, exportToCSV, exportToPDF } from '../utils/helpers';
import {
  Cheque, Expense, EXPENSE_CATEGORIES,
  createCheque, getAllCheques, deleteCheque,
  createExpense, getExpensesByCheque, deleteExpense, updateExpense,
  getAccountingStats, getExpensesByDateRange,
  canAddExpense, getOverdueAmount, overdueNote, statusForBalance,
} from '../database/accountingService';

interface Props { userId: string; }
type Tab = 'dashboard' | 'cheques' | 'reports';

export const AccountingPage: React.FC<Props> = ({ userId: _u }) => {
  void _u;
  const [tab, setTab] = useState<Tab>('dashboard');
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [chequeExpenses, setChequeExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'|'warning'|'info'}|null>(null);
  const [showAddCheque, setShowAddCheque] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDelCheque, setShowDelCheque] = useState(false);
  const [showDelExpense, setShowDelExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense|null>(null);
  const [delExpId, setDelExpId] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [reportData, setReportData] = useState<Expense[]>([]);

  const [stats, setStats] = useState({
    totalReceived:0, totalExpenses:0, totalRemaining:0,
    totalOverdue:0, overdueCount:0, overdueCheques:0,
    totalCheques:0, activeCheques:0, exhaustedCheques:0,
    categoryBreakdown:{} as Record<string,number>,
    monthlyExpenses:{} as Record<string,number>,
    recentExpenses:[] as Expense[],
    cheques:[] as Cheque[],
  });

  const [chqForm, setChqForm] = useState({ companyName:'', chequeNumber:'', chequeAmount:0, chequeDate:'', bankName:'', notes:'' });
  const [expForm, setExpForm] = useState({ chequeId:'', amount:0, category:'', description:'', receiptImage:'', expenseDate:'', vendorName:'', referenceNo:'' });

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

  const loadExps = async (id:string) => { setChequeExpenses(await getExpensesByCheque(id)); };

  // ⭐ v2 — OVERDUE LOCK helpers (purane data ka status bhi balance se tay hota hai)
  const effStatus = (c:Cheque) => statusForBalance(c.remainingBalance, true, c.status);
  const isOver = (c?:Cheque|null) => !!c && getOverdueAmount(c) > 0;
  const note = (c?:Cheque|null) => (c ? overdueNote(c) : '');
  const chqLabel = (c:Cheque) => { const st = effStatus(c); if(st==='cancelled') return 'CANCELLED'; if(st==='overdue') return 'OVERDUE'; return c.remainingBalance===0?'FULLY USED (0 BALANCE)':'ACTIVE'; };

  const refreshCheque = async () => {
    const all = await getAllCheques();
    setCheques(all);
    if(selectedCheque){ const u=all.find(c=>c.id===selectedCheque.id); if(u){setSelectedCheque(u); await loadExps(u.id);} }
    const s = await getAccountingStats(); setStats(s);
  };

  const filtered = cheques.filter(c=>{
    if(!search) return true;
    const q=search.toLowerCase();
    return c.chequeNumber.toLowerCase().includes(q)||c.companyName.toLowerCase().includes(q)||c.bankName.toLowerCase().includes(q);
  });

  // ---- ADD CHEQUE ----
  const handleAddCheque = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      await createCheque(chqForm);
      setToast({message:'✅ Cheque added!',type:'success'});
      setChqForm({companyName:'',chequeNumber:'',chequeAmount:0,chequeDate:'',bankName:'',notes:''});
      setShowAddCheque(false); load();
    } catch(err:unknown){setToast({message:err instanceof Error?err.message:'Error',type:'error'});}
    finally{setBusy(false);}
  };

  // ---- ADD EXPENSE ----
  const handleAddExpense = async (e:React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createExpense(expForm);
      setToast({message:'✅ Expense added! Balance updated.',type:'success'});
      setExpForm({chequeId:selectedCheque?.id||'',amount:0,category:'',description:'',receiptImage:'',expenseDate:'',vendorName:'',referenceNo:''});
      setShowAddExpense(false); await refreshCheque();
    } catch(err:unknown){setToast({message:err instanceof Error?err.message:'Error',type:'error'});}
    finally{setBusy(false);}
  };

  // ---- EDIT EXPENSE ----
  const handleEditExpense = async (e:React.FormEvent) => {
    e.preventDefault(); if(!editingExpense) return; setBusy(true);
    try {
      await updateExpense(editingExpense.id, editingExpense);
      setToast({message:'✅ Expense updated!',type:'success'});
      setShowEditExpense(false); setEditingExpense(null); await refreshCheque();
    } catch(err:unknown){setToast({message:err instanceof Error?err.message:'Error',type:'error'});}
    finally{setBusy(false);}
  };

  // ---- DELETE ----
  const doDelCheque = async () => {
    if(!selectedCheque) return; setBusy(true);
    try { await deleteCheque(selectedCheque.id); setToast({message:'Cheque deleted',type:'success'}); setShowDelCheque(false); setShowDetail(false); setSelectedCheque(null); load(); }
    catch{setToast({message:'Failed',type:'error'});} finally{setBusy(false);}
  };

  const doDelExpense = async () => {
    if(!delExpId) return; setBusy(true);
    try { await deleteExpense(delExpId); setToast({message:'Expense deleted, balance restored',type:'success'}); setShowDelExpense(false); await refreshCheque(); }
    catch{setToast({message:'Failed',type:'error'});} finally{setBusy(false);}
  };

  const openDetail = async (c:Cheque) => { setSelectedCheque(c); await loadExps(c.id); setShowDetail(true); };

  // ---- REPORTS ----
  const generateReport = async () => {
    if(!reportStart||!reportEnd){setToast({message:'Select date range',type:'warning'});return;}
    const data = await getExpensesByDateRange(reportStart, reportEnd);
    setReportData(data);
  };

  const exportReportCSV = () => {
    const data = reportData.map((e,i)=>({
      'S.No':i+1, 'Date':formatDate(e.expenseDate), 'Category':e.category, 'Description':e.description,
      'Vendor':e.vendorName, 'Reference':e.referenceNo, 'Amount':e.amount,
    }));
    exportToCSV(data,'QIS_Expense_Report');
    setToast({message:'CSV exported',type:'success'});
  };

  const exportReportPDF = () => {
    const total = reportData.reduce((s,e)=>s+e.amount,0);
    const rows = reportData.map((e,i)=>`<tr><td>${i+1}</td><td>${formatDate(e.expenseDate)}</td><td>${e.category}</td><td>${e.description}</td><td>${e.vendorName}</td><td>${formatCurrency(e.amount)}</td></tr>`).join('');
    exportToPDF(`<h2>Expense Report</h2><p>Period: ${formatDate(reportStart)} — ${formatDate(reportEnd)}</p><p>Total: ${formatCurrency(total)}</p>
      <table><thead><tr><th>#</th><th>Date</th><th>Category</th><th>Description</th><th>Vendor</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>`, 'QIS Expense Report');
  };

  const exportChequesCSV = () => {
    const data = cheques.map((c,i)=>({
      'S.No':i+1, 'Cheque No':c.chequeNumber, 'Company':c.companyName, 'Bank':c.bankName,
      'Amount':c.chequeAmount, 'Spent':c.chequeAmount-c.remainingBalance, 'Remaining':c.remainingBalance,
      'Overdue':getOverdueAmount(c), 'Status':chqLabel(c), 'Date':formatDate(c.chequeDate),
    }));
    exportToCSV(data,'QIS_Cheques'); setToast({message:'CSV exported',type:'success'});
  };

  // ---- CHART DATA ----
  const catChart = Object.entries(stats.categoryBreakdown).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([l,v],i)=>({
    label:l, value:v, color:['#F97316','#3B82F6','#10B981','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F59E0B'][i%8],
  }));
  const monthChart = Object.entries(stats.monthlyExpenses).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([l,v])=>({
    label:new Date(l+'-01').toLocaleDateString('en-US',{month:'short',year:'2-digit'}), value:v, color:'#F97316',
  }));

  const catOpts = EXPENSE_CATEGORIES.map(c=>({value:c,label:c}));
  // ⭐ v3 — overdue cheques bhi list mein, sirf CANCELLED alag
  const chqOpts = [
    ...cheques.filter(c=>canAddExpense(c) && c.chequeNumber).map(c=>({value:c.id,label:`✅ ${c.chequeNumber} — ${c.companyName||'(no company)'} (Bal: AED ${formatNumber(c.remainingBalance)})`})),
    ...cheques.filter(c=>!canAddExpense(c)).map(c=>({value:c.id,label:`⛔ ${c.chequeNumber} — ${c.companyName} (CANCELLED)`})),
  ];

  const chqCols = [
    {key:'sno',header:'#',render:(_c:Cheque,i?:number)=><span className="text-orange-600 font-semibold">{(i??0)+1}</span>},
    {key:'chequeNumber',header:'Cheque No',render:(c:Cheque)=><span className="text-gray-800 font-mono font-medium">{c.chequeNumber}</span>},
    {key:'companyName',header:'Company',render:(c:Cheque)=><span className="text-gray-800 font-medium">{c.companyName}</span>},
    {key:'chequeAmount',header:'Amount',render:(c:Cheque)=><span className="text-gray-800 font-semibold">{formatCurrency(c.chequeAmount)}</span>},
    {key:'spent',header:'Spent',render:(c:Cheque)=><span className="text-red-600 font-medium">{formatCurrency(c.chequeAmount-c.remainingBalance)}</span>},
    {key:'remainingBalance',header:'Balance',render:(c:Cheque)=><span className={`font-bold ${c.remainingBalance>0?'text-emerald-600':'text-red-600'}`}>{formatCurrency(c.remainingBalance)}</span>},
    {key:'od',header:'⚠️ Overdue',render:(c:Cheque)=>getOverdueAmount(c)>0?<span className="font-bold text-red-700">{formatCurrency(getOverdueAmount(c))}</span>:<span className="text-gray-300">—</span>},
    {key:'status',header:'Status',render:(c:Cheque)=>{const st=effStatus(c);
      if(st==='overdue') return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-blink">⚠️ OVERDUE</span>;
      if(st==='exhausted'||c.remainingBalance===0) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">✅ FULLY USED (khula)</span>;
      return <StatusBadge status={st==='active'?'safe':'expired'} text={st.toUpperCase()} />;
    }},
    {key:'chequeDate',header:'Date',render:(c:Cheque)=><span className="text-gray-500 text-sm">{formatDate(c.chequeDate)}</span>},
    {key:'act',header:'⚙️',render:(c:Cheque)=>(
      <IconButton size="sm" onClick={()=>openDetail(c)} title="View"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></IconButton>
    )},
  ];

  if(loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">💰 Accounting System</h1>
          <p className="text-orange-600 mt-1">Queen International School — Financial Management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={exportChequesCSV}>📊 Export</Button>
          <Button onClick={()=>setShowAddCheque(true)}>➕ Add Cheque</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-[6px] p-1 border border-orange-100 w-fit">
        {([['dashboard','📊 Dashboard'],['cheques','📝 Cheques'],['reports','📄 Reports']] as [Tab,string][]).map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} className={`px-5 py-2.5 rounded-[6px] text-sm font-medium transition-all ${tab===id?'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md':'text-gray-600 hover:bg-orange-50'}`}>{label}</button>
        ))}
      </div>

      {/* ======== DASHBOARD ======== */}
      {tab==='dashboard'&&(
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard title="Total Received" value={formatCurrency(stats.totalReceived)} color="orange" icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
            <StatCard title="Total Expenses" value={formatCurrency(stats.totalExpenses)} color="red" icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1" /></svg>} />
            <StatCard title="Remaining Balance" value={formatCurrency(stats.totalRemaining)} color="green" icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
            <StatCard title={stats.totalOverdue>0?`⚠️ OVERDUE (${stats.overdueCount})`:'Overdue'} value={formatCurrency(stats.totalOverdue)} color={stats.totalOverdue>0?'red':'green'} icon={<span className="text-2xl">🚨</span>} />
            <StatCard title="Cheques" value={`${stats.activeCheques} Active / ${stats.totalCheques}`} color="blue" icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Expenses by Category</h3>{catChart.length>0?<PieChart data={catChart} size={200}/>:<p className="text-center text-gray-400 py-8">No expenses yet</p>}</Card>
            <Card className="p-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Monthly Trend</h3>{monthChart.length>0?<BarChart data={monthChart} height={200}/>:<p className="text-center text-gray-400 py-8">No data yet</p>}</Card>
          </div>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🕐 Recent Expenses</h3>
            {stats.recentExpenses.length===0?<p className="text-center text-gray-400 py-6">No expenses yet</p>:(
              <div className="space-y-2">{stats.recentExpenses.map((e,i)=>(
                <div key={e.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-[6px] border border-orange-100">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-6">{i+1}</span>
                    <div><p className="text-gray-800 font-medium text-sm">{e.description||e.category}</p><p className="text-gray-400 text-xs">{e.category} • {formatDate(e.expenseDate)}</p></div>
                  </div>
                  <span className="text-red-600 font-bold text-sm">{formatCurrency(e.amount)}</span>
                </div>
              ))}</div>
            )}
          </Card>
        </div>
      )}

      {/* ======== CHEQUES ======== */}
      {tab==='cheques'&&(
        <div className="space-y-6">
          <Card className="p-4"><Input placeholder="Search cheque number, company, bank..." value={search} onChange={e=>setSearch(e.target.value)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} /></Card>
          <Table columns={chqCols} data={filtered} keyField="id" onRowDoubleClick={openDetail} emptyMessage="No cheques yet" />
          <p className="text-sm text-gray-400">{filtered.length} cheques</p>
        </div>
      )}

      {/* ======== REPORTS ======== */}
      {tab==='reports'&&(
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📄 Expense Report by Date Range</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <Input label="From" type="date" value={reportStart} onChange={e=>setReportStart(e.target.value)} />
              <Input label="To" type="date" value={reportEnd} onChange={e=>setReportEnd(e.target.value)} />
              <Button onClick={generateReport}>🔍 Generate</Button>
              {reportData.length>0&&<><Button variant="secondary" onClick={exportReportCSV}>📊 CSV</Button><Button variant="secondary" onClick={exportReportPDF}>📄 PDF</Button></>}
            </div>
          </Card>
          {reportData.length>0&&(
            <Card className="p-6">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Results: {reportData.length} expenses</h3>
                <span className="text-lg font-bold text-red-600">Total: {formatCurrency(reportData.reduce((s,e)=>s+e.amount,0))}</span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">{reportData.map((e,i)=>(
                <div key={e.id} className="flex items-center justify-between p-3 bg-white rounded-[6px] border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-6">{i+1}</span>
                    {e.receiptImage&&<img src={e.receiptImage} alt="" className="w-10 h-10 rounded object-cover border"/>}
                    <div><p className="text-gray-800 font-medium text-sm">{e.description||e.category}</p><p className="text-gray-400 text-xs">{e.category} • {e.vendorName||'—'} • {formatDate(e.expenseDate)}</p></div>
                  </div>
                  <span className="text-red-600 font-bold">{formatCurrency(e.amount)}</span>
                </div>
              ))}</div>
            </Card>
          )}
        </div>
      )}

      {/* ======== ADD CHEQUE MODAL ======== */}
      <Modal isOpen={showAddCheque} onClose={()=>setShowAddCheque(false)} title="➕ Add Cheque" size="lg">
        <form onSubmit={handleAddCheque} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Cheque Number" value={chqForm.chequeNumber} onChange={e=>setChqForm({...chqForm,chequeNumber:e.target.value})} required />
            <Input label="Company Name" value={chqForm.companyName} onChange={e=>setChqForm({...chqForm,companyName:e.target.value})} required />
            <Input label="Amount (AED)" type="number" value={chqForm.chequeAmount||''} onChange={e=>setChqForm({...chqForm,chequeAmount:parseFloat(e.target.value)||0})} required />
            <Input label="Date" type="date" value={chqForm.chequeDate} onChange={e=>setChqForm({...chqForm,chequeDate:e.target.value})} required />
            <Input label="Bank" value={chqForm.bankName} onChange={e=>setChqForm({...chqForm,bankName:e.target.value})} />
            <Input label="Notes" value={chqForm.notes} onChange={e=>setChqForm({...chqForm,notes:e.target.value})} />
          </div>
          {chqForm.chequeAmount>0&&<div className="p-4 bg-emerald-50 rounded-[6px] border border-emerald-200 text-center"><p className="text-sm text-gray-500">Available Balance</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(chqForm.chequeAmount)}</p></div>}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200"><Button variant="secondary" type="button" onClick={()=>setShowAddCheque(false)}>Cancel</Button><Button type="submit" isLoading={busy}>💾 Save</Button></div>
        </form>
      </Modal>

      {/* ======== CHEQUE DETAIL MODAL ======== */}
      <Modal isOpen={showDetail} onClose={()=>setShowDetail(false)} title="📋 Cheque Details" size="xl">
        {selectedCheque&&(
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-orange-50 rounded-[6px] border border-orange-100 text-center"><p className="text-xs text-gray-500">Cheque No</p><p className="text-lg font-bold text-gray-800">{selectedCheque.chequeNumber}</p></div>
              <div className="p-3 bg-blue-50 rounded-[6px] border border-blue-100 text-center"><p className="text-xs text-gray-500">Total</p><p className="text-lg font-bold text-blue-700">{formatCurrency(selectedCheque.chequeAmount)}</p></div>
              <div className="p-3 bg-red-50 rounded-[6px] border border-red-100 text-center"><p className="text-xs text-gray-500">Spent</p><p className="text-lg font-bold text-red-600">{formatCurrency(selectedCheque.chequeAmount-selectedCheque.remainingBalance)}</p></div>
              <div className={`p-3 rounded-[6px] border text-center ${selectedCheque.remainingBalance>0?'bg-emerald-50 border-emerald-100':'bg-red-50 border-red-100'}`}><p className="text-xs text-gray-500">Balance</p><p className={`text-lg font-bold ${selectedCheque.remainingBalance>0?'text-emerald-600':'text-red-600'}`}>{formatCurrency(selectedCheque.remainingBalance)}</p></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-400 text-xs">Company</p><p className="text-gray-800 font-medium">{selectedCheque.companyName}</p></div>
              <div><p className="text-gray-400 text-xs">Bank</p><p className="text-gray-800">{selectedCheque.bankName||'-'}</p></div>
              <div><p className="text-gray-400 text-xs">Date</p><p className="text-gray-800">{formatDate(selectedCheque.chequeDate)}</p></div>
              <div><p className="text-gray-400 text-xs">Status</p><StatusBadge status={effStatus(selectedCheque)==='active'?'safe':'expired'} text={chqLabel(selectedCheque)}/></div>
            </div>

            {/* Progress */}
            <div>
              <div className="bg-gray-100 rounded-full h-4 overflow-hidden"><div className={`h-full rounded-full transition-all ${selectedCheque.remainingBalance>0?'bg-gradient-to-r from-orange-500 to-amber-500':'bg-red-500'}`} style={{width:`${Math.min(100,((selectedCheque.chequeAmount-selectedCheque.remainingBalance)/selectedCheque.chequeAmount)*100)}%`}} /></div>
              <p className="text-center text-xs text-gray-500 mt-1">{(((selectedCheque.chequeAmount-selectedCheque.remainingBalance)/selectedCheque.chequeAmount)*100).toFixed(1)}% used</p>
            </div>

            <div className="flex gap-3">
              {selectedCheque.status!=='cancelled'&&<Button onClick={()=>{setExpForm({...expForm,chequeId:selectedCheque.id});setShowAddExpense(true);}}>➕ Add Expense</Button>}
              <Button variant="danger" onClick={()=>setShowDelCheque(true)}>🗑️ Delete</Button>
            </div>

            {/* Expenses List */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">📋 Expenses ({chequeExpenses.length})</h4>
              {chequeExpenses.length===0?<div className="text-center py-6 text-gray-400 bg-gray-50 rounded-[6px]">No expenses yet</div>:(
                <div className="space-y-2 max-h-64 overflow-y-auto">{chequeExpenses.map((exp,i)=>(
                  <div key={exp.id} className="flex items-center justify-between p-3 bg-white rounded-[6px] border border-gray-100 hover:border-orange-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm w-6">{i+1}</span>
                      {exp.receiptImage&&<img src={exp.receiptImage} alt="" className="w-10 h-10 rounded-[6px] object-cover border cursor-pointer" onClick={()=>window.open(exp.receiptImage,'_blank')}/>}
                      <div><p className="text-gray-800 font-medium text-sm">{exp.description||exp.category}</p><p className="text-gray-400 text-xs">{exp.category} • {exp.vendorName||'—'} • {formatDate(exp.expenseDate)}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-600 font-bold">{formatCurrency(exp.amount)}</span>
                      <IconButton size="sm" onClick={()=>{setEditingExpense({...exp});setShowEditExpense(true);}} title="Edit"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></IconButton>
                      <IconButton size="sm" variant="danger" onClick={()=>{setDelExpId(exp.id);setShowDelExpense(true);}}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></IconButton>
                    </div>
                  </div>
                ))}</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ======== ADD EXPENSE MODAL ======== */}
      <Modal isOpen={showAddExpense} onClose={()=>setShowAddExpense(false)} title="➕ Add Expense" size="lg">
        <form onSubmit={handleAddExpense} className="space-y-4">
          {selectedCheque&&<div className={`p-3 rounded-[6px] border ${isOver(selectedCheque)?'bg-amber-50 border-amber-400':'bg-orange-50 border-orange-100'}`}><p className="text-sm text-gray-500">Cheque: <strong>{selectedCheque.chequeNumber} — {selectedCheque.companyName}</strong></p><p className="text-sm">Available: <strong className={selectedCheque.remainingBalance<0?'text-red-700':'text-emerald-600'}>{formatCurrency(selectedCheque.remainingBalance)}</strong></p>{note(selectedCheque)&&<p className="text-sm font-bold text-amber-800 mt-1">⚠️ {note(selectedCheque)}</p>}</div>}
          {!selectedCheque&&<Select label="Select Cheque" value={expForm.chequeId} onChange={e=>setExpForm({...expForm,chequeId:e.target.value})} options={chqOpts} required/>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Category" value={expForm.category} onChange={e=>setExpForm({...expForm,category:e.target.value})} options={catOpts} required/>
            <Input label="Amount (AED)" type="number" value={expForm.amount||''} onChange={e=>setExpForm({...expForm,amount:parseFloat(e.target.value)||0})} required/>
            <Input label="Date" type="date" value={expForm.expenseDate} onChange={e=>setExpForm({...expForm,expenseDate:e.target.value})} required/>
            <Input label="Vendor" value={expForm.vendorName} onChange={e=>setExpForm({...expForm,vendorName:e.target.value})}/>
            <Input label="Reference" value={expForm.referenceNo} onChange={e=>setExpForm({...expForm,referenceNo:e.target.value})}/>
            <Input label="Description" value={expForm.description} onChange={e=>setExpForm({...expForm,description:e.target.value})}/>
          </div>
          <ImageUpload label="📷 Receipt Image" value={expForm.receiptImage} onChange={b=>setExpForm({...expForm,receiptImage:b})} onClear={()=>setExpForm({...expForm,receiptImage:''})} previewSize="md"/>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200"><Button variant="secondary" type="button" onClick={()=>setShowAddExpense(false)}>Cancel</Button><Button type="submit" isLoading={busy}>💾 Save</Button></div>
        </form>
      </Modal>

      {/* ======== EDIT EXPENSE MODAL ======== */}
      <Modal isOpen={showEditExpense} onClose={()=>{setShowEditExpense(false);setEditingExpense(null);}} title="✏️ Edit Expense" size="lg">
        {editingExpense&&(
          <form onSubmit={handleEditExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Category" value={editingExpense.category} onChange={e=>setEditingExpense({...editingExpense,category:e.target.value})} options={catOpts} required/>
              <Input label="Amount (AED)" type="number" value={editingExpense.amount||''} onChange={e=>setEditingExpense({...editingExpense,amount:parseFloat(e.target.value)||0})} required/>
              <Input label="Date" type="date" value={editingExpense.expenseDate} onChange={e=>setEditingExpense({...editingExpense,expenseDate:e.target.value})} required/>
              <Input label="Vendor" value={editingExpense.vendorName} onChange={e=>setEditingExpense({...editingExpense,vendorName:e.target.value})}/>
              <Input label="Reference" value={editingExpense.referenceNo} onChange={e=>setEditingExpense({...editingExpense,referenceNo:e.target.value})}/>
              <Input label="Description" value={editingExpense.description} onChange={e=>setEditingExpense({...editingExpense,description:e.target.value})}/>
            </div>
            <ImageUpload label="📷 Receipt" value={editingExpense.receiptImage} onChange={b=>setEditingExpense({...editingExpense,receiptImage:b})} onClear={()=>setEditingExpense({...editingExpense,receiptImage:''})} previewSize="md"/>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200"><Button variant="secondary" type="button" onClick={()=>setShowEditExpense(false)}>Cancel</Button><Button type="submit" isLoading={busy}>💾 Update</Button></div>
          </form>
        )}
      </Modal>

      <ConfirmDialog isOpen={showDelCheque} onClose={()=>setShowDelCheque(false)} onConfirm={doDelCheque} title="🗑️ Delete Cheque" message={`Delete "${selectedCheque?.chequeNumber}"? All expenses will be deleted too.`} confirmText="Delete" variant="danger" isLoading={busy}/>
      <ConfirmDialog isOpen={showDelExpense} onClose={()=>setShowDelExpense(false)} onConfirm={doDelExpense} title="🗑️ Delete Expense" message="Delete this expense? Balance will be restored." confirmText="Delete" variant="danger" isLoading={busy}/>
      {toast&&<Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
};
