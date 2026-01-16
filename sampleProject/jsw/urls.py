# urls.py corrected

from . import views
from django.urls import path
# from .views import get_categories, get_reviews, add_review # Already imported via views
from django.conf.urls.static import static
from django.conf import settings # Import settings

urlpatterns = [
    # Authentication & Member Management
    path('login', views.login, name='login'),
    path('forgot_password/', views.forgot_password, name='forgot_password'),
    path('verify_otp/', views.verify_otp, name='verify_otp'),
    path('reset_password/', views.reset_password, name='reset_password'),
    path('find_member_by_aadhar/', views.find_member_by_aadhar, name='find_member_by_aadhar'),
    path('members/add/', views.add_member, name='member-add'),
    path('members/list/', views.list_members, name='member-list'),
    path('members/update/<int:member_id>/', views.update_member, name='update_member'),
    path('members/delete/<int:member_id>/', views.delete_member, name='delete_member'),
    path('addUsers/', views.create_default_members, name='addusers'),

    # Core Data Fetching / Entry (Using Aadhar)
    path('userData', views.fetchdata, name = 'userData'),
    path('get_worker_by_aadhar/', views.get_worker_by_aadhar, name='get_worker_by_aadhar'),
    path('userDataWithID', views.fetchdatawithID, name = 'userDataWithID'),
    path('adminData', views.fetchadmindata, name = 'adminData'),
    path('addEntries', views.addEntries, name='add_Entries'),
    path('addbasicdetails', views.add_basic_details, name = 'addDetails'),
    path('updateProfileImage/<str:aadhar>', views.uploadImage, name='upload_image'),
    path('visitData/<str:aadhar>', views.fetchVisitdata, name = 'fetchVisitdata'),
    path('visitDataWithMrd/<str:mrdNo>', views.fetchVisitDataWithDate, name = 'fetchVisitdataWithDate'),
    path('update_employee_status/', views.update_employee_status, name='update_employee_status'),
    path('updateEmployeeData', views.update_employee_data, name='update_employee_data'),

    # Vitals & Investigations (Using Aadhar from payload)  
    path('addvitals', views.add_vital_details, name = 'addVitals'),
    path('deleteUploadedFile', views.delete_uploaded_file, name = 'deleteUploadedFile'),
    path('get_worker_documents/', views.get_worker_documents, name = 'get_worker_documents/'),
    path("addInvestigation", views.add_haem_report, name="addInvestigation"),
    path("addRoutineSugarTest", views.add_routine_sugar, name="addRoutineSugarTest"),
    # Correction: Point to the corrected view name
    path("addRenalFunctionTest", views.add_renal_function, name="addRenalFunctionTest"),
    path("addLipidProfile", views.add_lipid_profile, name="addLipidProfile"),
    path("addLiverFunctionTest", views.add_liver_function, name="addLiverFunctionTest"),
    path("addThyroidFunctionTest", views.add_thyroid_function, name="addThyroidFunctionTest"),
    path("addAutoimmuneFunctionTest", views.add_autoimmune_function, name="addAutoimmuneFunctionTest"),
    path("addCoagulationTest", views.add_coagulation_function, name="addCoagulationTest"),
    path("addEnzymesAndCardiacProfile", views.add_enzymes_cardiac, name="addEnzymesAndCardiacProfile"),
    path("addUrineRoutine", views.add_urine_routine, name="addUrineRoutine"),
    path("addSerology", views.add_serology, name="addSerology"),
    path("addMotion", views.add_motion_test, name="addMotion"),
    
    path("addCultureSensitivityTest", views.add_culturalsensitivity_function, name="addCultureSensitivityTest"), # Corrected spelling of view function

    # Other Medical Data (Using Aadhar from payload)
    path("medical-history/", views.create_medical_history, name="create_medical_history"),
    path("addMensPack", views.add_mens_pack, name="addMensPack"),
    path("addWomensPack", views.add_womens_function, name="addWomensPack"),
    path("addOccupationalprofile", views.add_occupationalprofile_function, name="addOccupationalprofile"), # Corrected name to match view
    path("addOtherstest", views.add_otherstest_function, name="addOtherstest"),
    # Correction: Point to the corrected view name
    path("addOpthalmicReport", views.add_ophthalmic_report, name="addOphthalmicReport"), # Corrected view name and path spelling consistency
    path("addUSG", views.add_usg_report, name="addUSG"),
    path("addMRI", views.add_mri_report, name="addMRI"),
    path("addXRay", views.add_xray_function, name="addXRay"),
    path("addCT", views.add_ct_function, name="addCT"),

    path("vaccination/", views.insert_vaccination, name="insert_vaccination"),
    path("getvaccinations/<str:aadhar>", views.fetch_vaccinations, name="get_vaccination"),
    path("fitness-tests/", views.fitness_test, name="fitness_test"),
    path('medical-certificate/submit/', views.add_or_update_medical_certificate, name='add-medical-certificate'),
    #path('personal-leave-certificate/add/', views.add_personal_leave_certificate, name='add-personal-leave-certificate'),
    path('medical-certificate/get/', views.get_medical_certificate_data, name='get_medical_certificate_data'),
    path('add_alcohol_form_data/', views.add_alcohol_form_data, name='add_alcohol_form_data'),             ################################################################
    path('consultations/add/', views.add_consultation, name='add_consultation'),
    path('get_alcohol_form_data/', views.get_alcohol_form_data, name='get_alcohol_form_data'),
    path('personal-leave/get/', views.get_personal_leave_data, name='get_personal_leave_data'),
    path('personal-leave/save/', views.save_personal_leave_data, name='save_personal_leave_data'),



    path('significant_notes/add/', views.add_significant_notes, name='add_significant_note'),
    path('get_notes/<str:aadhar>', views.get_notes, name='get_notes_by_aadhar'),
    path('get_notes/', views.get_notes_all, name='get_notes_all'),
    path('get_filtered_data', views.get_filtered_data, name='get_filtered_data'),

    # Forms (Using Aadhar from payload)
    path('form17/', views.create_form17, name='create_form17'),
    path('form38/', views.create_form38, name='create_form38'),
    path('form39/', views.create_form39, name='create_form39'),
    path('form40/', views.create_form40, name='create_form40'),
    path('form27/', views.create_form27, name='create_form27'),

    # Appointments (Using AadharNo / ID)
    path('bookAppointment/', views.BookAppointment, name='book_appointment'),
    path('uploadAppointment/', views.uploadAppointment, name='uploadAppointment'),
    path('appointments/', views.get_appointments, name='get_appointments'),
    path('currentfootfalls/', views.get_currentfootfalls, name='get_currentfootfalls'),
    path('pendingfootfalls/', views.get_pendingfootfalls, name='get_pendingfootfalls'),
    path('update-status/', views.update_status, name='update_appointment_status'),

    # Prescriptions (Using Aadhar / ID)
    path('prescriptions/add/', views.add_prescription, name='add_prescription'),
    path('prescriptions/view/', views.view_prescriptions, name='view_prescriptions'),
    path('api/prescription-in-data/', views.get_prescription_in_data, name='get_prescription_in_data'),
    path('api/update-daily-quantities/', views.update_daily_quantities, name='update_daily_quantities'),

       # Pharmacy / Inventory / Calibration
    path("add-stock/", views.add_stock, name="add-stock"),
    path('current_stock/', views.get_current_stock, name='current_stock'),
    path('stock_history/', views.get_stock_history, name='stock_history'),
    path('current_expiry/', views.get_current_expiry, name='current_expiry'),
    path('remove_expiry/', views.remove_expired_medicine, name='remove_expiry'),
    path("expiry_register/", views.get_expiry_register, name="expiry_register"),
    path("get-expiry-dates/", views.get_expiry_dates, name="expiry_date"),
    path("get-quantity-suggestions/", views.get_quantity_suggestions, name="quantity_suggestions"),
    path("get-brand-names/", views.get_brand_names, name="get_brand_names"),
    path("get_chemical_name/", views.get_chemical_name, name="get_chemical_name"),
    path("discarded_medicines/", views.get_discarded_medicines, name="discarded_medicines"),
    path("add_discarded_medicine/", views.add_discarded_medicine, name="add_discarded_medicine"),
    path("get_ward_consumable/", views.get_ward_consumables, name="get_ward_consumable"),
    path("add_ward_consumable/", views.add_ward_consumable, name="add_ward_consumable"),
    path("get_ambulance_consumable/", views.get_ambulance_consumables, name="get_ambulance_consumable"),
    path("add_ambulance_consumable/", views.add_ambulance_consumable, name="add_ambulance_consumable"),
    path("get-dose-volume/", views.get_dose_volume, name="get-dose-volume"),
    path("get-chemical-name-by-brand/", views.get_chemical_name_by_brand, name="get-chemical-name-by-brand"),
    path("get-chemical-name-by-chemical/", views.get_chemical_name_by_chemical, name="get-chemical-name-by-chemical"),
    path("get_calibrations/", views.get_calibrations, name="get_calibrations"),
    path("get_calibration_history/", views.get_calibration_history, name="get_calibration_history"),
    path("complete_calibration/", views.complete_calibration, name="complete_calibration"),
    path("add_instrument/", views.add_instrument, name="add_instrument"),
    path("deleteInstrument", views.deleteInstrument, name="deleteInstrument"),
    path("EditInstrument", views.EditInstrument, name="EditInstrument"),
    path('get_unique_instruments/', views.get_unique_instruments, name='get_unique_instruments'),
    path("archive_stock/", views.archive_zero_quantity_stock, name="archive_stock"),
    path("get_pending_next_month_count/", views.get_pending_next_month_count, name="get_pending_next_month_count"),


    # Mock Drills / Camps / ReviewuserData
    path('save-mockdrills/', views.save_mockdrills, name='save_mockdrills'),
    path('get-mockdrills/', views.get_mockdrills, name='get_mockdrills'),
    path('get-one-mockdrills/', views.get_one_mockdrills, name='get_mockdrills'),
    path('add-camp/', views.add_camp, name='add_camp'),
    path('get-camps/', views.get_camps, name='get_camps'),
    path('upload-files/', views.upload_files, name='upload_files'),
    path('download-file/', views.download_file, name='download_file'),
    path('delete-file/', views.delete_file, name='delete_file'),
    path("categories/", views.get_categories, name="get_categories"),
    path("reviews/<str:status>/", views.get_reviews, name="get_reviews"),
    path("add-review/", views.add_review, name="add_review"),

    # Dashboard Stats / General Fetch
    path('dashboard/', views.dashboard_stats, name='dashboard'),
    path('visitData/', views.fetchVisitdataAll, name = 'fetchVisitdataAll'),
    path('fitnessData/', views.fetchFitnessData, name = 'fetchFitnessDataAll'),
    path('get_current_expiry_count/', views.get_current_expiry_count, name='get_current_expiry_count'),
    path('get_red_status_count/', views.get_red_status_count, name='get_red_status_count'),
    path('hrupload/<str:data_type>', views.hrupload, name='hrupload'),
    path('medicalupload', views.MedicalDataUploadView.as_view(), name='medical_upload'),
    path('get_investigation_details/<str:aadhar>', views.get_investigation_details, name = 'get_investigations-details'),
    path('update-pharmacy-stock/', views.update_pharmacy_stock, name='update_pharmacy_stock'),
    path('get-chemical-names/',  views.get_chemical_name_suggestions,  name='get-chemical-name-suggestions'),
]

# Add static files serving during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)



    