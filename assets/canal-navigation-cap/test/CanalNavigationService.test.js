import cds from '@sap/cds'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

cds.test(import.meta.dirname + '/..')

function getSrv() { return cds.services['CanalNavigationService'] }

function futureDateTime(msOffset = 3_600_000) {
    return new Date(Date.now() + msOffset).toISOString().replace(/\.\d{3}Z$/, 'Z')
}
function pastDateTime(msOffset = 3_600_000) {
    return new Date(Date.now() - msOffset).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// Bound action helper
function boundAction(srv, action, entity, key) {
    return srv.send({ event: action, entity, params: [key] })
}

const ACTIVE_VESSEL_ID   = cds.utils.uuid()
const INACTIVE_VESSEL_ID = cds.utils.uuid()
const ROUTE_ID           = cds.utils.uuid()
const WATERWAY_ID        = cds.utils.uuid()
const LOCK_ID_1          = cds.utils.uuid()
const LOCK_ID_2          = cds.utils.uuid()

let fixturesSeeded = false

async function seedFixtures() {
    if (fixturesSeeded) return
    fixturesSeeded = true

    const srv = getSrv()
    const { VesselStatuses, JourneyStatuses, LockStatuses, PassageStatuses,
            Vessels, Routes, RouteSegments, Waterways, Locks } = srv.entities

    const existing = await SELECT.one.from(VesselStatuses).where({ name: 'active' })
    if (!existing) {
        await INSERT.into(VesselStatuses).entries([
            { name: 'active',      descr: 'Active' },
            { name: 'inactive',    descr: 'Inactive' },
            { name: 'maintenance', descr: 'Maintenance' }
        ])
        await INSERT.into(JourneyStatuses).entries([
            { name: 'scheduled', descr: 'Scheduled' },
            { name: 'underway',  descr: 'Underway' },
            { name: 'completed', descr: 'Completed' }
        ])
        await INSERT.into(LockStatuses).entries([{ name: 'operational', descr: 'Operational' }])
        await INSERT.into(PassageStatuses).entries([
            { name: 'scheduled', descr: 'Scheduled' },
            { name: 'completed', descr: 'Completed' }
        ])
    }

    await INSERT.into(Waterways).entries({ ID: WATERWAY_ID, name: 'Test Canal', lengthKm: 50 })
    await INSERT.into(Locks).entries([
        { ID: LOCK_ID_1, name: 'Lock A', waterway_ID: WATERWAY_ID, status_name: 'operational' },
        { ID: LOCK_ID_2, name: 'Lock B', waterway_ID: WATERWAY_ID, status_name: 'operational' }
    ])
    await INSERT.into(Vessels).entries([
        { ID: ACTIVE_VESSEL_ID,   name: 'Active Vessel',   status_name: 'active' },
        { ID: INACTIVE_VESSEL_ID, name: 'Inactive Vessel', status_name: 'inactive' }
    ])
    await INSERT.into(Routes).entries({ ID: ROUTE_ID, name: 'Test Route', totalDistanceKm: 20 })
    await INSERT.into(RouteSegments).entries([
        { ID: cds.utils.uuid(), route_ID: ROUTE_ID, sequenceNumber: 1, waterway_ID: WATERWAY_ID, lock_ID: LOCK_ID_1 },
        { ID: cds.utils.uuid(), route_ID: ROUTE_ID, sequenceNumber: 2, waterway_ID: WATERWAY_ID, lock_ID: LOCK_ID_2 }
    ])
}

// ─── Journey Creation Validation ─────────────────────────────────────────────

describe('Journey Creation Validation', () => {

    it('should reject creating a journey with an inactive vessel', async () => {
        await seedFixtures()
        const srv = getSrv()
        const { Journeys } = srv.entities

        await assert.rejects(
            () => srv.run(INSERT.into(Journeys).entries({
                vessel_ID: INACTIVE_VESSEL_ID,
                route_ID:  ROUTE_ID,
                scheduledDeparture: futureDateTime(3_600_000)
            }))
        )
    })

    it('should reject creating a journey with a past departure time', async () => {
        await seedFixtures()
        const srv = getSrv()
        const { Journeys } = srv.entities

        await assert.rejects(
            () => srv.run(INSERT.into(Journeys).entries({
                vessel_ID: ACTIVE_VESSEL_ID,
                route_ID:  ROUTE_ID,
                scheduledDeparture: pastDateTime(3_600_000)
            }))
        )
    })

    it('should auto-generate lock passages when creating a valid journey', async () => {
        await seedFixtures()
        const srv = getSrv()
        const { Journeys, LockPassages } = srv.entities
        const journeyId = cds.utils.uuid()

        await srv.run(INSERT.into(Journeys).entries({
            ID: journeyId,
            vessel_ID: ACTIVE_VESSEL_ID,
            route_ID:  ROUTE_ID,
            scheduledDeparture: futureDateTime(7_200_000)
        }))

        const passages = await cds.run(SELECT.from(LockPassages).where({ journey_ID: journeyId }))
        assert.strictEqual(passages.length, 2)
        assert.ok(passages.every(p => p.status_name === 'scheduled'))
    })
})

// ─── Journey Actions ──────────────────────────────────────────────────────────

describe('Journey Actions', () => {

    it('should begin a scheduled journey', async () => {
        await seedFixtures()
        const srv = getSrv()
        const { Journeys } = srv.entities
        const journeyId = cds.utils.uuid()

        await srv.run(INSERT.into(Journeys).entries({
            ID: journeyId, vessel_ID: ACTIVE_VESSEL_ID, route_ID: ROUTE_ID,
            scheduledDeparture: futureDateTime(9_000_000)
        }))
        await boundAction(srv, 'beginJourney', Journeys, { ID: journeyId })

        const j = await cds.run(SELECT.one.from(Journeys).where({ ID: journeyId }))
        assert.strictEqual(j.status_name, 'underway')
        assert.ok(j.actualDeparture)
    })

    it('should reject beginJourney on an already-underway journey', async () => {
        await seedFixtures()
        const srv = getSrv()
        const { Journeys } = srv.entities
        const journeyId = cds.utils.uuid()

        await srv.run(INSERT.into(Journeys).entries({
            ID: journeyId, vessel_ID: ACTIVE_VESSEL_ID, route_ID: ROUTE_ID,
            scheduledDeparture: futureDateTime(10_000_000)
        }))
        await boundAction(srv, 'beginJourney', Journeys, { ID: journeyId })

        await assert.rejects(
            () => boundAction(srv, 'beginJourney', Journeys, { ID: journeyId })
        )
    })

    it('should finish an underway journey', async () => {
        await seedFixtures()
        const srv = getSrv()
        const { Journeys } = srv.entities
        const journeyId = cds.utils.uuid()

        await srv.run(INSERT.into(Journeys).entries({
            ID: journeyId, vessel_ID: ACTIVE_VESSEL_ID, route_ID: ROUTE_ID,
            scheduledDeparture: futureDateTime(12_000_000)
        }))
        await boundAction(srv, 'beginJourney',  Journeys, { ID: journeyId })
        await boundAction(srv, 'finishJourney', Journeys, { ID: journeyId })

        const j = await cds.run(SELECT.one.from(Journeys).where({ ID: journeyId }))
        assert.strictEqual(j.status_name, 'completed')
        assert.ok(j.actualArrival)
    })

    it('should reject finishJourney on a scheduled journey', async () => {
        await seedFixtures()
        const srv = getSrv()
        const { Journeys } = srv.entities
        const journeyId = cds.utils.uuid()

        await srv.run(INSERT.into(Journeys).entries({
            ID: journeyId, vessel_ID: ACTIVE_VESSEL_ID, route_ID: ROUTE_ID,
            scheduledDeparture: futureDateTime(14_000_000)
        }))

        await assert.rejects(
            () => boundAction(srv, 'finishJourney', Journeys, { ID: journeyId })
        )
    })
})

// ─── recordPosition Action ────────────────────────────────────────────────────

describe('recordPosition Action', () => {

    it('should record a position event on an underway journey', async () => {
        await seedFixtures()
        const srv = getSrv()
        const { Journeys, PositionEvents } = srv.entities
        const journeyId = cds.utils.uuid()

        await srv.run(INSERT.into(Journeys).entries({
            ID: journeyId, vessel_ID: ACTIVE_VESSEL_ID, route_ID: ROUTE_ID,
            scheduledDeparture: futureDateTime(16_000_000)
        }))
        await boundAction(srv, 'beginJourney', Journeys, { ID: journeyId })

        await srv.send('recordPosition', {
            journeyId, latitude: 51.39, longitude: -1.99, speedKnots: 3.5, headingDegrees: 270
        })

        const events = await cds.run(SELECT.from(PositionEvents).where({ journey_ID: journeyId }))
        assert.strictEqual(events.length, 1)
        assert.strictEqual(Number(events[0].latitude), 51.39)
    })

    it('should reject recordPosition on a completed journey', async () => {
        await seedFixtures()
        const srv = getSrv()
        const { Journeys } = srv.entities
        const journeyId = cds.utils.uuid()

        await srv.run(INSERT.into(Journeys).entries({
            ID: journeyId, vessel_ID: ACTIVE_VESSEL_ID, route_ID: ROUTE_ID,
            scheduledDeparture: futureDateTime(18_000_000)
        }))
        await boundAction(srv, 'beginJourney',  Journeys, { ID: journeyId })
        await boundAction(srv, 'finishJourney', Journeys, { ID: journeyId })

        await assert.rejects(
            () => srv.send('recordPosition', { journeyId, latitude: 51.39, longitude: -1.99 })
        )
    })
})
