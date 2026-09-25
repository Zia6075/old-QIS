// ============================================
// Add Transaction Page - Like Add Employee
// ============================================

import React, { useState, useEffect } from 'react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { ImageUpload } from '../components/UI/ImageUpload';
import { Toast } from '../components/UI/Modal';
import { formatCurrency, formatNumber } from '../utils/helpers';
import { createCheque, createExpense, getAllCheques, Cheque, EXPENSE_CATEGORIES } from '../database/accountingService';

interface Props { userId: string; }

export const AddTransactionPage: React.FC<Props> = ({ userId: _u }) => {
  void _u;
  const [mode, setMode] = useState<'cheque'|'expense'>('cheque');
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);
  const [busy, setBusy] = useState(false);

  // Cheque Form
  const [chq, setChq] = useState({
    chequeNumber:'', companyName:'', chequeAmount:0, chequeDate:'', bankName:'', notes:'', chequeImage:'',
  });

  // Expense Form
  const [exp, setExp] = useState({
    chequeId:'', amount:0, category:'', description:'', receiptImage:'', expenseDate:'', vendorName:'', referenceNo:'', paymentFor:'',
  });

  const [selectedChequeBalance, setSelectedChequeBalance] = useState(0);

  useEffect(() => { getAllCheques().then(c => setCheques(c.filter(x=>x.status==='active'))); }, []);

  // When cheque selected, show balance
  useEffect(() => {
    const c = cheques.find(x => x.id === exp.chequeId);
    setSelectedChequeBalance(c ? c.remainingBalance : 0);
  }, [exp.chequeId, cheques]);

  const handleAddCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chq.chequeNumber || !chq.companyName || !chq.chequeAmount || !chq.chequeDate) {
      setToast({ message: 'Please fill all required fields', type: 'error' }); return;
    }
    setBusy(true);
    try {
      await createCheque({ companyName: chq.companyName, chequeNumber: chq.chequeNumber, chequeAmount: chq.chequeAmount, chequeDate: chq.chequeDate, bankName: chq.bankName, notes: chq.notes + (chq.chequeImage ? '\n[CHEQUE_IMAGE]' : '') });
      setToast({ message: '✅ Cheque added successfully!', type: 'success' });
      setChq({ chequeNumber:'', companyName:'', chequeAmount:0, chequeDate:'', bankName:'', notes:'', chequeImage:'' });
      // Reload cheques for expense dropdown
      const updated = await getAllCheques();
      setCheques(updated.filter(x=>x.status==='active'));
    } catch (err: unknown) { setToast({ message: err instanceof Error ? err.message : 'Error', type: 'error' }); }
    finally { setBusy(false); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exp.chequeId || !exp.amount || !exp.category || !exp.expenseDate) {
      setToast({ message: 'Please fill all required fields', type: 'error' }); return;
    }
    setBusy(true);
    try {
      await createExpense({
        chequeId: exp.chequeId, amount: exp.amount, category: exp.category,
        description: exp.paymentFor || exp.description, receiptImage: exp.receiptImage,
        expenseDate: exp.expenseDate, vendorName: exp.vendorName, referenceNo: exp.referenceNo,
      });
      setToast({ message: '✅ Expense added! Balance updated.', type: 'success' });
      setExp({ chequeId: exp.chequeId, amount:0, category:'', description:'', receiptImage:'', expenseDate:'', vendorName:'', referenceNo:'', paymentFor:'' });
      // Reload cheques
      const updated = await getAllCheques();
      setCheques(updated.filter(x=>x.status==='active'));
    } catch (err: unknown) { setToast({ message: err instanceof Error ? err.message : 'Error', type: 'error' }); }
    finally { setBusy(false); }
  };

  const resetForm = () => {
    if (mode === 'cheque') setChq({ chequeNumber:'', companyName:'', chequeAmount:0, chequeDate:'', bankName:'', notes:'', chequeImage:'' });
    else setExp({ chequeId:'', amount:0, category:'', description:'', receiptImage:'', expenseDate:'', vendorName:'', referenceNo:'', paymentFor:'' });
  };

  const catOpts = EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }));
  const chqOpts = cheques.filter(c => c.chequeNumber).map(c => ({ value: c.id, label: `${c.chequeNumber} — ${c.companyName||'(no company)'} (Bal: AED ${formatNumber(c.remainingBalance)})` }));

  return (
    <div className="p-6 bg-gradient-to-br from-orange-50/50 to-amber-50/50 ">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">💰 Add Transaction</h1>
        <p className="text-orange-600 mt-1">Queen International School — Record Cheque or Expense</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 bg-white rounded-[6px] p-1 border border-orange-100 w-fit mb-6">
        <button onClick={() => setMode('cheque')} className={`px-6 py-3 rounded-[6px] text-sm font-semibold transition-all ${mode === 'cheque' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' : 'text-gray-600 hover:bg-orange-50'}`}>
          📝 Add Cheque
        </button>
        <button onClick={() => setMode('expense')} className={`px-6 py-3 rounded-[6px] text-sm font-semibold transition-all ${mode === 'expense' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' : 'text-gray-600 hover:bg-orange-50'}`}>
          💸 Add Expense
        </button>
      </div>

      {/* ======== ADD CHEQUE ======== */}
      {mode === 'cheque' && (
        <form onSubmit={handleAddCheque}>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Image Column */}
            <Card className="p-6 xl:col-span-1">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">📷 Cheque Image</h2>
              <ImageUpload label="Upload Cheque Photo" value={chq.chequeImage} onChange={b => setChq({ ...chq, chequeImage: b })} onClear={() => setChq({ ...chq, chequeImage: '' })} previewSize="lg" />
            </Card>

            {/* Form */}
            <Card className="p-6 xl:col-span-3">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">📝 Cheque Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Cheque Number" value={chq.chequeNumber} onChange={e => setChq({ ...chq, chequeNumber: e.target.value })} placeholder="CHQ-001" required />
                <Input label="Company / Issued By" value={chq.companyName} onChange={e => setChq({ ...chq, companyName: e.target.value })} placeholder="Company name" required />
                <Input label="Cheque Amount (AED)" type="number" value={chq.chequeAmount || ''} onChange={e => setChq({ ...chq, chequeAmount: parseFloat(e.target.value) || 0 })} placeholder="0" required />
                <Input label="Cheque Date" type="date" value={chq.chequeDate} onChange={e => setChq({ ...chq, chequeDate: e.target.value })} required />
                <Input label="Bank Name" value={chq.bankName} onChange={e => setChq({ ...chq, bankName: e.target.value })} placeholder="Bank name" />
                <Input label="Notes / Description" value={chq.notes} onChange={e => setChq({ ...chq, notes: e.target.value })} placeholder="Any notes..." />
              </div>

              {/* Balance Preview */}
              {chq.chequeAmount > 0 && (
                <div className="mt-6 p-4 bg-emerald-50 rounded-[6px] border border-emerald-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Cheque Amount</p>
                      <p className="text-xl font-bold text-gray-800">{formatCurrency(chq.chequeAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Used</p>
                      <p className="text-xl font-bold text-red-500">{formatCurrency(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Remaining Balance</p>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(chq.chequeAmount)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <Button type="button" variant="secondary" onClick={resetForm}>Reset</Button>
                <Button type="submit" isLoading={busy}>💾 Save Cheque</Button>
              </div>
            </Card>
          </div>
        </form>
      )}

      {/* ======== ADD EXPENSE ======== */}
      {mode === 'expense' && (
        <form onSubmit={handleAddExpense}>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Image Column */}
            <Card className="p-6 xl:col-span-1">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">📷 Receipt Image</h2>
              <ImageUpload label="Upload Receipt / Invoice" value={exp.receiptImage} onChange={b => setExp({ ...exp, receiptImage: b })} onClear={() => setExp({ ...exp, receiptImage: '' })} previewSize="lg" />
            </Card>

            {/* Form */}
            <Card className="p-6 xl:col-span-3">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">💸 Expense Details</h2>

              {/* Select Cheque */}
              <div className="mb-6">
                <Select label="Select Cheque (Deduct From)" value={exp.chequeId} onChange={e => setExp({ ...exp, chequeId: e.target.value })} options={chqOpts} required />
              </div>

              {/* Balance Display */}
              {exp.chequeId && (
                <div className="mb-6 p-4 bg-orange-50 rounded-[6px] border border-orange-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Available Balance</p>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(selectedChequeBalance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">This Expense</p>
                      <p className="text-xl font-bold text-red-500">{formatCurrency(exp.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">After Deduction</p>
                      <p className={`text-xl font-bold ${selectedChequeBalance - exp.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.max(0, selectedChequeBalance - exp.amount))}
                      </p>
                    </div>
                  </div>
                  {exp.amount > selectedChequeBalance && (
                    <p className="text-red-600 text-sm text-center mt-2 font-medium">⚠️ Amount exceeds available balance!</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Payment For (Purpose)" value={exp.paymentFor} onChange={e => setExp({ ...exp, paymentFor: e.target.value })} placeholder="What is this payment for?" required />
                <Select label="Category" value={exp.category} onChange={e => setExp({ ...exp, category: e.target.value })} options={catOpts} required />
                <Input label="Amount (AED)" type="number" value={exp.amount || ''} onChange={e => setExp({ ...exp, amount: parseFloat(e.target.value) || 0 })} placeholder="0" required />
                <Input label="Expense Date" type="date" value={exp.expenseDate} onChange={e => setExp({ ...exp, expenseDate: e.target.value })} required />
                <Input label="Vendor / Paid To" value={exp.vendorName} onChange={e => setExp({ ...exp, vendorName: e.target.value })} placeholder="Who was paid?" />
                <Input label="Invoice / Reference No" value={exp.referenceNo} onChange={e => setExp({ ...exp, referenceNo: e.target.value })} placeholder="Invoice number" />
                <Input label="Additional Notes" value={exp.description} onChange={e => setExp({ ...exp, description: e.target.value })} placeholder="Any extra details..." />
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <Button type="button" variant="secondary" onClick={resetForm}>Reset</Button>
                <Button type="submit" isLoading={busy}>💾 Save Expense</Button>
              </div>
            </Card>
          </div>
        </form>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
