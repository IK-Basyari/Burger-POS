import { auth, secondaryAuth } from './firebase';
import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
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

    // Jika Super Admin mendaftarkan secara manual dgn Doc ID random, kita migrasikan document ini
    // ke UID asli milik Google Auth.
    if (docSnap.id !== userCred.user.uid) {
       if (userData.toko_id) {
           await setDoc(doc(db, 'toko', userData.toko_id), { owner_id: userCred.user.uid }, { merge: true });
       }
       userData.uid = userCred.user.uid;
       await setDoc(doc(db, 'users', userCred.user.uid), userData);
       await deleteDoc(doc(db, 'users', docSnap.id));
    }

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

  async registerOwnerEmailPassword(email: string, password: string, name: string, namaToko: string, alamat: string, noHp: string) {
    // Validate if email already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("Email sudah terdaftar. Silakan gunakan email lain.");
    }

    const newUserRef = doc(collection(db, 'users'));
    const uid = newUserRef.id;
    
    // generate activation key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let activationKey = '';
    let isUnique = false;

    while (!isUnique) {
      activationKey = 'POS-';
      for (let i = 0; i < 4; i++) {
          activationKey += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const tokenQuery = query(usersRef, where('activation_key', '==', activationKey));
      const tokenSnap = await getDocs(tokenQuery);
      if (tokenSnap.empty) {
        isUnique = true;
      }
    }

    const tokoId = `toko_${Date.now()}`;
    
    await setDoc(doc(db, 'toko', tokoId), {
      toko_id: tokoId,
      nama_toko: namaToko,
      alamat: alamat,
      no_hp: noHp,
      owner_id: uid,
      status: 'pending',
      created_at: Date.now()
    });

    const newUserData = {
      uid: uid,
      email: email,
      password: password, // Store plain text password as requested
      username: email.split('@')[0],
      name: name,
      nama_toko: namaToko,
      role: 'owner' as UserRole,
      toko_id: tokoId,
      no_hp: noHp,
      status: 'pending',
      account_status: 'pending',
      activation_key: activationKey,
      token_status: 'belum_siap'
    };
    
    await setDoc(newUserRef, newUserData);
    
    return { userData: newUserData };
  },

  async loginPortalManual(email: string, password: string) {
    const usersRef = collection(db, 'users');
    // Manual query for email and password
    const q = query(usersRef, where('email', '==', email), where('password', '==', password));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Email atau password tidak cocok.");
    }

    const docSnap = querySnapshot.docs[0];
    const userData = docSnap.data();

    if (userData.role === 'super_admin' && userData.email === 'irvan.syar@gmail.com') {
      // Allow super admin
      localStorage.setItem('superAdminUid', userData.uid);
    } else if (userData.role === 'owner') {
      // Allow owner
      localStorage.setItem('ownerUid', userData.uid);
    } else if (userData.role === 'cashier' || userData.role === 'leader' || userData.role === 'kasir') {
      throw new Error("Akun Staf/Kasir dilarang masuk portal ini. Silakan login melalui halaman POS-Login!");
    } else {
      throw new Error("Akses ditolak. Form ini khusus Owner & Super Admin.");
    }

    return { user: { uid: userData.uid, email: userData.email }, userData };
  },

  async activateOwnerAccount(uid: string, activationKeyInput: string) {
    const userData = await this.getUserData(uid);
    if (!userData) throw new Error("User tidak ditemukan.");

    if (userData.activation_key !== activationKeyInput) {
      throw new Error("Kode Aktivasi tidak valid untuk email ini.");
    }

    if (userData.token_status === 'belum_siap') {
      throw new Error("Kode Aktivasi ini belum diaktifkan oleh Super Admin. Harap tunggu.");
    }

    if (userData.token_status === 'hangus') {
      throw new Error("Kode Aktivasi ini sudah hangus karena telah digunakan.");
    }

    if (userData.token_status !== 'siap_pakai') {
      throw new Error("Status Kode Aktivasi tidak valid.");
    }

    // Update user status
    await setDoc(doc(db, 'users', uid), { status: 'active', account_status: 'active', token_status: 'hangus' }, { merge: true });
    
    // Update toko status
    if (userData.toko_id) {
       await setDoc(doc(db, 'toko', userData.toko_id), { status: 'active' }, { merge: true });
    }

    return true;
  },

  async registerTokoManual(email: string, password: string, name: string, namaToko: string, alamat: string) {
    // Validate if email already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("Email sudah terdaftar. Silakan gunakan email lain.");
    }

    const newUserRef = doc(collection(db, 'users'));
    const uid = newUserRef.id;
    
    const tokoId = `toko_${Date.now()}`;
    
    await setDoc(doc(db, 'toko', tokoId), {
      toko_id: tokoId,
      nama_toko: namaToko,
      alamat: alamat,
      owner_id: uid,
      status: 'active',
      created_at: Date.now()
    });

    const newUserData = {
      uid: uid,
      email: email,
      password: password,
      username: email.split('@')[0],
      name: name,
      nama_toko: namaToko,
      role: 'owner' as UserRole,
      status: 'active',
      toko_id: tokoId
    };
    
    await setDoc(newUserRef, newUserData);
    
    return newUserData;
  },

  async registerTokoByAdmin(email: string, password: string, name: string, namaToko: string) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("Email sudah terdaftar. Silakan gunakan email lain.");
    }

    const newUserRef = doc(collection(db, 'users'));
    const uid = newUserRef.id;
    
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
      password: password,
      username: email.split('@')[0],
      name: name,
      nama_toko: namaToko,
      role: 'owner' as UserRole,
      toko_id: tokoId
    };
    
    await setDoc(newUserRef, newUserData);
    
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
