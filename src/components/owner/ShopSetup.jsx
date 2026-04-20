import React, { useState } from 'react';
import { createOrUpdateShop } from '../../services/ownerService';
import { Coffee, Star, Utensils, Scissors, Heart, ShoppingBag, Award } from 'lucide-react';

const ICONS = [
  { id: 'coffee', icon: Coffee },
  { id: 'star', icon: Star },
  { id: 'utensils', icon: Utensils },
  { id: 'scissors', icon: Scissors },
  { id: 'heart', icon: Heart },
  { id: 'bag', icon: ShoppingBag },
  { id: 'award', icon: Award }
];

export default function ShopSetup({ user, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', address: '', phone: '',
    cardTitle: 'Loyalty points', totalPoints: 5, rewardDescription: 'Free Coffee', iconType: 'coffee'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createOrUpdateShop(user.uid, formData);
      onComplete();
    } catch (err) {
      console.error(err);
      alert('Failed to setup shop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 card-container mt-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Setup Your Shop & Loyalty Program</h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Business Details</h3>
          <input className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Shop Name" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}/>
          <input className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Address" required value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})}/>
          <input className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Phone Number" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})}/>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Loyalty Rules</h3>
          <input className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Card Title (e.g. Coffee Club)" required value={formData.cardTitle} onChange={e=>setFormData({...formData, cardTitle: e.target.value})}/>
          <input type="number" min="1" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Total Points Needed (e.g. 10)" required value={formData.totalPoints} onChange={e=>setFormData({...formData, totalPoints: e.target.value})}/>
          <input className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Reward Description (e.g. 1 Free Drink)" required value={formData.rewardDescription} onChange={e=>setFormData({...formData, rewardDescription: e.target.value})}/>
          
          <div className="mt-4">
            <label className="text-sm font-semibold text-gray-700 block mb-2">Card Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map(i => {
                const Icon = i.icon;
                return (
                  <button 
                    type="button" 
                    key={i.id} 
                    onClick={() => setFormData({...formData, iconType: i.id})}
                    className={`p-3 rounded-xl border-2 transition-all ${formData.iconType === i.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <button disabled={loading} type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-lg hover:bg-indigo-700 transition-colors shadow shadow-indigo-200">
          {loading ? 'Saving Layout...' : 'Launch Loyalty Program'}
        </button>
      </form>
    </div>
  );
}
