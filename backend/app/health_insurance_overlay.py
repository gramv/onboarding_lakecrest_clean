from __future__ import annotations

import base64
import io
import os
import json
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime

import fitz  # PyMuPDF
from PIL import Image, ImageOps


STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
HI_TEMPLATE_PATH = os.path.join(STATIC_DIR, "HI Form_final3.pdf")
HI_MAPPING_PATH = os.path.join(STATIC_DIR, "health_insurance_mapping.json")


def _normalize_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in {"true", "1", "yes", "y"}
    return bool(value)


def _load_signature_image(signature_b64: str) -> Optional[Image.Image]:
    try:
        raw = base64.b64decode(signature_b64.split(',')[-1], validate=False)
        img = Image.open(io.BytesIO(raw)).convert("RGBA")
        # Remove near-white background for transparency
        datas = img.getdata()
        new_data = []
        for px in datas:
            r, g, b, a = px
            if r > 240 and g > 240 and b > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append((r, g, b, a))
        img.putdata(new_data)
        # Slight trim to remove empty borders
        bbox = ImageOps.invert(img.split()[3]).getbbox()  # use alpha channel
        if bbox:
            img = img.crop(bbox)
        return img
    except Exception:
        return None


class HealthInsuranceFormOverlay:
    """Overlay selections onto the official HI Form_final3.pdf template.
    
    This version properly sets widget field values instead of just drawing text.
    """
    
    def __init__(self):
        """Initialize the overlay with path validation"""
        if not os.path.exists(HI_TEMPLATE_PATH):
            raise FileNotFoundError(f"Health insurance template not found at: {HI_TEMPLATE_PATH}")
        print(f"✅ Health insurance template found at: {HI_TEMPLATE_PATH}")
    
    def extract_personal_info(self, form_data: Dict[str, Any]) -> Dict[str, str]:
        """Extract personal info with consistent field mapping and validation"""
        print("\n🔍 Extracting personal information...")
        
        # Try nested structure first (new format)
        personal_info = form_data.get("personalInfo", {})
        if not personal_info:
            personal_info = form_data.get("personal_info", {})
        
        # If no nested structure, try flat structure (backwards compatibility)
        if not personal_info:
            personal_info = form_data
        
        # Standardized field extraction with fallbacks
        extracted = {
            'first_name': (
                personal_info.get('firstName') or 
                personal_info.get('first_name') or 
                ''
            ),
            'last_name': (
                personal_info.get('lastName') or 
                personal_info.get('last_name') or 
                ''
            ),
            'middle_initial': (
                personal_info.get('middleInitial') or 
                personal_info.get('middleName', '')[:1] or 
                personal_info.get('middle_initial') or 
                personal_info.get('middle_name', '')[:1] or 
                ''
            ),
            'ssn': (
                personal_info.get('ssn') or 
                form_data.get('ssn') or 
                ''
            ),
            'date_of_birth': (
                personal_info.get('dateOfBirth') or 
                personal_info.get('date_of_birth') or 
                ''
            ),
            'email': (
                personal_info.get('email') or 
                personal_info.get('emailAddress') or 
                form_data.get('email') or 
                ''
            ),
            'phone': (
                personal_info.get('phone') or 
                personal_info.get('phoneNumber') or 
                personal_info.get('primaryPhone') or 
                form_data.get('phone') or 
                ''
            )
        }
        
        # Extract address information
        address_obj = personal_info.get("address") if isinstance(personal_info.get("address"), dict) else None
        address = personal_info.get("address") if isinstance(personal_info.get("address"), str) else ""
        
        if address_obj:
            line1 = address_obj.get("line1") or address_obj.get("street") or address_obj.get("street1") or ""
            line2 = address_obj.get("line2") or address_obj.get("apt") or ""
            address = (f"{line1} {line2}" if line2 else line1).strip()
        elif not address:
            line1 = personal_info.get("addressLine1") or personal_info.get("street") or ""
            line2 = personal_info.get("addressLine2") or personal_info.get("apt") or ""
            address = (f"{line1} {line2}" if line2 else line1).strip()
        
        extracted.update({
            'address': address,
            'city': (
                personal_info.get("city") or
                (address_obj.get("city") if address_obj else None) or
                personal_info.get("cityName") or
                ""
            ),
            'state': (
                personal_info.get("state") or
                (address_obj.get("state") if address_obj else None) or
                personal_info.get("stateCode") or
                personal_info.get("state_initials") or
                ""
            ),
            'zip_code': (
                personal_info.get("zip") or 
                personal_info.get("zipCode") or 
                personal_info.get("zip_code") or
                (address_obj.get("zip") if address_obj else None) or 
                (address_obj.get("postalCode") if address_obj else None) or
                ""
            )
        })
        
        # Convert gender
        raw_gender = personal_info.get("gender", "").lower()
        if raw_gender in ["male", "m"]:
            extracted['gender'] = "M"
        elif raw_gender in ["female", "f"]:
            extracted['gender'] = "F"
        else:
            extracted['gender'] = ""
        
        print(f"📋 Extracted personal info:")
        print(f"  Name: {extracted['first_name']} {extracted['middle_initial']} {extracted['last_name']}")
        print(f"  SSN: {'***-**-' + extracted['ssn'][-4:] if len(extracted['ssn']) >= 4 else 'Not provided'}")
        print(f"  DOB: {extracted['date_of_birth']}")
        print(f"  Gender: {extracted['gender']}")
        print(f"  Address: {extracted['address']}, {extracted['city']}, {extracted['state']} {extracted['zip_code']}")
        
        return extracted
    
    def validate_required_fields(self, personal_info: Dict[str, str]) -> Tuple[bool, List[str]]:
        """Validate that required personal info fields are present"""
        required_fields = ['first_name', 'last_name']
        missing_fields = []
        
        for field in required_fields:
            if not personal_info.get(field, '').strip():
                missing_fields.append(field)
        
        return len(missing_fields) == 0, missing_fields

    def _mask_ssn(self, ssn: str, mask_all: bool) -> str:
        if not ssn:
            return ""
        digits = ''.join([c for c in ssn if c.isdigit()])
        if len(digits) == 9:
            formatted = f"{digits[0:3]}-{digits[3:5]}-{digits[5:9]}"
            if mask_all:
                return f"***-**-{formatted[-4:]}"
            return formatted
        return ssn

    def _fmt_date(self, date_str: Optional[str]) -> str:
        if not date_str:
            return datetime.now().strftime('%m/%d/%Y')
        try:
            # Try ISO format
            dt = datetime.fromisoformat(date_str.replace('Z','+00:00'))
            return dt.strftime('%m/%d/%Y')
        except Exception:
            # Try other common formats
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y']:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime('%m/%d/%Y')
                except:
                    continue
            # Fallback to original
            return date_str

    def _set_text_field(self, page: fitz.Page, field_name: str, value: str) -> bool:
        """Set a text field value by name."""
        if not value:
            print(f"_set_text_field: No value provided for field {field_name}")
            return False
        
        print(f"\nAttempting to set text field: {field_name}")
        print(f"Value to set: {value}")
        
        found_field = False
        for widget in page.widgets():
            print(f"Found widget: {widget.field_name} (type: {widget.field_type_string})")
            if widget.field_name == field_name:
                found_field = True
                try:
                    widget.field_value = str(value)
                    widget.update()
                    print(f"Successfully set field {field_name} to: {value}")
                    return True
                except Exception as e:
                    print(f"Error setting field {field_name}: {e}")
                    print(f"Widget details: type={widget.field_type_string}, rect={widget.rect}")
        
        if not found_field:
            print(f"No widget found with name: {field_name}")
            print("Available widgets:")
            for widget in page.widgets():
                print(f"  - {widget.field_name} ({widget.field_type_string})")
        
        return False

    def _set_checkbox(self, page: fitz.Page, field_name: str, checked: bool = True) -> bool:
        """Set a checkbox field value by name with fuzzy matching."""
        print(f"    🔍 _set_checkbox called: field_name='{field_name}', checked={checked}")

        # First try exact match
        for widget in page.widgets():
            if widget.field_name == field_name and widget.field_type_string == "CheckBox":
                try:
                    print(f"    📍 Found exact match: '{widget.field_name}' (current value: {widget.field_value})")
                    widget.field_value = bool(checked)
                    widget.update()
                    print(f"    ✅ Set checkbox '{field_name}' to {checked} (new value: {widget.field_value})")
                    return True
                except Exception as e:
                    print(f"    ❌ Error setting checkbox {field_name}: {e}")

        # Try case-insensitive match
        field_name_lower = field_name.lower()
        for widget in page.widgets():
            if widget.field_name.lower() == field_name_lower and widget.field_type_string == "CheckBox":
                try:
                    print(f"    📍 Found case-insensitive match: '{widget.field_name}' (current value: {widget.field_value})")
                    widget.field_value = bool(checked)
                    widget.update()
                    print(f"    ✅ Set checkbox '{field_name}' to {checked} via case-insensitive (new value: {widget.field_value})")
                    return True
                except Exception as e:
                    print(f"    ❌ Error setting checkbox {field_name} (case-insensitive): {e}")

        # Try partial match (contains)
        for widget in page.widgets():
            if field_name_lower in widget.field_name.lower() and widget.field_type_string == "CheckBox":
                try:
                    print(f"    📍 Found partial match: '{widget.field_name}' (current value: {widget.field_value})")
                    widget.field_value = bool(checked)
                    widget.update()
                    print(f"    ✅ Set checkbox '{field_name}' to {checked} via partial match (new value: {widget.field_value})")
                    return True
                except Exception as e:
                    print(f"    ❌ Error setting checkbox {field_name} (partial match): {e}")

        print(f"    ❌ No checkbox found matching '{field_name}'")
        return False

    def _set_radio_button(self, page: fitz.Page, field_name: str, checked: bool = True) -> bool:
        """Set a radio button field value by name."""
        for widget in page.widgets():
            if widget.field_name == field_name and widget.field_type_string == "RadioButton":
                try:
                    widget.field_value = bool(checked)
                    widget.update()
                    return True
                except Exception as e:
                    print(f"Error setting radio {field_name}: {e}")
        return False
    
    def _set_gender_radio(self, page: fitz.Page, gender: str) -> bool:
        """Simplified gender radio button setting with better error handling"""
        if gender not in ['M', 'F']:
            print(f"⚠️ Invalid gender value: '{gender}'. Expected 'M' or 'F'")
            return False
        
        print(f"\n🎯 Setting gender radio button: {gender}")
        
        # Look for common gender field patterns
        patterns = ['Gender', 'Sex', 'Male', 'Female', 'gender', 'sex']
        
        for pattern in patterns:
            gender_widgets = []
            for widget in page.widgets():
                if (pattern.lower() in widget.field_name.lower() and 
                    widget.field_type_string == "RadioButton"):
                    gender_widgets.append(widget)
            
            if len(gender_widgets) == 2:
                # Sort widgets left to right (Male typically comes first)
                gender_widgets.sort(key=lambda w: (w.rect.x0, w.rect.y0))
                
                # First widget = Male, Second widget = Female
                target_widget = gender_widgets[0] if gender == 'M' else gender_widgets[1]
                
                try:
                    # Clear both first
                    for widget in gender_widgets:
                        widget.field_value = False
                        widget.update()
                    
                    # Set the target one
                    target_widget.field_value = True
                    target_widget.update()
                    
                    print(f"✅ Successfully set gender radio: {target_widget.field_name} = {gender}")
                    return True
                except Exception as e:
                    print(f"❌ Error setting gender radio: {e}")
                    continue
        
        # Fallback: try direct field name matching
        direct_patterns = [f"{gender}", gender.lower(), 
                          "Male" if gender == "M" else "Female"]
        
        for pattern in direct_patterns:
            for widget in page.widgets():
                if (widget.field_name == pattern and 
                    widget.field_type_string == "RadioButton"):
                    try:
                        widget.field_value = True
                        widget.update()
                        print(f"✅ Set gender via direct match: {widget.field_name}")
                        return True
                    except Exception as e:
                        print(f"❌ Error in direct gender match: {e}")
        
        print(f"❌ Failed to set gender radio button for: {gender}")
        
        # Debug: List all available radio buttons
        all_radios = [w for w in page.widgets() if w.field_type_string == "RadioButton"]
        print(f"🔍 Available radio buttons: {[w.field_name for w in all_radios]}")
        
        return False
    
    def _validate_pdf_fields(self, page: fitz.Page) -> Tuple[bool, List[str]]:
        """Validate that expected PDF fields exist on the page"""
        print("\n🔍 Validating PDF form fields...")
        
        # Get all available fields
        available_fields = [w.field_name for w in page.widgets()]
        text_fields = [w.field_name for w in page.widgets() if w.field_type_string == "Text"]
        radio_fields = [w.field_name for w in page.widgets() if w.field_type_string == "RadioButton"]
        checkbox_fields = [w.field_name for w in page.widgets() if w.field_type_string == "CheckBox"]
        
        print(f"📊 PDF Form Analysis:")
        print(f"  Total widgets: {len(available_fields)}")
        print(f"  Text fields: {len(text_fields)}")
        print(f"  Radio buttons: {len(radio_fields)}")
        print(f"  Checkboxes: {len(checkbox_fields)}")
        
        # Check for expected key fields
        expected_fields = [
            "Employees Name Last First MI",
            "Social Security", 
            "Birth Date",
            "Employees Address",
            "City", 
            "State", 
            "Zip",
            "Phone Number",
            "Email Address"
        ]
        
        missing_fields = []
        found_fields = []
        
        for expected in expected_fields:
            # Try exact match first
            if expected in available_fields:
                found_fields.append(expected)
            else:
                # Try fuzzy matching
                found = False
                for available in available_fields:
                    if expected.lower().replace(" ", "") in available.lower().replace(" ", ""):
                        found_fields.append(f"{expected} (matched as: {available})")
                        found = True
                        break
                if not found:
                    missing_fields.append(expected)
        
        print(f"✅ Found fields: {len(found_fields)}")
        for field in found_fields:
            print(f"  - {field}")
        
        if missing_fields:
            print(f"❌ Missing fields: {len(missing_fields)}")
            for field in missing_fields:
                print(f"  - {field}")
        
        return len(missing_fields) == 0, missing_fields
    
    def _draw_text(self, page: fitz.Page, rect: fitz.Rect, text: str, fontsize: float = 9.0):
        """Draw simple text inside rect with small padding."""
        if not text:
            return
        pad_x = 2
        pad_y = rect.height * 0.2
        x = rect.x0 + pad_x
        y = rect.y0 + rect.height - pad_y
        try:
            page.insert_text((x, y), text, fontsize=fontsize, color=(0, 0, 0))
        except Exception as e:
            print(f"Error drawing text note: {e}")
    
    def _draw_note_near_widget(self, page: fitz.Page, widget_name: str, text: str, dx: float = 6.0, dy: float = 0.0):
        """Place a small text note to the right of a given widget, if found."""
        try:
            for w in page.widgets():
                if w.field_name == widget_name:
                    # Place a small rect to the right of the widget
                    base = w.rect
                    note_rect = fitz.Rect(base.x1 + dx, base.y0 + dy, base.x1 + dx + 180, base.y0 + dy + 12)
                    self._draw_text(page, note_rect, text, fontsize=8.5)
                    return True
        except Exception as e:
            print(f"Error placing note near widget {widget_name}: {e}")
        return False
    
    def _load_mapping(self) -> Dict[str, Any]:
        try:
            if os.path.exists(HI_MAPPING_PATH):
                with open(HI_MAPPING_PATH, 'r') as f:
                    return json.load(f) or {}
        except Exception as e:
            print(f"Failed to load HI mapping JSON: {e}")
        return {}

    def _search_first(self, page: fitz.Page, text: str) -> Optional[fitz.Rect]:
        try:
            hits = page.search_for(text, hit_max=1)
            if hits:
                return hits[0]
        except Exception:
            pass
        return None

    def _set_text_by_label_fallback(self, page: fitz.Page, label_text: str, value: str, dx: float = 100.0, width: float = 220.0) -> bool:
        """When no AcroForm field exists, write text relative to a label on the page."""
        if not value:
            return False
        label_rect = self._search_first(page, label_text)
        if not label_rect:
            return False
        rect = fitz.Rect(label_rect.x1 + dx, label_rect.y0 - 2, label_rect.x1 + dx + width, label_rect.y0 + 12)
        self._draw_text(page, rect, str(value), fontsize=9)
        return True

    def _set_text_by_mapping(self, page: fitz.Page, mapping: Dict[str, Any], key: str, value: str, fontsize: float = 9.0) -> bool:
        """Set text using coordinate mapping from JSON file."""
        print(f"\nAttempting to set text by mapping: {key}")
        print(f"Value to set: {value}")
        
        if not value:
            print("No value provided")
            return False
            
        fields = mapping.get('fields') if isinstance(mapping, dict) else None
        if not isinstance(fields, dict):
            print("Invalid mapping structure - no fields dictionary")
            print(f"Mapping type: {type(mapping)}")
            return False
            
        print(f"Available mapping fields: {list(fields.keys())}")
        rect_arr = fields.get(key)
        print(f"Found coordinates for {key}: {rect_arr}")
        
        if isinstance(rect_arr, list) and len(rect_arr) == 4:
            try:
                rect = fitz.Rect(*rect_arr)
                print(f"Created rectangle at coordinates: {rect}")
                self._draw_text(page, rect, str(value), fontsize=fontsize)
                print(f"Successfully drew text at coordinates")
                return True
            except Exception as e:
                print(f"Error drawing text: {e}")
                return False
        else:
            print(f"Invalid coordinates for {key}: {rect_arr}")
            print("Expected list of 4 numbers [x0, y0, x1, y1]")
        return False

    def _try_set_text(self, page: fitz.Page, mapping: Dict[str, Any], field_key: str, value: str,
                      label_variants: List[str], fontsize: float = 9.0) -> bool:
        """Robust setter: try AcroForm, then mapping coords, then label-relative fallback(s)."""
        if not value:
            return False
        # 1) Try AcroForm field
        if self._set_text_field(page, field_key, value):
            return True
        # 2) Try mapping coordinates
        if self._set_text_by_mapping(page, mapping, field_key, value, fontsize=fontsize):
            return True
        # 3) Try label-relative fallback with multiple variants
        for label in label_variants:
            if self._set_text_by_label_fallback(page, label, value):
                return True
        return False

    def _checkboxes_in_row_near_label(self, page: fitz.Page, label_text: str) -> List[fitz.Widget]:
        """Find checkboxes in the same horizontal band to the right of a given label."""
        label_rect = self._search_first(page, label_text)
        if not label_rect:
            return []
        y0 = label_rect.y0 - 20
        y1 = label_rect.y0 + 40
        cbs: List[fitz.Widget] = []
        for w in page.widgets():
            if w.field_type_string == "CheckBox":
                r = w.rect
                if r.y0 >= y0 and r.y1 <= y1 and r.x0 > label_rect.x1:
                    cbs.append(w)
        cbs.sort(key=lambda w: (w.rect.x0, w.rect.y0))
        return cbs

    def generate(self, form_data: Dict[str, Any], employee_first: str, employee_last: str,
                 signature_b64: Optional[str] = None, signed_date: Optional[str] = None,
                 preview: bool = True, return_details: bool = False) -> Union[bytes, Tuple[bytes, List[str], List[Dict[str, Any]]]]:

        print("\n" + "="*50)
        print("🏥 HEALTH INSURANCE PDF GENERATION STARTED")
        print("="*50)

        doc = None  # Initialize doc variable for finally block
        try:
            # Step 1: Validate inputs
            if not form_data:
                raise ValueError("Form data is required")
            
            # Step 2: Extract and validate personal information
            personal_info = self.extract_personal_info(form_data)
            is_valid, missing_fields = self.validate_required_fields(personal_info)
            
            if not is_valid:
                raise ValueError(f"Missing required personal info fields: {missing_fields}")
            
            # Use extracted names with fallback to parameters
            first_name = personal_info['first_name'] or employee_first or ""
            last_name = personal_info['last_name'] or employee_last or ""
            middle_initial = personal_info['middle_initial']
            
            if not first_name or not last_name:
                raise ValueError("Employee first and last name are required")

            # Step 3: Open PDF document and validate
            print(f"\n📄 Opening PDF template: {HI_TEMPLATE_PATH}")
            doc = fitz.open(HI_TEMPLATE_PATH)
            
            if doc.page_count < 1:
                raise ValueError("PDF template has no pages")
            
            page1 = doc[0]
            page2 = doc[1] if doc.page_count >= 2 else None
            
            # Step 4: Validate PDF form fields
            fields_valid, missing_pdf_fields = self._validate_pdf_fields(page1)
            if not fields_valid:
                print(f"⚠️ Warning: Some expected PDF fields are missing: {missing_pdf_fields}")
                print("PDF generation will continue using coordinate-based fallback")
            
            # Step 5: Load field mappings
            mapping = self._load_mapping()
            
            actions: List[Dict[str, Any]] = []
            warnings: List[str] = []
            
            # Step 6: Use already extracted personal information 
            ssn = personal_info['ssn']
            date_of_birth = personal_info['date_of_birth']
            phone = personal_info['phone']
            email = personal_info['email']
            address = personal_info['address']
            city = personal_info['city']
            state = personal_info['state']
            zip_code = personal_info['zip_code']
            gender = personal_info['gender']
            
            # Step 7: Extract other form data
            is_waived = _normalize_bool(form_data.get("isWaived", False))
            
            # Extract coverage information
            medical_plan = form_data.get("medicalPlan", "")
            medical_tier = form_data.get("medicalTier", "employee").lower()
            medical_waived = _normalize_bool(form_data.get("medicalWaived", False))
            
            # Frontend sends dentalEnrolled/visionEnrolled for UI integration
            # But also dentalCoverage/visionCoverage for backwards compatibility
            print(f"\nDental coverage data received:")
            print(f"  Raw dentalEnrolled: {form_data.get('dentalEnrolled')} (type: {type(form_data.get('dentalEnrolled'))})")
            print(f"  Raw dentalCoverage: {form_data.get('dentalCoverage')} (type: {type(form_data.get('dentalCoverage'))})")
            print(f"  Raw dentalTier: {form_data.get('dentalTier')} (type: {type(form_data.get('dentalTier'))})")
            print(f"  Raw dentalWaived: {form_data.get('dentalWaived')} (type: {type(form_data.get('dentalWaived'))})")

            dental_enrolled = _normalize_bool(form_data.get("dentalEnrolled", False))
            dental_coverage_legacy = _normalize_bool(form_data.get("dentalCoverage", False))
            dental_coverage = dental_enrolled or dental_coverage_legacy
            dental_tier = form_data.get("dentalTier", "employee").lower()
            dental_waived = _normalize_bool(form_data.get("dentalWaived", False))

            print(f"  Normalized dental_enrolled: {dental_enrolled}")
            print(f"  Normalized dental_coverage_legacy: {dental_coverage_legacy}")
            print(f"  Final dental_coverage: {dental_coverage}")
            print(f"  Normalized dental_tier: '{dental_tier}'")
            print(f"  Normalized dental_waived: {dental_waived}")

            vision_enrolled = _normalize_bool(form_data.get("visionEnrolled", False))
            vision_coverage_legacy = _normalize_bool(form_data.get("visionCoverage", False))
            vision_coverage = vision_enrolled or vision_coverage_legacy
            vision_tier = form_data.get("visionTier", "employee").lower()
            vision_waived = _normalize_bool(form_data.get("visionWaived", False))

            # Debug logging for coverage decisions
            print(f"\nCoverage Analysis:")
            print(f"  Dental - enrolled: {dental_enrolled}, legacy: {dental_coverage_legacy}, final: {dental_coverage}, waived: {dental_waived}, tier: {dental_tier}")
            print(f"  Vision - enrolled: {vision_enrolled}, legacy: {vision_coverage_legacy}, final: {vision_coverage}, waived: {vision_waived}, tier: {vision_tier}")
            
            # Extract other data
            dependents = form_data.get("dependents", [])
            effective_date = form_data.get("effectiveDate", "")
            section125_ack = _normalize_bool(form_data.get("section125Acknowledgment", False))
            irs_affirm = _normalize_bool(form_data.get("irsDependentConfirmation", False))
            has_stepchildren = _normalize_bool(form_data.get("hasStepchildren", False))
            stepchildren_names = form_data.get("stepchildrenNames", "")
            dependents_supported = _normalize_bool(form_data.get("dependentsSupported", False))
            
            # Debug logging for field mapping
            print("\nMapping personal info to PDF fields:")
            print(f"Name to map: {last_name}, {first_name} {middle_initial}")
            print(f"Available mapping fields: {list(mapping.get('fields', {}).keys())}")

            # Debug: List all widgets on page1 for troubleshooting
            print(f"\nAll widgets on page1:")
            for widget in page1.widgets():
                print(f"  {widget.field_type_string}: '{widget.field_name}'")
            
            # Fill Page 1 Fields (Personal Information) with robust fallback
            name_field = f"{last_name}, {first_name} {middle_initial}".strip()
            print(f"\nAttempting to set name field: {name_field}")
            if self._try_set_text(
                page1, mapping, "Employees Name Last First MI", name_field,
                [
                    "Employees Name Last First MI",
                    "Employee Name",
                    "Employee Name (Last, First, MI)",
                    "Employee’s Name (Last, First, MI)",
                    "Employee’s Name",
                    "Employee"
                ]
            ):
                actions.append({"field": "Employees Name", "action": "text", "pg": 1})

            ssn_str = self._mask_ssn(ssn, mask_all=preview)
            if self._try_set_text(
                page1, mapping, "Social Security", ssn_str,
                ["Social Security", "Social Security #", "SSN", "SSN required"]
            ):
                actions.append({"field": "SSN", "action": "text", "pg": 1})

            dob_str = self._fmt_date(date_of_birth)
            if self._try_set_text(
                page1, mapping, "Birth Date", dob_str,
                ["Birth Date", "Date of Birth"]
            ):
                actions.append({"field": "Birth Date", "action": "text", "pg": 1})

            if self._try_set_text(
                page1, mapping, "Employees Address", address,
                ["Employees Address", "Employee’s Address", "Address"]
            ):
                actions.append({"field": "Address", "action": "text", "pg": 1})

            if self._try_set_text(page1, mapping, "City", city, ["City"]):
                actions.append({"field": "City", "action": "text", "pg": 1})

            if self._try_set_text(page1, mapping, "State", state, ["State"]):
                actions.append({"field": "State", "action": "text", "pg": 1})

            if self._try_set_text(
                page1, mapping, "Zip", zip_code,
                ["Zip", "Zip Code", "ZipCode"]
            ):
                actions.append({"field": "Zip", "action": "text", "pg": 1})

            if self._try_set_text(
                page1, mapping, "Phone Number", phone,
                ["Phone Number", "Phone"]
            ):
                actions.append({"field": "Phone", "action": "text", "pg": 1})

            if self._try_set_text(
                page1, mapping, "Email Address", email,
                ["Email Address", "Email"]
            ):
                actions.append({"field": "Email", "action": "text", "pg": 1})
            
            # Set effective date
            if (self._set_text_field(page1, "Effective Date", self._fmt_date(effective_date)) or
                self._set_text_by_mapping(page1, mapping, "Effective Date", self._fmt_date(effective_date))):
                actions.append({"field": "Effective Date", "action": "text", "pg": 1})
            
            # Set gender radio buttons using simplified method
            if gender and self._set_gender_radio(page1, gender):
                actions.append({"field": "Gender", "action": f"radio_{gender}", "pg": 1})
            elif gender:
                warnings.append(f"Could not set gender radio button for value: {gender}")

            # Handle Medical Coverage
            if is_waived or medical_waived:
                # Check decline boxes
                self._set_checkbox(page1, "I Decline Medical Coverage", True)
                actions.append({"field": "Medical Decline", "action": "check", "pg": 1})
            else:
                # Select medical plan tier
                medical_checkboxes = self._get_medical_tier_checkbox_name(medical_plan, medical_tier)
                for checkbox_name in medical_checkboxes:
                    if self._set_checkbox(page1, checkbox_name, True):
                        actions.append({"field": f"Medical {medical_plan} {medical_tier}", "action": "check", "pg": 1})
                        break
            
            # Track which checkbox was used for dental (needed for vision conflict resolution)
            dental_checkbox_used = None
            dental_tier_selected = None
            
            # Handle Dental Coverage
            print(f"\nDental Coverage Decision:")
            print(f"  dental_enrolled: {dental_enrolled}")
            print(f"  dental_coverage_legacy: {dental_coverage_legacy}")
            print(f"  dental_coverage (final): {dental_coverage}")
            print(f"  dental_waived: {dental_waived}")
            print(f"  dental_tier: {dental_tier}")
            print(f"  Should decline: {dental_waived or (not dental_coverage)}")

            # List all available checkboxes for debugging
            all_checkboxes = [w.field_name for w in page1.widgets() if w.field_type_string == "CheckBox"]
            print(f"  Available checkboxes on page1: {all_checkboxes}")

            if dental_waived or (not dental_coverage):
                print(f"  📋 Setting dental decline checkbox")
                decline_patterns = ["I Decline Dental Coverage", "Decline Dental", "No Dental", "Dental Decline"]
                decline_success = False

                for pattern in decline_patterns:
                    if self._set_checkbox(page1, pattern, True):
                        actions.append({"field": f"Dental Decline ({pattern})", "action": "check", "pg": 1})
                        print(f"  ✅ Successfully set dental decline: '{pattern}'")
                        decline_success = True
                        break

                if not decline_success:
                    print(f"  ❌ Failed to set dental decline checkbox with any pattern")
                    warnings.append("Could not set dental decline checkbox")
            else:
                dental_checkbox = self._get_dental_tier_checkbox_name(dental_tier)
                print(f"  📋 Setting dental tier checkbox: '{dental_checkbox}' for tier: '{dental_tier}'")

                # Try the exact checkbox name first
                print(f"  🔧 Attempting to set dental checkbox: '{dental_checkbox}'")
                if self._set_checkbox(page1, dental_checkbox, True):
                    actions.append({"field": f"Dental {dental_tier}", "action": "check", "pg": 1})
                    print(f"  ✅ Successfully set dental checkbox: '{dental_checkbox}'")
                    
                    # Track that we used this checkbox for dental
                    dental_checkbox_used = dental_checkbox
                    dental_tier_selected = dental_tier

                    # Verify it's actually set by checking the widget value
                    for widget in page1.widgets():
                        if widget.field_name == dental_checkbox and widget.field_type_string == "CheckBox":
                            print(f"  🔍 Verification: '{dental_checkbox}' current value = {widget.field_value}")
                            break
                else:
                    # Try alternative patterns
                    alt_patterns = [
                        f"Employee Only",
                        f"Employee",
                        f"Dental Employee",
                        f"Employee Dental",
                        dental_tier.title(),
                        dental_tier.upper()
                    ]

                    dental_success = False
                    for pattern in alt_patterns:
                        if self._set_checkbox(page1, pattern, True):
                            actions.append({"field": f"Dental Alt ({pattern})", "action": "check", "pg": 1})
                            print(f"  ✅ Successfully set dental checkbox with pattern: '{pattern}'")
                            dental_success = True
                            # Track the checkbox used
                            dental_checkbox_used = pattern
                            dental_tier_selected = dental_tier
                            break

                    if not dental_success:
                        print(f"  ❌ Failed to set dental checkbox: '{dental_checkbox}' or any alternative")
                        warnings.append(f"Could not set dental checkbox for tier: {dental_tier}")
            
            # Handle Vision Coverage with Smart Conflict Resolution
            print(f"\nVision Coverage Decision:")
            print(f"  vision_enrolled: {vision_enrolled}")
            print(f"  vision_coverage: {vision_coverage}")
            print(f"  vision_waived: {vision_waived}")
            print(f"  vision_tier: {vision_tier}")
            print(f"  Should decline vision: {vision_waived or (not vision_coverage)}")
            print(f"  Dental checkbox used: {dental_checkbox_used}")
            print(f"  Dental tier selected: {dental_tier_selected}")

            if vision_waived or (not vision_coverage):
                print(f"  📋 Setting vision decline checkbox")
                
                # Try the specific vision decline checkbox
                decline_success = False
                if self._set_checkbox(page1, "I Decline Vision Coverage", True):
                    actions.append({"field": "Vision Decline", "action": "check", "pg": 1})
                    print(f"  ✅ Successfully set vision decline checkbox")
                    decline_success = True
                
                if not decline_success:
                    # Add text note for decline if checkbox fails
                    print(f"  📝 Adding text note for vision decline")
                    self._try_set_text(
                        page1, mapping, "Vision Notes",
                        "Vision Coverage: DECLINED",
                        ["Vision_Notes", "VisionNotes"]
                    )
                    warnings.append("Vision declined via text (checkbox not available)")
            else:
                # Vision is enrolled - vision has its own separate checkboxes
                print(f"  ✅ Setting vision checkbox (separate from dental)")
                vision_checkbox = self._get_vision_tier_checkbox_name(vision_tier)
                print(f"  🔧 Attempting to set vision checkbox: '{vision_checkbox}' for tier: '{vision_tier}'")

                if self._set_checkbox(page1, vision_checkbox, True):
                    actions.append({"field": f"Vision {vision_tier}", "action": "check", "pg": 1})
                    print(f"  ✅ Successfully set vision checkbox: '{vision_checkbox}'")

                    # Verify it's actually set
                    for widget in page1.widgets():
                        if widget.field_name == vision_checkbox and widget.field_type_string == "CheckBox":
                            print(f"  🔍 Verification: '{vision_checkbox}' current value = {widget.field_value}")
                            break
                else:
                    # Try alternative patterns if exact name fails
                    print(f"  ⚠️ Failed to set vision checkbox: '{vision_checkbox}', trying alternatives")
                    alt_patterns = [
                        f"Employee Only_5",
                        f"Employee  Spouse_6",
                        f"Employee  Family_7"
                    ]

                    vision_success = False
                    for pattern in alt_patterns:
                        if self._set_checkbox(page1, pattern, True):
                            actions.append({"field": f"Vision Alt ({pattern})", "action": "check", "pg": 1})
                            print(f"  ✅ Successfully set vision checkbox with pattern: '{pattern}'")
                            vision_success = True
                            break

                    if not vision_success:
                        # Fallback to text notation
                        tier_label_map = {
                            'employee': 'Employee Only',
                            'employee_spouse': 'Employee + Spouse',
                            'employee_children': 'Employee + Children',
                            'family': 'Employee + Family'
                        }
                        vision_text = f"Vision Coverage: {tier_label_map.get(vision_tier, vision_tier.title())}"
                        print(f"  📝 Adding vision coverage to text: {vision_text}")

                        # Try to set vision info in a text field
                        if not self._try_set_text(
                            page1, mapping, "Vision Notes",
                            vision_text,
                            ["Vision_Notes", "VisionNotes", "Additional Coverage"]
                        ):
                            # If no text field available, append to other coverage details
                            other_coverage = form_data.get("otherCoverageDetails", "")
                            if other_coverage:
                                form_data["otherCoverageDetails"] = f"{other_coverage} | {vision_text}"
                            else:
                                form_data["otherCoverageDetails"] = vision_text
                            print(f"  📝 Added vision to other coverage: {vision_text}")

                        warnings.append(f"Vision coverage noted in text: {vision_text}")
            
            # Page 2 - Dependents
            if page2 and dependents:
                dependent_fields = [
                    ("Last Name  First  MI  Only add mailing address if different from Employee  If spouse last name differs from the Employee proof of marriage is required ie marriage license", 0),
                    ("Last Name  First  MI  Only add mailing address if different from Employee  If spouse last name differs from the Employee proof of marriage is required ie marriage licenseChild", 1),
                    ("Last Name  First  MI  Only add mailing address if different from Employee  If spouse last name differs from the Employee proof of marriage is required ie marriage licenseMedical Dental Vision", 2),
                    ("Last Name  First  MI  Only add mailing address if different from Employee  If spouse last name differs from the Employee proof of marriage is required ie marriage licenseMedical Dental Vision_2", 3)
                ]
                
                for idx, dep in enumerate(dependents[:4]):  # Max 4 dependents on form
                    if idx < len(dependent_fields):
                        field_name, _ = dependent_fields[idx]
                        dep_name = f"{dep.get('lastName', '')}, {dep.get('firstName', '')} {dep.get('middleInitial', '')}".strip()
                        if dep.get('relationship'):
                            dep_name += f" ({dep['relationship']})"

                        # Add gender information to the name field since PDF has no separate gender fields for dependents
                        if dep.get('gender'):
                            gender_display = dep['gender'].upper() if dep['gender'].upper() in ['M', 'F'] else dep['gender'].title()
                            dep_name += f" - {gender_display}"
                            print(f"  📋 Added gender to dependent {idx+1} name: {gender_display}")

                        if self._set_text_field(page2, field_name, dep_name):
                            actions.append({"field": f"Dependent{idx+1} Name", "action": "text", "pg": 2})
                            print(f"  ✅ Set dependent {idx+1} name: {dep_name}")
                        
                        # Set DOB
                        dob_field = f"Date of Birth" if idx == 0 else f"Date of Birth_{idx}"
                        if self._set_text_field(page2, dob_field, self._fmt_date(dep.get('dateOfBirth', ''))):
                            actions.append({"field": f"Dependent{idx+1} DOB", "action": "text", "pg": 2})
                        
                        # Set SSN
                        ssn_field = f"SSN required" if idx == 0 else f"SSN required_{idx}"
                        if self._set_text_field(page2, ssn_field, self._mask_ssn(dep.get('ssn', ''), mask_all=preview)):
                            actions.append({"field": f"Dependent{idx+1} SSN", "action": "text", "pg": 2})

                        # Add gender overlay for this dependent (since PDF has no gender fields for dependents)
                        dep_gender = dep.get('gender', '').strip()
                        if dep_gender:
                            # Convert gender to standard format
                            if dep_gender.lower() in ['male', 'm']:
                                gender_text = 'M'
                            elif dep_gender.lower() in ['female', 'f']:
                                gender_text = 'F'
                            else:
                                gender_text = dep_gender.upper()[:1]  # Take first letter

                            # Define gender overlay positions for each dependent row
                            # Based on analysis: place after SSN field with 10pt margin
                            gender_positions = [
                                [583, 127, 613, 139],  # Dependent 1 (first row)
                                [583, 174, 613, 186],  # Dependent 2 (second row)
                                [583, 221, 613, 233],  # Dependent 3 (third row)
                                [583, 268, 613, 280]   # Dependent 4 (fourth row)
                            ]

                            if idx < len(gender_positions):
                                gender_rect = fitz.Rect(*gender_positions[idx])
                                self._draw_text(page2, gender_rect, gender_text, fontsize=10)
                                actions.append({"field": f"Dependent{idx+1} Gender", "action": "overlay", "pg": 2})
                                print(f"  ✅ Added gender overlay for dependent {idx+1}: {gender_text} at {gender_positions[idx]}")

                        # Set coverage checkboxes for this dependent
                        coverage_type = dep.get('coverageType', {})

                        # Correct checkbox naming pattern:
                        # Dependent 1 (idx=0): Medical, Dental, Vision
                        # Dependent 2 (idx=1): Medical_2, Dental_2, Vision_2
                        # Dependent 3 (idx=2): Medical_3, Dental_3, Vision_3
                        # Dependent 4 (idx=3): Medical_4, Dental_4, Vision_4

                        if idx == 0:
                            medical_cb = "Medical"
                            dental_cb = "Dental"
                            vision_cb = "Vision"
                        else:
                            medical_cb = f"Medical_{idx + 1}"
                            dental_cb = f"Dental_{idx + 1}"
                            vision_cb = f"Vision_{idx + 1}"

                        print(f"  📋 Setting coverage for dependent {idx+1}: Medical={medical_cb}, Dental={dental_cb}, Vision={vision_cb}")

                        # Set medical coverage (explicitly set True or False)
                        medical_enabled = coverage_type.get('medical', False)
                        if self._set_checkbox(page2, medical_cb, medical_enabled):
                            action_type = "check" if medical_enabled else "uncheck"
                            actions.append({"field": f"Dependent{idx+1} Medical", "action": action_type, "pg": 2})
                            print(f"    ✅ Set medical coverage: {medical_cb} = {medical_enabled}")
                        else:
                            print(f"    ❌ Failed to set medical coverage: {medical_cb}")

                        # Set dental coverage (explicitly set True or False)
                        dental_enabled = coverage_type.get('dental', False)
                        if self._set_checkbox(page2, dental_cb, dental_enabled):
                            action_type = "check" if dental_enabled else "uncheck"
                            actions.append({"field": f"Dependent{idx+1} Dental", "action": action_type, "pg": 2})
                            print(f"    ✅ Set dental coverage: {dental_cb} = {dental_enabled}")
                        else:
                            print(f"    ❌ Failed to set dental coverage: {dental_cb}")

                        # Set vision coverage (explicitly set True or False)
                        vision_enabled = coverage_type.get('vision', False)
                        if self._set_checkbox(page2, vision_cb, vision_enabled):
                            action_type = "check" if vision_enabled else "uncheck"
                            actions.append({"field": f"Dependent{idx+1} Vision", "action": action_type, "pg": 2})
                            print(f"    ✅ Set vision coverage: {vision_cb} = {vision_enabled}")
                        else:
                            print(f"    ❌ Failed to set vision coverage: {vision_cb}")
                
                if len(dependents) > 4:
                    warnings.append(f"Form supports max 4 dependents. {len(dependents) - 4} additional dependents not shown.")
            
            # IRS Affirmations on Page 2
            if page2:
                # IRS Section 152 affirmation
                if irs_affirm:
                    # First radio button is YES
                    for widget in page2.widgets():
                        if widget.field_name == "I affirm that all dependents listed meet the IRS Section 152 definition of dependent so that premiums can be paid with pretax dollars if applicable":
                            if abs(widget.rect.x0 - 519.12) < 1.0:  # YES button
                                widget.field_value = True
                                widget.update()
                                actions.append({"field": "IRS Affirmation", "action": "radio_yes", "pg": 2})
                                break
                
                # Dependent support question
                if dependents_supported:
                    # First radio is YES
                    for widget in page2.widgets():
                        if widget.field_name == "Are they dependent on you for support and maintenance":
                            if abs(widget.rect.x0 - 222.96) < 1.0:  # YES button
                                widget.field_value = True
                                widget.update()
                                actions.append({"field": "Dependent Support", "action": "radio_yes", "pg": 2})
                                break
                
                # Stepchildren
                if has_stepchildren:
                    self._set_checkbox(page2, "Yes", True)
                    self._set_text_field(page2, "If yes indicate names", stepchildren_names[:100])
                    actions.append({"field": "Stepchildren", "action": "yes", "pg": 2})
                else:
                    self._set_checkbox(page2, "No_2", True)
                    actions.append({"field": "Stepchildren", "action": "no", "pg": 2})
                
                # Signature date
                if signed_date:
                    self._set_text_field(page2, "Date", self._fmt_date(signed_date))
                    actions.append({"field": "Signature Date", "action": "text", "pg": 2})
                
                # Handle signature image if provided
                if not preview and signature_b64:
                    try:
                        sig_img = _load_signature_image(signature_b64)
                        if sig_img is not None:
                            # The signature field location
                            sig_rect = fitz.Rect(188.28, 615.6, 486.0, 652.92)
                            
                            # Convert image to bytes
                            img_buffer = io.BytesIO()
                            sig_img.save(img_buffer, format='PNG')
                            img_buffer.seek(0)
                            
                            # Insert the image
                            page2.insert_image(sig_rect, stream=img_buffer.read())
                            actions.append({"field": "Signature", "action": "image", "pg": 2})
                    except Exception as e:
                        warnings.append(f"Could not add signature: {str(e)}")
            
            # Save the modified PDF
            pdf_buffer = io.BytesIO()
            # Final verification of checkbox states before saving
            print("\n🔍 FINAL CHECKBOX VERIFICATION:")
            page1 = doc[0]
            dental_checkboxes = []
            vision_checkboxes = []

            for widget in page1.widgets():
                if widget.field_type_string == "CheckBox":
                    if "dental" in widget.field_name.lower() or "employee only_6" in widget.field_name.lower():
                        dental_checkboxes.append((widget.field_name, widget.field_value))
                    elif "vision" in widget.field_name.lower() or "decline vision" in widget.field_name.lower():
                        vision_checkboxes.append((widget.field_name, widget.field_value))

            print(f"  📋 Dental-related checkboxes:")
            for name, value in dental_checkboxes:
                print(f"    - '{name}': {value}")

            print(f"  📋 Vision-related checkboxes:")
            for name, value in vision_checkboxes:
                print(f"    - '{name}': {value}")

            # ✅ FIX: Use doc.write() instead of doc.save() to avoid broken pipe error
            pdf_bytes = doc.write()

            # Final summary
            print("\n" + "="*50)
            print("HEALTH INSURANCE PDF GENERATION COMPLETED")
            print("="*50)
            print(f"✅ PDF generated successfully ({len(pdf_bytes)} bytes)")
            print(f"✅ Actions performed: {len(actions)}")
            print(f"⚠️  Warnings: {len(warnings)}")
            if warnings:
                for warning in warnings:
                    print(f"   - {warning}")
            print("="*50)

            if return_details:
                return pdf_bytes, warnings, actions
            return pdf_bytes
            
        except Exception as e:
            raise Exception(f"PDF generation failed: {str(e)}")
        finally:
            if doc is not None:
                doc.close()
    
    def _get_medical_tier_checkbox_name(self, medical_plan: str, tier: str) -> List[str]:
        """Get the checkbox field names for medical plan and tier."""
        # Normalize tier
        tier_map = {
            'employee': 'Employee Only',
            'employee_spouse': 'Employee  Spouse',
            'employee_children': 'Employee  Children',
            'family': 'Employee  Family'
        }
        
        tier_name = tier_map.get(tier, 'Employee Only')
        
        # Determine which row based on plan (frontend sends hra6k, hra4k, hra2k, minimum_essential, indemnity, etc.)
        if medical_plan in ['hra6k', 'hra_6k']:
            # First row - HRA $6K
            if tier == 'employee':
                return ["Employee Only  5991"]
            elif tier == 'employee_spouse':
                return ["Employee  Spouse"]
            elif tier == 'employee_children':
                return ["Employee  Children"]
            elif tier == 'family':
                return ["Employee  Family"]
        elif medical_plan in ['hra4k', 'hra_4k']:
            # Second row - HRA $4K
            if tier == 'employee':
                return ["Employee Only  13684"]
            elif tier == 'employee_spouse':
                return ["Employee  Spouse 39621"]
            elif tier == 'employee_children':
                return ["Employee  Children_2"]
            elif tier == 'family':
                return ["Employee  Family_2"]
        elif medical_plan in ['hra2k', 'hra_2k']:
            # Third row - HRA $2K
            if tier == 'employee':
                return ["Employee Only"]
            elif tier == 'employee_spouse':
                return ["Employee  Spouse_2"]
            elif tier == 'employee_children':
                return ["Employee  Children_3"]
            elif tier == 'family':
                return ["Employee  Family_3"]
        elif medical_plan in ['minimum_essential', 'mec']:
            # Limited Medical - MEC (first row)
            if tier == 'employee':
                return ["Employee Only_2"]
            elif tier == 'employee_spouse':
                return ["Employee  Spouse_3"]
            elif tier == 'employee_children':
                return ["Employee  Children_4"]
            elif tier == 'family':
                return ["Employee  Family_4"]
        elif medical_plan in ['indemnity', 'minimum_indemnity']:
            # Limited Medical - Indemnity (second row)
            if tier == 'employee':
                return ["Employee Only_3"]
            elif tier == 'employee_spouse':
                return ["Employee  Spouse_4"]
            elif tier == 'employee_children':
                return ["Employee  Children_5"]
            elif tier == 'family':
                return ["Employee  Family_5"]
        elif medical_plan in ['minimum_plus_indemnity', 'mec_plus_indemnity']:
            # Bundle: map to MEC row by default (UI shows bundle; PDF can only select one row)
            if tier == 'employee':
                return ["Employee Only_2"]
            elif tier == 'employee_spouse':
                return ["Employee  Spouse_3"]
            elif tier == 'employee_children':
                return ["Employee  Children_4"]
            elif tier == 'family':
                return ["Employee  Family_4"]
        
        # Default fallback
        return [tier_name]
    
    def _get_dental_tier_checkbox_name(self, tier: str) -> str:
        """Get the checkbox field name for dental tier."""
        tier_map = {
            'employee': 'Employee Only_6',
            'employee_spouse': 'Employee  Spouse_7',
            'employee_children': 'Employee  Children_8',
            'family': 'Employee  Family_8'
        }
        return tier_map.get(tier, 'Employee Only_6')
    
    def _get_vision_tier_checkbox_name(self, tier: str) -> str:
        """Get the checkbox field name for vision tier.
        Based on actual PDF analysis - vision has separate checkboxes from dental."""
        tier_map = {
            'employee': 'Employee Only_5',
            'employee_spouse': 'Employee  Spouse_6',
            'employee_children': 'Employee  Children_7',  # Vision has its own children checkbox
            'family': 'Employee  Family_7'
        }
        return tier_map.get(tier, 'Employee Only_5')