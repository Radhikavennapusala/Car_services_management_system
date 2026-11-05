from django.db import models
from django.contrib.auth.models import User
from services.models import Service

BOOKING_STATUS = [
    ('Pending', 'Pending'),
    ('Confirmed', 'Confirmed'),
    ('Mechanic Assigned', 'Mechanic Assigned'),
    ('In Progress', 'In Progress'),
    ('Completed', 'Completed'),
    ('Cancelled', 'Cancelled'),
]

PAYMENT_STATUS = [
    ('Pending', 'Pending'),
    ('Paid', 'Paid'),
]

class Booking(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    car_model = models.CharField(max_length=100, default='')
    car_registration_number = models.CharField(max_length=50, default='')
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, related_name='bookings', null=True, blank=True)
    service_name = models.CharField(max_length=150, default='Car Wash', blank=True)
    booking_date = models.DateField()
    booking_time = models.TimeField()
    pickup_drop = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=50, choices=BOOKING_STATUS, default='Pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='Pending')
    assigned_mechanic = models.CharField(max_length=150, blank=True, null=True)
    cancelled_by = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def booking_id(self):
        return f"CSMS/{1000 + self.id}"

    def __str__(self):
        return f"{self.booking_id} - {self.car_model}"

    class Meta:
        ordering = ['-created_at']
