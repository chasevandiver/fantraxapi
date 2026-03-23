import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const FANTRAX_BASE = 'https://www.fantrax.com/fxea/general'
const KEEPERS = ['Bryce Harper','Jhoan Duran','Bryan Woo','Eugenio Suarez','Brandon Woodruff','Shane Bieber']

const LEAGUE_CONTEXT = `
LEAGUE: 10-team H2H 5x5 on Fantrax — Pete Rose's Fantasy League
HITTING CATS: R, HR, RBI, OPS, SB  (OPS not OBP — hard requirement)
PITCHING CATS: K, W, SV, ERA, WHIP
No catcher position slot — catchers valued on offense only, zero positional premium
SS carries positional scarcity premium
Snake draft, 28 rounds, Chase picks 7th
KEEPERS: Bryce Harper (R8), Jhoan Duran (R6), Bryan Woo (R9), Eugenio Suarez (R13), Brandon Woodruff (R18), Shane Bieber (R25)
KNOWN WEAK CATEGORY: SB
CURRENT ROSTER INCLUDES: Garrett Crochet, Michael King, Trevor Rogers, Edward Cabrera, Mason Miller, Zach Neto, Nick Kurtz, Ozzie Albies, Colson Montgomery (SS/CHW everyday starter), Addison Barger, Wilyer Abreu, Andy Pages, Heliot Ramos, Daulton Varsho, Caleb Durbin, Jorge Polanco, Abner Uribe
`

async function fantraxGet(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${FANTRAX_BASE}/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 0 }
  })
  if (!res.ok) throw new Error(`Fantrax ${endpoint} failed: ${res.status}`)
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const { secretId, question, manualData } = await req.json()
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })

    let contextBlock = ''

    if (manualData) {
      contextBlock = `PASTED DATA FROM FANTRAX:\n${manualData}`
    } else {
      if (!secretId) return NextResponse.json({ error: 'secretId required' }, { status: 400 })

      const leaguesData = await fantraxGet('getLeagues', { userSecretId: secretId })
      const leagues = leaguesData.leagues || []
      if (!leagues.length) throw new Error('No leagues found for this Secret ID')
      const leagueId = leagues[0].id
      const leagueName = leagues[0].name

      const [leagueInfo, rostersData, standingsData] = await Promise.all([
        fantraxGet('getLeagueInfo', { leagueId }),
        fantraxGet('getTeamRosters', { leagueId }),
        fantraxGet('getStandings', { leagueId }),
      ])

      const rosteredIds = new Set<string>()
      let myTeam: any = null
      for (const [, tdata] of Object.entries(rostersData.rosters || {}) as any[]) {
        const items: any[] = tdata.rosterItems || []
        items.forEach((p: any) => rosteredIds.add(p.playerId))
        if (!myTeam && tdata.teamName?.toLowerCase().includes('pete rose')) myTeam = tdata
      }

      const pool = leagueInfo.playerPool?.players || {}
      const available = Object.entries(pool)
        .filter(([pid]) => !rosteredIds.has(pid))
        .map(([, p]: any) => ({ name: p.name, pos: p.position, team: p.teamAbbrev, score: p.score || 0, adp: p.adp || 999 }))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 50)

      const myRoster = (myTeam?.rosterItems || []).map((p: any) => ({
        name: p.playerName, pos: p.position, team: p.teamAbbrev,
        slot: p.lineupStatus, status: p.injuryStatus || 'Active',
        keeper: KEEPERS.includes(p.playerName),
      }))

      const standings = (standingsData.standings?.rows || []).map((r: any) => ({
        rank: r.rank, team: r.teamName, W: r.wins, L: r.losses, pct: r.winPct,
      }))

      contextBlock = `
LEAGUE: ${leagueName}

MY ROSTER:
${JSON.stringify(myRoster, null, 2)}

STANDINGS:
${JSON.stringify(standings, null, 2)}

TOP AVAILABLE (waiver wire):
${JSON.stringify(available, null, 2)}
`
    }

    const client = new Anthropic({ apiKey: anthropicKey })
    const userMsg = `${contextBlock}

${question || 'Give me a full daily briefing: lineup decisions (who starts vs sits and why), top 3-5 waiver wire adds with specific reasoning prioritizing SB needs first then SP depth then best value, category outlook for this week, and flags like injuries, streaming SPs, or trends I should know about. Be direct and specific.'}`

    const message = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1500,
      system: `You are War Room 2026, an expert fantasy baseball analyst. ${LEAGUE_CONTEXT} Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
      messages: [{ role: 'user', content: userMsg }]
    })

    return NextResponse.json({ briefing: (message.content[0] as any).text })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
