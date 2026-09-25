// ============================================
// Search/View Transactions - Like Search Employee
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card, StatCard } from '../components/UI/Card';
import { Button, IconButton } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Table, StatusBadge } from '../components/UI/Table';
import { Modal, ConfirmDialog, Toast } from '../components/UI/Modal';
import { PieChart, BarChart } from '../components/UI/Charts';
import { ImageUpload } from '../components/UI/ImageUpload';
import { formatDate, formatCurrency, exportToCSV, exportToPDF } from '../utils/helpers';
import {
  Cheque, Expense, EXPENSE_CATEGORIES,
  getAllCheques, deleteCheque,
  getExpensesByCheque, deleteExpense, updateExpense,
  getAccountingStats, getExpensesByDateRange,
} from '../database/accountingService';

interface Props { userId: string; }

export const SearchTransactionPage: React.FC<Props> = ({ userId: _u }) => {
  void _u;
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [selectedCheque, setSelectedCheque] = useState<Cheque|null>(null);
  const [chequeExps, setChequeExps] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'|'warning'|'info'}|null>(null);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [showDelCheque, setShowDelCheque] = useState(false);
  const [showDelExp, setShowDelExp] = useState(false);
  const [showEditExp, setShowEditExp] = useState(false);
  const [editExp, setEditExp] = useState<Expense|null>(null);
  const [delExpId, setDelExpId] = useState('');
  const [busy, setBusy] = useState(false);

  // Report
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [reportData, setReportData] = useState<Expense[]>([]);
  const [showReport, setShowReport] = useState(false);

  // Stats
  const [stats, setStats] = useState({ totalReceived:0, totalExpenses:0, totalRemaining:0, totalCheques:0, activeCheques:0, exhaustedCheques:0, categoryBreakdown:{} as Record<string,number>, monthlyExpenses:{} as Record<string,number>, recentExpenses:[] as Expense[], cheques:[] as Cheque[] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, s] = await Promise.all([getAllCheques(), getAccountingStats()]);
      setCheques(all.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
      setStats(s);
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{load();},[load]);

  const refreshCheque = async () => {
    const all = await getAllCheques();
    setCheques(all.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
    if(selectedCheque){ const u=all.find(c=>c.id===selectedCheque.id); if(u){setSelectedCheque(u);setChequeExps(await getExpensesByCheque(u.id));}}
    setStats(await getAccountingStats());
  };

  const filtered = cheques.filter(c=>{
    if(!search) return true;
    const q=search.toLowerCase();
    return c.chequeNumber.toLowerCase().includes(q)||c.companyName.toLowerCase().includes(q)||c.bankName.toLowerCase().includes(q);
  });

  const openDetail = async (c:Cheque) => { setSelectedCheque(c); setChequeExps(await getExpensesByCheque(c.id)); setShowDetail(true); };

  const doDelCheque = async () => {
    if(!selectedCheque) return; setBusy(true);
    try { await deleteCheque(selectedCheque.id); setToast({message:'Cheque deleted',type:'success'}); setShowDelCheque(false); setShowDetail(false); load(); }
    catch{setToast({message:'Failed',type:'error'});} finally{setBusy(false);}
  };

  const doDelExp = async () => {
    if(!delExpId) return; setBusy(true);
    try { await deleteExpense(delExpId); setToast({message:'Expense deleted, balance restored',type:'success'}); setShowDelExp(false); await refreshCheque(); }
    catch{setToast({message:'Failed',type:'error'});} finally{setBusy(false);}
  };

  const doEditExp = async (e:React.FormEvent) => {
    e.preventDefault(); if(!editExp) return; setBusy(true);
    try { await updateExpense(editExp.id, editExp); setToast({message:'Expense updated!',type:'success'}); setShowEditExp(false); setEditExp(null); await refreshCheque(); }
    catch(err:unknown){setToast({message:err instanceof Error?err.message:'Error',type:'error'});} finally{setBusy(false);}
  };

  const genReport = async () => {
    if(!reportStart||!reportEnd){setToast({message:'Select date range',type:'warning'});return;}
    setReportData(await getExpensesByDateRange(reportStart,reportEnd)); setShowReport(true);
  };

  const exportCSV = () => {
    const data = cheques.map((c,i)=>({'S.No':i+1,'Cheque No':c.chequeNumber,'Company':c.companyName,'Bank':c.bankName,'Amount':c.chequeAmount,'Spent':c.chequeAmount-c.remainingBalance,'Balance':c.remainingBalance,'Status':c.status,'Date':formatDate(c.chequeDate)}));
    exportToCSV(data,'QIS_Cheques'); setToast({message:'Exported',type:'success'});
  };

  const exportReportCSV = () => {
    const data = reportData.map((e,i)=>({'#':i+1,'Date':formatDate(e.expenseDate),'Category':e.category,'Description':e.description,'Vendor':e.vendorName,'Ref':e.referenceNo,'Amount':e.amount}));
    exportToCSV(data,'QIS_Expense_Report'); setToast({message:'Exported',type:'success'});
  };

  const exportReportPDF = () => {
    const total=reportData.reduce((s,e)=>s+e.amount,0);
    const rows=reportData.map((e,i)=>`<tr><td>${i+1}</td><td>${formatDate(e.expenseDate)}</td><td>${e.category}</td><td>${e.description}</td><td>${e.vendorName}</td><td>${formatCurrency(e.amount)}</td></tr>`).join('');
    exportToPDF(`<h2>Expense Report</h2><p>${formatDate(reportStart)} — ${formatDate(reportEnd)}</p><p>Total: ${formatCurrency(total)}</p><table><thead><tr><th>#</th><th>Date</th><th>Category</th><th>Description</th><th>Vendor</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>`,'QIS Report');
  };

  const catChart = Object.entries(stats.categoryBreakdown).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([l,v],i)=>({label:l,value:v,color:['#F97316','#3B82F6','#10B981','#EF4444','#8B5CF6','#EC4899'][i%6]}));
  const monthChart = Object.entries(stats.monthlyExpenses).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([l,v])=>({label:new Date(l+'-01').toLocaleDateString('en-US',{month:'short',year:'2-digit'}),value:v,color:'#F97316'}));
  const catOpts = EXPENSE_CATEGORIES.map(c=>({value:c,label:c}));

  const chqCols = [
    {key:'sno',header:'#',render:(_c:Cheque,i?:number)=><span className="text-orange-600 font-semibold">{(i??0)+1}</span>},
    {key:'chequeNumber',header:'Cheque No',render:(c:Cheque)=><span className="text-gray-800 font-mono font-medium">{c.chequeNumber}</span>},
    {key:'companyName',header:'Company',render:(c:Cheque)=><span className="text-gray-800 font-medium">{c.companyName}</span>},
    {key:'chequeAmount',header:'Amount',render:(c:Cheque)=><span className="text-gray-800 font-semibold">{formatCurrency(c.chequeAmount)}</span>},
    {key:'spent',header:'Spent',render:(c:Cheque)=><span className="text-red-600 font-medium">{formatCurrency(c.chequeAmount-c.remainingBalance)}</span>},
    {key:'remainingBalance',header:'Balance',render:(c:Cheque)=><span className={`font-bold ${c.remainingBalance>0?'text-emerald-600':'text-red-600'}`}>{formatCurrency(c.remainingBalance)}</span>},
    {key:'status',header:'Status',render:(c:Cheque)=><StatusBadge status={c.status==='active'?'safe':'expired'} text={c.status.toUpperCase()}/>},
    {key:'chequeDate',header:'Date',render:(c:Cheque)=><span className="text-gray-500 text-sm">{formatDate(c.chequeDate)}</span>},
    {key:'act',header:'⚙️',render:(c:Cheque)=>(<IconButton size="sm" onClick={()=>openDetail(c)} title="View"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></IconButton>)},
  ];

  if(loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"/></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-gray-800">💰 Accounts & Expenses</h1><p className="text-orange-600 mt-1">Queen International School — View All Transactions</p></div>
        <div className="flex gap-3"><Button variant="secondary" onClick={exportCSV}>📊 Export CSV</Button></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Received" value={formatCurrency(stats.totalReceived)} color="orange" icon={<span className="text-2xl">📥</span>}/>
        <StatCard title="Total Expenses" value={formatCurrency(stats.totalExpenses)} color="red" icon={<span className="text-2xl">📤</span>}/>
        <StatCard title="Remaining" value={formatCurrency(stats.totalRemaining)} color="green" icon={<span className="text-2xl">💰</span>}/>
        <StatCard title="Cheques" value={`${stats.activeCheques} / ${stats.totalCheques}`} color="blue" icon={<span className="text-2xl">📝</span>}/>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">📊 By Category</h3>{catChart.length>0?<PieChart data={catChart} size={180}/>:<p className="text-center text-gray-400 py-6">No data</p>}</Card>
        <Card className="p-6"><h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Monthly Trend</h3>{monthChart.length>0?<BarChart data={monthChart} height={180}/>:<p className="text-center text-gray-400 py-6">No data</p>}</Card>
      </div>

      {/* Date Range Report */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <Input label="From" type="date" value={reportStart} onChange={e=>setReportStart(e.target.value)}/>
          <Input label="To" type="date" value={reportEnd} onChange={e=>setReportEnd(e.target.value)}/>
          <Button onClick={genReport}>🔍 Report</Button>
          {reportData.length>0&&<><Button variant="secondary" onClick={exportReportCSV}>📊 CSV</Button><Button variant="secondary" onClick={exportReportPDF}>📄 PDF</Button></>}
        </div>
      </Card>

      {showReport&&reportData.length>0&&(
        <Card className="p-6">
          <div className="flex justify-between mb-4"><h3 className="font-semibold text-gray-800">{reportData.length} expenses found</h3><span className="font-bold text-red-600">Total: {formatCurrency(reportData.reduce((s,e)=>s+e.amount,0))}</span></div>
          <div className="space-y-2 max-h-64 overflow-y-auto">{reportData.map((e,i)=>(
            <div key={e.id} className="flex items-center justify-between p-3 bg-white rounded-[6px] border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-6">{i+1}</span>
                {e.receiptImage&&<img src={e.receiptImage} alt="" className="w-10 h-10 rounded object-cover border cursor-pointer" onClick={()=>window.open(e.receiptImage,'_blank')}/>}
                <div><p className="text-gray-800 font-medium text-sm">{e.description||e.category}</p><p className="text-gray-400 text-xs">{e.category} • {e.vendorName||'—'} • {formatDate(e.expenseDate)}</p></div>
              </div>
              <span className="text-red-600 font-bold">{formatCurrency(e.amount)}</span>
            </div>
          ))}</div>
        </Card>
      )}

      {/* Search & Cheques Table */}
      <Card className="p-4"><Input placeholder="Search cheque number, company, bank..." value={search} onChange={e=>setSearch(e.target.value)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}/></Card>
      <Table columns={chqCols} data={filtered} keyField="id" onRowDoubleClick={openDetail} emptyMessage="No cheques yet"/>
      <p className="text-sm text-gray-400">{filtered.length} cheques</p>

      {/* ======== CHEQUE DETAIL ======== */}
      <Modal isOpen={showDetail} onClose={()=>setShowDetail(false)} title="📋 Cheque Details & Expenses" size="xl">
        {selectedCheque&&(
          <div className="space-y-6">
            {/* Cheque Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-orange-50 rounded-[6px] border border-orange-100 text-center"><p className="text-xs text-gray-500">Cheque No</p><p className="text-lg font-bold text-gray-800">{selectedCheque.chequeNumber}</p></div>
              <div className="p-3 bg-blue-50 rounded-[6px] border border-blue-100 text-center"><p className="text-xs text-gray-500">Total</p><p className="text-lg font-bold text-blue-700">{formatCurrency(selectedCheque.chequeAmount)}</p></div>
              <div className="p-3 bg-red-50 rounded-[6px] border border-red-100 text-center"><p className="text-xs text-gray-500">Spent</p><p className="text-lg font-bold text-red-600">{formatCurrency(selectedCheque.chequeAmount-selectedCheque.remainingBalance)}</p></div>
              <div className={`p-3 rounded-[6px] border text-center ${selectedCheque.remainingBalance>0?'bg-emerald-50 border-emerald-100':'bg-red-50 border-red-100'}`}><p className="text-xs text-gray-500">Balance</p><p className={`text-lg font-bold ${selectedCheque.remainingBalance>0?'text-emerald-600':'text-red-600'}`}>{formatCurrency(selectedCheque.remainingBalance)}</p></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-400 text-xs">Company</p><p className="text-gray-800 font-medium">{selectedCheque.companyName}</p></div>
              <div><p className="text-gray-400 text-xs">Bank</p><p className="text-gray-800">{selectedCheque.bankName||'-'}</p></div>
              <div><p className="text-gray-400 text-xs">Date</p><p className="text-gray-800">{formatDate(selectedCheque.chequeDate)}</p></div>
            </div>

            {/* Progress */}
            <div className="bg-gray-100 rounded-full h-4 overflow-hidden"><div className={`h-full rounded-full ${selectedCheque.remainingBalance>0?'bg-gradient-to-r from-orange-500 to-amber-500':'bg-red-500'}`} style={{width:`${Math.min(100,((selectedCheque.chequeAmount-selectedCheque.remainingBalance)/selectedCheque.chequeAmount)*100)}%`}}/></div>
            <p className="text-center text-xs text-gray-500">{(((selectedCheque.chequeAmount-selectedCheque.remainingBalance)/selectedCheque.chequeAmount)*100).toFixed(1)}% used</p>

            <Button variant="danger" onClick={()=>setShowDelCheque(true)}>🗑️ Delete Cheque</Button>

            {/* Expenses with Receipt Images */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">📋 Expenses ({chequeExps.length})</h4>
              {chequeExps.length===0?<div className="text-center py-6 text-gray-400 bg-gray-50 rounded-[6px]">No expenses recorded yet</div>:(
                <div className="space-y-3 max-h-80 overflow-y-auto">{chequeExps.map((exp,i)=>(
                  <div key={exp.id} className="p-4 bg-white rounded-[6px] border border-gray-100 hover:border-orange-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <span className="text-gray-400 font-medium w-6 pt-1">{i+1}</span>
                        <div className="flex-1">
                          <p className="text-gray-800 font-semibold">{exp.description||exp.category}</p>
                          <p className="text-gray-500 text-sm mt-1">{exp.category} • {exp.vendorName||'No vendor'} • {formatDate(exp.expenseDate)}</p>
                          {exp.referenceNo&&<p className="text-gray-400 text-xs mt-1">Ref: {exp.referenceNo}</p>}
                          
                          {/* Receipt Image Display */}
                          {exp.receiptImage&&(
                            <div className="mt-3">
                              <p className="text-xs text-gray-400 mb-1">📷 Receipt:</p>
                              <img src={exp.receiptImage} alt="Receipt" className="max-w-[300px] h-auto max-h-[200px] rounded-[6px] border-2 border-orange-200 object-contain bg-orange-50 cursor-pointer hover:opacity-90" onClick={()=>window.open(exp.receiptImage,'_blank')}/>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-red-600 font-bold text-lg">{formatCurrency(exp.amount)}</span>
                        <div className="flex flex-col gap-1">
                          <IconButton size="sm" onClick={()=>{setEditExp({...exp});setShowEditExp(true);}} title="Edit"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></IconButton>
                          <IconButton size="sm" variant="danger" onClick={()=>{setDelExpId(exp.id);setShowDelExp(true);}}><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></IconButton>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Expense */}
      <Modal isOpen={showEditExp} onClose={()=>{setShowEditExp(false);setEditExp(null);}} title="✏️ Edit Expense" size="lg">
        {editExp&&(
          <form onSubmit={doEditExp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Category" value={editExp.category} onChange={e=>setEditExp({...editExp,category:e.target.value})} options={catOpts} required/>
              <Input label="Amount (AED)" type="number" value={editExp.amount||''} onChange={e=>setEditExp({...editExp,amount:parseFloat(e.target.value)||0})} required/>
              <Input label="Date" type="date" value={editExp.expenseDate} onChange={e=>setEditExp({...editExp,expenseDate:e.target.value})} required/>
              <Input label="Vendor" value={editExp.vendorName} onChange={e=>setEditExp({...editExp,vendorName:e.target.value})}/>
              <Input label="Reference" value={editExp.referenceNo} onChange={e=>setEditExp({...editExp,referenceNo:e.target.value})}/>
              <Input label="Description" value={editExp.description} onChange={e=>setEditExp({...editExp,description:e.target.value})}/>
            </div>
            <ImageUpload label="📷 Receipt" value={editExp.receiptImage} onChange={b=>setEditExp({...editExp,receiptImage:b})} onClear={()=>setEditExp({...editExp,receiptImage:''})} previewSize="md"/>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200"><Button variant="secondary" type="button" onClick={()=>setShowEditExp(false)}>Cancel</Button><Button type="submit" isLoading={busy}>💾 Update</Button></div>
          </form>
        )}
      </Modal>

      <ConfirmDialog isOpen={showDelCheque} onClose={()=>setShowDelCheque(false)} onConfirm={doDelCheque} title="🗑️ Delete Cheque" message={`Delete "${selectedCheque?.chequeNumber}"? All expenses deleted too.`} confirmText="Delete" variant="danger" isLoading={busy}/>
      <ConfirmDialog isOpen={showDelExp} onClose={()=>setShowDelExp(false)} onConfirm={doDelExp} title="🗑️ Delete Expense" message="Delete this expense? Balance restored." confirmText="Delete" variant="danger" isLoading={busy}/>
      {toast&&<Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
};
