import { NextResponse } from 'next/server';

const ESPN_NFL_STANDINGS = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings';

export const dynamic = 'force-dynamic'; 

export async function GET(request: Request) {
  const log: string[] = [];
  
  try {
    const res = await fetch(ESPN_NFL_STANDINGS);
    const data = await res.json();
    
    // X-RAY DIAGNOSTICS
    // We walk down the tree and log what keys exist at each step.
    
    // 1. Root Level
    log.push(`Root Keys: ${Object.keys(data).join(', ')}`);
    
    const conferences = data.children || [];
    if (conferences.length === 0) {
        log.push("CRITICAL: 'children' array (conferences) is empty.");
        return NextResponse.json({ success: false, logs: log });
    }

    // 2. Conference Level (e.g., AFC)
    const firstConf = conferences[0];
    log.push(`Conf[0] Name: ${firstConf.name}`);
    log.push(`Conf[0] Keys: ${Object.keys(firstConf).join(', ')}`);

    const divisions = firstConf.children || [];
    if (divisions.length === 0) {
        log.push("CRITICAL: 'children' array (divisions) is empty.");
        return NextResponse.json({ success: false, logs: log });
    }

    // 3. Division Level (e.g., AFC East)
    const firstDiv = divisions[0];
    log.push(`Div[0] Name: ${firstDiv.name}`);
    log.push(`Div[0] Keys: ${Object.keys(firstDiv).join(', ')}`);
    
    // CHECKPOINT: Does 'standings' exist here?
    if (!firstDiv.standings) {
        log.push("CRITICAL: 'standings' object is MISSING on Division object.");
        // Sometimes it's directly in 'children' for simpler structures?
    } else {
        const entries = firstDiv.standings.entries || [];
        log.push(`Entries Count: ${entries.length}`);
        
        if (entries.length > 0) {
            // 4. Team Entry Level
            const firstTeam = entries[0];
            log.push(`Team[0] Keys: ${Object.keys(firstTeam).join(', ')}`);
            
            // CHECKPOINT: Does 'stats' exist?
            if (firstTeam.stats) {
                log.push(`Stats Array Length: ${firstTeam.stats.length}`);
                if (firstTeam.stats.length > 0) {
                    log.push(`Stat[0] Keys: ${Object.keys(firstTeam.stats[0]).join(', ')}`);
                    log.push(`Stat[0] Sample: ${JSON.stringify(firstTeam.stats[0])}`);
                }
            } else {
                log.push("CRITICAL: 'stats' array is MISSING on Team Entry.");
            }
        }
    }

    return NextResponse.json({ success: true, logs: log });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}