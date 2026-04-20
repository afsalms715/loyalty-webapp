import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, getDoc } from 'firebase/firestore';

export const getShopProfile = async (uid) => {
  const q = query(collection(db, 'shops'), where('ownerUid', '==', uid));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const shopDoc = querySnapshot.docs[0];
    const shopId = shopDoc.id;
    
    // Fetch active loyalty program
    let cardData = null;
    const pQ = query(collection(db, 'loyaltyPrograms'), where('shopId', '==', shopId), where('isActive', '==', true));
    const pSnap = await getDocs(pQ);
    
    if (!pSnap.empty) {
      cardData = { programId: pSnap.docs[0].id, ...pSnap.docs[0].data() };
    } else {
      // Fallback to legacy single card if exists
      const cardQ = query(collection(db, 'loyaltyCards'), where('shopId', '==', shopId));
      const cardSnap = await getDocs(cardQ);
      if (!cardSnap.empty) {
        cardData = cardSnap.docs[0].data();
        cardData.programId = shopId; // legacy assumed programId
      }
    }
    
    return { id: shopId, ...shopDoc.data(), cardData };
  }
  return null;
};

export const createOrUpdateShop = async (uid, data) => {
  const shopId = data.shopId || uid; 
  const shopRef = doc(db, 'shops', shopId); 
  await setDoc(shopRef, {
    ownerUid: uid,
    shopId: shopId,
    name: data.name,
    address: data.address,
    phone: data.phone,
    createdAt: new Date().toISOString()
  }, { merge: true });

  // Initialize first active program if no program data is provided (legacy update or fresh creation)
  // If data.programId exists, it means we are just updating shop details, not creating a new program.
  if (data.cardTitle && data.totalPoints && data.rewardDescription) {
     const pQ = query(collection(db, 'loyaltyPrograms'), where('shopId', '==', shopId), where('isActive', '==', true));
     const pSnap = await getDocs(pQ);
     if (pSnap.empty) {
        await createNewProgramVersion(shopId, data);
     }
  }
};

export const createNewProgramVersion = async (shopId, data) => {
  // 1. Move any existing active programs to inactive
  const pQ = query(collection(db, 'loyaltyPrograms'), where('shopId', '==', shopId), where('isActive', '==', true));
  const pSnap = await getDocs(pQ);
  for (const docSnap of pSnap.docs) {
    await updateDoc(docSnap.ref, { isActive: false, archived: true });
  }

  // 2. Create the new active program
  const newProgramRef = doc(collection(db, 'loyaltyPrograms'));
  await setDoc(newProgramRef, {
    shopId: shopId,
    title: data.cardTitle,
    totalPoints: Number(data.totalPoints),
    rewardDescription: data.rewardDescription,
    iconType: data.iconType || 'coffee',
    isActive: true,
    archived: false,
    createdAt: new Date().toISOString()
  });
};

export const getCustomersByShop = async (shopId) => {
  const q = query(collection(db, 'customers'), where('shopId', '==', shopId));
  const snap = await getDocs(q);
  
  const customers = [];
  const pCache = {};

  for (const d of snap.docs) {
    const data = d.data();
    const pid = data.programId || shopId;
    if (!pCache[pid]) {
      let prog = null;
      const progSnap = await getDoc(doc(db, 'loyaltyPrograms', pid));
      if (progSnap.exists()) prog = progSnap.data();
      else {
        const leg = await getDoc(doc(db, 'loyaltyCards', pid));
        if (leg.exists()) prog = leg.data();
      }
      pCache[pid] = prog;
    }
    customers.push({ 
      id: d.id, 
      ...data, 
      targetPoints: pCache[pid] ? Number(pCache[pid].totalPoints) : 5 
    });
  }

  return customers;
};

export const searchCustomerByIdOrName = async (shopId, searchTerm) => {
  const customers = await getCustomersByShop(shopId);
  const term = searchTerm.toLowerCase();
  return customers.filter(c => 
    String(c.customerId).includes(term) || 
    c.username.toLowerCase().includes(term)
  );
};

export const addPointToCustomer = async (docId, currentPoints, totalPoints) => {
  const ref = doc(db, 'customers', docId);
  const newPoints = currentPoints + 1;
  const isReward = newPoints >= totalPoints;
  await updateDoc(ref, {
    currentPoints: newPoints,
    rewardAvailable: isReward
  });
};

export const getPendingRedemptions = async (shopId) => {
  const q = query(
    collection(db, 'redemptionRequests'), 
    where('shopId', '==', shopId),
    where('approved', '==', false)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const approveRedemption = async (docId, customerDocId) => {
  // Delete the request
  const reqRef = doc(db, 'redemptionRequests', docId);
  await updateDoc(reqRef, { approved: true, approvedAt: new Date().toISOString() });
  
  // Reset points
  const custRef = doc(db, 'customers', customerDocId);
  await updateDoc(custRef, {
    currentPoints: 0,
    rewardAvailable: false
  });
};
