from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceViewSet, update_service_status

router = DefaultRouter()
router.register(r'', ServiceViewSet, basename='service')

urlpatterns = [
    path('', include(router.urls)),
    path('<int:service_id>/update-status/', update_service_status, name='service-update-status'),
]
