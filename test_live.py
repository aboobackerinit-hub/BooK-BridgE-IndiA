import urllib.request
import json
import urllib.error

req = urllib.request.Request(
    'https://boo-k-bridg-e-indi-a.vercel.app/api/auth/register',
    data=json.dumps({'name':'test','email':'test@example.com','password':'password','role':'user'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode())
