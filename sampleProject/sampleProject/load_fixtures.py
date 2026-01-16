# load_fixtures.py
import os
import subprocess

# List of your fixture files in the order they should be loaded
fixtures = [
    "contenttypes_contenttype.json",
    "auth_permission.json",
    "jsw_employee_details.json",
    "jsw_dashboard.json",
    "jsw_vitals.json",
    "jsw_mockdrills.json",
    "jsw_eventsandcamps.json",
    "jsw_heamatalogy.json",
    "jsw_routinesugartests.json",
    "jsw_renalfunctiontest.json",
    "jsw_lipidprofile.json",
    "jsw_liverfunctiontest.json",
    "jsw_thyroidfunctiontest.json",
    "jsw_enzymescardiacprofile.json",
    "jsw_urineroutinetest.json",
    "jsw_serologytest.json",
    "jsw_motiontest.json",
    "jsw_menspack.json",
    "jsw_womenspack.json",
    "jsw_ophthalmicreport.json",
    "jsw_xray.json",
    "jsw_usgreport.json",
    "jsw_mrireport.json",
    "jsw_appointment.json",
    "jsw_fitnessassessment.json",
    "jsw_vaccinationrecord.json",
    "jsw_member.json",
    "jsw_medicalhistory.json",
    "jsw_consultation.json",
    "jsw_pharmacystock.json",
    "jsw_expiryregister.json",
    "jsw_discardedmedicine.json",
    "jsw_wardconsumables.json",
    "jsw_ambulanceconsumables.json",
    "jsw_pharmacymedicine.json",
    "jsw_prescription.json",
    "jsw_form17.json",
    "jsw_form38.json",
    "jsw_form40.json",
    "jsw_pharmacystockhistory.json",
    "jsw_dailyquantity.json"
]

# Loop through each fixture and load it using manage.py loaddata
for fixture in fixtures:
    if os.path.exists(fixture):
        print(f"\nLoading fixture: {fixture}")
        subprocess.run(["python", "manage.py", "loaddata", fixture, "--verbosity", "2"])
    else:
        print(f"\nFixture not found: {fixture}")
