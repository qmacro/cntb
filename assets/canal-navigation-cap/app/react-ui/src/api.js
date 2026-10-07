// OData base path — matches @path in CDS service definition
const BASE = '/canal-navigation'

export async function get(entity, params = '') {
    const res = await fetch(`${BASE}/${entity}${params}`)
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    return data.value ?? data
}

export async function post(entity, body) {
    const res = await fetch(`${BASE}/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
}

export async function patch(entity, id, body) {
    const res = await fetch(`${BASE}/${entity}(${id})`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(await res.text())
    // 204 No Content is common for PATCH
    if (res.status === 204) return {}
    return res.json()
}

export async function del(entity, id) {
    const res = await fetch(`${BASE}/${entity}(${id})`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
}

export async function action(path, body = {}) {
    const res = await fetch(`${BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(await res.text())
    if (res.status === 204) return {}
    return res.json()
}
