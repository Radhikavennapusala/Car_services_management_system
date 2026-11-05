import logging
from django.core.mail import send_mail
from django.conf import settings
from customers.models import Customer

logger = logging.getLogger(__name__)

def send_booking_email(booking, email_type, cancelled_by=None):
    """
    Central utility to send real booking emails dynamically.
    email_type: 'created', 'accepted', 'cancelled'
    """
    try:
        # Resolve customer details
        customer_name = "Customer"
        customer_email = ""
        
        if booking.customer:
            full = f"{booking.customer.first_name} {booking.customer.last_name}".strip()
            customer_name = full if full else booking.customer.username
            customer_email = (booking.customer.email or '').strip()

        # Fallback to look up by name if email is missing (legacy handling)
        if not customer_email:
            try:
                cust_obj = Customer.objects.filter(name=customer_name).first()
                if cust_obj and cust_obj.email:
                    customer_email = cust_obj.email.strip()
            except Exception:
                pass

        if not customer_email:
            logger.warning(f"Customer email address is missing for booking {booking.booking_id}.")
            return False, "Customer email address is missing."

        # Extract dynamic booking details
        booking_id = booking.booking_id
        service_name = getattr(booking.service, 'description', None) or getattr(booking.service, 'name', None) or booking.service_name or 'Car Service'
        car_model = booking.car_model or 'N/A'
        
        booking_date_str = booking.booking_date.strftime('%d-%b-%Y') if hasattr(booking.booking_date, 'strftime') else str(booking.booking_date)
        booking_time_str = booking.booking_time.strftime('%H:%M') if hasattr(booking.booking_time, 'strftime') else str(booking.booking_time)
        price_str = f"₹{booking.service.cost}" if booking.service and hasattr(booking.service, 'cost') else "TBD"

        # Determine Subject and Body based on type
        if email_type == 'created':
            subject = "Car Service Booking Received - CSMS"
            body = (
                f"Hello {customer_name},\n\n"
                f"Your car service booking has been received successfully.\n\n"
                f"Booking ID: {booking_id}\n"
                f"Car Model: {car_model}\n"
                f"Service: {service_name}\n"
                f"Date: {booking_date_str}\n"
                f"Time: {booking_time_str}\n"
                f"Price: {price_str}\n"
                f"Status: Pending\n\n"
                f"Our service center will review your booking and confirm it shortly.\n\n"
                f"Thank you,\n"
                f"Car Service Management System\nCSMS"
            )

        elif email_type == 'accepted':
            subject = "Car Service Booking Confirmed - CSMS"
            body = (
                f"Hello {customer_name},\n\n"
                f"Your car service booking has been confirmed.\n\n"
                f"Booking ID: {booking_id}\n"
                f"Car Model: {car_model}\n"
                f"Service: {service_name}\n"
                f"Date: {booking_date_str}\n"
                f"Time: {booking_time_str}\n"
                f"Price: {price_str}\n"
                f"Status: Confirmed\n\n"
                f"Thank you,\n"
                f"Car Service Management System\nCSMS"
            )

        elif email_type == 'cancelled':
            if cancelled_by == 'customer':
                subject = "Car Service Booking Cancelled - CSMS"
                body = (
                    f"Hello {customer_name},\n\n"
                    f"Your car service booking has been cancelled successfully.\n\n"
                    f"Booking ID: {booking_id}\n"
                    f"Car Model: {car_model}\n"
                    f"Service: {service_name}\n"
                    f"Date: {booking_date_str}\n"
                    f"Time: {booking_time_str}\n"
                    f"Status: Cancelled\n\n"
                    f"If you need the service again, you can book a new appointment anytime.\n\n"
                    f"Thank you,\n"
                    f"Car Service Management System\nCSMS"
                )
            else:
                subject = "Car Service Booking Cancelled - CSMS"
                body = (
                    f"Hello {customer_name},\n\n"
                    f"Your car service booking has been cancelled by the service center.\n\n"
                    f"Booking ID: {booking_id}\n"
                    f"Service: {service_name}\n"
                    f"Car: {car_model}\n"
                    f"Date: {booking_date_str}\n"
                    f"Status: Cancelled\n\n"
                    f"Please contact the service center if you need more information.\n\n"
                    f"Thank you,\n"
                    f"Car Service Management System"
                )
        else:
            return False, "Invalid email type."

        from_addr = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', None) or 'noreply@csms.com'
        
        # Actual email sending
        send_mail(
            subject=subject,
            message=body,
            from_email=from_addr,
            recipient_list=[customer_email],
            fail_silently=False,
        )
        logger.info(f"Booking email '{email_type}' sent successfully to {customer_email} for booking {booking_id}.")
        return True, None

    except Exception as e:
        logger.error(f"Failed to send booking email '{email_type}' for booking {getattr(booking, 'booking_id', '?')}: {str(e)}")
        return False, str(e)
