import cds from '@sap/cds'

export default class CanalNavigationService extends cds.ApplicationService {

    async init() {

        const {
            Vessels, Routes, RouteSegments, Journeys, LockPassages, PositionEvents
        } = this.entities

        // ─── before CREATE Journeys ───────────────────────────────────────────
        // Validate vessel is active and departure is in the future,
        // then auto-generate LockPassages for every lock on the route.
        this.before('CREATE', Journeys, async (req) => {
            const { vessel_ID, route_ID, scheduledDeparture } = req.data

            // 1 - Validate vessel is active (single DB call combining check)
            const vessel = await SELECT.one
                .from(Vessels)
                .columns('ID', 'status_name')
                .where({ ID: vessel_ID })

            if (!vessel) return req.reject(404, `Vessel ${vessel_ID} not found`)
            if (vessel.status_name !== 'active')
                return req.reject(409, `Vessel must be active to schedule a journey (current status: ${vessel.status_name})`)

            // 2 - Validate departure is in the future
            if (scheduledDeparture && new Date(scheduledDeparture) <= new Date())
                return req.reject(400, 'Scheduled departure must be in the future')

            // 3 - Auto-generate a journey ID so we can attach lock passages
            if (!req.data.ID) req.data.ID = cds.utils.uuid()
            req.data.status_name = 'scheduled'

            // 4 - Auto-generate LockPassages for every lock segment on the route
            const segments = await SELECT
                .from(RouteSegments)
                .columns('sequenceNumber', 'lock_ID')
                .where({ route_ID })
                .orderBy('sequenceNumber')
            const lockSegments = segments.filter(s => s.lock_ID)

            if (lockSegments.length) {
                const base = scheduledDeparture ? new Date(scheduledDeparture) : new Date()
                req.data.lockPassages = lockSegments.map((seg, i) => {
                    const t = new Date(base.getTime() + (i + 1) * 60 * 60 * 1000) // +1h per lock
                    return {
                        ID:            cds.utils.uuid(),
                        lock_ID:       seg.lock_ID,
                        scheduledTime: t.toISOString(),
                        status_name:   'scheduled'
                    }
                })
            }
        })

        // ─── beginJourney (bound action on Journeys) ─────────────────────────
        this.on('beginJourney', Journeys, async (req) => {
            const { ID } = req.params[0]

            const n = await UPDATE(Journeys, ID)
                .where({ status_name: 'scheduled' })
                .with({ status_name: 'underway', actualDeparture: new Date().toISOString() })

            if (!n) return req.reject(409, 'Journey must be in scheduled status to begin')

            return SELECT.one.from(Journeys).where({ ID })
        })

        // ─── finishJourney (bound action on Journeys) ─────────────────────────
        this.on('finishJourney', Journeys, async (req) => {
            const { ID } = req.params[0]

            const n = await UPDATE(Journeys, ID)
                .where({ status_name: 'underway' })
                .with({ status_name: 'completed', actualArrival: new Date().toISOString() })

            if (!n) return req.reject(409, 'Journey must be underway to finish')

            return SELECT.one.from(Journeys).where({ ID })
        })

        // ─── recordPosition (unbound action) ────────────────────────────────
        this.on('recordPosition', async (req) => {
            const { journeyId, latitude, longitude, speedKnots, headingDegrees } = req.data

            // Validate journey exists and is underway (single check)
            const journey = await SELECT.one
                .from(Journeys)
                .columns('ID', 'status_name')
                .where({ ID: journeyId })

            if (!journey) return req.reject(404, `Journey ${journeyId} not found`)
            if (journey.status_name !== 'underway')
                return req.reject(409, `Cannot record position for a journey with status: ${journey.status_name}`)

            const event = {
                ID:            cds.utils.uuid(),
                journey_ID:    journeyId,
                timestamp:     new Date().toISOString(),
                latitude,
                longitude,
                speedKnots,
                headingDegrees
            }

            await INSERT.into(PositionEvents).entries(event)
            return event
        })

        await super.init()
    }
}
