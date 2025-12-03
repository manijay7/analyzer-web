import { Transaction, Side, TransactionStatus } from './types';
import { MOCK_DESCRIPTIONS_LEFT, MOCK_DESCRIPTIONS_RIGHT } from './constants';

// Helper to generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Mock data generator simulating "Reading an Excel file from a folder based on date"
export const fetchTransactionsForDate = async (dateStr: string): Promise<{ left: Transaction[], right: Transaction[] }> => {
  // Simulate network/file read delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const count = Math.floor(Math.random() * 15) + 10; // 10-25 transactions per side
  const left: Transaction[] = [];
  const right: Transaction[] = [];

  // Generate some base amounts to ensure we have matches
  const baseAmounts = Array.from({ length: Math.floor(count * 0.7) }, () => Math.floor(Math.random() * 10000) / 100);

  // Populate Left Side (e.g., Internal Ledger)
  for (let i = 0; i < count; i++) {
    const isMatchable = i < baseAmounts.length;
    const amount = isMatchable ? baseAmounts[i] : Math.floor(Math.random() * 5000) / 100;
    
    left.push({
      id: `L-${generateId()}`,
      date: dateStr,
      description: MOCK_DESCRIPTIONS_LEFT[Math.floor(Math.random() * MOCK_DESCRIPTIONS_LEFT.length)],
      amount: amount,
      reference: `REF-${Math.floor(Math.random() * 10000)}`,
      side: Side.Left,
      status: TransactionStatus.Unmatched
    });
  }

  // Populate Right Side (e.g., Bank Statement)
  // We'll scramble matching slightly to simulate 1-to-many or small diffs
  for (let i = 0; i < count + 2; i++) { // Slightly different count
    let amount = 0;
    
    // Create some 1-to-1 matches
    if (i < baseAmounts.length - 2) {
      amount = baseAmounts[i];
    } 
    // Create a 2-to-1 match scenario (split one left amount into two right amounts)
    else if (i === baseAmounts.length - 2) {
      amount = Number((baseAmounts[i] * 0.4).toFixed(2));
    } else if (i === baseAmounts.length - 1) {
      // The remainder of the previous split, plus/minus a penny sometimes to annoy the user (realism)
      amount = Number((baseAmounts[baseAmounts.length - 2] * 0.6).toFixed(2));
    }
    else {
      amount = Math.floor(Math.random() * 5000) / 100;
    }

    right.push({
      id: `R-${generateId()}`,
      date: dateStr,
      description: MOCK_DESCRIPTIONS_RIGHT[Math.floor(Math.random() * MOCK_DESCRIPTIONS_RIGHT.length)],
      amount: amount,
      reference: `BNK-${Math.floor(Math.random() * 100000)}`,
      side: Side.Right,
      status: TransactionStatus.Unmatched
    });
  }

  return { left, right };
};