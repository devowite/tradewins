import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// ONE-WAY MAP: ESPN Ticker -> Your DB Ticker
const TICKER_MAP: Record<string, string> = {
    'WAS': 'WSH',
    'LA': 'LAR',
    'JAC': 'JAX',
};

export const dynamic = 'force-dynamic'; 

export async function GET(request: Request) {
  // 1. Setup Admin Client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Security Check (Optional but recommended if exposed)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const log: string[] = [];

  try {
    const res = await fetch(ESPN_SCOREBOARD);
    const data = await res.json();
    const games = data.events || [];

    for (const event of games) {
      const competition = event.competitions[0];
      const isCompleted = event.status.type.completed;
      const gameId = String(event.id);

      // --- PART 1: PROCESS TEAMS (Records) --- 
      // (This is safe to run repeatedly as it just updates stats)
      for (const competitor of competition.competitors) {
        let ticker = competitor.team.abbreviation;
        if (TICKER_MAP[ticker]) ticker = TICKER_MAP[ticker];

        const recordObj = competitor.records?.find((r: any) => r.name === 'overall');
        const recordString = recordObj ? recordObj.summary : '0-0-0';
        const parts = recordString.split('-');
        
        await supabaseAdmin
            .from('teams')
            .update({ wins: parseInt(parts[0])||0, losses: parseInt(parts[1])||0, otl: parseInt(parts[2])||0 })
            .eq('ticker', ticker)
            .eq('league', 'NFL');
      }

      // --- PART 2: PROCESS PAYOUTS (IDEMPOTENT) ---
      if (isCompleted) {
        // A. CHECK MEMORY
        const { data: existing } = await supabaseAdmin
            .from('processed_games')
            .select('game_id')
            .eq('game_id', gameId)
            .single();

        if (!existing) {
            // B. FIND WINNER
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
                    await supabaseAdmin.rpc('simulate_win', { p_team_id: teamData.id });
                    log.push(`PAYOUT SUCCESS: ${teamData.name}`);
                }
            }
            
            // C. REMEMBER GAME
            await supabaseAdmin.from('processed_games').insert({ game_id: gameId, league: 'NFL' });
        }
      }
    }

    return NextResponse.json({ success: true, logs: log });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}