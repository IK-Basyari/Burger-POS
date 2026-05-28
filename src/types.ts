export type Category = 'All' | 'Burgers' | 'Beverages' | 'Sides';

export interface IngredientRequirement {
  stockItemId: string; // The ID/Name used as key in inventory
  quantity: number;   // Amount used per portion
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  image: string;
  isActive?: boolean;
  ingredients?: IngredientRequirement[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

export interface StockItem {
  id?: string; // Adding ID for easier tracking
  name: string;
  used: number;
  remaining: number;
  status: 'KRITIS' | 'AMAN';
  isActive?: boolean;
  unit?: string;
}

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Debit' | 'Ojol';

export type UserRole = 'ADMIN' | 'CASHIER';

export interface AppUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
}

export interface Transaction {
  id: string;
  orderNumber: string;
  timestamp: string;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  status: 'COMPLETED' | 'VOID';
}
