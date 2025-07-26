import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const expenseId = params.id;

    // Get expense with property and owner information
    let query = supabase
      .from('expenses')
      .select(`
        id,
        property_id,
        amount,
        category,
        description,
        receipt_url,
        expense_date,
        created_at,
        updated_at,
        properties!inner(
          id,
          name,
          property_owners(
            ownership_percentage,
            user_profiles!inner(
              id,
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .eq('id', expenseId)
      .eq('tenant_id', userProfile.tenant_id);

    // Apply role-based filtering
    if (userProfile.role === 'owner') {
      const { data: ownedProperties } = await supabase
        .from('property_owners')
        .select('property_id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('owner_id', userProfile.id);

      if (!ownedProperties || ownedProperties.length === 0) {
        return NextResponse.json(
          { error: 'Expense not found' },
          { status: 404 }
        );
      }

      const propertyIds = ownedProperties.map(p => p.property_id);
      query = query.in('property_id', propertyIds);
    }

    const { data: expense, error } = await query.single();

    if (error || !expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Transform data to include owner expense attribution
    const property = expense.properties;
    const owners = property.property_owners || [];
    
    const ownerExpenses = owners.map(owner => ({
      owner_id: owner.user_profiles.id,
      owner_name: `${owner.user_profiles.first_name || ''} ${owner.user_profiles.last_name || ''}`.trim(),
      owner_email: owner.user_profiles.email,
      ownership_percentage: owner.ownership_percentage,
      attributed_expense: expense.amount * owner.ownership_percentage / 100
    }));

    const expenseData = {
      id: expense.id,
      property_id: expense.property_id,
      property_name: property.name,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      receipt_url: expense.receipt_url,
      expense_date: expense.expense_date,
      created_at: expense.created_at,
      updated_at: expense.updated_at,
      owner_expenses: ownerExpenses
    };

    return NextResponse.json({
      success: true,
      expense: expenseData
    });

  } catch (error) {
    console.error('Get expense error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and staff can update expenses
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const expenseId = params.id;
    const body = await request.json();
    const {
      property_id,
      amount,
      category,
      description,
      receipt_url,
      expense_date
    } = body;

    // Validate required fields
    if (!property_id || !amount || !category || !expense_date) {
      return NextResponse.json(
        { error: 'Missing required fields: property_id, amount, category, expense_date' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate expense date
    const expenseDate = new Date(expense_date);
    if (isNaN(expenseDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid expense date format' },
        { status: 400 }
      );
    }

    // Verify property belongs to tenant
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Update expense
    const { data: expense, error: updateError } = await supabase
      .from('expenses')
      .update({
        property_id,
        amount: parseFloat(amount),
        category,
        description,
        receipt_url,
        expense_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .eq('tenant_id', userProfile.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating expense:', updateError);
      return NextResponse.json(
        { error: 'Failed to update expense', details: updateError.message },
        { status: 500 }
      );
    }

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      expense
    });

  } catch (error) {
    console.error('Expense update error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and staff can delete expenses
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const expenseId = params.id;

    // Delete expense
    const { data: expense, error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('tenant_id', userProfile.tenant_id)
      .select()
      .single();

    if (deleteError) {
      console.error('Error deleting expense:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete expense', details: deleteError.message },
        { status: 500 }
      );
    }

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Expense deletion error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}