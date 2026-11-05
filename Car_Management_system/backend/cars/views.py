from rest_framework import viewsets
from rest_framework.response import Response
from .models import Car
from .serializers import CarSerializer

class CarViewSet(viewsets.ModelViewSet):
    queryset = Car.objects.all()
    serializer_class = CarSerializer

    def get_queryset(self):
        queryset = Car.objects.all().order_by('-created_at')
        if not self.request.user.is_staff:
            if self.request.user.is_authenticated:
                queryset = queryset.filter(submitted_by=self.request.user)
            else:
                queryset = queryset.none()
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    def perform_create(self, serializer):
        """Auto-assign the logged-in user as the submitter."""
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        serializer.save(submitted_by=user)

