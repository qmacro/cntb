import { useState, useEffect } from 'react'
import { get } from '../api'

const TH = ({ children }) => <th style={{ textAlign: 'left', padding: '8px 12px', background: '#f0f0f0', borderBottom: '2px solid #ddd' }}>{children}</th>
const TD = ({ children }) => <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>{children}</td>

export default function RoutesPage() {
    const [routes, setRoutes] = useState([])
    const [segments, setSegments] = useState([])
    const [selected, setSelected] = useState(null)

    useEffect(() => {
        get('Routes', '?$orderby=name').then(setRoutes).catch(console.error)
        get('RouteSegments', '?$orderby=route_ID,sequenceNumber').then(setSegments).catch(console.error)
    }, [])

    const routeSegments = selected ? segments.filter(s => s.route_ID === selected) : []

    return (
        <div>
            <h2>Routes</h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginTop: 0 }}>Click a route to view its segments.</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                    <TH>Name</TH><TH>Description</TH><TH>Total Distance (km)</TH><TH>Est. Duration (hrs)</TH>
                </tr></thead>
                <tbody>{routes.map(r => (
                    <tr key={r.ID} style={{ cursor: 'pointer', background: selected === r.ID ? '#eef2ff' : '' }} onClick={() => setSelected(selected === r.ID ? null : r.ID)}>
                        <TD><strong>{r.name}</strong></TD>
                        <TD>{r.description}</TD>
                        <TD>{r.totalDistanceKm}</TD>
                        <TD>{r.estimatedDurationHours}</TD>
                    </tr>
                ))}</tbody>
            </table>

            {selected && (
                <div style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ marginTop: 0 }}>Segments — {routes.find(r => r.ID === selected)?.name}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr><TH>Seq #</TH><TH>Waterway</TH><TH>Lock</TH></tr></thead>
                        <tbody>{routeSegments.map(s => (
                            <tr key={s.ID}>
                                <TD>{s.sequenceNumber}</TD>
                                <TD>{s.waterwayName}</TD>
                                <TD>{s.lockName || <span style={{ color: '#999' }}>—</span>}</TD>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
