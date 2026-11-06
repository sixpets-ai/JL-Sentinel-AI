from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict, AwareDatetime
from typing import Literal
from services.compute_common import application
from heatmap_generator import build_scenario, generate_heatmap
from pattern_analyzer import analyze_patterns

app = application("heatmap")


class HeatmapInput(BaseModel):
    events: list[dict] = Field(max_length=500)


def calculate(fn):
    if not app.state.capacity.acquire(blocking=False):
        raise HTTPException(503, "Heatmap service capacity exhausted")
    try:
        return fn()
    except (ValueError, TypeError, KeyError, AttributeError):
        raise HTTPException(422, "Invalid synthetic event data") from None
    finally:
        app.state.capacity.release()


@app.get("/scenario")
def scenario():
    return calculate(build_scenario)


@app.post("/heatmap")
def heatmap(body: HeatmapInput):
    return calculate(lambda: generate_heatmap(body.events))


class PatternEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    id: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=60)
    zone: Literal["centro", "norte", "sur"]
    categoryCode: str = Field(min_length=1, max_length=40)
    description: str = Field(max_length=160)
    timestamp: AwareDatetime
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class PatternInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    events: list[PatternEvent] = Field(max_length=60)
    source: Literal["demo", "portal"]
    zone: Literal["all", "centro", "norte", "sur"]
    window_days: Literal[30, 90, 180]
    threshold: float = Field(ge=.5, le=1)
    as_of: AwareDatetime
    total_available: int = Field(ge=0)


@app.post("/patterns")
def patterns(body: PatternInput):
    return calculate(lambda: analyze_patterns(
        [event.model_dump(mode="json") for event in body.events],
        source=body.source, zone=body.zone, window_days=body.window_days,
        threshold=body.threshold, as_of=body.as_of, total_available=body.total_available,
    ))
