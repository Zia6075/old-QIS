// ============================================
// Search Employee Page - Modern Light Professional Theme
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/UI/Card';
import { Button, IconButton } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Table, StatusBadge } from '../components/UI/Table';
import { Modal, ConfirmDialog, Toast } from '../components/UI/Modal';
import { Employee } from '../types';
import { useEmployees, } from '../hooks/useEmployees';
import { getEmployeeMedia } from '../database/employeeService';
import { logActivity, ACTIVITY_ACTIONS } from '../database/activityService';
import { calculateDaysLeft, getAlertStatus, formatDate, exportToCSV, exportToPDF, NATIONALITIES, JOB_TITLES, SPONSORS, formatCurrency, transliterateToArabic } from '../utils/helpers';
import { ImageUpload } from '../components/UI/ImageUpload';
import { ImageModal } from '../components/UI/ImageModal';
import { canWrite } from '../utils/platform';

interface SearchEmployeePageProps {
  userId: string;
  isAdmin: boolean;
}

export const SearchEmployeePage: React.FC<SearchEmployeePageProps> = ({ userId, isAdmin }) => {
  const { employees, loading, removeEmployee, editEmployee, loadEmployees } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'passport' | 'contact' | 'nationality' | 'emirateId'>('all');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);   // ⭐ images load ho rahi hain
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Employee>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Image Preview State
  const [previewImg, setPreviewImg] = useState<{ src: string; title: string } | null>(null);

  const filterEmployees = useCallback((query: string, field: typeof searchField) => {
    if (!query.trim()) {
      setFilteredEmployees(employees);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = employees.filter(emp => {
      switch (field) {
        case 'name': return emp.fullName.toLowerCase().includes(lowerQuery) || emp.arabicName.includes(query);
        case 'passport': return emp.passportNumber.toLowerCase().includes(lowerQuery);
        case 'contact': return emp.contactNumber.includes(query);
        case 'nationality': return emp.nationality.toLowerCase().includes(lowerQuery);
        case 'emirateId': return emp.emirateId?.toLowerCase().includes(lowerQuery);
        default: return (
          emp.fullName.toLowerCase().includes(lowerQuery) ||
          emp.arabicName.includes(query) ||
          emp.passportNumber.toLowerCase().includes(lowerQuery) ||
          emp.contactNumber.includes(query) ||
          emp.nationality.toLowerCase().includes(lowerQuery) ||
          emp.employeeCode.toLowerCase().includes(lowerQuery) ||
          (emp.emirateId && emp.emirateId.toLowerCase().includes(lowerQuery))
        );
      }
    });
    setFilteredEmployees(filtered);
  }, [employees]);

  useEffect(() => { setFilteredEmployees(employees); }, [employees]);

  useEffect(() => {
    const timer = setTimeout(() => { filterEmployees(searchQuery, searchField); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchField, filterEmployees]);

  useEffect(() => {
    if (editFormData.basicSalary !== undefined || editFormData.otherAllowance !== undefined) {
      const basic = editFormData.basicSalary || 0;
      const other = editFormData.otherAllowance || 0;
      setEditFormData(prev => ({ ...prev, totalSalary: basic + other }));
    }
  }, [editFormData.basicSalary, editFormData.otherAllowance]);

  // Auto Arabic name in edit
  useEffect(() => {
    if (editFormData.fullName && !editFormData.arabicName) {
      setEditFormData(prev => ({ ...prev, arabicName: transliterateToArabic(editFormData.fullName || '') }));
    }
  }, [editFormData.fullName]);

  const handleViewDetails = async (employee: Employee) => {
    // ⭐ pehle record (chhota) dikhao, images baad mein lao — list fast rehti hai
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
    logActivity(userId, ACTIVITY_ACTIONS.VIEW_EMPLOYEE, `Viewed: ${employee.fullName}`);
    try {
      const media = await getEmployeeMedia(employee.id);
      if (media) setSelectedEmployee(prev => (prev && prev.id === employee.id ? { ...prev, ...media } : prev));
    } catch (e) { console.warn('media load fail:', e); }
  };

  const handleEdit = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditFormData(employee);
    setShowEditModal(true);
    // ⭐ images alag media node mein hain — edit form mein bhi lao,
    // warna save karne par purani images mit jatin
    setMediaLoading(true);
    try {
      const media = await getEmployeeMedia(employee.id);
      if (media) setEditFormData(prev => (prev && prev.id === employee.id ? { ...prev, ...media } : prev));
    } catch (e) {
      console.warn('media load fail:', e);
      setToast({ message: `⚠️ Images load nahi huin (${e instanceof Error ? e.message : e}) — save karne se pehle dobara koshish karein, warna photos mit sakti hain`, type: 'error' });
    } finally {
      setMediaLoading(false);
    }
  };

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedEmployee) return;
    setIsDeleting(true);
    try {
      await removeEmployee(selectedEmployee.id);
      await logActivity(userId, ACTIVITY_ACTIONS.DELETE_EMPLOYEE, `Deleted: ${selectedEmployee.fullName}`);
      setToast({ message: 'Employee deleted', type: 'success' });
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
    } catch { setToast({ message: 'Delete failed', type: 'error' }); }
    finally { setIsDeleting(false); }
  };

  const saveEdit = async () => {
    if (!selectedEmployee || !editFormData) return;
    setIsSaving(true);
    try {
      await editEmployee(selectedEmployee.id, editFormData);
      await logActivity(userId, ACTIVITY_ACTIONS.UPDATE_EMPLOYEE, `Updated: ${editFormData.fullName}`);
      setToast({ message: 'Employee updated', type: 'success' });
      setShowEditModal(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch { setToast({ message: 'Update failed', type: 'error' }); }
    finally { setIsSaving(false); }
  };

  const handleExportCSV = () => {
    const data = filteredEmployees.map((emp, index) => ({
      'S.No': index + 1,
      'Name': emp.fullName,
      'Arabic': emp.arabicName,
      'Title': emp.title,
      'Nationality': emp.nationality,
      'Contact': emp.contactNumber,
      'Emirates ID': emp.emirateId,
      'Passport': emp.passportNumber,
      'Passport Expiry': formatDate(emp.passportExpiryDate),
      'Passport Days': calculateDaysLeft(emp.passportExpiryDate),
      'Visa Expiry': formatDate(emp.visaExpiryDate),
      'Visa Days': calculateDaysLeft(emp.visaExpiryDate),
      'Labour Expiry': formatDate(emp.labourExpiry),
      'Labour Days': emp.labourExpiry ? calculateDaysLeft(emp.labourExpiry) : 'N/A',
      'RTA Expiry': formatDate(emp.rtaExpiry),
      'Sponsor': emp.sponsor,
      'Licence': emp.licenceNo,
      'Basic': emp.basicSalary,
      'Allowance': emp.otherAllowance,
      'Total': emp.totalSalary,
    }));
    exportToCSV(data, 'QIS_Employees');
    logActivity(userId, ACTIVITY_ACTIONS.EXPORT_REPORT, 'Exported CSV');
    setToast({ message: 'CSV exported', type: 'success' });
  };

  const handleExportPDF = () => {
    const rows = filteredEmployees.map(emp => `
      <tr>
        <td>${emp.employeeCode}</td><td>${emp.fullName}</td><td>${emp.title}</td>
        <td>${emp.passportNumber}</td>
        <td class="${getAlertStatus(calculateDaysLeft(emp.passportExpiryDate))}">${formatDate(emp.passportExpiryDate)} (${calculateDaysLeft(emp.passportExpiryDate)}d)</td>
        <td class="${getAlertStatus(calculateDaysLeft(emp.visaExpiryDate))}">${formatDate(emp.visaExpiryDate)} (${calculateDaysLeft(emp.visaExpiryDate)}d)</td>
        <td>${formatCurrency(emp.totalSalary || 0)}</td>
      </tr>`).join('');
    exportToPDF(`<h2>Employee Report</h2><p>Generated: ${new Date().toLocaleString()}</p><p>Total: ${filteredEmployees.length}</p>
      <table><thead><tr><th>Code</th><th>Name</th><th>Title</th><th>Passport</th><th>Pass Exp</th><th>Visa Exp</th><th>Salary</th></tr></thead><tbody>${rows}</tbody></table>`, 'QIS Report');
    logActivity(userId, ACTIVITY_ACTIONS.EXPORT_REPORT, 'Exported PDF');
  };

  const columns = [
    { key: 'serialNo', header: 'S.No', render: (e: Employee & { serialNo?: number }) => <span className="text-slate-400 font-bold">{(e.serialNo ?? 1)}</span> },
    { key: 'personImagePath', header: 'Photo', render: (e: Employee) => (
      (e.personThumb || e.personImagePath) ? (
        <img src={e.personThumb || e.personImagePath} alt="" loading="lazy" decoding="async" className="w-10 h-10 rounded-[6px] object-cover border border-slate-200 bg-slate-50" />
      ) : (
        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-[6px] flex items-center justify-center text-indigo-600 font-bold text-sm">{e.fullName.charAt(0)}</div>
      )
    )},
    { key: 'fullName', header: 'Name', render: (e: Employee) => (
      <div><p className="text-slate-800 font-bold text-sm leading-snug">{e.fullName}</p><p className="text-slate-400 font-semibold text-xs mt-0.5">{e.title}</p></div>
    )},
    { key: 'arabicName', header: 'اسم', render: (e: Employee) => <span className="text-slate-500 font-semibold text-sm" dir="rtl">{e.arabicName || '-'}</span> },
    { key: 'passportNumber', header: 'Passport', render: (e: Employee) => <span className="text-slate-700 font-mono text-xs font-bold tracking-normal">{e.passportNumber || '-'}</span> },
    { key: 'passportExpiryDate', header: 'Pass Exp', render: (e: Employee) => {
      if (!e.passportExpiryDate) return <span className="text-slate-400">-</span>;
      const d = calculateDaysLeft(e.passportExpiryDate); const s = getAlertStatus(d);
      return <div><p className="text-slate-500 text-xs font-semibold">{formatDate(e.passportExpiryDate)}</p><StatusBadge status={s} text={d < 0 ? 'Exp' : `${d}d`} /></div>;
    }},
    { key: 'visaExpiryDate', header: 'Visa Exp', render: (e: Employee) => {
      if (!e.visaExpiryDate) return <span className="text-slate-400">-</span>;
      const d = calculateDaysLeft(e.visaExpiryDate); const s = getAlertStatus(d);
      return <div><p className="text-slate-500 text-xs font-semibold">{formatDate(e.visaExpiryDate)}</p><StatusBadge status={s} text={d < 0 ? 'Exp' : `${d}d`} /></div>;
    }},
    { key: 'labourExpiry', header: 'Labour Exp', render: (e: Employee) => {
      if (!e.labourExpiry) return <span className="text-slate-400">-</span>;
      const d = calculateDaysLeft(e.labourExpiry); const s = getAlertStatus(d);
      return <div><p className="text-slate-500 text-xs font-semibold">{formatDate(e.labourExpiry)}</p><StatusBadge status={s} text={d < 0 ? 'Exp' : `${d}d`} /></div>;
    }},
    { key: 'totalSalary', header: 'Salary', render: (e: Employee) => <span className="text-slate-700 font-bold text-sm">{formatCurrency(e.totalSalary || 0)}</span> },
    { key: 'actions', header: '⚙️', render: (e: Employee) => (
      <div className="flex items-center gap-1">
        <IconButton size="sm" onClick={() => handleViewDetails(e)} title="View"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></IconButton>
        {canWrite() && <IconButton size="sm" onClick={() => handleEdit(e)} title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></IconButton>}
        {isAdmin && canWrite() && <IconButton size="sm" variant="danger" onClick={() => handleDelete(e)} title="Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></IconButton>}
      </div>
    )},
  ];

  const nationalityOptions = NATIONALITIES.map(n => ({ value: n, label: n }));
  const titleOptions = JOB_TITLES.map(t => ({ value: t, label: t }));
  const sponsorOptions = SPONSORS.map(s => ({ value: s, label: s }));
  const tableData = filteredEmployees.map((employee, index) => ({
    ...employee,
    serialNo: index + 1,
  }));

  return (
    <div className="p-6 space-y-8 ">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-normal">Search Employees</h1>
          <p className="text-slate-400 font-bold text-sm mt-1">Queen International School — Employee Registry Database</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleExportCSV}>📊 Export CSV</Button>
          <Button variant="secondary" onClick={handleExportPDF}>📄 Export PDF</Button>
        </div>
      </div>

      <Card className="p-5 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="Search by name, passport, Emirates ID, code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
          </div>
          <div className="w-48">
            <Select value={searchField} onChange={(e) => setSearchField(e.target.value as typeof searchField)} options={[{ value: 'all', label: 'All Fields' },{ value: 'name', label: 'Name' },{ value: 'passport', label: 'Passport' },{ value: 'contact', label: 'Contact' },{ value: 'nationality', label: 'Nationality' },{ value: 'emirateId', label: 'Emirates ID' }]} />
          </div>
        </div>
      </Card>

      <Table columns={columns} data={tableData} keyField="id" onRowDoubleClick={handleViewDetails} isLoading={loading} emptyMessage="No employees found" />

      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Showing {filteredEmployees.length} of {employees.length} employees</div>

      {/* Details Modal */}
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Employee Details Profile" size="xl">
        {selectedEmployee && (
          <div className="space-y-6">
            <div className="flex items-start gap-6 pb-6 border-b border-slate-100">
              {selectedEmployee.personImagePath ? (
                <img src={selectedEmployee.personImagePath} alt="" style={{ width: '110px', height: '110px' }} className="rounded-[6px] border border-slate-200 shadow-sm object-cover" onClick={() => selectedEmployee.personImagePath && setPreviewImg({ src: selectedEmployee.personImagePath, title: selectedEmployee.fullName })} />
              ) : (
                <div style={{ width: '110px', height: '110px' }} className="bg-indigo-50 border border-indigo-100 rounded-[6px] flex items-center justify-center text-indigo-600 text-4xl font-bold shadow-sm">{selectedEmployee.fullName.charAt(0)}</div>
              )}
              <div>
                <h3 className="text-2xl font-bold text-slate-800 tracking-normal">{selectedEmployee.fullName}</h3>
                <p className="text-base font-bold text-slate-500 mt-0.5" dir="rtl">{selectedEmployee.arabicName}</p>
                <p className="text-indigo-600 font-mono font-bold text-sm mt-1">{selectedEmployee.employeeCode}</p>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{selectedEmployee.title} • {selectedEmployee.nationality}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Contact</p><p className="text-slate-700 font-semibold mt-1">{selectedEmployee.contactNumber || '-'}</p></div>
              <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Emirates ID</p><p className="text-slate-700 font-mono font-semibold mt-1">{selectedEmployee.emirateId || '-'}</p></div>
              <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Passport</p><p className="text-slate-700 font-mono font-semibold mt-1">{selectedEmployee.passportNumber}</p></div>
              <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Sponsor</p><p className="text-slate-700 font-semibold mt-1">{selectedEmployee.sponsor || '-'}</p></div>
              <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Licence No</p><p className="text-slate-700 font-semibold mt-1">{selectedEmployee.licenceNo || '-'}</p></div>
              <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Joining Date</p><p className="text-slate-700 font-semibold mt-1">{formatDate(selectedEmployee.joiningDate)}</p></div>
            </div>

            <div className="bg-slate-50 rounded-[6px] p-5 border border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">📅 Document Validity Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-[6px] border border-slate-100 flex flex-col justify-between items-center shadow-sm">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Passport</p>
                  <p className="text-slate-700 text-sm font-bold mb-1.5">{formatDate(selectedEmployee.passportExpiryDate)}</p>
                  <StatusBadge status={getAlertStatus(calculateDaysLeft(selectedEmployee.passportExpiryDate))} text={`${calculateDaysLeft(selectedEmployee.passportExpiryDate)} days`} />
                </div>
                <div className="text-center p-4 bg-white rounded-[6px] border border-slate-100 flex flex-col justify-between items-center shadow-sm">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Visa</p>
                  <p className="text-slate-700 text-sm font-bold mb-1.5">{formatDate(selectedEmployee.visaExpiryDate)}</p>
                  <StatusBadge status={getAlertStatus(calculateDaysLeft(selectedEmployee.visaExpiryDate))} text={`${calculateDaysLeft(selectedEmployee.visaExpiryDate)} days`} />
                </div>
                <div className="text-center p-4 bg-white rounded-[6px] border border-slate-100 flex flex-col justify-between items-center shadow-sm">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Labour Card</p>
                  <p className="text-slate-700 text-sm font-bold mb-1.5">{formatDate(selectedEmployee.labourExpiry) || '-'}</p>
                  {selectedEmployee.labourExpiry ? <StatusBadge status={getAlertStatus(calculateDaysLeft(selectedEmployee.labourExpiry))} text={`${calculateDaysLeft(selectedEmployee.labourExpiry)} days`} /> : <span className="text-slate-400 text-xs">N/A</span>}
                </div>
                <div className="text-center p-4 bg-white rounded-[6px] border border-slate-100 flex flex-col justify-between items-center shadow-sm">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">RTA Card</p>
                  <p className="text-slate-700 text-sm font-bold mb-1.5">{formatDate(selectedEmployee.rtaExpiry) || '-'}</p>
                  {selectedEmployee.rtaExpiry ? <StatusBadge status={getAlertStatus(calculateDaysLeft(selectedEmployee.rtaExpiry))} text={`${calculateDaysLeft(selectedEmployee.rtaExpiry)} days`} /> : <span className="text-slate-400 text-xs">N/A</span>}
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-[6px] p-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4">💰 Salary Details (AED)</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Basic</p><p className="text-slate-800 text-lg font-bold mt-1">{formatCurrency(selectedEmployee.basicSalary || 0)}</p></div>
                <div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Allowance</p><p className="text-slate-800 text-lg font-bold mt-1">{formatCurrency(selectedEmployee.otherAllowance || 0)}</p></div>
                <div><p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Salary</p><p className="text-emerald-700 text-xl font-bold mt-0.5">{formatCurrency(selectedEmployee.totalSalary || 0)}</p></div>
              </div>
            </div>

            {/* ======== DOCUMENT IMAGES ======== */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">📷 Scanned Document Uploads</h4>

              {/* Passport, Visa, Labour Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Passport Image */}
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">📘 Passport Photo</p>
                  {selectedEmployee.passportImagePath ? (
                    <img
                      src={selectedEmployee.passportImagePath}
                      alt="Passport"
                      style={{ width: '420px', height: '260px' }}
                      className="rounded-[6px] border border-slate-200 bg-slate-50 object-cover shadow-sm cursor-pointer hover:opacity-95"
                      onClick={() => selectedEmployee.passportImagePath && setPreviewImg({ src: selectedEmployee.passportImagePath, title: 'Passport Image Scan' })}
                    />
                  ) : (
                    <div style={{ width: '100%', maxWidth: '420px', height: '260px' }} className="bg-slate-50 rounded-[6px] border border-dashed border-slate-200 flex items-center justify-center text-slate-400 shadow-inner">
                      <div className="text-center"><svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1" /></svg><p className="text-xs font-semibold uppercase tracking-wider">No Passport Image</p></div>
                    </div>
                  )}
                </div>

                {/* Visa Image */}
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">🛂 Residence Visa Photo</p>
                  {selectedEmployee.visaImagePath ? (
                    <img
                      src={selectedEmployee.visaImagePath}
                      alt="Visa"
                      style={{ width: '420px', height: '260px' }}
                      className="rounded-[6px] border border-slate-200 bg-slate-50 object-cover shadow-sm cursor-pointer hover:opacity-95"
                      onClick={() => selectedEmployee.visaImagePath && setPreviewImg({ src: selectedEmployee.visaImagePath, title: 'Residence Visa Scan' })}
                    />
                  ) : (
                    <div style={{ width: '100%', maxWidth: '420px', height: '260px' }} className="bg-slate-50 rounded-[6px] border border-dashed border-slate-200 flex items-center justify-center text-slate-400 shadow-inner">
                      <div className="text-center"><svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><p className="text-xs font-semibold uppercase tracking-wider">No Visa Image</p></div>
                    </div>
                  )}
                </div>

                {/* Labour Card Image */}
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">🪪 Work Permit / Labour Card</p>
                  {selectedEmployee.labourCardImagePath ? (
                    <img
                      src={selectedEmployee.labourCardImagePath}
                      alt="Labour Card"
                      style={{ width: '420px', height: '260px' }}
                      className="rounded-[6px] border border-slate-200 bg-slate-50 object-cover shadow-sm cursor-pointer hover:opacity-95"
                      onClick={() => selectedEmployee.labourCardImagePath && setPreviewImg({ src: selectedEmployee.labourCardImagePath, title: 'Labour Card Scan' })}
                    />
                  ) : (
                    <div style={{ width: '100%', maxWidth: '420px', height: '260px' }} className="bg-slate-50 rounded-[6px] border border-dashed border-slate-200 flex items-center justify-center text-slate-400 shadow-inner">
                      <div className="text-center"><svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1" /></svg><p className="text-xs font-semibold uppercase tracking-wider">No Labour Image</p></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Employee Profile" size="xl">
        {selectedEmployee && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Full Name" value={editFormData.fullName || ''} onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })} required />
              <Input label="Arabic Name" value={editFormData.arabicName || ''} onChange={(e) => setEditFormData({ ...editFormData, arabicName: e.target.value })} dir="rtl" />
              <Select label="Title" value={editFormData.title || ''} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} options={titleOptions} required />
              <Select label="Nationality" value={editFormData.nationality || ''} onChange={(e) => setEditFormData({ ...editFormData, nationality: e.target.value })} options={nationalityOptions} required />
              <Input label="Contact" value={editFormData.contactNumber || ''} onChange={(e) => setEditFormData({ ...editFormData, contactNumber: e.target.value })} />
              <Input label="Emirates ID" value={editFormData.emirateId || ''} onChange={(e) => setEditFormData({ ...editFormData, emirateId: e.target.value })} />
              <Input label="Passport No" value={editFormData.passportNumber || ''} onChange={(e) => setEditFormData({ ...editFormData, passportNumber: e.target.value.toUpperCase() })} required />
              <Input label="Passport Issue" type="date" value={editFormData.passportIssueDate || ''} onChange={(e) => setEditFormData({ ...editFormData, passportIssueDate: e.target.value })} />
              <Input label="Passport Expiry" type="date" value={editFormData.passportExpiryDate || ''} onChange={(e) => setEditFormData({ ...editFormData, passportExpiryDate: e.target.value })} required />
              <Input label="Visa Expiry" type="date" value={editFormData.visaExpiryDate || ''} onChange={(e) => setEditFormData({ ...editFormData, visaExpiryDate: e.target.value })} required />
              <Input label="Labour Expiry" type="date" value={editFormData.labourExpiry || ''} onChange={(e) => setEditFormData({ ...editFormData, labourExpiry: e.target.value })} />
              <Input label="RTA Expiry" type="date" value={editFormData.rtaExpiry || ''} onChange={(e) => setEditFormData({ ...editFormData, rtaExpiry: e.target.value })} />
              <Input label="Licence No" value={editFormData.licenceNo || ''} onChange={(e) => setEditFormData({ ...editFormData, licenceNo: e.target.value })} />
              <Select label="Sponsor" value={editFormData.sponsor || ''} onChange={(e) => setEditFormData({ ...editFormData, sponsor: e.target.value })} options={sponsorOptions} />
              <Input label="Joining Date" type="date" value={editFormData.joiningDate || ''} onChange={(e) => setEditFormData({ ...editFormData, joiningDate: e.target.value })} />
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100">
              <Input label="Basic Salary" type="number" value={editFormData.basicSalary || ''} onChange={(e) => setEditFormData({ ...editFormData, basicSalary: parseFloat(e.target.value) || 0 })} />
              <Input label="Allowance" type="number" value={editFormData.otherAllowance || ''} onChange={(e) => setEditFormData({ ...editFormData, otherAllowance: parseFloat(e.target.value) || 0 })} />
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Total Salary</label>
                <div className="w-full bg-emerald-50/70 border border-emerald-100 rounded-[6px] px-4 py-2.5 text-emerald-700 font-bold text-sm">{formatCurrency(editFormData.totalSalary || 0)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100">
              <ImageUpload label="Photo" value={editFormData.personImagePath || ''} onChange={(b) => setEditFormData({ ...editFormData, personImagePath: b })} onClear={() => setEditFormData({ ...editFormData, personImagePath: '' })} previewSize="sm" />
              <ImageUpload label="Passport" value={editFormData.passportImagePath || ''} onChange={(b) => setEditFormData({ ...editFormData, passportImagePath: b })} onClear={() => setEditFormData({ ...editFormData, passportImagePath: '' })} previewSize="sm" />
              <ImageUpload label="Visa" value={editFormData.visaImagePath || ''} onChange={(b) => setEditFormData({ ...editFormData, visaImagePath: b })} onClear={() => setEditFormData({ ...editFormData, visaImagePath: '' })} previewSize="sm" />
              <ImageUpload label="Labour Card" value={editFormData.labourCardImagePath || ''} onChange={(b) => setEditFormData({ ...editFormData, labourCardImagePath: b })} onClear={() => setEditFormData({ ...editFormData, labourCardImagePath: '' })} previewSize="sm" />
            </div>

            {/* ⭐ images load ho rahi hon to save rok dein — warna undefined ja kar photos mit jatin */}
            {mediaLoading && (
              <div className="p-3 rounded-[6px] bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold">
                ⏳ Purani images load ho rahi hain… save karne se pehle ruk jayein
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={saveEdit} isLoading={isSaving} disabled={mediaLoading}>💾 Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} title="Delete Employee" message={`Are you sure you want to permanently delete ${selectedEmployee?.fullName}? This cannot be undone.`} confirmText="Delete Employee" variant="danger" isLoading={isDeleting} />

      {previewImg && (
        <ImageModal
          isOpen={!!previewImg}
          onClose={() => setPreviewImg(null)}
          imageSrc={previewImg.src}
          title={previewImg.title}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
