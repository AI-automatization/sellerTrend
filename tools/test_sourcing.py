import urllib.request, json, time

BASE = 'http://localhost:3000/api/v1'

def post(path, body, token=None):
    data = json.dumps(body).encode()
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read())

# Login
print('Logging in...')
resp = post('/auth/login', {'email': 'admin@uzum-trend.uz', 'password': 'Admin123!'})
token = resp['access_token']
print(f'Token: {token[:40]}...')

# Sourcing search
print('\nSourcing search: "lipstick" ...')
t0 = time.time()
resp = post('/sourcing/search', {'query': 'lipstick', 'source': 'BOTH'}, token)
elapsed = time.time() - t0
results = resp.get('results', [])
print(f'Done in {elapsed:.1f}s — {len(results)} results')
for item in results[:10]:
    title = str(item.get('title', ''))[:60]
    price = str(item.get('price', ''))
    source = str(item.get('source', ''))
    link = str(item.get('link', ''))[:50]
    print(f'  [{source}] {title} | {price} | {link}')
