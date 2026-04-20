import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getShopCardInfo, loginCustomer, requestRedemption, getProgramById, changeCustomerPassword } from '../services/customerService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Gift, Coffee, Star, MapPin, CheckCircle, Settings, X, Search, Utensils, Scissors, Heart, ShoppingBag, Award } from 'lucide-react';

const ICONS = {
  coffee: Coffee,
  star: Star,
  utensils: Utensils,
  scissors: Scissors,
  heart: Heart,
  bag: ShoppingBag,
  award: Award
};

export default function CustomerView() {
  const { shopId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [shopInfo, setShopInfo] = useState(null);
  const [userDoc, setUserDoc] = useState(location.state?.userDoc || null);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old: '', new: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    let unsub = null;

    const fetchData = async () => {
      // Base info for header
      const info = await getShopCardInfo(shopId);
      if (!info) {
        navigate('/login');
        return;
      }
      
      let currentDocId = userDoc?.id;
      let loadedDoc = userDoc;

      if (!currentDocId) {
        const stored = localStorage.getItem(`loyaltyAuth_${shopId}`);
        if (stored) {
          try {
            const { username, password } = JSON.parse(stored);
            loadedDoc = await loginCustomer(shopId, username, password);
            setUserDoc(loadedDoc);
            currentDocId = loadedDoc.id;
          } catch (err) {
            navigate(`/join/${shopId}`);
            return;
          }
        } else {
          navigate(`/join/${shopId}`);
          return;
        }
      }

      // We have the user, fetch their specific program version
      if (loadedDoc) {
         const pid = loadedDoc.programId || shopId;
         const prog = await getProgramById(pid);
         if (prog) {
           info.card = prog; // Override base active program with user's specific program
         }
      }

      setShopInfo(info);
      setLoading(false);
      
      if (localStorage.getItem(`redemptionReq_${shopId}`)) {
        setRequested(true);
      }

      // Setup Realtime Sync
      if (currentDocId) {
        unsub = onSnapshot(doc(db, 'customers', currentDocId), (docSnap) => {
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() };
            setUserDoc(data);
            if (!data.rewardAvailable) {
              setRequested(false);
              localStorage.removeItem(`redemptionReq_${shopId}`);
            }
          }
        });
      }
    };
    
    fetchData();

    return () => {
      if (unsub) unsub();
    };
  }, [shopId, navigate]);

  const handleLogout = () => {
    localStorage.removeItem(`loyaltyAuth_${shopId}`);
    navigate(`/join/${shopId}`);
  };

  const handleRedeem = async () => {
    if (!userDoc || !shopInfo) return;
    setRequested(true);
    localStorage.setItem(`redemptionReq_${shopId}`, 'true');
    try {
      await requestRedemption(shopId, userDoc.customerId, userDoc.username, userDoc.id);
    } catch (err) {
      console.error(err);
      setRequested(false);
      localStorage.removeItem(`redemptionReq_${shopId}`);
      alert("Failed to request redemption. Show cashier directly.");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMsg('');
    try {
      await changeCustomerPassword(userDoc.id, pwdForm.old, pwdForm.new);
      setPwdMsg('Password updated successfully!');
      setTimeout(() => {
        setShowSettings(false);
        setPwdMsg('');
        setPwdForm({old: '', new: ''});
      }, 1500);
    } catch (err) {
      setPwdMsg(err.message || "Failed to update");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  if (loading || !shopInfo || !userDoc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const { shop, card } = shopInfo;
  const totalPoints = Number(card.totalPoints) || 5;
  const currentPoints = userDoc.currentPoints || 0;
  
  // Choose icon dynamically
  const IconComponent = ICONS[card.iconType] || Coffee;

  const pointDots = [];
  for (let i = 0; i < totalPoints; i++) {
    const isEarned = i < currentPoints;
    pointDots.push(
      <div key={i} className={`flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full border-4 shadow-sm transition-all duration-500 transform ${isEarned ? 'bg-indigo-600 border-indigo-200 shadow-indigo-300 scale-110' : 'bg-gray-100 border-gray-200 scale-100'}`}>
        <IconComponent className={`w-6 h-6 md:w-7 md:h-7 ${isEarned ? 'text-white' : 'text-gray-300'}`} fill={isEarned ? 'currentColor' : 'none'} strokeWidth={isEarned ? 1.5 : 2} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header Ribbon */}
        <div className="bg-indigo-600 p-8 pt-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 flex gap-2">
             <button onClick={()=>setShowSettings(true)} className="text-white hover:text-indigo-200 transition-colors p-2">
               <Settings className="w-5 h-5" />
             </button>
             <button onClick={handleLogout} className="text-xs font-bold bg-black/10 hover:bg-black/20 px-4 py-2 rounded-full transition-colors backdrop-blur-sm">
                Sign Out
             </button>
          </div>
          <div className="w-20 h-20 bg-white rounded-3xl mx-auto mb-5 flex items-center justify-center shadow-xl transform rotate-3">
            <Gift className="text-indigo-600 w-10 h-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">{shop.name}</h1>
          <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs md:text-sm">{card.title}</p>
        </div>

        {/* User ID Badge */}
        <div className="flex justify-center -mt-6 relative z-10 w-full px-6">
          <div className="bg-white w-full px-8 py-4 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center transform transition-transform">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Your Account ID</span>
            <span className="text-3xl font-black text-gray-900 font-mono tracking-widest">{userDoc.customerId}</span>
          </div>
        </div>

        {/* Progress Grid */}
        <div className="p-8 pt-12 text-center">
          <p className="text-gray-500 font-medium mb-8">Show this screen ID to the cashier to earn your points</p>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-5 mb-10">
            {pointDots}
          </div>

          <div className={`rounded-2xl p-6 border transition-colors ${userDoc.rewardAvailable ? 'bg-green-50 border-green-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
            {userDoc.rewardAvailable ? (
              <div className="flex flex-col items-center">
                <Gift className={`w-12 h-12 mx-auto mb-3 ${requested ? 'text-gray-400' : 'text-green-500 animate-pulse'}`} />
                <h3 className={`text-2xl font-black text-center mb-1 ${requested ? 'text-gray-600' : 'text-green-600'}`}>
                  {requested ? 'Request Sent!' : 'Reward Ready!'}
                </h3>
                <p className={`font-medium mb-4 ${requested ? 'text-gray-600' : 'text-green-800'}`}>
                  {card.rewardDescription}
                </p>
                {requested ? (
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-xl flex items-center text-sm font-semibold text-gray-700 shadow-sm w-full justify-center">
                    <CheckCircle className="w-5 h-5 text-indigo-500 mr-2" />
                    Waiting for Shop Approval
                  </div>
                ) : (
                  <button onClick={handleRedeem} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-200 transition-all w-full flex justify-center items-center">
                    Request Redemption
                  </button>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-indigo-900 mb-1">
                  {totalPoints - currentPoints} points to go!
                </h3>
                <p className="text-indigo-700/80 font-medium text-sm">Reward: {card.rewardDescription}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer info */}
        {shop.address && (
           <div className="bg-gray-50/80 px-4 py-5 border-t border-gray-100 flex items-center justify-center text-gray-500 font-medium text-sm">
             <MapPin className="w-5 h-5 mr-2 text-indigo-400" />
             {shop.address}
           </div>
        )}
      </div>
      
      {deferredPrompt && (
        <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-5 w-full max-w-md flex items-center justify-between shadow-sm">
           <div>
             <h4 className="font-bold text-indigo-900 border-b-0 pb-0">Install Loyalty App</h4>
             <p className="text-xs text-indigo-700/80 font-medium mt-0.5">Add to home screen</p>
           </div>
           <button onClick={handleInstallClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow shadow-indigo-200 transition-colors">
             Install
           </button>
        </div>
      )}

      <p className="text-center text-gray-400 mt-8 font-semibold text-xs uppercase tracking-widest">Lightweight Loyalty</p>

      {/* Password Reset Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
              <button onClick={()=>setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
              </div>
              <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                {pwdMsg && <div className={`p-3 rounded-lg text-sm font-semibold text-center ${pwdMsg.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{pwdMsg}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
                  <input type="password" required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={pwdForm.old} onChange={e=>setPwdForm({...pwdForm, old: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={pwdForm.new} onChange={e=>setPwdForm({...pwdForm, new: e.target.value})} />
                </div>
                <button disabled={pwdLoading} className="w-full mt-4 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition">
                  {pwdLoading ? 'Updating...' : 'Save Password'}
                </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
