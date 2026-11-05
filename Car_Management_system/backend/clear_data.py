import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'car_management.settings')
django.setup()

from cars.models import Car
from services.models import Service
from bookings.models import Booking
from customers.models import Customer

# Delete in correct order (foreign key dependencies)
print("Deleting Services...")
svc_count = Service.objects.count()
Service.objects.all().delete()
print(f"  Deleted {svc_count} service records.")

print("Deleting Bookings...")
book_count = Booking.objects.count()
Booking.objects.all().delete()
print(f"  Deleted {book_count} booking records.")

print("Deleting Cars...")
car_count = Car.objects.count()
Car.objects.all().delete()
print(f"  Deleted {car_count} car records.")

print("Deleting Customers...")
cust_count = Customer.objects.count()
Customer.objects.all().delete()
print(f"  Deleted {cust_count} customer records.")

print("\nAll data cleared successfully! Dashboard will now show 0s.")
