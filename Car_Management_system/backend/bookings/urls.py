from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet, dashboard_stats

router = DefaultRouter()
router.register(r'', BookingViewSet, basename='booking')

urlpatterns = [
    path('stats/', dashboard_stats, name='stats'),
    path('dashboard-stats/', dashboard_stats, name='dashboard-stats'),
    path('', include(router.urls)),
]

