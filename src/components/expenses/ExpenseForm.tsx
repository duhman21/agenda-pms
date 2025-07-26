'use client';

import { useState, useEffect } from 'react';
import { Property, Expense } from '@/types';

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  existingExpense?: Expense & { property_name?: string };
}

export default function ExpenseForm({ onSuccess, onCancel, existingExpense }: ExpenseFormProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    property_id: existingExpense?.property_id || '',
    amount: existingExpense?.amount?.toString() || '',
    category: existingExpense?.category || '',
    description: existingExpense?.description || '',
    receipt_url: existingExpense?.receipt_url || '',
    expense_date: existingExpense?.expense_date || new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchProperties();
    fetchCategories();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties');
      if (!response.ok) throw new Error('Failed to fetch properties');
      
      const data = await response.json();
      setProperties(data.properties || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/expenses/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image (JPEG, PNG, GIF) or PDF file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploadingReceipt(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Note: This would typically upload to a file storage service
      // For now, we'll simulate the upload and use a placeholder URL
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const receiptUrl = `receipts/${Date.now()}-${file.name}`;
      
      setFormData(prev => ({
        ...prev,
        receipt_url: receiptUrl
      }));

    } catch (err) {
      setError('Failed to upload receipt. Please try again.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.property_id || !formData.amount || !formData.category || !formData.expense_date) {
        throw new Error('Please fill in all required fields');
      }

      if (parseFloat(formData.amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate expense date
      const expenseDate = new Date(formData.expense_date);
      const today = new Date();
      
      if (expenseDate > today) {
        throw new Error('Expense date cannot be in the future');
      }

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      const url = existingExpense 
        ? `/api/expenses/${existingExpense.id}`
        : '/api/expenses';
      
      const method = existingExpense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save expense');
      }

      await response.json();
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset form if creating new expense
      if (!existingExpense) {
        setFormData({
          property_id: '',
          amount: '',
          category: '',
          description: '',
          receipt_url: '',
          expense_date: new Date().toISOString().split('T')[0]
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {existingExpense ? 'Update Expense' : 'Add New Expense'}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property *
          </label>
          <select
            name="property_id"
            value={formData.property_id}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select property...</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount * ($)
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category...</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expense Date *
          </label>
          <input
            type="date"
            name="expense_date"
            value={formData.expense_date}
            onChange={handleInputChange}
            required
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter expense description..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Receipt
          </label>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleReceiptUpload}
              disabled={uploadingReceipt}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            {uploadingReceipt && (
              <p className="text-sm text-blue-600">Uploading receipt...</p>
            )}
            {formData.receipt_url && (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-green-600">Receipt uploaded</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, receipt_url: '' }))}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Upload images (JPEG, PNG, GIF) or PDF files up to 5MB
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || uploadingReceipt}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (existingExpense ? 'Update Expense' : 'Add Expense')}
          </button>
        </div>
      </form>
    </div>
  );
}