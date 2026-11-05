from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Service
from .serializers import ServiceSerializer


SERVICE_PRICES = {
    'Oil Change': 599,
    'Brake Inspection': 399,
    'Tyre Rotation / Replacement': 799,
    'Engine Check': 999,
    'Battery Replacement': 1499,
    'AC Service': 1299,
    'Wheel Alignment': 699,
    'Full Service': 3499,
    'Suspension Check': 899,
    'Transmission Service': 1999,
}

def calc_service_cost(description):
    if not description:
        return 0
    total = 0
    for name, price in SERVICE_PRICES.items():
        if name.lower() in description.lower():
            total += price
    return total


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

    def get_queryset(self):
        queryset = Service.objects.all()
        if not self.request.user.is_staff:
            if self.request.user.is_authenticated:
                queryset = queryset.filter(requested_by=self.request.user)
            else:
                queryset = queryset.none()
        car_id = self.request.query_params.get('car')
        if car_id:
            queryset = queryset.filter(car_id=car_id)
        svc_status = self.request.query_params.get('status')
        if svc_status:
            queryset = queryset.filter(status=svc_status)
        return queryset

    def perform_create(self, serializer):
        """Auto-assign the logged-in user as the requester, default status=pending, ensure cost is set."""
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        cost = serializer.validated_data.get('cost', 0)
        if not cost or float(cost) == 0:
            desc = serializer.validated_data.get('description', '')
            auto_cost = calc_service_cost(desc)
            if auto_cost > 0:
                serializer.save(requested_by=user, status='pending', cost=auto_cost)
                return
        serializer.save(requested_by=user, status='pending')



from django.core.mail import send_mail
from django.conf import settings

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_service_status(request, service_id):
    """Admin-only: update a service request status, pickup info, and cost."""
    if not request.user.is_staff:
        return Response({'error': 'Permission denied.'}, status=403)

    new_status = request.data.get('status')
    valid = ['pending', 'accepted', 'rejected', 'in_progress', 'completed']
    if new_status and new_status not in valid:
        return Response({'error': f'Invalid status. Choose from {valid}'}, status=400)

    try:
        service = Service.objects.get(pk=service_id)
        old_status = service.status
        
        if new_status:
            service.status = new_status
            if new_status == 'completed':
                service.completed = True

        # Save pickup info if provided
        pickup_date = request.data.get('pickup_date')
        if pickup_date:
            service.pickup_date = pickup_date

        pickup_details = request.data.get('pickup_details', '')
        if pickup_details:
            service.pickup_details = pickup_details

        # Save cost / amount if provided (positive numbers only)
        cost = request.data.get('cost')
        if cost is not None and cost != '':
            try:
                cost_val = float(cost)
                if cost_val < 0:
                    return Response({'error': 'Amount must be a positive number (0 or greater).'}, status=400)
                service.cost = cost_val
            except (ValueError, TypeError):
                return Response({'error': 'Invalid cost amount.'}, status=400)
        elif not service.cost or float(service.cost) == 0:
            auto_cost = calc_service_cost(service.description)
            if auto_cost > 0:
                service.cost = auto_cost

        service.save()
        
        # Send email if status changed to rejected or accepted
        email_status_msg = ""
        if new_status in ['rejected', 'accepted'] and old_status != new_status:
            try:
                if service.requested_by and service.requested_by.email:
                    customer_name = service.requested_by.first_name or service.requested_by.username
                    customer_email = service.requested_by.email
                    booking_id = service.booking_id
                    service_name = service.description or "Car Service"
                    car_model = f"{service.car.make} {service.car.model}"
                    date_str = service.service_date.strftime('%d-%b-%Y') if hasattr(service.service_date, 'strftime') else str(service.service_date)
                    
                    if new_status == 'rejected':
                        subject = "Car Service Booking Cancelled - CSMS"
                        body = (
                            f"Hello {customer_name},\n\n"
                            f"Your car service booking has been cancelled by the service center.\n\n"
                            f"Booking ID: {booking_id}\n"
                            f"Service: {service_name}\n"
                            f"Car: {car_model}\n"
                            f"Date: {date_str}\n"
                            f"Status: Cancelled\n\n"
                            f"Please contact the service center if you need more information.\n\n"
                            f"Thank you,\n"
                            f"Car Service Management System"
                        )
                    else:
                        subject = "Car Service Booking Accepted - CSMS"
                        body = (
                            f"Hello {customer_name},\n\n"
                            f"Good news! Your car service booking has been accepted by the service center.\n\n"
                            f"Booking ID: {booking_id}\n"
                            f"Service: {service_name}\n"
                            f"Car: {car_model}\n"
                            f"Date: {date_str}\n"
                            f"Status: Accepted\n\n"
                            f"We look forward to serving you.\n\n"
                            f"Thank you,\n"
                            f"Car Service Management System"
                        )
                    
                    from_addr = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', None) or 'noreply@csms.com'
                    send_mail(subject, body, from_addr, [customer_email], fail_silently=False)
                    email_status_msg = f" Email successfully sent to {customer_email}."
                else:
                    email_status_msg = " Email not sent because customer has no email address."
            except Exception as e:
                email_status_msg = f" Email failed: {str(e)}"
                print(f"Error sending email: {e}")

        return Response({'message': f'Service updated.{email_status_msg}', 'status': service.status})
    except Service.DoesNotExist:
        return Response({'error': 'Service not found.'}, status=404)
