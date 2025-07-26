'use client';

import { useState } from 'react';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import { Expense } from '@/types';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { ResponsiveCard, ResponsiveCardHeader } from '@/components/layout/ResponsiveCard';
import { TouchFriendlyButton } from '@/components/layout/TouchFriendlyButton';
import { ResponsiveModal, ModalContent } from '@/components/layout/ResponsiveModal';
import { PlusIcon } from '@heroicons/react/24/outline';

// Lazy load heavy components
import { LazyExpenseList } from '@/components/lazy/LazyManagement';

interface ExpenseWithDetails extends Expense {
  property_name: string;
  owner_expenses: {
    owner_id: string;
    owner_name: string;
    owner_email?: string;
    ownership_percentage: number;
    attributed_expense: number;
  }[];
}

export default function ExpensesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingExpense(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleEditExpense = (expense: ExpenseWithDetails) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDeleteExpense = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <ResponsiveCard>
          <ResponsiveCardHeader 
            title="Expenses"
            subtitle="Track and manage property expenses with automatic owner attribution"
            action={
              <TouchFriendlyButton
                onClick={handleAddExpense}
                size="md"
                className="w-full sm:w-auto"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Expense
              </TouchFriendlyButton>
            }
          />
        </ResponsiveCard>

        {/* Form Modal */}
        <ResponsiveModal
          isOpen={showForm}
          onClose={handleFormCancel}
          title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
          size="lg"
        >
          <ModalContent>
            <ExpenseForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              existingExpense={editingExpense || undefined}
            />
          </ModalContent>
        </ResponsiveModal>

        {/* Expense List */}
        <LazyExpenseList
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </ResponsiveLayout>
  );
}