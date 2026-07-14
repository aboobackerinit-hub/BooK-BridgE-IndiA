import json

async def app(scope, receive, send):
    assert scope['type'] == 'http'
    await send({
        'type': 'http.response.start',
        'status': 200,
        'headers': [(b'content-type', b'application/json')]
    })
    await send({
        'type': 'http.response.body',
        'body': json.dumps({"ok": True, "message": "Raw ASGI!"}).encode('utf-8')
    })

