from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create a default admin superuser if none exists'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        username = 'admin'
        email = 'admin@csms.com'
        password = 'Admin@1234'

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(self.style.SUCCESS(
                f'✅ Admin user created: username={username}, password={password}'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f'ℹ️ Admin user "{username}" already exists. Skipping.'
            ))
