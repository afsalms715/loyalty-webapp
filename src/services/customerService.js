import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where, addDoc, updateDoc } from 'firebase/firestore';

// Simple web crypto hash. Requires HTTPS or localhost
export const hashString = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const requestRedemption = async (shopId, customerId, username, customerDocId) => {
  const reqRef = collection(db, 'redemptionRequests');
  await addDoc(reqRef, {
    shopId,
    customerId,
    customerDocId,
    username,
    requestedAt: new Date().toISOString(),
    approved: false
  });
};

export const registerCustomer = async (shopId, username, password, phoneEmail) => {
  // Simulate auto-increment for MVP using 6-digit timestamp derived number
  const customerId = Math.floor(Date.now() / 1000) % 1000000; 
  
  const hPwd = await hashString(password);
  
  // Find currently active program for this shop
  let programId = shopId; // fallback to legacy shopId as programId
  const pQ = query(collection(db, 'loyaltyPrograms'), where('shopId', '==', shopId), where('isActive', '==', true));
  const pSnap = await getDocs(pQ);
  if (!pSnap.empty) {
    programId = pSnap.docs[0].id;
  }
  
  // We use a random document ID for security so it can't be guessed easily by sequential enumeration
  const docRef = doc(collection(db, 'customers'));
  const customerData = {
    customerId,
    shopId,
    programId,
    username,
    passwordHash: hPwd,
    emailPhone: phoneEmail || '',
    currentPoints: 0,
    rewardAvailable: false,
    createdAt: new Date().toISOString()
  };
  
  await setDoc(docRef, customerData);
  
  // Save credentials locally mapped by shopId
  localStorage.setItem(`loyaltyAuth_${shopId}`, JSON.stringify({ username, password }));
  
  return { id: docRef.id, ...customerData };
};

export const loginCustomer = async (shopId, username, plainPassword) => {
  const hPwd = await hashString(plainPassword);
  
  const q = query(
    collection(db, 'customers'), 
    where('shopId', '==', shopId), 
    where('username', '==', username),
    where('passwordHash', '==', hPwd)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error('Invalid credentials');
  }
  
  const docSnap = snap.docs[0];
  
  // Save local credentials
  localStorage.setItem(`loyaltyAuth_${shopId}`, JSON.stringify({ username, password: plainPassword }));
  
  return { id: docSnap.id, ...docSnap.data() };
};

export const getShopCardInfo = async (shopId) => {
  const shopRef = doc(db, 'shops', shopId);
  const sSnap = await getDoc(shopRef);
  
  // Try getting the active program
  let cardData = null;
  const pQ = query(collection(db, 'loyaltyPrograms'), where('shopId', '==', shopId), where('isActive', '==', true));
  const pSnap = await getDocs(pQ);
  
  if (!pSnap.empty) {
    cardData = { programId: pSnap.docs[0].id, ...pSnap.docs[0].data() };
  } else {
    // legacy check
    const cardRef = doc(db, 'loyaltyCards', shopId);
    const cSnap = await getDoc(cardRef);
    if (cSnap.exists()) {
      cardData = cSnap.data();
      cardData.programId = shopId;
    }
  }

  if (!sSnap.exists() || !cardData) return null;
  
  return {
    shop: sSnap.data(),
    card: cardData
  };
};

export const getProgramById = async (programId) => {
  // If programId is just the shopId, read the legacy collection
  const d = await getDoc(doc(db, 'loyaltyPrograms', programId));
  if (d.exists()) {
    return { programId: d.id, ...d.data() };
  }

  // legacy falback
  const leg = await getDoc(doc(db, 'loyaltyCards', programId));
  if (leg.exists()) return leg.data();

  return null;
};

export const fetchCustomerData = async (docId) => {
    const d = await getDoc(doc(db, 'customers', docId));
    if(d.exists()) return { id: d.id, ...d.data() };
    return null;
};

export const changeCustomerPassword = async (customerId, oldPassword, newPassword) => {
    const custRef = doc(db, 'customers', customerId);
    const custDoc = await getDoc(custRef);
    if (!custDoc.exists()) throw new Error('Customer not found');
    
    const hOld = await hashString(oldPassword);
    if (custDoc.data().passwordHash !== hOld) {
        throw new Error('Incorrect old password');
    }
    
    const hNew = await hashString(newPassword);
    await updateDoc(custRef, { passwordHash: hNew });
    
    const shopId = custDoc.data().shopId;
    const username = custDoc.data().username;
    localStorage.setItem(`loyaltyAuth_${shopId}`, JSON.stringify({ username, password: newPassword }));
};
