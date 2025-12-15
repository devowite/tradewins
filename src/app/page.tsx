'use client';

import Link from 'next/link';
import { ArrowRight, TrendingUp, Trophy, Shield, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] to-[#432818] text-white flex flex-col">
      
      {/* NAVBAR */}
      <nav className="w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center">
                <img src="/logo.png" alt="TradeWins" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight">TradeWins</span>
        </div>
        <div className="flex gap-4">
            <Link href="/login">
                <button className="px-5 py-2 font-bold text-sm text-gray-300 hover:text-white transition">
                    Log In
                </button>
            </Link>
            <Link href="/login">
                <button className="px-5 py-2 bg-white text-[#1a0b2e] font-bold text-sm rounded-full hover:bg-gray-200 transition shadow-lg shadow-white/10">
                    Get Started
                </button>
            </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-10 mb-20">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-blue-300 mb-6 shadow-xl">
            The Future of Sports Betting
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight max-w-4xl tracking-tight">
            Don't Just Bet. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Invest in the Game.
            </span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
            TradeWins is the first live sports stock market. Buy shares in your favorite NFL & NHL teams, earn dividends when they win, and trade your way to the top.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
             <Link href="/login" className="flex-1">
                <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 group">
                    Start Trading <ArrowRight className="group-hover:translate-x-1 transition" size={20} />
                </button>
             </Link>
        </div>

        {/* FEATURE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-6xl w-full text-left px-4">
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/5 transition duration-300 group">
                <div className="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                    <TrendingUp className="text-green-400" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">Live Trading</h3>
                <p className="text-gray-400 leading-relaxed">
                    Buy and sell team stocks in real-time. Prices fluctuate based on performance, demand, and game results.
                </p>
            </div>

            <div className="bg-black/20 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/5 transition duration-300 group">
                <div className="h-12 w-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                    <Trophy className="text-yellow-400" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">Win Dividends</h3>
                <p className="text-gray-400 leading-relaxed">
                    Every time your team wins, you get paid. Hold shares to collect recurring cash payouts from the dividend bank.
                </p>
            </div>

            <div className="bg-black/20 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/5 transition duration-300 group">
                <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                    <Users className="text-purple-400" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">Competing Market</h3>
                <p className="text-gray-400 leading-relaxed">
                    Compete against other traders. Market caps are determined by supply and demand, not fixed odds.
                </p>
            </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm">
        <p>&copy; {new Date().getFullYear()} TradeWins. All rights reserved.</p>
      </footer>
    </div>
  );
}