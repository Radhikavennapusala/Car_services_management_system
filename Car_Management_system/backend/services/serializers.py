from rest_framework import serializers
from .models import Service

class ServiceSerializer(serializers.ModelSerializer):
    car_display = serializers.SerializerMethodField(read_only=True)
    requested_by_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'car', 'car_display', 'description', 'mechanic', 'cost',
                  'service_date', 'completed', 'status', 'requested_by',
                  'requested_by_username', 'pickup_date', 'pickup_details', 'created_at']

    def get_car_display(self, obj):
        if obj.car:
            return f"{obj.car.make} {obj.car.model}"
        return ''

    def get_requested_by_username(self, obj):
        return obj.requested_by.username if obj.requested_by else 'Unknown'
