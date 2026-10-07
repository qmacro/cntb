import { useState, useEffect } from 'react'
import { get } from '../api'

const TH = ({ children }) => <th style={{ textAlign: 'left', padding: '8px 12px', background: '#f0f0f0', borderBottom: '2px solid #ddd' }}>{children}</th>
const TD = ({ children, style }) => <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee', ...style }}>{children}</td>

export default function WaterwaysPage() {
    const [waterways, setWaterways] = useState([])
    const [locks, setLocks] = useState([])
    const [selected, setSelected] = useState(null)

    useEffect(() => {
        get('Waterways', '?$orderby=name').then(setWaterways).catch(console.error)
        get('Locks', '?$orderby=name').then(setLocks).catch(console.error)
    }, [])

    const filteredLocks = selected ? locks.filter(l => l.waterway_ID === selected) : locks

    return (
        <div>
            <h2>Waterways</h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginTop: 0 }}>Click a row to filter locks by waterway.</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                <thead><tr>
                    <TH>Name</TH><TH>Description</TH><TH>Length (km)</TH>
                    <TH>Max Vessel Length (m)</TH><TH>Max Width (m)</TH><TH>Max Draft (m)</TH>
                </tr></thead>
                <tbody>{waterways.map(w => (
                    <tr key={w.ID} style={{ cursor: 'pointer', background: selected === w.ID ? '#eef2ff' : '' }} onClick={() => setSelected(selected === w.ID ? null : w.ID)}>
                        <TD><strong>{w.name}</strong></TD>
                        <TD>{w.description}</TD>
                        <TD>{w.lengthKm}</TD>
                        <TD>{w.maxVesselLengthMeters}</TD>
                        <TD>{w.maxVesselWidthMeters}</TD>
                        <TD>{w.maxDraftMeters}</TD>
                    </tr>
                ))}</tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Locks {selected ? `— ${waterways.find(w => w.ID === selected)?.name}` : '(all)'}</h2>
                {selected && <button onClick={() => setSelected(null)} style={{ fontSize: '0.85rem', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}>Clear filter</button>}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                <thead><tr>
                    <TH>Name</TH><TH>Waterway</TH><TH>Location</TH>
                    <TH>Chamber L×W (m)</TH><TH>Operating Hours</TH><TH>Status</TH>
                </tr></thead>
                <tbody>{filteredLocks.map(l => (
                    <tr key={l.ID}>
                        <TD><strong>{l.name}</strong></TD>
                        <TD>{l.waterwayName}</TD>
                        <TD>{l.location}</TD>
                        <TD>{l.chamberLengthMeters} × {l.chamberWidthMeters}</TD>
                        <TD>{l.operatingHoursStart} – {l.operatingHoursEnd}</TD>
                        <TD>
                            <span style={{ color: l.status_name === 'operational' ? 'green' : l.status_name === 'maintenance' ? 'orange' : 'red', fontWeight: 600 }}>
                                {l.status_name}
                            </span>
                        </TD>
                    </tr>
                ))}</tbody>
            </table>
        </div>
    )
}
