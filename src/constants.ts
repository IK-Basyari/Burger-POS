import { MenuItem, StockItem, Transaction } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Beef Burger Classic',
    price: 35000,
    category: 'Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '2',
    name: 'Cheese Burger Special',
    price: 45000,
    category: 'Burgers',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '3',
    name: 'Double BBQ Burger',
    price: 55000,
    category: 'Burgers',
    image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '4',
    name: 'Ice Tea Manis',
    price: 10000,
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '5',
    name: 'Lemonade Blast',
    price: 15000,
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '6',
    name: 'French Fries Large',
    price: 18000,
    category: 'Sides',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '7',
    name: 'Onion Rings',
    price: 20000,
    category: 'Sides',
    image: 'https://images.unsplash.com/photo-1639024471283-035188835118?q=80&w=400&h=300&auto=format&fit=crop'
  }
];

export const STOCK_DATA: StockItem[] = [
  { name: 'Beef Patty', used: 45, remaining: 15, status: 'KRITIS', unit: 'pcs' },
  { name: 'Bun Burger', used: 45, remaining: 40, status: 'AMAN', unit: 'pcs' },
  { name: 'Keju Slice', used: 60, remaining: 5, status: 'KRITIS', unit: 'pcs' },
  { name: 'Saus Tomat', used: 20, remaining: 80, status: 'AMAN', unit: 'ml' },
  { name: 'Kentang Beku', used: 30, remaining: 50, status: 'AMAN', unit: 'gr' }
];

export const SALES_BY_PAYMENT = [
  { name: 'Tunai', value: 400, amount: 1380000 },
  { name: 'QRIS', value: 300, amount: 1035000 },
  { name: 'Debit', value: 200, amount: 690000 },
  { name: 'Ojol', value: 100, amount: 345000 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tr-1',
    orderNumber: 'ORD-12345',
    timestamp: '2026-05-18T10:30:00Z',
    items: [
      { ...MENU_ITEMS[0], quantity: 2 },
      { ...MENU_ITEMS[3], quantity: 2 }
    ],
    total: 90000,
    paymentMethod: 'QRIS',
    status: 'COMPLETED'
  },
  {
    id: 'tr-2',
    orderNumber: 'ORD-12346',
    timestamp: '2026-05-18T11:15:00Z',
    items: [
      { ...MENU_ITEMS[1], quantity: 1 },
      { ...MENU_ITEMS[5], quantity: 1 }
    ],
    total: 63000,
    paymentMethod: 'Tunai',
    status: 'COMPLETED'
  },
  {
    id: 'tr-3',
    orderNumber: 'ORD-12347',
    timestamp: '2026-05-18T12:00:00Z',
    items: [
      { ...MENU_ITEMS[2], quantity: 3 }
    ],
    total: 165000,
    paymentMethod: 'Debit',
    status: 'VOID'
  }
];
