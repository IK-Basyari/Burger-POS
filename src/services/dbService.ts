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

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
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
  
  if (error?.code === 'permission-denied') {
    console.warn('Firestore Permission Denied (possibly due to logout): ', errInfo);
    return;
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function getPath(col: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated directly as Store Admin');
  return `tenants/${uid}/${col}`;
}

export const dbService = {
  // Store / Tenant Management
  listenAllStores(callback: (stores: any[]) => void) {
    return onSnapshot(collection(db, 'toko'), (snap) => {
      callback(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (e: any) => {
      if (e.code !== 'permission-denied') {
        console.error("Error listening stores", e);
      }
    });
  },
  
  async updateStoreStatus(tokoId: string, status: string) {
    try {
      await updateDoc(doc(db, 'toko', tokoId), { status });
    } catch (e) {
      console.error('Failed to update store status', e);
      throw e;
    }
  },

  async deleteStore(tokoId: string) {
    try {
      await deleteDoc(doc(db, 'toko', tokoId));
    } catch (e) {
      console.error('Failed to delete store', e);
      throw e;
    }
  },

  async addTransaksi(data: Omit<import('../schema').Transaksi, 'transaksi_id' | 'system_datetime'>) {
    try {
      const transDoc = doc(collection(db, 'transaksi'));
      const payload = {
        ...data,
        transaksi_id: transDoc.id,
        system_datetime: Date.now(),
      };
      await setDoc(transDoc, payload);
      return transDoc.id;
    } catch (e) {
      console.error('Failed to add transaksi', e);
      throw e;
    }
  },

  listenTransaksi(cabangId: string, limitDays?: number, callback?: (trs: import('../schema').Transaksi[]) => void) {
    let q = query(collection(db, 'transaksi'), where('cabang_id', '==', cabangId));
    
    // Only fetch recent days if limit is provided
    if (limitDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - limitDays);
      const cutoffStr = cutoffDate.toLocaleDateString('en-CA');
      q = query(q, where('business_date', '>=', cutoffStr));
    }
    
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => doc.data() as import('../schema').Transaksi);
      // Sort by system_datetime desc manually since we might query on business_date
      data.sort((a, b) => b.system_datetime - a.system_datetime);
      if (callback) callback(data);
    }, (e) => {
      console.error("Error listening transactions:", e);
      if (callback) callback([]);
    });
  },

  async softDeleteTransaksi(transaksiId: string, userId: string) {
    try {
      const docRef = doc(db, 'transaksi', transaksiId);
      await updateDoc(docRef, {
        status_transaksi: 'deleted',
        deleted_at: Date.now(),
        deleted_by: userId
      });
    } catch (e) {
      console.error('Failed to soft delete transaksi', e);
      throw e;
    }
  },
  
  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    const path = getPath('menuItems');
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
    let path = '';
    try {
      path = getPath('menuItems');
    } catch { return () => {}; }
    
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as MenuItem))
        .filter(item => !!item.name)
      );
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async addMenuItem(item: MenuItem | Omit<MenuItem, 'id'>) {
    const path = getPath('menuItems');
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
    const path = getPath(`menuItems`);
    try {
      await setDoc(doc(db, path, id), item, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deleteMenuItem(id: string) {
    const path = getPath(`menuItems`);
    try {
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Categories
  async getCategories() {
    const path = getPath('categories');
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
    let path = '';
    try {
      path = getPath('categories');
    } catch { return () => {}; }
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as { name: string, isActive: boolean, id: string }))
        .filter(cat => !!cat.name)
      );
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async setCategories(cats: {name: string, isActive: boolean}[]) {
    const path = getPath('categories');
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
    const path = getPath('categories');
    try {
      await setDoc(doc(db, path, id), cat, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deleteCategory(name: string) {
    if (!name) return;
    const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');
    const path = getPath('categories');
    try {
      await deleteDoc(doc(db, path, sanitizedName));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Transactions
  async addTransaction(tr: Transaction) {
    const path = getPath('transactions');
    try {
      await setDoc(doc(db, path, tr.id), tr);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  async updateTransaction(id: string, tr: Partial<Transaction>) {
    const path = getPath('transactions');
    try {
      await setDoc(doc(db, path, id), tr, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deleteTransaction(id: string) {
    const path = getPath('transactions');
    try {
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  listenTransactions(callback: (trs: Transaction[]) => void) {
    let path = '';
    try {
      path = getPath('transactions');
    } catch { return () => {}; }
    return onSnapshot(query(collection(db, path), orderBy('timestamp', 'desc')), (snap) => {
      callback(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  // Inventory
  listenInventory(callback: (items: StockItem[]) => void) {
    let path = '';
    try {
      path = getPath('inventory');
    } catch { return () => {}; }
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as StockItem))
        .filter(item => !!item.name)
      );
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async updateInventory(items: StockItem[]) {
    const path = getPath('inventory');
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
    const path = getPath('payments');
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
    let path = '';
    try {
      path = getPath('payments');
    } catch { return () => {}; }
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as { name: string, isActive: boolean, id: string }))
        .filter(pay => !!pay.name)
      );
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async setPayments(pays: {name: string, isActive: boolean}[]) {
    const path = getPath('payments');
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
    const path = getPath('payments');
    try {
      await setDoc(doc(db, path, id), payment, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async deletePayment(name: string) {
    if (!name) return;
    const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');
    const path = getPath('payments');
    try {
      await deleteDoc(doc(db, path, sanitizedName));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Users
  async getUsers(): Promise<any[]> {
    const path = getPath('users');
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  listenUsers(callback: (users: any[]) => void) {
    let path = '';
    try {
      path = getPath('users');
    } catch { return () => {}; }
    return onSnapshot(collection(db, path), (snap) => {
      callback(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
  },

  async addUser(user: any) {
    const path = getPath('users');
    try {
      return await addDoc(collection(db, path), user);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  async deleteUser(id: string) {
    const path = getPath('users');
    try {
      await deleteDoc(doc(db, path, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  async updateUser(id: string, user: Partial<any>) {
    const path = getPath('users');
    try {
      await setDoc(doc(db, path, id), user, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  // Business Settings
  async getBusinessSettings(): Promise<{ name: string, logo: string } | null> {
    const path = getPath('businessSettings');
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
    let path = '';
    try {
      path = getPath('businessSettings');
    } catch { return () => {}; }
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
    const path = getPath('businessSettings');
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
