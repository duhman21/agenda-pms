import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');
    const category = searchParams.get('category');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build base query for expenses
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
      .eq('tenant_id', userProfile.tenant_id)
      .order('expense_date', { ascending: false });

    // Apply filters based on user role
    if (userProfile.role === 'owner') {
      // Property owners can only see expenses for their properties
      const { data: ownedProperties } = await supabase
        .from('property_owners')
        .select('property_id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('owner_id', userProfile.id);

      if (!ownedProperties || ownedProperties.length === 0) {
        return NextResponse.json({
          success: true,
          expenses: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        });
      }

      const propertyIds = ownedProperties.map(p => p.property_id);
      query = query.in('property_id', propertyIds);
    }

    // Apply additional filters
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (startDate) {
      query = query.gte('expense_date', startDate);
    }

    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    if (search) {
      query = query.or(`description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: expenses, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch expenses', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to include owner expense attribution
    const expenseData = expenses?.map(expense => {
      const property = expense.properties;
      const owners = property.property_owners || [];
      
      // Calculate expense attribution per owner
      const ownerExpenses = owners.map(owner => ({
        owner_id: owner.user_profiles.id,
        owner_name: `${owner.user_profiles.first_name || ''} ${owner.user_profiles.last_name || ''}`.trim(),
        owner_email: owner.user_profiles.email,
        ownership_percentage: owner.ownership_percentage,
        attributed_expense: expense.amount * owner.ownership_percentage / 100
      }));

      return {
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
    }) || [];

    // Get total count for pagination
    let countQuery = supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userProfile.tenant_id);

    if (userProfile.role === 'owner') {
      const { data: ownedProperties } = await supabase
        .from('property_owners')
        .select('property_id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('owner_id', userProfile.id);

      if (ownedProperties && ownedProperties.length > 0) {
        const propertyIds = ownedProperties.map(p => p.property_id);
        countQuery = countQuery.in('property_id', propertyIds);
      }
    }

    if (propertyId) {
      countQuery = countQuery.eq('property_id', propertyId);
    }

    if (category) {
      countQuery = countQuery.eq('category', category);
    }

    if (startDate) {
      countQuery = countQuery.gte('expense_date', startDate);
    }

    if (endDate) {
      countQuery = countQuery.lte('expense_date', endDate);
    }

    if (search) {
      countQuery = countQuery.or(`description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting expense count:', countError);
    }

    return NextResponse.json({
      success: true,
      expenses: expenseData,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and staff can record expenses
    if (!['admin', 'staff'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

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

    // Create expense
    const { data: expense, error: insertError } = await supabase
      .from('expenses')
      .insert({
        tenant_id: userProfile.tenant_id,
        property_id,
        amount: parseFloat(amount),
        category,
        description,
        receipt_url,
        expense_date
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating expense:', insertError);
      return NextResponse.json(
        { error: 'Failed to create expense', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expense
    }, { status: 201 });

  } catch (error) {
    console.error('Expense creation error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}