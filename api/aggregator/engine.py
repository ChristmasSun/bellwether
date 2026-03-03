"""
Polling aggregation engine.

Methodology (in order of application):
1. Recency weighting  — exponential decay, half-life = 21 days
2. Sample size weight  — proportional to sqrt(n), capped at sqrt(2000)
3. Pollster quality   — multiplier from 538 grades (A+ → 1.5x, C/D → 0.5x)
4. Population adjust  — LV polls get +0.5pp to R, Adults get -0.5pp to R
5. House effects      — iterative correction for each pollster's partisan lean
6. Aggregation        — weighted mean per candidate + 95% confidence interval

Reference: https://abcnews.go.com/538/polling-averages-work/story?id=109364028
"""
import math
import logging
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional

logger = logging.getLogger(__name__)

# Half-life for recency decay (days)
HALF_LIFE_DAYS = 21.0

# Grade → quality multiplier
GRADE_WEIGHTS = {
    "A+": 1.50,
    "A":  1.35,
    "A-": 1.20,
    "A/B": 1.10,
    "B+": 1.05,
    "B":  1.00,
    "B-": 0.90,
    "B/C": 0.80,
    "C+": 0.75,
    "C":  0.65,
    "C-": 0.55,
    "D":  0.45,
}

# Population type adjustments (pp added to REP candidate)
POP_ADJ = {
    "lv": +0.5,
    "rv": 0.0,
    "a":  -0.5,
}

MAX_SAMPLE_WEIGHT = math.sqrt(2000)


def _recency_weight(poll_date: datetime, reference_date: Optional[datetime] = None) -> float:
    """Exponential decay weight based on poll age."""
    ref = reference_date or datetime.utcnow()
    age_days = max(0.0, (ref - poll_date).total_seconds() / 86400)
    return math.exp(-math.log(2) * age_days / HALF_LIFE_DAYS)


def _sample_weight(n: Optional[int]) -> float:
    """Square-root sample size weight, capped at sqrt(2000)."""
    if not n or n <= 0:
        return math.sqrt(600)  # assume ~600 for unknown sample sizes
    return min(math.sqrt(n), MAX_SAMPLE_WEIGHT)


def _quality_weight(grade: Optional[str]) -> float:
    if not grade:
        return 0.85  # slightly below B if unknown
    return GRADE_WEIGHTS.get(grade.strip(), 0.85)


def _population_adjustment(population: Optional[str], candidate_party: str) -> float:
    """
    Return a pp adjustment for a candidate given population type.
    REP candidates get +adj, DEM candidates get -adj.
    """
    adj = POP_ADJ.get((population or "rv").lower(), 0.0)
    if candidate_party.upper() in ("REP", "R", "REPUBLICAN"):
        return adj
    elif candidate_party.upper() in ("DEM", "D", "DEMOCRAT", "DEMOCRATIC"):
        return -adj
    return 0.0


class PollRecord:
    """A single poll prepared for aggregation."""

    def __init__(
        self,
        pollster: str,
        end_date: datetime,
        sample_size: Optional[int],
        population: Optional[str],
        results: list[dict],  # [{"candidate": str, "party": str, "pct": float}]
        grade: Optional[str] = None,
        is_partisan: bool = False,
    ):
        self.pollster = pollster
        self.end_date = end_date
        self.sample_size = sample_size
        self.population = population or "rv"
        self.results = results
        self.grade = grade
        self.is_partisan = is_partisan

        # Apply partisan down-weighting (partisan polls get 0.6x)
        self._partisan_mult = 0.6 if is_partisan else 1.0

    def base_weight(self, reference_date: Optional[datetime] = None) -> float:
        """Combined weight before house effects correction."""
        w = (
            _recency_weight(self.end_date, reference_date)
            * _sample_weight(self.sample_size)
            * _quality_weight(self.grade)
            * self._partisan_mult
        )
        return max(w, 1e-9)

    def adjusted_results(self) -> list[dict]:
        """Results after population type adjustment."""
        out = []
        for r in self.results:
            adj = _population_adjustment(self.population, r.get("party", ""))
            out.append({**r, "pct": r["pct"] + adj})
        return out


def compute_house_effects(
    records: list[PollRecord],
    reference_date: Optional[datetime] = None,
    iterations: int = 3,
) -> dict[str, float]:
    """
    Compute per-pollster house effects (systematic partisan lean).

    Returns {pollster_name: house_effect_pp} where positive means lean-R.
    House effect is measured as pollster's mean R-D margin deviation
    from the overall weighted average R-D margin.
    """
    if not records:
        return {}

    house_effects: dict[str, float] = {}

    for _ in range(iterations):
        # Step 1: compute global weighted average margin
        total_w = 0.0
        total_margin = 0.0

        for rec in records:
            w = rec.base_weight(reference_date)
            he = house_effects.get(rec.pollster, 0.0)
            adj_results = rec.adjusted_results()
            margin = _rd_margin(adj_results) - he
            total_w += w
            total_margin += w * margin

        if total_w == 0:
            break
        global_avg_margin = total_margin / total_w

        # Step 2: compute each pollster's deviation from global
        pollster_margins: dict[str, list[tuple[float, float]]] = defaultdict(list)
        for rec in records:
            w = rec.base_weight(reference_date)
            adj_results = rec.adjusted_results()
            margin = _rd_margin(adj_results)
            pollster_margins[rec.pollster].append((w, margin))

        for pollster, entries in pollster_margins.items():
            total_pw = sum(e[0] for e in entries)
            if total_pw == 0:
                continue
            avg_margin = sum(e[0] * e[1] for e in entries) / total_pw
            house_effects[pollster] = avg_margin - global_avg_margin

    return house_effects


def _rd_margin(results: list[dict]) -> float:
    """R minus D margin from a results list. Returns 0 if can't determine."""
    r_pct = d_pct = None
    for r in results:
        party = r.get("party", "").upper()
        if party in ("REP", "R", "REPUBLICAN") and r_pct is None:
            r_pct = r["pct"]
        elif party in ("DEM", "D", "DEMOCRAT", "DEMOCRATIC") and d_pct is None:
            d_pct = r["pct"]
    if r_pct is not None and d_pct is not None:
        return r_pct - d_pct
    return 0.0


def aggregate_polls(
    records: list[PollRecord],
    reference_date: Optional[datetime] = None,
    apply_house_effects: bool = True,
) -> dict:
    """
    Compute weighted polling average.

    Returns:
    {
        "results": [
            {"candidate": str, "party": str, "pct": float, "pct_low": float, "pct_high": float}
        ],
        "polls_included": int,
        "methodology": {...}
    }
    """
    ref = reference_date or datetime.utcnow()

    if not records:
        return {"results": [], "polls_included": 0, "methodology": {}}

    # Filter to polls within the last 6 months
    cutoff = ref - timedelta(days=180)
    records = [r for r in records if r.end_date >= cutoff]

    if not records:
        return {"results": [], "polls_included": 0, "methodology": {}}

    # Compute house effects
    house_effects = {}
    if apply_house_effects and len(records) >= 3:
        house_effects = compute_house_effects(records, ref)

    # Collect all candidate names across all polls
    all_candidates: dict[str, dict] = {}  # normalized_name -> {candidate, party}
    for rec in records:
        for r in rec.adjusted_results():
            key = r["candidate"].strip().lower()
            if key not in all_candidates:
                all_candidates[key] = {"candidate": r["candidate"], "party": r.get("party", "")}

    # Weighted sum per candidate
    weighted_sums: dict[str, float] = defaultdict(float)
    weight_totals: dict[str, float] = defaultdict(float)
    poll_pcts: dict[str, list[float]] = defaultdict(list)

    total_dominance: dict[str, int] = defaultdict(int)
    for rec in records:
        total_dominance[rec.pollster] += 1

    for rec in records:
        w = rec.base_weight(ref)

        # Down-weight pollsters who flood the zone (dominance correction)
        n_polls = total_dominance[rec.pollster]
        if n_polls > 3:
            w *= math.sqrt(3 / n_polls)

        he = house_effects.get(rec.pollster, 0.0) if apply_house_effects else 0.0
        adj = rec.adjusted_results()

        for r in adj:
            key = r["candidate"].strip().lower()
            pct = r["pct"] - he * _party_sign(r.get("party", ""))
            weighted_sums[key] += w * pct
            weight_totals[key] += w
            poll_pcts[key].append(pct)

    results = []
    for key, info in all_candidates.items():
        if weight_totals[key] == 0:
            continue
        avg = weighted_sums[key] / weight_totals[key]
        pcts = poll_pcts[key]
        # Confidence interval: mean ± 1.96 * std / sqrt(n) (but floor at ±1.5pp)
        if len(pcts) >= 2:
            variance = sum((p - avg) ** 2 for p in pcts) / len(pcts)
            std = math.sqrt(variance)
            margin = max(1.96 * std / math.sqrt(len(pcts)), 1.5)
        else:
            margin = 3.0  # wide CI when we only have 1 poll

        results.append({
            "candidate": info["candidate"],
            "party": info["party"],
            "pct": round(avg, 1),
            "pct_low": round(max(avg - margin, 0), 1),
            "pct_high": round(min(avg + margin, 100), 1),
            "n_polls": len(pcts),
        })

    # Sort by pct descending
    results.sort(key=lambda x: x["pct"], reverse=True)

    return {
        "results": results,
        "polls_included": len(records),
        "methodology": {
            "half_life_days": HALF_LIFE_DAYS,
            "house_effects_applied": apply_house_effects and len(house_effects) > 0,
            "house_effects": {k: round(v, 2) for k, v in house_effects.items()},
            "cutoff_date": cutoff.date().isoformat(),
            "reference_date": ref.date().isoformat(),
        },
    }


def _party_sign(party: str) -> float:
    """Return +1 for REP, -1 for DEM, 0 for other."""
    p = party.upper()
    if p in ("REP", "R", "REPUBLICAN"):
        return 1.0
    if p in ("DEM", "D", "DEMOCRAT", "DEMOCRATIC"):
        return -1.0
    return 0.0
