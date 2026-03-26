"""
2026 Governor races seed data.
36 gubernatorial elections.
Verified from Ballotpedia, Cook Political Report (via 270toWin), March 2026.
"""

GOVERNOR_RACES_2026 = [
    # --- Toss-Up (5) ---
    {
        "state": "Arizona",
        "state_abbr": "AZ",
        "incumbent_name": "Katie Hobbs",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Toss-up",
    },
    {
        "state": "Georgia",
        "state_abbr": "GA",
        "incumbent_name": "Brian Kemp",
        "incumbent_party": "REP",
        "is_open": True,  # term-limited
        "cook_rating": "Toss-up",
    },
    {
        "state": "Michigan",
        "state_abbr": "MI",
        "incumbent_name": "Gretchen Whitmer",
        "incumbent_party": "DEM",
        "is_open": True,  # term-limited
        "cook_rating": "Toss-up",
    },
    {
        "state": "Nevada",
        "state_abbr": "NV",
        "incumbent_name": "Joe Lombardo",
        "incumbent_party": "REP",
        "is_open": False,
        "cook_rating": "Toss-up",
    },
    {
        "state": "Wisconsin",
        "state_abbr": "WI",
        "incumbent_name": "Tony Evers",
        "incumbent_party": "DEM",
        "is_open": True,  # retiring
        "cook_rating": "Toss-up",
    },
    # --- Lean D (5) ---
    {
        "state": "Maine",
        "state_abbr": "ME",
        "incumbent_name": "Janet Mills",
        "incumbent_party": "DEM",
        "is_open": True,  # term-limited
        "cook_rating": "Lean DEM",
    },
    {
        "state": "New Mexico",
        "state_abbr": "NM",
        "incumbent_name": "Michelle Lujan Grisham",
        "incumbent_party": "DEM",
        "is_open": True,  # term-limited
        "cook_rating": "Lean DEM",
    },
    {
        "state": "New York",
        "state_abbr": "NY",
        "incumbent_name": "Kathy Hochul",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Lean DEM",
    },
    {
        "state": "Oregon",
        "state_abbr": "OR",
        "incumbent_name": "Tina Kotek",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Lean DEM",
    },
    {
        "state": "Pennsylvania",
        "state_abbr": "PA",
        "incumbent_name": "Josh Shapiro",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Lean DEM",
    },
    # --- Likely D (9) ---
    {
        "state": "California",
        "state_abbr": "CA",
        "incumbent_name": "Gavin Newsom",
        "incumbent_party": "DEM",
        "is_open": True,  # term-limited
        "cook_rating": "Likely DEM",
    },
    {
        "state": "Colorado",
        "state_abbr": "CO",
        "incumbent_name": "Jared Polis",
        "incumbent_party": "DEM",
        "is_open": True,  # term-limited
        "cook_rating": "Likely DEM",
    },
    {
        "state": "Connecticut",
        "state_abbr": "CT",
        "incumbent_name": "Ned Lamont",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Likely DEM",
    },
    {
        "state": "Hawaii",
        "state_abbr": "HI",
        "incumbent_name": "Josh Green",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Likely DEM",
    },
    {
        "state": "Illinois",
        "state_abbr": "IL",
        "incumbent_name": "J.B. Pritzker",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Likely DEM",
    },
    {
        "state": "Maryland",
        "state_abbr": "MD",
        "incumbent_name": "Wes Moore",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Likely DEM",
    },
    {
        "state": "Massachusetts",
        "state_abbr": "MA",
        "incumbent_name": "Maura Healey",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Likely DEM",
    },
    {
        "state": "Minnesota",
        "state_abbr": "MN",
        "incumbent_name": "Tim Walz",
        "incumbent_party": "DEM",
        "is_open": True,  # retiring
        "cook_rating": "Likely DEM",
    },
    {
        "state": "Rhode Island",
        "state_abbr": "RI",
        "incumbent_name": "Dan McKee",
        "incumbent_party": "DEM",
        "is_open": False,
        "cook_rating": "Likely DEM",
    },
    # --- Lean R (3) ---
    {
        "state": "Iowa",
        "state_abbr": "IA",
        "incumbent_name": "Kim Reynolds",
        "incumbent_party": "REP",
        "is_open": True,  # retiring
        "cook_rating": "Lean REP",
    },
    {
        "state": "Kansas",
        "state_abbr": "KS",
        "incumbent_name": "Laura Kelly",
        "incumbent_party": "DEM",
        "is_open": True,  # term-limited
        "cook_rating": "Lean REP",
    },
    {
        "state": "Ohio",
        "state_abbr": "OH",
        "incumbent_name": "Mike DeWine",
        "incumbent_party": "REP",
        "is_open": True,  # term-limited
        "cook_rating": "Lean REP",
    },
    # --- Likely R (4) ---
    {
        "state": "Alaska",
        "state_abbr": "AK",
        "incumbent_name": "Mike Dunleavy",
        "incumbent_party": "REP",
        "is_open": True,  # term-limited
        "cook_rating": "Likely REP",
    },
    {
        "state": "Florida",
        "state_abbr": "FL",
        "incumbent_name": "Ron DeSantis",
        "incumbent_party": "REP",
        "is_open": True,  # term-limited
        "cook_rating": "Likely REP",
    },
    {
        "state": "New Hampshire",
        "state_abbr": "NH",
        "incumbent_name": "Kelly Ayotte",
        "incumbent_party": "REP",
        "is_open": False,
        "cook_rating": "Likely REP",
    },
    {
        "state": "Vermont",
        "state_abbr": "VT",
        "incumbent_name": "Phil Scott",
        "incumbent_party": "REP",
        "is_open": False,
        "cook_rating": "Likely REP",
    },
    # --- Solid R (10) ---
    {
        "state": "Alabama",
        "state_abbr": "AL",
        "incumbent_name": "Kay Ivey",
        "incumbent_party": "REP",
        "is_open": True,  # term-limited
        "cook_rating": "Solid REP",
    },
    {
        "state": "Arkansas",
        "state_abbr": "AR",
        "incumbent_name": "Sarah Huckabee Sanders",
        "incumbent_party": "REP",
        "is_open": False,
        "cook_rating": "Solid REP",
    },
    {
        "state": "Idaho",
        "state_abbr": "ID",
        "incumbent_name": "Brad Little",
        "incumbent_party": "REP",
        "is_open": False,
        "cook_rating": "Solid REP",
    },
    {
        "state": "Nebraska",
        "state_abbr": "NE",
        "incumbent_name": "Jim Pillen",
        "incumbent_party": "REP",
        "is_open": False,
        "cook_rating": "Solid REP",
    },
    {
        "state": "Oklahoma",
        "state_abbr": "OK",
        "incumbent_name": "Kevin Stitt",
        "incumbent_party": "REP",
        "is_open": True,  # term-limited
        "cook_rating": "Solid REP",
    },
    {
        "state": "South Carolina",
        "state_abbr": "SC",
        "incumbent_name": "Henry McMaster",
        "incumbent_party": "REP",
        "is_open": True,  # term-limited
        "cook_rating": "Solid REP",
    },
    {
        "state": "South Dakota",
        "state_abbr": "SD",
        "incumbent_name": "Larry Rhoden",
        "incumbent_party": "REP",
        "is_open": False,
        "cook_rating": "Solid REP",
    },
    {
        "state": "Tennessee",
        "state_abbr": "TN",
        "incumbent_name": "Bill Lee",
        "incumbent_party": "REP",
        "is_open": True,  # term-limited
        "cook_rating": "Solid REP",
    },
    {
        "state": "Texas",
        "state_abbr": "TX",
        "incumbent_name": "Greg Abbott",
        "incumbent_party": "REP",
        "is_open": False,
        "cook_rating": "Solid REP",
    },
    {
        "state": "Wyoming",
        "state_abbr": "WY",
        "incumbent_name": "Mark Gordon",
        "incumbent_party": "REP",
        "is_open": True,  # term-limited
        "cook_rating": "Solid REP",
    },
]
