import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';

// Predefined expense categories for property management
const EXPENSE_CATEGORIES = [
  'Maintenance & Repairs',
  'Cleaning',
  'Utilities',
  'Insurance',
  'Property Management',
  'Marketing & Advertising',
  'Legal & Professional',
  'Supplies',
  'Landscaping',
  'Security',
  'Taxes',
  'Furniture & Equipment',
  'Technology',
  'Other'
];

export async function GET() {
  try {
    const { profile: userProfile } = await getCurrentUser();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      categories: EXPENSE_CATEGORIES
    });

  } catch (error) {
    console.error('Get expense categories error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}