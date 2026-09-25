// ============================================
// Add Employee Page - Modern Light Professional Theme
// ============================================

import React, { useState, useEffect } from 'react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { ImageUpload } from '../components/UI/ImageUpload';
import { Toast } from '../components/UI/Modal';
import { useEmployees } from '../hooks/useEmployees';
import { logActivity, ACTIVITY_ACTIONS } from '../database/activityService';
import { NATIONALITIES, JOB_TITLES, SPONSORS, validatePassportNumber, validatePhoneNumber, transliterateToArabic, formatCurrency } from '../utils/helpers';

interface AddEmployeePageProps {
  userId: string;
  onSuccess?: () => void;
}

interface FormData {
  fullName: string;
  arabicName: string;
  title: string;
  nationality: string;
  contactNumber: string;
  emirateId: string;
  passportNumber: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  visaExpiryDate: string;
  labourExpiry: string;
  rtaExpiry: string;
  joiningDate: string;
  sponsor: string;
  licenceNo: string;
  personImagePath: string;
  passportImagePath: string;
  visaImagePath: string;
  labourCardImagePath: string;
  basicSalary: number;
  otherAllowance: number;
  totalSalary: number;
}

interface FormErrors {
  [key: string]: string;
}

const initialFormData: FormData = {
  fullName: '',
  arabicName: '',
  title: '',
  nationality: '',
  contactNumber: '+971 ',
  emirateId: '',
  passportNumber: '',
  passportIssueDate: '',
  passportExpiryDate: '',
  visaExpiryDate: '',
  labourExpiry: '',
  rtaExpiry: '',
  joiningDate: '',
  sponsor: 'Queen International School',
  licenceNo: '',
  personImagePath: '',
  passportImagePath: '',
  visaImagePath: '',
  labourCardImagePath: '',
  basicSalary: 0,
  otherAllowance: 0,
  totalSalary: 0,
};

export const AddEmployeePage: React.FC<AddEmployeePageProps> = ({ userId, onSuccess }) => {
  const { addEmployee, validatePassport, loading } = useEmployees();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nationalityOptions = NATIONALITIES.map(n => ({ value: n, label: n }));
  const titleOptions = JOB_TITLES.map(t => ({ value: t, label: t }));
  const sponsorOptions = SPONSORS.map(s => ({ value: s, label: s }));

  // Auto calculate total salary
  useEffect(() => {
    const total = (formData.basicSalary || 0) + (formData.otherAllowance || 0);
    setFormData(prev => ({ ...prev, totalSalary: total }));
  }, [formData.basicSalary, formData.otherAllowance]);

  // Auto convert name to Arabic on every keystroke
  useEffect(() => {
    if (formData.fullName) {
      const arabic = transliterateToArabic(formData.fullName);
      setFormData(prev => ({ ...prev, arabicName: arabic }));
    } else {
      setFormData(prev => ({ ...prev, arabicName: '' }));
    }
  }, [formData.fullName]);

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.nationality) newErrors.nationality = 'Nationality is required';
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.passportNumber.trim()) newErrors.passportNumber = 'Passport number is required';
    if (!formData.passportExpiryDate) newErrors.passportExpiryDate = 'Passport expiry date is required';
    if (!formData.visaExpiryDate) newErrors.visaExpiryDate = 'Visa expiry date is required';

    if (formData.passportNumber && !validatePassportNumber(formData.passportNumber)) {
      newErrors.passportNumber = 'Invalid passport number format';
    }

    if (formData.passportNumber && !newErrors.passportNumber) {
      const exists = await validatePassport(formData.passportNumber);
      if (exists) {
        newErrors.passportNumber = 'This passport number already exists';
      }
    }

    if (formData.contactNumber && formData.contactNumber !== '+971 ' && !validatePhoneNumber(formData.contactNumber)) {
      newErrors.contactNumber = 'Invalid UAE phone format (+971 5X XXX XXXX)';
    }

    if (formData.passportIssueDate && formData.passportExpiryDate) {
      if (new Date(formData.passportIssueDate) >= new Date(formData.passportExpiryDate)) {
        newErrors.passportExpiryDate = 'Expiry date must be after issue date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validate();
    if (!isValid) {
      setToast({ message: 'Please fix the errors in the form', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const employee = await addEmployee(formData);
      
      await logActivity(
        userId,
        ACTIVITY_ACTIONS.ADD_EMPLOYEE,
        `Added employee: ${employee.fullName} (${employee.employeeCode})`
      );

      setToast({ message: `Employee ${employee.fullName} added successfully!`, type: 'success' });
      setFormData(initialFormData);
      
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      setToast({ message: 'Failed to add employee. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setErrors({});
  };

  return (
    <div className="p-6 space-y-8 ">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-normal">Add New Employee</h1>
        <p className="text-slate-400 font-bold text-sm mt-1">Queen International School — Employee Registration System</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Images Column */}
          <Card className="p-6 xl:col-span-1 border border-slate-100 shadow-sm flex flex-col justify-start">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-100">📷 Upload Documents</h2>
            <div className="grid grid-cols-2 xl:grid-cols-1 gap-6">
              <ImageUpload label="Person Photo" value={formData.personImagePath} onChange={(b) => handleChange('personImagePath', b)} onClear={() => handleChange('personImagePath', '')} previewSize="md" />
              <ImageUpload label="Passport Image" value={formData.passportImagePath} onChange={(b) => handleChange('passportImagePath', b)} onClear={() => handleChange('passportImagePath', '')} previewSize="md" />
              <ImageUpload label="Visa Image" value={formData.visaImagePath} onChange={(b) => handleChange('visaImagePath', b)} onClear={() => handleChange('visaImagePath', '')} previewSize="md" />
              <ImageUpload label="Labour Card" value={formData.labourCardImagePath} onChange={(b) => handleChange('labourCardImagePath', b)} onClear={() => handleChange('labourCardImagePath', '')} previewSize="md" />
            </div>
          </Card>

          {/* Form Column */}
          <Card className="p-8 xl:col-span-3 border border-slate-100 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 pb-2 border-b border-slate-100">👤 Personal Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Full Name" value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="Enter full name" error={errors.fullName} required />
              <Input label="Arabic Name (Auto)" value={formData.arabicName} onChange={(e) => handleChange('arabicName', e.target.value)} placeholder="الاسم بالعربية" className="text-right" dir="rtl" />
              <Select label="Title" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} options={titleOptions} error={errors.title} required />
              <Select label="Nationality" value={formData.nationality} onChange={(e) => handleChange('nationality', e.target.value)} options={nationalityOptions} error={errors.nationality} required />
              <Input label="Contact Number" value={formData.contactNumber} onChange={(e) => handleChange('contactNumber', e.target.value)} placeholder="+971 5X XXX XXXX" error={errors.contactNumber} />
              <Input label="Emirates ID" value={formData.emirateId} onChange={(e) => handleChange('emirateId', e.target.value)} placeholder="784-XXXX-XXXXXXX-X" />
            </div>

            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mt-10 mb-6 pb-2 border-b border-slate-100">📄 Document Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Passport Number" value={formData.passportNumber} onChange={(e) => handleChange('passportNumber', e.target.value.toUpperCase())} placeholder="Passport number" error={errors.passportNumber} required />
              <Input label="Passport Issue Date" type="date" value={formData.passportIssueDate} onChange={(e) => handleChange('passportIssueDate', e.target.value)} error={errors.passportIssueDate} />
              <Input label="Passport Expiry Date" type="date" value={formData.passportExpiryDate} onChange={(e) => handleChange('passportExpiryDate', e.target.value)} error={errors.passportExpiryDate} required />
              <Input label="Visa Expiry Date" type="date" value={formData.visaExpiryDate} onChange={(e) => handleChange('visaExpiryDate', e.target.value)} error={errors.visaExpiryDate} required />
              <Input label="Labour Card Expiry" type="date" value={formData.labourExpiry} onChange={(e) => handleChange('labourExpiry', e.target.value)} />
              <Input label="RTA Expiry" type="date" value={formData.rtaExpiry} onChange={(e) => handleChange('rtaExpiry', e.target.value)} />
              <Input label="Licence No" value={formData.licenceNo} onChange={(e) => handleChange('licenceNo', e.target.value)} placeholder="Driving licence number" />
              <Select label="Sponsor" value={formData.sponsor} onChange={(e) => handleChange('sponsor', e.target.value)} options={sponsorOptions} />
              <Input label="Joining Date" type="date" value={formData.joiningDate} onChange={(e) => handleChange('joiningDate', e.target.value)} />
            </div>

            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mt-10 mb-6 pb-2 border-b border-slate-100">💰 Salary (AED)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Basic Salary" type="number" value={formData.basicSalary || ''} onChange={(e) => handleChange('basicSalary', parseFloat(e.target.value) || 0)} placeholder="0" />
              <Input label="Other Allowance" type="number" value={formData.otherAllowance || ''} onChange={(e) => handleChange('otherAllowance', parseFloat(e.target.value) || 0)} placeholder="0" />
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Total Salary</label>
                <div className="w-full bg-emerald-50/70 border border-emerald-100 rounded-[6px] px-4 py-2.5 text-emerald-700 font-bold text-lg flex items-center justify-start">
                  {formatCurrency(formData.totalSalary)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={handleReset} disabled={isSubmitting}>Reset Form</Button>
              <Button type="submit" isLoading={isSubmitting || loading}>Add New Employee</Button>
            </div>
          </Card>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
