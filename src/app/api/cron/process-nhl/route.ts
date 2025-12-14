import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const NHL_API_BASE = 'https://api-web.nhle.com/v1';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. SECURITY
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const log = [];

    // --- PART A: UPDATE STANDINGS (Wins/Losses) ---
    // (Keep this existing logic to keep records fresh)
    const standingsRes = await fetch(`${NHL_API_BASE}/standings/now`);
    const standingsData = await standingsRes.json();

    for (const teamNode of standingsData.standings) {
      const ticker = teamNode.teamAbbrev.default;
      await supabase.from('teams').update({ 
          wins: teamNode.wins, 
          losses: teamNode.losses, 
          otl: teamNode.otLosses 
      }).eq('ticker', ticker);
    }

    // --- PART B: PROCESS RECENT GAMES (PAYOUTS) ---
    // We check "today" (live/recent games) instead of "yesterday"
    const todayStr = new Date().toISOString().split('T')[0];
    const scoreRes = await fetch(`${NHL_API_BASE}/score/${todayStr}`);
    const scoreData = await scoreRes.json();

    for (const game of scoreData.games) {
        // 1. Check if game is Final
        if (game.gameState === 'OFF' || game.gameState === 'FINAL') {
            const gameId = String(game.id);

            // 2. IDEMPOTENCY CHECK: Have we processed this game already?
            const { data: existing } = await supabase
                .from('processed_games')
                .select('game_id')
                .eq('game_id', gameId)
                .single();

            if (existing) continue; // Skip if already paid

            // 3. Determine Winner
            const home = game.homeTeam;
            const away = game.awayTeam;
            let winnerTicker = null;
            
            if (home.score > away.score) winnerTicker = home.abbrev;
            else if (away.score > home.score) winnerTicker = away.abbrev;

            if (winnerTicker) {
                // 4. Pay Winner
                const { data: teamData } = await supabase
                    .from('teams')
                    .select('id, name')
                    .eq('ticker', winnerTicker)
                    .eq('league', 'NHL')
                    .single();

                if (teamData) {
                    await supabase.rpc('simulate_win', { p_team_id: teamData.id });
                    log.push(`Paid out: ${teamData.name} (${winnerTicker})`);
                }
            }

            // 5. MARK AS PROCESSED (Important: Do this even if it was a tie, so we don't re-check)
            await supabase.from('processed_games').insert({ game_id: gameId, league: 'NHL' });
        }
    }

    return NextResponse.json({ success: true, updates: log });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}