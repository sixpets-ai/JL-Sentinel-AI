"""Internal-only HTTP services. Never expose these ports to the public proxy."""
import threading
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def application(name):
    app = FastAPI(title=f"SANTI {name}", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.capacity = threading.BoundedSemaphore(2)

    @app.middleware("http")
    async def bound_request(request: Request, call_next):
        # Node also limits JSON input. Check streamed bodies here independently.
        body = bytearray()
        async for part in request.stream():
            body.extend(part)
            if len(body) > 65536:
                return JSONResponse({"error": "Request too large"}, status_code=413)
        request._body = bytes(body)
        return await call_next(request)

    @app.get("/health")
    def health():
        return {"status": "ok", "service": name}

    return app
