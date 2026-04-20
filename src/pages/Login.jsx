import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mt-20 p-8 card-container mx-auto">
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
          {isSignUp ? <UserPlus size={32} /> : <LogIn size={32} />}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isSignUp ? 'Create Owner Account' : 'Shop Owner Login'}
        </h1>
        <p className="text-gray-500 mt-2">Manage your loyalty program</p>
      </div>

      <div className="flex border-b mb-6 border-gray-200">
        <button 
          type="button"
          className={`flex-1 py-3 text-center font-semibold transition-all ${!isSignUp ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}
          onClick={() => setIsSignUp(false)}
        >
          Sign In
        </button>
        <button 
          type="button"
          className={`flex-1 py-3 text-center font-semibold transition-all ${isSignUp ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}
          onClick={() => setIsSignUp(true)}
        >
          Sign Up
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input 
            type="email" 
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input 
            type="password" 
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50"
        >
          {loading ? 'Processing...' : (isSignUp ? 'Register' : 'Sign In')}
        </button>
      </form>
    </div>
  );
}
