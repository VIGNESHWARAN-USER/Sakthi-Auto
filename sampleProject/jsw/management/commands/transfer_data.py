from django.core.management.base import BaseCommand
from django.db import transaction
from jsw.models import (
    user, employee_details, Dashboard, vitals, mockdrills, eventsandcamps,
    heamatalogy, RoutineSugarTests, RenalFunctionTest, LipidProfile,
    LiverFunctionTest, ThyroidFunctionTest, AutoimmuneTest, CoagulationTest,
    EnzymesCardiacProfile, UrineRoutineTest, SerologyTest, MotionTest,
    CultureSensitivityTest, MensPack, WomensPack, OccupationalProfile,
    OthersTest, OphthalmicReport, XRay, USGReport, CTReport, MRIReport,
    Appointment, FitnessAssessment, VaccinationRecord, ReviewCategory, Review
)

class Command(BaseCommand):
    help = 'Transfer data from MySQL to MSSQL'

    def handle(self, *args, **kwargs):
        self.stdout.write("\n🚀 Starting MySQL → MSSQL Data Transfer...\n")
        
        model_list = [
            user, employee_details, Dashboard, vitals, mockdrills, eventsandcamps,
            heamatalogy, RoutineSugarTests, RenalFunctionTest, LipidProfile,
            LiverFunctionTest, ThyroidFunctionTest, AutoimmuneTest, CoagulationTest,
            EnzymesCardiacProfile, UrineRoutineTest, SerologyTest, MotionTest,
            CultureSensitivityTest, MensPack, WomensPack, OccupationalProfile,
            OthersTest, OphthalmicReport, XRay, USGReport, CTReport, MRIReport,
            Appointment, FitnessAssessment, VaccinationRecord, ReviewCategory, Review
        ]

        for model in model_list:
            model_name = model.__name__
            self.stdout.write(f"🔄 Transferring: {model_name}")
            try:
                self.transfer_model_data(model)
                self.stdout.write(f"✅ Done: {model_name}\n")
            except Exception as e:
                self.stderr.write(f"❌ Error in {model_name}: {str(e)}")

        self.stdout.write("\n✅ All transfers complete.\n")

    def transfer_model_data(self, model):
        objs = list(model.objects.using('mysql').all())

        for obj in objs:
            obj.pk = None  # Reset PK to avoid conflicts

        with transaction.atomic(using='default'):
            model.objects.using('default').bulk_create(objs, batch_size=500)
