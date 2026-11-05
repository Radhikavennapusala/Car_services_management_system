from rest_framework import serializers
from .models import Car

class CarSerializer(serializers.ModelSerializer):
    submitted_by_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Car
        fields = '__all__'

    def get_submitted_by_username(self, obj):
        return obj.submitted_by.username if obj.submitted_by else 'Unknown'

    def validate_mileage(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Mileage must be a positive number (0 or greater).")
        return value

    def validate_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Price must be a positive number (0 or greater).")
        return value
