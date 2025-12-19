'use client';

import { HelpCircle } from 'lucide-react';
import CountUp from 'react-countup';

interface MarketStatsProps {
  marketCap: number;
  volume24hShares: number;
  volume24hDollars: number;
  avgYield: number;
  totalBank: number;
}

export default function MarketStats({ marketCap, volume24hShares, volume24hDollars, avgYield, totalBank }: MarketStatsProps) {
  
  // Helper to render a clean stat item
  // UPDATED: Now accepts 'rawValue' (number) and formatting props for CountUp
  const StatItem = ({ label, rawValue, prefix = '', decimals = 0, subtext, color, isPrimary, tooltip }: any) => (
    <div className={`flex flex-col justify-center px-4 relative group cursor-help ${isPrimary ? 'items-start min-w-[180px]' : 'items-start min-w-[140px]'}`}>
      
      {/* Label */}
      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
        {label}
        <HelpCircle size={10} className="text-gray-700 group-hover:text-gray-500 transition" />
      </div>

      {/* Value (Wrapped in CountUp) */}
      <div className={`font-mono font-bold leading-none ${isPrimary ? `text-3xl ${color || 'text-white'}` : `text-xl text-gray-300`}`}>
        <CountUp 
            end={rawValue} 
            prefix={prefix} 
            separator="," 
            decimals={decimals} 
            duration={1.5} 
            preserveValue={true}
        />
        <span className="text-sm text-gray-600 font-sans font-normal ml-1">{subtext}</span>
      </div>

      {/* Tooltip Popup */}
      <div className="hidden group-hover:block absolute top-full left-0 mt-2 w-48 p-3 bg-gray-950 border border-white/10 rounded-lg shadow-xl text-xs text-gray-400 z-50 pointer-events-none">
        {tooltip}
      </div>
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-y-6 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/5 p-6 mb-10 shadow-lg justify-between">
      
      {/* 1. Market Cap (Primary) */}
      <StatItem 
        label="Market Cap" 
        rawValue={marketCap}
        prefix="$"
        color="text-white"
        isPrimary={true} 
        tooltip="The total dollar value of all shares currently owned by players."
      />

      {/* Vertical Divider */}
      <div className="w-px h-10 bg-white/10 hidden md:block"></div>

      {/* 2. Total Dividend Pot (Primary) */}
      <StatItem 
        label="Total Dividend Pot" 
        rawValue={totalBank}
        prefix="$"
        color="text-yellow-400"
        isPrimary={true} 
        tooltip="Total sum of all outstanding dividends, waiting to be paid out to winners."
      />

      <div className="w-px h-10 bg-white/10 hidden md:block"></div>

      {/* 3. Volume Shares */}
      <StatItem 
        label="24h Volume" 
        rawValue={volume24hShares}
        subtext="shares"
        tooltip="Total number of shares bought or sold in the last 24 hours."
      />

      <div className="w-px h-10 bg-white/10 hidden md:block"></div>

      {/* 4. Volume Dollars */}
      <StatItem 
        label="24h Value" 
        rawValue={volume24hDollars}
        prefix="$"
        tooltip="Total USD value of all trades executed in the last 24 hours."
      />

      <div className="w-px h-10 bg-white/10 hidden md:block"></div>

      {/* 5. Avg Yield */}
      <StatItem 
        label="Avg. Yield" 
        rawValue={avgYield}
        prefix="$"
        decimals={2}
        color="text-green-400"
        tooltip="The weighted average payout per share across the entire market."
      />

    </div>
  );
}