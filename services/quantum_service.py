from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal
from services.compute_common import application
from quantum_engine import simulate_route, simulate_quantum_route

app = application("quantum")


class Point(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    name: str = Field(min_length=1, max_length=120)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class RouteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    points: list[Point] = Field(min_length=2, max_length=8)
    mode: Literal["classical", "quantum_demo"] = "classical"


@app.post("/optimize")
def optimize(body: RouteInput):
    if not app.state.capacity.acquire(blocking=False):
        raise HTTPException(503, "Quantum service capacity exhausted")
    try:
        points = [point.model_dump() for point in body.points]
        return (simulate_quantum_route if body.mode == "quantum_demo" else simulate_route)({"points": points})
    except (ValueError, TypeError, KeyError, AttributeError):
        raise HTTPException(422, "Invalid route") from None
    finally:
        app.state.capacity.release()
