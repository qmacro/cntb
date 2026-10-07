# Product Requirements Document (PRD)

**Title:** Canal Navigation & Tracking Backend  
**Date:** 2026-08-12  
**Solution Category:** CAP App

## Product Purpose & Value Proposition

**Elevator Pitch:**  
Canal operators lack a dedicated system to manage vessels, waterway routes, lock passages, and real-time journey tracking. This CAP backend fills that gap with a purpose-built data model and OData API on SAP BTP.

**Expected Value:**  
- Centralised vessel and route registry eliminates manual record-keeping
- Journey scheduling reduces coordination delays at locks
- Real-time position tracking improves operational visibility

**Product Objectives:**
1. Provide a complete, structured data model for canal navigation entities (vessels, routes, locks, journeys, positions)
2. Expose OData V4 APIs consumable by frontends or integration layers
3. Support real-time position event ingestion and journey history queries

## Requirements

### Must-Have Requirements

**R1**: Vessel Registry

- **User Story**: As a canal operator, I need to register and manage vessels so that I have an accurate inventory of all boats using the waterway.
- **Acceptance Criteria**:
  - Given a vessel with name, type, dimensions, and owner details, when registered, then it is stored and retrievable via OData API.
- **Priority Rank**: 1

**R2**: Waterway & Route Management

- **User Story**: As a canal operator, I need to define waterways and routes (including segments and lock locations) so that journeys can be planned along known paths.
- **Acceptance Criteria**:
  - Given a route definition with waypoints and associated locks, when created, then it is stored and linked to navigation journeys.
- **Priority Rank**: 2

**R3**: Lock Management

- **User Story**: As a canal operator, I need to manage lock records (name, location, capacity, operating hours) so that passage scheduling is accurate.
- **Acceptance Criteria**:
  - Given a lock entity, when queried, then current status and upcoming passage slots are returned.
- **Priority Rank**: 3

**R4**: Journey Scheduling

- **User Story**: As a vessel captain, I need to schedule a navigation journey on a route so that lock passages are reserved and the journey is tracked end-to-end.
- **Acceptance Criteria**:
  - Given a vessel, route, and departure time, when a journey is created, then associated lock passage slots are generated.
- **Priority Rank**: 4

**R5**: Real-Time Position Tracking

- **User Story**: As a canal operator, I need to record position events for vessels during a journey so that I can monitor progress in real time.
- **Acceptance Criteria**:
  - Given a journey in progress, when a position event (latitude, longitude, timestamp) is posted, then it is stored and queryable.
- **Priority Rank**: 5

**R6**: Journey History

- **User Story**: As a canal manager, I need to query completed journey records so that I can review operational history and identify delays.
- **Acceptance Criteria**:
  - Given a date range filter, when queried, then completed journeys with their position logs and lock passages are returned.
- **Priority Rank**: 6

## Solution Architecture

**Architecture Overview:**  
A CAP Node.js service deployed on SAP BTP Cloud Foundry, exposing OData V4 endpoints backed by SAP HANA Cloud for persistence.

**Key Components:**

- **CAP Service** — Node.js CDS service with data model, service definitions, and custom handlers
- **SAP HANA Cloud** — Persistence layer for all navigation entities
- **OData V4 API** — Consumed by frontend or integration clients
- **React UI** — Basic frontend for managing vessels, routes, journeys, and viewing position tracking

**Data Entities:**
- `Vessels` — registry of canal boats
- `Waterways` — canal segments and their properties
- `Routes` — ordered sequences of waterway segments
- `Locks` — lock structures along routes
- `Journeys` — scheduled and active navigation trips
- `LockPassages` — individual lock crossing events within a journey
- `PositionEvents` — real-time GPS coordinates recorded during journeys
