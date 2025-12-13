'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, DollarSign, AlertCircle, Lock } from 'lucide-react';

interface TradeModalProps {
  team: any;
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSuccess?: () => void;
}

export default function TradeModal({ team, isOpen, onClose, userId, onSuccess }: TradeModalProps) {
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState<number>(0); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [userShares, setUserShares] = useState(0);

  // --- MARKET SECURITY STATE ---
  const [marketStatus, setMarketStatus] = useState<'OPEN' | 'CLOSED' | 'LOADING'>('LOADING');
  const [marketMessage, setMarketMessage] = useState('');

  // 1. Calculate Price 
  const currentPrice = 10.00 + (team.shares_outstanding * 0.01);

  // 2. Fetch Data (On Open)
  useEffect(() => {
    if (isOpen && userId) {
      setAmount(0);
      setError(null);
      fetchUserData();
      checkMarketStatus();
    }
  }, [isOpen, userId, team]);

  const fetchUserData = async () => {
    const { data: userData } = await supabase.from('users').select('usd_balance').eq('id', userId).single();
    if (userData) setUserBalance(userData.usd_balance);

    const { data: shareData } = await supabase.from('holdings').select('shares_owned').eq('user_id', userId).eq('team_id', team.id).maybeSingle();
    if (shareData) setUserShares(shareData.shares_owned);
    else setUserShares(0);
  };

  // --- SECURITY CHECK: PREVENT EXPLOIT ---
  const checkMarketStatus = async () => {
    setMarketStatus('LOADING');
    try {
        let sport = 'football/nfl';
        if (team.league === 'NHL') sport = 'hockey/nhl';

        // 1. Calculate Dates: Get Yesterday and Today in YYYYMMDD format
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const formatDate = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');
        const datesParam = `${formatDate(yesterday)}-${formatDate(today)}`; // Range: "20231212-20231213"

        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/scoreboard?dates=${datesParam}`;

        const res = await fetch(scoreboardUrl);
        const data = await res.json();
        const events = data.events || [];

        // 2. Find ANY games involving this team (Yesterday OR Today)
        const relevantGames = events.filter((e: any) => {
            return e.competitions[0].competitors.some((c: any) => {
                const t = c.team.abbreviation;
                return t === team.ticker || 
                       (t === 'WAS' && team.ticker === 'WSH') ||
                       (t === 'JAC' && team.ticker === 'JAX') ||
                       (t === 'LA' && team.ticker === 'LAR') ||
                       (t === 'TB' && team.ticker === 'TBL') ||
                       (t === 'SJ' && team.ticker === 'SJS') ||
                       (t === 'NJ' && team.ticker === 'NJD') ||
                       (t === 'MON' && team.ticker === 'MTL') ||
                       (t === 'UTA' && team.ticker === 'UTAH');
            });
        });

        // 3. Analyze Status
        let isClosed = false;
        let message = '';
        const currentHour = new Date().getHours(); // 0-23

        for (const game of relevantGames) {
            const state = game.status.type.state; // 'pre', 'in', 'post'
            const gameDateStr = game.date; // ISO string
            const gameDate = new Date(gameDateStr);
            const isGameToday = gameDate.getDate() === today.getDate();

            if (state === 'in') {
                isClosed = true;
                message = 'Market Closed: Game in Progress';
                break;
            }
            
            if (state === 'post') {
                // Game Finished. 
                // IF it was Today: Close it.
                // IF it was Yesterday: Close it ONLY if it's early morning (before 6 AM)
                if (isGameToday) {
                    isClosed = true;
                    message = 'Market Closed: Game Finished (Payout Pending)';
                    break;
                } else {
                    // It was yesterday. Is it safe yet?
                    // We assume Cron runs at 4 AM. We give a buffer until 6 AM.
                    if (currentHour < 6) {
                        isClosed = true;
                        message = 'Market Closed: Pending Overnight Payout';
                        break;
                    }
                }
            }
        }

        if (isClosed) {
            setMarketStatus('CLOSED');
            setMarketMessage(message);
        } else {
            setMarketStatus('OPEN');
        }

    } catch (e) {
        console.error("Market Check Error", e);
        setMarketStatus('OPEN'); 
    }
  };

  const calculateTotal = () => {
    if (!amount) return 0;
    return amount * currentPrice; 
  };

  const handleExecute = async () => {
    if (!userId || amount <= 0) return;
    setLoading(true);
    setError(null);

    try {
      const totalCost = calculateTotal();

      if (mode === 'BUY') {
        if (marketStatus === 'CLOSED') {
            throw new Error("Market is closed for this team.");
        }
        if (totalCost > userBalance) {
          throw new Error(`Insufficient funds. You need $${totalCost.toFixed(2)}`);
        }
        
        const { error } = await supabase.rpc('buy_shares', {
          p_user_id: userId,
          p_team_id: team.id,
          p_amount: amount,
          p_price: currentPrice
        });
        if (error) throw error;

      } else {
        if (amount > userShares) {
          throw new Error(`You only have ${userShares} shares.`);
        }

        const { error } = await supabase.rpc('sell_shares', {
          p_user_id: userId,
          p_team_id: team.id,
          p_amount: amount
        });
        if (error) throw error;
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-gray-900">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {team.name} <span className="text-gray-500 text-sm font-normal">({team.ticker})</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-gray-400">
                    Current Price: <span className="text-white font-bold">${currentPrice.toFixed(2)}</span>
                </span>
                
                {marketStatus === 'CLOSED' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">
                        <Lock size={10} /> MARKET CLOSED
                    </span>
                ) : marketStatus === 'OPEN' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">
                        MARKET OPEN
                    </span>
                ) : (
                    <span className="text-[10px] text-gray-500 animate-pulse">Checking Status...</span>
                )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition p-1 hover:bg-gray-800 rounded-full">
            <X size={24} />
          </button>
        </div>

        {/* MARKET CLOSED WARNING */}
        {marketStatus === 'CLOSED' && mode === 'BUY' && (
            <div className="bg-red-500/10 border-b border-red-500/20 p-3 flex items-start gap-3">
                <AlertCircle className="text-red-400 shrink-0" size={18} />
                <p className="text-xs text-red-200 leading-relaxed">
                    <strong>Trading Suspended:</strong> {marketMessage}. <br/>
                    Buying is disabled until the daily payout process completes (approx 6 AM ET).
                </p>
            </div>
        )}

        {/* BODY */}
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-2 gap-2 bg-gray-800 p-1 rounded-lg">
            <button 
              onClick={() => setMode('BUY')}
              disabled={marketStatus === 'CLOSED'} 
              className={`py-2 text-sm font-bold rounded-md transition-all ${
                mode === 'BUY' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              } ${marketStatus === 'CLOSED' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Buy
            </button>
            <button 
              onClick={() => setMode('SELL')}
              className={`py-2 text-sm font-bold rounded-md transition-all ${
                mode === 'SELL' 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Sell
            </button>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>{mode === 'BUY' ? 'Buying' : 'Selling'} Amount</span>
                <span>
                    {mode === 'BUY' 
                        ? `Balance: $${userBalance.toFixed(2)}`
                        : `Owned: ${userShares} Shares`
                    }
                </span>
             </div>

             <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="number" 
                  min="1"
                  value={amount || ''}
                  onChange={(e) => setAmount(Math.floor(Number(e.target.value)))}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl py-4 pl-10 pr-4 text-white text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                  placeholder="0"
                  disabled={marketStatus === 'CLOSED' && mode === 'BUY'}
                />
             </div>
             
             <div className="flex gap-2">
                {[1, 5, 10, 25, 50].map((num) => (
                    <button 
                        key={num}
                        onClick={() => setAmount(num)}
                        disabled={marketStatus === 'CLOSED' && mode === 'BUY'}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-1.5 rounded border border-gray-700 transition"
                    >
                        {num}
                    </button>
                ))}
             </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 space-y-2 border border-gray-700/50">
             <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price per share</span>
                <span className="text-white font-mono">${currentPrice.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total {mode === 'BUY' ? 'Cost' : 'Value'}</span>
                <span className={`font-mono font-bold text-lg ${mode === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    ${calculateTotal().toFixed(2)}
                </span>
             </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-1">
                <AlertCircle size={16} />
                {error}
            </div>
          )}

          <button
            onClick={handleExecute}
            disabled={loading || amount <= 0 || (marketStatus === 'CLOSED' && mode === 'BUY')}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg active:scale-[0.98] ${
                loading ? 'bg-gray-700 text-gray-500 cursor-wait' :
                (marketStatus === 'CLOSED' && mode === 'BUY') ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' :
                mode === 'BUY' ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' :
                'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'
            }`}
          >
            {loading ? 'Processing...' : (
                marketStatus === 'CLOSED' && mode === 'BUY' ? 'MARKET CLOSED' :
                `Confirm ${mode} ($${calculateTotal().toFixed(2)})`
            )}
          </button>

        </div>
      </div>
    </div>
  );
}