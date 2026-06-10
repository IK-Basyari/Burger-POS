export type UserRole = 'super_admin' | 'owner' | 'leader' | 'kasir';
export type TokoStatus = 'active' | 'inactive' | 'pending';
export type TransaksiStatus = 'success' | 'deleted';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  toko_id?: string; // Optional for super_admin
  cabang_id?: string; // Optional for owner and super_admin
}

export interface Toko {
  toko_id: string; // Document ID
  nama_toko: string;
  owner_id: string; // Ref: users.uid
  status: TokoStatus;
  created_at: number; // or Date/Timestamp depending on Firebase usage
}

export interface Cabang {
  cabang_id: string; // Document ID
  toko_id: string; // Ref: toko.toko_id
  nama_cabang: string;
  alamat: string;
}

export interface Menu {
  menu_id: string; // Document ID
  toko_id: string; // Ref: toko.toko_id
  cabang_id: string; // Ref: cabang.cabang_id
  nama_produk: string;
  harga: number;
  stok: number; // Keep track of the item stock
}

export interface Transaksi {
  transaksi_id: string; // Document ID
  cabang_id: string; // Ref: cabang.cabang_id
  kasir_id: string; // Ref: users.uid
  role_eksekutor: UserRole;
  total_bayar: number;
  system_datetime: number; // or Firebase Timestamp
  business_date: string; // Built for easy query ('YYYY-MM-DD')
  status_transaksi: TransaksiStatus;
  deleted_at?: number | null;
  deleted_by?: string | null; // Ref: users.uid who deleted
}
