from django.db import models, transaction
from datetime import date, datetime
from django.utils import timezone # Import timezone
from django.utils.translation import gettext_lazy as _

# --- Abstract Base Model ---
class BaseModel(models.Model):
    # Assuming ID is handled automatically by Django unless specified
    entry_date = models.DateField(auto_now=True) # Sets on save, consider default=timezone.now or auto_now_add=True for creation date

    class Meta:
        abstract = True

# --- User Model ---
# No emp_no, so no aadhar added here
class user(BaseModel):
    name = models.TextField(max_length=50)
    password = models.TextField(max_length=50, default="default123")
    accessLevel = models.TextField(max_length=50)

    def __str__(self):
        return self.name

# --- Employee Details Model ---
class employee_details(BaseModel):
    EMPLOYEE_TYPES = [
        ('Employee', 'Employee'),
        ('Contractor', 'Contractor'),
        ('Visitor', 'Visitor'),
    ]
    MARITAL_STATUS_CHOICES = [
        ('Single', 'Single'),
        ('Married', 'Married'),
        ('Other', 'Other'),
        ('Divorced', 'Divorced'),
        ('Widowed', 'Widowed'),
        ('Separated', 'Separated'),
    ]

    # --- Visit and Identity Information ---
    type = models.CharField(max_length=50, choices=EMPLOYEE_TYPES, default='Employee')
    type_of_visit = models.CharField(max_length=255, blank=True)
    register = models.CharField(max_length=255, blank=True)
    purpose = models.CharField(max_length=255, blank=True)
    mrdNo = models.CharField(max_length=255, blank=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    entry_date = models.DateField(null=True, blank=True) # Added to track entry date

    # --- Personal Details ---
    name = models.CharField(max_length=225)
    guardian = models.CharField(max_length=255, blank=True)
    dob = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=50, blank=True)
    bloodgrp = models.CharField(max_length=225, blank=True)
    identification_marks1 = models.CharField(max_length=225, blank=True)
    identification_marks2 = models.CharField(max_length=225, blank=True)
    marital_status = models.CharField(max_length=50, choices=MARITAL_STATUS_CHOICES, blank=True)
    nationality = models.CharField(max_length=50, blank=True)
    docName = models.CharField(max_length=50, blank=True) # For Foreigner documents

    # --- Employment Details ---
    emp_no = models.CharField(max_length=200,blank=True)
    employer = models.CharField(max_length=225, blank=True)
    designation = models.CharField(max_length=225, blank=True)
    department = models.CharField(max_length=225, blank=True)
    division = models.CharField(max_length=225, blank=True)
    workarea = models.CharField(max_length=225, blank=True)
    job_nature = models.CharField(max_length=225, blank=True)
    doj = models.DateField(null=True, blank=True)
    moj = models.CharField(max_length=225, blank=True)
    location = models.CharField(max_length=50, blank=True) # Current location
    previousemployer = models.CharField(max_length=255, blank=True)
    previouslocation = models.CharField(max_length=255, blank=True)
    
    # --- Contact Details ---
    phone_Personal = models.CharField(max_length=225, blank=True)
    contractor_status = models.CharField(max_length=255, blank=True)
    mail_id_Personal = models.EmailField(max_length=225, blank=True)
    phone_Office = models.CharField(max_length=225, blank=True)
    mail_id_Office = models.EmailField(max_length=225, blank=True)
    
    
    # --- Emergency Contact Details ---
    emergency_contact_person = models.CharField(max_length=225, blank=True)
    emergency_contact_relation = models.CharField(max_length=225, blank=True)
    emergency_contact_phone = models.CharField(max_length=225, blank=True)
    mail_id_Emergency_Contact_Person = models.EmailField(max_length=225, blank=True)
    
    # --- Address Details ---
    permanent_address = models.TextField(blank=True)
    permanent_area = models.CharField(max_length=50, blank=True)
    permanent_state = models.CharField(max_length=50, blank=True)
    permanent_country = models.CharField(max_length=50, blank=True) # Added for completeness
    residential_address = models.TextField(blank=True)
    residential_area = models.CharField(max_length=50, blank=True)
    residential_state = models.CharField(max_length=50, blank=True)
    residential_country = models.CharField(max_length=50, blank=True) # Added for completeness

    # --- Profile Picture ---
    profilepic = models.ImageField(upload_to='profilepics', blank=True, null=True)
    profilepic_url = models.URLField(max_length=255, blank=True)

    # --- Visitor Specific Fields ---
    country_id = models.CharField(max_length=255, blank=True)
    other_site_id = models.CharField(max_length=255, blank=True)
    organization = models.CharField(max_length=255, blank=True)
    addressOrganization = models.CharField(max_length=255, blank=True)
    visiting_department = models.CharField(max_length=255, blank=True)
    visiting_date_from = models.DateField(null=True, blank=True)
    visiting_date_to = models.DateField(null=True, blank=True)
    stay_in_guest_house = models.CharField(max_length=50, blank=True)
    visiting_purpose = models.CharField(max_length=255, blank=True)

    # --- Register/Event Specific Dynamic Fields ---
    year = models.CharField(max_length=4, blank=True)
    batch = models.CharField(max_length=255, blank=True)
    hospitalName = models.CharField(max_length=255, blank=True)
    campName = models.CharField(max_length=255, blank=True)
    contractName = models.CharField(max_length=255, blank=True)
    prevcontractName = models.CharField(max_length=255, blank=True)
    old_emp_no = models.CharField(max_length=200, blank=True)
    otherRegister = models.CharField(max_length=255, blank=True) # For "Other" register type

    # <<< UPDATED/ADDED: Specific fields to replace generic 'reason' and 'status' >>>
    status = models.CharField(max_length=255, default='Active')
    bp_sugar_chart_reason = models.CharField(max_length=255, blank=True, help_text="Reason for BP Sugar Chart")
    followup_reason = models.CharField(max_length=255, blank=True, help_text="Reason for Follow Up Visit")
    followup_other_reason = models.TextField(blank=True, help_text="Text for 'Other' reason in Follow Up")
    
    # --- Legacy/Miscellaneous Fields ---
    role = models.CharField(max_length=50, blank=True) # Note: 'type' field is now preferred
    employee_status = models.CharField(max_length=255, blank=True)
    since_date = models.DateField(blank=True, null=True)
    transfer_details = models.TextField(blank=True, null=True)
    other_reason_details = models.TextField(blank=True, null=True) # Potentially legacy field

    def __str__(self):
        return self.emp_no if self.emp_no else f"Employee {self.id}"

    def save(self, *args, **kwargs):
        if not self.profilepic:
            self.profilepic_url = ''
        # Ensures that on saving, if a profile pic exists, its URL is set.
        elif self.profilepic and not self.profilepic_url:
            self.profilepic_url = self.profilepic.url
        super().save(*args, **kwargs)


# --- Dashboard Model ---
class Dashboard(BaseModel):
    # --- Core Visit Information ---
    mrdNo = models.CharField(max_length=255, blank=True)
    emp_no = models.CharField(max_length=200, blank=True) # Changed to CharField for consistency
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    type = models.CharField(max_length=255, blank=True) # e.g., Employee, Contractor
    type_of_visit = models.CharField(max_length=255, blank=True) # e.g., Preventive, Curative
    register = models.CharField(max_length=255, blank=True)
    purpose = models.CharField(max_length=255, blank=True)
    date = models.DateField() # Removed auto_now=True to be set explicitly
    visitOutcome = models.CharField(max_length=255, blank=True)

    # --- Register/Event Specific Dynamic Fields (Mirrored from employee_details) ---
    year = models.CharField(max_length=4, blank=True)
    batch = models.CharField(max_length=255, blank=True)
    hospitalName = models.CharField(max_length=255, blank=True)
    campName = models.CharField(max_length=255, blank=True)
    contractName = models.CharField(max_length=255, blank=True)
    prevcontractName = models.CharField(max_length=255, blank=True)
    old_emp_no = models.CharField(max_length=200, blank=True)
    otherRegister = models.CharField(max_length=255, blank=True)

    # <<< UPDATED/ADDED: Specific fields mirrored from employee_details for reporting >>>
    status = models.CharField(max_length=255, blank=True, help_text="Patient status for BP Sugar Check")
    bp_sugar_chart_reason = models.CharField(max_length=255, blank=True, help_text="Reason for BP Sugar Chart")
    followup_reason = models.CharField(max_length=255, blank=True, help_text="Reason for Follow Up Visit")
    followup_other_reason = models.TextField(blank=True, help_text="Text for 'Other' reason in Follow Up")

    def __str__(self):
        return f"Dashboard Record {self.id} for Emp {self.emp_no or self.aadhar}"


# --- Vitals Model --- *MODIFIED*
class vitals(BaseModel):
    # ... (keep all existing fields from vitals as they were) ...
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    systolic = models.TextField(max_length=50)
    systolic_status = models.TextField(max_length=50, null=True, blank=True)
    systolic_comment = models.TextField(max_length=255, null=True, blank=True)
    diastolic = models.TextField(max_length=50)
    diastolic_status = models.TextField(max_length=50, null=True, blank=True)
    diastolic_comment = models.TextField(max_length=255, null=True, blank=True)
    pulse = models.TextField(max_length=50)
    pulse_status = models.TextField(max_length=50, null=True, blank=True)
    pulse_comment = models.TextField(max_length=255, null=True, blank=True)
    respiratory_rate = models.TextField(max_length=50)
    respiratory_rate_status = models.TextField(max_length=50, null=True, blank=True)
    respiratory_rate_comment = models.TextField(max_length=255, null=True, blank=True)
    temperature = models.TextField(max_length=50)
    temperature_status = models.TextField(max_length=50, null=True, blank=True)
    temperature_comment = models.TextField(max_length=255, null=True, blank=True)
    spO2 = models.TextField(max_length=50)
    spO2_status = models.TextField(max_length=50, null=True, blank=True)
    spO2_comment = models.TextField(max_length=255, null=True, blank=True)
    weight = models.TextField(max_length=50)
    weight_status = models.TextField(max_length=50, null=True, blank=True)
    weight_comment = models.TextField(max_length=255, null=True, blank=True)
    height = models.TextField(max_length=50)
    height_status = models.TextField(max_length=50, null=True, blank=True)
    height_comment = models.TextField(max_length=255, null=True, blank=True)
    bmi = models.TextField(max_length=50)
    bmi_status = models.TextField(max_length=50, null=True, blank=True)
    bmi_comment = models.TextField(max_length=255, null=True, blank=True)
    manual = models.FileField(upload_to= 'manual/', blank=True, null=True)
    application_form = models.FileField(upload_to= 'application_form/', blank=True, null=True)
    consent = models.FileField(upload_to= 'consent/', blank=True, null=True)
    fc = models.FileField(upload_to= 'fc/', blank = True, null=True)
    report = models.FileField(upload_to= 'report/', blank = True, null=True)
    self_declared = models.FileField(upload_to= 'self_declared/', blank = True, null=True)
    mrdNo = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Vitals for Emp {self.emp_no}"


# --- Mock Drills Model --- *MODIFIED*
class mockdrills(BaseModel):
    # ... (keep all existing fields from mockdrills as they were) ...
    date= models.TextField(max_length=200)
    time= models.TextField(max_length=200)
    department= models.TextField(max_length=200)
    location= models.TextField(max_length=200)
    scenario= models.TextField(max_length=200)
    ambulance_timing= models.TextField(max_length=200)
    departure_from_OHC= models.TextField(max_length=200)
    return_to_OHC= models.TextField(max_length=200)
    emp_no= models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    victim_name= models.TextField(max_length=200)
    age= models.TextField(max_length=200)
    gender= models.TextField(max_length=200)
    victim_department= models.TextField(max_length=200)
    nature_of_job= models.TextField(max_length=200)
    mobile_no= models.TextField(max_length=200)
    complaints= models.TextField(max_length=200)
    treatment= models.TextField(max_length=200)
    referal= models.TextField(max_length=200)
    ambulance_driver= models.TextField(max_length=200)
    staff_name= models.TextField(max_length=200)
    OHC_doctor= models.TextField(max_length=200)
    staff_nurse= models.TextField(max_length=200)
    vitals= models.TextField(max_length=200)
    action_completion= models.TextField(max_length=200)
    responsible= models.TextField(max_length=200)

    def __str__(self):
        return f"Mock Drill for Emp {self.emp_no}"


# --- Events and Camps Model ---
# No emp_no, so no aadhar added here
class eventsandcamps(BaseModel):
    # ... (keep all existing fields from eventsandcamps as they were) ...
    camp_name = models.TextField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    hospital_name = models.TextField(max_length=255)
    camp_details = models.TextField(max_length=225)
    camp_type = models.TextField(max_length=100, default="Upcoming")
    report1 = models.FileField(upload_to='camp_reports/', blank=True, null=True)
    report2 = models.FileField(upload_to='camp_reports/', blank=True, null=True)
    photos = models.ImageField(upload_to='camp_photos/', blank=True, null=True)
    ppt = models.FileField(upload_to='camp_presentations/', blank=True, null=True)

    def __str__(self):
        return self.camp_name

    def save(self, *args, **kwargs):
        today = date.today()
        if self.start_date > today:
            self.camp_type = "Upcoming"
        elif self.start_date <= today <= self.end_date:
            self.camp_type = "Live"
        else:
            self.camp_type = "Previous"
        super().save(*args, **kwargs)


from django.db import models
# Assuming BaseModel is defined in your project, otherwise change to models.Model
# from .models import BaseModel 

class heamatalogy(BaseModel):
    
    checked = models.BooleanField(default=False)
    mrdNo = models.TextField(max_length=255, blank=True)

    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True) 

    # --- Hemoglobin ---
    hemoglobin = models.TextField(max_length=255)
    hemoglobin_unit = models.TextField(max_length=255)
    hemoglobin_reference_range = models.TextField(max_length=255, null=True, blank=True)
    hemoglobin_comments = models.TextField(max_length=255)

    # --- Total RBC ---
    total_rbc = models.TextField(max_length=255)
    total_rbc_unit = models.TextField(max_length=255)
    total_rbc_reference_range = models.TextField(max_length=255, null=True, blank=True)
    total_rbc_comments = models.TextField(max_length=255)

    # --- Total WBC ---
    total_wbc = models.TextField(max_length=255)
    total_wbc_unit = models.TextField(max_length=255)
    total_wbc_reference_range = models.TextField(max_length=255, null=True, blank=True)
    total_wbc_comments = models.TextField(max_length=255)
    
    # --- Haemotocrit ---
    Haemotocrit = models.TextField(max_length=255)
    Haemotocrit_unit = models.TextField(max_length=255)
    Haemotocrit_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Haemotocrit_comments = models.TextField(max_length=255)

    # --- Neutrophil ---
    neutrophil = models.TextField(max_length=255)
    neutrophil_unit = models.TextField(max_length=255)
    neutrophil_reference_range = models.TextField(max_length=255, null=True, blank=True)
    neutrophil_comments = models.TextField(max_length=255)

    # --- Monocyte ---
    monocyte = models.TextField(max_length=255)
    monocyte_unit = models.TextField(max_length=255)
    monocyte_reference_range = models.TextField(max_length=255, null=True, blank=True)
    monocyte_comments = models.TextField(max_length=255)

    # --- PCV ---
    pcv = models.TextField(max_length=255)
    pcv_unit = models.TextField(max_length=255)
    pcv_reference_range = models.TextField(max_length=255, null=True, blank=True)
    pcv_comments = models.TextField(max_length=255)

    # --- MCV ---
    mcv = models.TextField(max_length=255)
    mcv_unit = models.TextField(max_length=255)
    mcv_reference_range = models.TextField(max_length=255, null=True, blank=True)
    mcv_comments = models.TextField(max_length=255)

    # --- MCH ---
    mch = models.TextField(max_length=255)
    mch_unit = models.TextField(max_length=255)
    mch_reference_range = models.TextField(max_length=255, null=True, blank=True)
    mch_comments = models.TextField(max_length=255)

    # --- Lymphocyte ---
    lymphocyte = models.TextField(max_length=255)
    lymphocyte_unit = models.TextField(max_length=255)
    lymphocyte_reference_range = models.TextField(max_length=255, null=True, blank=True)
    lymphocyte_comments = models.TextField(max_length=255)

    # --- ESR ---
    esr = models.TextField(max_length=255)
    esr_unit = models.TextField(max_length=255)
    esr_reference_range = models.TextField(max_length=255, null=True, blank=True)
    esr_comments = models.TextField(max_length=255)

    # --- MCHC ---
    mchc = models.TextField(max_length=255)
    mchc_unit = models.TextField(max_length=255)
    mchc_reference_range = models.TextField(max_length=255, null=True, blank=True)
    mchc_comments = models.TextField(max_length=255)

    # --- Platelet Count ---
    platelet_count = models.TextField(max_length=255)
    platelet_count_unit = models.TextField(max_length=255)
    platelet_count_reference_range = models.TextField(max_length=255, null=True, blank=True)
    platelet_count_comments = models.TextField(max_length=255)

    # --- RDW ---
    rdw = models.TextField(max_length=255)
    rdw_unit = models.TextField(max_length=255)
    rdw_reference_range = models.TextField(max_length=255, null=True, blank=True)
    rdw_comments = models.TextField(max_length=255)

    # --- Eosinophil ---
    eosinophil = models.TextField(max_length=255)
    eosinophil_unit = models.TextField(max_length=255)
    eosinophil_reference_range = models.TextField(max_length=255, null=True, blank=True)
    eosinophil_comments = models.TextField(max_length=255)

    # --- Basophil ---
    basophil = models.TextField(max_length=255)
    basophil_unit = models.TextField(max_length=255)
    basophil_reference_range = models.TextField(max_length=255, null=True, blank=True)
    basophil_comments = models.TextField(max_length=255)

    # --- Smear / Morphology (No ranges usually, just comments) ---
    peripheral_blood_smear_rbc_morphology = models.TextField(max_length=255)
    peripheral_blood_smear_rbc_morphology_comments = models.TextField(max_length=255)
    
    peripheral_blood_smear_parasites = models.TextField(max_length=255)
    peripheral_blood_smear_parasites_comments = models.TextField(max_length=255)
    
    peripheral_blood_smear_others = models.TextField(max_length=255)
    peripheral_blood_smear_others_comments = models.TextField(max_length=255)

    def _str_(self):
        return f"Haematology Report {self.id} for Emp {self.emp_no}"

# --- Routine Sugar Tests Model --- *MODIFIED*
class RoutineSugarTests(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    mrdNo = models.TextField(max_length=255, blank=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True)

    # --- Glucose (F) ---
    glucose_f = models.TextField(max_length=255)
    glucose_f_unit = models.TextField(max_length=255)
    glucose_f_reference_range = models.TextField(max_length=255, null=True, blank=True)
    glucose_f_comments = models.TextField(max_length=255)

    # --- Glucose (PP) ---
    glucose_pp = models.TextField(max_length=255)
    glucose_pp_unit = models.TextField(max_length=255)
    glucose_pp_reference_range = models.TextField(max_length=255, null=True, blank=True)
    glucose_pp_comments = models.TextField(max_length=255)

    # --- Random Blood Sugar ---
    random_blood_sugar = models.TextField(max_length=255)
    random_blood_sugar_unit = models.TextField(max_length=255)
    random_blood_sugar_reference_range = models.TextField(max_length=255, null=True, blank=True)
    random_blood_sugar_comments = models.TextField(max_length=255)

    # --- Estimated Average Glucose ---
    estimated_average_glucose = models.TextField(max_length=255)
    estimated_average_glucose_unit = models.TextField(max_length=255)
    estimated_average_glucose_reference_range = models.TextField(max_length=255, null=True, blank=True)
    estimated_average_glucose_comments = models.TextField(max_length=255)

    # --- HbA1c ---
    hba1c = models.TextField(max_length=255)
    hba1c_unit = models.TextField(max_length=255)
    hba1c_reference_range = models.TextField(max_length=255, null=True, blank=True)
    hba1c_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Routine Sugar Test Report {self.id} for Emp {self.emp_no}"

# --- Renal Function Test Model --- *MODIFIED*
# --- Renal Function Test Model ---
class RenalFunctionTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    mrdNo = models.TextField(max_length=255, blank=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True)

    # --- Urea ---
    urea = models.TextField(max_length=255)
    urea_unit = models.TextField(max_length=255)
    urea_reference_range = models.TextField(max_length=255, null=True, blank=True)
    urea_comments = models.TextField(max_length=255)

    # --- BUN ---
    bun = models.TextField(max_length=255)
    bun_unit = models.TextField(max_length=255)
    bun_reference_range = models.TextField(max_length=255, null=True, blank=True)
    bun_comments = models.TextField(max_length=255)

    # --- Calcium ---
    calcium = models.TextField(max_length=255)
    calcium_unit = models.TextField(max_length=255)
    calcium_reference_range = models.TextField(max_length=255, null=True, blank=True)
    calcium_comments = models.TextField(max_length=255)

    # --- Sodium ---
    sodium = models.TextField(max_length=255)
    sodium_unit = models.TextField(max_length=255)
    sodium_reference_range = models.TextField(max_length=255, null=True, blank=True)
    sodium_comments = models.TextField(max_length=255)

    # --- Potassium ---
    potassium = models.TextField(max_length=255)
    potassium_unit = models.TextField(max_length=255)
    potassium_reference_range = models.TextField(max_length=255, null=True, blank=True)
    potassium_comments = models.TextField(max_length=255)

    # --- Phosphorus ---
    phosphorus = models.TextField(max_length=255)
    phosphorus_unit = models.TextField(max_length=255)
    phosphorus_reference_range = models.TextField(max_length=255, null=True, blank=True)
    phosphorus_comments = models.TextField(max_length=255)

    # --- Serum Creatinine ---
    serum_creatinine = models.TextField(max_length=255)
    serum_creatinine_unit = models.TextField(max_length=255)
    serum_creatinine_reference_range = models.TextField(max_length=255, null=True, blank=True)
    serum_creatinine_comments = models.TextField(max_length=255)

    # --- Uric Acid ---
    uric_acid = models.TextField(max_length=255)
    uric_acid_unit = models.TextField(max_length=255)
    uric_acid_reference_range = models.TextField(max_length=255, null=True, blank=True)
    uric_acid_comments = models.TextField(max_length=255)

    # --- Chloride ---
    chloride = models.TextField(max_length=255)
    chloride_unit = models.TextField(max_length=255)
    chloride_reference_range = models.TextField(max_length=255, null=True, blank=True)
    chloride_comments = models.TextField(max_length=255)
    
    # --- Bicarbonate ---
    bicarbonate = models.TextField(max_length=255)
    bicarbonate_unit = models.TextField(max_length=255)
    bicarbonate_reference_range = models.TextField(max_length=255, null=True, blank=True)
    bicarbonate_comments = models.TextField(max_length=255)
    
    # --- eGFR ---
    eGFR = models.TextField(max_length=255)
    eGFR_unit = models.TextField(max_length=255)
    eGFR_reference_range = models.TextField(max_length=255, null=True, blank=True)
    eGFR_comments = models.TextField(max_length=255)
    
    def __str__(self):
        return f"Renal Function Test Report {self.id} for Emp {self.emp_no}"


# --- Lipid Profile Model ---
class LipidProfile(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)
    
    # --- Total Cholesterol ---
    Total_Cholesterol= models.TextField(max_length=255)
    Total_Cholesterol_unit = models.TextField(max_length=255)
    Total_Cholesterol_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Total_Cholesterol_comments = models.TextField(max_length=255)

    # --- Triglycerides ---
    triglycerides = models.TextField(max_length=255)
    triglycerides_unit = models.TextField(max_length=255)
    triglycerides_reference_range = models.TextField(max_length=255, null=True, blank=True)
    triglycerides_comments = models.TextField(max_length=255)

    # --- HDL Cholesterol ---
    hdl_cholesterol = models.TextField(max_length=255)
    hdl_cholesterol_unit = models.TextField(max_length=255)
    hdl_cholesterol_reference_range = models.TextField(max_length=255, null=True, blank=True)
    hdl_cholesterol_comments = models.TextField(max_length=255)

    # --- LDL Cholesterol ---
    ldl_cholesterol = models.TextField(max_length=255)
    ldl_cholesterol_unit = models.TextField(max_length=255)
    ldl_cholesterol_reference_range = models.TextField(max_length=255, null=True, blank=True)
    ldl_cholesterol_comments = models.TextField(max_length=255)

    # --- CHOL/HDL Ratio ---
    chol_hdl_ratio = models.TextField(max_length=255)
    chol_hdl_ratio_unit = models.TextField(max_length=255)
    chol_hdl_ratio_reference_range = models.TextField(max_length=255, null=True, blank=True)
    chol_hdl_ratio_comments = models.TextField(max_length=255)

    # --- VLDL Cholesterol ---
    vldl_cholesterol = models.TextField(max_length=255)
    vldl_cholesterol_unit = models.TextField(max_length=255)
    vldl_cholesterol_reference_range = models.TextField(max_length=255, null=True, blank=True)
    vldl_cholesterol_comments = models.TextField(max_length=255)

    # --- LDL/HDL Ratio ---
    ldl_chol_hdl_chol_ratio = models.TextField(max_length=255)
    ldl_chol_hdl_chol_ratio_unit = models.TextField(max_length=255)
    ldl_chol_hdl_chol_ratio_reference_range = models.TextField(max_length=255, null=True, blank=True)
    ldl_chol_hdl_chol_ratio_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Lipid Profile Report {self.id} for Emp {self.emp_no}"


# --- Liver Function Test Model ---
class LiverFunctionTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- Bilirubin Total ---
    bilirubin_total = models.TextField(max_length=255)
    bilirubin_total_unit = models.TextField(max_length=255)
    bilirubin_total_reference_range = models.TextField(max_length=255, null=True, blank=True)
    bilirubin_total_comments = models.TextField(max_length=255)

    # --- Bilirubin Direct ---
    bilirubin_direct = models.TextField(max_length=255)
    bilirubin_direct_unit = models.TextField(max_length=255)
    bilirubin_direct_reference_range = models.TextField(max_length=255, null=True, blank=True)
    bilirubin_direct_comments = models.TextField(max_length=255)

    # --- Bilirubin Indirect ---
    bilirubin_indirect = models.TextField(max_length=255)
    bilirubin_indirect_unit = models.TextField(max_length=255)
    bilirubin_indirect_reference_range = models.TextField(max_length=255, null=True, blank=True)
    bilirubin_indirect_comments = models.TextField(max_length=255)

    # --- SGOT / AST ---
    sgot_ast = models.TextField(max_length=255)
    sgot_ast_unit = models.TextField(max_length=255)
    sgot_ast_reference_range = models.TextField(max_length=255, null=True, blank=True)
    sgot_ast_comments = models.TextField(max_length=255)

    # --- SGPT / ALT ---
    sgpt_alt = models.TextField(max_length=255)
    sgpt_alt_unit = models.TextField(max_length=255)
    sgpt_alt_reference_range = models.TextField(max_length=255, null=True, blank=True)
    sgpt_alt_comments = models.TextField(max_length=255)

    # --- Alkaline Phosphatase ---
    alkaline_phosphatase = models.TextField(max_length=255)
    alkaline_phosphatase_unit = models.TextField(max_length=255)
    alkaline_phosphatase_reference_range = models.TextField(max_length=255, null=True, blank=True)
    alkaline_phosphatase_comments = models.TextField(max_length=255)

    # --- Total Protein ---
    total_protein = models.TextField(max_length=255)
    total_protein_unit = models.TextField(max_length=255)
    total_protein_reference_range = models.TextField(max_length=255, null=True, blank=True)
    total_protein_comments = models.TextField(max_length=255)

    # --- Albumin Serum ---
    albumin_serum = models.TextField(max_length=255)
    albumin_serum_unit = models.TextField(max_length=255)
    albumin_serum_reference_range = models.TextField(max_length=255, null=True, blank=True)
    albumin_serum_comments = models.TextField(max_length=255)

    # --- Globulin Serum ---
    globulin_serum = models.TextField(max_length=255)
    globulin_serum_unit = models.TextField(max_length=255)
    globulin_serum_reference_range = models.TextField(max_length=255, null=True, blank=True)
    globulin_serum_comments = models.TextField(max_length=255)

    # --- Alb/Glob Ratio ---
    alb_glob_ratio = models.TextField(max_length=255)
    alb_glob_ratio_unit = models.TextField(max_length=255)
    alb_glob_ratio_reference_range = models.TextField(max_length=255, null=True, blank=True)
    alb_glob_ratio_comments = models.TextField(max_length=255)

    # --- GGT ---
    gamma_glutamyl_transferase = models.TextField(max_length=255)
    gamma_glutamyl_transferase_unit = models.TextField(max_length=255)
    gamma_glutamyl_transferase_reference_range = models.TextField(max_length=255, null=True, blank=True)
    gamma_glutamyl_transferase_comments = models.TextField(max_length=255)
    
    # --- C-Reactive Protein ---
    C_reactive_protien = models.TextField(max_length=255)
    C_reactive_protien_unit = models.TextField(max_length=255)
    C_reactive_protien_reference_range = models.TextField(max_length=255, null=True, blank=True)
    C_reactive_protien_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Liver Function Test Report {self.id} for Emp {self.emp_no}"

# --- Thyroid Function Test Model ---
class ThyroidFunctionTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- T3 Fields ---
    t3_triiodothyronine = models.TextField(max_length=255)
    t3_triiodothyronine_unit = models.TextField(max_length=255)
    t3_triiodothyronine_reference_range = models.TextField(max_length=255, null=True, blank=True)
    t3_triiodothyronine_comments = models.TextField(max_length=255)

    # --- T4 Fields ---
    t4_thyroxine = models.TextField(max_length=255)
    t4_thyroxine_unit = models.TextField(max_length=255)
    t4_thyroxine_reference_range = models.TextField(max_length=255, null=True, blank=True)
    t4_thyroxine_comments = models.TextField(max_length=255)

    # --- TSH Fields ---
    tsh_thyroid_stimulating_hormone = models.TextField(max_length=255)
    tsh_thyroid_stimulating_hormone_unit = models.TextField(max_length=255)
    tsh_thyroid_stimulating_hormone_reference_range = models.TextField(max_length=255, null=True, blank=True)
    tsh_thyroid_stimulating_hormone_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Thyroid Function Test Report {self.id} for Emp {self.emp_no}"


# --- Autoimmune test Model ---
class AutoimmuneTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- ANA ---
    ANA = models.TextField(max_length=255)
    ANA_unit = models.TextField(max_length=255)
    ANA_reference_range = models.TextField(max_length=255, null=True, blank=True)
    ANA_comments = models.TextField(max_length=255)
    
    # --- Anti ds DNA ---
    Anti_ds_dna = models.TextField(max_length=255)
    Anti_ds_dna_unit = models.TextField(max_length=255)
    Anti_ds_dna_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Anti_ds_dna_comments = models.TextField(max_length=255)
    
    # --- Anticardiolipin Antibodies ---
    Anticardiolipin_Antibodies = models.TextField(max_length=255)
    Anticardiolipin_Antibodies_unit = models.TextField(max_length=255)
    Anticardiolipin_Antibodies_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Anticardiolipin_Antibodies_comments = models.TextField(max_length=255)
    
    # --- Rheumatoid Factor ---
    Rheumatoid_factor = models.TextField(max_length=255)
    Rheumatoid_factor_unit = models.TextField(max_length=255)
    Rheumatoid_factor_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Rheumatoid_factor_comments = models.TextField(max_length=255)
    
    def __str__(self):
        return f"Autoimmune Test {self.id} for Emp {self.emp_no}"


# --- Coagulation Test Model ---
class CoagulationTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- Prothrombin Time ---
    prothrombin_time = models.TextField(max_length=255)
    prothrombin_time_unit = models.TextField(max_length=255)
    prothrombin_time_reference_range = models.TextField(max_length=255, null=True, blank=True)
    prothrombin_time_comments = models.TextField(max_length=255)

    # --- PT INR ---
    pt_inr = models.TextField(max_length=255)
    pt_inr_unit = models.TextField(max_length=255)
    pt_inr_reference_range = models.TextField(max_length=255, null=True, blank=True)
    pt_inr_comments = models.TextField(max_length=255)

    # --- Clotting Time ---
    clotting_time = models.TextField(max_length=255)
    clotting_time_unit = models.TextField(max_length=255)
    clotting_time_reference_range = models.TextField(max_length=255, null=True, blank=True)
    clotting_time_comments = models.TextField(max_length=255)

    # --- Bleeding Time ---
    bleeding_time = models.TextField(max_length=255)
    bleeding_time_unit = models.TextField(max_length=255)
    bleeding_time_reference_range = models.TextField(max_length=255, null=True, blank=True)
    bleeding_time_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Coagulation Test Report {self.id} for Emp {self.emp_no}"


# --- Enzymes Cardiac Profile Model ---
class EnzymesCardiacProfile(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- Acid Phosphatase ---
    acid_phosphatase = models.TextField(max_length=255)
    acid_phosphatase_unit = models.TextField(max_length=255)
    acid_phosphatase_reference_range = models.TextField(max_length=255, null=True, blank=True)
    acid_phosphatase_comments = models.TextField(max_length=255)

    # --- Adenosine Deaminase ---
    adenosine_deaminase = models.TextField(max_length=255)
    adenosine_deaminase_unit = models.TextField(max_length=255)
    adenosine_deaminase_reference_range = models.TextField(max_length=255, null=True, blank=True)
    adenosine_deaminase_comments = models.TextField(max_length=255)

    # --- Amylase ---
    amylase = models.TextField(max_length=255)
    amylase_unit = models.TextField(max_length=255)
    amylase_reference_range = models.TextField(max_length=255, null=True, blank=True)
    amylase_comments = models.TextField(max_length=255)

    # --- ECG ---
    ecg = models.TextField(max_length=255)
    ecg_comments = models.TextField(max_length=255)

    # --- Troponin T ---
    troponin_t = models.TextField(max_length=255)
    troponin_t_unit = models.TextField(max_length=255)
    troponin_t_reference_range = models.TextField(max_length=255, null=True, blank=True)
    troponin_t_comments = models.TextField(max_length=255)
    
    # --- Troponin I ---
    troponin_i = models.TextField(max_length=255)
    troponin_i_unit = models.TextField(max_length=255)
    troponin_i_reference_range = models.TextField(max_length=255, null=True, blank=True)
    troponin_i_comments = models.TextField(max_length=255)

    # --- CPK Total ---
    cpk_total = models.TextField(max_length=255)
    cpk_total_unit = models.TextField(max_length=255)
    cpk_total_reference_range = models.TextField(max_length=255, null=True, blank=True)
    cpk_total_comments = models.TextField(max_length=255)

    # --- ECHO ---
    echo = models.TextField(max_length=255)
    echo_comments = models.TextField(max_length=255)

    # --- Lipase ---
    lipase = models.TextField(max_length=255)
    lipase_unit = models.TextField(max_length=255)
    lipase_reference_range = models.TextField(max_length=255, null=True, blank=True)
    lipase_comments = models.TextField(max_length=255)

    # --- CPK MB ---
    cpk_mb = models.TextField(max_length=255)
    cpk_mb_unit = models.TextField(max_length=255)
    cpk_mb_reference_range = models.TextField(max_length=255, null=True, blank=True)
    cpk_mb_comments = models.TextField(max_length=255)

    # --- TMT ---
    tmt_normal = models.TextField(max_length=255)
    tmt_normal_comments = models.TextField(max_length=255)
    
    # --- Angiogram ---
    angiogram = models.TextField(max_length=255)
    angiogram_comments = models.TextField(max_length=255)

    def _str_(self):
        return f"Enzymes & Cardiac Profile Report {self.id} for Emp {self.emp_no}"


# --- Urine Routine Test Model ---
class UrineRoutineTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- Colour ---
    colour = models.TextField(max_length=255)
    colour_unit = models.TextField(max_length=255)
    colour_reference_range = models.TextField(max_length=255, null=True, blank=True)
    colour_comments = models.TextField(max_length=255)

    # --- Appearance ---
    appearance = models.TextField(max_length=255)
    appearance_unit = models.TextField(max_length=255)
    appearance_reference_range = models.TextField(max_length=255, null=True, blank=True)
    appearance_comments = models.TextField(max_length=255)

    # --- Reaction pH ---
    reaction_ph = models.TextField(max_length=255)
    reaction_ph_unit = models.TextField(max_length=255)
    reaction_ph_reference_range = models.TextField(max_length=255, null=True, blank=True)
    reaction_ph_comments = models.TextField(max_length=255)

    # --- Specific Gravity ---
    specific_gravity = models.TextField(max_length=255)
    specific_gravity_unit = models.TextField(max_length=255)
    specific_gravity_reference_range = models.TextField(max_length=255, null=True, blank=True)
    specific_gravity_comments = models.TextField(max_length=255)

    # --- Crystals ---
    crystals = models.TextField(max_length=255)
    crystals_unit = models.TextField(max_length=255)
    crystals_reference_range = models.TextField(max_length=255, null=True, blank=True)
    crystals_comments = models.TextField(max_length=255)

    # --- Bacteria ---
    bacteria = models.TextField(max_length=255)
    bacteria_unit = models.TextField(max_length=255)
    bacteria_reference_range = models.TextField(max_length=255, null=True, blank=True)
    bacteria_comments = models.TextField(max_length=255)

    # --- Protein/Albumin ---
    protein_albumin = models.TextField(max_length=255)
    protein_albumin_unit = models.TextField(max_length=255)
    protein_albumin_reference_range = models.TextField(max_length=255, null=True, blank=True)
    protein_albumin_comments = models.TextField(max_length=255)

    # --- Glucose Urine ---
    glucose_urine = models.TextField(max_length=255)
    glucose_urine_unit = models.TextField(max_length=255)
    glucose_urine_reference_range = models.TextField(max_length=255, null=True, blank=True)
    glucose_urine_comments = models.TextField(max_length=255)

    # --- Ketone Bodies ---
    ketone_bodies = models.TextField(max_length=255)
    ketone_bodies_unit = models.TextField(max_length=255)
    ketone_bodies_reference_range = models.TextField(max_length=255, null=True, blank=True)
    ketone_bodies_comments = models.TextField(max_length=255)

    # --- Urobilinogen ---
    urobilinogen = models.TextField(max_length=255)
    urobilinogen_unit = models.TextField(max_length=255)
    urobilinogen_reference_range = models.TextField(max_length=255, null=True, blank=True)
    urobilinogen_comments = models.TextField(max_length=255)

    # --- Casts ---
    casts = models.TextField(max_length=255)
    casts_unit = models.TextField(max_length=255)
    casts_reference_range = models.TextField(max_length=255, null=True, blank=True)
    casts_comments = models.TextField(max_length=255)

    # --- Bile Salts ---
    bile_salts = models.TextField(max_length=255)
    bile_salts_unit = models.TextField(max_length=255)
    bile_salts_reference_range = models.TextField(max_length=255, null=True, blank=True)
    bile_salts_comments = models.TextField(max_length=255)

    # --- Bile Pigments ---
    bile_pigments = models.TextField(max_length=255)
    bile_pigments_unit = models.TextField(max_length=255)
    bile_pigments_reference_range = models.TextField(max_length=255, null=True, blank=True)
    bile_pigments_comments = models.TextField(max_length=255)

    # --- WBC / Pus Cells ---
    wbc_pus_cells = models.TextField(max_length=255)
    wbc_pus_cells_unit = models.TextField(max_length=255)
    wbc_pus_cells_reference_range = models.TextField(max_length=255, null=True, blank=True)
    wbc_pus_cells_comments = models.TextField(max_length=255)

    # --- Red Blood Cells ---
    red_blood_cells = models.TextField(max_length=255)
    red_blood_cells_unit = models.TextField(max_length=255)
    red_blood_cells_reference_range = models.TextField(max_length=255, null=True, blank=True)
    red_blood_cells_comments = models.TextField(max_length=255)

    # --- Epithelial Cells ---
    epithelial_cells = models.TextField(max_length=255)
    epithelial_cells_unit = models.TextField(max_length=255)
    epithelial_cells_reference_range = models.TextField(max_length=255, null=True, blank=True)
    epithelial_cells_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Urine Routine Test Report {self.id} for Emp {self.emp_no}"

# --- Serology Test Model ---
class SerologyTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- Screening HIV 1 ---
    screening_hiv = models.TextField(max_length=255)
    screening_hiv_unit = models.TextField(max_length=255)
    screening_hiv_reference_range = models.TextField(max_length=255, null=True, blank=True)
    screening_hiv_comments = models.TextField(max_length=255)
    
    # --- Screening HIV 2 ---
    screening_hiv2 = models.TextField(max_length=255)
    screening_hiv2_unit = models.TextField(max_length=255)
    screening_hiv2_reference_range = models.TextField(max_length=255, null=True, blank=True)
    screening_hiv2_comments = models.TextField(max_length=255)
    
    # --- HBsAg ---
    HBsAG = models.TextField(max_length=255)
    HBsAG_unit = models.TextField(max_length=255)
    HBsAG_reference_range = models.TextField(max_length=255, null=True, blank=True)
    HBsAG_comments = models.TextField(max_length=255)
    
    # --- HCV ---
    HCV = models.TextField(max_length=255)
    HCV_unit = models.TextField(max_length=255)
    HCV_reference_range = models.TextField(max_length=255, null=True, blank=True)
    HCV_comments = models.TextField(max_length=255)
    
    # --- WIDAL ---
    WIDAL = models.TextField(max_length=255)
    WIDAL_unit = models.TextField(max_length=255)
    WIDAL_reference_range = models.TextField(max_length=255, null=True, blank=True)
    WIDAL_comments = models.TextField(max_length=255)
    
    # --- VDRL ---
    VDRL = models.TextField(max_length=255)
    VDRL_unit = models.TextField(max_length=255)
    VDRL_reference_range = models.TextField(max_length=255, null=True, blank=True)
    VDRL_comments = models.TextField(max_length=255)
    
    # --- Dengue NS1Ag ---
    Dengue_NS1Ag = models.TextField(max_length=255)
    Dengue_NS1Ag_unit = models.TextField(max_length=255)
    Dengue_NS1Ag_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Dengue_NS1Ag_comments = models.TextField(max_length=255)

    # --- Dengue IgG ---
    Dengue_IgG = models.TextField(max_length=255)
    Dengue_IgG_unit = models.TextField(max_length=255)
    Dengue_IgG_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Dengue_IgG_comments = models.TextField(max_length=255)
    
    # --- Dengue IgM ---
    Dengue_IgM = models.TextField(max_length=255)
    Dengue_IgM_unit = models.TextField(max_length=255)
    Dengue_IgM_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Dengue_IgM_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Serology Test Report {self.id} for Emp {self.emp_no}"


# --- Motion Test Model ---
class MotionTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- Colour ---
    colour_motion = models.TextField(max_length=255)
    colour_motion_unit = models.TextField(max_length=255)
    colour_motion_reference_range = models.TextField(max_length=255, null=True, blank=True)
    colour_motion_comments = models.TextField(max_length=255)

    # --- Appearance ---
    appearance_motion = models.TextField(max_length=255)
    appearance_motion_unit = models.TextField(max_length=255)
    appearance_motion_reference_range = models.TextField(max_length=255, null=True, blank=True)
    appearance_motion_comments = models.TextField(max_length=255)

    # --- Occult Blood ---
    occult_blood = models.TextField(max_length=255)
    occult_blood_unit = models.TextField(max_length=255)
    occult_blood_reference_range = models.TextField(max_length=255, null=True, blank=True)
    occult_blood_comments = models.TextField(max_length=255)

    # --- Cyst ---
    cyst = models.TextField(max_length=255)
    cyst_unit = models.TextField(max_length=255)
    cyst_reference_range = models.TextField(max_length=255, null=True, blank=True)
    cyst_comments = models.TextField(max_length=255)

    # --- Mucus ---
    mucus = models.TextField(max_length=255)
    mucus_unit = models.TextField(max_length=255)
    mucus_reference_range = models.TextField(max_length=255, null=True, blank=True)
    mucus_comments = models.TextField(max_length=255)

    # --- Pus Cells ---
    pus_cells = models.TextField(max_length=255)
    pus_cells_unit = models.TextField(max_length=255)
    pus_cells_reference_range = models.TextField(max_length=255, null=True, blank=True)
    pus_cells_comments = models.TextField(max_length=255)

    # --- Ova ---
    ova = models.TextField(max_length=255)
    ova_unit = models.TextField(max_length=255)
    ova_reference_range = models.TextField(max_length=255, null=True, blank=True)
    ova_comments = models.TextField(max_length=255)

    # --- RBCs ---
    rbcs = models.TextField(max_length=255)
    rbcs_unit = models.TextField(max_length=255)
    rbcs_reference_range = models.TextField(max_length=255, null=True, blank=True)
    rbcs_comments = models.TextField(max_length=255)

    # --- Others ---
    others = models.TextField(max_length=255)
    others_unit = models.TextField(max_length=255)
    others_reference_range = models.TextField(max_length=255, null=True, blank=True)
    others_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Motion Test Report {self.id} for Emp {self.emp_no}"


# --- Culture Sensitivity Test Model ---
class CultureSensitivityTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- Urine ---
    urine = models.TextField(max_length=255)
    urine_unit = models.TextField(max_length=255)
    urine_reference_range = models.TextField(max_length=255, null=True, blank=True)
    urine_comments = models.TextField(max_length=255)

    # --- Motion ---
    motion = models.TextField(max_length=255)
    motion_unit = models.TextField(max_length=255)
    motion_reference_range = models.TextField(max_length=255, null=True, blank=True)
    motion_comments = models.TextField(max_length=255)

    # --- Sputum ---
    sputum = models.TextField(max_length=255)
    sputum_unit = models.TextField(max_length=255)
    sputum_reference_range = models.TextField(max_length=255, null=True, blank=True)
    sputum_comments = models.TextField(max_length=255)

    # --- Blood ---
    blood = models.TextField(max_length=255)
    blood_unit = models.TextField(max_length=255)
    blood_reference_range = models.TextField(max_length=255, null=True, blank=True)
    blood_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Culture & Sensitivity Test Report {self.id} for Emp {self.emp_no}"


# --- Mens Pack Model ---
class MensPack(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- PSA ---
    psa = models.TextField(max_length=255)
    psa_unit = models.TextField(max_length=255)
    psa_reference_range = models.TextField(max_length=255, null=True, blank=True)
    psa_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Men's Pack Test Report {self.id} for Emp {self.emp_no}"


# --- Womens Pack Model ---
# No reference ranges in original code, usually just results/comments
class WomensPack(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True) 
    mrdNo = models.TextField(max_length=255, blank=True)

    Mammogaram  = models.TextField(max_length=255)
    Mammogaram_comments = models.TextField(max_length=255)
    
    PAP_Smear  = models.TextField(max_length=255)
    PAP_Smear_comments = models.TextField(max_length=255)
    
    def __str__(self):
        return f"Women's Pack {self.id} for Emp {self.emp_no}"
    

# --- OccupationalProfile Model ---
# No reference ranges in original code, usually just results/comments
class OccupationalProfile(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)   
    mrdNo = models.TextField(max_length=255, blank=True)

    Audiometry  = models.TextField(max_length=255)
    Audiometry_comments = models.TextField(max_length=255)
    
    PFT  = models.TextField(max_length=255)
    PFT_comments = models.TextField(max_length=255)
    
    def __str__(self):
        return f"Occupational Profile {self.id} for Emp {self.emp_no}"
   

# --- Others Test Model ---      
class OthersTest(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)   
    mrdNo = models.TextField(max_length=255, blank=True)

    # --- Bone Densitometry ---
    Bone_Densitometry = models.TextField(max_length=255)
    Bone_Densitometry_unit = models.TextField(max_length=255)
    Bone_Densitometry_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Bone_Densitometry_comments = models.TextField(max_length=255)
    
    # --- Vit D ---
    Vit_D = models.TextField(max_length=255)
    Vit_D_unit = models.TextField(max_length=255)
    Vit_D_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Vit_D_comments = models.TextField(max_length=255)
    
    # --- Vit B12 ---
    Vit_B12 = models.TextField(max_length=255)
    Vit_B12_unit = models.TextField(max_length=255)
    Vit_B12_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Vit_B12_comments = models.TextField(max_length=255)
    
    # --- Serum Ferritin ---
    Serum_Ferritin = models.TextField(max_length=255)
    Serum_Ferritin_unit = models.TextField(max_length=255)
    Serum_Ferritin_reference_range = models.TextField(max_length=255, null=True, blank=True)
    Serum_Ferritin_comments = models.TextField(max_length=255)
    
    # --- Simple Tests (No ranges) ---
    Dental = models.TextField(max_length=255)
    Dental_comments = models.TextField(max_length=255)
    
    Pathology = models.TextField(max_length=255)
    Pathology_comments = models.TextField(max_length=255)

    Endoscopy = models.TextField(max_length=255)
    Endoscopy_comments = models.TextField(max_length=255)

    Clonoscopy = models.TextField(max_length=255)
    Clonoscopy_comments = models.TextField(max_length=255)

    Urethroscopy = models.TextField(max_length=255)
    Urethroscopy_comments = models.TextField(max_length=255)
    
    Bronchoscopy = models.TextField(max_length=255)
    Bronchoscopy_comments = models.TextField(max_length=255)
    
    Cystoscopy = models.TextField(max_length=255)
    Cystoscopy_comments = models.TextField(max_length=255)
    
    Hysteroscopy = models.TextField(max_length=255)
    Hysteroscopy_comments = models.TextField(max_length=255)
    
    Ureteroscopy = models.TextField(max_length=255)
    Ureteroscopy_comments = models.TextField(max_length=255)
    
    def _str_(self):
        return f"Others Test {self.id} for Emp {self.emp_no}"
    

# --- Ophthalmic Report Model ---
class OphthalmicReport(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    vision = models.TextField(max_length=255)
    vision_comments = models.TextField(max_length=255)

    color_vision = models.TextField(max_length=255)
    color_vision_comments = models.TextField(max_length=255)
    
    Cataract_glaucoma = models.TextField(max_length=255)
    Cataract_glaucoma_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"Ophthalmic Report {self.id} for Emp {self.emp_no}"


# --- XRay Model ---
class XRay(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    Chest = models.TextField(max_length=255)
    Chest_comments = models.TextField(max_length=255)
    
    Spine = models.TextField(max_length=255)
    Spine_comments = models.TextField(max_length=255)
    
    Abdomen = models.TextField(max_length=255)
    Abdomen_comments = models.TextField(max_length=255)
    
    KUB = models.TextField(max_length=255)
    KUB_comments = models.TextField(max_length=255)
    
    Pelvis = models.TextField(max_length=255)
    Pelvis_comments = models.TextField(max_length=255)   
    
    Skull = models.TextField(max_length=255)
    Skull_comments = models.TextField(max_length=255)   
    
    Upper_limb = models.TextField(max_length=255)
    Upper_limb_comments = models.TextField(max_length=255)   
    
    Lower_limb = models.TextField(max_length=255)
    Lower_limb_comments = models.TextField(max_length=255)   
    
    def __str__(self):
        return f"X-Ray {self.id} for Emp {self.emp_no}"


# --- USG Report Model ---
class USGReport(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    usg_abdomen = models.TextField(max_length=255)
    usg_abdomen_comments = models.TextField(max_length=255)

    usg_kub = models.TextField(max_length=255)
    usg_kub_comments = models.TextField(max_length=255)

    usg_pelvis = models.TextField(max_length=255)
    usg_pelvis_comments = models.TextField(max_length=255)

    usg_neck = models.TextField(max_length=255)
    usg_neck_comments = models.TextField(max_length=255)

    def __str__(self):
        return f"USG Report {self.id} for Emp {self.emp_no}"


# --- CT Report Model --- *MODIFIED*

# --- CT Report Model ---
class CTReport(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    CT_brain = models.TextField(max_length=255)
    CT_brain_comments = models.TextField(max_length=255)
    
    CT_Head = models.TextField(max_length=255)
    CT_Head_comments = models.TextField(max_length=255)

    CT_Neck = models.TextField(max_length=255)
    CT_Neck_comments = models.TextField(max_length=255)

    CT_Chest = models.TextField(max_length=255)
    CT_Chest_comments = models.TextField(max_length=255)

    CT_lungs = models.TextField(max_length=255)
    CT_lungs_comments = models.TextField(max_length=255)

    CT_abdomen = models.TextField(max_length=255)
    CT_abdomen_comments = models.TextField(max_length=255)

    CT_spine = models.TextField(max_length=255)
    CT_spine_comments = models.TextField(max_length=255)

    CT_pelvis = models.TextField(max_length=255)
    CT_pelvis_comments = models.TextField(max_length=255)
    
    CT_Upper_limb = models.TextField(max_length=255)
    CT_Upper_limb_comments = models.TextField(max_length=255)   
    
    CT_Lower_limb = models.TextField(max_length=255)
    CT_Lower_limb_comments = models.TextField(max_length=255)   
    
    def __str__(self):
        return f"CT {self.id} for Emp {self.emp_no}"
    

# --- MRI Report Model ---
class MRIReport(BaseModel):
    checked = models.BooleanField(default=False)
    emp_no = models.TextField(max_length=200)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.TextField(max_length=255, blank=True)

    mri_brain = models.TextField(max_length=255)
    mri_brain_comments = models.TextField(max_length=255)

    mri_Head = models.TextField(max_length=255)
    mri_Head_comments = models.TextField(max_length=255)

    mri_Neck = models.TextField(max_length=255)
    mri_Neck_comments = models.TextField(max_length=255)
  
    mri_lungs = models.TextField(max_length=255)
    mri_lungs_comments = models.TextField(max_length=255)

    mri_abdomen = models.TextField(max_length=255)
    mri_abdomen_comments = models.TextField(max_length=255)

    mri_spine = models.TextField(max_length=255)
    mri_spine_comments = models.TextField(max_length=255)

    mri_pelvis = models.TextField(max_length=255)
    mri_pelvis_comments = models.TextField(max_length=255)

    mri_Chest = models.TextField(max_length=255)
    mri_Chest_comments = models.TextField(max_length=255)

    mri_Upper_limb = models.TextField(max_length=255)
    mri_Upper_limb_comments = models.TextField(max_length=255)   
    
    mri_Lower_limb = models.TextField(max_length=255)
    mri_Lower_limb_comments = models.TextField(max_length=255)   
 
    def __str__(self):
        return f"MRI Report {self.id} for Emp {self.emp_no}"

from django.db import models
from datetime import date

# Assuming BaseModel is defined elsewhere
from django.db import models
from datetime import date

class Appointment(BaseModel):
    class StatusChoices(models.TextChoices):
        INITIATE = 'initiate', 'Initiate'
        IN_PROGRESS = 'inprogress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        DEFAULT = 'default', 'Default'

    # Core Fields
    appointment_no = models.TextField(max_length=255, blank=True)
    booked_date = models.DateField(default=date.today)
    mrdNo = models.TextField(max_length=255, blank=True)
    
    # Classification
    role = models.TextField(max_length=100, blank=True) # e.g., "Employee"
    visit_type = models.CharField(max_length=50, blank=True, null=True) # e.g., "Preventive"
    
    # The Fix: Separate Register and Purpose
    register = models.TextField(blank=True, null=True) # Specific: "Preventive - Follow Up Visits"
    purpose = models.TextField(blank=True, null=True)  # Broad Category: "Follow Up Visits"
    
    # Identity
    emp_no = models.TextField(max_length=255, blank=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    name = models.TextField(max_length=100, blank=True)
    organization_name = models.TextField(max_length=100, blank=True)
    contractor_name = models.TextField(max_length=100, blank=True)
    
    # Date & Time
    date = models.DateField()
    time = models.TextField(max_length=225, blank=True)
    
    # Personnel
    booked_by = models.TextField(max_length=255, blank=True)
    submitted_by_nurse = models.TextField(max_length=255, blank=True)
    submitted_Dr = models.TextField(max_length=255, blank=True)
    consultated_Dr = models.TextField(max_length=100, blank=True)
    employer = models.TextField(max_length=255, blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.INITIATE
    )

    # --- CONDITIONAL FIELDS ---
    year = models.CharField(max_length=20, blank=True, null=True)
    batch = models.CharField(max_length=50, blank=True, null=True)
    hospital_name = models.TextField(blank=True, null=True)
    camp_name = models.TextField(blank=True, null=True)
    
    contract_name = models.TextField(blank=True, null=True)
    prev_contract_name = models.TextField(blank=True, null=True)
    old_emp_no = models.TextField(blank=True, null=True)

    bp_sugar_status = models.CharField(max_length=100, blank=True, null=True)
    bp_sugar_chart_reason = models.CharField(max_length=100, blank=True, null=True)

    followup_reason = models.TextField(blank=True, null=True)
    other_followup_reason = models.TextField(blank=True, null=True)
    other_purpose = models.TextField(blank=True, null=True)

    def __str__(self):
        apt_date_str = self.date.strftime('%Y-%m-%d') if self.date else 'N/A'
        return f"Appointment for {self.name} ({self.emp_no or 'N/A'}) on {apt_date_str}"

# --- Fitness Assessment Model --- *MODIFIED*
class FitnessAssessment(BaseModel):

    # --- Choices ---
    class PositiveNegativeChoices(models.TextChoices):
        POSITIVE = 'positive', 'Positive'
        NEGATIVE = 'negative', 'Negative'

    class EyeExamFitStatusChoices(models.TextChoices):
        FIT = 'Fit', 'Fit'
        FIT_NEW_GLASS = 'Fit when newly prescribed glass', 'Fit when newly prescribed glass'
        FIT_EXISTING_GLASS = 'Fit with existing glass', 'Fit with existing glass'
        FIT_ADVICE_CHANGE_GLASS = 'Fit with an advice to change existing glass with newly prescribed glass', 'Fit with an advice to change existing glass with newly prescribed glass'
        UNFIT = 'Unfit', 'Unfit'

    class OverallFitnessChoices(models.TextChoices):
        FIT = 'fit', 'Fit'
        UNFIT = 'unfit', 'Unfit'
        CONDITIONAL = 'conditional', 'Conditional Fit'

    class StatusChoices(models.TextChoices):
        INITIATE = 'initiate', 'Initiate'
        IN_PROGRESS = 'inprogress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        DEFAULT = 'default', 'Default'
        PENDING = 'pending', 'Pending'

    # --- Fields ---
    emp_no = models.CharField(max_length=50, null=True) # Consider making this non-nullable if always required
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    employer = models.TextField(blank=True, null=True)

    
    follow_up_mrd_history = models.JSONField(
        default=list, 
        blank=True, 
        null=True, 
        help_text="A list of MRD numbers for follow-up reference."
    )

    # Basic Tests
    tremors = models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    romberg_test = models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    acrophobia = models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    trendelenberg_test = models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    CO_dizziness=models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    MusculoSkeletal_Movements=models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    Claustrophobia=models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    Tandem =models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    Nystagmus_Test=models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    Dysdiadochokinesia=models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    Finger_nose_test=models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    Psychological_PMK=models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)
    Psychological_zollingar=models.CharField(max_length=10, choices=PositiveNegativeChoices.choices, blank=True, null=True)

    otherJobNature = models.CharField(max_length=225, blank=True, null=True)
    conditionalotherJobNature = models.CharField(max_length=225, blank=True, null=True)
    #special cases
    special_cases=models.CharField(max_length=10,blank=True,null=True)
    mrdNo = models.CharField(max_length=255, blank=True, null=True)
    # Job & Fitness Status
    job_nature = models.JSONField(blank=True, null=True)
    overall_fitness = models.CharField(max_length=20, choices=OverallFitnessChoices.choices, blank=True, null=True)
    conditional_fit_feilds = models.JSONField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.INITIATE
    )
    submittedDoctor = models.CharField(max_length=255, blank=True, null=True)
    submittedNurse = models.CharField(max_length=255, blank=True, null=True)
    bookedDoctor = models.CharField(max_length=255, blank=True, null=True)

    # Examinations
    general_examination = models.TextField(blank=True, null=True)
    systematic_examination = models.TextField(blank=True, null=True)
    eye_exam_fit_status = models.CharField(
        max_length=100,
        choices=EyeExamFitStatusChoices.choices,
        blank=True,
        null=True
    )

    # Comments & Validity
    comments = models.TextField(blank=True, null=True)
    validity = models.DateField(blank=True, null=True)

    def __str__(self):
        fit_status = self.get_overall_fitness_display() or 'Pending'
        return f"Fitness Assessment for {self.emp_no} - {fit_status}"

    class Meta:
        verbose_name = "Fitness Assessment"
        verbose_name_plural = "Fitness Assessments"


# --- Vaccination Record Model --- *MODIFIED*
class VaccinationRecord(BaseModel):
    emp_no = models.CharField(max_length=30)
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    mrdNo=models.CharField(max_length=255,blank=True,null=True)
    vaccination = models.JSONField(default=list)

    def __str__(self):
        return f"Vaccination Record for {self.emp_no}"

# --- Review Category Model ---
# No emp_no, so no aadhar added here
class ReviewCategory(BaseModel):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

# --- Review Model ---
# No emp_no, so no aadhar added here (pid seems to be the identifier)
class Review(BaseModel):
    # ... (keep all existing fields from Review as they were) ...
    category = models.ForeignKey(ReviewCategory, on_delete=models.CASCADE, related_name="reviews")
    pid = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    gender = models.CharField(max_length=10, choices=[("Male", "Male"), ("Female", "Female")])
    appointment_date = models.DateField()
    status = models.CharField(max_length=20, choices=[("Today", "Today"), ("Tomorrow", "Tomorrow"), ("Not Attempted", "Not Attempted")], default="Today")

    def __str__(self):
        return f"{self.name} - {self.category.name}"

# --- Member Model ---
# Has employee_number, not emp_no, but also has aadhar. Keeping as is.
class Member(BaseModel):
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    name = models.CharField(max_length=225)
    emp_no = models.CharField(max_length=200,blank=True)
    designation = models.CharField(max_length=225, blank=True)
    mail_id_Office = models.EmailField(max_length=225, blank=True)
    mail_id_Personal = models.EmailField(max_length=225, blank=True)
    phone_Personal = models.CharField(max_length=225, blank=True)
    phone_Office = models.CharField(max_length=225, blank=True)
    job_nature = models.CharField(max_length=225, blank=True)
    doj = models.DateField(null=True, blank=True)
    role = models.CharField(max_length=255, blank=True)
    date_exited = models.DateField(null=True, blank=True)
    hospital_name = models.CharField(max_length=255, null=True, blank=True)
    password = models.CharField(max_length=255, db_column='password', null=True, blank=True)

    
    
    type = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.name

# --- Medical History Model --- *MODIFIED*
class MedicalHistory(BaseModel):
    # ... (keep all existing fields from MedicalHistory as they were) ...
    emp_no = models.CharField(max_length=255, null=True, blank=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    personal_history = models.JSONField(null=True, blank=True)
    medical_data = models.JSONField(null=True, blank=True)
    female_worker = models.JSONField(null=True, blank=True)
    surgical_history = models.JSONField(null=True, blank=True)
    family_history = models.JSONField(null=True, blank=True)
    health_conditions = models.JSONField(null=True, blank=True)
    allergy_fields = models.JSONField(null=True, blank=True)
    allergy_comments = models.JSONField(null=True, blank=True)
    children_data = models.JSONField(null=True, blank=True)
    conditions = models.JSONField(null=True, blank=True)
    spouse_data=models.JSONField(null=True,blank=True)
    mrdNo = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Medical History for Emp No: {self.emp_no or 'N/A'}"


# --- Consultation Model --- *MODIFIED*
# Using models.Model directly as per original, ensure BaseModel features are replicated if needed
# your_app/models.py

from django.db import models
from django.utils import timezone
# from django.db.models import JSONField # Import is no longer needed on Django 3.1+

class Consultation(models.Model):
    # --- Identifiers ---

    class StatusChoices(models.TextChoices):
        INITIATE = 'initiate', 'Initiate'
        IN_PROGRESS = 'inprogress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        DEFAULT = 'default', 'Default'
        PENDING = 'pending', 'Pending'

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.INITIATE
    )
    emp_no = models.CharField(max_length=50, blank=True, null=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    mrdNo = models.CharField(max_length=255, blank=True, null=True)
    entry_date = models.DateField(default=timezone.now)

    # --- Clinical Notes ---
    complaints = models.TextField(blank=True, null=True)
    examination = models.TextField(blank=True, null=True)
    systematic = models.TextField(blank=True, null=True)
    lexamination = models.TextField(blank=True, null=True)
    diagnosis = models.TextField(blank=True, null=True)
    procedure_notes = models.TextField(blank=True, null=True)
    obsnotes = models.TextField(blank=True, null=True)

    # --- Investigation, Advice, Follow-up ---
    investigation_details = models.TextField(blank=True, null=True)
    advice = models.TextField(blank=True, null=True)
    follow_up_date = models.DateField(blank=True, null=True)

    
    follow_up_mrd_history = models.JSONField(
        default=list, 
        blank=True, 
        null=True, 
        help_text="A list of MRD numbers for follow-up reference."
    )

    # --- Case Details ---
    case_type = models.CharField(max_length=100, blank=True, null=True)
    illness_or_injury = models.CharField(max_length=255, blank=True, null=True)
    other_case_details = models.TextField(blank=True, null=True)
    notifiable_remarks = models.TextField(blank=True, null=True)

    # --- Referral & Shifting Details ---
    referral = models.CharField(max_length=10, blank=True, null=True)
    hospital_name = models.CharField(max_length=255, blank=True, null=True)
    speciality = models.CharField(max_length=255, blank=True, null=True)
    doctor_name = models.CharField(max_length=255, blank=True, null=True)
    shifting_required = models.CharField(max_length=10, blank=True, null=True)
    shifting_notes = models.TextField(blank=True, null=True)
    ambulance_details = models.TextField(blank=True, null=True)
    special_cases = models.CharField(max_length=10, blank=True, null=True)
    
    # --- Submission Metadata ---
    submittedDoctor = models.CharField(max_length=255, blank=True, null=True)
    submittedNurse = models.CharField(max_length=255, blank=True, null=True)
    bookedDoctor = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-entry_date', '-id']

    def __str__(self):
        entry_date_str = self.entry_date.strftime('%Y-%m-%d') if self.entry_date else 'N/A'
        return f"Consultation {self.pk} - Aadhar: {self.aadhar or 'N/A'} on {entry_date_str}"


# --- Pharmacy Stock Model ---
# No emp_no, so no aadhar added here
class PharmacyStock(BaseModel):
    class MedicineFormChoices(models.TextChoices):
        TABLET = "Tablet", "Tablet"
        SYRUP = "Syrup", "Syrup"
        INJECTION = "Injection", "Injection"
        CREAMS = "Creams", "Creams"
        DROPS = "Drops", "Drops"
        FLUIDS = "Fluids", "Fluids"
        OTHER = "Other", "Other"
        LOTIONS = "Lotions", "Lotions"
        POWDER = "Powder", "Powder"
        RESPULES = "Respules", "Respules"
        SUTURE_PROCEDURE = "SutureAndProcedureItems", "SutureAndProcedureItems"
        DRESSING_ITEMS = "Dressing Items", "Dressing Items"

    medicine_form = models.CharField(max_length=50, choices=MedicineFormChoices.choices)
    brand_name = models.CharField(max_length=255)
    
    # ✅ Changed: Made optional
    chemical_name = models.CharField(max_length=255, blank=True, null=True)
    dose_volume = models.CharField(max_length=50, blank=True, null=True)
    
    total_quantity = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField()
    expiry_date = models.DateField()

    def save(self, *args, **kwargs):
        if not self.pk: 
            self.total_quantity = self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        if self.chemical_name:
            return f"{self.brand_name} ({self.chemical_name})"
        return self.brand_name
# --- Expiry Register Model ---
# No emp_no, so no aadhar added here
class ExpiryRegister(BaseModel):
    medicine_form = models.CharField(max_length=255, null=True, blank=True)
    brand_name = models.CharField(max_length=255, null=True, blank=True)
    chemical_name = models.CharField(max_length=255, null=True, blank=True)
    dose_volume = models.CharField(max_length=50, null=True, blank=True)
    quantity = models.PositiveIntegerField()
    expiry_date = models.DateField()
    removed_date = models.DateField(null=True, blank=True)
    total_quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.brand_name} - {self.dose_volume} ({self.expiry_date})"

# --- Discarded Medicine Model ---
# No emp_no, so no aadhar added here
class DiscardedMedicine(BaseModel):
    medicine_form = models.CharField(max_length=20)
    brand_name = models.CharField(max_length=255)
    chemical_name = models.CharField(max_length=255)
    dose_volume = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField()
    expiry_date = models.DateField()
    reason = models.TextField()
    #total_quantity=models.PositiveBigIntegerField()


    def __str__(self):
        discard_date_str = self.discarded_date.strftime('%Y-%m-%d') if self.discarded_date else 'N/A'
        return f"{self.brand_name} ({self.dose_volume}) - Discarded {discard_date_str}"

# --- Ward Consumables Model ---
# No emp_no, so no aadhar added here
class WardConsumables(BaseModel):
    medicine_form = models.CharField(max_length=20)
    brand_name = models.CharField(max_length=255)
    chemical_name = models.CharField(max_length=255)
    dose_volume = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField()
    expiry_date = models.DateField()
    consumed_date = models.DateField(auto_now_add=True) # Sets on creation
    # total_quantity=models.PositiveBigIntegerField()

    def __str__(self):
        consumed_date_str = self.consumed_date.strftime('%Y-%m-%d') if self.consumed_date else 'N/A'
        return f"{self.brand_name} ({self.dose_volume}) - Consumed {consumed_date_str}"
    

class AmbulanceConsumables(models.Model):
    entry_date = models.DateField(default=timezone.now)
    medicine_form = models.CharField(max_length=20)
    brand_name = models.CharField(max_length=255)  # Medicine name given by the company
    chemical_name = models.CharField(max_length=255)  # Active ingredient
    dose_volume = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField()
    expiry_date = models.DateField()
    consumed_date = models.DateField(auto_now_add=True)  # Date when medicine was discarded
    # total_quantity=models.PositiveBigIntegerField()

    def _str_(self):
        return f"{self.brand_name} ({self.dose_volume}) - {self.discarded_date}"

# --- Pharmacy Medicine Model ---
# No emp_no, so no aadhar added here
class PharmacyMedicine(BaseModel):
    MEDICINE_FORMS = [
        ("Tablet", "Tablet"), 
        ("Syrup", "Syrup"), 
        ("Injection", "Injection"), 
        ("Creams", "Creams"),
        ("Lotions", "Lotions"),
        ("Powder", "Powder"),
        ("Respules", "Respules"), 
        ("Drops", "Drops"), 
        ("Fluids", "Fluids"), 
        ("Other", "Other"),
        # ✅ Added new categories to match PharmacyStock
        ("SutureAndProcedureItems", "SutureAndProcedureItems"),
        ("Dressing Items", "Dressing Items"),
    ]
    medicine_form = models.CharField(max_length=50, choices=MEDICINE_FORMS)
    brand_name = models.CharField(max_length=255)
    
    # ✅ Changed: Made optional
    chemical_name = models.CharField(max_length=255, blank=True, null=True)
    dose_volume = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        unique_together = ("brand_name", "chemical_name", "dose_volume")

    def __str__(self):
        if self.chemical_name:
            return f"{self.brand_name} ({self.chemical_name})"
        return self.brand_name

from django.db import models

class InstrumentCalibration(models.Model):
    # This will be the unique business key for the instrument.
    equipment_sl_no = models.CharField(max_length=255)
    
    # This will be our auto-incrementing number, managed by the view.
    instrument_number = models.CharField(max_length=100, null=True, blank=False)
    
    entry_date = models.DateField(auto_now_add=True)
    instrument_name = models.CharField(max_length=255)
    certificate_number = models.CharField(max_length=255, null=True, blank=True)
    make = models.CharField(max_length=255, null=True, blank=True) # Corresponds to "Brand Name"
    model_number = models.CharField(max_length=255, null=True, blank=True)
    freq = models.CharField(max_length=255, null=True, blank=True)
    calibration_date = models.DateField(null=True,blank=True)
    next_due_date = models.DateField(null=True,blank=True)
    calibration_status = models.CharField(max_length=225, null=True, blank=True)
    instrument_cnodition = models.CharField(max_length=225, blank=True, null=True)
    done_by = models.CharField(max_length=225, null=True, blank=True)
    inst_status = models.CharField(max_length = 225, null = True, blank = True)

    def __str__(self):
        return f"{self.instrument_name} ({self.equipment_sl_no})"

# --- Prescription Model --- *MODIFIED*
class Prescription(BaseModel):
    emp_no = models.CharField(max_length=20, blank=True, null=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    name = models.CharField(max_length=50) # Assuming patient name?
    tablets = models.JSONField(blank=True, null=True)
    syrups = models.JSONField(blank=True, null=True)
    injections = models.JSONField(blank=True, null=True)
    creams = models.JSONField(blank=True, null=True)
    drops = models.JSONField(blank=True, null=True)
    fluids = models.JSONField(blank=True, null=True)
    lotions = models.JSONField(blank=True, null=True)
    powder = models.JSONField(blank=True, null=True)
    respules = models.JSONField(blank=True, null=True)
    suture_procedure = models.JSONField(blank=True, null=True)
    dressing = models.JSONField(blank=True, null=True)
    others = models.JSONField(blank=True, null=True)
    submitted_by = models.CharField(max_length=50)
    issued_by = models.CharField(max_length=50)
    nurse_notes = models.TextField(blank=True, null=True)
    issued_status = models.IntegerField(default=0) # 0 = Not Issued, 1 = Issued ?
    mrdNo = models.CharField(max_length=255, blank=True, null=True)

    # id = models.AutoField(primary_key=True) # Usually handled by Django unless custom needed

    def __str__(self): # Changed from str to __str__
        return f"Prescription #{self.pk} for {self.name} (Emp: {self.emp_no or 'N/A'})"

# --- Form Models (17, 38, 39, 40, 27) --- *MODIFIED*
class Form17(BaseModel):
    mrdNo = models.CharField(max_length=255, blank=True, null=True)
    emp_no = models.CharField(max_length=255, blank=True, null=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    dept = models.CharField(max_length=255, blank=True, null=True)
    worksNumber = models.CharField(max_length=255, blank=True, null=True)
    workerName = models.CharField(max_length=255, blank=True, null=True)
    sex = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], default='male')
    dob = models.DateField(blank=True, null=True)
    age = models.IntegerField(blank=True, null=True)
    employmentDate = models.DateField(blank=True, null=True)
    leavingDate = models.DateField(blank=True, null=True)
    reason = models.CharField(max_length=255, blank=True, null=True)
    transferredTo = models.CharField(max_length=255, blank=True, null=True)
    jobNature = models.CharField(max_length=255, blank=True, null=True)
    rawMaterial = models.CharField(max_length=255, blank=True, null=True)
    medicalExamDate = models.DateField(blank=True, null=True)
    medicalExamResult = models.CharField(max_length=255, blank=True, null=True)
    suspensionDetails = models.CharField(max_length=255, blank=True, null=True)
    recertifiedDate = models.DateField(blank=True, null=True)
    unfitnessCertificate = models.CharField(max_length=255, blank=True, null=True)
    surgeonSignature = models.TextField(blank=True, null=True)
    fmoSignature = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Form 17 - {self.workerName or 'N/A'} (Emp: {self.emp_no or 'N/A'})"

class Form38(BaseModel):
    mrdNo = models.CharField(max_length=255, blank=True, null=True)
    emp_no = models.CharField(max_length=255, blank=True, null=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    serialNumber = models.CharField(max_length=255, blank=True, null=True)
    department = models.CharField(max_length=255, blank=True, null=True)
    workerName = models.CharField(max_length=255, blank=True, null=True)
    sex = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], default='male')
    age = models.IntegerField(blank=True, null=True)
    jobNature = models.CharField(max_length=255, blank=True, null=True)
    employmentDate = models.DateField(blank=True, null=True)
    eyeExamDate = models.DateField(blank=True, null=True)
    result = models.CharField(max_length=255, blank=True, null=True)
    opthamologistSignature = models.TextField(blank=True, null=True) # Corrected typo 'opthamologist' -> 'ophthalmologist' if possible later
    fmoSignature = models.TextField(blank=True, null=True)
    remarks = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Form 38 - {self.workerName or 'N/A'} (Emp: {self.emp_no or 'N/A'})"

class Form39(BaseModel):
    mrdNo = models.CharField(max_length=255, blank=True, null=True)
    emp_no = models.CharField(max_length=255, blank=True, null=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    serialNumber = models.CharField(max_length=255, blank=True, null=True)
    workerName = models.CharField(max_length=255, blank=True, null=True)
    sex = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], default='male')
    age = models.IntegerField(blank=True, null=True)
    proposedEmploymentDate = models.DateField(blank=True, null=True)
    jobOccupation = models.CharField(max_length=255, blank=True, null=True)
    rawMaterialHandled = models.CharField(max_length=255, blank=True, null=True)
    medicalExamDate = models.DateField(blank=True, null=True)
    medicalExamResult = models.CharField(max_length=255, blank=True, null=True)
    certifiedFit = models.CharField(max_length=20, choices=[('fit', 'Fit'), ('unfit', 'Unfit'), ('conditional', 'Conditional')], blank=True, null=True)
    certifyingSurgeonSignature = models.TextField(blank=True, null=True)
    departmentSection = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Form 39 - {self.workerName or 'N/A'} (Emp: {self.emp_no or 'N/A'})"

class Form40(BaseModel):
    mrdNo = models.CharField(max_length=255, blank=True, null=True)
    emp_no = models.CharField(max_length=255, blank=True, null=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True) # Added Aadhar
    serialNumber = models.CharField(max_length=255, blank=True, null=True)
    dateOfEmployment = models.DateField(blank=True, null=True)
    workerName = models.CharField(max_length=255, blank=True, null=True)
    sex = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], default='male')
    age = models.IntegerField(blank=True, null=True)
    sonWifeDaughterOf = models.CharField(max_length=255, blank=True, null=True)
    natureOfJob = models.CharField(max_length=255, blank=True, null=True)
    urineResult = models.CharField(max_length=255, blank=True, null=True)
    bloodResult = models.CharField(max_length=255, blank=True, null=True)
    fecesResult = models.CharField(max_length=255, blank=True, null=True)
    xrayResult = models.CharField(max_length=255, blank=True, null=True)
    otherExamResult = models.CharField(max_length=255, blank=True, null=True)
    deworming = models.CharField(max_length=255, blank=True, null=True)
    typhoidVaccinationDate = models.DateField(blank=True, null=True)
    signatureOfFMO = models.TextField(blank=True, null=True)
    remarks = models.CharField(max_length=255, blank=True, null=True)
    mrdNo = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Form 40 - {self.workerName or 'N/A'} (Emp: {self.emp_no or 'N/A'})"

class Form27(BaseModel):
    mrdNo = models.CharField(max_length=255, blank=True, null=True)
    emp_no = models.CharField(max_length=255, blank=True, null=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True) 
    serialNumber = models.CharField(max_length=255, blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    department = models.CharField(max_length=255, blank=True, null=True)
    nameOfWorks = models.CharField(max_length=255, blank=True, null=True) # Worker name? Renamed for clarity
    sex = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], default='male')
    dateOfBirth = models.DateField(blank=True, null=True)
    age = models.IntegerField(blank=True, null=True)
    nameOfTheFather = models.CharField(max_length=255, blank=True, null=True)
    natureOfJobOrOccupation = models.CharField(max_length=255, blank=True, null=True)
    signatureOfFMO = models.TextField(blank=True, null=True)
    descriptiveMarks = models.CharField(max_length=255, blank=True, null=True)
    signatureOfCertifyingSurgeon = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Form 27 - {self.nameOfWorks or 'N/A'} (Emp: {self.emp_no or 'N/A'})"
    


# your_app/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
# from .base import BaseModel  # Assuming your BaseModel is in base.py
# from .models import employee_details # Assuming employee_details is in the same models.py

# It's better to explicitly import what you need
# from your_app.base import BaseModel
# from your_app.models import employee_details

class alcohol_form(BaseModel): # Or models.Model if you don't have a BaseModel
    # --- Link to Employee and Date (Recommended for uniqueness) ---
    employee = models.ForeignKey('employee_details', on_delete=models.CASCADE, related_name='alcohol_forms')
    date = models.DateField(_("Date of Test"), null=True)
    mrdNo = models.CharField(max_length=255, blank=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True)

    # --- CORRECTED FIELDS: Using standard Python/Django snake_case ---
    alcohol_breath_smell = models.CharField(max_length=255, blank=True, null=True)
    speech = models.CharField(max_length=255, blank=True, null=True)
    dryness_of_mouth = models.CharField(max_length=255, blank=True, null=True)
    dryness_of_lips = models.CharField(max_length=255, blank=True, null=True)
    cns_pupil_reaction = models.CharField(max_length=255, blank=True, null=True)
    hand_tremors = models.CharField(max_length=255, blank=True, null=True)
    alcohol_analyzer_study = models.CharField(max_length=255, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    advice = models.TextField(blank=True, null=True)

    class Meta:
        # This ensures one employee can only have one alcohol form per day
        unique_together = ('employee', 'date')
        ordering = ['-date']

    def __str__(self):
        # Assuming your employee_details model has a 'name' field
        return f"Alcohol Form for {self.employee.name} on {self.date}"

class PersonalLeaveCertificate(models.Model):
    YES_NO_CHOICES = [('Yes', 'Yes'),('No', 'No'),]
    SEX_CHOICES = [('Male', 'Male'),('Female', 'Female'), ('Other', 'Other'),]
    mrdNo = models.CharField(max_length=255, blank=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    employeeName = models.CharField(_("Employee Name"), max_length=255, blank=True)
    age = models.PositiveIntegerField(_("Age"), null=True, blank=True)
    sex = models.CharField(_("Sex"), max_length=10, choices=SEX_CHOICES, blank=True)
    empNo = models.CharField(_("Employee Number"), max_length=50, blank=True)
    department = models.CharField(_("Department"), max_length=100, blank=True)
    date = models.DateField(_("Date of Certificate"), null=True, blank=True)
    jswContract = models.CharField(_("JSW / Contract"), max_length=100, blank=True)
    natureOfWork = models.CharField(_("Nature of Work"), max_length=255, blank=True)

    hasSurgicalHistory = models.CharField( _("Surgical & Medical History"),  max_length=3,  choices=YES_NO_CHOICES, blank=True)
    covidVaccination = models.CharField( _("Covid Vaccination"),  max_length=3,  choices=YES_NO_CHOICES,  blank=True )
    personalLeaveDescription = models.TextField(_("Personal Leave Description"), blank=True)
    leaveFrom = models.DateField(_("Leave From"), null=True, blank=True)
    leaveUpTo = models.DateField(_("Leave Up To"), null=True, blank=True)
    daysLeave = models.PositiveIntegerField(_("Number of Days Leave"), null=True, blank=True)
    rejoiningDate = models.DateField(_("Re-joining Duty On"), null=True, blank=True)

    bp = models.CharField(_("Blood Pressure (BP)"), max_length=20, blank=True)
    pr = models.CharField(_("Pulse Rate (PR)"), max_length=20, blank=True)
    spo2 = models.CharField(_("SPO2"), max_length=20, blank=True)
    temp = models.CharField(_("Temperature"), max_length=20, blank=True)

    
    
    note = models.TextField(_("Note"), blank=True)
    ohcStaffSignature = models.CharField(_("OHC Staff Signature"), max_length=255, blank=True)
    individualSignature = models.CharField(_("Individual Signature"), max_length=255, blank=True)
    
    
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        """String representation of the model instance."""
        return f"Leave Certificate for {self.employeeName or 'N/A'} on {self.date or 'Unknown Date'}"

    class Meta:
        verbose_name = _("Personal Leave Certificate")
        verbose_name_plural = _("Personal Leave Certificates")
        ordering = ['-date', '-created_at']

class MedicalCertificate(models.Model):
    # --- Choices for specific fields ---
    
    SEX_CHOICES = [('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other'),]
    VACCINATION_CHOICES = [ ('Yes', 'Yes'), ('No', 'No'), ('Partial', 'Partial'),]
    SHIFT_CHOICES = [('G', 'G Shift'), ('A', 'A Shift'), ('B', 'B Shift'), ('C', 'C Shift'),]
    CERTIFICATE_SOURCE_CHOICES = [('Govt Hospital', 'Govt Hospital'),('ESI Hospital', 'ESI Hospital'),('Private Hospital', 'Private Hospital'),]
    mrdNo = models.CharField(max_length=255, blank=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True)
    employeeName = models.CharField(_("Employee Name"), max_length=255, blank=True)
    age = models.PositiveIntegerField(_("Age"), null=True, blank=True)
    sex = models.CharField(_("Sex"), max_length=10, choices=SEX_CHOICES, blank=True)
    empNo = models.CharField(_("Employee Number"), max_length=50, blank=True)
    department = models.CharField(_("Department"), max_length=100, blank=True)
    date = models.DateField(_("Date of Certificate"), null=True, blank=True)
    jswContract = models.CharField(_("JSW Contract"), max_length=100, blank=True)
    natureOfWork = models.CharField(_("Nature of Work"), max_length=255, blank=True)
    covidVaccination = models.CharField(
        _("Covid Vaccination"),
        max_length=10,
        choices=VACCINATION_CHOICES,
        blank=True
    )

    # --- Section: Medical Leave Information ---
    
    diagnosis = models.TextField(_("Diagnosis (Disease/Condition)"), blank=True)
    leaveFrom = models.DateField(_("Leave From"), null=True, blank=True)
    leaveUpTo = models.DateField(_("Leave Up To"), null=True, blank=True)
    daysLeave = models.PositiveIntegerField(_("Number of Days Leave"), null=True, blank=True)

    # --- Section: Return to Duty Details ---
    
    rejoiningDate = models.DateField(_("Rejoining Duty On"), null=True, blank=True)
    shift = models.CharField(_("Shift"), max_length=5, choices=SHIFT_CHOICES, blank=True)
    
    # Vitals are CharFields to accommodate units or special formats (e.g., "120/80").
    bp = models.CharField(_("Blood Pressure (BP)"), max_length=20, blank=True)
    pr = models.CharField(_("Pulse Rate (PR)"), max_length=20, blank=True)
    # Note: React state has 'sp02'. Using 'spo2' as the standard field name.
    spo2 = models.CharField(_("SPO2"), max_length=20, blank=True)
    temp = models.CharField(_("Temperature"), max_length=20, blank=True)

    certificateFrom = models.CharField(
        _("Certificate Issued From"),
        max_length=50,
        choices=CERTIFICATE_SOURCE_CHOICES,
        blank=True
    )

    # --- Section: Notes & Signatures ---
    
    note = models.TextField(_("Note / Remarks"), blank=True)
    ohcStaffSignature = models.CharField(_("OHC Staff Signature"), max_length=255, blank=True)
    individualSignature = models.CharField(_("Individual Signature"), max_length=255, blank=True)

    # --- Auto-managed fields for tracking ---
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        """String representation of the model instance."""
        return f"Medical Certificate for {self.employeeName or 'N/A'} on {self.date or 'Unknown Date'}"

    class Meta:
        verbose_name = _("Medical Certificate of Fitness")
        verbose_name_plural = _("Medical Certificates of Fitness")
        ordering = ['-date', '-created_at']



# --- Significant Notes Model --- *MODIFIED*
class SignificantNotes(BaseModel):
    COMMUNICABLE_DISEASE_CHOICES = [('CD1', 'CD1'), ('CD2', 'CD2'), ('Unknown', 'Unknown'), ('', 'Select...'),]
    INCIDENT_TYPE_CHOICES = [('FAC', 'Fac'), ('LTI', 'LTI'), ('MTC', 'MTC'), ('FATAL', 'Fatal'), ('', 'Select...'),]
    INCIDENT_CHOICES = [('Occupational Injury', 'Occupational Injury'), ('Domestic Injury', 'Domestic Injury'), ('Communication Injury', 'Communication Injury'), ('Other Injury', 'Other Injury'), ('', 'Select...'),]
    ILLNESS_TYPE_CHOICES = [('Occupational Illness', 'Occupational Illness'), ('Occupational Disease', 'Occupational Disease'), ('', 'Select...'),]

    emp_no = models.CharField(max_length=20, blank=True, null=True)
    mrdNo = models.CharField(max_length=255, blank=True, null=True)
    aadhar = models.CharField(max_length=225, blank=True, null=True) 
    healthsummary = models.JSONField(default=list, blank=True, null=True)
    remarks = models.JSONField(default=list, blank=True, null=True)
    communicable_disease = models.CharField(max_length=50, choices=COMMUNICABLE_DISEASE_CHOICES, blank=True, null=True, default='', verbose_name="Communicable Disease")
    incident_type = models.CharField(max_length=50, choices=INCIDENT_TYPE_CHOICES, blank=True, null=True, default='', verbose_name="Incident Type")
    incident = models.CharField(max_length=100, choices=INCIDENT_CHOICES, blank=True, null=True, default='', verbose_name="Incident")
    illness_type = models.CharField(max_length=100, choices=ILLNESS_TYPE_CHOICES, blank=True, null=True, default='', verbose_name="Illness Type")

    def __str__(self):
        date_str = self.entry_date.strftime('%Y-%m-%d') if self.entry_date else 'No Date'
        return f"Significant Notes for Emp {self.emp_no or 'N/A'} on {date_str}"

    class Meta:
        verbose_name = "Significant Note"
        verbose_name_plural = "Significant Notes"
        ordering = ['-entry_date', 'emp_no']


# --- Pharmacy Stock History Model ---
# No emp_no, so no aadhar added here
#Don't add the BaseModel Here.
class PharmacyStockHistory(models.Model):
    entry_date = models.DateField(default=timezone.now)
    
    # ✅ Changed: Increased max_length from 20 to 50 (Crucial for "SutureAndProcedureItems")
    medicine_form = models.CharField(max_length=50) 
    
    brand_name = models.CharField(max_length=255)
    
    # ✅ Changed: Made optional
    chemical_name = models.CharField(max_length=255, blank=True, null=True)
    dose_volume = models.CharField(max_length=50, blank=True, null=True)
    
    total_quantity = models.PositiveIntegerField(default=0)
    expiry_date = models.DateField()

    def __str__(self):
        if self.chemical_name:
            return f"{self.brand_name} ({self.chemical_name}) - Archived History"
        return f"{self.brand_name} - Archived History"
    



class DailyQuantity(models.Model):
    chemical_name = models.CharField(max_length=255, db_index=True)
    brand_name = models.CharField(max_length=255)
    dose_volume = models.CharField(max_length=100)
    # Add expiry_date. Allow it to be null if some items might not have one.
    expiry_date = models.DateField(null=True, blank=True, db_index=True) # Add expiry date

    date = models.DateField(db_index=True) # Date for which the quantity applies
    quantity = models.PositiveIntegerField(default=0) # The quantity entered/used for that day
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        # Update uniqueness constraint to include expiry_date
        unique_together = [['chemical_name', 'brand_name', 'dose_volume', 'expiry_date', 'date']]
        verbose_name = "Daily Quantity"
        verbose_name_plural = "Daily Quantities"
        ordering = ['date', 'chemical_name', 'brand_name', 'expiry_date'] # Add expiry to ordering

    def __str__(self):
        expiry_str = f" (Exp: {self.expiry_date})" if self.expiry_date else ""
        return f"{self.chemical_name} ({self.brand_name} - {self.dose_volume}{expiry_str}) on {self.date}: {self.quantity}"