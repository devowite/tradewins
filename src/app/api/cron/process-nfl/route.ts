import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// ONE-WAY MAP: ESPN Ticker -> Your DB Ticker
const TICKER_MAP: Record<string, string> = {
    'WAS': 'WSH', // ESPN sends WAS -> We update WSH
    'LA': 'LAR',  // ESPN sends LA -> We update LAR
    'JAC': 'JAX', // Just in case ESPN sends JAC -> We update JAX
    // Note: If ESPN sends 'JAX', it stays 'JAX' (which matches your DB)
};

export const dynamic = 'force-dynamic'; 

export async function GET(request: Request) {
  // 1. Setup Admin Client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const log: string[] = [];

  try {
    const res = await fetch(ESPN_SCOREBOARD);
    const data = await res.json();
    const games = data.events || [];

    log.push(`Found ${games.length} games.`);

    for (const event of games) {
      const competition = event.competitions[0];
      const isCompleted = event.status.type.completed;
      
      // --- PART 1: PROCESS TEAMS (Records) ---
      for (const competitor of competition.competitors) {
        let ticker = competitor.team.abbreviation;
        const rawTicker = ticker; // Keep original for logging

        // APPLY MAP
        if (TICKER_MAP[ticker]) {
            ticker = TICKER_MAP[ticker];
        }

        // DEBUG: Explicitly log the problem teams
        if (['WAS', 'WSH', 'LA', 'LAR', 'JAX', 'JAC'].includes(rawTicker)) {
             console.log(`[NFL CRON] Found ${rawTicker}. Mapped to: ${ticker}`);
        }

        // 1. Get Record (e.g. "12-1-0")
        const recordObj = competitor.records?.find((r: any) => r.name === 'overall');
        const recordString = recordObj ? recordObj.summary : '0-0-0';
        
        const parts = recordString.split('-');
        const wins = parseInt(parts[0]) || 0;
        const losses = parseInt(parts[1]) || 0;
        const ties = parseInt(parts[2]) || 0;

        // 2. Update DB
        const { error } = await supabaseAdmin
            .from('teams')
            .update({ wins, losses, otl: ties })
            .eq('ticker', ticker)
            .eq('league', 'NFL');
            
        if (error) {
            log.push(`Error updating ${ticker}: ${error.message}`);
        }
      }

      // --- PART 2: PROCESS PAYOUTS ---
      if (isCompleted) {
        const winner = competition.competitors.find((c: any) => c.winner === true);
        if (winner) {
            let winnerTicker = winner.team.abbreviation;
            if (TICKER_MAP[winnerTicker]) winnerTicker = TICKER_MAP[winnerTicker];

            const { data: teamData } = await supabaseAdmin
                .from('teams')
                .select('id, name')
                .eq('ticker', winnerTicker)
                .eq('league', 'NFL')
                .single();

            if (teamData) {
                const { error } = await supabaseAdmin.rpc('simulate_win', { p_team_id: teamData.id });
                if (!error) log.push(`PAYOUT SUCCESS: ${teamData.name}`);
            }
        }
      }
    }

    return NextResponse.json({ success: true, logs: log });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}