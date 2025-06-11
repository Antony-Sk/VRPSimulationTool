
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class Coordinates(BaseModel):
    x: float
    y: float


class VehiclesType(BaseModel):
    # In TWVRP - maximum route duration, in CVRP - capacity
    capacity: int = 50  
    number: int = 1


class Edge(BaseModel):
    # Indexes of vertices
    frm: int
    to: int
    # Time/cost/length of edge
    cost: float


class VRProblem(BaseModel):
    vehicles: list[VehiclesType]
    vertices: list[Coordinates]
    edges: list[Edge]
    depot_indices: list[int]
    best_sol: Optional[int] = None
    demands: Optional[list[int]] = None


class CVRProblem(VRProblem):
    pass


class TWVRProblem(VRProblem):
    time_windows: list[tuple[int, int]]


class ProblemType(Enum):
    TIME_WINDOWED = "twvrp"
    CAPACITATED = "cvrp"


class SolverType(Enum):
    OR_TOOLS = "or-tools"
    PYVRP = "pyvrp"


class VrpSolverRequest(BaseModel):
    problem: CVRProblem | TWVRProblem
    problem_type: ProblemType
    solver: Optional[SolverType] = SolverType.PYVRP


class VRPSolution(BaseModel):
    visits: list[list[int]]
    distance: float
