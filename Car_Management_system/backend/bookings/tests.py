from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.core import mail
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, time
from .models import Booking

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class BookingCancellationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username='cust',
            email='customer@example.com',
            first_name='John',
            last_name='Doe',
            password='password123'
        )
        self.admin = User.objects.create_superuser(username='admin_user', password='password123')
        
        self.booking_pending = Booking.objects.create(
            customer=self.customer,
            car_model='Honda City',
            car_registration_number='AP09AB1234',
            service_name='Car Wash',
            booking_date=date(2026, 8, 15),
            booking_time=time(10, 0),
            price=299,
            status='Pending'
        )
        self.booking_completed = Booking.objects.create(
            customer=self.customer,
            car_model='Toyota Fortuner',
            car_registration_number='MH12PQ1234',
            service_name='Full Service',
            booking_date=date(2026, 8, 10),
            booking_time=time(12, 0),
            price=1499,
            status='Completed'
        )

    def test_customer_can_cancel_pending_booking_and_sends_email(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(f'/api/bookings/{self.booking_pending.id}/cancel/', {'cancelled_by': 'customer'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking_pending.refresh_from_db()
        self.assertEqual(self.booking_pending.status, 'Cancelled')
        self.assertEqual(self.booking_pending.cancelled_by, 'customer')
        self.assertTrue(response.data.get('email_sent'))
        self.assertIn("Service cancelled successfully", response.data.get('website_message'))
        
        # Check outbox
        self.assertEqual(len(mail.outbox), 1)
        sent_mail = mail.outbox[0]
        self.assertEqual(sent_mail.subject, "Car Service Booking Cancelled - CSMS")
        self.assertIn("customer@example.com", sent_mail.to)
        self.assertIn("Hello John Doe", sent_mail.body)
        self.assertIn(self.booking_pending.booking_id, sent_mail.body)
        self.assertIn("Car Wash", sent_mail.body)

    def test_customer_cannot_cancel_completed_booking(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(f'/api/bookings/{self.booking_completed.id}/cancel/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.booking_completed.refresh_from_db()
        self.assertEqual(self.booking_completed.status, 'Completed')
        self.assertEqual(len(mail.outbox), 0)

    def test_cannot_cancel_already_cancelled_booking(self):
        self.client.force_authenticate(user=self.customer)
        # Cancel first time
        self.client.post(f'/api/bookings/{self.booking_pending.id}/cancel/', {'cancelled_by': 'customer'}, format='json')
        mail.outbox.clear()
        
        # Cancel second time
        response = self.client.post(f'/api/bookings/{self.booking_pending.id}/cancel/', {'cancelled_by': 'customer'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(mail.outbox), 0)

    def test_admin_can_cancel_booking_and_sends_admin_email(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/bookings/{self.booking_pending.id}/cancel/', {'cancelled_by': 'admin'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking_pending.refresh_from_db()
        self.assertEqual(self.booking_pending.status, 'Cancelled')
        self.assertEqual(self.booking_pending.cancelled_by, 'admin')
        self.assertTrue(response.data.get('email_sent'))
        
        self.assertEqual(len(mail.outbox), 1)
        sent_mail = mail.outbox[0]
        self.assertEqual(sent_mail.subject, "Car Service Booking Cancelled by Service Center - CSMS")
        self.assertIn("cancelled by the service center", sent_mail.body)

    def test_dashboard_stats_cancelled_count(self):
        self.client.force_authenticate(user=self.customer)
        stats_res1 = self.client.get('/api/bookings/stats/')
        self.assertEqual(stats_res1.data['cancelled_bookings'], 0)

        # Cancel pending booking
        self.client.post(f'/api/bookings/{self.booking_pending.id}/cancel/', {'cancelled_by': 'customer'}, format='json')

        stats_res2 = self.client.get('/api/bookings/stats/')
        self.assertEqual(stats_res2.data['cancelled_bookings'], 1)


