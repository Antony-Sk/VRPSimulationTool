from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from backend.services.examples import FetchExamplesService
from backend.services.ortools import OrToolsService
from backend.services.pyvrp import PyvrpService
from backend.models import CVRProblem, ProblemType, SolverType, VrpSolverRequest, VRPSolution

router = APIRouter()


def get_router():
    return router


@router.post("/solve-classic-vrp", response_model=VRPSolution)
def solve_vrp(data: VrpSolverRequest):
    match data.solver:
        case SolverType.PYVRP:
            service = PyvrpService()
        case SolverType.OR_TOOLS:
            service = OrToolsService()

    match data.problem_type:
        case ProblemType.CAPACITATED:
            return service.solveCvrp(data.problem)
        case ProblemType.TIME_WINDOWED:
            return service.solveTwvrp(data.problem)


@router.get("/")
def index():
    with open("frontend/index.html", "r") as f:
        return HTMLResponse(f.read())


@router.get("/dataset")
def index():
    with open("frontend/dataset.html", "r") as f:
        return HTMLResponse(f.read())


@router.get("/api/vrp/{file_name}", response_model=CVRProblem)
async def get_vrp(file_name: str):
    service = FetchExamplesService()
    return service.get_example_by_name(file_name)


@router.get("/examples", response_model=list[str])
async def get_vrp_examples_names():
    service = FetchExamplesService()
    return service.get_names()
