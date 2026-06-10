import { auth, secondaryAuth } from './firebase';
import { db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { UserRole } from '../schema';

export const authService = {
  async getUserData(uid: string) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  },

  async loginPortalGoogle() {
    const provider = new GoogleAuthProvider();
    const userCred = await signInWithPopup(auth, provider);
    const email = userCred.user.email;
    if (!email) {
      await signOut(auth);
      throw new Error("Email tidak ditemukan dari akun Google.");
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { status: 'new_user', user: userCred.user };
    }

    const docSnap = querySnapshot.docs[0];
    const userData = docSnap.data();

    // Periksa Role dari Database
    if (userData.role === 'super_admin') {
      return { status: 'super_admin', userData };
    }

    if (userData.role !== 'owner') {
      await signOut(auth);
      throw new Error("Akses ditolak. Silakan gunakan APK Kasir/Leader.");
    }

    if (userData.toko_id) {
       const tokoDoc = await getDoc(doc(db, 'toko', userData.toko_id));
       if (!tokoDoc.exists()) {
           await signOut(auth);
           throw new Error("Data toko tidak ditemukan.");
       }
       if (tokoDoc.data().status === 'pending' || tokoDoc.data().status === 'inactive') {
         await signOut(auth);
         return { status: 'pending', userData };
       }
    } else {
       await signOut(auth);
       throw new Error("Data toko tidak lengkap.");
    }
    
    return { status: 'active_owner', userData };
  },

  async loginPOS(email: string, password: string) {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const userData = await this.getUserData(userCred.user.uid);
    
    if (!userData) {
      await signOut(auth);
      throw new Error("Data user tidak ditemukan.");
    }
    
    if (userData.role === 'super_admin') {
      await signOut(auth);
      throw new Error("Akses ditolak. Gunakan halaman Portal.");
    }
    
    if (userData.toko_id) {
       const tokoDoc = await getDoc(doc(db, 'toko', userData.toko_id));
       if (!tokoDoc.exists() || tokoDoc.data().status !== 'active') {
         await signOut(auth);
         throw new Error("Akun Anda belum aktif atau dinonaktifkan oleh Super Admin. Silakan hubungi admin.");
       }
    }
    
    return { user: userCred.user, userData };
  },

  async registerOwnerGoogle(uid: string, email: string, name: string, namaToko: string) {
    const tokoId = `toko_${Date.now()}`;
    
    // Create toko document
    await setDoc(doc(db, 'toko', tokoId), {
      toko_id: tokoId,
      nama_toko: namaToko,
      owner_id: uid,
      status: 'pending',
      created_at: Date.now()
    });

    // Create owner user doc
    const newUserData = {
      uid: uid,
      email: email,
      username: email.split('@')[0],
      name: name,
      role: 'owner' as UserRole,
      toko_id: tokoId
    };
    
    await setDoc(doc(db, 'users', uid), newUserData);
    
    return { userData: newUserData };
  },

  async registerTokoByAdmin(email: string, password: string, name: string, namaToko: string) {
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCred.user.uid;
    await signOut(secondaryAuth);
    
    const tokoId = `toko_${Date.now()}`;
    
    await setDoc(doc(db, 'toko', tokoId), {
      toko_id: tokoId,
      nama_toko: namaToko,
      owner_id: uid,
      status: 'active',
      created_at: Date.now()
    });

    const newUserData = {
      uid: uid,
      email: email,
      username: email.split('@')[0],
      name: name,
      role: 'owner' as UserRole,
      toko_id: tokoId
    };
    
    await setDoc(doc(db, 'users', uid), newUserData);
    
    return newUserData;
  },

  async registerLeader(ownerUid: string, username: string, password: string, name: string, cabangId: string) {
    const ownerData = await this.getUserData(ownerUid);
    if (!ownerData || ownerData.role !== 'owner') throw new Error("Akses ditolak. Hanya owner yang dapat membuat leader.");
    
    const tokoId = ownerData.toko_id;
    const email = `${username}_${tokoId}@pos-system.com`;
    
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCred.user.uid;
    await signOut(secondaryAuth);
    
    const newUserData = {
      uid,
      email,
      username,
      name,
      role: 'leader' as UserRole,
      toko_id: tokoId,
      cabang_id: cabangId
    };
    await setDoc(doc(db, 'users', uid), newUserData);
    return newUserData;
  },

  async registerKasir(leaderUid: string, username: string, password: string, name: string) {
    const leaderData = await this.getUserData(leaderUid);
    if (!leaderData || leaderData.role !== 'leader') throw new Error("Akses ditolak. Hanya leader yang dapat membuat kasir.");
    
    const tokoId = leaderData.toko_id;
    const cabangId = leaderData.cabang_id;
    const email = `${username}_${tokoId}@pos-system.com`;
    
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = userCred.user.uid;
    await signOut(secondaryAuth);
    
    const newUserData = {
      uid,
      email,
      username,
      name,
      role: 'kasir' as UserRole,
      toko_id: tokoId,
      cabang_id: cabangId
    };
    await setDoc(doc(db, 'users', uid), newUserData);
    return newUserData;
  },

  async logout() {
    return await signOut(auth);
  }
};
