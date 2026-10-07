namespace canal.navigation;

using { cuid, managed, sap.common.CodeList } from '@sap/cds/common';

// ─── Code Lists ─────────────────────────────────────────────────────────────

entity VesselStatuses : CodeList {
    key name : String(50);
}
entity LockStatuses   : CodeList {
    key name : String(50);
}
entity JourneyStatuses: CodeList {
    key name : String(50);
}
entity PassageStatuses: CodeList {
    key name : String(50);
}

// ─── Core Entities ───────────────────────────────────────────────────────────

entity Vessels : cuid, managed {
    name               : String(100)  not null;
    type               : String(50);
    lengthMeters       : Decimal(6,2);
    widthMeters        : Decimal(5,2);
    draftMeters        : Decimal(4,2);
    owner              : String(100);
    registrationNumber : String(50);
    status             : Association to VesselStatuses;
    journeys           : Composition of many Journeys on journeys.vessel = $self;
}

entity Waterways : cuid, managed {
    name                  : String(100) not null;
    description           : String(500);
    lengthKm              : Decimal(8,2);
    maxVesselLengthMeters : Decimal(6,2);
    maxVesselWidthMeters  : Decimal(5,2);
    maxDraftMeters        : Decimal(4,2);
    locks                 : Composition of many Locks on locks.waterway = $self;
}

entity Locks : cuid, managed {
    name                 : String(100) not null;
    location             : String(200);
    waterway             : Association to Waterways;
    chamberLengthMeters  : Decimal(6,2);
    chamberWidthMeters   : Decimal(5,2);
    operatingHoursStart  : Time;
    operatingHoursEnd    : Time;
    status               : Association to LockStatuses;
}

entity Routes : cuid, managed {
    name                  : String(100) not null;
    description           : String(500);
    totalDistanceKm       : Decimal(8,2);
    estimatedDurationHours: Decimal(5,2);
    segments              : Composition of many RouteSegments on segments.route = $self;
}

entity RouteSegments : cuid {
    route          : Association to Routes      not null;
    sequenceNumber : Integer                    not null;
    waterway       : Association to Waterways;
    lock           : Association to Locks;
}

entity Journeys : cuid, managed {
    vessel             : Association to Vessels  not null;
    route              : Association to Routes   not null;
    scheduledDeparture : DateTime;
    actualDeparture    : DateTime;
    scheduledArrival   : DateTime;
    actualArrival      : DateTime;
    status             : Association to JourneyStatuses;
    notes              : String(1000);
    lockPassages       : Composition of many LockPassages on lockPassages.journey = $self;
    positionEvents     : Composition of many PositionEvents on positionEvents.journey = $self;
}

entity LockPassages : cuid {
    journey        : Association to Journeys    not null;
    lock           : Association to Locks       not null;
    scheduledTime  : DateTime;
    actualTime     : DateTime;
    status         : Association to PassageStatuses;
    waitTimeMinutes: Integer;
}

entity PositionEvents : cuid {
    journey        : Association to Journeys    not null;
    timestamp      : DateTime                   not null;
    latitude       : Decimal(10,6)              not null;
    longitude      : Decimal(10,6)              not null;
    speedKnots     : Decimal(5,2);
    headingDegrees : Decimal(5,2);
}
