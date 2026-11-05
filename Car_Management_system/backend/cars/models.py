from django.db import models
from django.contrib.auth.models import User

CAR_STATUS = [
    ('pending', 'Pending Approval'),
    ('available', 'Available'),
    ('in_service', 'In Service'),
    ('completed', 'Completed'),
]

class Car(models.Model):
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.IntegerField()
    color = models.CharField(max_length=50)
    plate_number = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=20, choices=CAR_STATUS, default='pending')
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    mileage = models.IntegerField(default=0)
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='submitted_cars')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.year} {self.make} {self.model} ({self.plate_number})"

    class Meta:
        ordering = ['-created_at']
