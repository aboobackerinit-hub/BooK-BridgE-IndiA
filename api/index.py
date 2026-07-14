import sys
import traceback
import json
from pathlib import Path

class ASGIErrorHandler:
    def __init__(self, err_msg, tb_msg):
        self.err_msg = err_msg
        self.tb_msg = tb_msg

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'lifespan':
            while True:
                message = await receive()
                if message['type'] == 'lifespan.startup':
                    print(f"ASGI ERROR PATH RUNNING. Original Error:\n{self.tb_msg}", file=sys.stderr)
                    await send({'type': 'lifespan.startup.complete'})
                elif message['type'] == 'lifespan.shutdown':
                    await send({'type': 'lifespan.shutdown.complete'})
                    break
        elif scope['type'] == 'http':
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [(b'content-type', b'application/json')],
            })
            await send({
                'type': 'http.response.body',
                'body': json.dumps({
                    "error": "Backend initialization failed",
                    "details": self.err_msg,
                    "traceback": self.tb_msg
                }).encode('utf-8'),
            })

app = None

try:
    # Make the backend/ folder importable
    BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
    sys.path.insert(0, str(BACKEND_DIR))
    from server import app as _real_app  # type: ignore
    
    class ASGIFailsafeWrapper:
        def __init__(self, real_app):
            self.real_app = real_app

        async def __call__(self, scope, receive, send):
            try:
                await self.real_app(scope, receive, send)
            except Exception as e:
                err_msg = str(e)
                tb_msg = traceback.format_exc()
                print(f"ASGI Runtime Error:\n{tb_msg}", file=sys.stderr)
                if scope['type'] == 'http':
                    try:
                        await send({
                            'type': 'http.response.start',
                            'status': 500,
                            'headers': [(b'content-type', b'application/json')],
                        })
                        await send({
                            'type': 'http.response.body',
                            'body': json.dumps({
                                "error": "Runtime crash",
                                "details": err_msg,
                                "traceback": tb_msg
                            }).encode('utf-8'),
                        })
                    except Exception:
                        pass
                raise e

    app = ASGIFailsafeWrapper(_real_app)

except Exception as e:
    app = ASGIErrorHandler(str(e), traceback.format_exc())

__all__ = ["app"]



