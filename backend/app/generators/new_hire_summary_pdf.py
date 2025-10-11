"""New Hire Summary PDF Generator - Tabular Format"""
from __future__ import annotations

import io
from datetime import datetime
from typing import Dict, Any, List, Tuple

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet


class NewHireSummaryPDFGenerator:
    """Professional tabular generator for new hire summary."""

    def __init__(self) -> None:
        self.page_width, self.page_height = letter
        self.left_margin = 0.5 * inch
        self.right_margin = 0.5 * inch
        self.top_margin = 0.75 * inch
        self.row_height = 20
        self.styles = getSampleStyleSheet()
        self.value_style = ParagraphStyle(
            name="Value",
            parent=self.styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#1F2937"),
        )
        self.label_style = ParagraphStyle(
            name="Label",
            parent=self.styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#374151"),
        )
        self.subheader_style = ParagraphStyle(
            name="Subheader",
            parent=self.styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#111827"),
            spaceAfter=6,
        )

    def _draw_table(
        self,
        c: canvas.Canvas,
        x: float,
        y: float,
        data: List[List[Any]],
        col_widths: List[float],
        title: str = None,
        header_row: bool = False,
        alternate: bool = False,
    ) -> float:
        """Draw a table and return the new Y position."""

        if title:
            title_para = Paragraph(title, self.subheader_style)
            tw, th = title_para.wrap(self.page_width - x - self.right_margin, self.row_height)
            title_para.drawOn(c, x, y - th)
            y -= th + 6

        table = Table(data, colWidths=col_widths)

        # Style the table
        style = [
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#D1D5DB")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]

        if alternate:
            style.append(('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]))

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

        table.wrapOn(c, self.page_width, self.page_height)
        table_height = table._height
        table.drawOn(c, x, y - table_height)

        return y - table_height - 18

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

        # Section 1: Employment & Property
        employment_data = [
            [
                Paragraph("Hotel Name", self.label_style),
                Paragraph(summary.get("hotelName", "-"), self.value_style),
                Paragraph("Hotel Address", self.label_style),
                Paragraph(summary.get("hotelAddressBlock", "-"), self.value_style),
            ],
            [
                Paragraph("State of Employment", self.label_style),
                Paragraph(summary.get("stateOfEmployment", "-"), self.value_style),
                Paragraph("Hire Date", self.label_style),
                Paragraph(summary.get("hireDate", "-"), self.value_style),
            ],
        ]
        y = self._draw_table(
            c,
            self.left_margin,
            y,
            employment_data,
            [label_width * 0.9, label_width * 1.1, label_width * 0.9, label_width * 1.1],
            title="Property & Employment",
            header_row=False,
        )

        # Section 2: Employee Information (split columns)
        name_block = f"{summary.get('employeeFirstName', '')} {summary.get('employeeLastName', '')}".strip() or "-"
        employee_rows = [
            [
                Paragraph("Employee Name", self.label_style),
                Paragraph(name_block, self.value_style),
                Paragraph("Phone", self.label_style),
                Paragraph(summary.get("employeePhone", "-"), self.value_style),
            ],
            [
                Paragraph("Residential Address", self.label_style),
                Paragraph(summary.get("employeeAddressBlock", "-"), self.value_style),
                Paragraph("Email", self.label_style),
                Paragraph(summary.get("employeeEmail", "-"), self.value_style),
            ],
            [
                Paragraph("Date of Birth", self.label_style),
                Paragraph(summary.get("dateOfBirth", "-"), self.value_style),
                Paragraph("Social Security Number", self.label_style),
                Paragraph(summary.get("ssn", "-"), self.value_style),
            ],
            [
                Paragraph("Gender", self.label_style),
                Paragraph(summary.get("gender", "-"), self.value_style),
                Paragraph("Marital Status", self.label_style),
                Paragraph(summary.get("maritalStatus", "-"), self.value_style),
            ],
            [
                Paragraph("Dependents", self.label_style),
                Paragraph(summary.get("dependents", "-"), self.value_style),
                Paragraph("Pay Frequency", self.label_style),
                Paragraph(summary.get("payFrequency", "-"), self.value_style),
            ],
        ]
        y = self._draw_table(
            c,
            self.left_margin,
            y,
            employee_rows,
            [label_width * 0.8, label_width * 1.2, label_width * 0.8, label_width * 1.2],
            title="Employee Information",
            alternate=True,
        )

        # Section 3: Role & Compensation
        employment_details = [
            [Paragraph("Department", self.label_style), Paragraph(summary.get("department", "-"), self.value_style)],
            [Paragraph("Position", self.label_style), Paragraph(summary.get("position", "-"), self.value_style)],
            [Paragraph("Employment Type", self.label_style), Paragraph(summary.get("employmentType", "-"), self.value_style)],
            [Paragraph("Rate of Pay", self.label_style), Paragraph(summary.get("rateOfPay", "-"), self.value_style)],
        ]
        y = self._draw_table(
            c,
            self.left_margin,
            y,
            employment_details,
            [label_width, value_width],
            title="Role & Compensation",
            alternate=True,
        )

        # Section 4: Benefits Overview
        selections = summary.get("healthInsuranceSelections", []) or []
        selection_lookup = set(s.lower() for s in selections)
        insurance_options = [
            ("UHC HRA Base Plan", "uhc_hra_base"),
            ("UHC HRA Buy Up Plan", "uhc_hra_buy_up"),
            ("CWI Minimum Essential Plan", "cwi_minimum_essential"),
            ("CWI Minimum Indemnity Plan", "cwi_minimum_indemnity"),
            ("UHC Dental", "uhc_dental"),
            ("UHC Vision", "uhc_vision"),
            ("Insurance Declined", "insurance_declined"),
        ]

        checkbox_rows: List[List[Any]] = []
        for label, key in insurance_options:
            checked = key in selection_lookup
            checkbox_rows.append([
                Paragraph("☑" if checked else "☐", self.value_style),
                Paragraph(label, self.value_style),
            ])

        insurance_section = Table(
            checkbox_rows,
            colWidths=[0.3 * inch, value_width - 0.3 * inch],
            hAlign='LEFT',
        )
        insurance_section.setStyle(
            TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ])
        )

        benefits_data: List[List[Any]] = [
            [Paragraph("Selected Benefit Plans", self.label_style), insurance_section],
            [
                Paragraph("Copay per Pay Period", self.label_style),
                Paragraph(summary.get("healthInsuranceCopay", "-"), self.value_style),
            ],
        ]

        y = self._draw_table(
            c,
            self.left_margin,
            y,
            benefits_data,
            [label_width, value_width],
            title="Benefits Overview",
            alternate=False,
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
