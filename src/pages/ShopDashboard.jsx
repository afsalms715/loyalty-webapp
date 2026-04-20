import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getShopProfile } from '../services/ownerService';
import ShopSetup from '../components/owner/ShopSetup';
import DashboardView from '../components/owner/DashboardView';

export default function ShopDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getShopProfile(currentUser.uid);
      setShop(data);
    } catch (err) {
      console.error('Error fetching shop profile:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else {
      fetchProfile();
    }
  }, [currentUser, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg mr-3 flex items-center justify-center text-white font-bold text-lg">
            L
          </div>
          <h1 className="font-extrabold text-xl text-gray-900 tracking-tight">Loyalty Manager</h1>
        </div>
        <button 
          onClick={logout} 
          className="text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors px-3 py-2 rounded-md hover:bg-red-50"
        >
          Sign Out
        </button>
      </header>
      
      <main className="flex-1 w-full flex p-6 pb-20">
        <div className="w-full">
          {!shop ? (
            <ShopSetup user={currentUser} onComplete={fetchProfile} />
          ) : (
            <DashboardView shop={shop} />
          )}
        </div>
      </main>
    </div>
  );
}
