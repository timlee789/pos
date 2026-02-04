import { NextResponse } from 'next/server';
import { CartItem, ModifierGroup } from '@/lib/types';
import { CustomerViewMode } from '@/hooks/useCustomerDisplay';

// In-memory cache for the customer display state
let displayState = {
  mode: 'IDLE' as CustomerViewMode,
  cart: [] as CartItem[],
  total: 0,
  activeItemName: '' as string,
  availableGroups: [] as ModifierGroup[], // Added this field to the cache
  lastUpdated: Date.now(),
};

export async function GET(request: Request) {
  return NextResponse.json(displayState);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Update the state with the new data
    displayState = {
      mode: body.mode || displayState.mode,
      cart: body.cart || displayState.cart,
      total: body.total !== undefined ? body.total : displayState.total,
      activeItemName: body.activeItemName !== undefined ? body.activeItemName : displayState.activeItemName,
      availableGroups: body.availableGroups || displayState.availableGroups, // Update availableGroups
      lastUpdated: Date.now(),
    };

    return NextResponse.json({ success: true, state: displayState });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
