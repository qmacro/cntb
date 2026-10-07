import { useState, useEffect } from 'react'
import { get, post, action } from '../api'

function fmt(dt) { return dt ? new Date(dt).toLocaleString() : '—' }

const TH = ({ children }) => <th style={{ textAlign: 'left', padding: '8px 12px', background: '#f0f0f0', borderBottom: '2px solid #ddd', whiteSpace: 'nowrap' }}>{children}</th>
const TD = ({ children, onClick }) => <td onClick={onClick} style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>{children}</td>

const Btn = ({ children, onClick, color = '#0070f3', style = {} }) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: color, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', ...style }}>{children}</button>
)

export default function JourneysPage() {
    const [journeys, setJourneys] = useState([])
    const [vessels, setVessels] = useState([])
    const [routes, setRoutes] = useState([])
    const [passages, setPassages] = useState([])
    const [positions, setPositions] = useState([])
    const [selected, setSelected] = useState(null)
    const [form, setForm] = useState({ vessel_ID: '', route_ID: '', scheduledDeparture: '', notes: '' })
    const [posForm, setPosForm] = useState({ latitude: '', longitude: '', speedKnots: '', headingDegrees: '' })
    const [creating, setCreating] = useState(false)
    const [toast, setToast] = useState('')

    useEffect(() => {
        loadAll()
        get('Vessels', "?$filter=status_name eq 'active'&$orderby=name").then(setVessels).catch(console.error)
        get('Routes', '?$orderby=name').then(setRoutes).catch(console.error)
    }, [])

    async function loadAll() {
        try { setJourneys(await get('Journeys', '?$orderby=scheduledDeparture desc')) }
        catch (e) { showToast('Failed to load: ' + e.message) }
    }

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

    async function selectJourney(j) {
        setSelected(j)
        try {
            const [p, pos] = await Promise.all([
                get('LockPassages', `?$filter=journey_ID eq ${j.ID}&$orderby=scheduledTime`),
                get('PositionEvents', `?$filter=journey_ID eq ${j.ID}&$orderby=timestamp desc`)
            ])
            setPassages(p); setPositions(pos)
        } catch (e) { showToast('Failed to load details') }
    }

    async function createJourney() {
        if (!form.vessel_ID || !form.route_ID) { showToast('Vessel and Route are required'); return }
        try {
            const body = { vessel_ID: form.vessel_ID, route_ID: form.route_ID, notes: form.notes || undefined }
            if (form.scheduledDeparture) body.scheduledDeparture = new Date(form.scheduledDeparture).toISOString()
            await post('Journeys', body)
            setCreating(false); setForm({ vessel_ID: '', route_ID: '', scheduledDeparture: '', notes: '' })
            await loadAll(); showToast('Journey created')
        } catch (e) { showToast('Error: ' + e.message) }
    }

    async function beginJourney(j, e) {
        e.stopPropagation()
        try {
            await action(`Journeys(${j.ID})/CanalNavigationService.beginJourney`)
            await loadAll(); showToast('Journey started')
        } catch (e2) { showToast('Error: ' + e2.message) }
    }

    async function finishJourney(j, e) {
        e.stopPropagation()
        try {
            await action(`Journeys(${j.ID})/CanalNavigationService.finishJourney`)
            await loadAll(); setSelected(null); showToast('Journey completed')
        } catch (e2) { showToast('Error: ' + e2.message) }
    }

    async function recordPos(journeyId) {
        const { latitude, longitude, speedKnots, headingDegrees } = posForm
        if (!latitude || !longitude) { showToast('Latitude and longitude required'); return }
        try {
            await action('recordPosition', { journeyId, latitude: parseFloat(latitude), longitude: parseFloat(longitude), speedKnots: speedKnots ? parseFloat(speedKnots) : undefined, headingDegrees: headingDegrees ? parseFloat(headingDegrees) : undefined })
            setPosForm({ latitude: '', longitude: '', speedKnots: '', headingDegrees: '' })
            const pos = await get('PositionEvents', `?$filter=journey_ID eq ${journeyId}&$orderby=timestamp desc`)
            setPositions(pos); showToast('Position recorded')
        } catch (e) { showToast('Error: ' + e.message) }
    }

    const statusColor = { scheduled: '#1a73e8', underway: '#e67e00', completed: 'green', cancelled: 'red' }

    return (
        <div style={{ display: 'flex', gap: '1.5rem' }}>
            {/* Left: journey list */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Journeys</h2>
                    <Btn onClick={() => setCreating(true)}>+ New Journey</Btn>
                </div>

                {creating && (
                    <div style={{ background: '#f8f8ff', border: '1px solid #dde', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                        <h4 style={{ marginTop: 0 }}>Schedule New Journey</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {[
                                ['vessel_ID', 'Vessel *', 'select', vessels],
                                ['route_ID', 'Route *', 'select', routes]
                            ].map(([f, l, t, opts]) => (
                                <div key={f}>
                                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 3, fontSize: '0.9rem' }}>{l}</label>
                                    <select value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: '0.4rem', border: '1px solid #ccc', borderRadius: 4 }}>
                                        <option value="">-- Select --</option>
                                        {opts.map(o => <option key={o.ID} value={o.ID}>{o.name}</option>)}
                                    </select>
                                </div>
                            ))}
                            <div>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: 3, fontSize: '0.9rem' }}>Scheduled Departure</label>
                                <input type="datetime-local" value={form.scheduledDeparture} onChange={e => setForm({ ...form, scheduledDeparture: e.target.value })} style={{ width: '100%', padding: '0.4rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: 3, fontSize: '0.9rem' }}>Notes</label>
                                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', padding: '0.4rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setCreating(false)} style={{ padding: '7px 14px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer' }}>Cancel</button>
                            <Btn onClick={createJourney}>Create Journey</Btn>
                        </div>
                    </div>
                )}

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><TH>Vessel</TH><TH>Route</TH><TH>Departure</TH><TH>Status</TH><TH>Actions</TH></tr></thead>
                    <tbody>{journeys.map(j => (
                        <tr key={j.ID} style={{ cursor: 'pointer', background: selected?.ID === j.ID ? '#eef2ff' : '' }} onClick={() => selectJourney(j)}>
                            <TD>{j.vesselName}</TD>
                            <TD>{j.routeName}</TD>
                            <TD>{fmt(j.scheduledDeparture)}</TD>
                            <TD><span style={{ color: statusColor[j.status_name] || '#333', fontWeight: 600 }}>{j.status_name}</span></TD>
                            <TD>
                                {j.status_name === 'scheduled' && <Btn onClick={(e) => beginJourney(j, e)} color="#2e7d32">Start</Btn>}
                                {j.status_name === 'underway'  && <Btn onClick={(e) => finishJourney(j, e)} color="#e67e00">Complete</Btn>}
                            </TD>
                        </tr>
                    ))}</tbody>
                </table>
            </div>

            {/* Right: journey detail */}
            {selected && (
                <div style={{ width: 380, borderLeft: '1px solid #e0e0e0', paddingLeft: '1.5rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{selected.vesselName}</h3>
                        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#666' }}>✕</button>
                    </div>
                    <p style={{ margin: '3px 0', fontSize: '0.9rem' }}><strong>Route:</strong> {selected.routeName}</p>
                    <p style={{ margin: '3px 0', fontSize: '0.9rem' }}><strong>Status:</strong> <span style={{ color: statusColor[selected.status_name], fontWeight: 600 }}>{selected.status_name}</span></p>
                    <p style={{ margin: '3px 0', fontSize: '0.9rem' }}><strong>Scheduled Departure:</strong> {fmt(selected.scheduledDeparture)}</p>
                    <p style={{ margin: '3px 0', fontSize: '0.9rem' }}><strong>Actual Departure:</strong> {fmt(selected.actualDeparture)}</p>
                    <p style={{ margin: '3px 0', fontSize: '0.9rem' }}><strong>Scheduled Arrival:</strong> {fmt(selected.scheduledArrival)}</p>
                    <p style={{ margin: '3px 0', fontSize: '0.9rem' }}><strong>Actual Arrival:</strong> {fmt(selected.actualArrival)}</p>
                    {selected.notes && <p style={{ margin: '3px 0', fontSize: '0.9rem' }}><strong>Notes:</strong> {selected.notes}</p>}

                    <h4 style={{ marginBottom: '0.4rem' }}>Lock Passages</h4>
                    {passages.length === 0
                        ? <p style={{ color: '#999', fontSize: '0.85rem' }}>No passages</p>
                        : <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ borderBottom: '1px solid #ddd' }}>
                                <th style={{ textAlign: 'left', padding: '4px 0' }}>Lock</th>
                                <th style={{ textAlign: 'left', padding: '4px 0' }}>Scheduled</th>
                                <th style={{ textAlign: 'left', padding: '4px 0' }}>Actual</th>
                                <th style={{ textAlign: 'left', padding: '4px 0' }}>Status</th>
                            </tr></thead>
                            <tbody>{passages.map(p => (
                                <tr key={p.ID} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '4px 0' }}>{p.lockName}</td>
                                    <td>{fmt(p.scheduledTime)}</td>
                                    <td>{fmt(p.actualTime)}</td>
                                    <td><span style={{ color: p.status_name === 'completed' ? 'green' : '#e67e00', fontWeight: 600 }}>{p.status_name}</span></td>
                                </tr>
                            ))}</tbody>
                          </table>
                    }

                    <h4 style={{ marginBottom: '0.4rem' }}>Position Log</h4>
                    {selected.status_name === 'underway' && (
                        <div style={{ background: '#f0f7ff', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #c8dff8' }}>
                            <strong style={{ fontSize: '0.85rem' }}>Record Position</strong>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.5rem' }}>
                                {[['latitude', 'Lat *'], ['longitude', 'Lon *'], ['speedKnots', 'Speed (kn)'], ['headingDegrees', 'Heading (°)']].map(([f, l]) => (
                                    <div key={f}>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: 2 }}>{l}</label>
                                        <input type="number" step="0.0001" value={posForm[f]} onChange={e => setPosForm({ ...posForm, [f]: e.target.value })} style={{ width: '100%', padding: '0.3rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', fontSize: '0.85rem' }} />
                                    </div>
                                ))}
                            </div>
                            <Btn onClick={() => recordPos(selected.ID)} style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>Record</Btn>
                        </div>
                    )}
                    {positions.length === 0
                        ? <p style={{ color: '#999', fontSize: '0.85rem' }}>No positions recorded</p>
                        : <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ borderBottom: '1px solid #ddd' }}>
                                <th style={{ textAlign: 'left', padding: '4px 0' }}>Time</th>
                                <th style={{ textAlign: 'left', padding: '4px 0' }}>Lat</th>
                                <th style={{ textAlign: 'left', padding: '4px 0' }}>Lon</th>
                                <th style={{ textAlign: 'left', padding: '4px 0' }}>Speed</th>
                            </tr></thead>
                            <tbody>{positions.map(p => (
                                <tr key={p.ID} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '3px 0' }}>{fmt(p.timestamp)}</td>
                                    <td>{Number(p.latitude).toFixed(4)}</td>
                                    <td>{Number(p.longitude).toFixed(4)}</td>
                                    <td>{p.speedKnots ? `${p.speedKnots} kn` : '—'}</td>
                                </tr>
                            ))}</tbody>
                          </table>
                    }
                </div>
            )}

            {toast && <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', background: '#333', color: '#fff', padding: '0.75rem 1rem', borderRadius: 6, zIndex: 999 }}>{toast}</div>}
        </div>
    )
}
