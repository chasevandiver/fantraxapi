'use client'
import { useState } from 'react'

const s = {
  page: { maxWidth: 720, margin: '0 auto', padding: '24px 16px', minHeight: '100vh' } as React.CSSProperties,
  header: { marginBottom: 28 } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: '#f0f0f0', letterSpacing: '-0.5px' } as React.CSSProperties,
  sub: { fontSize: 13, color: '#666', margin: 0 } as React.CSSProperties,
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '20px 20px' } as React.CSSProperties,
  label: { fontSize: 12, color: '#666', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 8, display: 'block' },
  input: { width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#f0f0f0', boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'monospace' },
  textarea: { width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f0f0f0', boxSizing: 'border-box' as const, outline: 'none', resize: 'vertical' as const, minHeight: 140, fontFamily: 'monospace' },
  btnPrimary: { background: '#e8ff47', color: '#0f0f0f', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.2px' } as React.CSSProperties,
  btnGhost: { background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({ background: active ? '#e8ff47' : 'transparent', color: active ? '#0f0f0f' : '#666', border: '1px solid', borderColor: active ? '#e8ff47' : '#2a2a2a', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer' }),
  error: { background: '#1a0a0a', border: '1px solid #3a1a1a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#f87171', marginTop: 12 } as React.CSSProperties,
  warn: { background: '#1a1500', border: '1px solid #3a3000', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#fbbf24', marginTop: 12 } as React.CSSProperties,
  loading: { textAlign: 'center' as const, padding: '48px 0', color: '#555', fontSize: 14 },
  briefingWrap: { marginTop: 16 } as React.CSSProperties,
  briefingText: { fontSize: 14, lineHeight: 1.8, color: '#d0d0d0' } as React.CSSProperties,
  h2: { fontSize: 15, fontWeight: 600, color: '#e8ff47', margin: '20px 0 8px' } as React.CSSProperties,
  pill: { display: 'inline-block', background: '#222', border: '1px solid #333', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#888', marginRight: 6 } as React.CSSProperties,
  followRow: { display: 'flex', gap: 8, marginTop: 16 } as React.CSSProperties,
  followInput: { flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#f0f0f0', outline: 'none' } as React.CSSProperties,
  divider: { borderTop: '1px solid #2a2a2a', margin: '20px 0' } as React.CSSProperties,
}

function renderBriefing(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />
    const boldified = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f0f0f0">$1</strong>')
    if (/^#{1,3} /.test(line)) {
      return <p key={i} style={s.h2} dangerouslySetInnerHTML={{ __html: line.replace(/^#{1,3} /, '') }} />
    }
    if (/^\d+\./.test(line)) {
      return <p key={i} style={{ ...s.briefingText, fontWeight: 600, color: '#e8ff47', margin: '16px 0 4px' }} dangerouslySetInnerHTML={{ __html: boldified }} />
    }
    if (/^[-•]/.test(line)) {
      return <p key={i} style={{ ...s.briefingText, margin: '3px 0 3px 12px', paddingLeft: 12, borderLeft: '2px solid #2a2a2a' }} dangerouslySetInnerHTML={{ __html: boldified.replace(/^[-•]\s*/, '') }} />
    }
    return <p key={i} style={{ ...s.briefingText, margin: '4px 0' }} dangerouslySetInnerHTML={{ __html: boldified }} />
  })
}

export default function Home() {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [secretId, setSecretId] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [briefing, setBriefing] = useState('')
  const [error, setError] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [savedData, setSavedData] = useState<any>(null)

  const fetchBriefing = async (question?: string) => {
    setStatus('loading')
    setError('')
    if (!question) setBriefing('')
    try {
      const body = mode === 'auto'
        ? { secretId, question }
        : { manualData: pastedText, question }
      const res = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed')
      setBriefing(data.briefing)
      setSavedData(body)
      setStatus('done')
    } catch (e: any) {
      setError(e.message)
      setStatus('error')
    }
  }

  const handleFollowUp = async () => {
    if (!followUp.trim()) return
    const q = followUp
    setFollowUp('')
    await fetchBriefing(q)
  }

  const ready = mode === 'auto' ? secretId.trim().length > 0 : pastedText.trim().length > 0
  const loading = status === 'loading'

  return (
    <div style={s.page}>
      <div style={s.header}>
        <p style={s.title}>War Room 2026</p>
        <p style={s.sub}>Pete Rose's Fantasy League · H2H 5×5 OPS · 10 teams</p>
      </div>

      {(status === 'idle' || status === 'error') && (
        <div style={s.card}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button style={s.tab(mode === 'auto')} onClick={() => setMode('auto')}>Auto-fetch</button>
            <button style={s.tab(mode === 'manual')} onClick={() => setMode('manual')}>Paste data</button>
          </div>

          {mode === 'auto' ? (
            <>
              <label style={s.label}>Fantrax Secret ID</label>
              <input style={s.input} type="text" placeholder="e.g. 24pscnquxwekzngy" value={secretId} onChange={e => setSecretId(e.target.value)} />
              <p style={{ fontSize: 12, color: '#555', marginTop: 8, marginBottom: 16 }}>Found on your Fantrax profile page</p>
              <button style={{ ...s.btnPrimary, opacity: ready ? 1 : 0.4 }} onClick={() => fetchBriefing()} disabled={!ready}>Get today's briefing →</button>
            </>
          ) : (
            <>
              <label style={s.label}>Paste Fantrax data</label>
              <textarea style={s.textarea} placeholder="Paste your roster, available players list, standings — any Fantrax data. Claude knows your league format." value={pastedText} onChange={e => setPastedText(e.target.value)} />
              <div style={{ height: 12 }} />
              <button style={{ ...s.btnPrimary, opacity: ready ? 1 : 0.4 }} onClick={() => fetchBriefing()} disabled={!ready}>Analyze →</button>
            </>
          )}

          {status === 'error' && (
            <div style={s.error}>{error}</div>
          )}
        </div>
      )}

      {loading && (
        <div style={s.loading}>
          <p>{savedData ? 'Analyzing...' : 'Fetching from Fantrax...'}</p>
        </div>
      )}

      {status === 'done' && briefing && (
        <>
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #2a2a2a' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>War Room Daily Briefing</p>
              </div>
              <button style={s.btnGhost} onClick={() => { setStatus('idle'); setBriefing('') }}>New</button>
            </div>
            <div style={s.briefingWrap}>{renderBriefing(briefing)}</div>
          </div>

          <div style={s.followRow}>
            <input
              style={s.followInput}
              type="text"
              placeholder="Ask a follow-up — trade target, specific player, lineup question..."
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && followUp.trim() && handleFollowUp()}
            />
            <button style={{ ...s.btnPrimary, opacity: followUp.trim() && !loading ? 1 : 0.4 }} onClick={handleFollowUp} disabled={!followUp.trim() || loading}>Ask</button>
          </div>

          {status === 'error' && <div style={s.error}>{error}</div>}
        </>
      )}
    </div>
  )
}
