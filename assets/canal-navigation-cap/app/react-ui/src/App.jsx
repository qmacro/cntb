import { useState } from 'react'
import VesselsPage from './pages/VesselsPage'
import WaterwaysPage from './pages/WaterwaysPage'
import RoutesPage from './pages/RoutesPage'
import JourneysPage from './pages/JourneysPage'

const PAGES = ['Vessels', 'Waterways & Locks', 'Routes', 'Journeys']

const navBtnStyle = (active) => ({
    padding: '8px 18px',
    borderRadius: 4,
    border: 'none',
    background: active ? '#0070f3' : '#f0f0f0',
    color: active ? '#fff' : '#333',
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    fontSize: '0.95rem'
})

export default function App() {
    const [page, setPage] = useState('Vessels')

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ background: '#003366', color: '#fff', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.4rem' }}>⛵</span>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Canal Navigation</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Management System</div>
                </div>
            </div>

            {/* Navigation */}
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', gap: '0.5rem', background: '#fafafa' }}>
                {PAGES.map(p => (
                    <button key={p} style={navBtnStyle(page === p)} onClick={() => setPage(p)}>{p}</button>
                ))}
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
                {page === 'Vessels'           && <VesselsPage />}
                {page === 'Waterways & Locks' && <WaterwaysPage />}
                {page === 'Routes'            && <RoutesPage />}
                {page === 'Journeys'          && <JourneysPage />}
            </div>
        </div>
    )
}
