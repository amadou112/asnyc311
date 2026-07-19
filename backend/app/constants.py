"""Canonical enumerated values shared across models, schemas, and seed."""
from __future__ import annotations

REQUEST_STATUSES = [
    "new",
    "triaged",
    "in_progress",
    "pending_inspection",
    "resolved",
    "closed",
    "reopened",
]
OPEN_STATUSES = {"new", "triaged", "in_progress", "pending_inspection", "reopened"}
CLOSED_STATUSES = {"resolved", "closed"}

PRIORITIES = ["low", "medium", "high", "critical"]

CHANNELS = ["ONLINE", "PHONE", "MOBILE", "WALK_IN", "EMAIL"]

INSPECTION_STATUSES = ["scheduled", "completed", "canceled", "no_access"]
COMPLIANCE_STATUSES = ["compliant", "non_compliant", "pending"]

RBAC_ROLES = [
    ("citizen", "Submit and track their own requests"),
    ("inspector", "Perform field inspections and file reports"),
    ("supervisor", "Assign and oversee inspectors"),
    ("agency_manager", "Manage an agency's queue and SLAs"),
    ("executive", "View cross-agency analytics and reports"),
    ("administrator", "Full system administration"),
]

# Complaint taxonomy → category, requested by the spec.
COMPLAINT_CATEGORIES = {
    "Noise - Residential": "Noise",
    "Noise - Street/Sidewalk": "Noise",
    "Noise - Commercial": "Noise",
    "Illegal Parking": "Parking",
    "Blocked Driveway": "Parking",
    "Water System": "Water",
    "Water Quality": "Water",
    "HEAT/HOT WATER": "Housing",
    "Heat/Hot Water": "Housing",
    "Plumbing": "Housing",
    "General Construction/Plumbing": "Housing",
    "Unsanitary Condition": "Sanitation",
    "Dirty Condition": "Sanitation",
    "Sanitation Condition": "Sanitation",
    "Missed Collection": "Sanitation",
    "Street Condition": "Transportation",
    "Traffic Signal Condition": "Transportation",
    "Street Light Condition": "Utilities",
    "Damaged Tree": "Utilities",
    "Emergency Response Team (ERT)": "Emergency",
}

# Five NYC boroughs with rough population / area for reference dims.
BOROUGH_FACTS = {
    "MANHATTAN": (1_694_251, 22.83),
    "BRONX": (1_472_654, 42.10),
    "BROOKLYN": (2_736_074, 69.50),
    "QUEENS": (2_405_464, 108.53),
    "STATEN ISLAND": (495_747, 58.37),
}
