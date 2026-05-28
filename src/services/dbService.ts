import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  onSnapshot,
  query,
  where,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { MenuItem, Category, PaymentMethod, Transaction, StockItem } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dbService = {
  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    const path = 'menuItems';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as MenuItem))
        .filter(item => !!item.name);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  listenMenuItems(callback: (items: MenuItem[]) => void) {
    const path = 'menuItems';
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as MenuItem))
        .filter(item => !!item.name)
      );
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async addMenuItem(item: MenuItem | Omit<MenuItem, 'id'>) {
    const path = 'menuItems';
    try {
      if ('id' in item && item.id) {
        return await setDoc(doc(db, path, item.id), item);
      }
      return await addDoc(collection(db, path), item);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  async updateMenuItem(id: string, item: Partial<MenuItem>) {
    const path = `menuItems/${id}`;
    try {
      await setDoc(doc(db, 'menuItems', id), item, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deleteMenuItem(id: string) {
    const path = `menuItems/${id}`;
    try {
      await deleteDoc(doc(db, 'menuItems', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Categories
  async getCategories() {
    const path = 'categories';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as { name: string, isActive: boolean, id: string }))
        .filter(cat => !!cat.name);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  listenCategories(callback: (cats: any[]) => void) {
    const path = 'categories';
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as { name: string, isActive: boolean, id: string }))
        .filter(cat => !!cat.name)
      );
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async setCategories(cats: {name: string, isActive: boolean}[]) {
    const path = 'categories';
    try {
      for (const cat of cats) {
        if (!cat.name) continue;
        await setDoc(doc(db, path, cat.name.toLowerCase().replace(/\s+/g, '-')), cat, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async updateCategory(id: string, cat: Partial<{ name: string, isActive: boolean }>) {
    const path = `categories/${id}`;
    try {
      await setDoc(doc(db, 'categories', id), cat, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deleteCategory(name: string) {
    if (!name) return;
    const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');
    const path = `categories/${sanitizedName}`;
    try {
      await deleteDoc(doc(db, 'categories', sanitizedName));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Transactions
  async addTransaction(tr: Transaction) {
    const path = 'transactions';
    try {
      await setDoc(doc(db, path, tr.id), tr);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  async updateTransaction(id: string, tr: Partial<Transaction>) {
    const path = `transactions/${id}`;
    try {
      await setDoc(doc(db, 'transactions', id), tr, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deleteTransaction(id: string) {
    const path = `transactions/${id}`;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  listenTransactions(callback: (trs: Transaction[]) => void) {
    const path = 'transactions';
    return onSnapshot(query(collection(db, path), orderBy('timestamp', 'desc')), (snap) => {
      callback(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  // Inventory
  listenInventory(callback: (items: StockItem[]) => void) {
    const path = 'inventory';
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as StockItem))
        .filter(item => !!item.name)
      );
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async updateInventory(items: StockItem[]) {
    const path = 'inventory';
    try {
      for (const item of items) {
        if (!item.name) continue;
        await setDoc(doc(db, path, item.name.toLowerCase().replace(/\s+/g, '-')), item);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  // Payments
  async getPayments() {
    const path = 'payments';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as { name: string, isActive: boolean, id: string }))
        .filter(pay => !!pay.name);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  listenPayments(callback: (pays: any[]) => void) {
    const path = 'payments';
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as { name: string, isActive: boolean, id: string }))
        .filter(pay => !!pay.name)
      );
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async setPayments(pays: {name: string, isActive: boolean}[]) {
    const path = 'payments';
    try {
      for (const pay of pays) {
        if (!pay.name) continue;
        await setDoc(doc(db, path, pay.name.toLowerCase().replace(/\s+/g, '-')), pay);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async updatePayment(id: string, payment: Partial<{ name: string, isActive: boolean }>) {
    const path = `payments/${id}`;
    try {
      await setDoc(doc(db, 'payments', id), payment, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deletePayment(name: string) {
    if (!name) return;
    const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');
    const path = `payments/${sanitizedName}`;
    try {
      await deleteDoc(doc(db, 'payments', sanitizedName));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Users
  async getUsers(): Promise<any[]> {
    const path = 'users';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  listenUsers(callback: (users: any[]) => void) {
    const path = 'users';
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async addUser(user: any) {
    const path = 'users';
    try {
      return await addDoc(collection(db, path), user);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  async deleteUser(id: string) {
    const path = `users/${id}`;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  async updateUser(id: string, user: Partial<any>) {
    const path = `users/${id}`;
    try {
      await setDoc(doc(db, 'users', id), user, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  // Business Settings
  async getBusinessSettings(): Promise<{ name: string, logo: string } | null> {
    const path = 'businessSettings';
    try {
      const snap = await getDocs(collection(db, path));
      if (!snap.empty) {
        return snap.docs[0].data() as { name: string, logo: string };
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  listenBusinessSettings(callback: (settings: { name: string, logo: string }) => void) {
    const path = 'businessSettings';
    return onSnapshot(collection(db, path), (snap) => {
      if (!snap.empty) {
        callback(snap.docs[0].data() as { name: string, logo: string });
      } else {
        callback({ name: 'BurgerPOS', logo: 'B' });
      }
    }, (e) => {
      console.error(e);
      callback({ name: 'BurgerPOS', logo: 'B' });
    });
  },

  async updateBusinessSettings(settings: { name: string, logo: string }) {
    const path = 'businessSettings';
    try {
      const snap = await getDocs(collection(db, path));
      if (!snap.empty) {
        const docId = snap.docs[0].id;
        await setDoc(doc(db, path, docId), settings, { merge: true });
      } else {
        await addDoc(collection(db, path), settings);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
};
