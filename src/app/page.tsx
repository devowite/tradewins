'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation'; 
import { LayoutGrid, Briefcase, User, Trophy, CircleDollarSign, ArrowUpDown, LogOut, Shield } from 'lucide-react';
import TeamCard from './components/TeamCard';
import TradeModal from './components/TradeModal';
import MarketStats from './components/MarketStats';
import Portfolio from './components/Portfolio';
import Profile from './components/Profile';
import WalletModal from './components/WalletModal';

export default function Home() {
  const router = useRouter();

  // --- STATE ---
  const [teams, setTeams] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null); 
  const [holdings, setHoldings] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  // NEW: State to store Live Scores
  const [gameData, setGameData] = useState<Record<string, any>>({});

  // Market Stats State
  const [marketStats, setMarketStats] = useState({
    marketCap: 0,
    volume24hShares: 0,
    volume24hDollars: 0,
    avgYield: 0,
    totalBank: 0
  });

  // Navigation & Sort State
  const [activeTab, setActiveTab] = useState<'MARKETS' | 'PORTFOLIO' | 'PROFILE'>('MARKETS');
  const [selectedLeague, setSelectedLeague] = useState<'NHL' | 'NBA' | 'NFL' | 'MLB'>('NHL');
  const [sortBy, setSortBy] = useState<'NAME' | 'PRICE' | 'YIELD' | 'CHANGE'>('NAME');

  // --- 1. AUTH CHECK & DATA FETCHING ---
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profile) {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }
      
      if (profile) setUser(profile);

      // Fetch ALL teams (NHL + NFL)
      const { data: teamData } = await supabase.from('teams').select('*').order('name');
      if (teamData) {
        setTeams(teamData);
      }

      const { data: holdingsData } = await supabase
        .from('holdings')
        .select('team_id, shares_owned')
        .eq('user_id', session.user.id);
        
      const holdingsMap: Record<number, number> = {};
      if (holdingsData) {
        holdingsData.forEach((h: any) => holdingsMap[h.team_id] = h.shares_owned);
      }
      setHoldings(holdingsMap);
      
      setLoading(false);
    };

    initSession();
  }, [router]);

  // --- 2. FETCH LIVE SCORES (WITH NIGHT OWL LOGIC) ---
  useEffect(() => {
    const fetchLiveScores = async () => {
        try {
            let sportPath = 'hockey/nhl';
            if(selectedLeague === 'NFL') sportPath = 'football/nfl';

            const now = new Date();
            const currentHour = now.getHours(); // 0-23
            const isEarlyMorning = currentHour < 6; // true if 12:00 AM - 5:59 AM

            let url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`;
            
            // LOGIC A: If Early Morning, fetch Yesterday + Today
            if (isEarlyMorning) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                const formatDate = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');
                url += `?dates=${formatDate(yesterday)}-${formatDate(now)}`;
            } 
            // LOGIC B: If Daytime, just fetch standard (Today/Next) - No params needed

            const res = await fetch(url);
            const data = await res.json();
            
            const mapping: Record<string, any> = {};
            let sortedEvents = data.events || [];

            // SORTING PRIORITY:
            if (isEarlyMorning) {
                // STRATEGY: We want Yesterday to overwrite Today in the map.
                // 1. Sort Newest (Today) to Oldest (Yesterday).
                // 2. Loop processes Today first, then Yesterday.
                // 3. Map key gets overwritten by Yesterday's data. Result: Yesterday Shows.
                sortedEvents.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            } else {
                // STRATEGY: We want Today to overwrite Yesterday (cleanup).
                // 1. Sort Oldest to Newest.
                // 2. Loop processes Yesterday first, then Today.
                // 3. Map key gets overwritten by Today. Result: Today Shows.
                sortedEvents.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }

            sortedEvents.forEach((event: any) => {
                const competition = event.competitions[0];
                const status = event.status.type.state; // 'pre', 'in', 'post'
                const clock = event.status.displayClock;
                const period = event.status.period;
                const startTime = new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                // Safety: If it's daytime, don't show old final scores from yesterday if API returns them
                const eventDate = new Date(event.date);
                if (!isEarlyMorning && eventDate.getDate() < now.getDate() && status === 'post') {
                    return; 
                }

                competition.competitors.forEach((c: any) => {
                   const myTicker = c.team.abbreviation;
                   const opponent = competition.competitors.find((o: any) => o.id !== c.id);
                   
                   mapping[myTicker] = {
                       status,
                       clock: status === 'in' ? `P${period} ${clock}` : status,
                       startTime,
                       score: c.score,
                       opponent: opponent.team.abbreviation,
                       opponentScore: opponent.score
                   };

                   // Ticker Normalization
                   if(myTicker === 'WSH') mapping['WAS'] = mapping['WSH'];
                   if(myTicker === 'JAX') mapping['JAC'] = mapping['JAX'];
                   if(myTicker === 'LAR') mapping['LA'] = mapping['LAR'];
                   if(myTicker === 'TBL') mapping['TB'] = mapping['TBL'];
                   if(myTicker === 'SJS') mapping['SJ'] = mapping['SJS'];
                   if(myTicker === 'NJD') mapping['NJ'] = mapping['NJD'];
                   if(myTicker === 'MTL') mapping['MON'] = mapping['MTL'];
                   if(myTicker === 'UTAH') mapping['UTA'] = mapping['UTAH'];
                });
            });

            setGameData(mapping);
        } catch (e) {
            console.error("ESPN Fetch Error", e);
        }
    };

    if(activeTab === 'MARKETS') {
        fetchLiveScores();
        const interval = setInterval(fetchLiveScores, 30000);
        return () => clearInterval(interval);
    }

  }, [selectedLeague, activeTab]);

  // --- STATS CALCULATION HELPER ---
  const calculateMarketStats = async (leagueTeams: any[]) => {
    let totalCap = 0;
    let totalBank = 0;
    let totalSupply = 0;

    leagueTeams.forEach(t => {
      const price = 10.00 + (t.shares_outstanding * 0.01);
      totalCap += price * t.shares_outstanding;
      totalBank += t.dividend_bank;
      totalSupply += t.shares_outstanding;
    });

    const avgYield = totalSupply > 0 ? (totalBank * 0.50) / totalSupply : 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const teamIds = leagueTeams.map(t => t.id);
    
    if (teamIds.length === 0) {
        setMarketStats({
            marketCap: totalCap,
            totalBank: totalBank,
            avgYield: avgYield,
            volume24hShares: 0,
            volume24hDollars: 0
        });
        return;
    }
    
    const { data: volumeData } = await supabase
        .from('transactions')
        .select('shares_amount, usd_amount')
        .gte('created_at', yesterday.toISOString())
        .in('team_id', teamIds); 
    
    let volShares = 0;
    let volDollars = 0;

    if (volumeData) {
        volumeData.forEach(tx => {
            volShares += tx.shares_amount;
            volDollars += tx.usd_amount;
        });
    }

    setMarketStats({
        marketCap: totalCap,
        totalBank: totalBank,
        avgYield: avgYield,
        volume24hShares: volShares,
        volume24hDollars: volDollars
    });
  };
  
  useEffect(() => {
    if (teams.length > 0) {
        const leagueTeams = teams.filter(t => t.league === selectedLeague);
        calculateMarketStats(leagueTeams);
    }
  }, [selectedLeague, teams]);

  // RELOAD DATA HELPER
  const reloadData = async () => {
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) setUser(profile);

    const { data: holdingsData } = await supabase.from('holdings').select('team_id, shares_owned').eq('user_id', user.id);
    const holdingsMap: Record<number, number> = {};
    if (holdingsData) holdingsData.forEach((h: any) => holdingsMap[h.team_id] = h.shares_owned);
    setHoldings(holdingsMap);
    
    const { data: teamData } = await supabase.from('teams').select('*').order('name');
    if (teamData) {
        setTeams(teamData);
    }
  };

  const handleSimulateWin = async (teamId: number, teamName: string) => {
    if (!user?.is_admin) return;
    if (!confirm(`ADMIN: Simulate a WIN for ${teamName}?`)) return;
    const { data, error } = await supabase.rpc('simulate_win', { p_team_id: teamId });
    if (!error) {
      alert(`PAYOUT SUCCESS!\nTotal Distributed: $${data.payout_total.toFixed(2)}`);
      reloadData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- SORTING & FILTERING ---
  const currentLeagueTeams = teams.filter(t => t.league === selectedLeague);

  const getSortedTeams = (teamList: any[]) => {
    return [...teamList].sort((a, b) => {
        if (sortBy === 'NAME') return a.name.localeCompare(b.name);
        if (sortBy === 'PRICE' || sortBy === 'CHANGE') {
            return b.shares_outstanding - a.shares_outstanding;
        }
        if (sortBy === 'YIELD') {
            const yieldA = a.shares_outstanding > 0 ? (a.dividend_bank * 0.5) / a.shares_outstanding : 0;
            const yieldB = b.shares_outstanding > 0 ? (b.dividend_bank * 0.5) / b.shares_outstanding : 0;
            return yieldB - yieldA;
        }
        return 0;
    });
  };

  const allOwned = currentLeagueTeams.filter(t => (holdings[t.id] || 0) > 0);
  const allUnowned = currentLeagueTeams.filter(t => (holdings[t.id] || 0) === 0);
  const sortedOwned = getSortedTeams(allOwned);
  const sortedUnowned = getSortedTeams(allUnowned);

  const activeLeagues = ['NHL', 'NFL'];

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-20 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-6 gap-8 z-20 justify-between">
        <div className="flex flex-col items-center gap-8 w-full">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Trophy size={20} className="text-white" />
            </div>
            <nav className="flex flex-col gap-6 w-full px-2">
                <button onClick={() => setActiveTab('MARKETS')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${activeTab === 'MARKETS' ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                    <LayoutGrid size={24} /> <span className="text-[10px] font-bold">Markets</span>
                </button>
                <button onClick={() => setActiveTab('PORTFOLIO')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${activeTab === 'PORTFOLIO' ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Briefcase size={24} /> <span className="text-[10px] font-bold">Portfolio</span>
                </button>
                <button onClick={() => setActiveTab('PROFILE')} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition ${activeTab === 'PROFILE' ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                    <User size={24} /> <span className="text-[10px] font-bold">Profile</span>
                </button>
                {user?.is_admin && (
                    <button 
                        onClick={() => router.push('/admin')}
                        className="p-3 rounded-xl flex flex-col items-center gap-1 transition bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:text-white mt-4 border border-red-900/50"
                    >
                        <Shield size={24} /> <span className="text-[10px] font-bold">Admin</span>
                    </button>
                )}
            </nav>
        </div>
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-red-400 transition group" title="Sign Out">
            <div className="p-2 rounded-lg group-hover:bg-red-900/20 transition"><LogOut size={20} /></div>
            <span className="text-[9px] font-bold uppercase tracking-wide">Logout</span>
        </button>
      </aside>

      {/* MARKETS SUB-SIDEBAR */}
      {activeTab === 'MARKETS' && (
        <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-10">
            <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold">Markets</h2>
                <p className="text-sm text-gray-500">Select a league</p>
            </div>
            <div className="p-4 space-y-2">
                {['NHL', 'NFL', 'NBA', 'MLB'].map((league) => (
                    <button
                        key={league}
                        onClick={() => setSelectedLeague(league as any)}
                        disabled={!activeLeagues.includes(league)}
                        className={`w-full text-left px-4 py-3 rounded-lg font-bold flex justify-between items-center transition ${
                            selectedLeague === league 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : activeLeagues.includes(league)
                                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                : 'bg-transparent text-gray-700 cursor-not-allowed'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            {league === 'NHL' && (
                                <img 
                                    src="https://assets.nhle.com/logos/nhl/svg/NHL_light.svg" 
                                    alt="NHL" 
                                    className="h-6 w-6 object-contain" 
                                />
                            )}
                            {league === 'NFL' && (
                                <img 
                                    src="https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg" 
                                    alt="NFL" 
                                    className="h-6 w-6 object-contain" 
                                />
                            )}
                            
                            {league}
                        </div>
                        {!activeLeagues.includes(league) && <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-500">SOON</span>}
                    </button>
                ))}
            </div>
        </aside>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="h-16 border-b border-gray-800 flex justify-between items-center px-8 bg-gray-900/50 backdrop-blur shrink-0">
            <div className="flex items-center gap-6">
                <h2 className="text-lg font-bold text-gray-200">
                    {activeTab === 'MARKETS' ? `${selectedLeague} Market` : activeTab}
                </h2>
                {activeTab === 'MARKETS' && (
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1 border border-gray-700">
                        <span className="text-xs text-gray-500 font-bold px-2 flex items-center gap-1">
                            <ArrowUpDown size={12} /> Sort:
                        </span>
                        {(['NAME', 'PRICE', 'YIELD', 'CHANGE'] as const).map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setSortBy(opt)}
                                className={`text-[10px] font-bold px-3 py-1 rounded transition ${
                                    sortBy === opt 
                                    ? 'bg-gray-700 text-white shadow' 
                                    : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {opt === 'NAME' ? 'A-Z' : opt === 'PRICE' ? 'Price' : opt === 'CHANGE' ? '24h %' : 'Win/Share'}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <div 
                onClick={() => setIsWalletOpen(true)}
                className="flex items-center gap-3 bg-gray-800 px-4 py-2 rounded-full border border-gray-700 cursor-pointer hover:bg-gray-700 transition"
            >
                <CircleDollarSign size={16} className="text-green-400" />
                <span className="font-mono font-bold text-green-400">${user ? user.usd_balance.toFixed(2) : '---'}</span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
            
            {activeTab === 'PORTFOLIO' ? (
                <Portfolio 
                    user={user} 
                    holdings={holdings} 
                    teams={teams} 
                />
            ) : activeTab === 'PROFILE' ? (
                <Profile 
                    user={user} 
                    onOpenWallet={() => setIsWalletOpen(true)}
                    onReload={reloadData}
                />
            ) : activeTab === 'MARKETS' ? (
                loading ? <p>Loading Data...</p> : (
                    <div className="space-y-6">
                        <MarketStats 
                            marketCap={marketStats.marketCap}
                            volume24hShares={marketStats.volume24hShares}
                            volume24hDollars={marketStats.volume24hDollars}
                            avgYield={marketStats.avgYield}
                            totalBank={marketStats.totalBank}
                        />
                        {sortedOwned.length > 0 && (
                            <div>
                                <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Briefcase size={16} /> Your Portfolio
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                    {sortedOwned.map((team) => (
                                        <TeamCard 
                                            key={team.id}
                                            team={team}
                                            myShares={holdings[team.id]}
                                            onTrade={setSelectedTeam}
                                            onSimWin={user?.is_admin ? handleSimulateWin : undefined}
                                            userId={user?.id}
                                            liveGame={gameData[team.ticker]} // ADDED: Passing live score data
                                        />
                                    ))}
                                </div>
                                <div className="h-px bg-gray-800 w-full my-8"></div>
                            </div>
                        )}
                        <div>
                            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4">Explore Market ({sortedUnowned.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                {sortedUnowned.map((team) => (
                                    <TeamCard 
                                        key={team.id}
                                        team={team}
                                        myShares={0}
                                        onTrade={setSelectedTeam}
                                        onSimWin={user?.is_admin ? handleSimulateWin : undefined}
                                        userId={user?.id}
                                        liveGame={gameData[team.ticker]} // ADDED: Passing live score data
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <Briefcase size={48} className="mb-4 opacity-20" />
                    <p className="text-lg">This section is under construction.</p>
                </div>
            )}
        </div>
      </div>

      {selectedTeam && (
        <TradeModal 
            team={selectedTeam} 
            isOpen={true} 
            userId={user?.id}
            userBalance={user?.usd_balance || 0}
            userShares={holdings[selectedTeam.id] || 0}
            onClose={() => setSelectedTeam(null)} 
            onSuccess={reloadData} 
        />
      )}

      {isWalletOpen && user && (
        <WalletModal 
            balance={user.usd_balance}
            onClose={() => setIsWalletOpen(false)}
            onSuccess={reloadData}
        />
      )}
    </div>
  );
}