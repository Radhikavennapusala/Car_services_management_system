import os
import django
from django.core.mail import send_mail
from django.conf import settings
from decouple import config

# Set up Django environment manually for script execution
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "car_management.settings")
django.setup()

def run_test():
    print("--------------------------------------------------")
    print("Email Configuration Test")
    print("--------------------------------------------------")
    
    email_user = config('EMAIL_HOST_USER', default='')
    email_pass = config('EMAIL_HOST_PASSWORD', default='')
    
    if not email_user or not email_pass:
        print("❌ ERROR: EMAIL_HOST_USER or EMAIL_HOST_PASSWORD is missing from your .env file.")
        print("Please add your Gmail address and 16-digit App Password to the .env file.")
        print("Example:")
        print("EMAIL_HOST_USER=your_email@gmail.com")
        print("EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx")
        return

    print(f"Testing connection with: {email_user}")
    print("Sending test email to the same address...")
    
    try:
        from_addr = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', None) or 'noreply@csms.com'
        send_mail(
            subject="Test Email - CSMS Configuration",
            message="Congratulations! Your Django SMTP configuration is working perfectly.",
            from_email=from_addr,
            recipient_list=[email_user],
            fail_silently=False,
        )
        print("✅ SUCCESS: Test email sent successfully!")
        print("Check your inbox to verify receipt.")
        print("Your email configuration is complete. You can now use the booking features.")
    except Exception as e:
        print("❌ ERROR: Failed to send email.")
        print("Exception details:")
        print(str(e))
        print("\nPossible fixes:")
        print("1. Did you use a Gmail App Password? Normal passwords will not work.")
        print("2. Make sure 2-Step Verification is enabled on your Google account.")
        print("3. Check for typos in your .env file.")

if __name__ == "__main__":
    run_test()
