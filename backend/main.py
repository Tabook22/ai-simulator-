import os
import sqlite3
import threading
from contextlib import asynccontextmanager, closing
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import engine, llm
from .examples import EXAMPLES
from .models import (AutoBackprop, Backprop, HouseTrain, Lesson, LlmGenerate, LlmGradients, LlmPrompt, LlmTrace,
                     LlmTrain, Network, Resize, Train)
from .house import house_case
from .exam import exam_case
from .presets import PRESETS

ROOT = Path(__file__).resolve().parent
NUMBER_RANGE_ERROR = "The calculation exceeded the number range. Try smaller values or a lower learning rate."


def create_app(database=None):
    db_path = Path(database or os.getenv("NEURON_LAB_DB", ROOT / "lessons.sqlite3"))

    def connect():
        connection = sqlite3.connect(db_path)
        connection.row_factory = sqlite3.Row
        return connection

    @asynccontextmanager
    async def lifespan(_app):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(connect()) as db, db:
            db.executescript((ROOT / "schema.sql").read_text(encoding="utf-8"))
        _app.state.llm = llm.pretrained()
        _app.state.llm_lock = threading.Lock()
        yield

    app = FastAPI(title="Neuron Lab", lifespan=lifespan)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_request, exception):
        issues = []
        for issue in exception.errors():
            location = ".".join(str(part) for part in issue["loc"] if part != "body")
            message = issue["msg"].removeprefix("Value error, ")
            issues.append(f"{location}: {message}" if location else message)
        return JSONResponse({"detail": " ".join(issues)}, status_code=422)

    @app.exception_handler(FloatingPointError)
    async def numerical_error(_request, _exception):
        return JSONResponse({"detail": NUMBER_RANGE_ERROR}, status_code=422)

    @app.get("/api/presets/{key}")
    def preset(key: str):
        if key not in PRESETS:
            raise HTTPException(404, "That preset does not exist.")
        lesson = PRESETS[key]
        return {**lesson, "forward": engine.forward(lesson["network"])}

    @app.post("/api/forward")
    def forward(network: Network):
        return engine.forward(network)

    @app.post("/api/initialize")
    def initialize(network: Network):
        return engine.initialize(network)

    @app.post("/api/resize")
    def resize(request: Resize):
        return engine.resize(request)

    @app.post("/api/train")
    def train(request: Train):
        return engine.train(request)

    @app.post("/api/backprop")
    def backprop(request: Backprop):
        return engine.trace(request.network, request.inputs, request.targets, request.learning_rate)

    @app.post("/api/backprop/auto")
    def auto_backprop(request: AutoBackprop):
        return engine.auto_trace(request.network, request.inputs, request.targets,
                                 request.learning_rate, request.steps)

    @app.post("/api/case/house/train")
    def house_train(request: HouseTrain):
        return house_case(request.epochs, request.batch_size, request.learning_rate)

    @app.post("/api/case/exam/train")
    def exam_train(request: HouseTrain):
        return exam_case(request.epochs, request.batch_size, request.learning_rate)

    @app.get("/api/examples")
    def examples():
        return [
            {"id": key, **{field: value for field, value in example.items() if field != "network"}}
            for key, example in EXAMPLES.items()
        ]

    @app.get("/api/examples/{key}")
    def example(key: str):
        if key not in EXAMPLES:
            raise HTTPException(404, "That worked example does not exist.")
        definition = EXAMPLES[key]
        metadata = {field: value for field, value in definition.items() if field != "network"}
        return {
            "id": key,
            **metadata,
            "trace": engine.trace(
                definition["network"],
                definition["network"].inputs,
                definition["target"],
                definition["learning_rate"],
            ),
        }

    @app.get("/api/llm/info")
    def llm_info(request: Request):
        with request.app.state.llm_lock:
            model = request.app.state.llm
            return {
                "corpus": model.corpus,
                "vocab": model.vocab,
                "context_window": model.context,
                "parameters": model.parameters,
                "loss": model.corpus_loss(),
            }

    @app.post("/api/llm/forward")
    def llm_forward(body: LlmPrompt, request: Request):
        with request.app.state.llm_lock:
            return request.app.state.llm.explain(body.prompt, body.position)

    @app.post("/api/llm/gradients")
    def llm_gradients(body: LlmGradients, request: Request):
        with request.app.state.llm_lock:
            return request.app.state.llm.gradients(body.prompt, body.position, body.target)

    @app.post("/api/llm/trace")
    def llm_trace(body: LlmTrace, request: Request):
        with request.app.state.llm_lock:
            return request.app.state.llm.trace(body.prompt, body.position, body.target, body.link)

    @app.post("/api/llm/train")
    def llm_train(body: LlmTrain, request: Request):
        with request.app.state.llm_lock:
            history = request.app.state.llm.batches(body.steps, body.learning_rate)
            return {"history": history, "loss": history[-1]}

    @app.post("/api/llm/reset")
    def llm_reset(request: Request):
        with request.app.state.llm_lock:
            request.app.state.llm = llm.pretrained()
            return {"loss": request.app.state.llm.corpus_loss()}

    @app.post("/api/llm/generate")
    def llm_generate(body: LlmGenerate, request: Request):
        with request.app.state.llm_lock:
            return request.app.state.llm.generate(body.prompt, body.count, body.temperature, body.seed)


    @app.get("/api/lessons")
    def list_lessons():
        with closing(connect()) as db:
            return [
                dict(row)
                for row in db.execute("SELECT id, name, created_at FROM lessons ORDER BY id DESC")
            ]

    @app.post("/api/lessons", status_code=201)
    def save_lesson(lesson: Lesson):
        with closing(connect()) as db, db:
            row = db.execute(
                "INSERT INTO lessons (name, configuration) VALUES (?, ?) RETURNING id, name, created_at",
                (lesson.name, lesson.model_dump_json()),
            ).fetchone()
        return dict(row)

    @app.get("/api/lessons/{lesson_id}")
    def open_lesson(lesson_id: int):
        with closing(connect()) as db:
            row = db.execute("SELECT configuration FROM lessons WHERE id = ?", (lesson_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "That lesson does not exist.")
        lesson = Lesson.model_validate_json(row["configuration"])
        try:
            forward = engine.forward(lesson.network)
        except FloatingPointError:
            return {**lesson.model_dump(), "forward": None, "warning": NUMBER_RANGE_ERROR}
        return {**lesson.model_dump(), "forward": forward}

    @app.delete("/api/lessons/{lesson_id}", status_code=204)
    def delete_lesson(lesson_id: int):
        with closing(connect()) as db, db:
            result = db.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))
            if result.rowcount == 0:
                raise HTTPException(404, "That lesson does not exist.")
        return Response(status_code=204)

    dist = ROOT.parent / "frontend" / "dist"
    if (dist / "index.html").is_file():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")
        if (dist / "reference").is_dir():
            app.mount("/reference", StaticFiles(directory=dist / "reference"), name="reference")
        if (dist / "downloads").is_dir():
            app.mount("/downloads", StaticFiles(directory=dist / "downloads"), name="downloads")

        @app.get("/", include_in_schema=False)
        def home():
            # The page names its scripts by content hash, so it must never be served from an old
            # browser cache: after a rebuild the browser would keep loading the previous build.
            return FileResponse(dist / "index.html", headers={"Cache-Control": "no-cache"})

        @app.get("/neuron.svg", include_in_schema=False)
        def icon():
            return FileResponse(dist / "neuron.svg")

    return app


app = create_app()
