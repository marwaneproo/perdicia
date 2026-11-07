import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .database import init_db
from .routes import router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("intellibi")

app = FastAPI(title="IntelliBI Flow API", version="1.0.0")


@app.on_event("startup")
def startup():
    init_db()


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error")
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


app.include_router(router)
