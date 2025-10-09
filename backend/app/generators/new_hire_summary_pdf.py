"""New Hire Summary PDF Generator - Tabular Format"""
from __future__ import annotations

import io
from datetime import datetime
from typing import Dict, Any, List, Tuple

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle


class NewHireSummaryPDFGenerator:
    """Professional tabular generator for new hire summary."""

    def __init__(self) -> None:
        self.page_width, self.page_height = letter
        self.left_margin = 0.5 * inch
        self.right_margin = 0.5 * inch
        self.top_margin = 0.75 * inch
        self.row_height = 20

    def _draw_table(
        self,
        c: canvas.Canvas,
        x: float,
        y: float,
        data: List[List[str]],
        col_widths: List[float],
        title: str = None,
        header_row: bool = False
    ) -> float:
        """Draw a table and return the new Y position."""

        # Draw title if provided
        if title:
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(colors.HexColor("#1F2937"))
            c.drawString(x, y, title)
            y -= 20
            c.setFillColor(colors.black)

        # Create table
        table = Table(data, colWidths=col_widths, rowHeights=self.row_height)

        # Style the table
        style = [
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]

        # Header row styling
        if header_row:
            style.extend([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
                ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#1F2937")),
            ])
            # Data rows
            style.extend([
                ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
            ])
        else:
            # Label column (first column) - bold
            style.extend([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F9FAFB")),
                ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 9),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor("#374151")),
            ])
            # Value column (second column)
            style.extend([
                ('FONT', (1, 0), (-1, -1), 'Helvetica', 9),
            ])

        table.setStyle(TableStyle(style))

        # Calculate table height
        table.wrapOn(c, self.page_width, self.page_height)
        table_height = table._height

        # Draw the table
        table.drawOn(c, x, y - table_height)

        # Return new Y position
        return y - table_height - 15

    def generate(self, summary: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)

        # Header
        c.setFont("Helvetica-Bold", 18)
        c.setFillColor(colors.HexColor("#1F2937"))
        title = "EMPLOYEE NEW HIRE FORM"
        title_width = c.stringWidth(title, "Helvetica-Bold", 18)
        c.drawString((self.page_width - title_width) / 2, self.page_height - self.top_margin, title)

        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#6B7280"))
        subtitle = "Auto-generated from onboarding data and verified by manager"
        subtitle_width = c.stringWidth(subtitle, "Helvetica", 9)
        c.drawString((self.page_width - subtitle_width) / 2, self.page_height - self.top_margin - 18, subtitle)
        c.setFillColor(colors.black)

        y = self.page_height - self.top_margin - 50

        # Calculate column widths
        label_width = 2.2 * inch
        value_width = self.page_width - self.left_margin - self.right_margin - label_width

        # Section 1: Employment Location
        employment_data = [
            ["Hotel Name / Address", summary.get("hotelAddressBlock", "-")],
            ["State of Employment", summary.get("stateOfEmployment", "-")],
        ]
        y = self._draw_table(
            c, self.left_margin, y, employment_data,
            [label_width, value_width],
            title="Employment Location"
        )

        # Section 2: Employee Information
        name_block = f"{summary.get('employeeFirstName', '')} {summary.get('employeeLastName', '')}".strip() or "-"
        employee_data = [
            ["Employee Name", name_block],
            ["Residential Address", summary.get("employeeAddressBlock", "-")],
            ["Phone", summary.get("employeePhone", "-")],
            ["Email", summary.get("employeeEmail", "-")],
            ["Date of Birth", summary.get("dateOfBirth", "-")],
            ["Social Security Number", summary.get("ssn", "-")],
            ["Gender", summary.get("gender", "-")],
            ["Marital Status", summary.get("maritalStatus", "-")],
            ["Dependents", summary.get("dependents", "-")],
        ]
        y = self._draw_table(
            c, self.left_margin, y, employee_data,
            [label_width, value_width],
            title="Employee Information"
        )

        # Section 3: Employment Details
        employment_details = [
            ["Employment Type", summary.get("employmentType", "-")],
            ["Department", summary.get("department", "-")],
            ["Position", summary.get("position", "-")],
            ["Rate of Pay", summary.get("rateOfPay", "-")],
            ["Pay Frequency", summary.get("payFrequency", "-")],
            ["Hire Date", summary.get("hireDate", "-")],
        ]
        y = self._draw_table(
            c, self.left_margin, y, employment_details,
            [label_width, value_width],
            title="Employment Details"
        )

        # Section 4: Health Insurance Selections
        selections = summary.get("healthInsuranceSelections", [])
        selection_lookup = set(selections)

        insurance_options = [
            ("UHC HRA Base Plan", "uhc_hra_base"),
            ("UHC HRA Buy Up Plan", "uhc_hra_buy_up"),
            ("CWI Minimum Essential Plan", "cwi_minimum_essential"),
            ("CWI Minimum Indemnity Plan", "cwi_minimum_indemnity"),
            ("UHC Dental", "uhc_dental"),
            ("UHC Vision", "uhc_vision"),
            ("Insurance Declined", "insurance_declined"),
        ]

        selected_plans = []
        for label, key in insurance_options:
            if key in selection_lookup:
                selected_plans.append(f"☑ {label}")
            else:
                selected_plans.append(f"☐ {label}")

        insurance_data = [
            ["Health Insurance Selections", "\n".join(selected_plans)],
            ["Copay per Pay Period", summary.get("healthInsuranceCopay", "-")],
        ]
        y = self._draw_table(
            c, self.left_margin, y, insurance_data,
            [label_width, value_width],
            title="Health Insurance"
        )

        # Footer
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#6B7280"))
        timestamp = datetime.utcnow().strftime("Generated on %B %d, %Y at %I:%M %p UTC")
        c.drawString(self.left_margin, 0.5 * inch, timestamp)

        # Page number
        c.drawRightString(self.page_width - self.right_margin, 0.5 * inch, "Page 1")
        c.setFillColor(colors.black)

        c.showPage()
        c.save()
        buffer.seek(0)
        return buffer.read()


__all__ = ["NewHireSummaryPDFGenerator"]
