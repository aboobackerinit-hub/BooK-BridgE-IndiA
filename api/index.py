import traceback
import json

def build_error_app(err_msg, tb_msg):
    async def error_app(scope, receive, send):
        if scope['type'] == 'http':
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [(b'content-type', b'application/json')],
            })
            await send({
                'type': 'http.response.body',
                'body': json.dumps({
                    "error": "Backend initialization failed",
                    "details": err_msg,
                    "traceback": tb_msg
                }).encode('utf-8'),
            })
        elif scope['type'] == 'lifespan':
            while True:
                message = await receive()
                if message['type'] == 'lifespan.startup':
                    await send({'type': 'lifespan.startup.complete'})
                elif message['type'] == 'lifespan.shutdown':
                    await send({'type': 'lifespan.shutdown.complete'})
                    break
    return error_app

try:
    from backend.server import app as real_app  # type: ignore
    app = real_app
except Exception as e:
    err_msg = str(e)
    tb_msg = traceback.format_exc()
    app = build_error_app(err_msg, tb_msg)

__all__ = ["app"]
