import urllib.request, json, sys

BASE = 'http://localhost:8000/api'

def post(url, data, headers={}):
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type':'application/json', **headers}, method='POST')
    res = urllib.request.urlopen(req, timeout=5)
    return json.loads(res.read())

def get(url, token):
    req = urllib.request.Request(url, headers={'Authorization': f'Token {token}'})
    res = urllib.request.urlopen(req, timeout=5)
    return json.loads(res.read())

print("\n=== CSMS API End-to-End Test ===\n")

# Test 1: Customer login
try:
    r = post(f'{BASE}/auth/login/', {'username': 'demo', 'password': 'demo123'})
    token = r['token']
    print(f"[PASS] Customer login  | token: {token[:16]}...")
except Exception as e:
    print(f"[FAIL] Customer login  | {e}")
    sys.exit(1)

# Test 2: Cars list
try:
    cars = get(f'{BASE}/cars/', token)
    print(f"[PASS] Cars list       | {len(cars)} cars in DB")
    for c in cars:
        print(f"       - {c['make']} {c['model']} | {c['plate_number']} | {c['status']}")
except Exception as e:
    print(f"[FAIL] Cars list       | {e}")

# Test 3: Services list
try:
    svcs = get(f'{BASE}/services/', token)
    print(f"[PASS] Services list   | {len(svcs)} services in DB")
    for s in svcs:
        print(f"       - {s['description'][:40]} | {s['status']} | cost={s['cost']}")
except Exception as e:
    print(f"[FAIL] Services list   | {e}")

# Test 4: Bookings list
try:
    bkgs = get(f'{BASE}/bookings/', token)
    print(f"[PASS] Bookings list   | {len(bkgs)} bookings in DB")
    for b in bkgs:
        print(f"       - {b.get('booking_id', b['id'])} | {b['service_name']} | {b['car_model']} | {b['status']}")
except Exception as e:
    print(f"[FAIL] Bookings list   | {e}")

# Test 5: Dashboard Stats
try:
    st = get(f'{BASE}/bookings/stats/', token)
    print(f"[PASS] Dashboard stats | Total Bookings: {st.get('total_bookings')}, Upcoming: {st.get('upcoming_bookings')}, Completed: {st.get('completed_bookings')}, Cancelled: {st.get('cancelled_bookings')}")
except Exception as e:
    print(f"[FAIL] Dashboard stats | {e}")

# Test 6: Customers list
try:
    custs = get(f'{BASE}/customers/', token)
    print(f"[PASS] Customers list  | {len(custs)} customers in DB")
except Exception as e:
    print(f"[FAIL] Customers list  | {e}")

# Test 7: Admin login + is_staff check
try:
    r2 = post(f'{BASE}/auth/login/', {'username': 'admin', 'password': 'admin123'})
    is_staff = r2['user']['is_staff']
    print(f"[PASS] Admin login     | is_staff={is_staff}")
except Exception as e:
    print(f"[FAIL] Admin login     | {e}")

# Test 8: Users list (admin only)
try:
    r2 = post(f'{BASE}/auth/login/', {'username': 'admin', 'password': 'admin123'})
    admin_token = r2['token']
    users = get(f'{BASE}/auth/users/', admin_token)
    print(f"[PASS] Users list      | {len(users)} users total")
except Exception as e:
    print(f"[FAIL] Users list      | {e}")

print("\n=== Test Complete ===\n")

