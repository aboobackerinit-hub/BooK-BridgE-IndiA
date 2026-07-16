import os

with open('backend/server.py', 'r') as f:
    code = f.read()

# Indent all lines of the code
indented_code = '\n'.join(['    ' + line for line in code.split('\n')])

new_code = f"""import traceback

try:
{indented_code}
except Exception as e:
    err = traceback.format_exc()
    
    async def app(scope, receive, send):
        assert scope['type'] == 'http'
        await send({{
            'type': 'http.response.start',
            'status': 500,
            'headers': [
                (b'content-type', b'text/plain'),
            ]
        }})
        await send({{
            'type': 'http.response.body',
            'body': f"BOOT CRASH CAUGHT BY ASGI WRAPPER:\\n{{err}}".encode('utf-8'),
        }})
"""

with open('api/index.py', 'w') as f:
    f.write(new_code)
