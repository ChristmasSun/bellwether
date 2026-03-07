"""
SQLAlchemy models for the polling aggregator database.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    ForeignKey, JSON, UniqueConstraint, Index, Text
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class SenateRace(Base):
    """A 2026 Senate race in a given state."""
    __tablename__ = "senate_races"

    id = Column(Integer, primary_key=True)
    state = Column(String(50), nullable=False, unique=True)
    state_abbr = Column(String(2), nullable=False)
    cycle = Column(Integer, nullable=False, default=2026)
    seat_class = Column(Integer)  # Class I, II, or III
    incumbent_name = Column(String(100))
    incumbent_party = Column(String(10))  # DEM, REP, IND
    is_open = Column(Boolean, default=False)
    cook_rating = Column(String(30))   # Safe D, Likely D, Lean D, Toss-up, etc.
    race_url_rcp = Column(String(500))  # RealClearPolling URL for this race

    called = Column(Boolean, default=False)        # Has AP/networks called this race?
    called_winner = Column(String(10))             # "DEM" or "REP" if called

    polls = relationship("Poll", back_populates="race")
    aggregates = relationship("PollAggregate", back_populates="race")

    def __repr__(self):
        return f"<SenateRace {self.state} ({self.cycle})>"


class Pollster(Base):
    """A polling organization with quality metadata."""
    __tablename__ = "pollsters"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, unique=True)
    name_aliases = Column(JSON, default=list)  # Alternative names used in data sources
    grade = Column(String(5))       # 538 grade: A+, A, A-, B+, B, etc.
    numeric_rating = Column(Float)  # 538 numeric rating (0-3 scale)
    mean_reverted_bias = Column(Float, default=0.0)  # House effect (positive = lean R)
    predictive_plus_minus = Column(Float)
    partisan = Column(Boolean, default=False)  # Is this a partisan pollster?
    partisan_lean = Column(String(5))  # DEM or REP if partisan
    methodology = Column(String(50))  # IVR, Online, Live Phone, Mixed

    polls = relationship("Poll", back_populates="pollster_obj")

    def __repr__(self):
        return f"<Pollster {self.name} ({self.grade})>"


class Poll(Base):
    """An individual poll for a race."""
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True)
    external_id = Column(String(200))  # ID from source system
    source = Column(String(50), nullable=False)  # wikipedia, manual, etc.

    race_id = Column(Integer, ForeignKey("senate_races.id"), nullable=True)
    pollster_id = Column(Integer, ForeignKey("pollsters.id"), nullable=True)

    pollster_name = Column(String(200), nullable=False)
    poll_date_start = Column(DateTime)
    poll_date_end = Column(DateTime, nullable=False)
    sample_size = Column(Integer)
    population = Column(String(10))  # lv, rv, a (likely voters, registered, adults)
    methodology = Column(String(100))  # Online, IVR, Live Phone, Mixed

    # Results stored as JSON: [{"candidate": "John Smith", "party": "DEM", "pct": 48.2}, ...]
    results = Column(JSON, nullable=False)

    # For national polls (generic ballot, approval, etc.)
    poll_type = Column(String(50))      # senate-race, generic-ballot, approval, favorability
    subject = Column(String(200))       # e.g. "Texas Senate", "Donald Trump", "2026"

    # Raw source data for debugging
    raw_data = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    race = relationship("SenateRace", back_populates="polls")
    pollster_obj = relationship("Pollster", back_populates="polls")

    __table_args__ = (
        UniqueConstraint("external_id", "source", name="uq_poll_source_id"),
        Index("ix_polls_race_date", "race_id", "poll_date_end"),
        Index("ix_polls_type", "poll_type"),
    )

    def __repr__(self):
        return f"<Poll {self.pollster_name} {self.poll_date_end} {self.poll_type}>"


class PollAggregate(Base):
    """Computed polling average for a race at a point in time."""
    __tablename__ = "poll_aggregates"

    id = Column(Integer, primary_key=True)
    race_id = Column(Integer, ForeignKey("senate_races.id"), nullable=True)
    poll_type = Column(String(50), nullable=False)  # senate-race, generic-ballot, etc.
    subject = Column(String(200))  # For national polls

    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    polls_included = Column(Integer, default=0)  # Number of polls used

    # Aggregate results: [{"candidate": "Jane Doe", "party": "DEM", "pct": 48.1, "pct_low": 44.5, "pct_high": 51.7}, ...]
    results = Column(JSON, nullable=False)

    # Methodology details
    methodology_notes = Column(Text)

    race = relationship("SenateRace", back_populates="aggregates")

    __table_args__ = (
        Index("ix_aggregates_race_time", "race_id", "computed_at"),
    )

    def __repr__(self):
        return f"<PollAggregate race={self.race_id} computed={self.computed_at}>"


class RefreshLog(Base):
    """Log of data refresh operations."""
    __tablename__ = "refresh_logs"

    id = Column(Integer, primary_key=True)
    source = Column(String(50))
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    polls_added = Column(Integer, default=0)
    polls_updated = Column(Integer, default=0)
    errors = Column(JSON, default=list)
    success = Column(Boolean, default=False)
