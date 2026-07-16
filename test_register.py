import json
import urllib.request
import urllib.error

url = 'http://localhost:8001/api/auth/register'
data = json.dumps({
    "name": "Test User",
    "email": "test9992@example.com",
    "password": "password123",
    "role": "user"
}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode('utf-8'))
