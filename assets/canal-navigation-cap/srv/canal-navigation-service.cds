using { canal.navigation as db } from '../db/schema';

@mcp.instructions: 'Use this service to manage canal navigation. Query Vessels, Waterways, Locks, Routes and Journeys. To schedule a journey, create a Journey with a vessel_ID, route_ID and scheduledDeparture — lock passages are auto-generated. Use the beginJourney action to start a journey and finishJourney to complete it. Record real-time vessel positions with the recordPosition action.'

service CanalNavigationService @(path: '/canal-navigation') {

    // ─── Vessels ─────────────────────────────────────────────────────────────
    entity Vessels as projection on db.Vessels {
        *,
        status.name as statusName : String
    }
    actions {
        action startJourney(vesselId: UUID, routeId: UUID, scheduledDeparture: DateTime) returns Journeys;
    }

    // ─── Waterways ────────────────────────────────────────────────────────────
    entity Waterways as projection on db.Waterways;

    // ─── Locks ───────────────────────────────────────────────────────────────
    entity Locks as projection on db.Locks {
        *,
        status.name as statusName : String,
        waterway.name as waterwayName : String
    }

    // ─── Routes ──────────────────────────────────────────────────────────────
    entity Routes as projection on db.Routes;

    entity RouteSegments as projection on db.RouteSegments {
        *,
        waterway.name as waterwayName : String,
        lock.name as lockName : String
    }

    // ─── Journeys ────────────────────────────────────────────────────────────
    entity Journeys as projection on db.Journeys {
        *,
        status.name as statusName : String,
        vessel.name as vesselName : String,
        route.name  as routeName  : String
    }
    actions {
        action beginJourney()    returns Journeys;
        action finishJourney()   returns Journeys;
    }

    // ─── Lock Passages ────────────────────────────────────────────────────────
    entity LockPassages as projection on db.LockPassages {
        *,
        status.name as statusName  : String,
        lock.name   as lockName    : String
    }

    // ─── Position Events ─────────────────────────────────────────────────────
    @readonly
    entity PositionEvents as projection on db.PositionEvents;

    // ─── Unbound action to record position ───────────────────────────────────
    action recordPosition(
        journeyId      : UUID       not null,
        latitude       : Decimal    not null,
        longitude      : Decimal    not null,
        speedKnots     : Decimal,
        headingDegrees : Decimal
    ) returns PositionEvents;

    // ─── Code Lists ──────────────────────────────────────────────────────────
    @readonly entity VesselStatuses  as projection on db.VesselStatuses;
    @readonly entity LockStatuses    as projection on db.LockStatuses;
    @readonly entity JourneyStatuses as projection on db.JourneyStatuses;
    @readonly entity PassageStatuses as projection on db.PassageStatuses;
}
