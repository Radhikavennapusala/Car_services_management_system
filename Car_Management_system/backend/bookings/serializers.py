from rest_framework import serializers
from .models import Booking

class BookingSerializer(serializers.ModelSerializer):
    booking_id = serializers.ReadOnlyField()
    customer_name = serializers.SerializerMethodField(read_only=True)
    service_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = '__all__'

    def get_customer_name(self, obj):
        if obj.customer:
            full = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
            return full if full else obj.customer.username
        return 'Customer'

    def get_service_name(self, obj):
        if obj.service:
            return getattr(obj.service, 'description', None) or getattr(obj.service, 'name', None) or obj.service_name or 'Car Service'
        return obj.service_name or 'Car Service'

