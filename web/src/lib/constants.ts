/**
 * Bellwether — All tunable constants in one place.
 *
 * Adjust these to change how the dashboard behaves.
 */

// ---------------------------------------------------------------------------
// Senate seat baseline (non-contested seats from the 2024 election)
// ---------------------------------------------------------------------------

/** Dem seats NOT up for reelection in 2026 (includes 2 independents caucusing with Dems) */
export const SEN_D_BASE = 34;

/** Rep seats NOT up for reelection in 2026 (excludes FL + OH special elections) */
export const SEN_R_BASE = 31;

// ---------------------------------------------------------------------------
// Battleground & matchup thresholds
// ---------------------------------------------------------------------------

/** Races within this margin (absolute value) are considered battlegrounds */
export const BATTLEGROUND_MARGIN_THRESHOLD = 5;

/** Minimum number of polls for a matchup to appear in the switcher */
export const MATCHUP_MIN_POLLS = 5;

// ---------------------------------------------------------------------------
// Polling average weights
// ---------------------------------------------------------------------------

/** Half-life in days for recency decay. A poll's weight halves every N days. */
export const RECENCY_HALF_LIFE_DAYS = 30;

/** Weight multiplier per pollster grade (VoteHub) */
export const GRADE_WEIGHTS: Record<string, number> = {
  "A+": 5,
  "A": 4,
  "B": 3,
  "C": 2,
  "D": 1,
};

/** Weight for pollsters not in the VoteHub database */
export const UNRATED_POLLSTER_WEIGHT = 2;

// ---------------------------------------------------------------------------
// National environment adjustment for House projections
// ---------------------------------------------------------------------------

/** Expected national D−R environment shift for 2026 midterm (positive = D).
 *  Applied when projecting unpolled House seats. Fallback if no generic ballot data. */
export const HOUSE_NATIONAL_ENVIRONMENT = 2.0;

/** Number of recent polls (within RECENT_POLL_DAYS) at which a district's projection
 *  fully trusts its polling data over the generic ballot prior. At fewer polls,
 *  the projection blends polling margin with the generic ballot margin. */
export const POLLS_FOR_FULL_WEIGHT = 5;

/** How many days back to count polls as "recent" for the blending weight. */
export const RECENT_POLL_DAYS = 30;

// ---------------------------------------------------------------------------
// Rating thresholds (derived from polling margin)
// ---------------------------------------------------------------------------

/** Margin thresholds for race ratings. All values are absolute. */
export const RATING_THRESHOLDS = {
  safe: 10,      // > 10: Safe D/R
  likely: 6,     // 6–10: Likely D/R
  lean: 2.5,     // 2.5–6: Lean D/R
                  // < 2.5: Toss-Up
};

// ---------------------------------------------------------------------------
// Independent candidates (treated as DEM in data but displayed differently)
// ---------------------------------------------------------------------------

/** Candidates who are technically Independent but aligned with a party.
 *  These get special styling (independent colors) and a label noting their status. */
export const INDEPENDENT_CANDIDATES: Record<string, { party: "DEM" | "REP"; note: string }> = {
  "Osborn": { party: "DEM", note: "Running as Independent" },
};

/** Color for independent-aligned candidates */
export const IND_COLOR = "#6B5B95";
export const IND_COLOR_BG = "rgba(107,91,149,0.08)";

// ---------------------------------------------------------------------------
// Trend calculation
// ---------------------------------------------------------------------------

/** Minimum shift (absolute) to show a trend arrow. Below this = "—" */
export const TREND_MIN_SHIFT = 0.1;

/** Minimum number of polls required before showing a trend */
export const TREND_MIN_POLLS = 5;

/** Number of recent polls to compare against prior polls for trend */
export const TREND_WINDOW = 3;

// ---------------------------------------------------------------------------
// Primary polling
// ---------------------------------------------------------------------------

/** Minimum weighted polling average (%) for a primary candidate to be shown */
export const PRIMARY_MIN_AVG_PCT = 10;
