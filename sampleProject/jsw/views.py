import bcrypt
import json
import logging
import traceback
import random
import base64
import uuid
import os
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta # Added: For date calculations


# Django Core Imports
from django.forms import BooleanField, CharField, DateField, DateTimeField, FloatField, IntegerField, JSONField
from django.http import JsonResponse, HttpResponse, Http404, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError, ObjectDoesNotExist, FieldError # Added: FieldError
from django.forms.models import model_to_dict
from django.utils import timezone
from django.utils.timezone import make_aware, now
from django.utils.dateparse import parse_date as django_parse_date
from django.db.models import Max, Count, Sum, Q
from django.db import transaction, IntegrityError
from django.db.models.fields.files import ImageFieldFile, FieldFile
from django.core.files.storage import default_storage
from .models import employee_details   # <-- use your actual model


# Django Auth Imports
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
# Removed: from matplotlib.offsetbox import TextArea # Unused and out of place

# App specific models
from .models import (
    AmbulanceConsumables, AutoimmuneTest, CTReport, CultureSensitivityTest, Member, Dashboard, FitnessAssessment, OccupationalProfile, OthersTest, Prescription, Appointment,
    DiscardedMedicine, InstrumentCalibration, PharmacyMedicine,
    PharmacyStockHistory, WardConsumables, WomensPack, XRay, mockdrills, # Removed: user (unused)
    ReviewCategory, Review, eventsandcamps, VaccinationRecord,
    PharmacyStock, ExpiryRegister, employee_details, MedicalHistory,
    vitals, heamatalogy, RoutineSugarTests, RenalFunctionTest, LipidProfile,
    LiverFunctionTest, ThyroidFunctionTest, CoagulationTest, EnzymesCardiacProfile,
    UrineRoutineTest, SerologyTest, MotionTest, MensPack, OphthalmicReport,
    USGReport, MRIReport, Consultation, SignificantNotes, Form17, Form38,
    Form39, Form40, Form27, DailyQuantity
)

# Configure logging (ensure this is set up in settings.py ideally)
logger = logging.getLogger(__name__)

# --- Helper Functions ---

def parse_date_internal(date_str):
    """ Safely parse YYYY-MM-DD date strings """
    if not date_str: return None
    try: return datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date() # Added strip and str conversion
    except (ValueError, TypeError): return None

def parse_form_date(date_str): # Specific helper for forms if needed
    return parse_date_internal(date_str)

def parse_form_age(age_str):
    try: return int(age_str) if age_str and str(age_str).isdigit() else None # Added str conversion
    except (ValueError, TypeError): return None

def get_media_url_prefix(request):
    media_url = getattr(settings, 'MEDIA_URL', '/media/')
    if media_url.startswith('http'): return media_url
    else: return f"{request.scheme}://{request.get_host()}{media_url}"

def serialize_model_instance(instance):
    """ Converts model instance to dict, handles files/dates. """
    if instance is None: return {}
    try:
        data = model_to_dict(instance)
        for field_name, value in list(data.items()):
            if isinstance(value, FieldFile):
                try: data[field_name] = value.url if value and hasattr(value, 'url') else None
                except Exception: data[field_name] = None
            elif isinstance(value, (datetime, date)):
                data[field_name] = value.isoformat()
            # Removed internal field check, model_to_dict usually handles this
        return data
    except Exception as e:
        logger.error(f"Error serializing instance {getattr(instance, 'pk', 'N/A')}: {e}")
        return {} # Return empty dict on error


ALLOWED_FILE_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'pptx', 'ppt', 'mp4', 'mov', 'avi']

# --- Authentication & Member Management ---

def send_otp_via_email(email, otp):
    subject = "🔐 Password Reset OTP - JSW Health Portal"
    from_email = settings.EMAIL_HOST_USER
    recipient_list = [email]
    context = {"otp": otp, "email": email}
    try:
        # Ensure template exists or provide fallback text content
        html_content = render_to_string("otp_email_template.html", context)
        text_content = f"Your OTP for JSW Health Portal password reset is {otp}. This code is valid for 5 minutes."
        msg = EmailMultiAlternatives(subject, text_content, from_email, recipient_list)
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        logger.info(f"OTP {otp} sent successfully to {email}.")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP to {email}. Error: {str(e)}", exc_info=True)
        return False

@csrf_exempt
def forgot_password(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            if not username: return JsonResponse({"message": "Username (Employee Number) is required"}, status=400)
            member = Member.objects.get(emp_no=username)
            mail_id = member.mail_id_Personal
            if not mail_id: return JsonResponse({"message": "No email address found for this user."}, status=400)
            otp = random.randint(100000, 999999)
            cache_key = f"otp_{username}"
            cache.set(cache_key, otp, timeout=300) # 5 minutes timeout
            if send_otp_via_email(mail_id, otp):
                return JsonResponse({"message": "OTP sent successfully to your registered email."}, status=200)
            else:
                cache.delete(cache_key) # Clean up cache if email failed
                return JsonResponse({"message": "Failed to send OTP."}, status=500)
        except Member.DoesNotExist: return JsonResponse({"message": "User not found"}, status=404)
        except json.JSONDecodeError: return JsonResponse({"message": "Invalid request format."}, status=400)
        except Exception as e: logger.exception("Error in forgot_password."); return JsonResponse({"message": "Unexpected error occurred."}, status=500)
    return JsonResponse({"message": "Invalid request method. Use POST."}, status=405)

@csrf_exempt
def verify_otp(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            otp_entered = data.get("otp")
            if not username or not otp_entered: return JsonResponse({"message": "Username and OTP required"}, status=400)
            cache_key = f"otp_{username}"
            stored_otp = cache.get(cache_key)
            if stored_otp and str(stored_otp) == str(otp_entered):
                cache.delete(cache_key) # Consume OTP
                cache.set(f"otp_verified_{username}", True, timeout=600) # 10 min validity for reset
                return JsonResponse({"message": "OTP verified successfully"}, status=200)
            else: return JsonResponse({"message": "Invalid or expired OTP"}, status=400)
        except json.JSONDecodeError: return JsonResponse({"message": "Invalid request format."}, status=400)
        except Exception as e: logger.exception("Error in verify_otp."); return JsonResponse({"message": "Unexpected error occurred."}, status=500)
    return JsonResponse({"message": "Invalid request method. Use POST."}, status=405)

@csrf_exempt
def reset_password(request):
    if request.method == "POST":
        username = None # Initialize for logging in case of error before assignment
        try:
            data = json.loads(request.body)
            username = data.get("username")
            new_password = data.get("newPassword")
            if not username or not new_password: return JsonResponse({"message": "Username and new password required"}, status=400)

            # Check verification status first
            verified_key = f"otp_verified_{username}"
            if not cache.get(verified_key): return JsonResponse({"message": "OTP not verified or verification expired."}, status=403)

            member = Member.objects.get(emp_no=username)
            # Hash the new password
            hashed_pw = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            member.password = hashed_pw
            member.save(update_fields=['password'])
            cache.delete(verified_key) # Consume verification status
            return JsonResponse({"message": "Password reset successful"}, status=200)
        except Member.DoesNotExist: return JsonResponse({"message": "User not found"}, status=404)
        except json.JSONDecodeError: return JsonResponse({"message": "Invalid request format."}, status=400)
        except Exception as e:
            logger.exception("Error in reset_password.")
            if username: cache.delete(f"otp_verified_{username}") # Clean up cache on error
            return JsonResponse({"message": "Unexpected error occurred."}, status=500)
    return JsonResponse({"message": "Invalid request method. Use POST."}, status=405)

@csrf_exempt
def login(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get('username') # Expects employee_number
            password = data.get('password')
            if not username or not password: return JsonResponse({"message": "Username and password required."}, status=400)
            # Use Django's authenticate or custom logic
            try:
                member = Member.objects.get(emp_no=username)
                
                if bcrypt.checkpw(password.encode('utf-8'), member.password.encode('utf-8')):
                     # Login successful
                    return JsonResponse({
                        "username": member.name,
                        "accessLevel": member.role, 
                        "empNo": member.emp_no,
                        "message": "Login successful!"
                    }, status=200)
                else:
                    # Invalid password
                    return JsonResponse({"message": "Invalid credentials"}, status=401)
            except Member.DoesNotExist:
                 # Invalid username
                 return JsonResponse({"message": "Invalid credentials"}, status=401) # Keep message generic
        except json.JSONDecodeError: return JsonResponse({"message": "Invalid request format"}, status=400)
        except Exception as e: logger.exception("Login failed."); return JsonResponse({"message": "Unexpected error occurred."}, status=500)
    return JsonResponse({"message": "Invalid request method. Use POST."}, status=405)

import bcrypt
from datetime import date
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_date as django_parse_date
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
def create_default_members(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    def safe_date(value):
        if isinstance(value, str) and value.strip():
            return django_parse_date(value)
        return None

    try:
        # Data updated to match the logic of your new Model
        default_members = [
            {
                "mail_id_Office": "2k22cse162@kiot.ac.in",
                "role": "nurse",
                "emp_no": "900001",
                "aadhar": "123456789001",
                "phone_Office": "9000000001",
                "name": "VICKY",
                "designation": "nurse",
                "doj": "2025-11-28",
                "job_nature": "nurse",
                "password": "nurse",
                "date_exited": None,
            },
            {
                "mail_id_Office": "2k22cse163@kiot.ac.in",
                "role": "doctor",
                "emp_no": "900002",
                "aadhar": "123456789003",
                "phone_Office": "9000000002",
                "name": "VIGNESHWARAN",
                "designation": "doctor",
                "doj": "2025-11-28",
                "job_nature": "doctor",
                "password": "doctor",
                "date_exited": None,
            },
            {
                "mail_id_Office": "2k22cse124@kiot.ac.in",
                "role": "admin",
                "emp_no": "900003",
                "aadhar": "123456789002",
                "phone_Office": "9600207797",
                "name": "RAMESH",
                "designation": "admin",
                "doj": "2025-11-28",
                "job_nature": "admin",
                "password": "admin",
                "date_exited": "2025-11-28",
            },
            {
                "mail_id_Office": "2k22cse114@kiot.ac.in",
                "role": "pharmacy",
                "emp_no": "900004",
                "aadhar": "123456789004",
                "phone_Office": "9000000004",
                "name": "PRAMOTH",
                "designation": "pharma",
                "doj": "2025-11-28",
                "job_nature": "pharmacy",
                "password": "pharma",
                "date_exited": None,
            },
            {
                "mail_id_Office": "2k22cse117@kiot.ac.in",
                "role": "doctor",
                "emp_no": "900005",
                "aadhar": "123456789004",
                "phone_Office": "9000000005",
                "name": "PRAVEEN",
                "designation": "pharma",
                "doj": "2025-11-28",
                "job_nature": "doctor",
                "password": "doctor",
                "date_exited": None,
            }
        ]

        created, skipped = 0, 0

        for m in default_members:
            # Check existence using the new field: mail_id_Office
            if Member.objects.filter(mail_id_Office__iexact=m["mail_id_Office"]).exists():
                skipped += 1
                continue

            hashed_pw = bcrypt.hashpw(m["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            # Aligned with your new Member model fields
            Member.objects.create(
                aadhar=m["aadhar"],
                name=m["name"],
                emp_no=m["emp_no"],
                designation=m["designation"],
                mail_id_Office=m["mail_id_Office"],
                mail_id_Personal="", # Optional: can be left blank
                phone_Office=m["phone_Office"],
                phone_Personal="", # Optional: can be left blank
                job_nature=m["job_nature"],
                doj=safe_date(m["doj"]),
                role=m["role"],
                date_exited=safe_date(m["date_exited"]),
                hospital_name=None, # These are OHC staff
                password=hashed_pw
            )

            created += 1

        return JsonResponse({
            "message": "Default members processed successfully",
            "created": created,
            "skipped_already_exists": skipped
        }, status=201 if created > 0 else 200)

    except Exception as e:
        logger.exception("create_default_members failed")
        return JsonResponse({"error": "Internal error", "detail": str(e)}, status=500)


from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Member, employee_details # Ensure correct imports

@csrf_exempt
def find_member_by_aadhar(request):
    if request.method != 'GET':
        return JsonResponse({'error': True, 'message': 'Only GET method is allowed'}, status=405)

    aadhar_param = request.GET.get('aadhar')
    if not aadhar_param:
        return JsonResponse({'error': True, 'message': 'Aadhar number is required'}, status=400)

    try:
        # STEP 1: Search in Member Table (Existing Registered Users)
        member_instance = Member.objects.filter(aadhar=aadhar_param).first()
        if member_instance:
            member_data = {
                'id': member_instance.id, 
                'name': member_instance.name,
                'emp_no': member_instance.emp_no,
                'designation': member_instance.designation,
                'mail_id_Office': member_instance.mail_id_Office,
                'mail_id_Personal': member_instance.mail_id_Personal,
                'phone_Office': member_instance.phone_Office,
                'phone_Personal': member_instance.phone_Personal,
                'job_nature': member_instance.job_nature,
                'doj': member_instance.doj.strftime('%Y-%m-%d') if member_instance.doj else None,
                'date_exited': member_instance.date_exited.strftime('%Y-%m-%d') if member_instance.date_exited else None,
                'role': member_instance.role,
                'hospital_name': member_instance.hospital_name,
                'aadhar': member_instance.aadhar,
                # Note: Ensure your Member model actually has a 'type' field or logic
                'memberTypeDetermined': getattr(member_instance, 'type', 'ohc') 
            }
            return JsonResponse({
                'found': True,
                'mode': 'update',
                'member': member_data,
                'message': 'User found and ready to update.'
            })

        # STEP 2: Search in employee_details (HR Records - Pre-fill for registration)
        employee_record = employee_details.objects.filter(aadhar=aadhar_param).first()
        if employee_record:
            member_data = {
                'id': None, # Indicates NEW registration
                'name': employee_record.name,
                'emp_no': employee_record.emp_no,
                'designation': employee_record.designation,
                'mail_id_Office': employee_record.mail_id_Office,
                'mail_id_Personal': employee_record.mail_id_Personal,
                'phone_Office': employee_record.phone_Office,
                'phone_Personal': employee_record.phone_Personal,
                'role': employee_record.role,
                'job_nature': employee_record.job_nature,
                'doj': employee_record.doj.strftime('%Y-%m-%d') if employee_record.doj else None,
                'aadhar': employee_record.aadhar,
                'memberTypeDetermined': 'ohc' if employee_record.type == "Employee" else 'external',
                'date_exited': None,
                'hospital_name': None,
            }
            return JsonResponse({
                'found': True,
                'mode': 'create',
                'member': member_data,
                'message': 'User not found in members. Pre-filled from HR records. Create new user.'
            })

        # STEP 3: If not found in either table
        return JsonResponse({
            'found': False, 
            'error': True, 
            'message': 'Aadhar not found in Member or HR records. Please check the number.'
        }, status=404)

    except Exception as e:
        return JsonResponse({'error': True, 'message': f'Internal Server Error: {str(e)}'}, status=500)



import json
import bcrypt
import logging
from datetime import date
from django.http import JsonResponse, Http404
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_date as django_parse_date
from django.core.exceptions import ValidationError
from .models import Member # Ensure correct import path

logger = logging.getLogger(__name__)

@csrf_exempt
def add_member(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Only POST allowed'}, status=405)

    try:
        data = json.loads(request.body)
        member_type = data.get('memberTypeDetermined') # 'ohc' or 'external'
        print("Received data for new member:", data)
        # 1. Validation Logic
        if member_type not in ['ohc', 'external']:
            return JsonResponse({'message': 'Invalid memberType'}, status=400)

        # Fields aligned with your new model
        required = ['name', 'designation',  'role','aadhar']
        if member_type == 'ohc':
            required += ['emp_no', 'doj']
        elif member_type == 'external':
            required += ['hospital_name']

        missing = [f for f in required if not data.get(f)]
        if missing:
            print("Missing fields:", missing)
            return JsonResponse({'message': f"Missing fields: {', '.join(missing)}"}, status=400)

        # 2. Uniqueness checks (Using new field names)
        if Member.objects.filter(mail_id_Office__iexact=data['mail_id_Office']).exists() and data['mail_id_Office'].strip() != "":
            return JsonResponse({'message': 'Office Email already exists.'}, status=409)
        
        if Member.objects.filter(aadhar=data['aadhar']).exists():
            return JsonResponse({'message': 'Aadhar number already registered.'}, status=409)

        if member_type == 'ohc' and Member.objects.filter(emp_no=data['emp_no']).exists():
            return JsonResponse({'message': 'Employee number already exists.'}, status=409)

        # 3. Password Hashing
        # If no password provided, default to "role123"
        raw_pw = f"{data['role'].split('_')[0]}123"
        print("Raw password for hashing:", raw_pw)
        hashed_pw = bcrypt.hashpw(raw_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # 4. Build Record
        member_data = {
            'aadhar': data['aadhar'],
            'name': data['name'],
            'emp_no': data.get('emp_no', ''),
            'designation': data['designation'],
            'mail_id_Office': data['mail_id_Office'],
            'mail_id_Personal': data.get('mail_id_Personal', ''),
            'phone_Office': data['phone_Office'],
            'phone_Personal': data.get('phone_Personal', ''),
            'job_nature': data.get('job_nature', ''),
            'doj': django_parse_date(data.get('doj')) if data.get('doj') else None,
            'role': data['role'], # Single value string
            'date_exited': django_parse_date(data.get('date_exited')) if data.get('date_exited') else None,
            'hospital_name': data.get('hospital_name') if member_type == 'external' else None,
            'password': hashed_pw,
            'type': member_type # Assuming your model has this field to distinguish OHC/External
        }

        member = Member.objects.create(**member_data)
        return JsonResponse({'message': 'Member added successfully', 'memberId': member.id}, status=201)

    except Exception as e:
        logger.exception("add_member failed.")
        return JsonResponse({'message': f'Internal error: {str(e)}'}, status=500)

@csrf_exempt
def update_member(request, member_id):
    if request.method != 'POST':
        return JsonResponse({'message': 'Use PUT method'}, status=405)

    try:
        member = get_object_or_404(Member, pk=member_id)
        data = json.loads(request.body)

        # Update Personal & Professional Info
        member.name = data.get('name', member.name)
        member.designation = data.get('designation', member.designation)
        member.role = data.get('role', member.role) # Single value update
        member.job_nature = data.get('job_nature', member.job_nature)
        member.hospital_name = data.get('hospital_name', member.hospital_name)
        member.aadhar = data.get('aadhar', member.aadhar)

        # Update Contact Info
        member.mail_id_Office = data.get('mail_id_Office', member.mail_id_Office)
        member.mail_id_Personal = data.get('mail_id_Personal', member.mail_id_Personal)
        member.phone_Office = data.get('phone_Office', member.phone_Office)
        member.phone_Personal = data.get('phone_Personal', member.phone_Personal)

        # Update Dates
        if data.get('doj'):
            member.doj = django_parse_date(data.get('doj'))
        if 'date_exited' in data: # Allow setting to None/Null
            member.date_exited = django_parse_date(data.get('date_exited')) if data.get('date_exited') else None

        # Handle Password Update (Only if provided)
        if data.get('password') and data['password'].strip() != "":
            member.password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        member.full_clean()
        member.save()
        
        return JsonResponse({'message': 'Member updated successfully'}, status=200)

    except ValidationError as e:
        return JsonResponse({'message': 'Validation Error', 'details': e.message_dict}, status=400)
    except Exception as e:
        logger.exception(f"update_member failed ID: {member_id}")
        return JsonResponse({'message': 'Internal server error'}, status=500)

import logging
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from .models import Member # Ensure correct import

logger = logging.getLogger(__name__)

# --- API: List All Members ---
def list_members(request):
    """
    Returns a list of all members ordered by newest first.
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Only GET allowed'}, status=405)

    try:
        # Fetch all members
        members = Member.objects.all().order_by('-id')
        
        data = []
        for m in members:
            data.append({
                'id': m.id,
                'name': m.name,
                'emp_no': m.emp_no,
                'designation': m.designation,
                'mail_id_Office': m.mail_id_Office,
                'phone_Office': m.phone_Office,
                'role': m.role,
                'aadhar': m.aadhar,
                'type': getattr(m, 'type', 'ohc'), # Falls back to 'ohc' if field missing
                'hospital_name': m.hospital_name,
                'doj': m.doj.strftime('%Y-%m-%d') if m.doj else None,
                'job_nature': m.job_nature,
            })
            
        return JsonResponse(data, safe=False)

    except Exception as e:
        logger.error(f"Error listing members: {str(e)}")
        return JsonResponse({'error': 'Internal Server Error'}, status=500)


# --- API: Delete Member ---
@csrf_exempt
def delete_member(request, member_id):
    """
    Deletes a member record by ID.
    Implemented as POST for compatibility with your previous code pattern.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed. Use POST.'}, status=405)

    try:
        member = get_object_or_404(Member, id=member_id)
        member_name = member.name # Store for logging
        member.delete()
        
        logger.info(f"Member Deleted: {member_name} (ID: {member_id})")
        return JsonResponse({
            'success': True, 
            'message': f'Member {member_name} has been deleted successfully.'
        })

    except Exception as e:
        logger.error(f"Error deleting member {member_id}: {str(e)}")
        return JsonResponse({
            'success': False, 
            'message': 'Failed to delete member due to a server error.'
        }, status=500)


@csrf_exempt
def fetchdatawithID(request):
    if request.method == "POST":
        try:
            # 1. Parse the Request Body
            try:
                body_data = json.loads(request.body)
                target_aadhar = body_data.get('aadhar')
            except json.JSONDecodeError:
                return JsonResponse({"error": "Invalid JSON body"}, status=400)

            if not target_aadhar:
                return JsonResponse({"error": "Aadhar number is required"}, status=400)

            # 2. Fetch the specific Employee (Latest record)
            # We order by -id to get the most recently added details for this Aadhar
            employee = employee_details.objects.filter(aadhar=target_aadhar).values().order_by('-id').first()

            if not employee:
                # Return empty list if user not found (matches frontend logic)
                return JsonResponse({"data": []}, status=200)

            # Handle Profile Pic URL
            media_url_prefix = get_media_url_prefix(request)
            if employee.get("profilepic"):
                employee["profilepic_url"] = f"{media_url_prefix}{employee['profilepic']}"
            else:
                employee["profilepic_url"] = None

            # 3. Helper function to fetch single latest record or generate defaults
            def get_single_latest_record(model, aadhar):
                """
                Fetches the latest record for a specific Aadhar.
                If no record exists, returns a dictionary with default values.
                """
                record = None
                
                # Determine ordering field (entry_date, date, or id)
                sort_field = '-id' # Default fallback
                if hasattr(model, 'entry_date'):
                    sort_field = '-entry_date'
                elif hasattr(model, 'date'):
                    sort_field = '-date'
                
                # Query the model
                # We filter by aadhar and take the first one based on sort order
                record = model.objects.filter(aadhar=aadhar).values().order_by(sort_field, '-id').first()

                if record:
                    return record
                
                # --- GENERATE DEFAULT STRUCTURE IF NO DATA FOUND ---
                # This ensures the frontend receives { "diabetes": false } instead of undefined
                default_data = {}
                if model and hasattr(model, '_meta'):
                    try:
                        for field in model._meta.get_fields():
                            if field.concrete and not field.is_relation and not field.primary_key:
                                default_val = None
                                if isinstance(field, CharField): 
                                    default_val = ""
                                elif isinstance(field, BooleanField): 
                                    default_val = False
                                elif isinstance(field, JSONField):
                                    # Specific defaults for known JSON fields
                                    if field.name in ["normal_doses", "booster_doses"]: 
                                        default_val = {"dates": [], "dose_names": []}
                                    elif field.name == "surgical_history": 
                                        default_val = {"comments":"", "children": []}
                                    elif field.name == "vaccination": 
                                        default_val = {"vaccination": []}
                                    elif field.name in ["job_nature", "conditional_fit_feilds"]: 
                                        default_val = []
                                    else: 
                                        default_val = {}
                                default_data[field.name] = default_val
                    except Exception as e:
                        logger.error(f"Error creating default structure for {model.__name__}: {e}")
                
                return default_data

            # 4. List of models to fetch
            models_to_fetch = [
                 Dashboard, vitals, MedicalHistory, heamatalogy, RoutineSugarTests,
                 RenalFunctionTest, LipidProfile, LiverFunctionTest, ThyroidFunctionTest,
                 AutoimmuneTest, CoagulationTest, EnzymesCardiacProfile, UrineRoutineTest,
                 SerologyTest, MotionTest, CultureSensitivityTest, MensPack, WomensPack,
                 OccupationalProfile, OthersTest, OphthalmicReport, XRay, USGReport,
                 CTReport, MRIReport, FitnessAssessment, VaccinationRecord, Consultation,
                 Prescription, SignificantNotes, Form17, Form38, Form39, Form40, Form27
            ]

            # 5. Loop through models and attach data to the employee object
            for model_cls in models_to_fetch:
                # Determine key name (matching frontend expectations)
                model_name_lower = model_cls.__name__.lower()
                
                if model_cls == RenalFunctionTest: 
                     key_name = "renalfunctiontests_and_electrolytes"
                elif model_cls == XRay:
                     key_name = "xray"
                elif model_cls == MotionTest:
                     key_name = "motiontest"
                elif model_cls == CultureSensitivityTest:
                     key_name = "culturesensitivitytest"
                elif model_cls == USGReport:
                     key_name = "usgreport" 
                elif model_cls == CTReport:
                     key_name = "ctreport" 
                elif model_cls == MRIReport:
                     key_name = "mrireport" 
                else: 
                     key_name = model_name_lower

                # Fetch data
                data_record = get_single_latest_record(model_cls, target_aadhar)
                
                # Date Serialization helper
                # Convert python datetime/date objects to strings for JSON
                if isinstance(data_record, dict):
                    for k, v in data_record.items():
                        if isinstance(v, (datetime, date)):
                            data_record[k] = v.isoformat()

                # Attach to employee dict
                employee[key_name] = data_record

            # 6. Return response
            # Frontend expects { data: [Object] }
            return JsonResponse({"data": [employee]}, status=200)

        except Exception as e:
            logger.exception("Error in fetchdatawithID view")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)

    logger.warning("fetchdatawithID failed: Invalid request method.")
    return JsonResponse({"error": "Invalid request method"}, status=405)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Max, CharField, BooleanField
from django.db.models.fields.json import JSONField
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)


@csrf_exempt
def fetchdata(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method"}, status=405)

    try:
        # ---------- STEP 1: FETCH LATEST EMPLOYEES ----------
        latest_employees = (
            employee_details.objects
            .values("aadhar")
            .annotate(latest_id=Max("id"))
        )

        latest_employee_ids = [emp["latest_id"] for emp in latest_employees if emp.get("latest_id")]

        employees = list(
            employee_details.objects
            .filter(id__in=latest_employee_ids)
            .values()
        )

        if not employees:
            return JsonResponse({"data": []}, status=200)

        # ---------- STEP 2: MEDIA URL ----------
        try:
            media_url_prefix = get_media_url_prefix(request)
        except Exception as e:
            media_url_prefix = ""
            logger.error(f"Media URL error: {e}")

        for emp in employees:
            emp["profilepic_url"] = (
                f"{media_url_prefix}{emp['profilepic']}"
                if emp.get("profilepic")
                else None
            )

        # ---------- STEP 3: HELPER ----------
        def get_latest_records(model):
            debug = {
                "model": model.__name__,
                "stage": "start"
            }

            try:
                model_fields = [f.name for f in model._meta.fields]

                if "aadhar" not in model_fields:
                    return {}, {}

                employee_keys = [emp["aadhar"] for emp in employees if emp.get("aadhar")]
                if not employee_keys:
                    return {}, {}

                pk_name = model._meta.pk.name

                latest_ids = (
                    model.objects
                    .filter(aadhar__in=employee_keys)
                    .values("aadhar")
                    .annotate(latest_id=Max(pk_name))
                )

                ids = [row["latest_id"] for row in latest_ids if row.get("latest_id")]
                records = list(model.objects.filter(**{f"{pk_name}__in": ids}).values())

                # ---------- DEFAULT STRUCTURE ----------
                default_structure = {}
                for field in model._meta.fields:
                    if field.primary_key or field.is_relation:
                        continue

                    if isinstance(field, CharField):
                        default_structure[field.name] = ""
                    elif isinstance(field, BooleanField):
                        default_structure[field.name] = False
                    elif isinstance(field, JSONField):
                        default_structure[field.name] = {}
                    else:
                        default_structure[field.name] = None

                return (
                    {rec["aadhar"]: rec for rec in records if "aadhar" in rec},
                    default_structure
                )

            except Exception as e:
                return (
                    {},
                    {
                        "__error__": True,
                        "model": model.__name__,
                        "exception": type(e).__name__,
                        "message": str(e),
                        "debug_stage": debug["stage"]
                    }
                )

        # ---------- STEP 4: MODELS ----------
        models_to_fetch = [
            Dashboard, vitals, MedicalHistory, heamatalogy, RoutineSugarTests,
            RenalFunctionTest, LipidProfile, LiverFunctionTest, ThyroidFunctionTest,
            AutoimmuneTest, CoagulationTest, EnzymesCardiacProfile, UrineRoutineTest,
            SerologyTest, MotionTest, CultureSensitivityTest, MensPack, WomensPack,
            OccupationalProfile, OthersTest, OphthalmicReport, XRay, USGReport,
            CTReport, MRIReport, FitnessAssessment, VaccinationRecord, Consultation,
            Prescription, SignificantNotes, Form17, Form38, Form39, Form40, Form27
        ]

        fetched_data = {}
        default_structures = {}

        for model_cls in models_to_fetch:
            key = model_cls.__name__.lower()
            fetched_data[key], default_structures[key] = get_latest_records(model_cls)

        # ---------- STEP 5: MERGE ----------
        merged_data = []

        for emp in employees:
            merged = emp.copy()
            aadhar = emp.get("aadhar")

            for key in fetched_data:
                value = fetched_data[key].get(aadhar, default_structures.get(key, {}))

                if isinstance(value, dict):
                    for k, v in value.items():
                        if isinstance(v, (datetime, date)):
                            value[k] = v.isoformat()

                merged[key] = value

            merged_data.append(merged)

        return JsonResponse({"data": merged_data}, status=200)

    except Exception as e:
        # ---------- FINAL FAIL-SAFE ----------
        return JsonResponse({
            "error": "Internal Server Error",
            "exception": type(e).__name__,
            "message": str(e),
            "hint": "Share this response with backend team"
        }, status=500)




import json
import logging
from datetime import datetime, date
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db.models import Max, CharField, BooleanField, JSONField

# Import your models here
from .models import (
    employee_details, Dashboard, vitals, MedicalHistory, heamatalogy, RoutineSugarTests,
    RenalFunctionTest, LipidProfile, LiverFunctionTest, ThyroidFunctionTest,
    AutoimmuneTest, CoagulationTest, EnzymesCardiacProfile, UrineRoutineTest,
    SerologyTest, MotionTest, CultureSensitivityTest, MensPack, WomensPack,
    OccupationalProfile, OthersTest, OphthalmicReport, XRay, USGReport,
    CTReport, MRIReport, FitnessAssessment, VaccinationRecord, Consultation,
    Prescription, SignificantNotes, Form17, Form38, Form39, Form40, Form27
)

# Setup Logger
logger = logging.getLogger(__name__)

def get_media_url_prefix(request):
    """Helper to construct the base media URL."""
    scheme = request.scheme
    host = request.get_host()
    return f"{scheme}://{host}/media/"


# Corrected addEntries view

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction, IntegrityError
from django.db.models import Max
from .models import employee_details, Dashboard
#from .views_helpers import parse_date_internal # Assuming views_helpers.py or adjust import
import json
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)

import json
import logging
import base64
import uuid
import re
from datetime import date, datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db.models import Max
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

# Import your models
from .models import employee_details, Dashboard 

# Setup Logger
logger = logging.getLogger(__name__)

# Helper to safely parse dates (assuming this exists in your project, otherwise use this)
def parse_date_internal(date_str):
    if not date_str: return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None

@csrf_exempt
def addEntries(request):
    """
    Adds a new employee_details record and Dashboard record for a visit today.
    Handles MRD number generation, dynamic data mapping, and Profile Picture saving/copying.
    """
    if request.method != "POST":
        logger.warning("addEntries failed: Invalid request method. Only POST allowed.")
        return JsonResponse({"error": "Invalid request method"}, status=405)

    aadhar = None 
    try:
        data = json.loads(request.body.decode('utf-8'))
        # logger.debug(f"Received data for addEntries: {json.dumps(data)[:500]}...") 

        employee_data = data.get('formData', {})
        dashboard_data = data.get('formDataDashboard', {})
        extra_data = data.get('extraData', {})

        aadhar = employee_data.get('aadhar')
        if not aadhar:
            logger.warning("addEntries failed: Aadhar number (aadhar) is required in formData.")
            return JsonResponse({"error": "Aadhar number (aadhar) is required"}, status=400)

        entry_date = date.today()

        # --- MRD Number Logic ---
        determined_mrd_no = None 
        with transaction.atomic():
            today_entries = employee_details.objects.filter(
                entry_date=entry_date
            ).select_for_update().order_by('-mrdNo')

            highest_mrd_today = today_entries.first()
            if highest_mrd_today and highest_mrd_today.mrdNo and len(highest_mrd_today.mrdNo) >= 6:
                 try:
                      current_sequence = int(highest_mrd_today.mrdNo[:6])
                      next_sequence = current_sequence + 1
                 except (ValueError, TypeError):
                      logger.warning(f"Could not parse sequence from MRD '{highest_mrd_today.mrdNo}'. Starting sequence at 1.")
                      next_sequence = 1
            else:
                next_sequence = 1
            
            seq_part = f"{next_sequence:06d}"
            date_part = entry_date.strftime('%d%m%Y')
            determined_mrd_no = f"{seq_part}{date_part}"
        
        logger.info(f"Generated new MRD number {determined_mrd_no} for aadhar: {aadhar}")

        # --- Prepare data for employee_details ---
        employee_defaults = {
            'name': employee_data.get('name', ''),
            'dob': parse_date_internal(employee_data.get('dob')),
            'sex': employee_data.get('sex', ''),
            'guardian': employee_data.get('guardian', ''),
            'bloodgrp': employee_data.get('bloodgrp', ''),
            'identification_marks1': employee_data.get('identification_marks1', ''),
            'identification_marks2': employee_data.get('identification_marks2', ''),
            'marital_status': employee_data.get('marital_status', ''),
            'emp_no': employee_data.get('emp_no', ''),
            'employer': employee_data.get('employer', ''),
            'designation': employee_data.get('designation', ''),
            'department': employee_data.get('department', ''),
            'division': employee_data.get('division', ''),
            'workarea': employee_data.get('workarea', ''),
            'job_nature': employee_data.get('job_nature', ''),
            'doj': parse_date_internal(employee_data.get('doj')),
            'moj': employee_data.get('moj', ''),
            'contractor_status': employee_data.get('contractor_status', ''),
            'phone_Personal': employee_data.get('phone_Personal', ''),
            'mail_id_Personal': employee_data.get('mail_id_Personal', ''),
            'emergency_contact_person': employee_data.get('emergency_contact_person', ''),
            'location': employee_data.get('location', ''),
            'phone_Office': employee_data.get('phone_Office', ''),
            'mail_id_Office': employee_data.get('mail_id_Office', ''),
            'emergency_contact_relation': employee_data.get('emergency_contact_relation', ''),
            'mail_id_Emergency_Contact_Person': employee_data.get('mail_id_Emergency_Contact_Person', ''),
            'emergency_contact_phone': employee_data.get('emergency_contact_phone', ''),
            'permanent_address': employee_data.get('permanent_address', ''),
            'permanent_area': employee_data.get('permanent_area', ''),
            'permanent_state': employee_data.get('permanent_state', ''),
            'nationality': employee_data.get('nationality', ''),
            'docName': employee_data.get('docName', ''),
            'permanent_country': employee_data.get('permanent_country', ''),
            'residential_address': employee_data.get('residential_address', ''),
            'residential_area': employee_data.get('residential_area', ''),
            'residential_state': employee_data.get('residential_state', ''),
            'residential_country': employee_data.get('residential_country', ''),
            'country_id': employee_data.get('country_id', ''),
            'role': employee_data.get('role', ''),
            'other_site_id': employee_data.get('other_site_id', ''),
            'organization': employee_data.get('organization', ''),
            'addressOrganization': employee_data.get('addressOrganization', ''),
            'visiting_department': employee_data.get('visiting_department', ''),
            'visiting_date_from': parse_date_internal(employee_data.get('visiting_date_from')),
            'visiting_date_to': parse_date_internal(employee_data.get('visiting_date_to')),
            'stay_in_guest_house': employee_data.get('stay_in_guest_house', ''),
            'visiting_purpose': employee_data.get('visiting_purpose', ''),
            'type': employee_data.get('type', ''),
            'type_of_visit': dashboard_data.get('typeofVisit', ''),
            'register': dashboard_data.get('register', ''),
            'purpose': dashboard_data.get('purpose', ''),
            'year': extra_data.get('year', ''),
            'batch': extra_data.get('batch', ''),
            'hospitalName': extra_data.get('hospitalName', ''),
            'campName': extra_data.get('campName', ''),
            'contractName': extra_data.get('contractName', ''),
            'prevcontractName': extra_data.get('prevcontractName', ''),
            'old_emp_no': extra_data.get('old_emp_no', ''),
            'otherRegister': extra_data.get('otherRegister', ''),
            'mrdNo': determined_mrd_no,
        }
        
        # Handle conditional logic from 'extraData'
        register_type = dashboard_data.get('register', '')
        if "BP Sugar Check" in register_type:
            employee_defaults['status'] = extra_data.get('status', '')
        elif "BP Sugar Chart" in register_type:
            employee_defaults['bp_sugar_chart_reason'] = extra_data.get('reason', '')
        elif "Follow Up Visits" in register_type:
            employee_defaults['followup_reason'] = extra_data.get('purpose', '')
            if extra_data.get('purpose', '').endswith("Others"):
                employee_defaults['followup_other_reason'] = extra_data.get('purpose_others', '')
        
        # Remove keys with None values
        employee_defaults_filtered = {k: v for k, v in employee_defaults.items() if v is not None}

        with transaction.atomic():
            # 1. Create the new Record
            employee_entry = employee_details.objects.create(
                aadhar=aadhar,
                entry_date=entry_date,
                **employee_defaults_filtered
            )

            # 2. IMAGE LOGIC: Handle Profile Picture
            profile_image_b64 = employee_data.get('profilepic') 
            
            # Case A: New Image Uploaded via Webcam or File
            if profile_image_b64 and isinstance(profile_image_b64, str) and ';base64,' in profile_image_b64:
                try:
                    header, encoded = profile_image_b64.split(';base64,', 1)
                    file_ext_match = re.search(r'data:image/(?P<ext>\w+);base64', header)
                    file_ext = file_ext_match.group('ext') if file_ext_match else 'jpg'

                    image_data = base64.b64decode(encoded)
                    filename = f"profilepics/{aadhar}_{uuid.uuid4().hex[:8]}.{file_ext}"

                    employee_entry.profilepic.save(filename, ContentFile(image_data), save=True)
                    logger.info(f"Saved new profile picture for aadhar {aadhar} on entry {employee_entry.id}")
                except Exception as img_err:
                    logger.error(f"Failed to decode/save new profile picture: {img_err}")

            # Case B: No new image, but check if we should carry forward the previous one
            elif not employee_entry.profilepic:
                # Find the most recent record for this user excluding the one we just created
                previous_record = employee_details.objects.filter(aadhar=aadhar).exclude(id=employee_entry.id).order_by('-id').first()
                if previous_record and previous_record.profilepic:
                    # Assign the same file reference
                    employee_entry.profilepic = previous_record.profilepic
                    employee_entry.save()
                    logger.info(f"Carried forward profile picture from record {previous_record.id} to {employee_entry.id}")

            # 3. Create Dashboard Record
            dashboard_defaults = {
                'type': employee_entry.type,
                'type_of_visit': employee_entry.type_of_visit,
                'register': employee_entry.register,
                'purpose': employee_entry.purpose,
                'otherRegister': employee_entry.otherRegister,
                'year': employee_entry.year,
                'batch': employee_entry.batch,
                'hospitalName': employee_entry.hospitalName,
                'campName': employee_entry.campName,
                'contractName': employee_entry.contractName,
                'prevcontractName': employee_entry.prevcontractName,
                'old_emp_no': employee_entry.old_emp_no,
                'mrdNo': employee_entry.mrdNo,
                'emp_no': employee_entry.emp_no,
                'status': employee_entry.status,
                'bp_sugar_chart_reason': employee_entry.bp_sugar_chart_reason,
                'followup_reason': employee_entry.followup_reason,
                'followup_other_reason': employee_entry.followup_other_reason,
            }
            dashboard_defaults_filtered = {k: v for k, v in dashboard_defaults.items() if v is not None}

            dashboard_entry = Dashboard.objects.create(
                aadhar=aadhar,
                date=entry_date,
                **dashboard_defaults_filtered
            )
        
        if data.get('reference'):
            appointment_data = Appointment.objects.filter(id=data.get('appointmentId')).first()
            if appointment_data:
                appointment_data.mrdNo = employee_entry.mrdNo
                appointment_data.submitted_by_nurse = data.get('submitted_by_nurse')
                appointment_data.status = Appointment.StatusChoices.IN_PROGRESS
                appointment_data.save()

        message = f"Entry added successfully. MRD: {employee_entry.mrdNo}"
        return JsonResponse({"message": message, "mrdNo": employee_entry.mrdNo, "aadhar": employee_data}, status=200)

    except json.JSONDecodeError:
        logger.error("addEntries failed: Invalid JSON data.")
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        logger.exception(f"addEntries failed for aadhar {aadhar}: {str(e)}")
        return JsonResponse({"error": "Server error processing entry", "detail": str(e)}, status=500)


@csrf_exempt
def add_basic_details(request):
    """Adds or updates basic employee details based on AADHAR and today's date, including profile pic."""
    if request.method != "POST":
        logger.warning("add_basic_details failed: Invalid request method. Only POST allowed.")
        return JsonResponse({"error": "Invalid request method"}, status=405)

    aadhar = None # Initialize for logging
    try:
        data = json.loads(request.body.decode('utf-8'))
        logger.debug(f"Received data for add_basic_details: {json.dumps(data)[:500]}...")

        aadhar = data.get('aadhar')
        mrdNo = data.get('mrdNo') 
        if not aadhar:
            logger.warning("add_basic_details failed: Aadhar number is required")
            return JsonResponse({"error": "Aadhar number (aadhar) is required"}, status=400)

        entry_date = date.today() # Operates on today's record

        # Prepare defaults dictionary mapping payload keys to model fields
        basic_defaults = {
            'name': data.get('name'), 'dob': parse_date_internal(data.get('dob')), 'sex': data.get('sex'),
            'guardian': data.get('guardian'), 'bloodgrp': data.get('bloodgrp'),
            'identification_marks1': data.get('identification_marks1'), 'identification_marks2': data.get('identification_marks2'),
            'marital_status': data.get('marital_status'), 'emp_no': data.get('emp_no'),
            'employer': data.get('employer'), 'designation': data.get('designation'), 'department': data.get('department'), 'division': data.get('division'), 'workarea': data.get('workarea'),
            'job_nature': data.get('job_nature'), 'doj': parse_date_internal(data.get('doj')), 'moj': data.get('moj'),
            'phone_Personal': data.get('phone_Personal'), 'mail_id_Personal': data.get('mail_id_Personal'),
            'emergency_contact_person': data.get('emergency_contact_person'), 'phone_Office': data.get('phone_Office'),
            'mail_id_Office': data.get('mail_id_Office'), 'emergency_contact_relation': data.get('emergency_contact_relation'),
            'mail_id_Emergency_Contact_Person': data.get('mail_id_Emergency_Contact_Person'),
            'emergency_contact_phone': data.get('emergency_contact_phone'), 'location': data.get('location'),
            'permanent_address': data.get('permanent_address'), 'permanent_area': data.get('permanent_area'),
            'nationality': data.get('nationality'),
            'docName': data.get('docName'),
            'permanent_state': data.get('permanent_state'), 'permanent_nationality': data.get('permanent_nationality'),
            'residential_address': data.get('residential_address'), 'residential_area': data.get('residential_area'),
            'residential_state': data.get('residential_state'), 'residential_nationality': data.get('residential_nationality'),
            'country_id': data.get('country_id'), 'role': data.get('role'),
            'employee_status': data.get('employee_status'), 'since_date': parse_date_internal(data.get('since_date')),
            'transfer_details': data.get('transfer_details'), 'other_reason_details': data.get('other_reason_details'),
            'previousemployer':data.get('previousemployer'),'previouslocation':data.get('previouslocation'),
            'contractor_status': data.get('contractor_status'), 'status': data.get('status'), 'type': data.get('type'),
            
            # Visitor Fields
            'other_site_id': data.get('other_site_id'), 'organization': data.get('organization'),
            'addressOrganization': data.get('addressOrganization'), 'visiting_department': data.get('visiting_department'),
            'visiting_date_from': parse_date_internal(data.get('visiting_date_from')),
            'visiting_date_to': parse_date_internal(data.get('visiting_date_to')),
            'stay_in_guest_house': data.get('stay_in_guest_house'), 'visiting_purpose': data.get('visiting_purpose'),
            
        }

        # Filter out None values before passing to update_or_create defaults
        basic_defaults_filtered = {k: v for k, v in basic_defaults.items() if v is not None}

        # --- Use update_or_create based on AADHAR and DATE ---
        employee, created = employee_details.objects.update_or_create(
            aadhar=aadhar,
            entry_date=entry_date,
            mrdNo=mrdNo,
            defaults=basic_defaults_filtered
        )

        # --- Handle Profile Picture ---
        profile_image_b64 = data.get('profilepic') # Key from payload
        image_field_updated = False

        if profile_image_b64 and isinstance(profile_image_b64, str) and ';base64,' in profile_image_b64:
            try:
                header, encoded = profile_image_b64.split(';base64,', 1)
                file_ext_match = re.search(r'data:image/(?P<ext>\w+);base64', header) # More robust extraction
                file_ext = file_ext_match.group('ext') if file_ext_match else 'jpg'

                image_data = base64.b64decode(encoded)
                filename = f"profilepics/{aadhar}_{uuid.uuid4().hex[:8]}.{file_ext}"

                # Delete old file only if a new file is being saved
                if employee.profilepic and employee.profilepic.name:
                     try:
                         if default_storage.exists(employee.profilepic.path):
                             default_storage.delete(employee.profilepic.path)
                             logger.info(f"Deleted old profile pic for aadhar {aadhar}: {employee.profilepic.name}")
                     except Exception as del_err:
                          logger.error(f"Error deleting old profile pic for aadhar {aadhar}: {del_err}")

                # Save the new image file (triggers pre_save/post_save if defined)
                employee.profilepic.save(filename, ContentFile(image_data), save=True) # Save=True here to commit change
                image_field_updated = True
                logger.info(f"Profile picture updated and saved for aadhar: {aadhar}")

            except (TypeError, ValueError, base64.binascii.Error) as img_err:
                logger.error(f"Failed to decode or save profile picture for aadhar {aadhar}: {img_err}")
            except Exception as img_ex:
                logger.exception(f"Unexpected error processing profile picture for aadhar {aadhar}")

        elif 'profilepic' in data and data['profilepic'] is None:
             # Handle clearing the image
             if employee.profilepic:
                 try:
                     employee.profilepic.delete(save=True) # Delete file and save model change
                     image_field_updated = True
                     logger.info(f"Profile picture cleared for aadhar: {aadhar}")
                 except Exception as del_err:
                      logger.error(f"Error clearing profile pic file for aadhar {aadhar}: {del_err}")

        # No explicit final save needed if update_or_create handled non-image fields
        # and profilepic.save(save=True) or profilepic.delete(save=True) handled image fields.

        message = "Basic Details added successfully" if created else "Basic Details updated successfully"
        return JsonResponse({
            "message": message,
            "aadhar": aadhar,
            "entry_date": entry_date.isoformat(),
            "profilepic_url": employee.profilepic.url if employee.profilepic else None
            }, status=201 if created else 200)

    except json.JSONDecodeError:
        logger.error("add_basic_details failed: Invalid JSON data.", exc_info=True)
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        logger.exception(f"add_basic_details failed for aadhar {aadhar or 'Unknown'}: An unexpected error occurred.")
        return JsonResponse({"error": "An internal server error occurred while processing basic details."}, status=500)

import re # Added for profile pic extension extraction

@csrf_exempt
def uploadImage(request, aadhar):
    """Handles uploading/updating profile images based on AADHAR for the LATEST record."""
    # Note: This might be redundant if add_basic_details is always used.
    if request.method == 'PUT':
        try:
            data = json.loads(request.body.decode('utf-8'))
            image_b64 = data.get('profileImage') # Assuming this key

            if not image_b64 or not isinstance(image_b64, str) or ';base64,' not in image_b64:
                logger.warning(f"Image upload failed for aadhar {aadhar}: Invalid or missing image data.")
                return JsonResponse({'status': 'error', 'message': 'Invalid or missing profileImage data (must be base64 string).'}, status=400)

            # Get the LATEST employee record for this aadhar
            employee = employee_details.objects.filter(aadhar=aadhar).order_by('-entry_date', '-id').first()

            if not employee:
                logger.warning(f"Image upload failed: No employee record found for aadhar {aadhar}.")
                return JsonResponse({'status': 'error', 'message': 'Employee record not found for this Aadhar.'}, status=404)

            # --- Process and Save Image ---
            try:
                header, encoded = image_b64.split(';base64,', 1)
                file_ext_match = re.search(r'data:image/(?P<ext>\w+);base64', header)
                file_ext = file_ext_match.group('ext') if file_ext_match else 'jpg'

                image_data = base64.b64decode(encoded)
                filename = f"profilepics/{aadhar}_{uuid.uuid4().hex[:8]}.{file_ext}"

                # Delete old file
                if employee.profilepic and employee.profilepic.name:
                     try:
                         if default_storage.exists(employee.profilepic.path):
                             default_storage.delete(employee.profilepic.path)
                             logger.info(f"Deleted old profile pic for aadhar {aadhar} during uploadImage: {employee.profilepic.name}")
                     except Exception as del_err:
                         logger.error(f"Error deleting old profile pic for aadhar {aadhar} during uploadImage: {del_err}")

                # Save new file (triggers model save)
                employee.profilepic.save(filename, ContentFile(image_data), save=True)

                logger.info(f"Successfully updated profile image for aadhar {aadhar} (latest record ID: {employee.id})")
                return JsonResponse({
                    'status': 'success',
                    'message': 'Image updated successfully',
                    'profilepic_url': employee.profilepic.url if employee.profilepic else None
                })

            except (TypeError, ValueError, base64.binascii.Error) as img_err:
                logger.error(f"Image upload processing error for aadhar {aadhar}: {img_err}")
                return JsonResponse({'status': 'error', 'message': f'Image processing error: {img_err}'}, status=400)
            except Exception as save_err:
                 logger.exception(f"Error saving profile image for aadhar {aadhar}")
                 return JsonResponse({'status': 'error', 'message': f'Failed to save new image: {save_err}'}, status=500)

        except json.JSONDecodeError:
            logger.error(f"Image upload failed for aadhar {aadhar}: Invalid JSON.", exc_info=True)
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON data in request body.'}, status=400)
        except Exception as e:
            logger.exception(f"Image upload failed for aadhar {aadhar}: An unexpected error occurred.")
            return JsonResponse({'status': 'error', 'message': 'An unexpected server error occurred.'}, status=500)

    logger.warning(f"Image upload failed for aadhar {aadhar}: Invalid request method. Only PUT allowed.")
    return JsonResponse({'status': 'error', 'message': 'Invalid request method. Use PUT.'}, status=405)

@csrf_exempt
def fetchVisitdata(request, aadhar):
    """
    Fetches all Dashboard visit records for a specific employee 
    and combines them with the corresponding vitals data by mapping mrdNo.
    """
    # REST convention for fetching data is GET
    if request.method == "POST":
        try:
            consultation_data = list(Consultation.objects.filter(aadhar=aadhar).filter(status = "completed").order_by('-entry_date').values())
            fitness_data = list(FitnessAssessment.objects.filter(aadhar=aadhar).filter(status = "completed").order_by('-entry_date').values())
            visit_data = []
            for consult_data in consultation_data:
                consult_data['register'] = Dashboard.objects.filter(mrdNo=consult_data['mrdNo']).values('register').first().get('register','')
                fitness_data.append(consult_data)
            for assessment_data in fitness_data:
                assessment_data['register'] = Dashboard.objects.filter(mrdNo=assessment_data['mrdNo']).values('register').first().get('register','')
                visit_data.append(assessment_data)
            
            return JsonResponse({"message": "Visit data fetched successfully", "data": visit_data}, status=200)

        except Exception as e:
            logger.exception(f"fetchVisitdata failed for aadhar {aadhar}: An unexpected error occurred.")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)
    else:
        logger.warning(f"fetchVisitdata called with invalid method {request.method} for aadhar {aadhar}.")
        # Corrected error message to align with the check
        return JsonResponse({"error": "Invalid request method. Please use GET."}, status=405)

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import logging

# Ensure you import your models and serialize_model_instance helper here
# from .models import ... 
# from .serializers import serialize_model_instance

logger = logging.getLogger(__name__)

@csrf_exempt
def fetchVisitDataWithDate(request, mrdNo):
    """
    Fetches all records associated with a specific Medical Record Number (MRD).
    """
    print("Hii")
    if request.method == "GET":
        try:
            if not mrdNo:
                return JsonResponse({"error": "MRD Number is required."}, status=400)

            # 1. Define models that contain Visit Data (linked by mrdNo)
            # 'employee' is excluded here, we handle it separately
            visit_models = {
                "dashboard": Dashboard, "vitals": vitals,
                "msphistory": MedicalHistory, "haematology": heamatalogy, 
                "routinesugartests": RoutineSugarTests,
                "renalfunctiontests_and_electrolytes": RenalFunctionTest, 
                "lipidprofile": LipidProfile, "liverfunctiontest": LiverFunctionTest,
                "thyroidfunctiontest": ThyroidFunctionTest, "coagulationtest": CoagulationTest,
                "enzymesandcardiacprofile": EnzymesCardiacProfile, "urineroutine": UrineRoutineTest,
                "serology": SerologyTest, "motion": MotionTest, "menspack": MensPack,
                "opthalamicreport": OphthalmicReport, "usg": USGReport, "mri": MRIReport,
                "fitnessassessment": FitnessAssessment, "vaccination": VaccinationRecord,
                "significant_notes": SignificantNotes, "consultation": Consultation,
                "prescription": Prescription, "form17": Form17, "form38": Form38,
                "form39": Form39, "form40": Form40, "form27": Form27,
                "autoimmunetest": AutoimmuneTest, "routinecultureandsensitive": CultureSensitivityTest,
                "womenpack": WomensPack, "occupationalprofile": OccupationalProfile,
                "otherstest": OthersTest, "xray": XRay, "ct": CTReport,
            }

            response_data = {}
            found_aadhar = None

            # 2. Iterate through visit models to fetch data by MRD
            for key, model_class in visit_models.items():
                # We assume these models have an 'mrdNo' field
                if hasattr(model_class, 'mrdNo'):
                    instance = model_class.objects.filter(mrdNo=mrdNo).first()
                    response_data[key] = serialize_model_instance(instance)
                    
                    # Capture the Aadhar from the first model where we find data 
                    # (Usually Consultation or Vitals is the anchor)
                    if instance and not found_aadhar and hasattr(instance, 'aadhar'):
                        found_aadhar = instance.aadhar
                else:
                    # Fallback if a model in the list doesn't have mrdNo (shouldn't happen based on requirement)
                    response_data[key] = None

            # 3. Fetch Employee Details (Static Profile) using the found Aadhar
            # Employee details usually don't have an mrdNo, they are linked by Aadhar
            if found_aadhar:
                employee_instance = employee_details.objects.filter(aadhar=found_aadhar).first()
                response_data["employee"] = serialize_model_instance(employee_instance)
            else:
                response_data["employee"] = None
                
                # Optional: If no clinical data was found at all for this MRD
                is_empty = all(v is None for v in response_data.values())
                if is_empty:
                     return JsonResponse({"message": "No records found for this MRD Number.", "data": {}}, status=404)

            logger.info(f"Fetched data for MRD: {mrdNo}")
            return JsonResponse({"data": response_data}, safe=False, status=200)

        except Exception as e:
            logger.exception(f"fetchVisitDataByMrd failed for MRD {mrdNo}: An unexpected error occurred.")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)

    logger.warning(f"fetchVisitDataByMrd failed: Invalid request method. Only GET allowed.")
    return JsonResponse({"error": "Invalid request method. Use GET."}, status=405)


import json
import logging
from datetime import date
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.forms.models import model_to_dict
from django.db import transaction

# Assuming these imports exist in your project
# from .models import employee_details
# from .utils import parse_date_internal

logger = logging.getLogger(__name__)

@csrf_exempt
def update_employee_status(request):
    """Creates a NEW employee_details record for TODAY with updated status fields, based on the last known record."""
    if request.method == 'POST':
        aadhar = None  # Initialize for logging safety
        try:
            data = json.loads(request.body)
            logger.debug(f"Received data for update_status: {data}")

            aadhar = data.get('identifier')
            status_val = data.get('status')
            date_since_str = data.get('date_since')
            transfer_details_val = data.get('transfer_details', '')  # Default to empty
            other_reason_details_val = data.get('other_reason_details', '')  # Default to empty

            # Debug print (Optional: remove for production)
            print("Aadhar : ", aadhar, "status : ", status_val, "date_since : ", date_since_str)

            if not aadhar or not status_val or not date_since_str:
                logger.warning("update_status failed: Missing aadhar, status, or date_since.")
                return JsonResponse({'success': False, 'message': 'Please provide aadhar, status and date_since.'}, status=400)

            # Ensure parse_date_internal helper function is imported or defined
            date_since_obj = parse_date_internal(date_since_str)
            if not date_since_obj:
                logger.warning(f"update_status failed for aadhar {aadhar}: Invalid date_since format.")
                return JsonResponse({'success': False, 'message': 'Invalid date_since format. Use YYYY-MM-DD.'}, status=400)

            # Find the most recent entry for this aadhar
            last_entry = employee_details.objects.filter(aadhar=aadhar).order_by('-entry_date', '-id').first()

            if not last_entry:
                logger.warning(f"update_status failed: Cannot create new entry as no previous record found for aadhar {aadhar}.")
                return JsonResponse({'success': False, 'message': 'No previous employee record found to base the new status entry on.'}, status=404)

            # Create a new entry based on the last one, excluding primary keys and old date
            new_entry_data = model_to_dict(last_entry, exclude=['id', 'pk', 'entry_date'])
            
            # Update specific fields
            new_entry_data['entry_date'] = date.today()  # Set to today
            new_entry_data['status'] = status_val
            new_entry_data['since_date'] = date_since_obj
            new_entry_data['transfer_details'] = transfer_details_val
            new_entry_data['other_reason_details'] = other_reason_details_val
            new_entry_data['aadhar'] = aadhar 

            # Important: model_to_dict skips FileFields/ImageFields. 
            # Manually copy the reference from the old object to the new dict.
            new_entry_data['profilepic'] = last_entry.profilepic

            # --- FIX IS HERE ---
            # We removed 'aadhar=aadhar' because 'aadhar' is already inside the new_entry_data dictionary.
            new_entry = employee_details.objects.create(**new_entry_data)
            
            logger.info(f"Created new status entry (ID: {new_entry.id}) for aadhar {aadhar} based on last entry (ID: {last_entry.id}).")
            return JsonResponse({'success': True, 'message': 'New status entry created successfully for today.'})

        except json.JSONDecodeError:
            logger.error("update_status failed: Invalid JSON.", exc_info=True)
            return JsonResponse({'success': False, 'message': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            logger.exception(f"update_status failed for aadhar {aadhar or 'Unknown'}: An unexpected error occurred.")
            return JsonResponse({'success': False, 'message': 'An internal server error occurred.'}, status=500)
    else:
        response = JsonResponse({'error': 'Invalid request method. Only POST allowed.'}, status=405)
        response['Allow'] = 'POST'
        return response


# --- Vitals & Investigations (Using Aadhar from payload) ---

@csrf_exempt
def add_vital_details(request):
    """Adds or updates vital details AND files based on AADHAR and today's date."""
    model_class = vitals
    log_prefix = "add_vital_details_multipart"
    success_noun = "Vital Details and Files"

    if request.method == "POST":
        aadhar = None
        mrd_no = None
        try:
            # Read non-file data from request.POST
            post_data = request.POST
            aadhar = post_data.get('aadhar')
            mrd_no = post_data.get('mrdNo') # Get MRD number
            entry_date = date.today()

            if not aadhar:
                logger.warning(f"{log_prefix} failed: Aadhar number is required in POST data")
                return JsonResponse({"error": "Aadhar number (aadhar) is required"}, status=400)
            # Added: Validate MRD if required by model constraints
            if not mrd_no: # Assuming mrdNo is required
                 logger.warning(f"{log_prefix} failed: MRD number is required in POST data")
                 return JsonResponse({"error": "MRD number (mrdNo) is required"}, status=400)


            # Filter POST data for allowed model fields (excluding keys and files)
            allowed_fields = {
                field.name for field in model_class._meta.get_fields()
                if field.concrete and not field.primary_key and not field.is_relation and field.editable
                   and field.name not in ['aadhar', 'entry_date', 'mrdNo', 'manual', 'fc', 'report', 'self_declared', 'application_form', 'consent'] # Exclude files and keys
            }
            filtered_data = {}
            for key in allowed_fields:
                value = post_data.get(key)
                # Handle empty strings -> None conversion if field allows null
                field_instance = model_class._meta.get_field(key)
                if value == '' and (field_instance.null or field_instance.blank):
                     filtered_data[key] = None
                elif value is not None:
                    # Attempt type conversion for numeric fields if needed (robustness)
                    if isinstance(field_instance, (FloatField, IntegerField)):
                        try:
                            if isinstance(field_instance, FloatField): filtered_data[key] = float(value)
                            else: filtered_data[key] = int(value)
                        except (ValueError, TypeError):
                             logger.warning(f"{log_prefix}: Could not convert field '{key}' value '{value}' to number for aadhar {aadhar}. Skipping.")
                             # Optionally return error or skip field
                    else:
                        filtered_data[key] = value

            # Perform update_or_create based on aadhar, mrdNo and date
            instance, created = model_class.objects.update_or_create(
                aadhar=aadhar,
                entry_date=entry_date,
                mrdNo=mrd_no, # Added: Use mrdNo as part of the key
                defaults=filtered_data
            )

            # Handle File Uploads AFTER getting/creating the instance
            files_updated = False
            update_fields_for_save = [] # Track fields updated by files
            file_fields = ['manual', 'fc', 'report', 'self_declared', 'application_form', 'consent'] # List of file fields to check
            for field_name in file_fields:
                if field_name in request.FILES:
                    # Delete old file if exists before saving new one
                    old_file = getattr(instance, field_name, None)
                    if old_file and old_file.name:
                         if default_storage.exists(old_file.path):
                              try: default_storage.delete(old_file.path)
                              except Exception as del_err: logger.error(f"Error deleting old file {field_name} for vital ID {instance.pk}: {del_err}")

                    setattr(instance, field_name, request.FILES[field_name])
                    files_updated = True
                    update_fields_for_save.append(field_name)
                    logger.info(f"{log_prefix}: Updating file field '{field_name}' for vital ID {instance.pk}, aadhar {aadhar}")

            # Save the instance again ONLY if files were updated
            if files_updated:
                instance.save(update_fields=update_fields_for_save)
                logger.info(f"{log_prefix}: Saved vital instance {instance.pk} after file updates for aadhar {aadhar}")


            message = f"{success_noun} {'added' if created else 'updated'} successfully"
            logger.info(f"{log_prefix} successful for aadhar {aadhar}. Created: {created}. Files updated: {files_updated}. ID: {instance.pk}")
            return JsonResponse({"message": message, "created": created, "files_updated": files_updated, "id": instance.pk}, status=201 if created else 200)

        except Exception as e:
            logger.exception(f"{log_prefix} failed for aadhar {aadhar or 'Unknown'}: An unexpected error occurred.")
            return JsonResponse({"error": "Internal Server Error.", "detail": str(e)}, status=500)

    logger.warning(f"{log_prefix} failed: Invalid request method. Only POST allowed.")
    return JsonResponse({"error": "Request method must be POST"}, status=405)

# --- Function to handle standard JSON-based add/update for investigation models ---
def _add_update_investigation(request, model_class, log_prefix, success_noun, requires_mrd=False):
    """ Generic handler for adding/updating investigation records using JSON payload. """
    if request.method == "POST":
        aadhar = None
        mrd_no = None
        try:
            data = json.loads(request.body.decode('utf-8'))
            aadhar = data.get('aadhar')
            accessLevel = data.get('accessLevel')
            entry_date = date.today()

            if not aadhar:
                logger.warning(f"{log_prefix} failed: Aadhar required")
                return JsonResponse({"error": "Aadhar number (aadhar) is required"}, status=400)

            key_fields = ['aadhar', 'entry_date']
            filter_kwargs = {'aadhar': aadhar, 'entry_date': entry_date}

            if requires_mrd:
                mrd_no = data.get('mrdNo')
                if not mrd_no:
                    logger.warning(f"{log_prefix} failed: MRD number required")
                    return JsonResponse({"error": "MRD number (mrdNo) is required"}, status=400)
                key_fields.append('mrdNo')
                filter_kwargs['mrdNo'] = mrd_no
            if accessLevel == "nurse":
                data["checked"] = True
            else:
                data["checked"] = False

            # Filter data for allowed fields, excluding keys
            allowed_fields = {f.name for f in model_class._meta.get_fields() if f.concrete and not f.primary_key and f.name not in key_fields}
            # Handle type conversion and None/empty string logic
            filtered_data = {}
            for key in allowed_fields:
                 if key in data:
                     value = data[key]
                     field_instance = model_class._meta.get_field(key)
                     if value == '' and (field_instance.null or field_instance.blank):
                          filtered_data[key] = None
                     elif value is not None:
                          # Basic type check/conversion for safety
                          if isinstance(field_instance, (FloatField, IntegerField)):
                               try:
                                   if isinstance(field_instance, FloatField): filtered_data[key] = float(value)
                                   else: filtered_data[key] = int(value)
                               except (ValueError, TypeError):
                                   logger.warning(f"{log_prefix}: Could not convert field '{key}' value '{value}' to number for aadhar {aadhar}. Skipping.")
                          elif isinstance(field_instance, DateField):
                               parsed_date = parse_date_internal(value)
                               if parsed_date: filtered_data[key] = parsed_date
                               else: logger.warning(f"{log_prefix}: Invalid date format for field '{key}' value '{value}'. Skipping.")
                          elif isinstance(field_instance, BooleanField):
                               # Handle boolean conversion robustly (e.g., from 'true'/'false', 0/1)
                               if isinstance(value, str): filtered_data[key] = value.lower() in ['true', '1', 'yes']
                               else: filtered_data[key] = bool(value)
                          else:
                               filtered_data[key] = value


            instance, created = model_class.objects.update_or_create(
                **filter_kwargs, defaults=filtered_data
            )
            message = f"{success_noun} {'added' if created else 'updated'} successfully"
            logger.info(f"{log_prefix} successful for aadhar {aadhar}. Created: {created}. ID: {instance.pk}")
            return JsonResponse({"message": message, "id": instance.pk}, status=201 if created else 200)

        except json.JSONDecodeError:
            logger.error(f"{log_prefix} failed: Invalid JSON data.", exc_info=True)
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except IntegrityError as e:
            logger.error(f"{log_prefix} failed for aadhar {aadhar}: Integrity Error: {e}", exc_info=True)
            return JsonResponse({"error": "Data integrity error. Check for conflicts or constraints.", "detail": str(e)}, status=409) # 409 Conflict
        except Exception as e:
            logger.exception(f"{log_prefix} failed for aadhar {aadhar or 'Unknown'}: An unexpected error occurred.")
            return JsonResponse({"error": "Internal Server Error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Request method must be POST"}, status=405)
        response['Allow'] = 'POST'
        return response

# --- Apply the generic handler to investigation views ---

@csrf_exempt
def add_haem_report(request):
    return _add_update_investigation(request, heamatalogy, "add_haem_report", "Haematology details",requires_mrd=True)

@csrf_exempt
def add_routine_sugar(request):
    return _add_update_investigation(request, RoutineSugarTests, "add_routine_sugar", "Routine Sugar Test details",requires_mrd=True)

@csrf_exempt
def add_renal_function(request): # Corrected name
    # This model requires MRD according to previous logic
    return _add_update_investigation(request, RenalFunctionTest, "add_renal_function", "Renal Function Test details", requires_mrd=True)

@csrf_exempt
def add_lipid_profile(request):
    # This model requires MRD according to previous logic
    return _add_update_investigation(request, LipidProfile, "add_lipid_profile", "Lipid Profile details", requires_mrd=True)

@csrf_exempt
def add_liver_function(request):
    # This model requires MRD according to previous logic
    return _add_update_investigation(request, LiverFunctionTest, "add_liver_function", "Liver Function Test details", requires_mrd=True)

@csrf_exempt
def add_thyroid_function(request):
     # This model requires MRD according to previous logic
    return _add_update_investigation(request, ThyroidFunctionTest, "add_thyroid_function", "Thyroid Function Test details", requires_mrd=True)

@csrf_exempt
def add_autoimmune_function(request):
    return _add_update_investigation(request, AutoimmuneTest, "add_autoimmune_function", "Autoimmune Test details",requires_mrd=True) # Assuming no MRD required

@csrf_exempt
def add_coagulation_function(request):
    return _add_update_investigation(request, CoagulationTest, "add_coagulation_function", "Coagulation Test details",requires_mrd=True) # Assuming no MRD required

@csrf_exempt
def add_enzymes_cardiac(request):
     # This model requires MRD according to previous logic
    return _add_update_investigation(request, EnzymesCardiacProfile, "add_enzymes_cardiac", "Enzymes Cardiac Profile details", requires_mrd=True)

@csrf_exempt
def add_urine_routine(request):
    return _add_update_investigation(request, UrineRoutineTest, "add_urine_routine", "Urine Routine Test details",requires_mrd=True) # Assuming no MRD required

@csrf_exempt
def add_serology(request):
    return _add_update_investigation(request, SerologyTest, "add_serology", "Serology Test details",requires_mrd=True) #Assuming no MRD required

@csrf_exempt
def add_motion_test(request):
    return _add_update_investigation(request, MotionTest, "add_motion_test", "Motion Test details",requires_mrd=True) #Assuming no MRD required

@csrf_exempt
def add_culturalsensitivity_function(request): # Corrected spelling: CultureSensitivity
    return _add_update_investigation(request, CultureSensitivityTest, "add_culturalsensitivity_function", "Culture Sensitivity Test details",requires_mrd=True) #Assuming no MRD required

@csrf_exempt
def create_medical_history(request):
    # Medical History is slightly different (more complex JSON fields), keep separate for now
    model_class = MedicalHistory
    log_prefix = "create_medical_history"
    success_noun = "Medical history"
    if request.method == 'POST':
        aadhar = None
        try:
            data = json.loads(request.body.decode('utf-8')) # Decode explicitly
            logger.debug(f"Received data for {log_prefix}: {json.dumps(data)[:500]}...")

            aadhar = data.get('aadhar')
            entry_date = date.today()

            if not aadhar:
                logger.warning(f"{log_prefix} failed: Aadhar number is required")
                return JsonResponse({"error": "Aadhar number (aadhar) is required"}, status=400)

            # Map payload keys carefully, ensure JSON fields are handled
            defaults = {
                'personal_history': data.get('personal_history'), # Assumes valid JSON sent
                'medical_data': data.get('medical_data'),
                'female_worker': data.get('female_worker'),
                'surgical_history': data.get('surgical_history'),
                'family_history': data.get('family_history'),
                'health_conditions': data.get('health_conditions'),
                'allergy_fields': data.get('allergy_fields'),
                'allergy_comments': data.get('allergy_comments', ''), # Default empty string
                'children_data': data.get('children_data'),
                'spouse_data': data.get('spouse_data'),
                'conditions': data.get('conditions'),
                'emp_no': data.get('emp_no'), # Store if present
                'mrdNo': data.get('mrdNo'),
                
            }
            print(defaults)
            filtered_defaults = {k: v for k, v in defaults.items() if v is not None}

            medical_history, created = model_class.objects.update_or_create(
                aadhar=aadhar,
                entry_date=entry_date,
                defaults=filtered_defaults
            )

            message = f"{success_noun} {'created' if created else 'updated'} successfully"
            logger.info(f"{log_prefix} successful for aadhar: {aadhar}. Created: {created}")
            return JsonResponse({"message": message, "id": medical_history.pk}, status=201 if created else 200)

        except json.JSONDecodeError:
            logger.error(f"{log_prefix} failed: Invalid JSON data.", exc_info=True)
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except ValidationError as e:
            logger.error(f"{log_prefix} failed for aadhar {aadhar or 'Unknown'}: Validation error: {e.message_dict}", exc_info=True)
            return JsonResponse({"error": "Validation Error", 'details': e.message_dict}, status=400)
        except Exception as e:
            logger.exception(f"{log_prefix} failed for aadhar {aadhar or 'Unknown'}: An unexpected error occurred.")
            return JsonResponse({"error": "An internal server error occurred"}, status=500)
    else:
        response = JsonResponse({"error": "Only POST requests are allowed"}, status=405)
        response['Allow'] = 'POST'
        return response


@csrf_exempt
def add_mens_pack(request):
    return _add_update_investigation(request, MensPack, "add_mens_pack", "Mens Pack details") # Assuming no MRD

@csrf_exempt
def add_womens_function(request):
    return _add_update_investigation(request, WomensPack, "add_womens_function", "Women's pack details") # Assuming no MRD

@csrf_exempt
def add_occupationalprofile_function(request):
    return _add_update_investigation(request, OccupationalProfile, "add_occupationalprofile_function", "Occupational Profile details",requires_mrd=True) # Assuming no MRD

@csrf_exempt
def add_otherstest_function(request):
    return _add_update_investigation(request, OthersTest, "add_otherstest_function", "Others Test details",requires_mrd=True) # Assuming no MRD

@csrf_exempt
def add_ophthalmic_report(request): # Corrected spelling
    return _add_update_investigation(request, OphthalmicReport, "add_ophthalmic_report", "Ophthalmic Report details") # Assuming no MRD

@csrf_exempt
def add_usg_report(request):
    return _add_update_investigation(request, USGReport, "add_usg_report", "USG Report details") # Assuming no MRD

@csrf_exempt
def add_mri_report(request):
    return _add_update_investigation(request, MRIReport, "add_mri_report", "MRI Report details") # Assuming no MRD

@csrf_exempt
def add_xray_function(request):
    return _add_update_investigation(request, XRay, "add_xray_function", "XRay details") # Assuming no MRD

@csrf_exempt
def add_ct_function(request):
    return _add_update_investigation(request, CTReport, "add_ct_function", "CT Report details") # Assuming no MRD

@csrf_exempt
def insert_vaccination(request):
    """Inserts or updates vaccination record based on AADHAR and today's date."""
    # Slightly different structure (JSON field primary data)
    model_class = VaccinationRecord
    log_prefix = "insert_vaccination"
    success_noun = "Vaccination record"
    if request.method == "POST":
        aadhar = None
        try:
            data = json.loads(request.body.decode('utf-8'))
            aadhar = data.get('aadhar')
            vaccination_data = data.get("vaccination") # Expect the JSON/dict data
            entry_date = date.today()
            mrdNo = data.get('mrdNo')
            if not aadhar or vaccination_data is None: # Allow empty list for vaccination data
                logger.warning(f"{log_prefix} failed: aadhar and vaccination fields are required")
                return JsonResponse({"error": "Aadhar (aadhar) and vaccination data are required"}, status=400)

            # CHANGED: Add mrdNo to the dictionary of fields to be saved/updated.
            filtered_data = {'vaccination': vaccination_data, 'emp_no': data.get('emp_no',"null"), 'mrdNo': mrdNo}

            # CHANGED: Remove mrdNo from the lookup parameters. The record is uniquely identified by aadhar and entry_date.
            instance, created = model_class.objects.update_or_create(
                aadhar=aadhar, entry_date=entry_date, defaults=filtered_data
            )
            message = f"{success_noun} {'saved' if created else 'updated'} successfully"
            logger.info(f"{log_prefix} successful for aadhar {aadhar}. Created: {created}. ID: {instance.pk}")
            response_data = model_to_dict(instance)
            response_data['entry_date'] = instance.entry_date.isoformat() # Format date
            return JsonResponse({
                "message": message,
                "created": created,
                "record": response_data,
                "id": instance.pk
            }, status=201 if created else 200)
        except json.JSONDecodeError:
            logger.error(f"{log_prefix} failed: Invalid JSON data.", exc_info=True)
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except Exception as e:
            logger.exception(f"{log_prefix} failed for aadhar {aadhar or 'Unknown'}: An unexpected error occurred.")
            return JsonResponse({"error": "Internal Server Error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Request method must be POST"}, status=405)
        response['Allow'] = 'POST'
        return response

def fetch_vaccinations(request, aadhar):
    """Fetches vaccination records, optionally filtered by AADHAR."""
    if request.method == "GET":
        aadhar_filter = aadhar
        print(aadhar)
        try:
            queryset = VaccinationRecord.objects.all()
            if aadhar_filter:
                queryset = queryset.filter(aadhar=aadhar_filter)
                
            records = list(queryset.order_by('-entry_date', '-id').values())
            for record in records:
                print(record)
                if isinstance(record.get('entry_date'), date):
                    record['entry_date'] = record['entry_date'].isoformat()

            logger.info(f"Fetched {len(records)} vaccination records." + (f" Filtered by aadhar: {aadhar_filter}" if aadhar_filter else ""))
            return JsonResponse({"vaccinations": records}, safe=False)
        except Exception as e:
            logger.exception("fetch_vaccinations failed: An unexpected error occurred.")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid request method. Use GET."}, status=405)
        response['Allow'] = 'GET'
        return response

import json
import logging
from datetime import date
from dateutil.relativedelta import relativedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ValidationError
from django.db import IntegrityError
# Make sure to import all your relevant models
from .models import Consultation, FitnessAssessment, Dashboard 

logger = logging.getLogger(__name__)

# This is the view from your previous code, included for context. No changes here.
@csrf_exempt
def add_consultation(request):
    # ... (code for add_consultation remains the same)
    pass


@csrf_exempt
def fitness_test(request):
    """
    Adds or updates fitness assessment data based on MRD number.
    If accessLevel is 'doctor', marks status as COMPLETED.
    """
    model_class = FitnessAssessment
    log_prefix = "fitness_test"
    success_noun = "Fitness test details"

    if request.method == "POST":
        aadhar = None
        mrd_no = None
        try:
            data = json.loads(request.body.decode('utf-8'))
            aadhar = data.get('aadhar')
            mrd_no = data.get('mrdNo')
            accessLevel = data.get('accessLevel')
            param = data.get('param')  # Unused in current logic
            
            # entry_date is still calculated for data recording, 
            # but no longer used as a primary lookup key
            entry_date = date.today()

            if not aadhar:
                logger.warning(f"{log_prefix} failed: Aadhar required")
                return JsonResponse({"error": "Aadhar number (aadhar) is required"}, status=400)
            if not mrd_no:
                logger.warning(f"{log_prefix} failed: MRD required")
                return JsonResponse({"error": "MRD number (mrdNo) is required"}, status=400)

            validity_date = entry_date + relativedelta(months=6)

            def parse_json_field(field_data):
                if isinstance(field_data, list): return field_data
                if isinstance(field_data, str):
                    try: return json.loads(field_data) if field_data else []
                    except json.JSONDecodeError: return []
                return []

            print(data.get("isDoctorVisited"))
            # ---------------------------------------------------------
            # NURSE LOGIC
            # ---------------------------------------------------------
            if accessLevel == "nurse":
                defaults = {
                    'emp_no': data.get("emp_no"),
                    'aadhar': data.get("aadhar"),
                    'employer': data.get("employer"),
                    'entry_date': entry_date, # Save date, but don't use for lookup
                    
                    'submittedNurse': data.get("submittedDoctor"), # Frontend often sends current user as submittedDoctor
                    'bookedDoctor': data.get("bookedDoctor"),
                    
                    'status': (
                        model_class.StatusChoices.PENDING if param == "hold" 
                        else model_class.StatusChoices.INITIATE if data.get('isDoctorVisited') 
                        else model_class.StatusChoices.IN_PROGRESS
                    ),
                    # Basic Tests
                    'tremors': data.get("tremors"), 'romberg_test': data.get("romberg_test"),
                    'acrophobia': data.get("acrophobia"), 'trendelenberg_test': data.get("trendelenberg_test"),
                    'CO_dizziness': data.get("CO_dizziness"), 'MusculoSkeletal_Movements': data.get("MusculoSkeletal_Movements"),
                    'Claustrophobia': data.get("Claustrophobia"), 'Tandem': data.get("Tandem"),
                    'Nystagmus_Test': data.get("Nystagmus_Test"), 'Dysdiadochokinesia': data.get("Dysdiadochokinesia"),
                    'Finger_nose_test': data.get("Finger_nose_test"), 'Psychological_PMK': data.get("Psychological_PMK"),
                    'Psychological_zollingar': data.get("Psychological_zollingar"),

                    # Job & Fitness Status
                    'job_nature': parse_json_field(data.get("job_nature")),
                    'overall_fitness': data.get("overall_fitness"),
                    'conditional_fit_feilds': parse_json_field(data.get("conditional_fit_feilds")),

                    'otherJobNature': data.get("other_job_nature"), 
                    'conditionalotherJobNature': data.get("conditional_other_job_nature"),
                    'special_cases': data.get('special_cases'),

                    # Examinations
                    'general_examination': data.get("general_examination"),
                    'systematic_examination': data.get("systematic_examination"),
                    'eye_exam_fit_status': data.get("eye_exam_fit_status"),
                    
                    'comments': data.get("comments"),
                    'validity': validity_date,
                    'follow_up_mrd_history': data.get('follow_up_mrd_history', []),
                }

                # Update Appointment side-effect
                if data.get('reference'):
                    appointment_data = Appointment.objects.filter(mrdNo=data.get('mrdNo')).first()
                    if appointment_data:
                        appointment_data.submitted_by_nurse = data.get('submittedDoctor')
                        appointment_data.submitted_Dr = data.get('bookedDoctor')
                        appointment_data.save()

            # ---------------------------------------------------------
            # DOCTOR LOGIC
            # ---------------------------------------------------------
            elif accessLevel == "doctor":
                defaults = {
                    'emp_no': data.get("emp_no"),
                    'aadhar': data.get("aadhar"),
                    'employer': data.get("employer"),
                    'entry_date': entry_date, 
                    
                    'submittedDoctor': data.get("submittedDoctor"),
                    
                    # --- CHANGE: Update Status to COMPLETED ---
                    'status': model_class.StatusChoices.PENDING if param == "hold" else model_class.StatusChoices.COMPLETED,

                    # Basic Tests
                    'tremors': data.get("tremors"), 'romberg_test': data.get("romberg_test"),
                    'acrophobia': data.get("acrophobia"), 'trendelenberg_test': data.get("trendelenberg_test"),
                    'CO_dizziness': data.get("CO_dizziness"), 'MusculoSkeletal_Movements': data.get("MusculoSkeletal_Movements"),
                    'Claustrophobia': data.get("Claustrophobia"), 'Tandem': data.get("Tandem"),
                    'Nystagmus_Test': data.get("Nystagmus_Test"), 'Dysdiadochokinesia': data.get("Dysdiadochokinesia"),
                    'Finger_nose_test': data.get("Finger_nose_test"), 'Psychological_PMK': data.get("Psychological_PMK"),
                    'Psychological_zollingar': data.get("Psychological_zollingar"),

                    # Job & Fitness Status
                    'job_nature': parse_json_field(data.get("job_nature")),
                    'overall_fitness': data.get("overall_fitness"),
                    'conditional_fit_feilds': parse_json_field(data.get("conditional_fit_feilds")),

                    'otherJobNature': data.get("other_job_nature"), 
                    'conditionalotherJobNature': data.get("conditional_other_job_nature"),
                    'special_cases': data.get('special_cases'),

                    # Examinations
                    'general_examination': data.get("general_examination"),
                    'systematic_examination': data.get("systematic_examination"),
                    'eye_exam_fit_status': data.get("eye_exam_fit_status"),
                    
                    'comments': data.get("comments"),
                    'validity': validity_date,
                    'follow_up_mrd_history': data.get('follow_up_mrd_history', []),
                }

                # Update Appointment side-effect
                if data.get('reference'):
                    appointment_data = Appointment.objects.filter(mrdNo=data.get('mrdNo')).first()
                    if appointment_data:
                        appointment_data.consultated_Dr = data.get('submittedDoctor')
                        appointment_data.status = Appointment.StatusChoices.COMPLETED
                        appointment_data.save()
            
            else:
                # Fallback for unknown access level (optional)
                defaults = {}

            # Filter out None values
            filtered_defaults = {k: v for k, v in defaults.items() if v is not None}

            # --- Update Dashboard (Side effect) ---
            overall_fitness_status = data.get("overall_fitness")
            if overall_fitness_status:
                 try:
                     # Note: Dashboard might still look up by aadhar/date, check your dashboard logic
                     dashboard_entry = Dashboard.objects.filter(aadhar=aadhar, date=entry_date).first()
                     if dashboard_entry:
                          dashboard_entry.visitOutcome = overall_fitness_status
                          dashboard_entry.save(update_fields=['visitOutcome'])
                 except Exception as db_e:
                      logger.error(f"Error updating Dashboard outcome: {db_e}")

            # --- Update or Create Fitness Assessment ---
            # CHANGE: Lookup strictly by mrdNo. 
            # This ensures that if the record exists for this Visit ID, it updates it.
            instance, created = model_class.objects.update_or_create(
                mrdNo=mrd_no,
                defaults=filtered_defaults
            )

            message = f"{success_noun} {'added' if created else 'updated'} successfully"
            logger.info(f"{log_prefix} successful. Created: {created}. ID: {instance.pk}")
            return JsonResponse({"message": message, "id": instance.pk}, status=201 if created else 200)

        except json.JSONDecodeError:
            logger.error(f"{log_prefix} failed: Invalid JSON data.")
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except Exception as e:
            logger.exception(f"{log_prefix} failed: An unexpected error occurred.")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Request method must be POST"}, status=405)
        response['Allow'] = 'POST'
        return response


# your_app/views.py

import json
import logging
from datetime import date
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from .models import Consultation 
# (Assuming parse_date_internal is a helper you have defined elsewhere)
# from .utils import parse_date_internal 

# A simple placeholder if you don't have this utility
def parse_date_internal(date_str):
    if not date_str:
        return None
    try:
        return date.fromisoformat(date_str.split('T')[0])
    except (ValueError, AttributeError):
        return None

logger = logging.getLogger(__name__)

@csrf_exempt
def add_consultation(request):
    """
    Adds or updates consultation data based on MRD number.
    If accessLevel is 'doctor', marks status as COMPLETED.
    """
    if request.method == "POST":
        aadhar = None
        mrd_no = None
        try:
            data = json.loads(request.body.decode('utf-8'))
            logger.debug(f"Received data for consultation: {json.dumps(data)[:500]}...")
            param = data.get('param')
            aadhar = data.get('aadhar')
            mrd_no = data.get('mrdNo') # Primary lookup key
            accessLevel = data.get('accessLevel') 
            param = data.get('param')  # e.g., "hold"   
            print(param, data.get('isDoctorVisited'))
            entry_date = date.today()

            if not aadhar:
                logger.warning("add_consultation failed: Aadhar required")
                return JsonResponse({'status': 'error', 'message': 'Aadhar number (aadhar) is required'}, status=400)
            if not mrd_no:
                logger.warning("add_consultation failed: MRD required")
                return JsonResponse({'status': 'error', 'message': 'MRD number (mrdNo) is required'}, status=400)

            # ---------------------------------------------------------
            # DOCTOR LOGIC
            # ---------------------------------------------------------
            if accessLevel == "doctor":
                defaults = {
                    # Identifiers (Saved, not looked up)
                    'aadhar': aadhar,
                    'entry_date': entry_date,
                    'emp_no': data.get('emp_no'),
                    
                    # Personnel
                    'submittedDoctor': data.get("submittedDoctor"),
                    
                    # --- NEW: Status Logic ---
                    'status': Consultation.StatusChoices.PENDING if data.get('param') == "hold" else Consultation.StatusChoices.COMPLETED,

                    # Clinical Data
                    'complaints': data.get('complaints'), 
                    'examination': data.get('examination'),
                    'systematic': data.get('systematic'), 
                    'lexamination': data.get('lexamination'),
                    'diagnosis': data.get('diagnosis'), 
                    'procedure_notes': data.get('procedure_notes'),
                    'obsnotes': data.get('obsnotes'), 
                    'investigation_details': data.get('investigation_details'),
                    'advice': data.get('advice'), 
                    'follow_up_date': parse_date_internal(data.get('follow_up_date')),
                    
                    # Case Details
                    'case_type': data.get('case_type'), 
                    'illness_or_injury': data.get('illness_or_injury'),
                    'other_case_details': data.get('other_case_details'), 
                    'notifiable_remarks': data.get('notifiable_remarks'),
                    
                    # Referral & Shifting
                    'referral': data.get('referral'),
                    'hospital_name': data.get('hospital_name') if data.get('referral') == 'yes' else None,
                    'speciality': data.get('speciality') if data.get('referral') == 'yes' else None,
                    'doctor_name': data.get('doctor_name') if data.get('referral') == 'yes' else None,
                    'shifting_required': data.get('shifting_required'),
                    'shifting_notes': data.get('shifting_notes') if data.get('shifting_required') == 'yes' else None,
                    'ambulance_details': data.get('ambulance_details') if data.get('shifting_required') == 'yes' else None,
                    
                    'special_cases': data.get('special_cases'),
                    'follow_up_mrd_history': data.get('follow_up_mrd_history', []) 
                }

                # Update Appointment Side-effect
                if data.get('reference'):
                    appointment_data = Appointment.objects.filter(mrdNo=mrd_no).first()
                    if appointment_data:
                        appointment_data.consultated_Dr = data.get('submittedDoctor')
                        appointment_data.status = Appointment.StatusChoices.COMPLETED
                        appointment_data.save()
            
            # ---------------------------------------------------------
            # NURSE LOGIC
            # ---------------------------------------------------------
            else:
                defaults = {
                    # Identifiers (Saved, not looked up)
                    'aadhar': aadhar,
                    'entry_date': entry_date,
                    'emp_no': data.get('emp_no'),
                    'status': (
                        Consultation.StatusChoices.PENDING if param == "hold" 
                        else Consultation.StatusChoices.INITIATE if data.get('isDoctorVisited') 
                        else Consultation.StatusChoices.IN_PROGRESS
                    ),
                    # Personnel
                    'submittedNurse': data.get("submittedDoctor"), # Assuming nurse uses same field name in frontend
                    'bookedDoctor': data.get("bookedDoctor"),
                    'shifting_required': data.get('shifting_required'),
                    'shifting_notes': data.get('shifting_notes') if data.get('shifting_required') == 'yes' else None,
                    'ambulance_details': data.get('ambulance_details') if data.get('shifting_required') == 'yes' else None,
                    
                    'follow_up_mrd_history': data.get('follow_up_mrd_history', []) 
                }

                # Update Appointment Side-effect
                if data.get('reference'):
                    appointment_data = Appointment.objects.filter(mrdNo=mrd_no).first()
                    if appointment_data:
                        appointment_data.submitted_by_nurse = data.get('submittedDoctor')
                        appointment_data.submitted_Dr = data.get('bookedDoctor')
                        appointment_data.save()
            
            # The existing logic to filter out None values
            filtered_defaults = {k: v for k, v in defaults.items() if v is not None}

            # --- KEY CHANGE: Lookup strictly by mrdNo ---
            instance, created = Consultation.objects.update_or_create(
                mrdNo=mrd_no,
                defaults=filtered_defaults
            )

            message = f"Consultation {'added' if created else 'updated'} successfully"
            logger.info(f"Consultation successful. Created: {created}. ID: {instance.id}")
            
            return JsonResponse({
                'status': 'success', 'message': message,
                'consultation_id': instance.id, 'created': created
            }, status=201 if created else 200)

        except json.JSONDecodeError:
            logger.error("add_consultation failed: Invalid JSON data.", exc_info=True)
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON data'}, status=400)
        except ValidationError as e:
            logger.error(f"add_consultation failed: Validation error: {e.message_dict}", exc_info=True)
            return JsonResponse({'status': 'error', 'message': 'Validation Error', 'details': e.message_dict}, status=400)
        except IntegrityError as e:
             logger.error(f"add_consultation failed: Integrity error: {e}", exc_info=True)
             return JsonResponse({'status': 'error', 'message': 'Database integrity error.'}, status=409)
        except Exception as e:
            logger.exception(f"add_consultation failed: An unexpected error occurred.")
            return JsonResponse({'status': 'error', 'message': 'An internal server error occurred.', 'detail': str(e)}, status=500)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method. Use POST.'}, status=405)

@csrf_exempt
def add_significant_notes(request):
    """Adds or updates significant notes based on AADHAR and today's date."""
    model_class = SignificantNotes
    log_prefix = "add_significant_notes"
    success_noun = "Significant Notes"
    print("hi")
    if request.method == "POST":
        aadhar = None
        try:
            data = json.loads(request.body.decode('utf-8')) # Decode explicitly
            aadhar = data.get('aadhar')
            print(aadhar)
            entry_date = date.today()
            if not aadhar:
                logger.warning(f"{log_prefix} failed: Aadhar required")
                return JsonResponse({'status': 'error', 'message': 'Aadhar number (aadhar) is required'}, status=400)

            print(data.get('mrdNo'))
            mrd_number = data.get('mrdNo')
            print(mrd_number)
            defaults = {
                'healthsummary': data.get('healthsummary'), 'remarks': data.get('remarks'),
                'communicable_disease': data.get('communicable_disease'),
                'incident_type': data.get('incident_type'), 'incident': data.get('incident'),
                'illness_type': data.get('illness_type'),
                'emp_no': data.get('emp_no'),'mrdNo': data.get('mrdNo'),
                # Store if provided
                # Add submitted_by if needed
            }
            filtered_defaults = {k: v for k, v in defaults.items() if v is not None}
            if mrd_number:
                filtered_defaults['mrdNo'] = mrd_number
            # --- Update Dashboard visitOutcome (Side effect) ---
            healthsummary_val = data.get('healthsummary')
            if healthsummary_val:
                 try:
                     outcome_entry = Dashboard.objects.filter(aadhar=aadhar, date=entry_date).first()
                     if outcome_entry:
                         outcome_entry.visitOutcome = healthsummary_val
                         outcome_entry.save(update_fields=['visitOutcome'])
                         logger.info(f"Dashboard visitOutcome updated via Sig Notes for aadhar: {aadhar} on {entry_date}")
                 except Exception as db_e:
                      logger.error(f"Error updating Dashboard outcome from Sig Notes for aadhar {aadhar}: {db_e}", exc_info=True)

            print(mrd_number)
            instance, created = model_class.objects.update_or_create(
                aadhar=aadhar,mrdNo=mrd_number, entry_date=entry_date, defaults=filtered_defaults
            )
            message = f"{success_noun} {'added' if created else 'updated'} successfully"
            logger.info(f"{log_prefix} successful for aadhar {aadhar}. Created: {created}. ID: {instance.pk}")
            return JsonResponse({
                'status': 'success', 'message': message, 'significant_note_id': instance.id
            }, status=201 if created else 200)
        except json.JSONDecodeError:
            logger.error(f"{log_prefix} failed: Invalid JSON data.", exc_info=True)
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)
        except Exception as e:
            logger.exception(f"{log_prefix} failed for aadhar {aadhar or 'Unknown'}: An unexpected error occurred.")
            return JsonResponse({'status': 'error', 'message': 'An internal server error occurred.', 'detail': str(e)}, status=500)
    else:
        response = JsonResponse({'status': 'error', 'message': 'Invalid request method. Use POST.'}, status=405)
        response['Allow'] = 'POST'
        return response

import json
import logging
from datetime import date, datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
# from .models import SignificantNotes, employee_details 

logger = logging.getLogger(__name__)

@csrf_exempt
def get_notes(request, aadhar): 
    """
    Fetches significant notes and the FULL employment status history.
    Argument name is 'aadhar' to match urls.py, but treated as a generic identifier.
    """
    if request.method == 'GET':
        try:
            # Alias 'aadhar' to 'identifier' for clarity if you use this for other IDs later
            identifier = aadhar 
            
            logger.info(f"get_notes called with Identifier: {identifier}")

            # 1. Fetch Significant Notes
            # Using 'identifier' to filter (assuming the column in DB is 'aadhar')
            notes_queryset = SignificantNotes.objects.filter(aadhar=identifier).order_by('-entry_date', '-id').values()
            notes_list = list(notes_queryset)

            # Convert date objects to strings
            for note in notes_list:
                if note.get('entry_date') and isinstance(note['entry_date'], (date, datetime)):
                    note['entry_date'] = note['entry_date'].isoformat()

            # 2. Fetch Employment Status History (All records)
            status_queryset = employee_details.objects.filter(aadhar=identifier).exclude(status="").values('status', 'since_date').distinct().order_by('-since_date')

            status_list = list(status_queryset)
            
            # Process status list
            for status in status_list:
                # Convert dates
                if status.get('entry_date') and isinstance(status['entry_date'], (date, datetime)):
                    status['entry_date'] = status['entry_date'].isoformat()
                
                if status.get('since_date') and isinstance(status['since_date'], (date, datetime)):
                    status['since_date'] = status['since_date'].isoformat()

                # Normalize fields
                status['status'] = status.get('status', 'Active')
                status['transfer_details'] = status.get('transfer_details', '')
                status['other_reason_details'] = status.get('other_reason_details', '')

            # 3. Construct Response
            response_data = {
                'notes': notes_list,
                'status_history': status_list,
                'message': 'Data fetched successfully'
            }
            
            if not notes_list and not status_list:
                response_data['message'] = "No records found for this identifier."

            return JsonResponse(response_data, status=200)

        except Exception as e:
            logger.exception(f"get_notes failed for identifier {identifier}")
            return JsonResponse({'error': "An internal server error occurred.", "detail": str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method. Use GET.'}, status=405)


import json
import logging
from datetime import date
from django.http import JsonResponse
from django.db.models import DateField, IntegerField, BooleanField
from django.core.exceptions import ValidationError

# Assuming you have these helper functions defined elsewhere in your file as before
# from .utils import parse_date_internal, parse_form_age 

logger = logging.getLogger(__name__)

def _create_form(request, model_class, form_name, required_fields=None):
    log_prefix = f"create_{form_name.lower().replace(' ', '')}"
    
    if request.method != 'POST':
        response = JsonResponse({'error': 'Only POST requests are allowed'}, status=405)
        response['Allow'] = 'POST'
        return response

    mrdNo = None
    try:
        # 1. Decode Data
        data = json.loads(request.body.decode('utf-8'))
        logger.debug(f"Received {form_name} Data: {json.dumps(data)[:500]}...")

        # 2. Extract Identifiers
        mrdNo = data.get('mrdNo')
        aadhar = data.get('aadhar') # Keep capturing aadhar, but it's secondary now
        entry_date = date.today()

        # 3. Validate Required Identifier (mrdNo)
        if not mrdNo:
            logger.warning(f"{log_prefix} failed: mrdNo is required.")
            return JsonResponse({'error': 'Medical Record Number (mrdNo) is required'}, status=400)

        # 4. Check for other specific required fields
        if required_fields:
            missing = [f for f in required_fields if data.get(f) is None]
            if missing:
                return JsonResponse({'error': f"Missing required fields for {form_name}: {', '.join(missing)}"}, status=400)

        # 5. Initialize Form Data
        # We explicitly set these keys to ensure they are present
        form_data = {
            'mrdNo': mrdNo, 
            'entry_date': entry_date
        }
        
        # Only add aadhar if it exists to avoid overwriting with None if the model has a default or allows blank
        if aadhar:
            form_data['aadhar'] = aadhar

        # 6. Dynamic Field Mapping
        for field in model_class._meta.get_fields():
            # Skip fields we already handled or auto-generated fields
            if field.concrete and not field.auto_created and field.name not in ['id', 'mrdNo', 'aadhar', 'entry_date']:
                
                payload_key = field.name
                
                if payload_key in data:
                    value = data[payload_key]
                    
                    # Handle Data Types
                    if isinstance(field, DateField):
                        form_data[field.name] = parse_date_internal(value)
                    
                    elif isinstance(field, IntegerField):
                        form_data[field.name] = parse_form_age(value)
                    
                    elif isinstance(field, BooleanField):
                        if isinstance(value, str):
                            form_data[field.name] = value.lower() in ['true', '1', 'yes']
                        else:
                            form_data[field.name] = bool(value)
                    
                    elif value is not None:
                        form_data[field.name] = value

        # 7. Create and Validate
        form = model_class(**form_data)
        form.full_clean() # Triggers Django validation
        form.save()

        logger.info(f"{form_name} created successfully for MRD {mrdNo}. ID: {form.pk}")
        return JsonResponse({'message': f'{form_name} created successfully', 'id': form.pk}, status=201)

    except json.JSONDecodeError:
        logger.error(f"{log_prefix} failed: Invalid JSON data.", exc_info=True)
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    
    except ValidationError as e:
        logger.error(f"{log_prefix} failed for MRD {mrdNo or 'Unknown'}: Validation Error: {e.message_dict}", exc_info=True)
        return JsonResponse({'error': 'Validation Error', 'details': e.message_dict}, status=400)
    
    except Exception as e:
        logger.exception(f"{log_prefix} failed for MRD {mrdNo or 'Unknown'}: An unexpected error occurred.")
        return JsonResponse({'error': "An internal server error occurred.", 'detail': str(e)}, status=500)



import json
import logging
from datetime import date
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_date
from django.core.exceptions import ValidationError

# Import your models
from .models import Form17, Form38, Form39, Form40, Form27 

logger = logging.getLogger(__name__)

# --- Helper: Safe Date Parsing ---
def parse_date_internal(date_str):
    """
    Safely parses a date string. Returns None if invalid or empty.
    """
    if not date_str:
        return None
    try:
        # Django's parse_date handles YYYY-MM-DD
        return parse_date(date_str)
    except Exception:
        return None

# --- Helper: Safe Age Parsing ---
def parse_form_age(age_val):
    """
    Parses age to integer, returns None if fails.
    """
    if not age_val:
        return None
    try:
        return int(age_val)
    except (ValueError, TypeError):
        return None

# --- Helper: Robust Request Data Parser ---
def get_request_data(request):
    """
    Retrieves data from request, handling both JSON (application/json)
    and Form Data (application/x-www-form-urlencoded or multipart/form-data).
    Prevents RawPostDataException.
    """
    if request.content_type == 'application/json':
        try:
            return json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return {}
    else:
        # Fallback for standard form posts
        return request.POST.dict()

# --- Generic Form Creator ---
def _create_form(request, model_class, form_name, specific_date_field='date'):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid Method. Only POST is allowed.'}, status=405)

    aadhar = None
    try:
        # 1. Get Data Safely
        data = get_request_data(request)
        aadhar = data.get('aadhar')

        if not aadhar:
            return JsonResponse({'error': 'Aadhar number is required'}, status=400)

        # 2. Prepare common fields
        # Start with all incoming data
        model_data = data.copy()
        
        # Enforce specific fields
        model_data['aadhar'] = aadhar
        model_data['entry_date'] = date.today() # System date for record creation
        
        # 3. Dynamic Field Mapping & Cleaning
        # Iterate over the model's fields to strictly type cast and filter
        final_data = {}
        for field in model_class._meta.get_fields():
            if field.name in model_data:
                value = model_data[field.name]

                # Handle Dates
                if 'Date' in field.get_internal_type() or field.name in ['dob', 'date', 'dateOfBirth', 'employmentDate', 'leavingDate', 'medicalExamDate', 'recertifiedDate', 'eyeExamDate', 'proposedEmploymentDate', 'typhoidVaccinationDate']:
                    value = parse_date_internal(value)
                
                # Handle Integers (like Age)
                elif field.get_internal_type() == 'IntegerField':
                    if field.name == 'age':
                         value = parse_form_age(value)
                    elif value == '' or value is None:
                         value = None
                    else:
                         try: value = int(value)
                         except: value = None

                # Remove Empty Strings for nullable fields to avoid DB constraint errors
                if value == '' or value is None:
                    if field.null:
                        value = None
                    else:
                        # If field is not nullable but we have empty string, keep it as empty string
                        value = '' 

                final_data[field.name] = value

        # 4. Create Record
        form_instance = model_class.objects.create(**final_data)
        
        logger.info(f"{form_name} created successfully for aadhar {aadhar}. ID: {form_instance.pk}")
        return JsonResponse({'message': f'{form_name} created successfully', 'id': form_instance.pk}, status=201)

    except Exception as e:
        logger.exception(f"Error creating {form_name} for aadhar {aadhar}: {str(e)}")
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)


# --- API Endpoints ---

@csrf_exempt
def create_form17(request):
    # Removed the 'print(json.load(request))' which caused the crash
    return _create_form(request, Form17, "Form 17")

@csrf_exempt
def create_form38(request):
    return _create_form(request, Form38, "Form 38")

@csrf_exempt
def create_form39(request):
    return _create_form(request, Form39, "Form 39")

@csrf_exempt
def create_form40(request):
    return _create_form(request, Form40, "Form 40")

@csrf_exempt
def create_form27(request):
    # Form 27 is handled by the generic creator now too, 
    # as the generic creator dynamically maps fields based on the model.
    # If Form27 has a specific date field name (like 'date' instead of 'entry_date'), 
    # the dictionary mapping inside _create_form handles it.
    return _create_form(request, Form27, "Form 27")

# --- Appointments ---
#---  MedicalCertificate ---
from .models import MedicalCertificate
logger = logging.getLogger(__name__)

# --- Helper Function for Parsing Dates ---
# This is a robust way to handle dates that might be missing or in the wrong format.
def parse_date_internal(date_str):
    """Safely parses a date string (YYYY-MM-DD) into a date object."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        logger.warning(f"Could not parse date string: '{date_str}'")
        return None




#---  alcohol_form  ---

from .models import alcohol_form, employee_details # Import the necessary models
import json
import logging
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import alcohol_form, employee_details # Import your models

# Set up a logger
logger = logging.getLogger(__name__)

def parse_date_internal(date_str):
    if not date_str: return None
    try: return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError): return None

@csrf_exempt
def add_alcohol_form_data(request):
   
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method. Only POST is allowed."}, status=405)

    
    try:
        data = json.loads(request.body.decode('utf-8'))
        logger.debug(f"Received data for add_alcohol_form_data: {json.dumps(data)[:500]}...")
        print(data)
        mrdNo = data.get('mrdNo')
        form_date_str = data.get('date')
        aadhar = data.get('aadhar')

        if not mrdNo or not form_date_str:
            return JsonResponse({"error": "MRD Number (mrdNo) and form date (date) are required."}, status=400)

        form_date = parse_date_internal(form_date_str)
        if not form_date:
            return JsonResponse({"error": "Invalid format for date. Use YYYY-MM-DD."}, status=400)

        try:
            employee_instance = employee_details.objects.filter(aadhar=aadhar).first()        
        except employee_details.DoesNotExist:
            logger.warning(f"Employee with aadhar no. '{aadhar}' not found.")
            return JsonResponse({"error": f"Employee with aadhar '{aadhar}' not found."}, status=404)

        # --- THE KEY FIX: Map frontend camelCase keys to backend snake_case model fields ---
        key_map = {
            'alcoholBreathSmell': 'alcohol_breath_smell',
            'speech': 'speech',
            'drynessOfMouth': 'dryness_of_mouth',
            'drynessOfLips': 'dryness_of_lips',
            'cnsPupilReaction': 'cns_pupil_reaction',
            'handTremors': 'hand_tremors',
            'alcoholAnalyzerStudy': 'alcohol_analyzer_study',
            'remarks': 'remarks',
            'advice': 'advice',
            'aadhar': 'aadhar',
            'mrdNo' : 'mrdNo'
        }

        # Build the defaults dictionary for the database using the map
        form_defaults = {}
        for frontend_key, backend_key in key_map.items():
            value = data.get(frontend_key)
            # Only add the key if the value is present and not an empty string
            if value is not None and str(value).strip() != '':
                form_defaults[backend_key] = value

        # If no data fields were provided, there's nothing to update.
        if not form_defaults:
             return JsonResponse({"error": "No data provided to save."}, status=400)

        # Use update_or_create with the correctly mapped data
        record, created = alcohol_form.objects.update_or_create(
            employee=employee_instance,
            entry_date = timezone.now().date(),
            mrdNo = mrdNo,
            defaults=form_defaults
        )

        message = "Alcohol Form data added successfully" if created else "Alcohol Form data updated successfully"
        logger.info(f"{message} for aadhar: {aadhar} on date: {form_date}")

        return JsonResponse({
            "message": message,
            "id": record.id,
            "aadhar": aadhar,
            "date": form_date.isoformat(),
        }, status=201 if created else 200)

    except json.JSONDecodeError:
        logger.error("add_alcohol_form_data failed: Invalid JSON received.", exc_info=True)
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        logger.exception(f"add_alcohol_form_data failed for aadhar {aadhar or 'Unknown'}: An unexpected error occurred.")
        return JsonResponse({"error": "An internal server error occurred."}, status=500)
#---  alcohol_form end ---

#-- getting alcohol abuse form 
# Add this import at the top of your views.py if it's not already there
from django.utils import timezone
from .models import alcohol_form # Make sure this is imported

# ... keep your existing add_alcohol_form_data view ...

@csrf_exempt
def get_alcohol_form_data(request):
    """
    Fetches the most recent alcohol form data for a given patient (by Aadhar).
    """
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request method. Only GET is allowed."}, status=405)

    aadhar = request.GET.get('aadhar')
    if not aadhar:
        return JsonResponse({"error": "Aadhar number parameter is required."}, status=400)

    try:
        # Find the most recent record for this patient
        # We assume the latest entry by 'entry_date' is the one to show
        latest_record = alcohol_form.objects.filter(aadhar=aadhar).order_by('-entry_date').first()

        if not latest_record:
            # It's not an error if no record exists, just return an empty object
            # The frontend will interpret this as "no data to show".
            return JsonResponse({}, status=200)

        # IMPORTANT: Convert backend snake_case fields to frontend camelCase keys
        data_to_return = {
            'alcoholBreathSmell': latest_record.alcohol_breath_smell,
            'speech': latest_record.speech,
            'drynessOfMouth': latest_record.dryness_of_mouth,
            'drynessOfLips': latest_record.dryness_of_lips,
            'cnsPupilReaction': latest_record.cns_pupil_reaction,
            'handTremors': latest_record.hand_tremors,
            'alcoholAnalyzerStudy': latest_record.alcohol_analyzer_study,
            'remarks': latest_record.remarks,
            'advice': latest_record.advice,
        }
        
        # Filter out any keys that have None or empty values if you prefer
        # a cleaner response, but returning them is fine too.
        # data_to_return = {k: v for k, v in data_to_return.items() if v is not None and v != ''}

        return JsonResponse(data_to_return, status=200)

    except Exception as e:
        logger.exception(f"get_alcohol_form_data failed for aadhar {aadhar}: {e}")
        return JsonResponse({"error": "An internal server error occurred while fetching alcohol data."}, status=500)


# medical certificate form
import json
import logging
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import MedicalCertificate # Make sure to import your model

# It's good practice to get the logger for the current module
logger = logging.getLogger(__name__)

def parse_date_internal(date_str):
    """Helper to safely parse date strings from frontend."""
    if not date_str:
        return None
    try:
        # Assumes YYYY-MM-DD format from HTML date inputs
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None

@csrf_exempt
def add_or_update_medical_certificate(request):
    """
    View to create or update a MedicalCertificate record from a JSON payload.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method. Only POST is allowed."}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        logger.debug(f"Received data for medical certificate: {json.dumps(data)[:500]}...")
        print(data)
        mrdNo = data.get('mrdNo')
        
        # --- Essential validation ---
        if not mrdNo:
            return JsonResponse({"error": "MRD Number (mrdNo) is required."}, status=400)

            
        # This map translates frontend camelCase keys to backend model field names.
        # It's crucial for fields that don't match, like 'sp02' vs 'spo2'.
        key_map = {
            'mrdNo': 'mrdNo',
            'aadhar': 'aadhar',
            'employeeName': 'employeeName',
            'age': 'age',
            'sex': 'sex',
            'empNo': 'empNo',
            'department': 'department',
            'date': 'date', # This will be replaced by the parsed date object
            'jswContract': 'jswContract',
            'natureOfWork': 'natureOfWork',
            'covidVaccination': 'covidVaccination',
            'diagnosis': 'diagnosis',
            'leaveFrom': 'leaveFrom',
            'leaveUpTo': 'leaveUpTo',
            'daysLeave': 'daysLeave',
            'rejoiningDate': 'rejoiningDate',
            'shift': 'shift',
            'pr': 'pr',
            'sp02': 'spo2',  # Key translation: frontend 'sp02' maps to model 'spo2'
            'temp': 'temp',
            'certificateFrom': 'certificateFrom',
            'note': 'note',
            'ohcStaffSignature': 'ohcStaffSignature',
            'individualSignature': 'individualSignature',
        }

        form_defaults = {}
        for frontend_key, backend_key in key_map.items():
            value = data.get(frontend_key)
            # Only add the key if the value is not None and not an empty string
            # This prevents overwriting existing data with empty values
            if value is not None and str(value).strip() != '':
                # Handle date fields specifically
                if backend_key in ['date', 'leaveFrom', 'leaveUpTo', 'rejoiningDate']:
                    parsed_value = parse_date_internal(value)
                    if parsed_value:
                        form_defaults[backend_key] = parsed_value
                else:
                    form_defaults[backend_key] = value
        
        # The main date for the record must be present
        form_defaults['date'] = timezone.now().date()

        if not form_defaults:
             return JsonResponse({"error": "No data provided to save."}, status=400)
             
        # Use update_or_create to find a record by mrdNo and date,
        # then either update it with new data or create it if it doesn't exist.
        record, created = MedicalCertificate.objects.update_or_create(
            mrdNo=mrdNo,
            date=timezone.now().date(),
            defaults=form_defaults
        )

        message = "Medical Certificate added successfully" if created else "Medical Certificate updated successfully"
        logger.info(f"{message} for mrdNo: {mrdNo} on date: {timezone.now().date()}")

        return JsonResponse({
            "message": message,
            "id": record.id,
            "mrdNo": mrdNo,
            "date": timezone.now().date().isoformat(),
        }, status=201 if created else 200)

    except json.JSONDecodeError:
        logger.error("add_or_update_medical_certificate failed: Invalid JSON received.", exc_info=True)
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        logger.exception(f"add_or_update_medical_certificate failed for data: {data.get('mrdNo', 'Unknown')}. Error: {str(e)}")
        return JsonResponse({"error": "An internal server error occurred."}, status=500)

# getting medical certificate form 
import json
import logging
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import MedicalCertificate # Import your model

# personal leave certificate form getting and storing

import json
import logging
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import PersonalLeaveCertificate

# --- Setup (no changes needed here) ---
logger = logging.getLogger(__name__)

def parse_date_internal(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None

# --- VIEW 1: Get Existing Data (This view is correct) ---
@csrf_exempt
def get_personal_leave_data(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request method. Only GET is allowed."}, status=405)
    aadhar = request.GET.get('aadhar')
    if not aadhar:
        return JsonResponse({"error": "Aadhar parameter is required."}, status=400)
    try:
        latest_record = PersonalLeaveCertificate.objects.filter(aadhar=aadhar).order_by('-id').first()
        if not latest_record:
            return JsonResponse({}, status=200)
        data_to_return = {
            'employeeName': latest_record.employeeName, 'age': latest_record.age,
            'sex': latest_record.sex, 'date': latest_record.date.isoformat() if latest_record.date else None,
            'empNo': latest_record.empNo, 'department': latest_record.department,
            'jswContract': latest_record.jswContract, 'natureOfWork': latest_record.natureOfWork,
            'hasSurgicalHistory': latest_record.hasSurgicalHistory, 'covidVaccination': latest_record.covidVaccination,
            'personalLeaveDescription': latest_record.personalLeaveDescription,
            'leaveFrom': latest_record.leaveFrom.isoformat() if latest_record.leaveFrom else None,
            'leaveUpTo': latest_record.leaveUpTo.isoformat() if latest_record.leaveUpTo else None,
            'daysLeave': latest_record.daysLeave,
            'rejoiningDate': latest_record.rejoiningDate.isoformat() if latest_record.rejoiningDate else None,
            'bp': latest_record.bp, 'pr': latest_record.pr, 'spo2': latest_record.spo2,
            'temp': latest_record.temp, 'note': latest_record.note,
            'ohcStaffSignature': latest_record.ohcStaffSignature, 'individualSignature': latest_record.individualSignature,
        }
        return JsonResponse(data_to_return, status=200)
    except Exception as e:
        logger.exception(f"get_personal_leave_data failed for aadhar {aadhar}: {e}")
        return JsonResponse({"error": "An internal server error occurred."}, status=500)


# --- VIEW 2: Save Data (This is the corrected version) ---
@csrf_exempt
def save_personal_leave_data(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method. Only POST is allowed."}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        mrdNo = data.get('mrdNo')
        aadhar = data.get('aadhar')

        if not mrdNo or not aadhar:
            return JsonResponse({"error": "MRD Number and Aadhar are required."}, status=400)
            
        certificate_date = parse_date_internal(data.get('date')) or timezone.now().date()

        # Prepare a dictionary of defaults from the payload
        defaults = {
            'mrdNo': mrdNo, 'aadhar': aadhar, 'employeeName': data.get('employeeName'),
            'sex': data.get('sex'), 'empNo': data.get('empNo'),
            'department': data.get('department'), 'jswContract': data.get('jswContract'),
            'natureOfWork': data.get('natureOfWork'), 'hasSurgicalHistory': data.get('hasSurgicalHistory'),
            'covidVaccination': data.get('covidVaccination'), 'personalLeaveDescription': data.get('personalLeaveDescription'),
            'bp': data.get('bp'), 'pr': data.get('pr'), 'spo2': data.get('spo2'),
            'temp': data.get('temp'), 'note': data.get('note'),
            'ohcStaffSignature': data.get('ohcStaffSignature'), 'individualSignature': data.get('individualSignature'),
        }

        # --- THE KEY FIX IS HERE ---
        # Handle integer fields safely: convert only if they are not empty strings.
        age_val = data.get('age')
        if age_val: # This checks for both not None and not empty string
            defaults['age'] = age_val

        daysLeave_val = data.get('daysLeave')
        if daysLeave_val:
            defaults['daysLeave'] = daysLeave_val
            
        # Handle date fields safely
        defaults['date'] = parse_date_internal(data.get('date'))
        defaults['leaveFrom'] = parse_date_internal(data.get('leaveFrom'))
        defaults['leaveUpTo'] = parse_date_internal(data.get('leaveUpTo'))
        defaults['rejoiningDate'] = parse_date_internal(data.get('rejoiningDate'))
        
        # Filter out any keys that have a value of None.
        # Now, empty strings for integer fields are already excluded.
        defaults = {k: v for k, v in defaults.items() if v is not None}

        # Use update_or_create to handle both new and existing records
        record, created = PersonalLeaveCertificate.objects.update_or_create(
            aadhar=aadhar,
            date=certificate_date,
            defaults=defaults
        )

        message = "Personal Leave Certificate saved successfully" if created else "Personal Leave Certificate updated successfully"
        return JsonResponse({"message": message, "id": record.id}, status=201 if created else 200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data received."}, status=400)
    except Exception as e:
        # This will log the exact error to your Django console for future debugging.
        logger.exception(f"Error saving personal leave certificate for aadhar {data.get('aadhar', 'Unknown')}")
        return JsonResponse({"error": "An internal server error occurred. Check server logs for details."}, status=500)

# --- VIEW 1: Get Existing Data ---
# This view is called by the frontend's useEffect hook to pre-fill the form.
@csrf_exempt
def get_medical_certificate_data(request):
    if request.method != "GET":
        return JsonResponse({"error": "Invalid request method. Only GET is allowed."}, status=405)

    aadhar = request.GET.get('aadhar')
    if not aadhar:
        return JsonResponse({"error": "Aadhar parameter is required."}, status=400)

    try:
        # Find the most recent certificate for this patient.
        # Ordering by '-id' is a reliable way to get the last one created.
        latest_record = MedicalCertificate.objects.filter(aadhar=aadhar).order_by('-id').first()

        if not latest_record:
            # It's not an error if none exists. Return an empty object.
            return JsonResponse({}, status=200)

        # --- IMPORTANT: Translate backend snake_case to frontend camelCase ---
        # This dictionary must match the state in your React component.
        data_to_return = {
            'employeeName': latest_record.employeeName,
            'age': latest_record.age,
            'sex': latest_record.sex,
            'date': latest_record.date.isoformat() if latest_record.date else None,
            'empNo': latest_record.empNo,
            'department': latest_record.department,
            'jswContract': latest_record.jswContract,
            'natureOfWork': latest_record.natureOfWork,
            'covidVaccination': latest_record.covidVaccination,
            'diagnosis': latest_record.diagnosis,
            'leaveFrom': latest_record.leaveFrom.isoformat() if latest_record.leaveFrom else None,
            'leaveUpTo': latest_record.leaveUpTo.isoformat() if latest_record.leaveUpTo else None,
            'daysLeave': latest_record.daysLeave,
            'rejoiningDate': latest_record.rejoiningDate.isoformat() if latest_record.rejoiningDate else None,
            'shift': latest_record.shift,
            'pr': latest_record.pr,
            'sp02': latest_record.spo2,  # Note the translation from model `spo2` to frontend `sp02`
            'temp': latest_record.temp,
            'certificateFrom': latest_record.certificateFrom,
            'note': latest_record.note,
            'ohcStaffSignature': latest_record.ohcStaffSignature,
            'individualSignature': latest_record.individualSignature,
        }
        
        return JsonResponse(data_to_return, status=200)

    except Exception as e:
        logger.exception(f"get_medical_certificate_data failed for aadhar {aadhar}: {e}")
        return JsonResponse({"error": "An internal server error occurred."}, status=500)


# --- VIEW 2: Submit/Save Data ---
# This is the view you already had, which handles the form submission.
@csrf_exempt
def add_or_update_medical_certificate(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method. Only POST is allowed."}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        logger.debug(f"Received medical certificate data: {json.dumps(data)[:500]}")
        
        mrdNo = data.get('mrdNo')
        aadhar = data.get('aadhar')

        if not mrdNo or not aadhar:
            return JsonResponse({"error": "MRD Number (mrdNo) and Aadhar are required."}, status=400)
        
        key_map = {
            'mrdNo': 'mrdNo', 'aadhar': 'aadhar', 'employeeName': 'employeeName',
            'age': 'age', 'sex': 'sex', 'empNo': 'empNo', 'department': 'department',
            'jswContract': 'jswContract', 'natureOfWork': 'natureOfWork',
            'covidVaccination': 'covidVaccination', 'diagnosis': 'diagnosis',
            'daysLeave': 'daysLeave', 'shift': 'shift', 'pr': 'pr', 'sp02': 'spo2',
            'temp': 'temp', 'certificateFrom': 'certificateFrom', 'note': 'note',
            'ohcStaffSignature': 'ohcStaffSignature', 'individualSignature': 'individualSignature',
        }

        form_defaults = {}
        for frontend_key, backend_key in key_map.items():
            value = data.get(frontend_key)
            if value is not None and str(value).strip() != '':
                form_defaults[backend_key] = value
        
        # Handle date fields separately
        form_defaults['date'] = parse_date_internal(data.get('date'))
        form_defaults['leaveFrom'] = parse_date_internal(data.get('leaveFrom'))
        form_defaults['leaveUpTo'] = parse_date_internal(data.get('leaveUpTo'))
        form_defaults['rejoiningDate'] = parse_date_internal(data.get('rejoiningDate'))

        # Use update_or_create to prevent duplicate entries for the same patient on the same day.
        # It finds a record matching the keys (mrdNo, date) and updates it with `defaults`.
        # If not found, it creates a new one.
        record, created = MedicalCertificate.objects.update_or_create(
            mrdNo=mrdNo,
            date=timezone.now().date(),  # Use the current date as the unique identifier for the day's record
            defaults=form_defaults
        )

        message = "Medical Certificate saved successfully" if created else "Medical Certificate updated successfully"
        return JsonResponse({"message": message, "id": record.id}, status=201 if created else 200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data received."}, status=400)
    except Exception as e:
        logger.exception(f"Error saving medical certificate for MRD {data.get('mrdNo', 'Unknown')}")
        return JsonResponse({"error": f"An internal server error occurred: {str(e)}"}, status=500)

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.utils.dateparse import parse_date
from datetime import date
from .models import Appointment  # Import your model

logger = logging.getLogger(__name__)

def parse_date_internal(date_str):
    """Helper to safely parse dates."""
    if not date_str:
        return None
    try:
        return parse_date(date_str)
    except Exception:
        return None

@csrf_exempt
def BookAppointment(request):
    """Books a new appointment with corrected Register/Purpose mapping."""
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8'))

            # 1. Basic Validation
            aadhar = data.get("aadharNo")
            if not aadhar:
                 return JsonResponse({"error": "Aadhar Number (aadharNo) is required"}, status=400)

            appointment_date_str = data.get("appointmentDate")
            appointment_date_obj = parse_date_internal(appointment_date_str)
            if not appointment_date_obj:
                return JsonResponse({"error": "Invalid appointment date format. Use YYYY-MM-DD."}, status=400)

            # 2. Generate Appointment Number
            with transaction.atomic():
                existing_appointments = Appointment.objects.filter(date=appointment_date_obj).select_for_update().count()
                next_appointment_number = existing_appointments + 1
                appointment_no_gen = f"{next_appointment_number:04d}{appointment_date_obj.strftime('%d%m%Y')}"

            # 3. Prepare Data Payload
            appointment_data = {
                'appointment_no': appointment_no_gen, 
                'booked_date': date.today(),
                
                # --- Classification Mapping ---
                'role': data.get("role", "Employee"),         # JSON: type
                'visit_type': data.get("type_of_visit", ""),  # JSON: type_of_visit
                'register': data.get("register", ""),         # JSON: register (Specific)
                'purpose': data.get("purpose", ""),           # JSON: purpose (Broad Category)
                
                # --- Identity ---
                'aadhar': aadhar, 
                'emp_no': data.get("employeeId", ""),
                'name': data.get("name", "Unknown"), 
                'organization_name': data.get("organization", ""),
                'contractor_name': data.get("contractorName", ""), 
                'employer': data.get("employer", ""),
                
                # --- Time ---
                'date': appointment_date_obj, 
                'time': data.get("time", ""),
                
                # --- Personnel ---
                'booked_by': data.get("bookedBy", ""),
                'submitted_by_nurse': data.get("submitted_by_nurse", ""),
                'submitted_Dr': data.get("submitted_Dr", ""), 
                'consultated_Dr': data.get("consultedDoctor", ""), 
                
                # --- Conditional Fields ---
                'year': data.get("year", ""),
                'batch': data.get("batch", ""),
                'hospital_name': data.get("hospitalName", ""),
                'camp_name': data.get("campName", ""),
                'contract_name': data.get("contractName", ""),
                'prev_contract_name': data.get("prevcontractName", ""),
                'old_emp_no': data.get("old_emp_no", ""),
                'bp_sugar_status': data.get("bp_sugar_status", ""),
                'bp_sugar_chart_reason': data.get("bp_sugar_chart_reason", ""),
                'followup_reason': data.get("followupConsultationReason", ""),
                'other_followup_reason': data.get("otherfollowupConsultationReason", ""),
                'other_purpose': data.get("otherPurpose", ""), # Text input if register="Other"
                
                'status': Appointment.StatusChoices.INITIATE
            }

            filtered_appointment_data = {k: v for k, v in appointment_data.items() if v is not None}
            appointment = Appointment.objects.create(**filtered_appointment_data)

            logger.info(f"Appointment {appointment.appointment_no} booked.")
            
            return JsonResponse({
                "message": f"Appointment booked successfully for {appointment.name}.",
                "appointment_no": appointment.appointment_no,
                "id": appointment.id
            }, status=201)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except Exception as e:
            logger.exception("BookAppointment failed.")
            return JsonResponse({"error": "Internal server error", "detail": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)

# Use GET for fetching data
@csrf_exempt
def get_appointments(request):
    """Retrieves appointments based on optional filters (date range, aadharNo, status)."""
    if request.method == "GET":
        try:
            from_date_str = request.GET.get('fromDate')
            to_date_str = request.GET.get('toDate')
            aadhar_filter = request.GET.get('aadharNo') # Filter by Aadhar
            status_filter = request.GET.get('status') # Filter by status

            queryset = Appointment.objects.all()

            # Apply filters
            from_date_obj = parse_date_internal(from_date_str)
            to_date_obj = parse_date_internal(to_date_str)
            if from_date_obj: queryset = queryset.filter(date__gte=from_date_obj)
            if to_date_obj: queryset = queryset.filter(date__lte=to_date_obj)
            if aadhar_filter: queryset = queryset.filter(aadhar_no=aadhar_filter)
            if status_filter:
                 valid_statuses = [choice[0] for choice in Appointment.StatusChoices.choices]
                 if status_filter in valid_statuses: queryset = queryset.filter(status=status_filter)
                 else: logger.warning(f"Invalid status filter received: {status_filter}")

            appointments = queryset.order_by('date', 'time') # Sensible default order

            # Serialize data
            appointment_list = []
            for app in appointments:
                 app_data = model_to_dict(app)
                 app_data['date'] = app.date.isoformat() if app.date else None
                 app_data['booked_date'] = app.booked_date.isoformat() if app.booked_date else None
                 appointment_list.append(app_data)

            logger.info(f"Fetched {len(appointment_list)} appointments.")
            return JsonResponse({"appointments": appointment_list, "message": "Appointments fetched successfully."}, safe=False)

        except Exception as e:
             logger.exception("get_appointments failed: An unexpected error occurred.")
             return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid request. Use GET."}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt
def update_status(request):
    """Updates the status of an appointment based on its ID."""
    # Should be PUT or PATCH ideally
    if request.method == "POST":
        appointment_id = None
        try:
            data = json.loads(request.body.decode('utf-8')) 
            id = data.get("id")
            field = data.get("field")
            doctor = data.get("doctor")
            status_val = data.get("status") 
            print(id, field, doctor, status_val)
            if not id:
                 return JsonResponse({"success": False, "message": "Appointment ID ('id') is required."}, status=400)

            if field == "assessment":
                print("Hello")
                fitness = get_object_or_404(FitnessAssessment, mrdNo=id)
                if status_val == "inprogress" :
                    fitness.status = FitnessAssessment.StatusChoices.IN_PROGRESS
                    fitness.submittedDoctor = doctor
                elif status_val == "initiate":
                    fitness.status = FitnessAssessment.StatusChoices.INITIATE
                    fitness.submittedDoctor = ""
                fitness.save()
            elif field == "consultation":
                print("Hii")
                fitness = get_object_or_404(Consultation, mrdNo=id)
                if status_val == "inprogress" :
                    fitness.status = Consultation.StatusChoices.IN_PROGRESS
                    fitness.submittedDoctor = doctor
                elif status_val == "initiate":
                    fitness.status = Consultation.StatusChoices.INITIATE
                    fitness.submittedDoctor = ""
                fitness.save()
            logger.info(f"fitness status updated successfully for ID {id}. New status: {status_val}")
            return JsonResponse({"success": True, "message": "Status updated", "status": status_val})

        except Http404:
            logger.warning(f"update_fitness_status failed: fitness with ID {id} not found.")
            return JsonResponse({"success": False, "message": "fitness not found"}, status=404)
        except json.JSONDecodeError:
            logger.error("update_fitness_status failed: Invalid JSON data.", exc_info=True)
            return JsonResponse({"success": False, "message": "Invalid JSON data"}, status=400)
        except Exception as e:
            logger.exception(f"update_fitness_status failed for ID {id or 'Unknown'}: An unexpected error occurred.")
            return JsonResponse({"success": False, "message": "An unexpected server error occurred.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid request method (use POST/PUT/PATCH)."}, status=405)
        response['Allow'] = 'POST, PUT, PATCH' # Indicate allowed methods
        return response

import json
import logging
from datetime import datetime, date, timedelta, time
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Appointment, employee_details # Ensure you import your models

logger = logging.getLogger(__name__)

DATA_MAPPING = {
    "Employee": {
        "Preventive": {
            "Pre employment": "Medical Examination",
            "Pre employment (Food Handler)": "Medical Examination",
            "Pre Placement": "Medical Examination",
            "Annual / Periodical": "Medical Examination",
            "Periodical (Food Handler)": "Medical Examination",
            "Retirement medical examination": "Medical Examination",
            "Camps (Mandatory)": "Medical Examination",
            "Camps (Optional)": "Medical Examination",
            "Special Work Fitness": "Periodic Work Fitness",
            "Special Work Fitness (Renewal)": "Periodic Work Fitness",
            "Fitness After Medical Leave": "Fitness After Medical Leave",
            "Fitness After Personal Long Leave": "Fitness After Personal Long Leave",
            "Mock Drill": "Mock Drill",
            "BP Sugar Check  ( Normal Value)": "BP Sugar Check  ( Normal Value)",
            "Preventive - Follow Up Visits": "Follow Up Visits",
            "Preventive Other": "Other",
        },
        "Curative": {
            "Illness": "Outpatient",
            "Over Counter Illness": "Outpatient",
            "Injury": "Outpatient",
            "Over Counter Injury": "Outpatient",
            "Curative - Follow Up Visits": "Follow Up Visits",
            "BP Sugar Chart": "Outpatient",
            "Injury Outside the Premises": "Outpatient",
            "Over Counter Injury Outside the Premises": "Outpatient",
            "Alcohol Abuse": "Alcohol Abuse",
            "Curative Other": "Other",
        },
    },
    "Contractor": {
        "Preventive": {
            "Pre employment": "Medical Examination",
            "Pre employment (Food Handler)": "Medical Examination",
            "Pre Placement (Same Contract)": "Medical Examination",
            "Pre Placement (Contract change)": "Medical Examination",
            "Annual / Periodical": "Medical Examination",
            "Periodical (Food Handler)": "Medical Examination",
            "Camps (Mandatory)": "Medical Examination",
            "Camps (Optional)": "Medical Examination",
            "Special Work Fitness": "Periodic Work Fitness",
            "Special Work Fitness (Renewal)": "Periodic Work Fitness",
            "Fitness After Medical Leave": "Fitness After Medical Leave",
            "Fitness After Personal Long Leave": "Fitness After Personal Long Leave",
            "Mock Drill": "Mock Drill",
            "BP Sugar Check  ( Normal Value)": "BP Sugar Check  ( Normal Value)",
            "Preventive - Follow Up Visits": "Follow Up Visits",
            "Preventive Other": "Other",
        },
        "Curative": {
            "Illness": "Outpatient",
            "Over Counter Illness": "Outpatient",
            "Injury": "Outpatient",
            "Over Counter Injury": "Outpatient",
            "Curative - Follow Up Visits": "Outpatient",
            "BP Sugar ( Abnormal Value)": "BP Sugar Check  ( Abnormal Value)",
            "Injury Outside the Premises": "Outpatient",
            "Over Counter Injury Outside the Premises": "Outpatient",
            "Alcohol Abuse": "Alcohol Abuse",
            "Curative Other": "Other",
        },
    },
    "Visitor": {
        "Preventive": {
            "Fitness": "Fitness",
            "BP Sugar ( Normal Value)": "BP Sugar Check  ( Normal Value)",
            "Preventive - Follow Up Visits": "Follow Up Visits",
        },
        "Curative": {
            "Illness": "Outpatient",
            "Over Counter Illness": "Outpatient",
            "Injury": "Outpatient",
            "Over Counter Injury": "Outpatient",
            "Curative - Follow Up Visits": "Outpatient",
            "BP Sugar ( Abnormal Value)": "BP Sugar Check  ( Abnormal Value)",
            "Injury Outside the Premises": "Outpatient",
            "Over Counter Injury Outside the Premises": "Outpatient",
            "Curative Other": "Other",
        },
    },
}

import json
import logging
from datetime import datetime, date, timedelta, time
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Appointment, employee_details # Update with your actual model path

logger = logging.getLogger(__name__)

# --- Helper Functions ---
def parse_excel_date(value):
    if not value: return date.today()
    if isinstance(value, (int, float)):
        # Excel dates are usually days since Dec 30, 1899
        return (datetime(1899, 12, 30) + timedelta(days=value)).date()
    if isinstance(value, str):
        for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
            try: return datetime.strptime(value.strip(), fmt).date()
            except ValueError: continue
    return date.today()

def parse_excel_time(value):
    if not value: return datetime.now().time()
    if isinstance(value, (int, float)):
        # Convert Excel fraction of day to time
        total_seconds = int(value * 86400)
        return (datetime.min + timedelta(seconds=total_seconds)).time()
    if isinstance(value, str):
        for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p"):
            try: return datetime.strptime(value.strip(), fmt).time()
            except ValueError: continue
    return datetime.now().time()

def get_cell(row, index):
    try:
        val = row[index]
        return str(val).strip() if val is not None else ""
    except IndexError:
        return ""

def derive_visit_info(role, register):
    """
    Returns (visit_type, purpose) based on DATA_MAPPING
    """
    if role not in DATA_MAPPING:
        return "Preventive", "Other" # Default Fallback

    role_data = DATA_MAPPING[role]
    
    # Check Preventive Dictionary
    if register in role_data.get("Preventive", {}):
        return "Preventive", role_data["Preventive"][register]
    
    # Check Curative Dictionary
    if register in role_data.get("Curative", {}):
        return "Curative", role_data["Curative"][register]

    # Fallback if register spelling doesn't match exactly
    return "Preventive", "Other"

@csrf_exempt
def uploadAppointment(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        appointments_data = data.get("appointments", [])
        booked_by = data.get("bookedBy", "")
        # Expecting at least header + 1 row
        if not appointments_data or len(appointments_data) < 2:
            return JsonResponse({"error": "No valid data found in Excel."}, status=400)

        successful = 0
        failed = []

        # Iterate rows, skipping the header (start=1)
        for i, row in enumerate(appointments_data[1:], start=1):
            try:
                # --- 1. Extract Direct Fields (Order based on your Excel Image) ---
                # 0: Aadhar, 1: Role, 2: Register, 3: Follow Up Reason, 4: Date, 5: Time
                # 6: Year, 7: Batch, 8: Hospital, 9: Camp, 10: Booked By
                
                aadhar_no = get_cell(row, 0)
                register = get_cell(row, 1)
                
                # Validation
                if not aadhar_no or len(aadhar_no) != 12:
                    raise ValueError(f"Invalid Aadhar No: {aadhar_no}")
                if not register:
                    raise ValueError("Missing Register")

                # Parse Date/Time
                booked_date = parse_excel_date(row[3] if len(row) > 3 else None)
                booked_time = parse_excel_time(row[4] if len(row) > 4 else None)

                # --- 2. Retrieve Employee Details ---
                worker = employee_details.objects.filter(aadhar=aadhar_no).last()
                if worker: 
                    role = worker.type 
                if not worker:
                    if role == "Visitor":
                        name = "Visitor " + aadhar_no[-4:] 
                        emp_id = ""
                        organization = "Visitor Org"
                        contractor_name = ""
                    else:
                        raise ValueError(f"Worker with Aadhar {aadhar_no} not found in DB")
                else:
                    name = worker.name
                    emp_id = worker.emp_no
                    organization = worker.organization
                    contractor_name = worker.contractName if role == "Contractor" else ""

                # --- 3. Retrieve Dynamic Logic Fields ---
                visit_type, purpose = derive_visit_info(role, register)

                # --- 4. Handle Conditional Fields ---
                # "Follow Up Reason" column (Index 3) is overloaded based on Register
                col_dynamic_val = get_cell(row, 2) 
                
                bp_sugar_status = ""
                bp_sugar_reason = ""
                followup_reason = ""
                
                if "BP Sugar Check" in register:
                    bp_sugar_status = col_dynamic_val # e.g., "Normal People"
                elif "BP Sugar Chart" in register:
                    bp_sugar_reason = col_dynamic_val # e.g., "Newly detected"
                elif "Follow Up" in register:
                    followup_reason = col_dynamic_val # e.g., "Illness"

                # Other Conditionals (Index 6, 7, 8, 9)
                year = get_cell(row, 5)
                batch = get_cell(row, 6)
                hospital_name = get_cell(row, 7)
                camp_name = get_cell(row, 8)

                # --- 5. Save to Database ---
                with transaction.atomic():
                    # Generate Appt Number
                    today_count = Appointment.objects.filter(date=booked_date).select_for_update().count()
                    appt_no = f"{(today_count + 1):04d}{booked_date.strftime('%d%m%Y')}"

                    Appointment.objects.create(
                        appointment_no=appt_no,
                        aadhar=aadhar_no,
                        role=role,
                        name=name,
                        emp_no=emp_id,
                        organization_name=organization,
                        contractor_name=contractor_name,
                        
                        # Logic Fields
                        visit_type=visit_type,
                        register=register,
                        purpose=purpose,
                        
                        # Date/Time
                        date=booked_date,
                        time=booked_time,
                        booked_by=booked_by,
                        
                        # Conditionals
                        year=year,
                        batch=batch,
                        hospital_name=hospital_name,
                        camp_name=camp_name,
                        bp_sugar_status=bp_sugar_status,
                        bp_sugar_chart_reason=bp_sugar_reason,
                        followup_reason=followup_reason,
                        
                    )
                successful += 1

            except Exception as e:
                failed.append(f"Row {i} (Aadhar: {get_cell(row,0)}): {str(e)}")
                logger.error(f"Upload Error Row {i}: {e}")

        return JsonResponse({
            "message": f"Success: {successful}, Failed: {len(failed)}",
            "errors": failed
        }, status=200 if successful > 0 else 400)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)



@csrf_exempt
def add_prescription(request):
    """
    Adds a new prescription with MRD number and handles stock deduction.
    Each MRD number gets a new entry in the system.
    """
    if request.method != "POST":
        logger.warning(f"add_prescription failed: Invalid request method '{request.method}'. Only POST allowed.")
        response = JsonResponse({"error": "Request method must be POST"}, status=405)
        response['Allow'] = 'POST'
        return response

    data = None
    try:
        data = json.loads(request.body.decode('utf-8'))
        print("Data : ", data)

        # --- Extract Basic Information ---
        emp_no = data.get('emp_no')
        name = data.get('name')
        aadhar = data.get('aadhar')
        mrd_no = data.get('mrdNo')  # Get MRD number
        entry_date = timezone.now().date()  # Get current date

        print("MRD No : ", mrd_no)
        print("emp_no : ", emp_no)

        # --- Basic Validation ---
        if not mrd_no:
            logger.warning("add_prescription failed: MRD number is required")
            return JsonResponse({"error": "MRD number is required"}, status=400)
        if not emp_no:
            logger.warning("add_prescription failed: emp_no is required")
            return JsonResponse({"error": "Employee number (emp_no) is required"}, status=400)
        if not name:
            logger.warning("add_prescription failed: name is required")
            return JsonResponse({"error": "Employee name (name) is required"}, status=400)

        submitted_by = data.get('submitted_by')
        issued_by = data.get('issued_by')
        if not submitted_by or not issued_by:
            logger.warning("add_prescription failed: submitted_by and issued_by are required fields")
            return JsonResponse({"error": "submitted_by and issued_by are required fields"}, status=400)

        # --- Prepare prescription data ---
        prescription_data = {
            'emp_no': emp_no,
            'name': name,
            'aadhar': aadhar,
            'mrdNo': mrd_no,
            'tablets': data.get('tablets'),
            'syrups': data.get('syrups'),
            'injections': data.get('injections'),
            'creams': data.get('creams'),
            'drops': data.get('drops'),
            'fluids': data.get('fluids'),
            'lotions': data.get('lotions'),
            'powder': data.get('powder'),
            'respules': data.get('respules'),
            'suture_procedure': data.get('suture_procedure'),
            'dressing': data.get('dressing'),
            'others': data.get('others'),
            'submitted_by': submitted_by,
            'issued_by': issued_by,
            'nurse_notes': data.get('nurse_notes'),
            'issued_status': data.get('issued_status')
        }

        # Filter out None values
        prescription_data = {k: v for k, v in prescription_data.items() if v is not None}

        # --- Use update_or_create based on emp_no, mrdNo and entry_date ---
        prescription, created = Prescription.objects.update_or_create(
            emp_no=emp_no,
            mrdNo=mrd_no,
            entry_date=entry_date,
            defaults=prescription_data
        )

        message = "Prescription added successfully" if created else "Prescription updated successfully"
        return JsonResponse({
            "message": message,
            "emp_no": emp_no,
            "mrdNo": mrd_no,
            "entry_date": entry_date.isoformat()
        }, status=201 if created else 200)

    except json.JSONDecodeError:
        logger.error("add_prescription failed: Invalid JSON data.", exc_info=True)
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        logger.exception(f"add_prescription failed for emp_no {emp_no or 'Unknown'}: An unexpected error occurred.")
        return JsonResponse({"error": "An internal server error occurred while processing prescription."}, status=500)

@csrf_exempt
def view_prescriptions(request):
    
    if request.method == 'GET':
        prescriptions = Prescription.objects.all()
        data = []
        for prescription in prescriptions:
            print(prescription.aadhar)
            data.append({
                'id': prescription.id,
                'emp_no': prescription.emp_no,
                'aadhar': prescription.aadhar, # Include aadhar in response
                'name': prescription.name,  # Concatenate names
                'entry_date': prescription.entry_date.strftime('%Y-%m-%d'), # Format date,
                'issued_status': prescription.issued_status,  # Replace the status for view
                'prescription':{
                    'id': prescription.id,
                    'emp_no': prescription.emp_no,
                    'aadhar': prescription.aadhar, # Include aadhar in response
                    'name': f"{prescription.submitted_by} / {prescription.issued_by}",  # Concatenate names
                    'tablets':  prescription.tablets,
                    'syrups': prescription.syrups,
                    'injections':  prescription.injections,
                    'creams': prescription.creams,
                    'drops':  prescription.drops,
                    'fluids': prescription.fluids,
                    'lotions':  prescription.lotions,
                    'powder': prescription.powder,
                    'respules':  prescription.respules,
                    'suture_procedure': prescription.suture_procedure,
                    'others': prescription.others,
                    'dressing': prescription.dressing,
                    'submitted_by':  prescription.submitted_by,
                    'issued_by':  prescription.issued_by,
                    'nurse_notes': prescription.nurse_notes,
                    'entry_date': prescription.entry_date.strftime('%Y-%m-%d'), # Format date,
                    

                }
            })

        # print(data)

        return JsonResponse({'prescriptions': data})
    else:
        return JsonResponse({'error': 'Invalid request method. Only GET allowed.'}, status=405)

# --- Mock Drills / Camps / Reviews / Misc ---

@csrf_exempt
def save_mockdrills(request):
    if request.method == "POST":
        aadhar = None
        try:
            data = json.loads(request.body.decode('utf-8')) # Decode explicitly
            logger.debug(f"Received data for save_mockdrills: {json.dumps(data)[:500]}...")

            aadhar = data.get('aadhar') # Expect aadhar if victim is related
            emp_no_val = data.get('emp_no') # Keep emp_no if needed

            drill_date = parse_date_internal(data.get("date"))
            if not drill_date: return JsonResponse({"error": "Valid date is required"}, status=400)

            print(data.get('Action_Completion'))
            print(data.get('Responsible'))

            mock_drill_data = {
                'date': drill_date,
                'time': data.get("time"),
                'department': data.get("department"),
                'location': data.get("location"),
                'scenario': data.get("scenario"),
                'ambulance_timing': data.get("ambulance_timing"),
                'departure_from_OHC': data.get("departure_from_OHC"),
                'return_to_OHC': data.get("return_to_OHC"), 
                'aadhar': aadhar,
                'emp_no': emp_no_val,
                'victim_department': data.get("victim_department"),
                'victim_name': data.get("victim_name"),
                'nature_of_job': data.get("nature_of_job"),
                'age': parse_form_age(data.get("age")),
                'mobile_no': data.get("mobile_no"),
                'gender': data.get("gender"),
                'vitals': data.get("vitals"),
                'complaints': data.get("complaints"),
                'treatment': data.get("treatment"),
                'referal': data.get("referal"),
                'ambulance_driver': data.get("ambulance_driver"),
                'staff_name': data.get("staff_name"),
                'OHC_doctor': data.get("OHC_doctor"),
                'staff_nurse': data.get("staff_nurse"),
                'action_completion': data.get("Action_Completion"),
                'responsible': data.get("Responsible"),
            }

            filtered_data = {k: v for k, v in mock_drill_data.items() if v is not None}

            mock_drill = mockdrills.objects.create(**filtered_data)

            logger.info(f"Mock drill saved ID: {mock_drill.id}" + (f" for Aadhar: {aadhar}" if aadhar else ""))
            return JsonResponse({"message": f"Mock drill saved successfully", "id": mock_drill.id}, status=201)

        except json.JSONDecodeError:
            logger.error("save_mockdrills failed: Invalid JSON data.", exc_info=True)
            return JsonResponse({"error": "Invalid JSON data"}, status=400)
        except Exception as e:
            logger.exception(f"save_mockdrills failed (Aadhar: {aadhar or 'N/A'}): {e}")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid request method"}, status=405)
        response['Allow'] = 'POST'
        return response
@csrf_exempt
def get_mockdrills(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            from_date = data.get("from_date")
            to_date = data.get("to_date")
            print("Received:", from_date, to_date)

            # Your filtering logic here...
            queryset = mockdrills.objects.all()
            if from_date:
                queryset = queryset.filter(date__gte=from_date)
            if to_date:
                queryset = queryset.filter(date__lte=to_date)

            response_data = list(queryset.values())
            return JsonResponse(response_data, safe=False, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid request method"}, status=405)

@csrf_exempt # Keep if you are posting to it, but for GET it's not strictly needed. For simplicity, let's assume it's only GET.
def get_one_mockdrills(request):
    if request.method == "GET":
        try:
            # Order by 'id' descending is often a reliable way to get the latest created object
            # If you have a 'created_at' DateTimeField, that would be even better.
            # Using '-date', '-time' as per your model structure.
            latest_drill_qs = mockdrills.objects.all().order_by('-date', '-time').first()
            
            if latest_drill_qs:
                # model_to_dict converts the model instance to a dictionary.
                # The keys in this dictionary will be the model field names (e.g., 'action_completion', 'responsible').
                data_to_return = model_to_dict(latest_drill_qs)
            else:
                data_to_return = {} # Return an empty object if no drills are found

            return JsonResponse(data_to_return, safe=True) # safe=True because we are sending a dict

        except Exception as e:
            logger.exception("get_one_mockdrills failed.") # Corrected function name
            return JsonResponse({"error": "Server error retrieving latest mock drill.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid request method for get_one_mockdrills"}, status=405)
        response['Allow'] = 'GET'
        return response

# Camps/Events - No Aadhar dependency
@csrf_exempt
def add_camp(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8')) # Decode explicitly
            start_date_obj = parse_date_internal(data.get("start_date"))
            end_date_obj = parse_date_internal(data.get("end_date"))
            if not start_date_obj or not end_date_obj: return JsonResponse({"error": "Valid start_date and end_date required (YYYY-MM-DD)."}, status=400)
            if start_date_obj > end_date_obj: return JsonResponse({"error": "Start date cannot be after end date."}, status=400)
            camp_name = data.get("camp_name")
            if not camp_name: return JsonResponse({"error": "Camp name is required."}, status=400)

            camp_data = {
                'camp_name': camp_name, 'hospital_name': data.get("hospital_name"),
                'start_date': start_date_obj, 'end_date': end_date_obj,
                'camp_details': data.get("camp_details"), 'camp_type': data.get("camp_type", "Camp"),
            }
            filtered_data = {k:v for k,v in camp_data.items() if v is not None}

            camp = eventsandcamps.objects.create(**filtered_data)
            logger.info(f"Camp '{camp.camp_name}' saved ID: {camp.id}")
            return JsonResponse({"message": "Camp added successfully.", "id": camp.id}, status=201)
        except json.JSONDecodeError: return JsonResponse({"error": "Invalid JSON format."}, status=400)
        except Exception as e:
            logger.exception("add_camp failed.")
            return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use POST."}, status=405)
        response['Allow'] = 'POST'
        return response

# Use GET
def get_camps(request):
    if request.method == "GET":
        try:
            search_term = request.GET.get("searchTerm", "")
            filter_status = request.GET.get("filterStatus", "") # "Live" or specific camp_type
            date_from_str = request.GET.get("dateFrom")
            date_to_str = request.GET.get("dateTo")
            today = date.today()

            camps_qs = eventsandcamps.objects.all()
            if search_term: camps_qs = camps_qs.filter(Q(camp_name__icontains=search_term) | Q(camp_details__icontains=search_term))

            if filter_status == "Live": camps_qs = camps_qs.filter(start_date__lte=today, end_date__gte=today)
            elif filter_status: camps_qs = camps_qs.filter(camp_type=filter_status) # Filter by type if not "Live"

            date_from = parse_date_internal(date_from_str)
            date_to = parse_date_internal(date_to_str)
            if date_from: camps_qs = camps_qs.filter(start_date__gte=date_from)
            if date_to: camps_qs = camps_qs.filter(end_date__lte=date_to)

            camps_qs = camps_qs.order_by('-start_date', 'camp_name')
            data = []
            media_prefix = get_media_url_prefix(request)
            for camp in camps_qs:
                 camp_files = {ft: f"{media_prefix}{getattr(camp, ft).name}" if getattr(camp, ft) else None for ft in ['report1', 'report2', 'photos', 'ppt']}
                 data.append({
                     'id': camp.id, 'camp_name': camp.camp_name, 'hospital_name': camp.hospital_name,
                     'start_date': camp.start_date.isoformat() if camp.start_date else None,
                     'end_date': camp.end_date.isoformat() if camp.end_date else None,
                     'camp_details': camp.camp_details, 'camp_type': camp.camp_type,
                     **camp_files # Unpack file URLs
                 })
            return JsonResponse(data, safe=False)
        except Exception as e:
            logger.exception("get_camps failed.")
            return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt
def upload_files(request):
    # Handles file uploads for camps
    if request.method == 'POST':
        camp_id_str = request.POST.get('campId')
        file_type = request.POST.get('fileType') # e.g., 'report1', 'photos'
        uploaded_file = request.FILES.get('files') # Common key for the file
        print("Camp ID : ", camp_id_str)
        print("File Type : ", file_type)

        print("Uploaded File : ", uploaded_file)
        

        if not camp_id_str or not file_type or not uploaded_file:
            return JsonResponse({'error': 'campId, fileType, and file are required.'}, status=400)
        try:
            camp_id = int(camp_id_str)
        except ValueError:
            return JsonResponse({'error': 'Invalid campId.'}, status=400)

        valid_file_types = ['report1', 'report2', 'photos', 'ppt']
        if file_type not in valid_file_types:
            return JsonResponse({'error': f"Invalid file type '{file_type}'. Must be one of: {', '.join(valid_file_types)}"}, status=400)

        # Validate file extension
        file_extension = os.path.splitext(uploaded_file.name)[1].lower().strip('.')
        if file_extension not in ALLOWED_FILE_TYPES:
             return JsonResponse({'error': f"Disallowed file extension '{file_extension}'. Allowed: {', '.join(ALLOWED_FILE_TYPES)}"}, status=400)

        try:
            camp = get_object_or_404(eventsandcamps, pk=camp_id)

            # Delete old file before saving new one
            old_file_field = getattr(camp, file_type, None)
            if old_file_field and old_file_field.name:
                try:
                    if default_storage.exists(old_file_field.path):
                        default_storage.delete(old_file_field.path)
                        logger.info(f"Deleted old {file_type} for camp {camp_id}: {old_file_field.name}")
                except Exception as e:
                    logger.error(f"Error deleting old {file_type} for camp {camp_id}: {e}")

            # Save the new file
            setattr(camp, file_type, uploaded_file)
            camp.save(update_fields=[file_type]) # Save only the updated field

            new_file_field = getattr(camp, file_type)
            file_url = f"{get_media_url_prefix(request)}{new_file_field.name}" if new_file_field and new_file_field.name else None
            logger.info(f"File uploaded for camp {camp_id}, type {file_type}: {uploaded_file.name}")
            return JsonResponse({'message': 'File uploaded successfully.', 'file_url': file_url}, status=200)
        except Http404:
             return JsonResponse({'error': 'Camp not found.'}, status=404)
        except Exception as e:
             logger.exception(f"upload_files failed for camp {camp_id}, type {file_type}")
             return JsonResponse({'error': 'Failed to upload file.', 'detail': str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use POST."}, status=405)
        response['Allow'] = 'POST'
        return response

# Use GET
def download_file(request):
    # Handles file downloads for camps
    if request.method == 'GET':
        try:
            camp_id_str = request.GET.get('campId')
            file_type = request.GET.get('fileType')
            if not camp_id_str or not file_type: raise Http404("Missing campId or fileType parameter.")
            try: camp_id = int(camp_id_str)
            except ValueError: raise Http404("Invalid campId.")

            valid_types = ['report1', 'report2', 'photos', 'ppt']
            if file_type not in valid_types: raise Http404("Invalid file type.")

            camp = get_object_or_404(eventsandcamps, pk=camp_id)
            file_field = getattr(camp, file_type, None)

            if not file_field or not file_field.name: raise Http404(f"File '{file_type}' not found for this camp.")
            if not default_storage.exists(file_field.path): raise Http404("File not found in storage.")

            # Use FileResponse for efficient file serving
            response = FileResponse(default_storage.open(file_field.path, 'rb'), as_attachment=True)
            # response['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_field.name)}"' # Optional: Set filename explicitly
            return response
        except Http404 as e:
            logger.warning(f"download_file failed: {e}")
            return HttpResponse(str(e), status=404)
        except Exception as e:
            logger.exception("download_file failed.")
            return HttpResponse("Server error.", status=500)
    else:
         response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
         response['Allow'] = 'GET'
         return response

@csrf_exempt
def delete_file(request):
    # Should ideally be DELETE, using POST for now
    if request.method == 'POST':
        camp_id_str = None # Initialize
        try:
            data = json.loads(request.body.decode('utf-8')) # Decode explicitly
            camp_id_str = data.get('campId')
            file_type = data.get('fileType')
            if not camp_id_str or not file_type: return JsonResponse({'error': 'campId and fileType required.'}, status=400)
            try: camp_id = int(camp_id_str)
            except ValueError: return JsonResponse({'error': 'Invalid campId.'}, status=400)

            valid_types = ['report1', 'report2', 'photos', 'ppt']
            if file_type not in valid_types: return JsonResponse({'error': f"Invalid file type."}, status=400)

            camp = get_object_or_404(eventsandcamps, pk=camp_id)
            file_field = getattr(camp, file_type, None)

            if file_field and file_field.name:
                 file_path = file_field.path # Get path before clearing
                 file_name = file_field.name # Get name for logging
                 setattr(camp, file_type, None) # Clear the field reference
                 camp.save(update_fields=[file_type]) # Save the change
                 # Now attempt to delete from storage
                 try:
                     if default_storage.exists(file_path):
                          default_storage.delete(file_path)
                          logger.info(f"File '{file_name}' deleted from storage for camp {camp_id}, type {file_type}")
                          return JsonResponse({'message': 'File deleted successfully.'}, status=200)
                     else:
                          logger.warning(f"File '{file_name}' not found in storage for camp {camp_id}, type {file_type}, but reference removed.")
                          return JsonResponse({'message': 'File reference removed, but file not found in storage.'}, status=200) # Still success from DB perspective
                 except Exception as e:
                     logger.error(f"Error deleting file from storage camp {camp_id}, type {file_type}: {e}")
                     # Field reference is already removed, report storage error
                     return JsonResponse({'message': 'File reference removed, but error deleting from storage.', 'error_detail': str(e)}, status=500)
            else:
                 # No file was associated with the field
                 return JsonResponse({'message': 'No file Contractor with this type to delete.'}, status=200)
        except Http404: return JsonResponse({'error': 'Camp not found'}, status=404)
        except json.JSONDecodeError: return JsonResponse({'error': 'Invalid JSON.'}, status=400)
        except Exception as e:
            logger.exception(f"delete_file failed for camp {camp_id_str or 'Unknown'}.")
            return JsonResponse({'error': "Server error.", 'detail': str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use POST or DELETE."}, status=405)
        response['Allow'] = 'POST, DELETE' # Indicate allowed methods
        return response


# Reviews - No Aadhar dependency
def get_categories(request):
    if request.method == 'GET':
        try:
            categories = list(ReviewCategory.objects.values("id", "name").order_by("name"))
            return JsonResponse({"categories": categories}, safe=False)
        except Exception as e:
            logger.exception("get_categories failed.")
            return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({'error': 'Invalid method. Use GET.'}, status=405)
        response['Allow'] = 'GET'
        return response

def get_reviews(request, status):
    if request.method == 'GET':
        try:
            # Basic status validation (can add more checks if needed)
            if not status: return JsonResponse({"error": "Status parameter is required."}, status=400)

            reviews = list(Review.objects.filter(status=status).select_related('category')
                           .order_by('-appointment_date') # Order by most recent
                           .values("id", "pid", "name", "gender", "appointment_date", "category__name"))

            for review in reviews:
                if isinstance(review.get('appointment_date'), date):
                    review['appointment_date'] = review['appointment_date'].isoformat()

            return JsonResponse({"reviews": reviews}, safe=False)
        except Exception as e:
            logger.exception(f"get_reviews failed for status '{status}'.")
            return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({'error': 'Invalid method. Use GET.'}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt
def add_review(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8')) # Decode explicitly

            required = ['category', 'pid', 'name', 'gender', 'appointment_date', 'status']
            missing = [f for f in required if data.get(f) is None]
            if missing: return JsonResponse({"error": f"Missing required fields: {', '.join(missing)}"}, status=400)

            # Get or create category
            category_name = data["category"]
            if not category_name: return JsonResponse({"error": "Category name cannot be empty."}, status=400)
            category, _ = ReviewCategory.objects.get_or_create(name=category_name)

            appointment_date_obj = parse_date_internal(data["appointment_date"])
            if not appointment_date_obj: return JsonResponse({"error": "Invalid appointment_date format (YYYY-MM-DD)."}, status=400)

            review_data = {
                'category': category, 'pid': data["pid"], 'name': data["name"],
                'gender': data["gender"], 'appointment_date': appointment_date_obj,
                'status': data["status"]
            }
            filtered_data = {k:v for k,v in review_data.items() if v is not None}

            review = Review.objects.create(**filtered_data)
            logger.info(f"Review saved ID: {review.id}")
            return JsonResponse({"message": "Review added successfully", "id": review.id}, status=201)
        except json.JSONDecodeError: return JsonResponse({"error": "Invalid JSON format."}, status=400)
        except Exception as e:
            logger.exception("add_review failed.")
            return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use POST."}, status=405)
        response['Allow'] = 'POST'
        return response


# --- Aggregate/All Data Fetching ---

@csrf_exempt # Should be GET
def dashboard_stats(request):
    if request.method == 'GET':
        try:
            from_date_str = request.GET.get("fromDate")
            to_date_str = request.GET.get("toDate")
            visit_type_filter = request.GET.get("visitType")
            entity_filter = request.GET.get("entityType")
            today = date.today()

            from_date_obj = parse_date_internal(from_date_str) if from_date_str else today
            to_date_obj = parse_date_internal(to_date_str) if to_date_str else today
            if from_date_obj > to_date_obj: from_date_obj, to_date_obj = to_date_obj, from_date_obj

            queryset = Dashboard.objects.filter(date__range=[from_date_obj, to_date_obj])
            if visit_type_filter in ["Preventive", "Curative"]: queryset = queryset.filter(type_of_visit=visit_type_filter)
            entity_mapping = {"Employee": "Employee", "Contractor": "Contractor", "Visitor": "Visitor"}
            if entity_filter in entity_mapping: queryset = queryset.filter(type=entity_mapping[entity_filter])

            # Calculate counts efficiently
            type_counts = list(queryset.values("type").annotate(count=Count("id")).order_by("-count"))
            type_of_visit_counts = list(queryset.values("type_of_visit").annotate(count=Count("id")).order_by("-count"))
            register_counts = list(queryset.values("register").annotate(count=Count("id")).order_by("-count"))
            purpose_counts = list(queryset.values("purpose").annotate(count=Count("id")).order_by("-count"))
            total_count = queryset.count()

            data = {
                "type_counts": type_counts, "type_of_visit_counts": type_of_visit_counts,
                "register_counts": register_counts, "purpose_counts": purpose_counts,
                "total_count": total_count
            }
            return JsonResponse(data, safe=False)
        except Exception as e:
            logger.exception("Error in dashboard_stats view.")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({'error': 'Invalid request method. Use GET.'}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt # Should be GET
def fetchVisitdataAll(request):
    if request.method == "POST": # Use POST
        try:
            visits_qs = Dashboard.objects.all().order_by('-date', '-id')
            visits = []
            for v in visits_qs:
                 v_data = model_to_dict(v); v_data['date'] = v.date.isoformat() if v.date else None
                 visits.append(v_data)
            logger.info(f"Fetched all {len(visits)} visit records.")
            return JsonResponse({"message": "All visit data fetched successfully", "data": visits}, status=200)
        except Exception as e:
            logger.exception("fetchVisitdataAll failed.")
            return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid request method (use GET)."}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt # Should be GET
def fetchFitnessData(request):
    if request.method == "POST": # Use POST
        try:
            fitness_qs = FitnessAssessment.objects.all().order_by('-entry_date', '-id')
            fitness_data = []
            for r in fitness_qs:
                 r_data = model_to_dict(r)
                 r_data['entry_date'] = r.entry_date.isoformat() if r.entry_date else None
                 r_data['validity'] = r.validity.isoformat() if r.validity else None
                 fitness_data.append(r_data)
            logger.info(f"Fetched all {len(fitness_data)} fitness records.")
            return JsonResponse({"message": "All fitness data fetched successfully", "data": fitness_data}, status=200)
        except Exception as e:
            logger.exception("fetchFitnessData failed.")
            return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid request method (use GET)."}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt # Should be GET
def get_notes_all(request):
    if request.method == 'GET': # Use GET
        try:
            notes_qs = SignificantNotes.objects.all().order_by('-entry_date', '-id')
            consultations_qs = Consultation.objects.all().order_by('-entry_date', '-id')

            notes = []
            for n in notes_qs:
                 n_data = model_to_dict(n); n_data['entry_date'] = n.entry_date.isoformat() if n.entry_date else None
                 notes.append(n_data)
            consultations = []
            for c in consultations_qs:
                 c_data = model_to_dict(c); c_data['entry_date'] = c.entry_date.isoformat() if c.entry_date else None
                 c_data['follow_up_date'] = c.follow_up_date.isoformat() if c.follow_up_date else None
                 consultations.append(c_data)

            logger.info(f"Fetched all notes ({len(notes)}) and consultations ({len(consultations)}).")
            return JsonResponse({'notes': notes, 'consultation': consultations})
        except Exception as e:
            logger.exception("get_notes_all failed.")
            return JsonResponse({'error': "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({'error': 'Invalid method. Use GET.'}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt # Should be GET
def view_prescriptions(request):
    if request.method == 'GET':
        try:
            prescriptions_qs = Prescription.objects.all().order_by('-entry_date', '-id')
            data = []
            for p in prescriptions_qs:
                p_data = model_to_dict(p)
                p_data['entry_date'] = p.entry_date.isoformat() if p.entry_date else None
                data.append(p_data)
            logger.info(f"Fetched {len(data)} prescriptions.")
            return JsonResponse({'prescriptions': data})
        except Exception as e:
            logger.exception("view_prescriptions failed.")
            return JsonResponse({'error': "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({'error': 'Invalid method. Use GET.'}, status=405)
        response['Allow'] = 'GET'
        return response

# --- Pharmacy / Inventory / Calibration (Continued) ---

# Added missing import for FieldError
from django.core.exceptions import FieldError
from django.db.models import F # Added for potential future optimisations

# Helper to avoid repeating stock/history lookups
def get_total_quantity(entry_date, medicine_form, brand_name, chemical_name, dose_volume, expiry_date):
    """
    Try to fetch total_quantity from PharmacyStock or PharmacyStockHistory.
    Prioritize PharmacyStock if available.
    """
    try:
        # Check active stock first
        stock = PharmacyStock.objects.filter(
            # entry_date=entry_date, # Entry date might not be the best key here if stock is aggregated
            medicine_form=medicine_form, brand_name=brand_name, chemical_name=chemical_name,
            dose_volume=dose_volume, expiry_date=expiry_date
        ).first()
        if stock and hasattr(stock, 'total_quantity') and stock.total_quantity is not None:
            return stock.total_quantity

        # If not in active stock, check history (use latest entry for this combo if needed)
        stock_history = PharmacyStockHistory.objects.filter(
            # entry_date=entry_date, # Might need to find based on other keys if entry date isn't reliable
            medicine_form=medicine_form, brand_name=brand_name, chemical_name=chemical_name,
            dose_volume=dose_volume, expiry_date=expiry_date
        ).order_by('-entry_date').first() # Get the most recent history record

        return stock_history.total_quantity if stock_history and hasattr(stock_history, 'total_quantity') else 0 # Default to 0 if not found
    except Exception as e:
        logger.error(f"Error getting total quantity for {brand_name}/{chemical_name}: {e}")
        return 0 # Return 0 or None on error


@csrf_exempt # Should be GET
def get_stock_history(request):
    """ Fetch stock history (archived/consumed items) """
    if request.method == 'GET':
        try:
            stock_data = PharmacyStockHistory.objects.all().order_by(
                "medicine_form", "brand_name", "chemical_name", "dose_volume", "expiry_date", "-entry_date"
            ).values() # Fetch all fields

            data = []
            for entry in stock_data:
                # Format dates safely
                entry_date_fmt = entry.get("entry_date").strftime("%Y-%m-%d") if entry.get("entry_date") else None
                expiry_date_fmt = entry.get("expiry_date").strftime("%b-%y") if entry.get("expiry_date") else None
                archive_date_fmt = entry.get("archive_date").strftime("%Y-%m-%d") if entry.get("archive_date") else None

                data.append({
                    "entry_date": entry_date_fmt,
                    "medicine_form": entry.get("medicine_form"),
                    "brand_name": entry.get("brand_name"),
                    "chemical_name": entry.get("chemical_name"),
                    "dose_volume": entry.get("dose_volume"),
                    "total_quantity_recorded": entry.get("total_quantity"), # Use the actual quantity recorded in history
                    "expiry_date": expiry_date_fmt,
                    "archive_date": archive_date_fmt # Include archive date
                })

            return JsonResponse({"stock_history": data}, safe=False)
        except Exception as e:
            logger.exception("Error in get_stock_history")
            return JsonResponse({"error": "Server error fetching stock history.", "detail": str(e)}, status=500)
    else:
         response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
         response['Allow'] = 'GET'
         return response
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction, models
from django.db.models import F
import json
from datetime import datetime, date
import logging

# Ensure you import your models
# from .models import PharmacyStock, PharmacyMedicine, PharmacyStockHistory

logger = logging.getLogger(__name__)

@csrf_exempt
def add_stock(request):
    """ Adds new stock to PharmacyStock and creates a corresponding history record. """
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8'))
            logger.debug(f"Add Stock Received Data: {data}")

            # 1. Extract Common Data
            medicine_form = data.get("medicine_form")
            brand_name = data.get("brand_name") # Frontend sends 'Item Name' here for Sutures
            quantity_str = data.get("quantity")
            expiry_date_str = data.get("expiry_date") # Expect YYYY-MM
            
            # Extract these, but we might overwrite them based on category
            chemical_name_input = data.get("chemical_name")
            dose_volume_input = data.get("dose_volume")

            # 2. Define Special Categories
            # special_categories = ["SutureAndProcedureItems", "Dressing Items"]

            # 3. Conditional Logic
            # if medicine_form in special_categories:
            #     # ✅ CASE 1: Sutures / Dressings
            #     # Force Chemical and Dose to None (Database NULL)
            #     chemical_name = None
            #     dose_volume = None

            #     # Validate only: Form, Item Name, Qty, Expiry
            #     if not all([medicine_form, brand_name, quantity_str, expiry_date_str]):
            #         return JsonResponse({"error": "Item Name, Quantity, and Expiry Date are required."}, status=400)
            
            # else:
            #     # ✅ CASE 2: Standard Medicines (Tablets, Syrups, etc.)
            #     # Use the inputs provided
            chemical_name = chemical_name_input
            dose_volume = dose_volume_input

            # Validate ALL fields
            if not all([medicine_form, brand_name, chemical_name, dose_volume, quantity_str, expiry_date_str]):
                return JsonResponse({"error": "All fields (Form, Brand, Chemical, Dose, Qty, Expiry) are required"}, status=400)

            # 4. Parse Quantity and Date
            try:
                quantity = int(quantity_str)
                if quantity <= 0: raise ValueError("Quantity must be positive")
            except (ValueError, TypeError):
                 return JsonResponse({"error": "Invalid quantity provided. Must be a positive integer."}, status=400)
            
            try:
                 # Parse YYYY-MM. Default to 1st of the month.
                 expiry_date = datetime.strptime(f"{expiry_date_str}-01", "%Y-%m-%d").date()
            except ValueError:
                 return JsonResponse({"error": "Invalid expiry date format. Use YYYY-MM."}, status=400)

            entry_date = date.today()

            # 5. Database Operations
            with transaction.atomic():
                
                # A. Handle Master Record (PharmacyMedicine)
                # We assume PharmacyMedicine model also allows null=True for chemical/dose
                medicine_entry, created = PharmacyMedicine.objects.get_or_create(
                    medicine_form=medicine_form,
                    brand_name=brand_name,
                    chemical_name=chemical_name, # Will be None for Sutures
                    dose_volume=dose_volume,     # Will be None for Sutures
                    defaults={'entry_date': entry_date}
                )
                
                # B. Handle Stock Record (PharmacyStock)
                # Check for existing stock with same details AND expiry date
                stock_item, stock_created = PharmacyStock.objects.select_for_update().get_or_create(
                    medicine_form=medicine_form,
                    brand_name=brand_name,
                    chemical_name=chemical_name, # Will be None for Sutures
                    dose_volume=dose_volume,     # Will be None for Sutures
                    expiry_date=expiry_date,
                    defaults={
                        'entry_date': entry_date,
                        'quantity': quantity,
                        'total_quantity': quantity
                    }
                )

                if not stock_created:
                    # If batch exists, increase quantity
                    stock_item.quantity = F('quantity') + quantity
                    stock_item.total_quantity = F('total_quantity') + quantity
                    stock_item.entry_date = entry_date 
                    stock_item.save()
                    logger.info(f"Updated Stock ID {stock_item.id}: Added {quantity}")
                else:
                     logger.info(f"Created Stock ID {stock_item.id}: Qty {quantity}")

                # C. Handle History Record
                PharmacyStockHistory.objects.create(
                    entry_date=entry_date,
                    medicine_form=medicine_form,
                    brand_name=brand_name,
                    chemical_name=chemical_name, # Stores None for Sutures
                    dose_volume=dose_volume,     # Stores None for Sutures
                    total_quantity=quantity,
                    expiry_date=expiry_date,
                )

            return JsonResponse({"message": "Stock added successfully"}, status=201)

        except json.JSONDecodeError: return JsonResponse({"error": "Invalid JSON format"}, status=400)
        except Exception as e:
            logger.exception("Error in add_stock:")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Invalid request method"}, status=405)
# --- Other Pharmacy helpers ---

@csrf_exempt # Should be GET
def get_brand_names(request):
    if request.method == 'GET':
        try:
            chemical_name = request.GET.get("chemical_name", "").strip()
            print("Hi : ",chemical_name)
            medicine_form = request.GET.get("medicine_form", "").strip()
            query = request.GET.get("query", "").strip()
            suggestions = set()

            filters = Q()
            if chemical_name: filters &= Q(chemical_name__iexact=chemical_name)
            if medicine_form: filters &= Q(medicine_form__iexact=medicine_form)
            if query and len(query) >= 2: filters |= Q(brand_name__istartswith=query) # Combine with OR if query present

            if filters: # Only query if filters exist
                brand_names = PharmacyMedicine.objects.filter(filters).values_list("brand_name", flat=True).distinct()
                suggestions.update(brand_names)

            return JsonResponse({"suggestions": sorted(list(suggestions))}) # Convert set to list

        except Exception as e:
            logger.exception("Error in get_brand_names")
            return JsonResponse({"error": str(e)}, status=500)
    else:
         response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
         response['Allow'] = 'GET'
         return response

@csrf_exempt # Should be GET
def get_dose_volume(request):
    if request.method == 'GET':
        try:
            brand_name = request.GET.get("brand_name", "").strip()
            chemical_name = request.GET.get("chemical_name", "").strip()
            medicine_form = request.GET.get("medicine_form", "").strip()

            if not brand_name or not chemical_name or not medicine_form:
                return JsonResponse({"suggestions": []}) # Return empty list if params missing

            dose_suggestions = list(
                PharmacyMedicine.objects.filter(
                    brand_name__iexact=brand_name,
                    chemical_name__iexact=chemical_name,
                    medicine_form__iexact=medicine_form
                ).values_list("dose_volume", flat=True).distinct()
            )
            return JsonResponse({"suggestions": dose_suggestions})
        except Exception as e:
            logger.exception("Error in get_dose_volume")
            return JsonResponse({"error": str(e)}, status=500)
    else:
         response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
         response['Allow'] = 'GET'
         return response

@csrf_exempt # Should be GET
def get_chemical_name_by_brand(request):
    # This seems redundant with get_chemical_name, assuming brand is unique enough?
    # Keeping it, but might be combined later.
    if request.method == 'GET':
        try:
            brand_name = request.GET.get("brand_name", "").strip()
            medicine_form = request.GET.get("medicine_form", "").strip() # Form might be needed to disambiguate

            if not brand_name or not medicine_form:
                return JsonResponse({"suggestions": []})

            suggestions = list(
                PharmacyMedicine.objects.filter(brand_name__iexact=brand_name, medicine_form__iexact=medicine_form)
                .values_list("chemical_name", flat=True).distinct()
            )
            return JsonResponse({"suggestions": suggestions})
        except Exception as e:
            logger.exception("Error in get_chemical_name_by_brand")
            return JsonResponse({"error": str(e)}, status=500)
    else:
         response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
         response['Allow'] = 'GET'
         return response


@csrf_exempt # Should be GET
def get_chemical_name_by_chemical(request):
    if request.method == 'GET':
        try:
            chemical_name = request.GET.get("chemical_name", "").strip()
            medicine_form = request.GET.get("medicine_form", "").strip()

            if not chemical_name or not medicine_form:
                return JsonResponse({"suggestions": []})

            suggestions = list(
                PharmacyMedicine.objects.filter(chemical_name__istartswith=chemical_name, medicine_form__iexact=medicine_form)
                .values_list("chemical_name", flat=True).distinct()
            )
            return JsonResponse({"suggestions": suggestions, "data": medicine_form})
        except Exception as e:
            logger.exception("Error in get_chemical_name_by_brand")
            return JsonResponse({"error": str(e)}, status=500)
    else:
         response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
         response['Allow'] = 'GET'
         return response


@csrf_exempt # Should be GET
def get_chemical_name(request):
     # Simpler version - assumes brand name is enough? Might return multiple if ambiguous.
    if request.method == 'GET':
        try:
            brand_name = request.GET.get("brand_name", "").strip()
            if not brand_name: return JsonResponse({"chemical_name": None}) # Return None if no brand provided

            # Find the first chemical name matching the brand (case-insensitive)
            chemical_name = PharmacyMedicine.objects.filter(brand_name__iexact=brand_name)\
                             .values_list("chemical_name", flat=True).first()

            return JsonResponse({"chemical_name": chemical_name}) # Returns None if not found
        except Exception as e:
            logger.exception("Error in get_chemical_name")
            return JsonResponse({"error": str(e)}, status=500)
    else:
         response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
         response['Allow'] = 'GET'
         return response

@csrf_exempt # Should be GET
def get_current_stock(request):
    """ Fetch current stock, summing quantities for identical items/batches. """
    if request.method == 'GET':
        try:
            # Group by all identifying fields including expiry date to sum quantities per batch
            stock_data = (
                PharmacyStock.objects
                .values("medicine_form", "brand_name", "chemical_name", "dose_volume", "expiry_date")
                .annotate(
                    total_quantity_batch=Sum("total_quantity"), # Sum total quantity for this batch
                    quantity_batch=Sum("quantity"), # Sum current quantity for this batch
                    latest_entry_date=Max("entry_date") # Get the latest entry date for this batch
                )
                .filter(quantity_batch__gt=0) # Only include batches with quantity > 0
                .order_by("medicine_form", "brand_name", "chemical_name", "dose_volume", "expiry_date")
            )

            data = [
                {
                    "entry_date" : entry["latest_entry_date"].isoformat() if entry["latest_entry_date"] else None,
                    "medicine_form": entry["medicine_form"],
                    "brand_name": entry["brand_name"],
                    "chemical_name": entry["chemical_name"],
                    "dose_volume": entry["dose_volume"],
                    "total_quantity": entry["total_quantity_batch"], # Use summed total
                    "quantity_expiry": entry["quantity_batch"], # Use summed current quantity
                    "expiry_date": entry["expiry_date"].strftime("%b-%y") if entry["expiry_date"] else None,
                }
                for entry in stock_data
            ]
            return JsonResponse({"stock": data}, safe=False)
        except Exception as e:
            logger.exception("Error in get_current_stock")
            return JsonResponse({"error": "Server error fetching current stock.", "detail": str(e)}, status=500)
    else:
         response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
         response['Allow'] = 'GET'
         return response

@csrf_exempt # Should be POST? Or part of a scheduled task?
def get_current_expiry(request):
    """
    Identifies stock expiring this month or next month, moves it to ExpiryRegister,
    deletes it from PharmacyStock, and returns the current ExpiryRegister items.
    """
    # This endpoint modifies data, POST might be more appropriate than GET,
    # although it also returns data. Consider splitting if needed.
    if request.method == 'POST':
        try:
            today = date.today()
            current_month = today.month; current_year = today.year
            next_month_date = today + relativedelta(months=1)
            next_month = next_month_date.month; next_year = next_month_date.year
            with transaction.atomic():
                # Find medicines expiring exactly in the current month OR exactly in the next month
                expiry_medicines = PharmacyStock.objects.select_for_update().filter(
                    Q(expiry_date__year=current_year, expiry_date__month=current_month) |
                    Q(expiry_date__year=next_year, expiry_date__month=next_month)
                )
                medicines_processed_count = 0
                for medicine in expiry_medicines:
                    print("Medicine to expire: ",medicine)
                    ExpiryRegister.objects.create(
                        entry_date=medicine.entry_date, 
                        medicine_form=medicine.medicine_form, brand_name=medicine.brand_name,
                        chemical_name=medicine.chemical_name, dose_volume=medicine.dose_volume,
                        quantity=medicine.quantity, # Record the quantity at time of expiry flagging
                        expiry_date=medicine.expiry_date,
                        total_quantity = medicine.total_quantity
                    )
                    medicine.delete() 
                    medicines_processed_count += 1

                logger.info(f"Processed {medicines_processed_count} soon-to-expire medicines.")

            # Fetch medicines from ExpiryRegister not yet marked as removed
            expired_data_qs = ExpiryRegister.objects.filter(removed_date__isnull=True).order_by('expiry_date')
            expired_data = list(expired_data_qs.values(
                "id", "medicine_form", "brand_name", "chemical_name", "dose_volume", "quantity", "expiry_date", "total_quantity"
            ))

            data = [
                {
                    "id": entry["id"], "medicine_form": entry["medicine_form"], "brand_name": entry["brand_name"],
                    "chemical_name": entry["chemical_name"], "dose_volume": entry["dose_volume"],
                    "quantity": entry["quantity"],
                    "expiry_date": entry["expiry_date"].strftime("%b-%y") if entry["expiry_date"] else "N/A",
                    "total_quantity": entry["total_quantity"]
                }
                for entry in expired_data
            ]
            return JsonResponse({"expiry_stock": data, "processed_count": medicines_processed_count}, safe=False)

        except Exception as e:
            logger.exception("Error processing expiry register.")
            return JsonResponse({"error": f"An internal server error occurred: {str(e)}"}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use POST."}, status=405)
        response['Allow'] = 'POST'
        return response

try:
    from .models import DailyQuantity
except ImportError:
    logging.critical("Failed to import DailyQuantity model. Ensure it's defined in models.py and the import path is correct.")
    # Raise configuration error during startup if essential model is missing
    raise ImproperlyConfigured("DailyQuantity model is not available.")

try:
    # Replace 'PharmacyStock' with your actual stock model name
    from .models import PharmacyStock
    HAS_STOCK_MODEL = True
    if PharmacyStock is None:
        raise ImportError("PharmacyStock imported as None") # Be explicit if import results in None
except ImportError:
    HAS_STOCK_MODEL = False
    logging.warning("Optional PharmacyStock model not found or failed to import. Fetching logic will rely solely on DailyQuantity, which might be incomplete for identifying all possible stock items.")

@csrf_exempt
def update_pharmacy_stock(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Invalid method. Use POST."}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))

        chemical_name = data.get("chemicalName")
        brand_name = data.get("brandName")
        expiry_date = data.get("expiryDate")
        dose_volume = data.get("doseVolume")
        quantity = data.get("quantity")
        action = data.get("action")

        if not all([chemical_name, brand_name, expiry_date, dose_volume, action]):
            return JsonResponse({"error": "Missing required fields."}, status=400)

        if not isinstance(quantity, (int, float)) or quantity <= 0:
            return JsonResponse({"error": "Quantity must be a positive number."}, status=400)

        if action not in ['increase', 'decrease']:
            return JsonResponse({"error": "Invalid action."}, status=400)

        from datetime import datetime
        expiry_date = datetime.strptime(expiry_date, "%Y-%m-%d").date()

        with transaction.atomic():
            medicine = PharmacyStock.objects.select_for_update().get(
                chemical_name=chemical_name,
                brand_name=brand_name,
                dose_volume=dose_volume,
                expiry_date=expiry_date
            )

            current_quantity = medicine.quantity

            if action == 'decrease':
                if current_quantity < quantity:
                    return JsonResponse({
                        "error": "Insufficient stock",
                        "current_stock": current_quantity
                    }, status=400)
                medicine.quantity = F('quantity') - quantity
            else:
                medicine.quantity = F('quantity') + quantity

            medicine.save(update_fields=['quantity'])

            if action == 'decrease':
                daily_record, _ = DailyQuantity.objects.get_or_create(
                    chemical_name=chemical_name,
                    brand_name=brand_name,
                    dose_volume=dose_volume,
                    expiry_date=expiry_date,
                    date=timezone.now().date(),
                    defaults={'quantity': 0}
                )
                daily_record.quantity = F('quantity') + quantity
                daily_record.save(update_fields=['quantity'])

        return JsonResponse({"success": True, "message": "Stock updated successfully"})

    except PharmacyStock.DoesNotExist:
        return JsonResponse({"error": "Medicine stock not found."}, status=404)
    except Exception as e:
        logger.exception("Error updating pharmacy stock")
        return JsonResponse({"error": str(e)}, status=500)



def get_days_in_month(year, month):
    """Returns the number of days in a given month (1-indexed)."""
    if not (1 <= month <= 12):
        raise ValueError("Month must be between 1 and 12")
    if month == 12:
        next_month_first_day = date(year + 1, 1, 1)
    else:
        next_month_first_day = date(year, month + 1, 1)
    last_day_current_month = next_month_first_day - timedelta(days=1)
    return last_day_current_month.day

def parse_expiry_date(date_str):
    # ... (implementation from previous answer) ...
    if not date_str or not isinstance(date_str, str): return None
    try:
        parsed = django_parse_date(date_str)
        if parsed: return parsed
        else:
             try: return date.fromisoformat(date_str) # Strict ISO YYYY-MM-DD
             except ValueError:
                 try: # Handle potential datetime string with timezone
                    parsed_dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    return parsed_dt.date()
                 except ValueError:
                    logger.warning(f"Could not parse expiry date string: {date_str}")
                    return None
    except Exception as e:
        logger.error(f"Unexpected error during expiry date parsing for '{date_str}': {e}")
        return None


@csrf_exempt
def get_prescription_in_data(request):

    if request.method != "GET":
        return JsonResponse({"error": "GET required"}, status=405)

    try:
        today = timezone.now().date()
        year = int(request.GET.get("year", today.year))
        month = int(request.GET.get("month", today.month))

        start_date = date(year, month, 1)
        days_in_req_month = get_days_in_month(year, month)
        end_date = date(year, month, days_in_req_month)

        # STEP 1 — FETCH UNIQUE ITEMS
        stock_fields = ["chemical_name", "brand_name", "dose_volume", "expiry_date"]

        if HAS_STOCK_MODEL and PharmacyStock:
            unique_items = PharmacyStock.objects.values(*stock_fields).distinct()
        else:
            unique_items = DailyQuantity.objects.values(*stock_fields).distinct()

        unique_items = list(unique_items)

        # STEP 2 — FETCH DAILY QUANTITIES
        daily_qs = DailyQuantity.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).values(
            "chemical_name", "brand_name", "dose_volume",
            "expiry_date", "date", "quantity"
        )

        # STEP 3 — BUILD LOOKUP MAP
        daily_map = {}

        for row in daily_qs:
            if row["date"] is None:
                continue  # skip entries without date

            chem = row["chemical_name"] or "General Items"
            brand = row["brand_name"] or "Unknown Brand"
            dose = row["dose_volume"]
            if dose is None or dose == "N/A":
                dose = ""

            expiry = row["expiry_date"]

            key = (chem, brand, dose, expiry)

            day = row["date"].day
            qty = row.get("quantity", 0)

            if key not in daily_map:
                daily_map[key] = {}

            daily_map[key][day] = qty

        # STEP 4 — BUILD FINAL STRUCTURE
        result = []
        chem_groups = {}
        s_no = 1

        for item in unique_items:
            chem = item.get("chemical_name") or "General Items"
            brand = item.get("brand_name") or "Unknown Brand"
            dose = item.get("dose_volume")
            if dose is None or dose == "N/A":
                dose = ""
            expiry = item.get("expiry_date")
            expiry_str = expiry.isoformat() if expiry else None

            # CREATE GROUP IF NOT EXISTS
            if chem not in chem_groups:
                chem_groups[chem] = len(result)
                result.append({
                    "s_no": s_no,
                    "chemical_name": chem,
                    "brands": []
                })
                s_no += 1

            group_index = chem_groups[chem]

            key = (chem, brand, dose, expiry)
            daily_raw = daily_map.get(key, {})

            daily_formatted = {}
            monthly_total = 0

            for d in range(1, days_in_req_month + 1):
                qty = daily_raw.get(d, 0)
                daily_formatted[f"day_{d}"] = qty if qty != 0 else ""
                monthly_total += qty

            result[group_index]["brands"].append({
                "brand_name": brand,
                "dosage": dose,
                "daily_quantities": daily_formatted,
                "monthly_total": monthly_total,
                "expiry_date": expiry_str
            })

        return JsonResponse(result, safe=False)

    except Exception as e:
        logger.exception("Error in get_prescription_in_data")
        return JsonResponse({"error": str(e)}, status=500)

import json
# =================================================================
# === FIX 1: ADJUST THE IMPORTS FOR CLARITY AND CORRECTNESS     ===
# =================================================================
from datetime import datetime, time, date

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.forms.models import model_to_dict

# Assume your models are imported here...

@csrf_exempt
def get_investigation_details(request, aadhar):
    if request.method == "POST":
        try:
            print(f"Request received for Aadhar: {aadhar}")
            if not employee_details.objects.filter(aadhar=aadhar).exists():
                return JsonResponse({'error': f'No employee found with Aadhar: {aadhar}'}, status=404)
            
            from_date_str = None
            to_date_str = None
            if request.body:
                try:
                    data = json.loads(request.body)
                    from_date_str = data.get('fromDate')
                    to_date_str = data.get('toDate')
                except json.JSONDecodeError:
                    pass

            model_map = {
                'heamatalogy': heamatalogy,
                'routinesugartests': RoutineSugarTests,
                'lipidprofile': LipidProfile,
                'liverfunctiontest': LiverFunctionTest,
                'thyroidfunctiontest': ThyroidFunctionTest,
                'renalfunctiontests_and_electrolytes': RenalFunctionTest,
                'urineroutinetest': UrineRoutineTest,
                'autoimmunetest': AutoimmuneTest,
                'coagulationtest': CoagulationTest,
                'enzymescardiacprofile': EnzymesCardiacProfile,
                'urineroutinetest': UrineRoutineTest,
                'serologytest': SerologyTest,
                'motiontest': MotionTest,
                'culturesensitivitytest': CultureSensitivityTest,
                'menspack' : MensPack,
                'womenspack' : WomensPack,
                'occupationalprofile': OccupationalProfile,
                'otherstest': OthersTest,
                'opthalmicreport': OphthalmicReport,
                'xray': XRay,
                'usgreport' : USGReport,
                'ctreport' : CTReport,
                'mrireport' : MRIReport,
            }

            response_data = {}

            for key, model in model_map.items():
                try:
                    query = model.objects.filter(aadhar=aadhar)

                    if from_date_str and to_date_str:
                        
                        to_date_obj = datetime.strptime(to_date_str, '%Y-%m-%d').date()
                        
                        # Use datetime.combine and time.max directly
                        to_datetime_end_of_day = datetime.combine(to_date_obj, time.max)
                        
                        query = query.filter(entry_date__gte=from_date_str, entry_date__lte=to_datetime_end_of_day)
                    
                    all_records = query.order_by('-entry_date')

                    records_list = []
                    for record_instance in all_records:
                        record_dict = model_to_dict(record_instance)

                        if hasattr(record_instance, 'entry_date'):
                            record_dict['entry_date'] = record_instance.entry_date

                        for field_name, field_value in record_dict.items():
                            # Use `date` and `datetime` from the import
                            if isinstance(field_value, (date, datetime)):
                                record_dict[field_name] = field_value.isoformat()
                        
                        records_list.append(record_dict)

                    response_data[key] = records_list
                
                except Exception as e:
                    print(f"--> NOTICE: Skipping model '{key}' due to an error. Details: {type(e).__name__}: {str(e)}")
                    continue

            return JsonResponse(response_data, status=200)

        except Exception as e:
            print(f"!!! CRITICAL ERROR: An unexpected error occurred in the view. Details: {str(e)}")
            return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Invalid request method. Please use POST.'}, status=405)


@csrf_exempt
@transaction.atomic
def update_daily_quantities(request):
    """
    Receives daily quantity updates and saves them based on
    chemical, brand, dose, expiry_date, and date.
    """
    if DailyQuantity is None:
        return JsonResponse({'error': 'Server configuration error: DailyQuantity model not available.'}, status=500)

    if request.method != 'POST':
        logger.warning("update_daily_quantities rejected non-POST request")
        return JsonResponse({'error': 'POST method required'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        if not isinstance(data, list):
            raise ValueError("Invalid data format: Expected a list of quantity updates.")

        updated_count = 0
        created_count = 0
        skipped_count = 0
        processed_entries = 0

        logger.info(f"Received {len(data)} entries for daily quantity update.")
        print(f"--- Starting Daily Quantity Update Transaction ---") # DEBUG START

        for entry in data:
            processed_entries += 1
            print(f"\n--- Processing Entry #{processed_entries} ---") # DEBUG ENTRY START
            print(f"  Raw Entry Data: {entry}") # DEBUG RAW

            # --- Extract and Validate ---
            chem_name = entry.get('chemical_name')
            brand_name = entry.get('brand_name')
            dose_volume = entry.get('dose_volume') # Keep original type for now
            expiry_date_str = entry.get('expiry_date')
            year = entry.get('year')
            month = entry.get('month')
            day = entry.get('day')
            quantity_val = entry.get('quantity')

            # Refined Validation
            valid = True
            if not (isinstance(chem_name, str) and chem_name): valid = False; logger.warning(f"Invalid chem_name: {chem_name}")
            if not (isinstance(brand_name, str) and brand_name): valid = False; logger.warning(f"Invalid brand_name: {brand_name}")
            if dose_volume is None: valid = False; logger.warning(f"Missing dose_volume") # Check presence
            if not isinstance(year, int): valid = False; logger.warning(f"Invalid year type: {type(year)}")
            if not (isinstance(month, int) and 1 <= month <= 12): valid = False; logger.warning(f"Invalid month: {month}")
            if not (isinstance(day, int) and 1 <= day <= 31): valid = False; logger.warning(f"Invalid day: {day}")
            if not (isinstance(quantity_val, int) and quantity_val >= 0): valid = False; logger.warning(f"Invalid quantity: {quantity_val}")

            if not valid:
                logger.warning(f"Skipping entry #{processed_entries} due to missing/invalid core data types.")
                skipped_count += 1
                continue

            # --- Parse Dates and Quantity ---
            try:
                entry_date = date(year, month, day)
                entry_expiry_date = parse_expiry_date(expiry_date_str)
                entry_quantity = quantity_val # Already validated
                print(f"  Parsed Date: {entry_date} ({type(entry_date)})") # DEBUG PARSED
                print(f"  Parsed Expiry: {entry_expiry_date} ({type(entry_expiry_date)})") # DEBUG PARSED
                print(f"  Parsed Quantity: {entry_quantity} ({type(entry_quantity)})") # DEBUG PARSED
            except (ValueError, TypeError) as e:
                logger.warning(f"Skipping entry #{processed_entries} due to invalid date during object creation ({e}): {entry}")
                skipped_count += 1
                continue

            # --- Prepare for DB Operation ---
            # Convert dose_volume to string for lookup IF model uses CharField
            # *** ADJUST THIS if your model field is DecimalField/FloatField etc. ***
            dose_volume_str = str(dose_volume)

            lookup_keys = {
                'chemical_name': chem_name,
                'brand_name': brand_name,
                'dose_volume': dose_volume_str,
                'expiry_date': entry_expiry_date,
                'date': entry_date,
            }
            defaults = {
                'quantity': entry_quantity,
                # Add expiry to defaults as well, in case it needs updating or setting on create
                'expiry_date': entry_expiry_date, # Keep original expiry unless specific logic added
            }
            print(f"  Lookup Keys for DB: {lookup_keys}") # DEBUG KEYS
            print(f"  Defaults for DB: {defaults}") # DEBUG DEFAULTS

            # --- Database update_or_create ---
            try:
                obj, created = DailyQuantity.objects.update_or_create(
                    defaults=defaults,
                    **lookup_keys
                )
                action = "CREATED" if created else "UPDATED"
                print(f"  DB Result: {action} record with ID: {obj.id}") # DEBUG DB RESULT
                if created: created_count += 1
                else: updated_count += 1
            except Exception as db_error:
                 logger.error(f"Database error processing entry #{processed_entries} {lookup_keys}: {db_error}")
                 print(f"  DB ERROR: {db_error}") # DEBUG DB ERROR
                 skipped_count += 1
                 # Decide on transaction strategy: continue or rollback?
                 # To rollback on first error: transaction.set_rollback(True); raise db_error
                 # Current behavior: log error and continue with next entry

        # --- Response ---
        msg = f'Daily quantities processed: {created_count} created, {updated_count} updated, {skipped_count} skipped out of {processed_entries} received.'
        logger.info(msg)
        print(f"--- Finished Daily Quantity Update Transaction: {msg} ---") # DEBUG END
        status_code = 200 if skipped_count == 0 else 207
        return JsonResponse({
            'message': msg,
            'created': created_count, 'updated': updated_count,
            'skipped': skipped_count, 'received': processed_entries
        }, status=status_code)

    # --- General Error Handling ---
    except json.JSONDecodeError:
        logger.error("update_daily_quantities failed: Invalid JSON.")
        print("--- ERROR: Invalid JSON received ---") # DEBUG JSON ERROR
        return JsonResponse({'error': 'Invalid JSON format.'}, status=400)
    except ValueError as ve:
         logger.error(f"update_daily_quantities validation failed: {ve}")
         print(f"--- ERROR: Validation Error - {ve} ---") # DEBUG VALIDATION ERROR
         return JsonResponse({'error': str(ve)}, status=400)
    except Exception as e:
        logger.exception("update_daily_quantities failed unexpectedly.")
        print(f"--- CRITICAL ERROR: {type(e).__name__} - {e} ---") # DEBUG UNEXPECTED ERROR
        return JsonResponse({'error': f'An unexpected server error occurred: {type(e).__name__}'}, status=500)

        from django.http import JsonResponse


@csrf_exempt
def remove_expired_medicine(request):
    """ Mark expired medicine as removed and update history archive date. """
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8')) # Decode explicitly
            medicine_id = data.get("id")
            if not medicine_id: return JsonResponse({"error": "Medicine ID ('id') is required."}, status=400)

            with transaction.atomic():
                medicine = ExpiryRegister.objects.select_for_update().get(id=medicine_id)

                if medicine.removed_date is not None:
                    return JsonResponse({"error": "Medicine already marked as removed."}, status=400)

                today = date.today()
                medicine.removed_date = today
                medicine.save(update_fields=['removed_date'])

                

            return JsonResponse({"message": "Medicine removed successfully", "success": True})

        except ExpiryRegister.DoesNotExist: return JsonResponse({"error": "Medicine not found in expiry register"}, status=404)
        except json.JSONDecodeError: return JsonResponse({"error": "Invalid JSON format."}, status=400)
        except Exception as e:
            logger.exception(f"Error removing expired medicine ID {medicine_id or 'N/A'}")
            return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
    else:
         response = JsonResponse({"error": "Invalid request. Use POST."}, status=405)
         response['Allow'] = 'POST'
         return response



@csrf_exempt # Should be GET
def get_expiry_register(request):
    """ Fetch history of removed/expired medicines from ExpiryRegister. """
    if request.method == 'GET':
        try:
            from_date_str = request.GET.get("from_date")
            to_date_str = request.GET.get("to_date")

            queryset = ExpiryRegister.objects.filter(removed_date__isnull=False) # Only show those marked removed

            from_date = parse_date_internal(from_date_str)
            to_date = parse_date_internal(to_date_str)
            if from_date: queryset = queryset.filter(removed_date__gte=from_date)
            if to_date: queryset = queryset.filter(removed_date__lte=to_date)

            expired_medicines = queryset.order_by('-removed_date').values( # Order by removal date
                "id", "entry_date", "medicine_form", "brand_name", "chemical_name", "dose_volume",
                "quantity", "expiry_date", "removed_date", "total_quantity"
            )

            data = []
            for entry in expired_medicines:
                # Fetch total quantity using the helper
                total_quantity = get_total_quantity(
                    entry["entry_date"], entry["medicine_form"], entry["brand_name"],
                    entry["chemical_name"], entry["dose_volume"], entry["expiry_date"]
                )
                data.append({
                    "id": entry["id"],
                    "medicine_form": entry["medicine_form"], "brand_name": entry["brand_name"],
                    "chemical_name": entry["chemical_name"], "dose_volume": entry["dose_volume"],
                    "quantity": entry["quantity"], # Quantity at time of expiry flagging
                    "expiry_date": entry["expiry_date"].strftime("%b-%y") if entry["expiry_date"] else "",
                    "removed_date": entry["removed_date"].strftime("%d-%b-%Y") if entry["removed_date"] else "", # More specific format
                    "total_quantity": entry["total_quantity"] # Show original total quantity if found
                })

            return JsonResponse({"expiry_register": data}, safe=False)
        except Exception as e:
            logger.exception("Error in get_expiry_register")
            return JsonResponse({"error": "Server error fetching expiry register.", "detail": str(e)}, status=500)
    else:
         response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
         response['Allow'] = 'GET'
         return response

@csrf_exempt
def get_expiry_dates(request):
    if request.method == 'GET':
        try:
            chemical_name = request.GET.get("chemical_name", "").strip()
            brand_name = request.GET.get("brand_name", "").strip()
            dose_volume = request.GET.get("dose_volume", "").strip()

            logger.debug(f"get_expiry_dates: chemical_name='{chemical_name}', brand_name='{brand_name}', dose_volume='{dose_volume}'")

            if not chemical_name or not brand_name or not dose_volume:
                return JsonResponse({"suggestions": ["Hii"]})

            # Important: Filter by exact values
            expiry_dates = (
                PharmacyStock.objects.filter(  # Use PharmacyStock model
                    chemical_name__iexact=chemical_name,
                    brand_name__iexact=brand_name,
                    dose_volume__iexact=dose_volume  # Case-insensitive
                )
                .values_list("expiry_date", flat=True)
                .distinct()
                .order_by("expiry_date")
            )

            formatted_expiry_dates = [date.strftime('%Y-%m-%d') for date in expiry_dates if date] 
            logger.debug(f"Expiry dates for {chemical_name}, {brand_name}, {dose_volume}: {formatted_expiry_dates}")
            return JsonResponse({"suggestions": formatted_expiry_dates})

        except Exception as e:
            logger.exception("get_expiry_dates failed: An unexpected error occurred.")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)
    return JsonResponse({"error": "Invalid request method. Use GET."}, status=405)



@csrf_exempt  # Should be GET, review if you want to keep it exempt or not
def get_quantity_suggestions(request):
    if request.method == 'GET':
        try:
            chemical_name = request.GET.get("chemical_name", "").strip()
            brand_name = request.GET.get("brand_name", "").strip()
            expiry_date = request.GET.get("expiry_date", "").strip() # Get expiry date from request

            if not chemical_name or not brand_name or not expiry_date:
                return JsonResponse({"suggestions": []})

            # Query PharmacyStock objects matching criteria
            #Using Q objects for more complex query logic to handle different cases
            quantities = PharmacyStock.objects.filter(
                Q(chemical_name__iexact=chemical_name) &
                Q(brand_name__iexact=brand_name) &
                Q(expiry_date=expiry_date) # Match expiry date directly, format must match YYYY-MM-DD
            ).values_list("quantity", flat=True).distinct().order_by("quantity") #Distinct and order by quantity

            #Convert to list and log output
            qty_suggestions = list(quantities)

            logger.debug(f"Quantity suggestions for {chemical_name}, {brand_name}, {expiry_date}: {qty_suggestions}")
            return JsonResponse({"suggestions": qty_suggestions})

        except ValueError as ve: #Catch Value Errors when incorrect date formats passed
            logger.error(f"Date parsing error: {ve}")
            return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD.", "detail": str(ve)}, status=400)

        except Exception as e:
            logger.exception("get_quantity_suggestions failed: An unexpected error occurred.")
            return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)
    return JsonResponse({"error": "Invalid request method. Use GET."}, status=405)


@csrf_exempt
def get_discarded_medicines(request):
    if request.method == 'GET':
        try:
            discarded_qs = DiscardedMedicine.objects.all()

            # ---- Date filters ----
            from_date_str = request.GET.get('from_date')
            to_date_str = request.GET.get('to_date')

            from_date = parse_date_internal(from_date_str)
            to_date = parse_date_internal(to_date_str)

            if from_date:
                discarded_qs = discarded_qs.filter(entry_date__gte=from_date)

            if to_date:
                discarded_qs = discarded_qs.filter(entry_date__lte=to_date)

            # ---- Build response ----
            data = []
            for entry in discarded_qs.order_by('-entry_date'):

                data.append({
                    "id": entry.id,
                    "medicine_form": entry.medicine_form,
                    "brand_name": entry.brand_name,
                    "chemical_name": entry.chemical_name,
                    "dose_volume": entry.dose_volume,
                    "quantity": entry.quantity,   # discarded qty
                    "expiry_date": entry.expiry_date.strftime("%b-%y") if entry.expiry_date else "",
                    "reason": entry.reason,
                    "entry_date": entry.entry_date.strftime("%d-%b-%Y") if entry.entry_date else "",
                })

            return JsonResponse({"discarded_medicines": data})

        except Exception as e:
            logger.exception("Error in get_discarded_medicines")
            return JsonResponse(
                {"error": "Server error.", "detail": str(e)},
                status=500
            )

    else:
        response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt
def add_discarded_medicine(request):
    """ Record a discarded medicine and reduce stock accordingly. """
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8'))

            # 1. Extract Data
            medicine_form = data.get("medicine_form")
            brand_name = data.get("brand_name")
            quantity_str = data.get("quantity")
            expiry_date_str = data.get("expiry_date")  # Expect YYYY-MM-DD
            reason = data.get("reason")
            chemical_name = data.get("chemical_name")
            dose_volume = data.get("dose_volume")

            # 2. Special Category Logic
            special_categories = [""]

            if medicine_form in special_categories:
                chemical_name = None
                dose_volume = None

                if not all([medicine_form, brand_name, quantity_str, expiry_date_str, reason]):
                    return JsonResponse({"error": "Item Name, Quantity, Expiry, and Reason are required."}, status=400)
            else:
                if not all([medicine_form, brand_name, chemical_name, dose_volume, quantity_str, expiry_date_str, reason]):
                    return JsonResponse({"error": "All fields are required."}, status=400)

            # 3. Parse Numbers and Dates
            try:
                quantity_to_discard = int(quantity_str)
                if quantity_to_discard <= 0:
                    raise ValueError
            except:
                return JsonResponse({"error": "Invalid quantity."}, status=400)

            try:
                expiry_date = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
            except ValueError:
                return JsonResponse({"error": "Invalid expiry date format."}, status=400)

            entry_date = date.today()

            with transaction.atomic():
                # --- A. Find the EXACT batch to discard from (PharmacyStock) ---
                stock_item = PharmacyStock.objects.select_for_update().filter(
                    medicine_form=medicine_form,
                    brand_name=brand_name,
                    expiry_date=expiry_date
                ).filter(
                    Q(chemical_name=chemical_name) |
                    Q(chemical_name__isnull=True) |
                    Q(chemical_name="")
                ).filter(
                    Q(dose_volume=dose_volume) |
                    Q(dose_volume__isnull=True) |
                    Q(dose_volume="")
                ).first()

                print("=== INPUT RECEIVED ===")
                print("medicine_form:", medicine_form)
                print("brand_name:", brand_name)
                print("chemical_name:", chemical_name)
                print("dose_volume:", dose_volume)
                print("expiry_date:", expiry_date_str)

                print("\n=== DATABASE STOCK ITEMS ===")
                for s in PharmacyStock.objects.filter(
                    medicine_form=medicine_form,
                    brand_name=brand_name
                ):
                    print({
                        "chemical_name": s.chemical_name,
                        "brand_name": s.brand_name,
                        "dose_volume": s.dose_volume,
                        "expiry_date": str(s.expiry_date),
                        "quantity": s.quantity
                    })

                if not stock_item:
                    return JsonResponse({"error": "Stock batch not found. Check details and expiry date."}, status=404)

                if stock_item.quantity < quantity_to_discard:
                    return JsonResponse({"error": f"Insufficient stock. Available: {stock_item.quantity}"}, status=400)

                # Reduce Stock
                stock_item.quantity -= quantity_to_discard
                stock_item.save()

                # --- B. Create Discard Record (Log) ---
                DiscardedMedicine.objects.create(
                    entry_date=entry_date,
                    medicine_form=medicine_form,
                    brand_name=brand_name,
                    chemical_name=chemical_name,
                    dose_volume=dose_volume,
                    quantity=quantity_to_discard,
                    expiry_date=expiry_date,
                    reason=reason
                )

                # --- C. Update Daily Quantity (For PrescriptionIn Grid) ---
                daily_qty, created = DailyQuantity.objects.get_or_create(
                    date=entry_date,
                    chemical_name=chemical_name,
                    brand_name=brand_name,
                    dose_volume=dose_volume if dose_volume else "N/A",
                    expiry_date=expiry_date,
                    defaults={'quantity': 0}
                )

                daily_qty.quantity = F('quantity') + quantity_to_discard
                daily_qty.save()

            return JsonResponse({"message": "Medicine discarded, stock reduced, and daily usage updated successfully."}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)
@csrf_exempt
def get_ward_consumables(request):
    if request.method == 'GET':
        try:
            consumables_qs = WardConsumables.objects.all()

            # ---- Date Filters ----
            from_date_str = request.GET.get("from_date")
            to_date_str = request.GET.get("to_date")

            from_date = parse_date_internal(from_date_str)
            to_date = parse_date_internal(to_date_str)

            if from_date:
                consumables_qs = consumables_qs.filter(consumed_date__gte=from_date)

            if to_date:
                consumables_qs = consumables_qs.filter(consumed_date__lte=to_date)

            # ---- Build Response ----
            data = []
            for entry in consumables_qs.order_by("-consumed_date", "-entry_date"):
                total_quantity = get_total_quantity(
                    entry.entry_date,
                    entry.medicine_form,
                    entry.brand_name,
                    entry.chemical_name,
                    entry.dose_volume,
                    entry.expiry_date
                )

                data.append({
                    "id": entry.id,
                    "medicine_form": entry.medicine_form,
                    "brand_name": entry.brand_name,
                    "chemical_name": entry.chemical_name,
                    "dose_volume": entry.dose_volume,
                    "quantity": entry.quantity,

                    # Original total quantity in stock
                    "total_quantity": total_quantity,

                    "expiry_date": entry.expiry_date.strftime("%b-%y") if entry.expiry_date else None,

                    # Date consumed
                    "consumed_date": entry.consumed_date.strftime("%d-%b-%Y") if entry.consumed_date else None,
                })

            return JsonResponse({"ward_consumables": data})

        except Exception as e:
            logger.exception("Error in get_ward_consumables")
            return JsonResponse(
                {"error": "Server error.", "detail": str(e)},
                status=500
            )

    else:
        response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
        response["Allow"] = "GET"
        return response

@csrf_exempt
def add_ward_consumable(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8'))
            logger.debug(f"Ward Consumable Data: {data}")

            # -------------------------
            # 1. Extract Input Fields
            # -------------------------
            medicine_form = data.get("medicine_form")
            brand_name = data.get("brand_name")
            quantity_str = data.get("quantity")
            expiry_date_str = data.get("expiry_date")      # YYYY-MM
            consumed_date_str = data.get("consumed_date")  # YYYY-MM-DD

            chemical_name = data.get("chemical_name")
            dose_volume = data.get("dose_volume")

            
            special_categories = []

            if medicine_form in special_categories:
                chemical_name = None
                dose_volume = None

                if not all([medicine_form, brand_name, quantity_str, expiry_date_str, consumed_date_str]):
                    return JsonResponse({"error": "Item Name, Quantity, Expiry and Consumed Date are required."},
                                        status=400)
            else:
                if not all([
                    medicine_form, brand_name, chemical_name, dose_volume,
                    quantity_str, expiry_date_str, consumed_date_str
                ]):
                    return JsonResponse({"error": "All fields including Chemical Name and Dose/Volume are required."},
                                        status=400)

            
            try:
                quantity_to_consume = int(quantity_str)
                if quantity_to_consume <= 0:
                    raise ValueError
            except:
                return JsonResponse({"error": "Invalid quantity."}, status=400)

            try:
                print("Parsing expiry date:", expiry_date_str)
                expiry_date = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
            except:
                return JsonResponse({"error": "Invalid expiry date format. Use YYYY-MM."}, status=400)

            try:
                consumed_date = datetime.strptime(consumed_date_str, "%Y-%m-%d").date()
            except:
                return JsonResponse({"error": "Invalid consumed date format. Use YYYY-MM-DD."}, status=400)

            entry_date = date.today()

            # -------------------------
            # 4. Stock Matching (Flexible Like Discard Logic)
            # -------------------------
            with transaction.atomic():

                print("\n=== INPUT RECEIVED FOR WARD CONSUMPTION ===")
                print("medicine_form:", medicine_form)
                print("brand_name:", brand_name)
                print("chemical_name:", chemical_name)
                print("dose_volume:", dose_volume)
                print("expiry_date:", expiry_date_str)

                print("\n=== DATABASE STOCK ITEMS ===")
                for s in PharmacyStock.objects.filter(medicine_form=medicine_form, brand_name=brand_name):
                    print({
                        "chemical_name": s.chemical_name,
                        "dose_volume": s.dose_volume,
                        "brand_name": s.brand_name,
                        "expiry_date": str(s.expiry_date),
                        "quantity": s.quantity
                    })

                stock_item = PharmacyStock.objects.select_for_update().filter(
                    medicine_form=medicine_form,
                    brand_name=brand_name,
                    expiry_date=expiry_date
                ).filter(
                    Q(chemical_name=chemical_name) |
                    Q(chemical_name__isnull=True) |
                    Q(chemical_name="")
                ).filter(
                    Q(dose_volume=dose_volume) |
                    Q(dose_volume__isnull=True) |
                    Q(dose_volume="")
                ).first()

                if not stock_item:
                    return JsonResponse({"error": "Matching batch not found in Pharmacy Stock."}, status=404)

                if stock_item.quantity < quantity_to_consume:
                    return JsonResponse({
                        "error": f"Not enough stock. Available: {stock_item.quantity}"
                    }, status=400)

                # -------------------------
                # 5. Reduce Stock
                # -------------------------
                stock_item.quantity -= quantity_to_consume
                stock_item.save()

                # -------------------------
                # 6. Save Ward Consumption
                # -------------------------
                WardConsumables.objects.create(
                    entry_date=entry_date,
                    medicine_form=medicine_form,
                    brand_name=brand_name,
                    chemical_name=chemical_name,
                    dose_volume=dose_volume,
                    quantity=quantity_to_consume,
                    expiry_date=expiry_date,
                    consumed_date=consumed_date
                )

                # -------------------------
                # 7. Update Daily Quantity (Same as Discard Logic)
                # -------------------------
                daily_qty, created = DailyQuantity.objects.get_or_create(
                    date=entry_date,
                    chemical_name=chemical_name,
                    brand_name=brand_name,
                    dose_volume=dose_volume if dose_volume else "N/A",
                    expiry_date=expiry_date,
                    defaults={'quantity': 0}
                )

                daily_qty.quantity = F('quantity') + quantity_to_consume
                daily_qty.save()

            logger.info(f"Ward consumed: {quantity_to_consume} of {brand_name}")

            return JsonResponse({
                "message": "Ward consumption added, stock reduced and daily usage updated successfully.",
                "success": True
            }, status=201)

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        except Exception as e:
            logger.exception("Error in ward consumption.")
            return JsonResponse({"error": "Server error", "detail": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method."}, status=405)

@csrf_exempt
def get_ambulance_consumables(request):
    if request.method == 'GET':
        try:
            consumables_qs = AmbulanceConsumables.objects.all()

            # --- Date filters ---
            from_date_str = request.GET.get("from_date")
            to_date_str = request.GET.get("to_date")

            from_date = parse_date_internal(from_date_str)
            to_date = parse_date_internal(to_date_str)

            if from_date:
                consumables_qs = consumables_qs.filter(consumed_date__gte=from_date)

            if to_date:
                consumables_qs = consumables_qs.filter(consumed_date__lte=to_date)

            # --- Build response ---
            data = []
            for entry in consumables_qs.order_by("-consumed_date", "-entry_date"):
                data.append({
                    "id": entry.id,
                    "medicine_form": entry.medicine_form,
                    "brand_name": entry.brand_name,
                    "chemical_name": entry.chemical_name,
                    "dose_volume": entry.dose_volume,
                    "quantity": entry.quantity,   # consumed qty
                    "expiry_date": entry.expiry_date.strftime("%b-%y") if entry.expiry_date else None,
                    "consumed_date": entry.consumed_date.strftime("%d-%b-%Y") if entry.consumed_date else None,
                })

            return JsonResponse({"ambulance_consumables": data})

        except Exception as e:
            logger.exception("Error in get_ambulance_consumables")
            return JsonResponse(
                {"error": "Server error.", "detail": str(e)},
                status=500
            )

    else:
        response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt
def add_ambulance_consumable(request):
    """ Record consumable used in Ambulance and reduce stock (same logic as discard/ward). """
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        logger.debug(f"Ambulance Consumable Data: {data}")

        # ----------------------------------------------------
        # 1. Extract Request Fields
        # ----------------------------------------------------
        medicine_form = data.get("medicine_form")
        brand_name = data.get("brand_name")
        quantity_str = data.get("quantity")
        expiry_date_str = data.get("expiry_date")  # Expect YYYY-MM or YYYY-MM-DD
        consumed_date_str = data.get("consumed_date")
        chemical_name = data.get("chemical_name")
        dose_volume = data.get("dose_volume")

        # ----------------------------------------------------
        # 2. Special Category Logic
        # ----------------------------------------------------
        special_categories = []

        if medicine_form in special_categories:
            # For special categories, ignore chemical_name and dose_volume
            chemical_name = None
            dose_volume = None

            # Only medicine_form and brand_name are required
            if not all([medicine_form, brand_name]):
                return JsonResponse({"error": "Item Name and Brand Name are required."}, status=400)
        else:
            # For regular medicines, all fields are required
            if not all([medicine_form, brand_name, chemical_name, dose_volume, quantity_str, expiry_date_str, consumed_date_str]):
                return JsonResponse({"error": "All fields are required."}, status=400)

        # ----------------------------------------------------
        # 3. Parse Numbers and Dates
        # ----------------------------------------------------
        quantity_to_consume = None
        if quantity_str:
            try:
                quantity_to_consume = int(quantity_str)
                if quantity_to_consume <= 0:
                    raise ValueError
            except ValueError:
                return JsonResponse({"error": "Invalid quantity."}, status=400)

        expiry_date = None
        if expiry_date_str:
            try:
                # Support YYYY-MM or YYYY-MM-DD
                if len(expiry_date_str) == 7:
                    expiry_date = datetime.strptime(f"{expiry_date_str}-01", "%Y-%m-%d").date()
                else:
                    expiry_date = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
            except ValueError:
                return JsonResponse({"error": "Invalid expiry date format."}, status=400)

        consumed_date = None
        if consumed_date_str:
            try:
                consumed_date = datetime.strptime(consumed_date_str, "%Y-%m-%d").date()
            except ValueError:
                return JsonResponse({"error": "Invalid consumed date format. Use YYYY-MM-DD."}, status=400)

        entry_date = date.today()

        # ----------------------------------------------------
        # 4. Database Logic — Flexible Stock Matching
        # ----------------------------------------------------
        with transaction.atomic():
            # --- Find stock item ---
            stock_filter = PharmacyStock.objects.select_for_update().filter(
                medicine_form=medicine_form,
                brand_name=brand_name
            )

            # For regular medicines, match chemical_name, dose_volume, and expiry
            if medicine_form not in special_categories:
                stock_filter = stock_filter.filter(expiry_date=expiry_date).filter(
                    Q(chemical_name=chemical_name) | Q(chemical_name__isnull=True) | Q(chemical_name="")
                ).filter(
                    Q(dose_volume=dose_volume) | Q(dose_volume__isnull=True) | Q(dose_volume="")
                )

            stock_item = stock_filter.first()

            if stock_item and quantity_to_consume:
                if stock_item.quantity < quantity_to_consume:
                    return JsonResponse({"error": f"Insufficient stock. Available: {stock_item.quantity}"}, status=400)
                stock_item.quantity -= quantity_to_consume
                stock_item.save()
            elif not stock_item and medicine_form not in special_categories:
                return JsonResponse({"error": "Matching stock batch not found."}, status=404)

            # ----------------------------------------------------
            # 5. Save Ambulance Record
            # ----------------------------------------------------
            AmbulanceConsumables.objects.create(
                entry_date=entry_date,
                medicine_form=medicine_form,
                brand_name=brand_name,
                chemical_name=chemical_name,
                dose_volume=dose_volume,
                quantity=quantity_to_consume,
                expiry_date=expiry_date,
                consumed_date=consumed_date
            )

            # ----------------------------------------------------
            # 6. Update DailyQuantity (Same as Discard/Ward)
            # ----------------------------------------------------
            if quantity_to_consume:
                daily_qty, created = DailyQuantity.objects.get_or_create(
                    date=entry_date,
                    chemical_name=chemical_name,
                    brand_name=brand_name,
                    dose_volume=dose_volume if dose_volume else "N/A",
                    expiry_date=expiry_date,
                    defaults={'quantity': 0}
                )
                daily_qty.quantity = F('quantity') + quantity_to_consume
                daily_qty.save()

        return JsonResponse({"message": "Ambulance consumable added successfully."}, status=201)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        logger.exception("Error in add_ambulance_consumable")
        return JsonResponse({"error": str(e)}, status=500)


# --- Calibration ---

def normalize_frequency(freq):
    # Normalize frequency input for consistent month calculation
    if not freq: return 12 # Default yearly if not specified
    freq = str(freq).lower().strip()
    mapping = {
        "yearly": 12, "annual": 12, "annually": 12,
        "halfyearly": 6, "half-yearly": 6,
        "quartearly": 3, "quarterly": 3, # Correct spelling
        "monthly": 1,
        "once in 2 months": 2, "bimonthly": 2,
        "once in 2 years": 24, "biyearly": 24, "biannual": 24, "biannually": 24,
    }
    return mapping.get(freq, 12) # Default to yearly (12 months) if unrecognized

def get_next_due_date(calibration_date_str, freq):
    # Calculates next due date based on calibration date and frequency string
    try:
        calibration_date = datetime.strptime(str(calibration_date_str), "%Y-%m-%d")
        months_to_add = normalize_frequency(freq)
        return calibration_date + relativedelta(months=months_to_add)
    except (ValueError, TypeError):
        logger.error(f"Could not parse calibration date '{calibration_date_str}' or frequency '{freq}'")
        return None # Return None if parsing fails

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import InstrumentCalibration
from django.db.models import Max # Import Max
import logging

logger = logging.getLogger(__name__)

# In your Django views.py

# In jsw/views.py

@csrf_exempt
def get_calibrations(request):
    if request.method != 'GET':
        return JsonResponse({"error": "Invalid method. Use GET."}, status=405)

    try:
        latest_ids = InstrumentCalibration.objects.values(
            'instrument_number'
        ).annotate(
            latest_id=Max('id')
        ).values_list('latest_id', flat=True)

        pending_calibrations = InstrumentCalibration.objects.filter(
            id__in=list(latest_ids),
            calibration_status='pending'
        ).order_by("next_due_date")

        data = []
        for i in pending_calibrations:
            last_completed_record = InstrumentCalibration.objects.filter(
                instrument_number=i.instrument_number,
                calibration_status='Completed'
            ).order_by('-calibration_date', '-id').first()

            certificate_to_display = last_completed_record.certificate_number if last_completed_record else i.certificate_number

            data.append({
                "id": i.id,
                "instrument_number": i.instrument_number,
                "equipment_sl_no": i.equipment_sl_no,
                "instrument_name": i.instrument_name,
                "certificate_number": certificate_to_display,
                "make": i.make,
                "model_number": i.model_number,
                "freq": i.freq,
                "inst_status": i.inst_status,
                # --- THIS IS THE NEWLY ADDED LINE ---
                "entry_date": i.entry_date.strftime("%d-%b-%Y") if i.entry_date else None,
                # ------------------------------------
                "calibration_date": i.calibration_date.strftime("%d-%b-%Y") if i.calibration_date else None,
                "next_due_date": i.next_due_date.strftime("%d-%b-%Y") if i.next_due_date else None,
                "calibration_status": i.calibration_status,
            })
            
        return JsonResponse({"pending_calibrations": data})

    except Exception as e:
        logger.exception("Error in get_calibrations")
        return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
# In your Django views.py

# In your views.py

# In your Django views.py

# jsw/views.py

@csrf_exempt
def get_calibration_history(request):
    if request.method == 'GET':
        try:
            from_date_str = request.GET.get("from")
            to_date_str = request.GET.get("to")
            
            calibrated_instruments = InstrumentCalibration.objects.all()

            from_date = parse_date_internal(from_date_str)
            to_date = parse_date_internal(to_date_str)
            if from_date:
                calibrated_instruments = calibrated_instruments.filter(calibration_date__gte=from_date)
            if to_date:
                calibrated_instruments = calibrated_instruments.filter(calibration_date__lte=to_date)

            data = []
            for entry in calibrated_instruments.order_by("-calibration_date", "-id"):
                 data.append({
                     "id": entry.id,
                     "equipment_sl_no": entry.equipment_sl_no,
                     "instrument_name": entry.instrument_name,
                     "instrument_number": entry.instrument_number,
                     "certificate_number": entry.certificate_number,
                     "make": entry.make,
                     "model_number": entry.model_number,
                     "freq": entry.freq,
                     "inst_status": entry.inst_status,
                     # --- THIS IS THE NEWLY ADDED LINE ---
                     "entry_date": entry.entry_date.strftime("%d-%b-%Y") if entry.entry_date else "",
                     # --- THIS LINE IS ALSO ADDED TO FIX THE "DONE BY" COLUMN ---
                     "done_by": entry.done_by,
                     # ------------------------------------
                     "calibration_date": entry.calibration_date.strftime("%d-%b-%Y") if entry.calibration_date else "",
                     "next_due_date": entry.next_due_date.strftime("%d-%b-%Y") if entry.next_due_date else "",
                     "calibration_status": entry.calibration_status,
                 })
            return JsonResponse({"calibration_history": data})
        except Exception as e:
            logger.exception("Error in get_calibration_history")
            return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
        response['Allow'] = 'GET'
        return response
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction, IntegrityError
from django.db.models import Max
from .models import InstrumentCalibration
from .utils import parse_date_internal # Assuming this is in your utils.py
import logging

logger = logging.getLogger(__name__)

# jsw/views.py

# ... (keep all other imports and functions as they are)

# jsw/views.py

# In jsw/views.py

@csrf_exempt
def complete_calibration(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method. Use POST.'}, status=405)

    try:
        data = json.loads(request.body)
        instrument_id = data.get("id")
        new_completion_date_str = data.get("calibration_date")
        new_freq = data.get("freq")
        new_next_due_date_str = data.get("next_due_date")
        certificate_number_to_use = data.get("certificate_number") 
        done_by_user = data.get("done_by")

        if not all([instrument_id, new_completion_date_str, new_freq, new_next_due_date_str]):
            return JsonResponse({"error": "Missing required fields: id, calibration_date, freq, and next_due_date are all required."}, status=400)

        completion_date = parse_date_internal(new_completion_date_str)
        next_due_date_for_new_record = parse_date_internal(new_next_due_date_str)

        if not completion_date or not next_due_date_for_new_record:
            return JsonResponse({"error": "Invalid date format. Please use YYYY-MM-DD."}, status=400)

        with transaction.atomic():
            # 1. Find the original record that is being completed.
            original_instrument = InstrumentCalibration.objects.select_for_update().get(id=instrument_id)

            if original_instrument.calibration_status == "Completed":
                return JsonResponse({"error": "This calibration record has already been completed."}, status=409)

            # --- START OF CORRECTION ---
            # 2. Update the old record. Only change its status and add completion details.
            #    DO NOT CHANGE THE DATES. This preserves the original record as a historical fact.
            original_instrument.calibration_status = "Completed"
            original_instrument.done_by = done_by_user
            original_instrument.certificate_number = certificate_number_to_use
            original_instrument.save()
            # --- END OF CORRECTION ---

            # 3. Create the new 'pending' record for the next cycle.
            #    (This part remains unchanged, as you requested).
            InstrumentCalibration.objects.create(
                equipment_sl_no=original_instrument.equipment_sl_no,
                instrument_number=original_instrument.instrument_number,
                instrument_name=original_instrument.instrument_name,
                make=original_instrument.make,
                model_number=original_instrument.model_number,
                done_by=done_by_user,
                inst_status=original_instrument.inst_status,
                freq=new_freq,
                calibration_date=completion_date,
                next_due_date=next_due_date_for_new_record,
                certificate_number=certificate_number_to_use, 
                calibration_status="pending",
            )

        logger.info(f"Calibration completed for Instrument ID {instrument_id} and new pending record created.")
        return JsonResponse({"message": "Calibration completed and new cycle scheduled successfully."})

    except InstrumentCalibration.DoesNotExist:
        return JsonResponse({"error": "Instrument with the specified ID not found."}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format in request body."}, status=400)
    except Exception as e:
        logger.exception(f"An unexpected error occurred in complete_calibration for ID {data.get('id', 'Unknown')}")
        return JsonResponse({"error": "An unexpected server error occurred.", "detail": str(e)}, status=500)
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import IntegrityError
from django.db.models import Max
from .models import InstrumentCalibration
from .utils import parse_date_internal, get_next_due_date
import logging

logger = logging.getLogger(__name__)

# In your views.py

from django.db import transaction # Make sure transaction is imported

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import InstrumentCalibration
from .utils import parse_date_internal, get_next_due_date # Assuming you have a utility for this
import logging

logger = logging.getLogger(__name__)


# jsw/views.py

# jsw/views.py

# jsw/views.py

# jsw/views.py

@csrf_exempt
def add_instrument(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        required_fields = ["instrument_number", "equipment_sl_no", "instrument_name", "freq", "calibration_date", "calibration_status"]
        if any(f not in data or not data[f] for f in required_fields):
            return JsonResponse({"error": "Missing required fields"}, status=400)
        
        instrument_number = data["instrument_number"]

        if InstrumentCalibration.objects.filter(instrument_number=instrument_number).exists():
            return JsonResponse({"error": f"Instrument Number '{instrument_number}' is already in use."}, status=409)

        calibration_date_str = data["calibration_date"]
        calibration_date = parse_date_internal(calibration_date_str)
        if not calibration_date:
            return JsonResponse({"error": "Invalid calibration_date format (YYYY-MM-DD)"}, status=400)

        freq = data["freq"]
        status = data["calibration_status"]

        with transaction.atomic():
            common_data = {
                "instrument_number": instrument_number,
                "equipment_sl_no": data["equipment_sl_no"],
                "instrument_name": data["instrument_name"],
                "make": data.get("make"),
                "model_number": data.get("model_number"),
                "freq": freq,
                "done_by": data.get("done_by"),
                "inst_status": data.get("inst_status", "inuse"), # Default to 'inuse'
            }

            if status == "Completed":
                # This logic is correct for adding an instrument that is already calibrated.
                # It correctly creates a historical "Completed" record and a new "pending" one.
                next_due = get_next_due_date(calibration_date_str, freq)
                InstrumentCalibration.objects.create(
                    **common_data,
                    certificate_number=data.get("certificate_number"),
                    calibration_date=calibration_date,
                    next_due_date=next_due,
                    calibration_status="Completed"
                )
                instrument = InstrumentCalibration.objects.create(
                    **common_data,
                    calibration_date=calibration_date,
                    next_due_date=next_due,
                    calibration_status="pending"
                )
            else: # Status is 'pending'
                # --- THIS IS THE FIX ---
                # We no longer create a separate "Added" record.
                # We only create the single, initial "pending" record which will appear in "Current Status".
                instrument = InstrumentCalibration.objects.create(
                    **common_data,
                    certificate_number=data.get("certificate_number"),
                    calibration_date=calibration_date,
                    next_due_date=data.get("next_due_date"),
                    calibration_status="pending"  # This is the only record created now.
                )

        logger.info(f"Instrument added successfully: Number {instrument.instrument_number}, ID: {instrument.id}")
        return JsonResponse({"message": "Instrument added successfully", "id": instrument.id}, status=201)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format"}, status=400)
    except Exception as e:
        logger.exception("Error adding instrument")
        return JsonResponse({"error": str(e)}, status=500)  
    
@csrf_exempt # Should be GET
def get_pending_next_month_count(request):
    if request.method == 'GET':
        try:
            today = date.today()
            one_month_later = today + relativedelta(months=1)
            # Count instruments pending (status=False) AND due on or before one month from now
            count = InstrumentCalibration.objects.filter(
                calibration_status=False,
                next_due_date__lte=one_month_later
            ).count()
            return JsonResponse({"count": count})
        except Exception as e:
            logger.exception("Error getting pending calibration count for next month")
            return JsonResponse({"error": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
        response['Allow'] = 'GET'
        return response

@csrf_exempt # Should be GET
def get_red_status_count(request):
    # Calculates counts based on proximity to due date
    if request.method == 'GET':
        try:
            today = date.today()
            red_count, yellow_count, green_count = 0, 0, 0
            instruments = InstrumentCalibration.objects.filter(calibration_status=False)

            for instrument in instruments:
                if not instrument.next_due_date or not instrument.freq or not instrument.calibration_date: # Need calibration_date too
                    continue # Skip if essential dates/freq are missing

                due_date = instrument.next_due_date
                last_cal_date = instrument.calibration_date # Use the last known calibration date
                if not last_cal_date: # If initial record has no cal date, maybe use entry? Less accurate.
                     last_cal_date = instrument.entry_date or today - relativedelta(months=normalize_frequency(instrument.freq)) # Estimate last


                # Calculate total period in days (more accurate than assuming 30.44 days/month)
                total_period_days = (due_date - last_cal_date).days
                if total_period_days <= 0: # Avoid division by zero or negative period
                     red_count += 1 # If due date is same or before last cal, it's overdue
                     continue

                # Calculate days remaining
                days_remaining = (due_date - today).days

                if days_remaining < 0: # Overdue
                    red_count += 1
                    continue

                fraction_remaining = days_remaining / total_period_days

                # Define thresholds (e.g., Red < 10%, Yellow < 33%, Green >= 33%) - Adjust as needed
                if fraction_remaining < 0.10: # Less than 10% of period remaining
                    red_count += 1
                elif fraction_remaining < 0.33: # Less than 33% remaining
                    yellow_count += 1
                else: # 33% or more remaining
                    green_count += 1

            return JsonResponse({"red_count": red_count,"yellow_count": yellow_count,"green_count": green_count})
        except Exception as e:
            logger.exception("Error calculating red status count")
            return JsonResponse({"error": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
        response['Allow'] = 'GET'
        return response


@csrf_exempt # Should be POST
def archive_zero_quantity_stock(request):
    """ Moves zero-quantity PharmacyStock entries to PharmacyStockHistory. """
    if request.method == "POST":
        archived_count = 0
        try:
            with transaction.atomic():
                # Select stock items with quantity <= 0 for update (locking)
                zero_stocks = PharmacyStock.objects.select_for_update().filter(quantity__lte=0)
                items_to_delete = list(zero_stocks) # Evaluate queryset

                if not items_to_delete:
                    return JsonResponse({"message": "No zero quantity stock found to archive.", "success": True})

                history_entries = []
                for item in items_to_delete:
                    # Prepare history entry data
                    history_entries.append(
                        PharmacyStockHistory(
                            entry_date=item.entry_date, # Preserve original entry date
                            medicine_form=item.medicine_form,
                            brand_name=item.brand_name,
                            chemical_name=item.chemical_name,
                            dose_volume=item.dose_volume,
                            total_quantity=item.total_quantity, # Preserve original total
                            expiry_date=item.expiry_date,
                            archive_date=timezone.now().date() # Set archive date
                        )
                    )

                # Bulk create history entries for efficiency
                PharmacyStockHistory.objects.bulk_create(history_entries, ignore_conflicts=True) # ignore_conflicts assumes duplicates are okay or handled by constraints

                # Delete original stock items
                deleted_count, _ = zero_stocks.delete() # Use the original queryset to delete
                archived_count = deleted_count

            logger.info(f"{archived_count} zero quantity stock items archived.")
            return JsonResponse({"message": f"{archived_count} items archived successfully.", "success": True})

        except Exception as e:
            logger.exception("archive_zero_quantity_stock failed.")
            return JsonResponse({"error": "Server error during archiving.", "detail": str(e), "success": False}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use POST."}, status=405)
        response['Allow'] = 'POST'
        return response

import json
import logging
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction
import pandas as pd
import openpyxl
from io import BytesIO
from .models import employee_details  # Import your model
from datetime import datetime

logger = logging.getLogger(__name__)

import json
import logging
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction
import pandas as pd
import openpyxl
from io import BytesIO
from .models import employee_details
from datetime import datetime

logger = logging.getLogger(__name__)

def map_excel_headers_to_model_fields(excel_data_type):
    # Base mappings common to all types
    mapping = {
        'BASIC DETAILS_Aadhar / Doc No.-Foreigner': 'aadhar', 
        'BASIC DETAILS_NAME': 'name',
        'BASIC DETAILS_Name of Father / Mother / Guardian': 'guardian',
        'BASIC DETAILS_Date of Birth': 'dob',
        'BASIC DETAILS_Sex': 'sex',
        'BASIC DETAILS_Blood Group': 'bloodgrp',
        'BASIC DETAILS_Marital Status': 'marital_status',
        'BASIC DETAILS_Identification Mark 1': 'identification_marks1',
        'BASIC DETAILS_Identification Mark 2': 'identification_marks2',
        'BASIC DETAILS_Nationality': 'nationality',
        'BASIC DETAILS_Foreign Document Name': 'docName',
        'BASIC DETAILS_Foreigner_Other Document_Site ID': 'other_site_id'
    }

    # Your specific headers have spaces and special characters. Let's adjust them.
    mapping.update({
        'Contact Details_Phone (Personal)': 'phone_Personal',
        'Contact Details_Mail Id (Personal)': 'mail_id_Personal',
        'Contact Details_Phone (Office)': 'phone_Office',
        'Contact Details_Mail Id (Office)': 'mail_id_Office',
        'Contact Details_Emergency Contact Person': 'emergency_contact_person',
        'Contact Details_Emergency Contact Relation': 'emergency_contact_relation',
        'Contact Details_Emergency Contact Phone': 'emergency_contact_phone',
        'Contact Details_Mail Id (Emergency Contact Person)': 'mail_id_Emergency_Contact_Person',
        'Contact Details_Permanent Address': 'permanent_address',
        'Contact Details_Permanent Village/Town/City': 'permanent_area',
        'Contact Details_Permanent State': 'permanent_state',
        'Contact Details_Permanent Country': 'permanent_country',
        'Contact Details_Residential Village/Town/City': 'residential_area',
        'Contact Details_Residential State': 'residential_state',
        'Contact Details_Residential Country': 'residential_country',
    })

    if excel_data_type == 'employee':
        # Mappings specific to Employee and Associate
        mapping.update({
            'Employment Details_Contractor Status': 'contractor_status',
            'Employment Details_Current Employer': 'employer',
            'Employment Details_Current Location': 'location', 
            'Employment Details_Designation': 'designation',
            'Employment Details_Department': 'department',
            'Employment Details_Division(Mechanical, electrical, maintenance)' : 'division',
            'Employment Details_Work area (control room, boiler, furnace, CNC cotrol room, paint shop)' : 'workarea',
            'Employment Details_Nature of Job': 'job_nature',
            'Employment Details_Date of Joining': 'doj',
            'Employment Details_Mode of Joining': 'moj',
            'Employment Details_Previous Employer': 'previousemployer',
            'Employment Details_Previous Location': 'previouslocation',
            'Employment Details_Employee Number': 'emp_no',
        })

    elif excel_data_type == 'contractor':
        # Mappings specific to Employee and Associate
        mapping.update({
            'Employment Details_Contract Employer': 'employer',
            'Employment Details_Current Designation_Location': 'location',
            'Employment Details_Designation': 'designation',
            'Employment Details_Department': 'department',
            'Employment Details_Division' : 'division',
            'Employment Details_Work Area' : 'workarea',
            'Employment Details_Nature of Job': 'job_nature',
            'Employment Details_Date of Joining': 'doj',
            'Employment Details_Mode of Joining': 'moj',
            'Employment Details_Previous Employer': 'previousemployer',
            'Employment Details_Previous Location': 'previouslocation',
            'Employment Details_Contract Employee Number': 'emp_no',
            'Employment Details_Status': 'contractor_status',
        })
    elif excel_data_type == 'visitor':
        # Mappings specific to Visitor
        mapping.update({
            'Visit Details_Organization': 'organization',
            'Visit Details_Address of Organization': 'addressOrganization',
            'Visit Details_Visiting Department': 'visiting_department',
            'Visit Details_Visiting Date From': 'visiting_date_from',
            'Visit Details_Visiting Date To': 'visiting_date_to',
            'Visit Details_Stay in Guest House': 'stay_in_guest_house',
            'Visit Details_Visiting Purpose': 'visiting_purpose',
            'Visit Details_Country ID': 'country_id',
            'Visit Details_Other Site ID': 'other_site_id',
        })

    return mapping

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from datetime import datetime
import pandas as pd
from io import BytesIO
import logging

from .models import employee_details

logger = logging.getLogger(__name__)


from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from datetime import datetime
import pandas as pd
from io import BytesIO
import logging

from .models import employee_details

def parse_date(value):
    if pd.isna(value):
        return None

    if isinstance(value, pd.Timestamp):
        return value.date()

    if isinstance(value, str):
        for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(value.split(" ")[0], fmt).date()
            except ValueError:
                pass

    return None

def clean_id(value):
    if pd.isna(value):
        return ""
    if isinstance(value, float):
        return str(int(value))  # removes .0 safely
    return str(value).strip()



logger = logging.getLogger(__name__)


@csrf_exempt
def hrupload(request, data_type):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data_type = data_type.lower()
        if data_type not in ["employee", "contractor", "visitor"]:
            return JsonResponse({"error": "Invalid data type"}, status=400)

        if "file" not in request.FILES:
            return JsonResponse({"error": "File missing"}, status=400)

        df = pd.read_excel(
            BytesIO(request.FILES["file"].read()),
            header=[0, 1]
        )

        # Flatten headers
        df.columns = [
            "_".join(map(str, col)).strip()
            for col in df.columns.values
        ]

        field_mapping = map_excel_headers_to_model_fields(data_type)

        to_create = []
        to_update = []
        i = 0
        for _, row in df.iterrows():
            record = {}

            for excel_col, model_field in field_mapping.items():
                if excel_col not in row:
                    continue

                value = row[excel_col]

                if model_field in ("dob", "doj"):
                    record[model_field] = parse_date(value)

                elif model_field in ("aadhar", "mrdNo", "emp_no", "country_id", "other_site_id"):
                    record[model_field] = clean_id(value)

                else:
                    record[model_field] = str(value).strip() if pd.notna(value) else ""


            aadhar = record.get("aadhar")
            if not aadhar:
                continue  
            i+=1
            print(i, aadhar)
            # Fetch latest record for this aadhar
            latest = (
                employee_details.objects
                .filter(aadhar=aadhar)
                .order_by("-id")   # OR -created_at
                .first()
            )

            if latest:
                # UPDATE latest record
                for field, value in record.items():
                    if field == "mrdNo":
                        continue  # explicitly protect mrdNo
                    setattr(latest, field, value)

                # ensure type can be updated
                latest.type = data_type.capitalize()

                to_update.append(latest)

            else:
                # CREATE new record
                record["type"] = data_type.capitalize()
                record["mrdNo"] = "0"
                to_create.append(employee_details(**record))

        with transaction.atomic():
            if to_create:
                employee_details.objects.bulk_create(
                    to_create,
                    batch_size=1000
                )

            if to_update:
                employee_details.objects.bulk_update(
                    to_update,
                    fields=[
                        f.name for f in employee_details._meta.fields
                        if f.name not in ("id", "mrdNo")
                    ],
                    batch_size=1000
                )

        return JsonResponse({
            "created": len(to_create),
            "updated": len(to_update),
            "message": f"{len(to_create)} HR data added and {len(to_update)} updated successfully"
        }, status=200)

    except Exception as e:
        logger.exception("HR Upload Failed")
        return JsonResponse({
            "error": "Upload failed",
            "detail": str(e)
        }, status=500)



# @csrf_exempt
# def medicalupload(request):
#     if request.method == 'POST':
#         try:
#             # It's better practice to decode and load JSON safely
#             data = json.loads(request.body.decode('utf-8'))
            
#             logger.info(f"medicalupload Received Data: {data.get('data')}") # Log received data
#             # Add actual processing logic here if needed
#             return JsonResponse({"message":"HR data received successfully"}, status = 200)
#         except json.JSONDecodeError:
#             logger.error("medicalupload failed: Invalid JSON")
#             return JsonResponse({"message":"Invalid JSON format"}, status = 400)
#         except Exception as e:
#             logger.exception("Error processing medicalupload")
#             return JsonResponse({"message":"Error processing data", "detail": str(e)} ,status = 500)
#     else:
#          response = JsonResponse({"error": "Invalid method. Use POST."}, status=405)
#          response['Allow'] = 'POST'
#          return response


@csrf_exempt # Should be GET
def view_prescription_by_id(request, prescription_id):
    """Retrieves a single prescription by its ID."""
    # Operates on ID, no aadhar change needed.
    if request.method == 'GET':
        try:
            prescription = get_object_or_404(Prescription, pk=prescription_id)

            # Serialize the single object
            p_data = model_to_dict(prescription)
            p_data['entry_date'] = prescription.entry_date.isoformat() if prescription.entry_date else None

            logger.info(f"Fetched prescription by ID: {prescription_id}")
            return JsonResponse(p_data)

        except Http404:
            logger.warning(f"view_prescription_by_id failed: Prescription with ID {prescription_id} not found.")
            return JsonResponse({'error': 'Prescription not found'}, status=404)
        except Exception as e:
            logger.exception(f"view_prescription_by_id failed for ID {prescription_id}: An unexpected error occurred.")
            return JsonResponse({'error': 'Internal Server Error', 'detail': str(e)}, status=500)
    else:
        logger.warning(f"view_prescription_by_id failed for ID {prescription_id}: Invalid request method.")
        response = JsonResponse({'error': 'Invalid request method. Only GET allowed.'}, status=405)
        response['Allow'] = 'GET'
        return response

# Add this function definition to your jsw/views.py file

from django.http import JsonResponse
from .models import ExpiryRegister
import logging

logger = logging.getLogger(__name__)

# This function specifically returns the count of items in the expiry register
# that have NOT been marked as removed yet.
def get_current_expiry_count(request):
    """
    Returns the count of medicines currently in ExpiryRegister (removed_date is NULL).
    """
    if request.method == 'GET': # Counts should always be GET requests
        try:
            # Count items in ExpiryRegister where removed_date is not set
            count = ExpiryRegister.objects.filter(removed_date__isnull=True).count()
            logger.info(f"Fetched current expiry count: {count}")
            return JsonResponse({"count": count})
        except Exception as e:
            logger.exception("Error getting current expiry count")
            return JsonResponse({"error": "Server error calculating expiry count.", "detail": str(e)}, status=500)
    else:
        response = JsonResponse({"error": "Invalid method. Use GET."}, status=405)
        response['Allow'] = 'GET'
        return response

# --- Ensure other necessary imports like models and logging are present at the top of views.py ---
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import logging
from .models import PharmacyMedicine  # Make sure this is your correct model

logger = logging.getLogger(__name__)

@require_http_methods(["GET"])
def get_chemical_name_suggestions(request):
    """
    Provides suggestions for chemical names that start with the user's query
    AND are filtered by the specific medicine type (form).
    """
    try:
        # 1. Get the query parameters from the frontend request
        name_query = request.GET.get('chemical_Name', '').strip()
        form_query = request.GET.get('medicine_form', '').strip() # e.g., 'Tablet', 'Syrup'
        print(name_query, form_query)  # Debugging line to check received queries

        # If the user hasn't typed anything, return an empty list
        if not name_query:
            return JsonResponse({'suggestions': []})

        # 2. Start by filtering for names that begin with the user's query
        queryset = PharmacyMedicine.objects.filter(chemical_name__istartswith=name_query)

        # --- THIS IS THE KEY CHANGE FOR FILTERING BY TYPE ---
        # 3. If a medicine form was provided, further filter the queryset.
        if form_query:
            # This line narrows the search to only include medicines of the
            # specified type (e.g., only 'Tablet' or only 'Syrup').
            # '__iexact' is a case-insensitive exact match.
            queryset = queryset.filter(medicine_form__iexact=form_query)

        print("Filtered Queryset:", queryset)  # Debugging line to see the actual SQL query
        
        # 4. Get the final, clean list of suggestions
        suggestions = list(
            queryset
            .values_list('chemical_name', flat=True)
            .distinct()
            .order_by('chemical_name')
            [:10]
        )

        return JsonResponse({'suggestions': suggestions})

    except Exception as e:
        logger.error(f"Error in get_chemical_name_suggestions: {e}")
        return JsonResponse(
            {"error": "An internal server error occurred."},
            status=500
        )


"""
This view handles the bulk upload of medical data from a structured Excel file.

Key Features:
- Handles raw file uploads to avoid request size limits.
- Uses `openpyxl` for efficient, server-side Excel parsing.
- Parses a 3-level hierarchical header structure into meaningful data.
- Uses a modular design with mapping dictionaries and helper functions for each data model.
- Enforces data integrity using atomic transactions: the entire file upload succeeds or fails as a single unit.
- Provides detailed error reporting back to the client if the upload fails.
"""

# ==============================================================================
# IMPORTS
# ==============================================================================
import openpyxl
from datetime import datetime
from django.db import transaction
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

# Import all your models
from .models import (
    employee_details, vitals, heamatalogy, RoutineSugarTests,
    RenalFunctionTest, LipidProfile, LiverFunctionTest, ThyroidFunctionTest,
    AutoimmuneTest, CoagulationTest, EnzymesCardiacProfile, UrineRoutineTest,
    SerologyTest, MotionTest, CultureSensitivityTest, MensPack, WomensPack,
    OccupationalProfile, OthersTest, OphthalmicReport, XRay, USGReport,
    CTReport, MRIReport
)

# ==============================================================================
# MAPPING DICTIONARIES (Excel Headers -> Django Model Fields)
#
# CRITICAL: The string values MUST EXACTLY match the headers generated by the
# parser. Pay close attention to spaces, special characters, and capitalization.
# ==============================================================================

# --- Basic Info ---
BASIC_DETAILS_MAP = {
    # The keys here must match the generated Excel headers exactly
    'year': 'DETAILS_BASIC DETAILS_Year',
    'batch': 'DETAILS_BASIC DETAILS_Batch',
    # Changed from '...Hospital' to '...Hospital Name' based on the image
    'hospitalName': 'DETAILS_BASIC DETAILS_Hospital Name', 
    'aadhar': 'DETAILS_BASIC DETAILS_Aadhar Number', 
}

# --- Test-specific Maps ---
HAEMATOLOGY_MAP = {
    
    'hemoglobin':       'HAEMATALOGY_Haemoglobin_RESULT',
    'total_rbc':        'HAEMATALOGY_Red Blood Cell (RBC) Count_RESULT',
    'total_wbc':        'HAEMATALOGY_WBC Count (TC)_RESULT',
    'Haemotocrit':      'HAEMATALOGY_Haemotocrit (PCV)_RESULT',
    'mcv':              'HAEMATALOGY_MCV_RESULT',
    'mch':              'HAEMATALOGY_MCH_RESULT',
    'mchc':             'HAEMATALOGY_MCHC_RESULT',
    'platelet_count':   'HAEMATALOGY_Platelet Count_RESULT',
    'rdw':              'HAEMATALOGY_RDW (CV)_RESULT',
    'neutrophil':       'HAEMATALOGY_Neutrophil_RESULT',
    'lymphocyte':       'HAEMATALOGY_Lymphocyte_RESULT',
    'eosinophil':       'HAEMATALOGY_Eosinophil_RESULT',
    'monocyte':         'HAEMATALOGY_Monocyte_RESULT',
    'basophil':         'HAEMATALOGY_Basophils_RESULT',
    'esr':              'HAEMATALOGY_Erythrocyte Sedimentation Rate_RESULT',

    # === Simple Tests (with just a COMMENTS column) ===
    # Here, we map explicitly to the COMMENTS column from the Excel sheet.
    'peripheral_blood_smear_rbc_morphology':          'HAEMATALOGY_Peripheral Blood Smear - RBC Morphology',
    'peripheral_blood_smear_rbc_morphology_comments': 'HAEMATALOGY_Peripheral Blood Smear - RBC Morphology',

    'peripheral_blood_smear_parasites':               'HAEMATALOGY_Peripheral Blood Smear - Parasites_COMMENTS',
    'peripheral_blood_smear_parasites_comments':      'HAEMATALOGY_Peripheral Blood Smear - Parasites_COMMENTS',

    'peripheral_blood_smear_others':                  'HAEMATALOGY_Peripheral Blood Smear - Others_COMMENTS',
    'peripheral_blood_smear_others_comments':         'HAEMATALOGY_Peripheral Blood Smear - Others_COMMENTS',
}
SUGAR_TESTS_MAP = {
    'glucose_f': 'ROUTINE SUGAR TESTS_Glucose (F)_RESULT',
    'glucose_f_unit':'ROUTINE SUGAR TESTS_Glucose (F)_UNIT',
    
    'glucose_pp': 'ROUTINE SUGAR TESTS_Glucose (PP)_RESULT',
    'glucose_pp_unit':'ROUTINE SUGAR TESTS_Glucose (PP)_Glucose (PP)_UNIT',
  
    'random_blood_sugar': 'ROUTINE SUGAR TESTS_Random Blood sugar_RESULT',
    'random_blood_sugar_unit':'ROUTINE SUGAR TESTS_Random Blood sugar_UNIT',
  
    'estimated_average_glucose': 'ROUTINE SUGAR TESTS_Estimated Average Glucose_RESULT',
    'estimated_average_glucose_unit':'ROUTINE SUGAR TESTS_Estimated Average Glucose_UNIT',
    
    'hba1c': 'ROUTINE SUGAR TESTS_HbA1c_RESULT',
    'hba1c_unit':'ROUTINE SUGAR TESTS_HbA1c_UNIT'
}

RENAL_FUNCTION_MAP = {
    'urea': 'RENAL FUNCTION TEST & ELECTROLYTES_Urea_RESULT',
    'urea_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Urea_UNIT',
    
    'bun': 'RENAL FUNCTION TEST & ELECTROLYTES_Blood urea nitrogen (BUN)_RESULT',
    'bun_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Blood urea nitrogen (BUN)_UNIT',
  
  
    'serum_creatinine': 'RENAL FUNCTION TEST & ELECTROLYTES_Sr.Creatinine_RESULT',
    'serum_creatinine_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Sr.Creatinine_UNIT',
    
    
    'eGFR': 'RENAL FUNCTION TEST & ELECTROLYTES_e GFR_RESULT',
    'eGFR_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_e GFR_UNIT',
   
   
    'uric_acid': 'RENAL FUNCTION TEST & ELECTROLYTES_Uric acid_RESULT',
    'uric_acid_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Uric acid_UNIT',
   
    'sodium': 'RENAL FUNCTION TEST & ELECTROLYTES_Sodium_RESULT',
    'sodium_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Sodium_UNIT',
   
    'potassium': 'RENAL FUNCTION TEST & ELECTROLYTES_Potassium_RESULT',
    'potassium_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Potassium_UNIT',
   
    'calcium': 'RENAL FUNCTION TEST & ELECTROLYTES_Calcium_RESULT',
    'calcium_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Calcium_UNIT',
   
    'phosphorus': 'RENAL FUNCTION TEST & ELECTROLYTES_Phosphorus_RESULT',
    'phosphorus_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Phosphorus_UNIT',
   
    'chloride': 'RENAL FUNCTION TEST & ELECTROLYTES_Chloride_RESULT',
    'chloride_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Chloride_UNIT',
   
    'bicarbonate': 'RENAL FUNCTION TEST & ELECTROLYTES_Bicarbonate_RESULT',
    'bicarbonate_unit': 'RENAL FUNCTION TEST & ELECTROLYTES_Bicarbonate_UNIT',
}

LIPID_PROFILE_MAP = {
    'Total_Cholesterol': 'LIPID PROFILE TESTS_Total Cholesterol_RESULT',
    'Total_Cholesterol_unit': 'LIPID PROFILE TESTS_Total Cholesterol_UNIT',
   
    'triglycerides': 'LIPID PROFILE TESTS_Triglycerides_RESULT',
    'triglycerides_unit': 'LIPID PROFILE TESTS_Triglycerides_UNIT',
   
    'hdl_cholesterol': 'LIPID PROFILE TESTS_HDL - Cholesterol_RESULT',
    'hdl_cholesterol_unit': 'LIPID PROFILE TESTS_HDL - Cholesterol_UNIT',
   
    'ldl_cholesterol': 'LIPID PROFILE TESTS_LDL- Cholesterol_RESULT',
    'ldl_cholesterol_unit': 'LIPID PROFILE TESTS_LDL- Cholesterol_UNIT',
   
    'vldl_cholesterol': 'LIPID PROFILE TESTS_VLDL -Choleserol_RESULT',
    'vldl_cholesterol_unit': 'LIPID PROFILE TESTS_VLDL -Choleserol_UNIT',
   
    'chol_hdl_ratio': 'LIPID PROFILE TESTS_CHOL:HDL ratio_RESULT',
    'chol_hdl_ratio_unit': 'LIPID PROFILE TESTS_CHOL:HDL ratio_UNIT',
   
    'ldl_chol_hdl_chol_ratio': 'LIPID PROFILE TESTS_LDL.CHOL/HDL.CHOL Ratio_RESULT',
    'ldl_chol_hdl_chol_ratio_unit': 'LIPID PROFILE TESTS_LDL.CHOL/HDL.CHOL Ratio_UNIT',
}


LIVER_FUNCTION_MAP = {
    'bilirubin_total': 'LIVER FUNCTION TEST_Bilirubin -Total_RESULT',
    'bilirubin_total_unit': 'LIVER FUNCTION TEST_Bilirubin -Total_UNIT',
    'bilirubin_direct': 'LIVER FUNCTION TEST_Bilirubin -Direct_RESULT',
    'bilirubin_direct_unit': 'LIVER FUNCTION TEST_Bilirubin -Direct_UNIT',
    'bilirubin_indirect': 'LIVER FUNCTION TEST_Bilirubin -indirect_RESULT',
    'bilirubin_indirect_unit': 'LIVER FUNCTION TEST_Bilirubin -indirect_UNIT',
    'sgot_ast': 'LIVER FUNCTION TEST_SGOT /AST_RESULT',
    'sgot_ast_unit': 'LIVER FUNCTION TEST_SGOT /AST_UNIT',
    'sgpt_alt': 'LIVER FUNCTION TEST_SGPT /ALT_RESULT',
    'sgpt_alt_unit': 'LIVER FUNCTION TEST_SGPT /ALT_UNIT',
    'alkaline_phosphatase': 'LIVER FUNCTION TEST_Alkaline phosphatase_RESULT',
    'alkaline_phosphatase_unit': 'LIVER FUNCTION TEST_Alkaline phosphatase_UNIT',
    'total_protein': 'LIVER FUNCTION TEST_Total Protein_RESULT',
    'total_protein_unit': 'LIVER FUNCTION TEST_Total Protein_UNIT',
    'albumin_serum': 'LIVER FUNCTION TEST_Albumin (Serum )_RESULT',
    'albumin_serum_unit': 'LIVER FUNCTION TEST_Albumin (Serum )_UNIT',
    'globulin_serum': 'LIVER FUNCTION TEST_ Globulin(Serum)_RESULT',
    'globulin_serum_unit': 'LIVER FUNCTION TEST_ Globulin(Serum)_UNIT',
    'alb_glob_ratio': 'LIVER FUNCTION TEST_Alb/Glob Ratio_RESULT',
    'alb_glob_ratio_unit': 'LIVER FUNCTION TEST_Alb/Glob Ratio_UNIT',
    'gamma_glutamyl_transferase': 'LIVER FUNCTION TEST_Gamma Glutamyl transferase_RESULT',
    'gamma_glutamyl_transferase_unit': 'LIVER FUNCTION TEST_Gamma Glutamyl transferase_UNIT',
    'C_reactive_protien': 'LIVER FUNCTION TEST_C Reactive protein_RESULT',  # ADDED
    'C_reactive_protien_unit': 'LIVER FUNCTION TEST_C Reactive protein_UNIT',  # ADDED
}

THYROID_FUNCTION_MAP = {
    't3_triiodothyronine': 'THYROID FUNCTION TEST_T3- Triiodothyroine_RESULT',
    't3_triiodothyronine_unit': 'THYROID FUNCTION TEST_T3- Triiodothyroine_UNIT',
    
    't4_thyroxine': 'THYROID FUNCTION TEST_T4 - Thyroxine_RESULT',
    't4_thyroxine_unit': 'THYROID FUNCTION TEST_T4 - Thyroxine_UNIT',
    
    'tsh_thyroid_stimulating_hormone': 'THYROID FUNCTION TEST_TSH- Thyroid Stimulating Hormone_RESULT',
    'tsh_thyroid_stimulating_hormone_unit': 'THYROID FUNCTION TEST_TSH- Thyroid Stimulating Hormone_UNIT',
}

AUTOIMMUNE_MAP = {
    'ANA': 'AUTOIMMUNE TEST_ANA (Antinuclear Antibody)_RESULT',
    'ANA_unit': 'AUTOIMMUNE TEST_ANA (Antinuclear Antibody)_UNIT',
    
    'Anti_ds_dna': 'AUTOIMMUNE TEST_Anti ds DNA_RESULT',
    'Anti_ds_dna_unit': 'AUTOIMMUNE TEST_Anti ds DNA_UNIT',
    
    'Anticardiolipin_Antibodies': 'AUTOIMMUNE TEST_Anticardiolipin Antibodies (IgG & IgM)_RESULT',
    'Anticardiolipin_Antibodies_unit': 'AUTOIMMUNE TEST_Anticardiolipin Antibodies (IgG & IgM)_UNIT',
    
    'Rheumatoid_factor': 'AUTOIMMUNE TEST_Rheumatoid factor_RESULT',
    'Rheumatoid_factor_unit': 'AUTOIMMUNE TEST_Rheumatoid factor_UNIT',
}

COAGULATION_MAP = {
    'prothrombin_time': 'COAGULATION TEST_Prothrombin Time (PT)_RESULT',
    'prothrombin_time_unit': 'COAGULATION TEST_Prothrombin Time (PT)_UNIT',
    
    'pt_inr': 'COAGULATION TEST_PT INR_RESULT',
    'pt_inr_unit': 'COAGULATION TEST_PT INR_UNIT',
    
    'bleeding_time': 'COAGULATION TEST_Bleeding Time (BT)_RESULT',
    'bleeding_time_unit': 'COAGULATION TEST_Bleeding Time (BT)_UNIT',
    
    'clotting_time': 'COAGULATION TEST_Clotting Time (CT)_RESULT',
    'clotting_time_unit': 'COAGULATION TEST_Clotting Time (CT)_UNIT',
}


ENZYMES_CARDIAC_MAP = {
    'acid_phosphatase': 'ENZYMES & CARDIAC Profile_Acid Phosphatase_RESULT',
    'acid_phosphatase_unit': 'ENZYMES & CARDIAC Profile_Acid Phosphatase_UNIT',
   
    'adenosine_deaminase': 'ENZYMES & CARDIAC Profile_Adenosine Deaminase_RESULT',
    'adenosine_deaminase_unit': 'ENZYMES & CARDIAC Profile_Adenosine Deaminase_UNIT',
   
    'amylase': 'ENZYMES & CARDIAC Profile_Amylase_RESULT',
    'amylase_unit': 'ENZYMES & CARDIAC Profile_Amylase_UNIT',
   
    'lipase': 'ENZYMES & CARDIAC Profile_Lipase_RESULT',
    'lipase_unit': 'ENZYMES & CARDIAC Profile_Lipase_UNIT',
   
    'troponin_t': 'ENZYMES & CARDIAC Profile_Troponin- T_RESULT',
    'troponin_t_unit': 'ENZYMES & CARDIAC Profile_Troponin- T_UNIT',
   
    'troponin_i': 'ENZYMES & CARDIAC Profile_Troponin- I_RESULT',
    'troponin_i_unit': 'ENZYMES & CARDIAC Profile_Troponin- I_UNIT',
   
    'cpk_total': 'ENZYMES & CARDIAC Profile_CPK - TOTAL_RESULT',
    'cpk_total_unit': 'ENZYMES & CARDIAC Profile_CPK - TOTAL_UNIT',
   
    'cpk_mb': 'ENZYMES & CARDIAC Profile_CPK - MB_RESULT',
    'cpk_mb_unit': 'ENZYMES & CARDIAC Profile_CPK - MB_UNIT',
   
    'ecg': 'ENZYMES & CARDIAC Profile_ECG_RESULT',
    'ecg_unit': 'ENZYMES & CARDIAC Profile_ECG_UNIT',
    'ecg_comments': 'ENZYMES & CARDIAC Profile_ECG_COMMENTS(If Abnormal)',
    
    'echo': 'ENZYMES & CARDIAC Profile_ECHO_RESULT',
    'echo_unit': 'ENZYMES & CARDIAC Profile_ECHO_UNIT',
    'echo_comments': 'ENZYMES & CARDIAC Profile_ECHO_COMMENTS(If Abnormal)',
    
    'tmt_normal': 'ENZYMES & CARDIAC Profile_TMT_RESULT',
    'tmt_normal_unit': 'ENZYMES & CARDIAC Profile_TMT_UNIT',
    'tmt_normal_comments': 'ENZYMES & CARDIAC Profile_TMT_COMMENTS(If Abnormal)',
    
    'angiogram': 'ENZYMES & CARDIAC Profile_angiogram_RESULT',  # ADDED
    'angiogram_unit': 'ENZYMES & CARDIAC Profile_angiogram_UNIT',  # ADDED
    'angiogram_comments': 'ENZYMES & CARDIAC Profile_angiogram_COMMENTS(If Abnormal)',  # ADDED
}

URINE_ROUTINE_MAP={
'colour': 'URINE ROUTINE_Colour_RESULT',
'colour_unit': 'URINE ROUTINE_Colour_UNIT',

'appearance': 'URINE ROUTINE_Appearance_RESULT',
'appearance_unit': 'URINE ROUTINE_Appearance_UNIT',

'reaction_ph': 'URINE ROUTINE_Reaction (pH)_RESULT',
'reaction_ph_unit': 'URINE ROUTINE_Reaction (pH)_UNIT',

'specific_gravity': 'URINE ROUTINE_Specific gravity_RESULT',
'specific_gravity_unit': 'URINE ROUTINE_Specific gravity_UNIT',

'protein_albumin': 'URINE ROUTINE_Protein/Albumin_RESULT',
'protein_albumin_unit': 'URINE ROUTINE_Protein/Albumin_UNIT',

'glucose_urine': 'URINE ROUTINE_Glucose (Urine)_RESULT',
'glucose_urine_unit': 'URINE ROUTINE_Glucose (Urine)_UNIT',

'ketone_bodies': 'URINE ROUTINE_Ketone Bodies_RESULT',
'ketone_bodies_unit': 'URINE ROUTINE_Ketone Bodies_UNIT',

'urobilinogen': 'URINE ROUTINE_Urobilinogen_RESULT',
'urobilinogen_unit': 'URINE ROUTINE_Urobilinogen_UNIT',

'bile_salts': 'URINE ROUTINE_Bile Salts_RESULT',
'bile_salts_unit': 'URINE ROUTINE_Bile Salts_UNIT',

'bile_pigments': 'URINE ROUTINE_Bile Pigments_RESULT',
'bile_pigments_unit': 'URINE ROUTINE_Bile Pigments_UNIT',

'wbc_pus_cells': 'URINE ROUTINE_WBC / Pus cells_RESULT',
'wbc_pus_cells_unit': 'URINE ROUTINE_WBC / Pus cells_UNIT',

'red_blood_cells': 'URINE ROUTINE_Red Blood Cells_RESULT',
'red_blood_cells_unit': 'URINE ROUTINE_Red Blood Cells_UNIT',

'epithelial_cells': 'URINE ROUTINE_Epithelial celss_RESULT', # CORRECTED (Typo 'celss' fixed to 'cells')
'epithelial_cells_unit': 'URINE ROUTINE_Epithelial celss_UNIT',

'casts': 'URINE ROUTINE_Casts_RESULT',
'casts_unit': 'URINE ROUTINE_Casts_UNIT',

'crystals': 'URINE ROUTINE_Crystals_RESULT',
'crystals_unit': 'URINE ROUTINE_Crystals_UNIT',

'bacteria': 'URINE ROUTINE_Bacteria_RESULT',
'bacteria_unit': 'URINE ROUTINE_Bacteria_UNIT',
}
SEROLOGY_MAP = {
    
    
    'HBsAG': 'SEROLOGY_HBsAg_RESULT',
    'HBsAG_comments': 'SEROLOGY_HBsAg_Comment',

    'HCV': 'SEROLOGY_HCV_RESULT',
    'HCV_comments': 'SEROLOGY_HCV_Comment',

    'WIDAL': 'SEROLOGY_WIDAL_RESULT',
    'WIDAL_comments': 'SEROLOGY_WIDAL_Comment',
    
    'VDRL': 'SEROLOGY_VDRL_RESULT',
    'VDRL_comments': 'SEROLOGY_VDRL_Comment',

    'Dengue_NS1Ag': 'SEROLOGY_Dengue NS1Ag_RESULT',
    'Dengue_NS1Ag_comments': 'SEROLOGY_Dengue NS1Ag_Comment',

    'Dengue_IgG': 'SEROLOGY_Dengue IgG_RESULT',
    'Dengue_IgG_comments': 'SEROLOGY_Dengue IgG_Comment',

    'Dengue_IgM': 'SEROLOGY_Dengue IgM_RESULT',
    'Dengue_IgM_comments': 'SEROLOGY_Dengue IgM_Comment',

}
MOTION_TEST_MAP = {
    'colour_motion': 'MOTION_Colour_RESULT',
    'colour_motion_unit': 'MOTION_Colour_UNIT',

    'appearance_motion': 'MOTION_Appearance_RESULT',
    'appearance_motion_unit': 'MOTION_Appearance_UNIT',

    'occult_blood': 'MOTION_Occult Blood_RESULT',
    'occult_blood_unit': 'MOTION_Occult Blood_UNIT',

    'ova': 'MOTION_Ova_RESULT',
    'ova_unit': 'MOTION_Ova_UNIT',

    'cyst': 'MOTION_Cyst_RESULT',
    'cyst_unit': 'MOTION_Cyst_UNIT',

    'mucus': 'MOTION_Mucus_RESULT',
    'mucus_unit': 'MOTION_Mucus_UNIT',

    'pus_cells': 'MOTION_Pus Cells_RESULT',
    'pus_cells_unit': 'MOTION_Pus Cells_UNIT',

    'rbcs': 'MOTION_RBCs_RESULT',
    'rbcs_unit': 'MOTION_RBCs_UNIT',

    'others': 'MOTION_Others_RESULT',
    'others_unit': 'MOTION_Others_UNIT',   
}
CULTURE_SENSITIVITY_MAP = {
    'urine': 'ROUTINE CULTURE & SENSITIVITY TEST_Urine_RESULT',
    'urine_unit': 'ROUTINE CULTURE & SENSITIVITY TEST_Urine_UNIT',

    'motion': 'ROUTINE CULTURE & SENSITIVITY TEST_Motion_RESULT',
    'motion_unit': 'ROUTINE CULTURE & SENSITIVITY TEST_Motion_UNIT',

    'sputum': 'ROUTINE CULTURE & SENSITIVITY TEST_Sputum_RESULT',
    'sputum_unit': 'ROUTINE CULTURE & SENSITIVITY TEST_Sputum_UNIT',

    'blood': 'ROUTINE CULTURE & SENSITIVITY TEST_Blood_RESULT',
    'blood_unit': 'ROUTINE CULTURE & SENSITIVITY TEST_Blood_UNIT',
}
MENS_PACK_MAP = {
    'psa': "Men's Pack_PSA (Prostate specific Antigen)_RESULT",
    'psa_unit': "Men's Pack_PSA (Prostate specific Antigen)_UNIT",
    'psa_comments': "Men's Pack_PSA (Prostate specific Antigen)_Comments",
}

WOMENS_PACK_MAP = {
    'Mammogaram': "Women's Pack_Mammogram_RESULT",
    'PAP_Smear': "Women's Pack_PAP Smear_RESULT",
}

OCCUPATIONAL_PROFILE_MAP = {
    # Model Field Name (must match your model exactly) : 'Generated Excel Header from Image'

    'Audiometry':            'Occupational Profile_Audiometry_NORMAL / ABNORMAL',
    'Audiometry_comments':   'Occupational Profile_Audiometry_COMMENTS',

    'PFT':                   'Occupational Profile_PFT_NORMAL / ABNORMAL',
    'PFT_comments':          'Occupational Profile_PFT_COMMENTS',
}
OTHERS_TEST_MAP = {
    'Bone_Densitometry':  'Other Test_Bone Densitometry_RESULT',
    'Bone_Densitometry_unit':  'Other Test_Bone Densitometry_UNIT',
    'Vit_D':              'Other Test_Vit D_RESULT',
    'Vit_D_unit':              'Other Test_Vit D_UNIT',
    'Vit_B12':            'Other Test_Vit B12_RESULT',
    'Vit_B12_unit':            'Other Test_Vit B12_UNIT',
    'Serum_Ferritin':     'Other Test_serum.ferritin_RESULT',
    'Serum_Ferritin_unit':     'Other Test_serum.ferritin_UNIT',

    # === Simple Tests (with NORMAL/ABNORMAL and COMMENTS) ===
    # These are mapped explicitly.
    'Dental':             'Other Test_Dental_NORMAL / ABNORMAL',
    'Dental_comments':    'Other Test_Dental_COMMENTS',

    'Pathology':          'Other Test_Pathology_NORMAL / ABNORMAL',
    'Pathology_comments': 'Other Test_Pathology_COMMENTS',

    'Endoscopy':          'Other Test_Endoscopy_NORMAL / ABNORMAL',
    'Endoscopy_comments': 'Other Test_Endoscopy_COMMENTS',

    # Correcting the typo from Clonoscopy to Colonoscopy to match Excel
    'Clonoscopy':         'Other Test_Colonoscopy_NORMAL / ABNORMAL',
    'Clonoscopy_comments':'Other Test_Colonoscopy_COMMENTS',
    
    'Urethroscopy':       'Other Test_Urethroscopy_NORMAL / ABNORMAL',
    'Urethroscopy_comments':'Other Test_Urethroscopy_COMMENTS',
    
    'Bronchoscopy':       'Other Test_Bronchoscopy_NORMAL / ABNORMAL',
    'Bronchoscopy_comments':'Other Test_Bronchoscopy_COMMENTS',
    
    'Cystoscopy':         'Other Test_Cystoscopy_NORMAL / ABNORMAL',
    'Cystoscopy_comments':'Other Test_Cystoscopy_COMMENTS',
    
    'Hysteroscopy':       'Other Test_Hysteroscopy_NORMAL / ABNORMAL',
    'Hysteroscopy_comments':'Other Test_Hysteroscopy_COMMENTS',
    
    'Ureteroscopy':       'Other Test_Ureteroscopy_NORMAL / ABNORMAL',
    'Ureteroscopy_comments':'Other Test_Ureteroscopy_COMMENTS',
}

# In views.py, use this map after you fix the Excel file.

OPHTHALMIC_MAP = {
    'vision':                     'OPHTHALMIC REPORT_Vision_NORMAL / ABNORMAL',
    'vision_comments':            'OPHTHALMIC REPORT_Vision_COMMENTS',

    'color_vision':               'OPHTHALMIC REPORT_Color Vision_NORMAL / ABNORMAL',
    'color_vision_comments':      'OPHTHALMIC REPORT_Color Vision_COMMENTS',
    
    'Cataract_glaucoma':          'OPHTHALMIC REPORT_Cataract/ glaucoma_NORMAL / ABNORMAL',
    'Cataract_glaucoma_comments': 'OPHTHALMIC REPORT_Cataract/ glaucoma_COMMENTS',
}
XRAY_MAP = {
    # Model Field Name (must match your model exactly) : 'Generated Excel Header from Image'

    'Chest':            'X-RAY_Chest_NORMAL / ABNORMAL',
    'Chest_comments':   'X-RAY_Chest_COMMENTS (If Abnormal)',

    'Spine':            'X-RAY_Spine_NORMAL / ABNORMAL',
    'Spine_comments':   'X-RAY_Spine_COMMENTS (If Abnormal)',

    'Abdomen':          'X-RAY_Abdomen_NORMAL / ABNORMAL',
    'Abdomen_comments': 'X-RAY_Abdomen_COMMENTS (If Abnormal)',

    'KUB':              'X-RAY_KUB_NORMAL / ABNORMAL',
    'KUB_comments':     'X-RAY_KUB_COMMENTS (If Abnormal)',

    'Pelvis':           'X-RAY_Pelvis_NORMAL / ABNORMAL',
    'Pelvis_comments':  'X-RAY_Pelvis_COMMENTS (If Abnormal)',

    'Skull':            'X-RAY_Skull_NORMAL / ABNORMAL',
    'Skull_comments':   'X-RAY_Skull_COMMENTS (If Abnormal)',

    'Upper_limb':       'X-RAY_Upper limb_NORMAL / ABNORMAL',
    'Upper_limb_comments':'X-RAY_Upper limb_COMMENTS (If Abnormal)',

    'Lower_limb':       'X-RAY_Lower limb_NORMAL / ABNORMAL',
    'Lower_limb_comments':'X-RAY_Lower limb_COMMENTS (If Abnormal)',
}
USG_MAP = {
    # Model Field Name (must match your model exactly) : 'Generated Excel Header from Image'

    'usg_abdomen':            'USG_ABDOMEN_NORMAL / ABNORMAL',
    'usg_abdomen_comments':   'USG_ABDOMEN_COMMENTS (If Abnormal)',

    'usg_pelvis':             'USG_Pelvis_NORMAL / ABNORMAL',
    'usg_pelvis_comments':    'USG_Pelvis_COMMENTS (If Abnormal)',

    'usg_neck':               'USG_Neck_NORMAL / ABNORMAL',
    'usg_neck_comments':      'USG_Neck_COMMENTS (If Abnormal)',

    'usg_kub':                'USG_KUB_NORMAL / ABNORMAL',
    'usg_kub_comments':       'USG_KUB_COMMENTS (If Abnormal)',
}
CT_MAP = {
    # Model Field Name (exact match) : 'Generated Excel Header from Image'

    'CT_brain':           'CT_Brain_NORMAL / ABNORMAL',
    'CT_brain_comments':  'CT_Brain_COMMENTS (If Abnormal)',

    'CT_Head':            'CT_Head_NORMAL / ABNORMAL',
    'CT_Head_comments':   'CT_Head_COMMENTS (If Abnormal)',

    # ADD THESE TWO LINES FOR NECK
    'CT_Neck':            'CT_Neck_NORMAL / ABNORMAL',
    'CT_Neck_comments':   'CT_Neck_COMMENTS (If Abnormal)',

    'CT_abdomen':         'CT_Abdomen with KUB_NORMAL / ABNORMAL',
    'CT_abdomen_comments':'CT_Abdomen with KUB_COMMENTS (If Abnormal)',

    'CT_pelvis':          'CT_Pelvis_NORMAL / ABNORMAL',
    'CT_pelvis_comments': 'CT_Pelvis_COMMENTS (If Abnormal)',

    'CT_lungs':           'CT_Lungs_NORMAL / ABNORMAL',
    'CT_lungs_comments':  'CT_Lungs_COMMENTS (If Abnormal)',

    'CT_Chest':           'CT_Chest_NORMAL / ABNORMAL',
    'CT_Chest_comments':  'CT_Chest_COMMENTS (If Abnormal)',

    'CT_spine':           'CT_Spine_NORMAL / ABNORMAL',
    'CT_spine_comments':  'CT_Spine_COMMENTS (If Abnormal)',

    'CT_Upper_limb':      'CT_Upper limb_NORMAL / ABNORMAL',
    'CT_Upper_limb_comments':'CT_Upper limb_COMMENTS (If Abnormal)',

    'CT_Lower_limb':      'CT_Lower limb_NORMAL / ABNORMAL',
    'CT_Lower_limb_comments':'CT_Lower limb_COMMENTS (If Abnormal)',
}

MRI_MAP = {
    'mri_brain':           'MRI_Brain_NORMAL / ABNORMAL',
    'mri_brain_comments':  'MRI_Brain_COMMENTS (If Abnormal)',
    'mri_Head':            'MRI_Head_NORMAL / ABNORMAL',
    'mri_Head_comments':   'MRI_Head_COMMENTS (If Abnormal)',
    'mri_Neck':            'MRI_Neck_NORMAL / ABNORMAL',
    'mri_Neck_comments':   'MRI_Neck_COMMENTS (If Abnormal)',
    'mri_abdomen':         'MRI_Abdomen with KUB_NORMAL / ABNORMAL',
    'mri_abdomen_comments':'MRI_Abdomen with KUB_COMMENTS (If Abnormal)',
    'mri_pelvis':          'MRI_Pelvis_NORMAL / ABNORMAL',
    'mri_pelvis_comments': 'MRI_Pelvis_COMMENTS (If Abnormal)',
    'mri_lungs':           'MRI_Lungs_NORMAL / ABNORMAL',
    'mri_lungs_comments':  'MRI_Lungs_COMMENTS (If Abnormal)',
    'mri_Chest':           'MRI_Chest_NORMAL / ABNORMAL',
    'mri_Chest_comments':  'MRI_Chest_COMMENTS (If Abnormal)',
    'mri_spine':           'MRI_Spine_NORMAL / ABNORMAL',
    'mri_spine_comments':  'MRI_Spine_COMMENTS (If Abnormal)',
    'mri_Upper_limb':      'MRI_Upper limb_NORMAL / ABNORMAL',
    'mri_Upper_limb_comments':'MRI_Upper limb_COMMENTS (If Abnormal)',
    'mri_Lower_limb':      'MRI_Lower limb_NORMAL / ABNORMAL',
    'mri_Lower_limb_comments':'MRI_Lower limb_COMMENTS (If Abnormal)',
}

def parse_hierarchical_excel_py(worksheet):

    header_row1 = [cell.value for cell in worksheet[1]]
    header_row2 = [cell.value for cell in worksheet[2]]
    header_row3 = [cell.value for cell in worksheet[3]]

    combined_headers = []
    last_l1_header = ''
    last_l2_header = ''

    for i in range(len(header_row3)):
        l1_header = header_row1[i] if header_row1[i] is not None else last_l1_header
        l2_header = header_row2[i] if header_row2[i] is not None else last_l2_header
        l3_header = header_row3[i] if header_row3[i] is not None else ''
        
        last_l1_header = l1_header
        last_l2_header = l2_header

        full_header = '_'.join(filter(None, [str(h).strip() for h in [l1_header, l2_header, l3_header]]))
        combined_headers.append(full_header)
    
    json_data = []
    for row_cells in worksheet.iter_rows(min_row=4):
        row_data = {}
        for i, cell in enumerate(row_cells):
            if i < len(combined_headers):
                cell_value = cell.value
                if isinstance(cell_value, datetime):
                    cell_value = cell_value.strftime('%Y-%m-%d')
                row_data[combined_headers[i]] = cell_value

        if any(val is not None and str(val).strip() != '' for val in row_data.values()):
            json_data.append(row_data)
            
    return json_data


def _populate_data(model, model_map, row_data):
    """
    Populates model data without parsing/splitting reference ranges.
    It stores the raw Reference Range string directly into the database.
    """
    instance_data = {}
    
    for model_field, excel_key in model_map.items():
        # --- Case 1: Handle complex tests that use the _RESULT suffix ---
        if excel_key.endswith('_RESULT'):
            result_excel_key = excel_key
            
            # 1. Process RESULT
            if result_excel_key in row_data and row_data[result_excel_key] is not None:
                instance_data[model_field] = str(row_data[result_excel_key])

            # 2. Process UNIT
            unit_excel_key = result_excel_key.replace('_RESULT', '_UNIT')
            if unit_excel_key in row_data and row_data[unit_excel_key] is not None:
                unit_model_field = f"{model_field}_unit"
                if hasattr(model, unit_model_field):
                    instance_data[unit_model_field] = str(row_data[unit_excel_key])

            # 3. Process COMMENTS
            comments_excel_key = result_excel_key.replace('_RESULT', '_COMMENTS')
            if comments_excel_key in row_data and row_data[comments_excel_key] is not None:
                comments_model_field = f"{model_field}_comments"
                if hasattr(model, comments_model_field):
                    instance_data[comments_model_field] = str(row_data[comments_excel_key])
            
            # 4. Process REFERENCE RANGE (Raw Storage - No Parsing)
            range_excel_key = result_excel_key.replace('_RESULT', '_REFERENCE RANGE')
            if range_excel_key in row_data and row_data[range_excel_key] is not None:
                # We look for a field named like: hemoglobin_reference_range
                range_model_field = f"{model_field}_reference_range"
                
                
                if hasattr(model, range_model_field):
                   
                    instance_data[range_model_field] = str(row_data[range_excel_key])

        
        else:
            if excel_key in row_data and row_data[excel_key] is not None:
                instance_data[model_field] = str(row_data[excel_key])
                
    return instance_data

    
def process_model_data(model, model_map, row_data, employee, entry_date):
    
    data = _populate_data(model, model_map, row_data)
    if data:
        model.objects.update_or_create(
            emp_no=employee.emp_no,
            aadhar=employee.aadhar,
            entry_date=entry_date,
            mrdNo=employee.mrdNo, # This is the crucial link you asked for
            defaults=data
        )
# ==============================================================================
# MAIN UPLOAD VIEW (HANDLES FILE UPLOAD)
# ==============================================================================
from django.db import transaction
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

import openpyxl

# Make sure to import all your models and maps
# from .models import employee_details, vitals, heamatalogy, ...etc
# from .maps import BASIC_DETAILS_MAP, VITALS_MAP, HAEMATOLOGY_MAP, ...etc
# from .utils import parse_hierarchical_excel_py # Assuming this is where the function is

# ==============================================================================
# MAIN UPLOAD VIEW (HANDLES FILE UPLOAD)
# ==============================================================================
@method_decorator(csrf_exempt, name='dispatch')
class MedicalDataUploadView(View):
    def post(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get('file')      
        if not uploaded_file:
            return JsonResponse({'status': 'error', 'message': 'No file was uploaded.'}, status=400)

        try:
            workbook = openpyxl.load_workbook(uploaded_file, data_only=True)
            worksheet = workbook.active
            json_data = parse_hierarchical_excel_py(worksheet)
        
            if not json_data:
                return JsonResponse({'status': 'error', 'message': 'Excel file is empty.'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Failed to parse Excel file: {e}'}, status=400)
            
        success_count = 0
        error_count = 0
        errors = []
        x = 1
        try:
            with transaction.atomic():
                for i, row in enumerate(json_data):
                    # Identifier for error messages
                    s_no_key = 'DETAILS_BASIC DETAILS_S.NO' # Make sure this matches your parsed header for S.No if it exists
                    row_identifier = f"Row {i + 4}"

                    # --- Step 1: Extract Key Fields ---
                    try:
                        aadhar_val = str(row.get(BASIC_DETAILS_MAP['aadhar'], '')).strip()
                        year_val = str(row.get(BASIC_DETAILS_MAP['year'], '')).strip()
                        batch_val = str(row.get(BASIC_DETAILS_MAP['batch'], '')).strip()
                        hospital_val = str(row.get(BASIC_DETAILS_MAP['hospitalName'], '')).strip()

                        # Validate that all 4 keys are present
                        if not all([aadhar_val, year_val, batch_val, hospital_val]):
                            missing = []
                            if not aadhar_val: missing.append("Aadhar")
                            if not year_val: missing.append("Year")
                            if not batch_val: missing.append("Batch")
                            if not hospital_val: missing.append("Hospital")
                            
                            errors.append(f"{row_identifier}: Missing required fields: {', '.join(missing)}")
                            error_count += 1
                            continue

                    except Exception as e:
                        errors.append(f"{row_identifier}: Data extraction error: {e}")
                        error_count += 1
                        continue

                    # --- Step 2: Fetch the specific Employee Record using ALL 4 Keys ---
                    try:
                        # We use .filter().first() or .get() to find the specific visit record
                        # Note: Field names inside filter() must match your employee_details model exactly
                        employee = employee_details.objects.filter(
                            aadhar=aadhar_val,
                            year=year_val,
                            batch=batch_val,
                            hospitalName=hospital_val 
                        ).last()

                        if not employee:
                            employee = employee_details.objects.filter(
                            aadhar=aadhar_val
                            ).first()
                            if not employee:
                                continue
                            employee.year=year_val
                            employee.batch=batch_val
                            employee.hospitalName=hospital_val
                            employee.type_of_visit = "Preventive"
                            employee.register = "Annual / Periodical"
                            employee.purpose = "Medical Examination"
                            employee.pk = None
                            employee.id = None
                            mrd_no = str(x) + "12012026"
                            if(x > 9999):
                                mrd_no = "0"+ str(mrd_no)
                            elif(x > 999):
                                mrd_no = "00"+ str(mrd_no)
                            elif(x > 99):
                                mrd_no = "000"+ str(mrd_no)
                            elif(x > 9):
                                mrd_no = "0000"+ str(mrd_no)
                            else:
                                mrd_no = "00000"+ str(mrd_no)
                            x += 1
                            employee.mrdNo = mrd_no
                            employee.save()
                            Dashboard.objects.create(
                                mrdNo = employee.mrdNo,
                                type_of_visit = employee.type_of_visit,
                                register = employee.register,
                                purpose = employee.purpose,
                                hospitalName = employee.hospitalName,
                                batch = employee.batch,
                                year = employee.year,
                                emp_no = employee.emp_no,
                                type = employee.type,
                                entry_date = employee.entry_date,
                                status = employee.status,
                                date = timezone.now().date(),
                                visitOutcome = "Annual Checkup Completed",
                                aadhar = employee.aadhar
                            )
                            FitnessAssessment.objects.create(
                                mrdNo = employee.mrdNo,
                                status = FitnessAssessment.StatusChoices.COMPLETED,
                                emp_no = employee.emp_no,
                                aadhar = employee.aadhar
                            )
                        
                        current_mrd = employee.mrdNo
                        current_entry_date = employee.entry_date
                        
                        if not current_mrd:
                            errors.append(f"{row_identifier}: Employee found but MRD Number is missing in database.")
                            error_count += 1
                            continue
                        # assessment_data = FitnessAssessment.objects.filter(
                        #     mrdNo = current_mrd)
                        # if not assessment_data.exists():
                        #     errors.append(f"{row_identifier}: No FitnessAssessment record found for MRD Number {current_mrd}.")
                        #     error_count += 1
                        #     continue
                        # assessment_data.status = FitnessAssessment.StatusChoices.COMPLETED
                        # assessment_data.save()

                    except Exception as e:
                        errors.append(f"{row_identifier}: Database query error: {e}")
                        error_count += 1
                        continue

                    # --- Step 4: Process Medical Data ---
                    # The employee object passed here already contains the correct mrdNo and basic info
                    
                    try:
                        process_model_data(heamatalogy, HAEMATOLOGY_MAP, row, employee, current_entry_date)
                        process_model_data(RoutineSugarTests, SUGAR_TESTS_MAP, row, employee, current_entry_date)
                        # process_model_data(RenalFunctionTest, RENAL_FUNCTION_MAP, row, employee, current_entry_date)
                        # process_model_data(LipidProfile, LIPID_PROFILE_MAP, row, employee, current_entry_date)
                        # process_model_data(LiverFunctionTest, LIVER_FUNCTION_MAP, row, employee, current_entry_date)
                        # process_model_data(ThyroidFunctionTest, THYROID_FUNCTION_MAP, row, employee, current_entry_date)
                        # process_model_data(AutoimmuneTest, AUTOIMMUNE_MAP, row, employee, current_entry_date)
                        # process_model_data(CoagulationTest, COAGULATION_MAP, row, employee, current_entry_date)
                        # process_model_data(EnzymesCardiacProfile, ENZYMES_CARDIAC_MAP, row, employee, current_entry_date)
                        # process_model_data(UrineRoutineTest, URINE_ROUTINE_MAP, row, employee, current_entry_date)
                        # process_model_data(SerologyTest, SEROLOGY_MAP, row, employee, current_entry_date)
                        # process_model_data(MotionTest, MOTION_TEST_MAP, row, employee, current_entry_date)
                        # process_model_data(CultureSensitivityTest, CULTURE_SENSITIVITY_MAP, row, employee, current_entry_date)
                        # process_model_data(MensPack, MENS_PACK_MAP, row, employee, current_entry_date)
                        # process_model_data(WomensPack, WOMENS_PACK_MAP, row, employee, current_entry_date)
                        # process_model_data(OccupationalProfile, OCCUPATIONAL_PROFILE_MAP, row, employee, current_entry_date)
                        # process_model_data(OthersTest, OTHERS_TEST_MAP, row, employee, current_entry_date)
                        # process_model_data(OphthalmicReport, OPHTHALMIC_MAP, row, employee, current_entry_date)
                        # process_model_data(XRay, XRAY_MAP, row, employee, current_entry_date)
                        # process_model_data(USGReport, USG_MAP, row, employee, current_entry_date)
                        # process_model_data(CTReport, CT_MAP, row, employee, current_entry_date)
                        # process_model_data(MRIReport, MRI_MAP, row, employee, current_entry_date)
                        
                        success_count += 1

                    except Exception as e:
                        # Catch model saving errors
                        errors.append(f"{row_identifier}: Error saving test results: {e}")
                        error_count += 1
                        continue
                
                # If you want to strictly reject the file if ANY row fails:
                if error_count > 0:
                    raise Exception(f"Validation/Processing failed for {error_count} row(s).")

        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e),
                'success_count': 0, 
                'error_count': error_count,
                'errors': errors,
            }, status=400)

        return JsonResponse({
            'status': 'success',
            'message': f'Successfully processed {success_count} records.',
            'success_count': success_count,
            'error_count': 0,
            'errors': []
        }, status=201)


@csrf_exempt
def fetchadmindata(request):
    if request.method == "POST":
        data = list(Member.objects.all().values())
        return JsonResponse({'message':'Successfully retrieved data', 'data':data}, status = 200)
    else:
        return JsonResponse({'error':'Invalid Method'}, status = 500)



@csrf_exempt
def get_currentfootfalls(request):
    if request.method != "POST":
        return JsonResponse({'error': 'Invalid Method. Only POST is allowed.'}, status=405)

    try:
        # 1. Get optional filter parameters
        from_date_str = request.GET.get('fromDate')
        to_date_str = request.GET.get('toDate')
        purpose_str = request.GET.get('purpose')

        # 2. Start with base queryset
        queryset = employee_details.objects.all()

        # 3. Apply filters
        if from_date_str:
            queryset = queryset.filter(entry_date__gte=from_date_str)
        
        if to_date_str:
            queryset = queryset.filter(entry_date__lte=to_date_str)

        if purpose_str:
            queryset = queryset.filter(register=purpose_str)
            
        # 4. Default to today if no date range
        if not from_date_str and not to_date_str:
            today = date.today()
            queryset = queryset.filter(entry_date=today)
        
        # 5. Get Footfalls
        footfalls = list(queryset.order_by('-entry_date', '-id').values())

        if not footfalls:
            return JsonResponse({
                'message': 'No footfalls found for the selected criteria.',
                'data': []
            }, status=200)

        # 6. Extract MRDs based on type
        preventive_mrds = [
            f['mrdNo'] for f in footfalls if f['type_of_visit'] == 'Preventive' and f['mrdNo']
        ]
        curative_mrds = [
            f['mrdNo'] for f in footfalls if f['type_of_visit'] == 'Curative' and f['mrdNo']
        ]

        # 7. Fetch related records
        fitness_records = FitnessAssessment.objects.filter(mrdNo__in=preventive_mrds).values()
        consultation_records = Consultation.objects.filter(mrdNo__in=curative_mrds).values()

        # 8. Create maps
        fitness_map = {record['mrdNo']: record for record in fitness_records}
        consultation_map = {record['mrdNo']: record for record in consultation_records}

        # 9. Combine data (WITH STRICT FILTERING)
        response_data = []
        for footfall in footfalls:
            mrd_number = footfall.get('mrdNo')
            visit_type = footfall.get('type_of_visit')
            
            combined_record = {
                'details': footfall,
                'assessment': None,
                'consultation': None,
            }

            # --- KEY CHANGE HERE ---
            # If the related record is NOT found in the map, we skip this footfall completely.
            
            data_found = False

            if visit_type == 'Preventive':
                assessment_data = fitness_map.get(mrd_number)
                if assessment_data:
                    combined_record['assessment'] = assessment_data
                    data_found = True
            
            elif visit_type == 'Curative':
                consultation_data = consultation_map.get(mrd_number)
                if consultation_data:
                    combined_record['consultation'] = consultation_data
                    data_found = True
            
            # Only append if we actually found the linked data
            if data_found:
                response_data.append(combined_record)
        
        return JsonResponse(
            {'data': response_data, 'message': 'Successfully retrieved data'},
            status=200
        )

    except Exception as e:
        logger.exception("An error occurred in get_currentfootfalls")
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)

@csrf_exempt
def get_pendingfootfalls(request):
    if request.method != "POST":
        return JsonResponse({'error': 'Invalid Method. Only POST is allowed.'}, status=405)

    try:
        from_date_str = request.GET.get('fromDate')
        to_date_str = request.GET.get('toDate')
        purpose_str = request.GET.get('purpose')

        queryset = employee_details.objects.all()

        if from_date_str:
            queryset = queryset.filter(entry_date__gte=from_date_str)

        if to_date_str:
            queryset = queryset.filter(entry_date__lte=to_date_str)

        if purpose_str:
            queryset = queryset.filter(register=purpose_str)

        if not from_date_str and not to_date_str:
            today = date.today()
            queryset = queryset.filter(entry_date=today)

        # 1. Fetch ONLY pending MRDs from the child tables directly
        preventive_mrds = FitnessAssessment.objects.filter(
            status="pending"
        ).values_list('mrdNo', flat=True)

        curative_mrds = Consultation.objects.filter(
            status="pending"
        ).values_list('mrdNo', flat=True)

        # 2. Filter footfalls: This enforces that data MUST exist in child tables to be fetched here
        queryset = queryset.filter(
            Q(type_of_visit='Preventive', mrdNo__in=preventive_mrds) |
            Q(type_of_visit='Curative', mrdNo__in=curative_mrds)
        )

        footfalls = list(queryset.order_by('-entry_date', '-id').values())

        if not footfalls:
            return JsonResponse({
                'message': 'No pending footfalls found',
                'data': []
            }, status=200)

        # 3. Fetch full pending records for mapping
        fitness_records = FitnessAssessment.objects.filter(
            mrdNo__in=preventive_mrds,
            status="pending"
        ).values()

        consultation_records = Consultation.objects.filter(
            mrdNo__in=curative_mrds,
            status="pending"
        ).values()

        fitness_map = {record['mrdNo']: record for record in fitness_records}
        consultation_map = {record['mrdNo']: record for record in consultation_records}

        response_data = []
        for footfall in footfalls:
            mrd_number = footfall.get('mrdNo')
            visit_type = footfall.get('type_of_visit')

            combined_record = {
                'details': footfall,
                'assessment': None,
                'consultation': None
            }

            # --- STRICT FILTERING IN LOOP ---
            data_found = False

            if visit_type == 'Preventive':
                assessment_data = fitness_map.get(mrd_number)
                if assessment_data:
                    combined_record['assessment'] = assessment_data
                    data_found = True

            elif visit_type == 'Curative':
                consultation_data = consultation_map.get(mrd_number)
                if consultation_data:
                    combined_record['consultation'] = consultation_data
                    data_found = True

            # Only append if the child record definitely exists
            if data_found:
                response_data.append(combined_record)

        return JsonResponse(
            {'data': response_data, 'message': 'Pending records fetched successfully'},
            status=200
        )

    except Exception as e:
        logger.exception("Error in get_pendingfootfalls")
        return JsonResponse({'error': f'An error occurred: {str(e)}'}, status=500)

        

# jsw/views.py

# ... (other imports at the top of your file)
# Make sure these are present:
import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import IntegrityError
from .models import InstrumentCalibration

logger = logging.getLogger(__name__)

# ... (rest of your views.py file) ...

# ==============================================================================
# CORRECTED DELETE INSTRUMENT VIEW
# ==============================================================================

@csrf_exempt
def deleteInstrument(request):
    if request.method != "POST":
        return JsonResponse({'message': 'Invalid Method. Use POST.'}, status=405)

    try:
        data = json.loads(request.body)
        # --- MODIFIED: Delete based on the unique instrument_number ---
        inst_num_to_delete = data.get('instrument_number')

        if not inst_num_to_delete:
            return JsonResponse({'message': "The 'instrument_number' is required for deletion."}, status=400)

        # Find all records (history and pending) for this instrument number
        instruments_to_delete = InstrumentCalibration.objects.filter(instrument_number=inst_num_to_delete)

        if not instruments_to_delete.exists():
            return JsonResponse({'message': 'Instrument not found.'}, status=404)

        instrument_name = instruments_to_delete.first().instrument_name
        count, _ = instruments_to_delete.delete()
        
        logger.info(f"Deleted {count} records for instrument '{instrument_name}' (Number: {inst_num_to_delete})")
        return JsonResponse({'message': f"Instrument '{instrument_name}' and all its history have been deleted successfully."})

    except Exception as e:
        logger.exception(f"An unexpected error occurred in deleteInstrument")
        return JsonResponse({'message': 'An internal server error occurred.'}, status=500)




# ... (rest of your views.py file, including EditInstrument) ...
# jsw/views.py

# ... (other imports at the top of your file)
# Make sure these are present:
from .utils import parse_date_internal, get_next_due_date # Assuming these are in your utils.py or views.py
import logging

logger = logging.getLogger(__name__)

# ... (rest of your views)

# jsw/views.py

# jsw/views.py

# jsw/views.py

# jsw/views.py

@csrf_exempt
def EditInstrument(request):
    """
    Safely updates an existing instrument record. If the instrument is marked
    as obsolete, its calibration status is also finalized as 'obsolete'.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method. Only POST is allowed."}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        instrument_id = data.get("id")

        if not instrument_id:
            return JsonResponse({"error": "Instrument ID is required."}, status=400)

        with transaction.atomic():
            instrument = InstrumentCalibration.objects.get(id=instrument_id)
            original_instrument_number = instrument.instrument_number

            # Step 1: Update the specific record with all new data
            all_updatable_fields = [
                'instrument_number', 'equipment_sl_no', 'instrument_name',
                'certificate_number', 'make', 'model_number', 'freq',
                'calibration_date', 'calibration_status', 'inst_status'
            ]

            for field in all_updatable_fields:
                if field in data:
                    value = data[field]
                    if field == 'calibration_date' and value:
                        setattr(instrument, field, parse_date_internal(value))
                    else:
                        setattr(instrument, field, value)
            
            if 'calibration_date' in data or 'freq' in data:
                if instrument.calibration_date and instrument.freq:
                    instrument.next_due_date = get_next_due_date(
                        instrument.calibration_date.strftime('%Y-%m-%d'), 
                        instrument.freq
                    )

            # --- THIS IS THE FIX ---
            # If the user sets the instrument status to 'obsolete', we must also
            # update the calibration_status to 'obsolete'. This moves the record
            # from the 'Current Status' list to the 'History' list permanently.
            if 'inst_status' in data and data['inst_status'] == 'obsolete':
                instrument.calibration_status = 'obsolete'
                # An obsolete instrument has no next due date.
                instrument.next_due_date = None 
            # --- END OF FIX ---

            instrument.save()

            # Step 2: Propagate shared property changes
            shared_fields_to_sync = [
                'instrument_number', 'equipment_sl_no', 'instrument_name',
                'make', 'model_number'
            ]
            
            group_update_payload = {}
            for field in shared_fields_to_sync:
                if field in data:
                    group_update_payload[field] = data[field]

            if group_update_payload:
                InstrumentCalibration.objects.filter(
                    instrument_number=original_instrument_number
                ).update(**group_update_payload)
        
        logger.info(f"Instrument updated successfully: ID {instrument.id}")
        return JsonResponse({"message": "Instrument updated successfully."}, status=200)

    except InstrumentCalibration.DoesNotExist:
        return JsonResponse({"error": "Instrument not found."}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        logger.exception("Error updating instrument")
        return JsonResponse({"error": "An internal server error occurred.", "detail": str(e)}, status=500)

# Add this import at the top if it's not already there
from django.db.models import F

# ... (rest of your views.py file) ...

# Add this new function anywhere in your views.py
# jsw/views.py

# Make sure Max is imported from django.db.models at the top of your file
from django.db.models import Max

# ... (rest of your views.py file)

# Replace the old get_unique_instruments function with this one
@csrf_exempt
def get_unique_instruments(request):
    """
    Returns a list of unique instruments based on the most recent record
    for each distinct instrument number.
    """
    if request.method != 'GET':
        return JsonResponse({"error": "Invalid method. Use GET."}, status=405)

    try:
        # Step 1: Find the latest record 'id' for each instrument group.
        # This is the best way to get a single, most relevant entry per instrument.
        latest_ids_per_instrument = InstrumentCalibration.objects.values(
            'instrument_number'
        ).annotate(
            latest_id=Max('id')
        ).values_list('latest_id', flat=True)

        # Step 2: Fetch the full objects for those specific latest IDs.
        master_list_instruments = InstrumentCalibration.objects.filter(
            id__in=list(latest_ids_per_instrument)
        ).order_by('instrument_number')

        # Step 3: Serialize the data, now including frequency and certificate number.
        data = []
        for i in master_list_instruments:
            data.append({
                "instrument_number": i.instrument_number,
                "instrument_name": i.instrument_name,
                "entry_date": i.entry_date.strftime("%d-%b-%Y") if i.entry_date else None,
                "make": i.make,
                "model_number": i.model_number,
                "equipment_sl_no": i.equipment_sl_no,
                "inst_status": i.inst_status,
                # The new fields you requested
                "freq": i.freq,
                "last_calibration_date":i.calibration_date.strftime("%d-%b-%Y") if i.calibration_date else None,
                "nextDue":i.next_due_date.strftime("%d-%b-%Y") if i.next_due_date else None,
                "certificate_number": i.certificate_number,
            })

        return JsonResponse({"unique_instruments": data})

    except Exception as e:
        logger.exception("Error in get_unique_instruments")
        return JsonResponse({"error": "Server error.", "detail": str(e)}, status=500)   
    



@csrf_exempt
def delete_uploaded_file(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method. Use POST."}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    key = data.get('key')
    mrdNo = data.get('mrdNo')

    if not key or not mrdNo:
        return JsonResponse({"error": "Missing 'key' or 'mrdNo' in request."}, status=400)

    try:
        vitals_obj = vitals.objects.get(mrdNo=mrdNo)
    except Vitals.DoesNotExist:
        return JsonResponse({"error": "Vitals record not found."}, status=404)

    if not hasattr(vitals_obj, key):
        return JsonResponse({"error": f"Field '{key}' not found on Vitals."}, status=400)

    file_field = getattr(vitals_obj, key)

    if not file_field:
        return JsonResponse({"error": f"No file found in field '{key}'."}, status=400)

    # delete file from storage
    file_field.delete(save=False)

    # clear db field
    setattr(vitals_obj, key, None)
    vitals_obj.save()

    return JsonResponse({
        "success": True,
        "message": f"File in '{key}' deleted successfully."
    })




@csrf_exempt
def get_worker_documents(request):
    if request.method == "POST":
        try:
            # 1. Parse JSON body (Axios sends JSON, not Form Data)
            data = json.loads(request.body)
            aadhar = data.get('aadhar')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        if not aadhar:
            return JsonResponse({"error": "Missing 'aadhar' in request."}, status=400)

        # 2. Fetch ALL records for this aadhar (History of uploads)
        # We use .filter() instead of .get() to get a list
        # We order by id descending to show newest uploads first
        records = vitals.objects.filter(aadhar=aadhar).order_by('-id')

        if not records.exists():
            # It's not an error if no docs exist, just return empty list
            return JsonResponse({"status": "success", "documents": []})

        documents_list = []

        # 3. Define the mapping of Model Field Name -> Frontend Label
        # Only add fields that actually store files in your vitals model
        file_fields_map = [
            {'field': 'application_form', 'label': 'Application Form'},
            {'field': 'self_declared', 'label': 'Self Declaration'},
            {'field': 'consent', 'label': 'Consent Form'},
            {'field': 'report', 'label': 'Lab Report'},
            {'field': 'fc', 'label': 'Fitness Certificate'},
            {'field': 'manual', 'label': 'Confession/Manual'},
        ]

        # 4. Iterate through records and extract files
        for record in records:
            # Determine the date for this record (Handle entry_date or date field)
            # Use getattr to be safe if field doesn't exist, default to None
            record_date = getattr(record, 'entry_date', getattr(record, 'date', None))
            
            # Format date to string if it exists
            date_str = record_date.isoformat() if record_date else "Unknown Date"

            for item in file_fields_map:
                field_name = item['field']
                label = item['label']

                # Get the file field from the record
                file_instance = getattr(record, field_name, None)

                # Check if file exists and has a name (is not empty)
                if file_instance and file_instance.name:
                    documents_list.append({
                        "label": label,
                        # str(file_instance) usually returns the relative path (e.g., "pdfs/file.pdf")
                        # The frontend appends the media URL prefix.
                        "file_url": str(file_instance), 
                        "date": date_str
                    })

        # 5. Return the formatted list
        return JsonResponse({
            "status": "success", 
            "documents": documents_list
        }, status=200)

    else:
        return JsonResponse({"error": "Invalid method. Use POST."}, status=405)



from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import employee_details

@csrf_exempt
def get_worker_by_aadhar(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            aadhar = data.get('aadhar')

            if not aadhar or len(aadhar) != 12:
                return JsonResponse({'success': False, 'message': 'Invalid Aadhar'}, status=400)

            # Get the LATEST entry for this Aadhar number
            # We filter by aadhar and order by ID descending to get the newest record
            worker = employee_details.objects.filter(aadhar=aadhar).order_by('-id').first()

            if worker:
                return JsonResponse({
                    'success': True,
                    'data': {
                        'name': worker.name,
                        'employeeId': worker.emp_no, # Maps DB 'emp_no' to Frontend 'employeeId'
                        'organization': worker.employer, # Maps DB 'employer' to Frontend 'organization'
                        'contractorName': worker.employer, # For contractors, employer is the agency name
                        'role': worker.type # Useful to auto-switch role if needed
                    }
                }, status=200)
            else:
                return JsonResponse({'success': False, 'message': 'Worker not found'}, status=404)

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Invalid method'}, status=405)


@csrf_exempt
def update_employee_data(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            old_emp_no = data.get('emp_no')  # The ID to find the user
            field = data.get('field')        # The column to change
            new_value = data.get('value')    # The new value
            aadhar = data.get('aadhar')

            if not old_emp_no or not field:
                return JsonResponse({'success': False, 'message': 'emp_no and field are required'}, status=400)

            # 1. Check if the field actually exists on the model
            # Note: We use the class/model itself to check fields, not an instance
            model_fields = [f.name for f in employee_details._meta.get_fields()]
            if field not in model_fields:
                return JsonResponse({'success': False, 'message': f'Field {field} does not exist'}, status=400)

            # 2. Use filter().update() 
            # This generates a SQL UPDATE statement directly.
            # It handles Primary Key updates correctly (renaming) and prevents "INSERT" behavior.
            rows_affected = employee_details.objects.filter(aadhar=aadhar).update(**{field: new_value})

            if rows_affected > 0:
                return JsonResponse({'success': True, 'message': 'Updated successfully'}, status=200)
            else:
                return JsonResponse({'success': False, 'message': 'Employee not found'}, status=404)

        except Exception as e:
            # Print the error to your VS Code terminal so you can see it
            print("SERVER ERROR:", str(e)) 
            
            # Check for specific DB errors (like duplicate entry)
            if "UNIQUE constraint" in str(e) or "Duplicate entry" in str(e):
                return JsonResponse({'success': False, 'message': f'Value "{new_value}" already exists for {field}.'}, status=400)
                
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid method'}, status=405)


import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q, Max, Subquery, OuterRef
from datetime import date
from dateutil.relativedelta import relativedelta
from .models import *  # Ensure all your models are imported

@csrf_exempt
def get_filtered_data(request):
    if request.method != "POST":
        return JsonResponse({'error': 'Invalid method'}, status=405)

    try:
        filters_map = json.loads(request.body)
        
        # 1. Start with the latest record for every employee
        latest_ids = (
            employee_details.objects.values("aadhar")
            .annotate(latest_id=Max("id"))
            .values_list("latest_id", flat=True)
        )
        queryset = employee_details.objects.filter(id__in=latest_ids)

        # 2. Basic Employee Details Filters
        if filters_map.get('role'):
            queryset = queryset.filter(type__iexact=filters_map['role'])
        
        # Simple Mapping for standard fields
        simple_fields = {
            'sex': 'sex__iexact',
            'bloodgrp': 'bloodgrp',
            'marital_status': 'marital_status__iexact',
            'nationality': 'nationality__iexact',
            'designation': 'designation__icontains',
            'department': 'department__icontains',
            'employer': 'employer__iexact',
            'moj': 'moj__iexact',
            'job_nature': 'job_nature__icontains',
            'previousEmployer': 'previousemployer__icontains',
            'previousLocation': 'previouslocation__icontains',
            'dojFrom': 'doj__gte',
            'dojTo': 'doj__lte',
            'division': 'division__iexact',
            'workarea': 'workarea__iexact',
        }

        for key, lookup in simple_fields.items():
            if filters_map.get(key):
                queryset = queryset.filter(**{lookup: filters_map[key]})

        # Age Filter (Calculated from DOB)
        if filters_map.get('ageFrom'):
            start_date = date.today() - relativedelta(years=int(filters_map['ageFrom']))
            queryset = queryset.filter(dob__lte=start_date)
        if filters_map.get('ageTo'):
            end_date = date.today() - relativedelta(years=int(filters_map['ageTo']) + 1)
            queryset = queryset.filter(dob__gte=end_date)

        # Status Filter
        if filters_map.get('status'):
            queryset = queryset.filter(status__iexact=filters_map['status'])
            if filters_map['status'].lower() == 'transferred to' and filters_map.get('transferred_to'):
                queryset = queryset.filter(transfer_details__icontains=filters_map['transferred_to'])
            elif filters_map.get('from') or filters_map.get('to'):
                if filters_map.get('from'): queryset = queryset.filter(since_date__gte=filters_map['from'])
                if filters_map.get('to'): queryset = queryset.filter(since_date__lte=filters_map['to'])

        # 3. Vitals Filters (Subquery)
        for key, val in filters_map.items():
            if key.startswith('param_'):
                param = val.get('param')
                if val.get('value'): # BMI Category Case
                    v_aadhars = vitals.objects.filter(**{f"{param}_status__iexact": val.get('value')}).values_list('aadhar', flat=True)
                    queryset = queryset.filter(aadhar__in=v_aadhars)    
                else:
                    v_query = Q(**{f"{param}__gte": val.get('from'), f"{param}__lte": val.get('to')})
                    v_aadhars = vitals.objects.filter(v_query).values_list('aadhar', flat=True)
                    queryset = queryset.filter(aadhar__in=v_aadhars)

        
        for habit in ['smoking', 'alcohol', 'paan/beetle']:
            if filters_map.get(habit):
                # Search inside the JSON structure: {"smoking": {"yesNo": "Yes"}}
                print("Applying Habit Filter:", habit, filters_map[habit])
                mh_aadhars = MedicalHistory.objects.filter(
                    personal_history__contains={habit: {"yesNo": filters_map[habit]}}
                ).values_list('aadhar', flat=True)
                queryset = queryset.filter(aadhar__in=mh_aadhars)

        # Diet
        if filters_map.get('diet'):
            mh_aadhars = MedicalHistory.objects.filter(
                personal_history__diet__contains=filters_map['diet']
            ).values_list('aadhar', flat=True)
            queryset = queryset.filter(aadhar__in=mh_aadhars)

        if filters_map.get('drugAllergy'):
            print("Applying Drug Allergy Filter:", filters_map['drugAllergy'])
            mh_aadhars = MedicalHistory.objects.filter(
                allergy_fields__contains= {"drug": {"yesNo": filters_map['drugAllergy']}}
            ).values_list('aadhar', flat=True)
            queryset = queryset.filter(aadhar__in=mh_aadhars)

        if filters_map.get('foodAllergy'):
            print("Applying Food Allergy Filter:", filters_map['foodAllergy'])
            mh_aadhars = MedicalHistory.objects.filter(
                allergy_fields__contains= {"food": {"yesNo": filters_map['foodAllergy']}}
            ).values_list('aadhar', flat=True)
            queryset = queryset.filter(aadhar__in=mh_aadhars)

        if filters_map.get('otherAllergies'):
            print("Applying Other Allergy Filter:", filters_map['otherAllergies'])
            mh_aadhars = MedicalHistory.objects.filter(
                allergy_fields__contains= {"others": {"yesNo": filters_map['otherAllergies']}}
            ).values_list('aadhar', flat=True)
            queryset = queryset.filter(aadhar__in=mh_aadhars)

        # Personal History Conditions (e.g., personal_HTN)
        for key, val in filters_map.items():
            if key.startswith('personal_'):
                condition = key.replace('personal_', '')
                # Filter if the medical_data JSON has entries for this condition
                mh_aadhars = MedicalHistory.objects.filter(
                    medical_data__has_key=condition
                ).values_list('aadhar', flat=True)
                if val == 'No':
                    queryset = queryset.exclude(aadhar__in=mh_aadhars)
                else:
                    queryset = queryset.filter(aadhar__in=mh_aadhars)

        # 5. Fitness Assessment
        for key, val in filters_map.items():
            if key.startswith('fitness_'):
                # val is an object like {"tremors": "Positive", "overall_fitness": "fit"}
                f_query = Q()
                print("Applying Fitness Filter:", val)
                for f_key, f_val in val.items():
                    if f_key == "job_nature":
                        f_query &= Q(**{f"{f_key}__icontains": f_val})
                    else:
                        f_query &= Q(**{f"{f_key}__iexact": f_val})
                f_aadhars = FitnessAssessment.objects.filter(f_query).values_list('aadhar', flat=True)
                queryset = queryset.filter(aadhar__in=f_aadhars)

        # 6. Special Cases & Shifting Ambulance
        if filters_map.get('specialCase'):
            sc_val = filters_map['specialCase']
            sc_aadhars = FitnessAssessment.objects.filter(special_cases__iexact=sc_val).values_list('aadhar', flat=True)
            c_aadhars = Consultation.objects.filter(special_cases__iexact=sc_val).values_list('aadhar', flat=True)
            queryset = queryset.filter(Q(aadhar__in=sc_aadhars) | Q(aadhar__in=c_aadhars))

        if filters_map.get('shiftingAmbulance'):
            sa = filters_map['shiftingAmbulance']
            if sa.get('from') and sa.get('to'):
                sa_aadhars = Consultation.objects.filter(
                    shifting_required__iexact=sa['val'],
                    entry_date__gte=sa['from'],
                    entry_date__lte=sa['to']
                ).values_list('aadhar', flat=True)
                queryset = queryset.filter(aadhar__in=sa_aadhars)
            else:
                sa_aadhars = Consultation.objects.filter(
                    shifting_required__iexact=sa['val']
                ).values_list('aadhar', flat=True)
                queryset = queryset.filter(aadhar__in=sa_aadhars)


        # 8. Statutory Forms
        if filters_map.get('statutoryFormFilter'):
            sf = filters_map['statutoryFormFilter']
            form_model = globals()[sf['formType']] # Dynamically get Form17, Form38, etc.
            sf_query = Q()
            if sf.get('from'): sf_query &= Q(entry_date__gte=sf['from'])
            if sf.get('to'): sf_query &= Q(entry_date__lte=sf['to'])
            
            sf_aadhars = form_model.objects.filter(sf_query).values_list('aadhar', flat=True)
            queryset = queryset.filter(aadhar__in=sf_aadhars)

        # 9. Significant Notes
        if filters_map.get('significantNotes'):
            sn = filters_map['significantNotes']
            sn_query = Q()
            for sn_key, sn_val in sn.items():
                sn_query &= Q(**{f"{sn_key}__iexact": sn_val})
            sn_aadhars = SignificantNotes.objects.filter(sn_query).values_list('aadhar', flat=True)
            queryset = queryset.filter(aadhar__in=sn_aadhars)
        
        if any(k in filters_map for k in ['disease', 'vaccine', 'vaccine_status']):
            v_query = Q()
            if filters_map.get('disease'):
                # Handle case sensitivity (e.g., Covid-19 vs COVID-19)
                val = filters_map['disease']
                v_query |= Q(vaccination__contains=[{'disease_name': val}])
                v_query |= Q(vaccination__contains=[{'disease_name': val.upper()}])
                v_query |= Q(vaccination__contains=[{'disease_name': val.capitalize()}])
            
            if filters_map.get('vaccine'):
                print("Applying Vaccine Filter:", filters_map['vaccine'])
                v_query &= Q(vaccination__contains=[{'prophylaxis': filters_map['vaccine']}])
            
            if filters_map.get('vaccine_status'):
                v_query &= Q(vaccination__contains=[{'status': filters_map['vaccine_status']}])

            vac_aadhars = VaccinationRecord.objects.filter(v_query).values_list('aadhar', flat=True)
            queryset = queryset.filter(aadhar__in=vac_aadhars)
        
        for key, value in filters_map.items():
            if key.startswith('investigation_'):
                form_name = value.get('form')   # e.g., 'heamatalogy'
                param = value.get('param')      # e.g., 'hemoglobin'
                
                # Dynamically find the model (handling case differences)
                model_map = {
                    'heamatalogy': heamatalogy,
                    'routinesugartests': RoutineSugarTests,
                    'lipidprofile': LipidProfile,
                    'liverfunctiontest': LiverFunctionTest,
                    'thyroidfunctiontest': ThyroidFunctionTest,
                    'renalfunctiontests_and_electrolytes': RenalFunctionTest,
                    'urineroutinetest': UrineRoutineTest,
                    'autoimmunetest': AutoimmuneTest,
                    'coagulationtest': CoagulationTest,
                    'enzymescardiacprofile': EnzymesCardiacProfile,
                    'urineroutinetest': UrineRoutineTest,
                    'serologytest': SerologyTest,
                    'motiontest': MotionTest,
                    'culturesensitivitytest': CultureSensitivityTest,
                    'menspack' : MensPack,
                    'womenspack' : WomensPack,
                    'occupationalprofile': OccupationalProfile,
                    'otherstest': OthersTest,
                    'opthalmicreport': OphthalmicReport,
                    'xray': XRay,
                    'usgreport' : USGReport,
                    'ctreport' : CTReport,
                    'mrireport' : MRIReport,    
                }
                
                model_class = model_map.get(form_name.lower())
                if model_class:
                    inv_query = Q()
                    # Range filter (numeric)
                    if value.get('from') and value.get('to'):
                        # Using icontains on the comments field as per your JS logic 
                        # where values are often stored as strings in "param_comments"
                        inv_query &= Q(**{f"{param}__gte": value['from']})
                        inv_query &= Q(**{f"{param}__lte": value['to']})
                    
                    # Status filter (Normal/Abnormal)
                    if value.get('status'):
                        inv_query &= Q(**{f"{param}_comments__iexact": value['status']}) | Q(**{f"{param}_comments__iexact": value['status']})
                    
                    inv_aadhars = model_class.objects.filter(inv_query).values_list('aadhar', flat=True)
                    queryset = queryset.filter(aadhar__in=inv_aadhars)
                
            if key.startswith('referrals_'):
                print("Applying Referral Filter:", key, value)
                ref = value
                ref_query = Q()
                if ref.get('referred') == 'No':
                    ref_query = Q(referral__iexact='no') | Q(referral__isnull=True)
                else:
                    print("Applying Referral Filters:", ref)
                    ref_query = Q(referral__iexact='yes')
                    if ref.get('speciality'): ref_query &= Q(speciality__iexact=ref['speciality'])
                    if ref.get('hospitalName'): ref_query &= Q(hospital_name__icontains=ref['hospitalName'])
                    if ref.get('doctorName'): ref_query &= Q(doctor_name__icontains=ref['doctorName'])
                
                ref_aadhars = Consultation.objects.filter(ref_query).values_list('aadhar', flat=True)
                queryset = queryset.filter(aadhar__in=ref_aadhars)
            
            if key.startswith('statutory_'):
                print("Applying Statutory Filter:", key, value)
                form_type = value.get('formType')
                from_date = value.get('from')
                to_date = value.get('to')
                
                
                model_map = {
                    'Form17': Form17,
                    'Form38': Form38,
                    'Form39': Form39,
                    'Form40': Form40,
                    'Form27': Form27,
                }
                
                model_class = model_map.get(form_type)
                if model_class:
                    stat_query = Q()
                    
                    if from_date and to_date:
                        stat_query &= Q(entry_date__range=(from_date, to_date))
                    
                    stat_aadhars = model_class.objects.filter(stat_query).values_list('aadhar', flat=True)
                    queryset = queryset.filter(aadhar__in=stat_aadhars)

            if key.startswith('significant_'):
                print("Applying Significant Notes Filter:", key, value)
                sn = value
                if sn.get('special_case'):
                    print("Filtering Significant Notes by special_case:", sn['special_case'])
                    sn_aadhars = Consultation.objects.filter(special_cases__iexact=sn['special_case']).values_list('aadhar', flat=True)
                    sn_aadhars = list(sn_aadhars)
                    sn_aadhars.extend(FitnessAssessment.objects.filter(special_cases__iexact=sn['special_case']).values_list('aadhar', flat=True))
                    queryset = queryset.filter(aadhar__in=sn_aadhars)
                if sn.get('communicable_disease'):
                    print("Filtering Significant Notes by communicable_disease:", sn['communicable_disease'])
                    sn_aadhars = SignificantNotes.objects.filter(communicable_disease__iexact=sn['communicable_disease']).values_list('aadhar', flat=True)
                    queryset = queryset.filter(aadhar__in=sn_aadhars)
                if sn.get('incident_type'):
                    print("Filtering Significant Notes by incident_type:", sn['incident_type'])
                    sn_aadhars = SignificantNotes.objects.filter(incident_type__iexact=sn['incident_type']).values_list('aadhar', flat=True)
                    queryset = queryset.filter(aadhar__in=sn_aadhars)
                if sn.get('incident'):
                    print("Filtering Significant Notes by incident:", sn['incident'])
                    sn_aadhars = SignificantNotes.objects.filter(incident__icontains=sn['incident']).values_list('aadhar', flat=True)
                    queryset = queryset.filter(aadhar__in=sn_aadhars)
                if sn.get('illness_type'):
                    print("Filtering Significant Notes by illness_type:", sn['illness_type'])
                    sn_aadhars = SignificantNotes.objects.filter(illness_type__iexact=sn['illness_type']).values_list('aadhar', flat=True)
                    queryset = queryset.filter(aadhar__in=sn_aadhars)
            
            if key.startswith('purpose_'):
                print("Applying Purpose Filter:", key, value)
                purpose = value
                p_query = Q()
                if purpose.get('type_of_vsit'):
                    p_query &= Q(visit_type__iexact=purpose['type_of_vsit'])
                if purpose.get('register'):
                    p_query &= Q(register__icontains=purpose['register'])
                if purpose.get('fromDate'):
                    p_query &= Q(date__gte=purpose['fromDate'])
                if purpose.get('toDate'):
                    p_query &= Q(date__lte=purpose['toDate'])

                apt_aadhars = Dashboard.objects.filter(p_query).values_list('aadhar', flat=True)
                queryset = queryset.filter(aadhar__in=apt_aadhars)

        # Final serialization
        results = list(queryset.values(
            "id", "aadhar", "emp_no", "name", "sex", "dob", "type", "status", "nationality"
        ).order_by("-id"))

        return JsonResponse({'data': results, 'count': len(results)}, status=200)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)