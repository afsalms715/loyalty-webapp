import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { searchCustomerByIdOrName, addPointToCustomer, approveRedemption, createNewProgramVersion } from '../../services/ownerService';
import { Search, PlusCircle, Gift, Check, Clock, Settings, Coffee, Star, Utensils, Scissors, Heart, ShoppingBag, Award } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const ICONS = [
  { id: 'coffee', icon: Coffee },
  { id: 'star', icon: Star },
  { id: 'utensils', icon: Utensils },
  { id: 'scissors', icon: Scissors },
  { id: 'heart', icon: Heart },
  { id: 'bag', icon: ShoppingBag },
  { id: 'award', icon: Award }
];

export default function DashboardView({ shop }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    cardTitle: shop.cardData?.title || 'Loyalty points',
    totalPoints: shop.cardData?.totalPoints || 5,
    rewardDescription: shop.cardData?.rewardDescription || 'Free Item',
    iconType: shop.cardData?.iconType || 'coffee'
  });
  
  const posterRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, 'redemptionRequests'),
      where('shopId', '==', shop.shopId),
      where('approved', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [shop.shopId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;
    setLoading(true);
    try {
      const results = await searchCustomerByIdOrName(shop.shopId, searchTerm);
      setCustomers(results);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddPoint = async (customerId, current, total) => {
    if (!window.confirm("Add 1 point to this customer?")) return;
    await addPointToCustomer(customerId, current, total);
    const results = await searchCustomerByIdOrName(shop.shopId, searchTerm);
    setCustomers(results);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm("This will create a new Active Program Version. Existing customers will remain on their legacy program. Continue?")) return;
    try {
      await createNewProgramVersion(shop.shopId, editForm);
      window.location.reload(); // Refresh the active program from ShopDashboard
    } catch (err) {
      console.error(err);
      alert('Failed to update program version');
    }
  };

  const handleApprove = async (reqId, custDocId) => {
    try {
      await approveRedemption(reqId, custDocId);
      // Refresh search results in case the approved customer is in the current search view
      if (searchTerm) {
        const results = await searchCustomerByIdOrName(shop.shopId, searchTerm);
        setCustomers(results);
      }
    } catch (err) {
      console.error("Failed to approve redemption", err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!posterRef.current) return;
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${shop.name.replace(/\s+/g, '_')}_Loyalty_Poster.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF: " + err.message);
    }
  };

  const joinUrl = `${window.location.origin}/join/${shop.shopId}`;

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left Column: QR and Shop Info */}
      <div className="md:col-span-1 space-y-6">
        <div className="card-container p-8 text-center flex flex-col items-center relative">
          <button 
             onClick={() => setIsEditing(true)} 
             className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 p-2 rounded-full text-gray-600 transition-colors"
             title="Create New Version"
          >
             <Settings className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{shop.name}</h2>
          <p className="text-indigo-600 font-medium mb-6 uppercase tracking-wide text-sm">
            {shop.cardData?.title} <span className="text-xs text-gray-400 normal-case ml-1 font-normal">(Active)</span>
          </p>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center mb-6 w-full">
            <QRCodeSVG value={joinUrl} size={180} className="mb-4" />
            <div className="w-full bg-gray-50 border border-gray-200 rounded-lg flex items-center overflow-hidden mb-3">
               <input readOnly value={joinUrl} className="text-xs text-gray-500 bg-transparent flex-1 p-2 outline-none w-full truncate" />
               <button 
                 onClick={() => navigator.clipboard.writeText(joinUrl)} 
                 className="bg-indigo-100 text-indigo-700 px-3 py-2.5 text-xs font-bold hover:bg-indigo-200 transition-colors border-l border-indigo-200"
               >
                 Copy
               </button>
            </div>
            <button 
              onClick={handleDownloadPDF}
              className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Download Poster (PDF)
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 w-full text-left">
            <div className="flex items-center text-gray-700 mb-2">
              <Gift className="w-5 h-5 mr-2 text-indigo-500" />
              <span className="font-semibold">Reward at {shop.cardData?.totalPoints} points</span>
            </div>
            <p className="text-sm text-gray-500 pl-7">{shop.cardData?.rewardDescription}</p>
          </div>
        </div>

        {/* Pending Redemptions Widget */}
        {pendingRequests.length > 0 && (
          <div className="card-container p-6 border-l-4 border-yellow-400">
             <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
               <Clock className="w-5 h-5 mr-2 text-yellow-500" /> Action Required
             </h3>
             <div className="space-y-3">
               {pendingRequests.map(req => (
                 <div key={req.id} className="bg-white border rounded-lg p-4 shadow-sm">
                   <p className="font-bold text-gray-900">{req.username}</p>
                   <p className="text-xs text-gray-500 mb-3">ID: {req.customerId}</p>
                   <button 
                     onClick={() => handleApprove(req.id, req.customerDocId)}
                     className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors"
                   >
                     <Check className="w-4 h-4 mr-1" /> Approve Reward
                   </button>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
      
      {/* Right Column: Customer Search & Add Points */}
      <div className="md:col-span-2 space-y-6">
        <div className="card-container p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Search className="mr-2" /> Find Customer & Add Points
          </h3>
          <form onSubmit={handleSearch} className="flex gap-3 mb-8">
            <input 
              className="flex-1 bg-gray-50 border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all" 
              placeholder="Enter User ID or Username" 
              value={searchTerm} 
              onChange={e=>setSearchTerm(e.target.value)}
            />
            <button type="submit" className="bg-indigo-600 text-white px-8 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="space-y-4">
            {customers.map(c => (
              <div key={c.id} className="border border-gray-100 bg-white p-5 rounded-xl flex justify-between items-center shadow-sm hover:shadow transition-shadow">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className="font-bold text-xl text-gray-900">{c.username}</p>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">ID: {c.customerId}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-gray-600 font-medium text-sm">
                      {c.currentPoints} of {c.targetPoints || shop.cardData?.totalPoints} points
                    </p>
                    {c.rewardAvailable && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                        Reward Ready!
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleAddPoint(c.id, c.currentPoints, c.targetPoints || shop.cardData?.totalPoints)}
                  disabled={c.rewardAvailable}
                  className="flex items-center bg-green-500 text-white px-5 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <PlusCircle className="mr-2 w-5 h-5" /> Add Point
                </button>
              </div>
            ))}
            
            {customers.length === 0 && !loading && searchTerm && (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500 font-medium text-lg">No customers found.</p>
                <p className="text-sm text-gray-400 mt-1">Try another User ID or username.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
             <div className="p-6 bg-gray-50 border-b border-gray-100">
               <h3 className="text-xl font-bold text-gray-900">New Program Version</h3>
               <p className="text-sm text-gray-500 mt-1">Updates apply only to new customers.</p>
             </div>
             <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
               <div>
                 <label className="text-sm font-semibold text-gray-700 block mb-1">Card Title</label>
                 <input className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required value={editForm.cardTitle} onChange={e=>setEditForm({...editForm, cardTitle: e.target.value})}/>
               </div>
               <div>
                 <label className="text-sm font-semibold text-gray-700 block mb-1">Total Points Needed</label>
                 <input type="number" min="1" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required value={editForm.totalPoints} onChange={e=>setEditForm({...editForm, totalPoints: e.target.value})}/>
               </div>
               <div>
                 <label className="text-sm font-semibold text-gray-700 block mb-1">Reward Description</label>
                 <input className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required value={editForm.rewardDescription} onChange={e=>setEditForm({...editForm, rewardDescription: e.target.value})}/>
               </div>
               
               <div>
                 <label className="text-sm font-semibold text-gray-700 block mb-2">Card Icon</label>
                 <div className="flex gap-2 flex-wrap">
                   {ICONS.map(i => {
                     const Icon = i.icon;
                     return (
                       <button 
                         type="button" 
                         key={i.id} 
                         onClick={() => setEditForm({...editForm, iconType: i.id})}
                         className={`p-3 rounded-xl border-2 transition-all ${editForm.iconType === i.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}
                       >
                         <Icon className="w-6 h-6" />
                       </button>
                     )
                   })}
                 </div>
               </div>

               <div className="flex gap-3 pt-4 border-t border-gray-100">
                 <button type="button" onClick={()=>setIsEditing(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                 <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow shadow-indigo-200">Save Version</button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Hidden layout exactly formatted for A4 PDF extraction */}
      <div style={{ position: 'fixed', left: '-2000px', top: 0, zIndex: -100 }}>
        <div ref={posterRef} style={{ backgroundColor: '#ffffff', borderColor: '#4f46e5' }} className="w-[800px] h-[1131px] p-16 text-center flex flex-col items-center justify-center font-sans border-8 box-border">
          <div className="flex flex-col items-center mb-12">
            <Gift className="w-24 h-24 mb-6" style={{ color: '#4f46e5' }} />
            <h1 style={{ color: '#111827' }} className="text-6xl font-black mb-4 leading-tight">{shop.name}</h1>
            <h2 style={{ color: '#4f46e5' }} className="text-3xl font-bold uppercase tracking-widest">{shop.cardData?.title}</h2>
          </div>
          
          <div style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }} className="p-12 rounded-3xl border-2 flex flex-col items-center mb-12 w-full max-w-xl mx-auto shadow-sm">
             <QRCodeCanvas value={joinUrl} size={350} className="mb-10" />
             <p style={{ color: '#1f2937' }} className="text-4xl font-extrabold">Scan to Join!</p>
             <p style={{ color: '#6b7280' }} className="text-xl font-medium mt-3">Open your camera to unlock rewards</p>
          </div>
          
          <div style={{ backgroundColor: '#eef2ff', borderColor: '#e0e7ff' }} className="flex flex-col items-center p-8 rounded-2xl w-full max-w-xl mx-auto border">
             <span style={{ color: '#312e81' }} className="font-extrabold text-xl uppercase tracking-widest mb-2">The Reward</span>
             <p style={{ color: '#4338ca' }} className="text-3xl font-black text-center leading-snug">
               {shop.cardData?.rewardDescription}
             </p>
             <p style={{ color: '#6366f1', backgroundColor: '#ffffff' }} className="text-lg font-bold mt-4 px-4 py-1 rounded-full shadow-sm">
               after {shop.cardData?.totalPoints} points
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
