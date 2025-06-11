from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.route import get_router

app = FastAPI(
    title="VRP Optimization API",
    description="A web service for solving Vehicle Routing Problem (VRP) variants and visualizing results.",
    version="1.0.0",
)
app.mount("/static", StaticFiles(directory="frontend/static"))
app.include_router(get_router())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
