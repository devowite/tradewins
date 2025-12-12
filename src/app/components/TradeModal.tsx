'use client';
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function TradeModal({ team, userBalance, userShares, onClose, onConfirm }: any) {
  const [amount, setAmount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY'); 

  // --- MATH ENGINE ---
  const SLOPE = 0.01;
  const BASE_PRICE = 10.00;
  const RESERVE_RATIO = 0.85; 

  // 1. Spot Price (Current Price)
  const currentSpotPrice = BASE_PRICE + (team.shares_outstanding * SLOPE);

  // 2. Buy Calculation
  const buyEndPrice = BASE_PRICE + ((team.shares_outstanding + amount) * SLOPE);
  const buyAvgPrice = (currentSpotPrice + buyEndPrice) / 2;
  const buyTotalCost = buyAvgPrice * amount;

  // 3. Sell Calculation
  const sellEndPrice = BASE_PRICE + ((team.shares_outstanding - amount) * SLOPE);
  const sellAvgPrice = (currentSpotPrice + sellEndPrice) / 2;
  const sellGross = sellAvgPrice * amount;
  const sellPayout = sellGross * RESERVE_RATIO; 

  // --- VALIDATION ---
  const canAffordBuy = userBalance >= buyTotalCost;
  const hasEnoughShares = userShares >= amount;
  const isValid = mode === 'BUY' ? canAffordBuy : hasEnoughShares;
  const isSellValid = amount <= team.shares_outstanding;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    if (mode === 'SELL' && !isSellValid) return;

    setIsSubmitting(true);
    await onConfirm(amount, mode);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl w-full max-w-md p-6 shadow-2xl relative overflow-visible">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">✕</button>

        {/* HEADER & TOGGLE */}
        <div className="flex border-b border-gray-700 mb-6">
            <button 
                onClick={() => setMode('BUY')}
                className={`flex-1 py-3 font-bold text-center transition ${mode === 'BUY' ? 'text-green-400 border-b-2 border-green-400 bg-green-900/10' : 'text-gray-500 hover:text-gray-300'}`}
            >
                BUY
            </button>
            <button 
                onClick={() => setMode('SELL')}
                className={`flex-1 py-3 font-bold text-center transition ${mode === 'SELL' ? 'text-red-400 border-b-2 border-red-400 bg-red-900/10' : 'text-gray-500 hover:text-gray-300'}`}
            >
                SELL
            </button>
        </div>

        <h2 className="text-2xl font-bold mb-1">{mode} {team.name}</h2>
        <p className="text-gray-400 text-sm mb-6">
            ${team.ticker} • Price: <span className={mode === 'BUY' ? 'text-green-400' : 'text-red-400'}>${currentSpotPrice.toFixed(2)}</span>
            <span className="mx-2">•</span>
            Owned: {userShares}
        </p>

        {/* INPUT */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <label className="text-sm text-gray-400">Shares to {mode.toLowerCase()}</label>
            
            {/* SELL ALL BUTTON */}
            {mode === 'SELL' && (
                <button 
                    onClick={() => setAmount(userShares)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 underline"
                >
                    Sell All (Max: {userShares})
                </button>
            )}
          </div>
          
          <input 
            type="number" 
            min="1"
            max={mode === 'SELL' ? userShares : undefined}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:border-blue-500 font-mono text-lg"
          />
        </div>

        {/* RECEIPT PREVIEW */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6 space-y-2 text-sm">
          {mode === 'BUY' ? (
            <>
                <div className="flex justify-between">
                    <span className="text-gray-400">Est. Cost</span>
                    <span className="font-mono text-white">${buyTotalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">New Balance</span>
                    <span className={`font-mono ${canAffordBuy ? 'text-gray-300' : 'text-red-500'}`}>
                    ${(userBalance - buyTotalCost).toFixed(2)}
                    </span>
                </div>
            </>
          ) : (
            <>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 group relative cursor-help">
                        <span className="text-gray-400 border-b border-dotted border-gray-600">Est. Payout</span>
                        <HelpCircle size={14} className="text-gray-500 hover:text-white transition" />
                        
                        {/* TOOLTIP POPUP */}
                        <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-64 p-3 bg-black border border-gray-700 rounded shadow-xl text-xs text-gray-300 z-50">
                            <p className="mb-1 text-white font-bold">Why is this lower?</p>
                            To guarantee instant liquidity, the Sell Price is based on the Reserve Pool (85% of spot value). The remaining 15% remains in the Dividend Bank to pay winners.
                        </div>
                    </div>
                    
                    <span className="font-mono text-green-400 font-bold text-lg">${sellPayout.toFixed(2)}</span>
                </div>
            </>
          )}
        </div>

        {/* ACTION BUTTON */}
        <button 
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className={`w-full py-3 rounded-lg font-bold transition ${
            !isValid 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : mode === 'BUY'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {isSubmitting ? 'Processing...' : !isValid ? (mode === 'BUY' ? 'Insufficient Funds' : 'Insufficient Shares') : `Confirm ${mode}`}
        </button>

      </div>
    </div>
  );
}