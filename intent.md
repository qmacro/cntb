# Canal Navigation & Tracking Backend

Canal navigation and tracking management system

## Business challenge

Build a CAP backend to manage canal navigation and tracking — covering vessels, routes, locks, waterway journeys, and real-time position tracking for canal operations.

## Business Architecture (RBA)

### End-to-End Process

Plan to Fulfill — Deliver Product to Fulfill (Transportation Execution)

### Process Hierarchy

```
Plan to Fulfill (E2E)
└── Deliver Product to Fulfill
    └── Plan and execute transportation (BPS-355_006)
        └── Execute transportation
    └── Manage dry bulk supply and distribution (BPS-355_007)
        └── Manage demurrage and claims
    └── Manage hydrocarbon supply and primary distribution (BPS-355_001)
        └── Manage demurrage and claims
```

### Summary

Canal navigation maps to waterway-based transportation execution and fleet management. The closest SAP RBA analogues are vessel-centric supply distribution and transportation execution sub-processes, with capabilities like Voyage Planning, Fleet Planning & Optimization, and Conveyance Tracking identified — though primarily for bulk/hydrocarbon shipping rather than canal-specific operations.

## Fit Gap Analysis

| Requirement (business) | Standard asset(s) found | API ORD ID | MCP Server ORD ID | MCP Server Version | Gap? | Notes / assumptions |
| ---------------------- | ----------------------- | ---------- | ----------------- | ------------------ | ---- | ------------------- |
| Vessel registry & management | SAP S/4HANA Cloud Private (Fleet Planning & Optimization SC5320) | — | — | — | Yes | Standard covers bulk/oil fleets; canal vessels need custom model |
| Route & waterway management | No standard asset | — | — | — | Yes | Canal-specific routes and locks not covered by SAP standard |
| Journey scheduling | SAP S/4HANA TM (Transportation Execution SC5546) | — | — | — | Yes | TM covers road/rail/sea, not canal locks and waterways |
| Lock passage tracking | No standard asset | — | — | — | Yes | Lock scheduling is unique to inland waterways — custom dev required |
| Real-time position tracking | SAP Event Management on S/4HANA (SC5546) | — | — | — | Yes | Event Management handles tracking events; GPS/position is a gap |
| Voyage/journey history | SAP S/4HANA (Voyage Planning WSC-BC637) | — | — | — | Yes | Voyage Planning is optional/no-recommendation; canal-specific history is a gap |

### Key findings
- No standard SAP product fully covers canal-specific navigation (locks, waterway segments, inland vessel tracking)
- Fleet Planning & Optimization and Voyage Planning in S/4HANA Private Edition are the closest analogues but target bulk shipping
- Real-time GPS position tracking is a full gap — requires custom development
- Lock passage management is entirely unique to inland waterways and has no SAP standard coverage
- CAP App on BTP is the right approach: build a tailored data model for vessels, routes, locks, journeys, and position events
- No MCP servers found for this niche domain; all data management will be native to the CAP service

## Recommendations

### CAP Backend for Canal Navigation & Tracking

#### Executive Summary

Custom CAP backend on BTP for end-to-end canal navigation management

#### Recommended Solution

Build a Cloud Application Programming Model (CAP) Node.js service on SAP BTP that provides a full data model and REST/OData APIs for: vessel registry, waterway/route definitions, lock management, journey scheduling, real-time position tracking events, and journey history. The service will expose OData V4 endpoints consumable by any frontend or integration layer.

#### Recommended solution category

CAP App

#### Intent fit
85%
