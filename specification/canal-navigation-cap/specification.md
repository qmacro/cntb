# Specification: canal-navigation-cap

> **Guidelines**: Read [guidelines.md](../guidelines.md) and [guidelines-cap.md](../guidelines-cap.md) before executing ANY tasks below. Follow all constraints described there throughout execution.

## Basic Setup

- [x] Read the project input (`product-requirements-document.md`, `intent.md`)
- [x] Invoke the `cap-development` skill from `assets/canal-navigation-cap/` to set up the CAP project structure
- [x] Install dependencies (`npm install`), validate the project starts (`cds watch`) and responds

## Data Model

- [x] Define `Vessels` entity with fields: `ID` (UUID key), `name` (String), `type` (String), `lengthMeters` (Decimal), `widthMeters` (Decimal), `draftMeters` (Decimal), `owner` (String), `registrationNumber` (String), `status` (String: active/inactive)
- [x] Define `Waterways` entity with fields: `ID` (UUID key), `name` (String), `description` (String), `lengthKm` (Decimal), `maxVesselLengthMeters` (Decimal), `maxVesselWidthMeters` (Decimal), `maxDraftMeters` (Decimal)
- [x] Define `Locks` entity with fields: `ID` (UUID key), `name` (String), `location` (String), `waterway_ID` (association to Waterways), `chamberLengthMeters` (Decimal), `chamberWidthMeters` (Decimal), `operatingHoursStart` (Time), `operatingHoursEnd` (Time), `status` (String: operational/maintenance/closed)
- [x] Define `Routes` entity with fields: `ID` (UUID key), `name` (String), `description` (String), `totalDistanceKm` (Decimal), `estimatedDurationHours` (Decimal)
- [x] Define `RouteSegments` entity (composition of Routes) with fields: `ID` (UUID key), `route_ID` (association to Routes), `sequenceNumber` (Integer), `waterway_ID` (association to Waterways), `lock_ID` (nullable association to Locks)
- [x] Define `Journeys` entity with fields: `ID` (UUID key), `vessel_ID` (association to Vessels), `route_ID` (association to Routes), `scheduledDeparture` (DateTime), `actualDeparture` (DateTime), `scheduledArrival` (DateTime), `actualArrival` (DateTime), `status` (String: scheduled/underway/completed/cancelled), `notes` (String)
- [x] Define `LockPassages` entity (composition of Journeys) with fields: `ID` (UUID key), `journey_ID` (association to Journeys), `lock_ID` (association to Locks), `scheduledTime` (DateTime), `actualTime` (DateTime), `status` (String: scheduled/completed/skipped), `waitTimeMinutes` (Integer)
- [x] Define `PositionEvents` entity with fields: `ID` (UUID key), `journey_ID` (association to Journeys), `timestamp` (DateTime), `latitude` (Decimal), `longitude` (Decimal), `speedKnots` (Decimal), `headingDegrees` (Decimal)
- [x] Add `cuid` and `managed` aspects from `@sap/cds/common` to all main entities
- [x] Run `cds compile srv/` to validate the data model compiles without errors

## Service Definition

- [x] Define `CanalNavigationService` exposing all entities with appropriate CRUD capabilities
- [x] Expose `Vessels`, `Waterways`, `Locks`, `Routes`, `RouteSegments`, `Journeys`, `LockPassages`, `PositionEvents` as OData V4 entity sets
- [x] Add `@readonly` annotation to `PositionEvents` for GET-only from the UI (write via dedicated action)
- [x] Define a bound action `startJourney(departureTime: DateTime)` on `Journeys` to update status to `underway` and set `actualDeparture`
- [x] Define a bound action `completeJourney()` on `Journeys` to update status to `completed` and set `actualArrival`
- [x] Define an unbound action `recordPosition(journeyId: UUID, latitude: Decimal, longitude: Decimal, speedKnots: Decimal, headingDegrees: Decimal)` to create a new `PositionEvent`

## Custom Handlers

- [x] Implement `before CREATE` handler on `Journeys`:
  - Validate that the referenced `vessel_ID` exists and has status `active`
  - Validate that `scheduledDeparture` is in the future
  - Auto-generate `LockPassages` records for all locks on the selected route's segments, with `status = scheduled`
- [x] Implement `on` handler for `startJourney` action:
  - Set `status = underway`, set `actualDeparture = current timestamp`
  - Validate journey is in `scheduled` status before allowing the action
- [x] Implement `on` handler for `completeJourney` action:
  - Set `status = completed`, set `actualArrival = current timestamp`
  - Validate journey is in `underway` status before allowing the action
- [x] Implement `on` handler for `recordPosition` action:
  - Validate journey exists and is `underway`
  - Create a new `PositionEvents` record with the provided data and current timestamp if none given

## Sample Data

- [x] Create `db/data/` CSV files with sample data:
  - 5 vessels of different types (narrowboat, barge, pleasure boat, cargo vessel, hire boat)
  - 3 waterways (e.g. Grand Union Canal, Oxford Canal, Kennet & Avon Canal)
  - 6 locks distributed across the waterways
  - 2 routes with multiple segments linking waterways and locks
  - 3 journeys (one scheduled, one underway, one completed) with associated lock passages
  - 10 position events for the completed journey

## UI

- [x] Implement all backend functionality from PRD also in the UI (frontend in `assets/canal-navigation-cap/ui/`)
- [x] Create a vessel management page: list all vessels, create/edit/delete vessel records
- [x] Create a waterways & locks page: view waterways and their associated locks with status
- [x] Create a routes page: view routes and their segments (read-only display)
- [x] Create a journeys page: list journeys, create new journey (select vessel + route + departure time), show status
- [x] Add journey detail view showing: lock passages with status/timing, and a position event log table
- [x] Add action buttons on journey detail: "Start Journey" and "Complete Journey" invoking the CAP actions
- [x] Add a "Record Position" form on the journey detail (underway journeys only): input latitude, longitude, speed, heading

## Validation

- [x] Run `cds compile srv/` to validate CDS models compile without errors
- [x] Run `cds watch` and curl endpoints to confirm service starts and responds correctly
- [x] Write tests for custom handler logic following `cap-development` skill testing guidelines — never test generic CRUD
  - Test: create journey with invalid vessel → expect error
  - Test: create journey with past departure time → expect error
  - Test: startJourney on already-underway journey → expect error
  - Test: completeJourney on scheduled journey → expect error
  - Test: recordPosition on completed journey → expect error
  - Test: create journey → verify lock passages auto-generated
