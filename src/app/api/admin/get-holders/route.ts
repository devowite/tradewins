import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Service Role Key to bypass RLS completely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { teamId } = await request.json();

    // 1. Fetch Holdings
    const { data: holdings, error: hError } = await supabaseAdmin
      .from('holdings')
      .select('user_id, shares_owned')
      .eq('team_id', teamId)
      .gt('shares_owned', 0);

    if (hError) throw hError;
    if (!holdings || holdings.length === 0) return NextResponse.json({ holders: [] });

    // 2. Fetch Profiles (Admin access ensures we see them)
    const userIds = holdings.map((h: any) => h.user_id);
    const { data: profiles, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username')
      .in('id', userIds);

    if (pError) throw pError;

    // 3. Merge Data
    const result = holdings.map((h: any) => {
        const profile = profiles?.find((p: any) => p.id === h.user_id);
        return {
            shares_owned: h.shares_owned,
            // Fallback logic
            user_display: profile?.username || profile?.email || 'Unknown User'
        };
    }).sort((a: any, b: any) => b.shares_owned - a.shares_owned);

    return NextResponse.json({ holders: result });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}