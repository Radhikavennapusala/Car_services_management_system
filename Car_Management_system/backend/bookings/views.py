import logging
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Booking
from .serializers import BookingSerializer
from cars.models import Car
from customers.models import Customer
from services.models import Service
from .utils import send_booking_email

logger = logging.getLogger(__name__)

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer

    def get_queryset(self):
        queryset = Booking.objects.all()
        user = self.request.user
        if user and user.is_authenticated and not user.is_staff:
            queryset = queryset.filter(customer=user)
        
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status__iexact=status_param)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        if user and not user.is_staff and 'customer' not in serializer.validated_data:
            booking = serializer.save(customer=user)
        else:
            booking = serializer.save()

        # ── Send "Booking Created" email notification ──────────────────
        self._send_booking_created_email(booking)

    def _send_booking_created_email(self, booking):
        """Send a booking-created confirmation email to the customer."""
        send_booking_email(booking, 'created')

    def perform_update(self, serializer):
        # Check if status is changing
        instance = self.get_object()
        old_status = (instance.status or '').lower()
        
        booking = serializer.save()
        new_status = (booking.status or '').lower()
        
        if old_status != new_status:
            if new_status == 'cancelled':
                by = 'admin' if self.request.user and self.request.user.is_staff else 'customer'
                booking.cancelled_by = by
                booking.save()
                send_booking_email(booking, 'cancelled', cancelled_by=by)
            elif new_status == 'confirmed':
                send_booking_email(booking, 'accepted')

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        
        status_lower = (booking.status or '').lower()
        if status_lower == 'cancelled':
            return Response(
                {'error': 'This service booking is already cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if status_lower in ['in progress', 'in_progress', 'completed']:
            return Response(
                {'error': f'Booking with status "{booking.status}" cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        by = request.data.get('cancelled_by')
        if not by:
            by = 'admin' if request.user.is_staff else 'customer'

        booking.status = 'Cancelled'
        booking.cancelled_by = by
        booking.save()

        # ── Send "Booking Cancelled" email notification ──────────────────
        email_sent, email_error = send_booking_email(booking, 'cancelled', cancelled_by=by)

        if email_sent:
            website_message = "Service cancelled successfully. A cancellation confirmation has been sent to your email."
        else:
            website_message = "Booking cancelled successfully, but the email notification could not be sent."

        serializer = self.get_serializer(booking)
        data = serializer.data
        data['email_sent'] = email_sent
        data['website_message'] = website_message
        if email_error:
            data['email_error'] = email_error

        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def accept(self, request, pk=None):
        """Admin accepts (confirms) a booking and notifies the customer by email."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admins can accept bookings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        booking = self.get_object()
        status_lower = (booking.status or '').lower()

        if status_lower == 'confirmed':
            return Response(
                {'error': 'This booking is already confirmed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if status_lower in ['cancelled', 'completed', 'in progress', 'in_progress']:
            return Response(
                {'error': f'Booking with status "{booking.status}" cannot be accepted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = 'Confirmed'
        booking.save()

        # ── Send "Booking Accepted" email notification ─────────────────
        email_sent, email_error = send_booking_email(booking, 'accepted')

        if email_sent:
            website_message = "Booking accepted successfully. A confirmation email has been sent to the customer."
        else:
            website_message = "Booking accepted successfully, but the email notification could not be sent."

        serializer = self.get_serializer(booking)
        data = serializer.data
        data['email_sent'] = email_sent
        data['website_message'] = website_message
        if email_error:
            data['email_error'] = email_error

        return Response(data, status=status.HTTP_200_OK)



@api_view(['GET'])
def dashboard_stats(request):
    """Return summary stats for customer and admin dashboard."""
    user = request.user if request.user and request.user.is_authenticated else None
    
    if user and not user.is_staff:
        user_bookings = Booking.objects.filter(customer=user)
        user_cars = Car.objects.filter(submitted_by=user)
        try:
            user_services = Service.objects.filter(requested_by=user)
        except Exception:
            user_services = Service.objects.none()
    else:
        user_bookings = Booking.objects.all()
        user_cars = Car.objects.all()
        user_services = Service.objects.all()

    total_bookings = user_bookings.count()
    upcoming_bookings = user_bookings.filter(status__in=['Pending', 'Confirmed', 'Mechanic Assigned', 'pending', 'confirmed']).count()
    completed_bookings = user_bookings.filter(status__in=['Completed', 'completed']).count()
    cancelled_bookings = user_bookings.filter(status__in=['Cancelled', 'cancelled']).count()

    total_cars = user_cars.count()
    available_cars = user_cars.filter(status='available').count()
    cars_in_garage = user_cars.filter(status='in_service').count()
    total_customers = Customer.objects.count()
    
    try:
        total_services = user_services.count()
    except Exception:
        total_services = 0

    try:
        from django.db.models import Sum
        revenue = user_services.filter(completed=True).aggregate(total=Sum('cost'))['total'] or 0
        total_amount = user_services.exclude(status='rejected').aggregate(total=Sum('cost'))['total'] or 0
    except Exception:
        revenue = 0
        total_amount = 0

    return Response({
        'total_cars': total_cars,
        'available_cars': available_cars,
        'cars_in_garage': cars_in_garage,
        'total_customers': total_customers,
        'total_bookings': total_bookings,
        'upcoming_bookings': upcoming_bookings,
        'completed_bookings': completed_bookings,
        'cancelled_bookings': cancelled_bookings,
        'pending_bookings': upcoming_bookings,
        'total_services': total_services,
        'total_revenue': float(revenue),
        'total_amount': float(total_amount),
    })


