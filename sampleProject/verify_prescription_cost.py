import os
import django
import sys
from decimal import Decimal
import json

# Add project root to sys.path
sys.path.append(r'd:\Sakthi-Auto\sampleProject')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sampleProject.settings')
django.setup()

from backend.models import PharmacyStock, DailyQuantity
from django.test import RequestFactory
from backend.views import update_daily_quantities
from django.utils import timezone

def verify():
    # 1. Setup Data
    chem = "TestChemVerification"
    brand = "TestBrandVerification"
    dose = "500mg"
    expiry = timezone.now().date()
    
    print(f"Setting up test data for {chem} - {brand}...")

    # Cleanup previous run
    PharmacyStock.objects.filter(chemical_name=chem).delete()
    DailyQuantity.objects.filter(chemical_name=chem).delete()

    # Create Stock with price
    stock = PharmacyStock.objects.create(
        chemical_name=chem,
        brand_name=brand,
        dose_volume=dose,
        expiry_date=expiry,
        amount_per_unit=Decimal("10.50"),
        quantity=100
    )
    print(f"Created Stock: {stock.amount_per_unit} per unit")

    # 2. Prepare Payload
    payload = [{
        "chemical_name": chem,
        "brand_name": brand,
        "dose_volume": dose,
        "expiry_date": expiry.strftime("%Y-%m-%d"),
        "year": expiry.year,
        "month": expiry.month,
        "day": expiry.day,
        "quantity": 5
    }]

    # 3. Call View
    factory = RequestFactory()
    request = factory.post(
        '/api/update-daily-quantities/',
        data=json.dumps(payload),
        content_type='application/json'
    )
    
    print("Calling view update_daily_quantities...")
    response = update_daily_quantities(request)
    print(f"Response Status: {response.status_code}")
    print(f"Response Content: {response.content.decode()}")

    # 4. Verify Result
    dq = DailyQuantity.objects.filter(
        chemical_name=chem,
        brand_name=brand,
        date=expiry 
    ).first()
    
    if dq:
        expected_total = Decimal("10.50") * 5
        print(f"DailyQuantity Quantity: {dq.quantity}")
        print(f"DailyQuantity Total Amount: {dq.total_amount}")
        print(f"Expected Total Amount: {expected_total}")
        
        if abs(dq.total_amount - expected_total) < Decimal("0.01"):
            print("SUCCESS: Total amount matches!")
        else:
            print("FAILURE: Total amount mismatch.")
    else:
        print("FAILURE: DailyQuantity record not found.")

if __name__ == "__main__":
    try:
        verify()
    except Exception as e:
        print(f"An error occurred: {e}")
