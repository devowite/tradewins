'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login/Signup

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // SIGN UP
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) alert(error.message);
      else {
        alert('Account created! You are logged in.');
        router.push('/'); // Redirect to Dashboard
      }
    } else {
      // LOG IN
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(error.message);
      else {
        router.push('/'); // Redirect to Dashboard
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] to-[#432818] flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
            <div className="h-20 w-auto mb-4 flex items-center justify-center">
                <img 
                    src="/logo.png" 
                    alt="Tradium Logo" 
                    className="h-full w-full object-contain drop-shadow-lg" 
                />
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome to Tradium</h1>
            <p className="text-gray-400 text-sm">The Live Sports Stock Market</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="you@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* TOGGLE */}
        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}