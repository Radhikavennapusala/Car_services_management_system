"""
seed_data.py — Seed CSMS database with initial sample data.
Run with: python manage.py shell < seed_data.py
Or:        python seed_data.py (if run from backend dir)
"""
import os, sys, django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'car_management.settings')
django.setup()

from django.contrib.auth.models import User
from customers.models import Customer
from cars.models import Car
from services.models import Service
from bookings.models import Booking
from datetime import date, timedelta

print("=" * 50)
print("  CSMS — Seeding Database")
print("=" * 50)

# ── 1. Admin user ──────────────────────────────────────
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@csms.com', 'admin123')
    print("[OK] Admin user created  (admin / admin123)")
else:
    print("[INFO] Admin user already exists")

# ── 2. Demo customer user ──────────────────────────────
demo_user, created = User.objects.get_or_create(
    username='demo',
    defaults=dict(email='demo@csms.com', first_name='Demo', last_name='Customer', is_active=True)
)
if created:
    demo_user.set_password('demo123')
    demo_user.save()
    print("[OK] Demo customer created  (demo / demo123)")
else:
    print("[INFO] Demo customer already exists")

# ── 3. Customer profile ────────────────────────────────
customer, _ = Customer.objects.get_or_create(
    email='demo@csms.com',
    defaults=dict(name='Demo Customer', phone='9876543210', address='123 Main Street, Mumbai')
)
print(f"[OK] Customer record: {customer.name}")
# ── 4. Sample cars ─────────────────────────────────────
sample_cars = [
    dict(make='Toyota',        model='Fortuner',  year=2022, color='White',  plate_number='MH-12-PQ-1234', mileage=25000, status='available'),
    dict(make='Honda',         model='City',      year=2021, color='Silver', plate_number='DL-3C-AB-5678', mileage=18000, status='available'),
    dict(make='Hyundai',       model='i20',       year=2023, color='Red',    plate_number='KA-03-MN-9012', mileage=8000,  status='available'),
    dict(make='Maruti Suzuki', model='Swift',     year=2020, color='Blue',   plate_number='HR-26-CD-3456', mileage=35000, status='in_service'),
]
admin = User.objects.get(username='admin')
cars_created = 0
car_objs = []
for c in sample_cars:
    obj, created = Car.objects.get_or_create(
        plate_number=c['plate_number'],
        defaults={**c, 'submitted_by': admin}
    )
    car_objs.append(obj)
    if created: cars_created += 1
print(f"[OK] {cars_created} new cars added  ({Car.objects.count()} total)")

# ── 5. Sample services ─────────────────────────────────
today = date.today()
services_data = [
    dict(car=car_objs[0], description='General Service - Full inspection', cost=1499, service_date=today - timedelta(days=5), status='completed', completed=True, requested_by=demo_user, pickup_details='Pickup & Drop'),
    dict(car=car_objs[1], description='Oil Change - Standard', cost=999,  service_date=today - timedelta(days=2), status='in_progress', completed=False, requested_by=demo_user, pickup_details='Self Drop'),
    dict(car=car_objs[2], description='Car Wash - Premium',    cost=598,  service_date=today,                    status='pending',     completed=False, requested_by=demo_user, pickup_details='Pickup & Drop'),
]
svc_created = 0
for s in services_data:
    if not Service.objects.filter(car=s['car'], service_date=s['service_date']).exists():
        Service.objects.create(**s)
        svc_created += 1
print(f"[OK] {svc_created} new services added  ({Service.objects.count()} total)")

# ── 6. Sample booking ──────────────────────────────────
from datetime import time as dtime
if not Booking.objects.filter(customer=demo_user).exists():
    Booking.objects.create(
        customer=demo_user,
        car_model='Honda City',
        car_registration_number='AP09AB1234',
        service_name='Car Wash',
        booking_date=today + timedelta(days=2),
        booking_time=dtime(10, 0),
        price=299,
        status='Confirmed',
        notes='Please check AC as well'
    )
    Booking.objects.create(
        customer=demo_user,
        car_model='Toyota Fortuner',
        car_registration_number='MH12PQ1234',
        service_name='Oil Change',
        booking_date=today + timedelta(days=5),
        booking_time=dtime(14, 30),
        price=1499,
        status='Pending',
        notes='Engine oil replace'
    )
    Booking.objects.create(
        customer=demo_user,
        car_model='Hyundai i20',
        car_registration_number='KA03MN9012',
        service_name='Wheel Alignment',
        booking_date=today - timedelta(days=3),
        booking_time=dtime(11, 0),
        price=499,
        status='Completed',
        notes='Done regular maintenance'
    )
    print("[OK] Sample bookings created")
else:
    print("[INFO] Bookings already exist")

print()
print("=" * 50)
print("  Seed complete!")
print(f"  Users:     {User.objects.count()}")
print(f"  Customers: {Customer.objects.count()}")
print(f"  Cars:      {Car.objects.count()}")
print(f"  Services:  {Service.objects.count()}")
print(f"  Bookings:  {Booking.objects.count()}")
print("=" * 50)
print()
print("  Login credentials:")
print("  Admin:    admin / admin123   -> http://localhost:8000/admin")
print("  Customer: demo  / demo123   -> http://localhost:5173")
print("=" * 50)
