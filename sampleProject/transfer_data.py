import os
import django

# -----------------------------------
# Setup Django Environment
# -----------------------------------
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'OHC.settings')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sampleProject.settings')

django.setup()

from django.apps import apps
from django.db import transaction

MYSQL_DB = 'mysql'
MSSQL_DB = 'default'

# -----------------------------------
# Transfer function
# -----------------------------------
def transfer_model_data(model):
    model_name = model.__name__
    try:
        queryset = model.objects.using(MYSQL_DB).all()
        count = queryset.count()

        if count == 0:
            print(f"⚠️  {model_name}: No data found")
            return

        objs = []
        for obj in queryset:
            obj.pk = None  # Reset PK
            objs.append(obj)

        with transaction.atomic(using=MSSQL_DB):
            model.objects.using(MSSQL_DB).bulk_create(objs, batch_size=500)

        print(f"✅ {model_name}: {count} records transferred")

    except Exception as e:
        print(f"❌ {model_name}: {e}")

# -----------------------------------
# Main
# -----------------------------------
def main():
    print("\n🚀 Starting FULL MySQL → MSSQL Migration (AUTO MODE)\n")

    # Get all models from jsw app only
    jsw_models = apps.get_app_config('jsw').get_models()

    for model in jsw_models:
        print(f"🔄 Processing {model.__name__}")
        transfer_model_data(model)
        print("-" * 60)

    print("\n🎉 Migration completed for ALL models\n")

if __name__ == "__main__":
    main()
