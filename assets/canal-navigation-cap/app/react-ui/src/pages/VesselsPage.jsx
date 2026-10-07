import { useState, useEffect } from 'react'
import { get, post, patch, del } from '../api'

const EMPTY = { name: '', type: '', lengthMeters: '', widthMeters: '', draftMeters: '', owner: '', registrationNumber: '', status_name: 'active' }
const STATUSES = ['active', 'inactive', 'maintenance']

const TH = ({ children }) => <th style={{ textAlign: 'left', padding: '8px 12px', background: '#f0f0f0', borderBottom: '2px solid #ddd' }}>{children}</th>
const TD = ({ children }) => <td style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>{children}</td>

export default function VesselsPage() {
    const [vessels, setVessels] = useState([])
    const [form, setForm] = useState(EMPTY)
    const [editId, setEditId] = useState(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [toast, setToast] = useState('')

    useEffect(() => { load() }, [])

    async function load() {
        try { setVessels(await get('Vessels', '?$orderby=name')) }
        catch (e) { showToast('Failed to load: ' + e.message) }
    }

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }
    function openNew() { setForm(EMPTY); setEditId(null); setDialogOpen(true) }
    function openEdit(v) {
        setForm({ name: v.name, type: v.type || '', lengthMeters: v.lengthMeters || '', widthMeters: v.widthMeters || '', draftMeters: v.draftMeters || '', owner: v.owner || '', registrationNumber: v.registrationNumber || '', status_name: v.status_name || 'active' })
        setEditId(v.ID); setDialogOpen(true)
    }

    async function save() {
        if (!form.name) { showToast('Name is required'); return }
        try {
            const body = { ...form, lengthMeters: form.lengthMeters ? parseFloat(form.lengthMeters) : null, widthMeters: form.widthMeters ? parseFloat(form.widthMeters) : null, draftMeters: form.draftMeters ? parseFloat(form.draftMeters) : null }
            if (editId) await patch('Vessels', editId, body)
            else await post('Vessels', body)
            setDialogOpen(false); await load(); showToast(editId ? 'Vessel updated' : 'Vessel created')
        } catch (e) { showToast('Error: ' + e.message) }
    }

    async function remove(id) {
        if (!confirm('Delete this vessel?')) return
        try { await del('Vessels', id); await load(); showToast('Vessel deleted') }
        catch (e) { showToast('Error: ' + e.message) }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Vessels</h2>
                <button onClick={openNew} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>+ Add Vessel</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                    <TH>Name</TH><TH>Type</TH><TH>Owner</TH><TH>Registration</TH>
                    <TH>Length (m)</TH><TH>Width (m)</TH><TH>Status</TH><TH>Actions</TH>
                </tr></thead>
                <tbody>{vessels.map(v => (
                    <tr key={v.ID}>
                        <TD><strong>{v.name}</strong></TD>
                        <TD>{v.type}</TD>
                        <TD>{v.owner}</TD>
                        <TD>{v.registrationNumber}</TD>
                        <TD>{v.lengthMeters}</TD>
                        <TD>{v.widthMeters}</TD>
                        <TD><span style={{ color: v.status_name === 'active' ? 'green' : v.status_name === 'maintenance' ? 'orange' : 'red', fontWeight: 600 }}>{v.status_name}</span></TD>
                        <TD>
                            <button onClick={() => openEdit(v)} style={{ marginRight: 4, padding: '4px 10px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' }}>Edit</button>
                            <button onClick={() => remove(v.ID)} style={{ padding: '4px 10px', cursor: 'pointer', borderRadius: 4, border: '1px solid #e00', color: '#e00', background: 'none' }}>Delete</button>
                        </TD>
                    </tr>
                ))}</tbody>
            </table>

            {dialogOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', minWidth: 420, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0 }}>{editId ? 'Edit Vessel' : 'New Vessel'}</h3>
                        {[['name', 'Name *', 'text'], ['type', 'Type', 'text'], ['owner', 'Owner', 'text'], ['registrationNumber', 'Registration Number', 'text'], ['lengthMeters', 'Length (m)', 'number'], ['widthMeters', 'Width (m)', 'number'], ['draftMeters', 'Draft (m)', 'number']].map(([f, l, t]) => (
                            <div key={f} style={{ marginBottom: '0.6rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: 3, fontSize: '0.9rem' }}>{l}</label>
                                <input type={t} step={t === 'number' ? '0.01' : undefined} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: '0.4rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
                            </div>
                        ))}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: 3, fontSize: '0.9rem' }}>Status</label>
                            <select value={form.status_name} onChange={e => setForm({ ...form, status_name: e.target.value })} style={{ width: '100%', padding: '0.4rem', border: '1px solid #ccc', borderRadius: 4 }}>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDialogOpen(false)} style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={save} style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#0070f3', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', background: '#333', color: '#fff', padding: '0.75rem 1rem', borderRadius: 6 }}>{toast}</div>}
        </div>
    )
}
