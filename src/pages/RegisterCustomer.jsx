import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { registerCustomer, loginCustomer, getShopCardInfo } from '../services/customerService';
import { UserPlus, LogIn, Store } from 'lucide-react';

export default function RegisterCustomer() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shopInfo, setShopInfo] = useState(null);
  
  const [form, setForm] = useState({ username: '', password: '', emailPhone: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const info = await getShopCardInfo(shopId);
      if (!info) {
        setError("Invalid Shop Link.");
        setLoading(false);
        return;
      }
      setShopInfo(info);
      
      const stored = localStorage.getItem(`loyaltyAuth_${shopId}`);
      if (stored) {
        try {
          const { username, password } = JSON.parse(stored);
          const userDoc = await loginCustomer(shopId, username, password);
          navigate(`/loyalty/${shopId}`, { state: { userDoc } });
          return;
        } catch (err) {
          localStorage.removeItem(`loyaltyAuth_${shopId}`);
        }
      }
      setLoading(false);
    };
    init();
  }, [shopId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let userDoc;
      if (isLogin) {
        userDoc = await loginCustomer(shopId, form.username, form.password);
      } else {
        userDoc = await registerCustomer(shopId, form.username, form.password, form.emailPhone);
      }
      navigate(`/loyalty/${shopId}`, { state: { userDoc } });
    } catch (err) {
      setError(err.message || "Authentication failed. Try another username or check bounds.");
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!shopInfo) return <div className="text-center p-10 text-red-500 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-indigo-600 p-8 text-center text-white relative">
          <Store className="w-12 h-12 mx-auto mb-4 opacity-100 text-indigo-100" />
          <h1 className="text-3xl font-extrabold tracking-tight">{shopInfo.shop.name}</h1>
          <p className="opacity-90 mt-2 font-medium">Join loyalty program to earn rewards</p>
        </div>
        
        <div className="p-8">
          <div className="flex border-b border-gray-200 mb-8">
            <button 
              type="button"
              className={`flex-1 py-3 text-center font-bold transition-all ${!isLogin ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
            <button 
              type="button"
              className={`flex-1 py-3 text-center font-bold transition-all ${isLogin ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => setIsLogin(true)}
            >
              Log In
            </button>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm text-center font-semibold">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input 
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400 text-gray-800" 
                placeholder="Username (e.g. john123)" 
                required 
                value={form.username} 
                onChange={e=>setForm({...form, username: e.target.value.toLowerCase()})}
              />
            </div>
            
            {!isLogin && (
              <div>
                <input 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400 text-gray-800" 
                  placeholder="Phone or Email (Optional)" 
                  value={form.emailPhone} 
                  onChange={e=>setForm({...form, emailPhone: e.target.value})}
                />
              </div>
            )}
            
            <div>
              <input 
                type="password"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400 text-gray-800" 
                placeholder="Password" 
                required 
                value={form.password} 
                onChange={e=>setForm({...form, password: e.target.value})}
              />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold mx-auto mt-8 py-4 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 text-lg disabled:opacity-70 disabled:shadow-none">
              {loading ? 'Please wait...' : (isLogin ? <><LogIn className="mr-2" /> Activate Account</> : <><UserPlus className="mr-2" /> Join Program</>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
