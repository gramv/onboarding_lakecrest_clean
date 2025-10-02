#!/usr/bin/env python3
"""
Test Direct Deposit PDF generation with multiple bank accounts.
Tests all scenarios: full, partial, and split deposits.
"""

import json
import base64
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))

from app.pdf_forms import PDFFormFiller


def test_full_deposit():
    """Test full direct deposit to single account"""
    print("\n" + "="*70)
    print("📋 Test 1: FULL DEPOSIT (100% to single account)")
    print("="*70)
    
    data = {
        "first_name": "John",
        "last_name": "Smith",
        "email": "john.smith@example.com",
        "ssn": "123-45-6789",
        "deposit_type": "full",
        "direct_deposit": {
            "bank_name": "Chase Bank",
            "routing_number": "021000021",
            "account_number": "1234567890",
            "account_type": "checking",
            "deposit_type": "full",
            "percentage": 100
        },
        "additional_accounts": []
    }
    
    filler = PDFFormFiller()
    pdf_bytes = filler.fill_direct_deposit_form(data)
    
    with open("test_dd_full_deposit.pdf", "wb") as f:
        f.write(pdf_bytes)
    
    print("✅ Generated: test_dd_full_deposit.pdf")
    print("   - Bank 1: Chase Bank (100%)")
    print("   - Type: Checking")
    print("   - Should show: 'Entire Net Amount' checked")


def test_partial_deposit():
    """Test partial deposit with fixed amount"""
    print("\n" + "="*70)
    print("📋 Test 2: PARTIAL DEPOSIT ($500 to account, rest as check)")
    print("="*70)
    
    data = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane.doe@example.com",
        "ssn": "987-65-4321",
        "deposit_type": "partial",
        "direct_deposit": {
            "bank_name": "Bank of America",
            "routing_number": "026009593",
            "account_number": "9876543210",
            "account_type": "savings",
            "deposit_type": "partial",
            "deposit_amount": "500.00"
        },
        "additional_accounts": []
    }
    
    filler = PDFFormFiller()
    pdf_bytes = filler.fill_direct_deposit_form(data)
    
    with open("test_dd_partial_deposit.pdf", "wb") as f:
        f.write(pdf_bytes)
    
    print("✅ Generated: test_dd_partial_deposit.pdf")
    print("   - Bank 1: Bank of America ($500.00)")
    print("   - Type: Savings")
    print("   - Remainder: Paid by check")


def test_split_two_accounts():
    """Test split deposit between two accounts"""
    print("\n" + "="*70)
    print("📋 Test 3: SPLIT DEPOSIT (60% / 40% between 2 accounts)")
    print("="*70)
    
    data = {
        "first_name": "Robert",
        "last_name": "Johnson",
        "email": "robert.j@example.com",
        "ssn": "555-55-5555",
        "deposit_type": "split",
        "direct_deposit": {
            "bank_name": "Wells Fargo",
            "routing_number": "121000248",
            "account_number": "1111111111",
            "account_type": "checking",
            "deposit_type": "split",
            "percentage": 60
        },
        "additional_accounts": [
            {
                "bank_name": "Capital One",
                "routing_number": "065000090",
                "account_number": "2222222222",
                "account_type": "savings",
                "percentage": 40
            }
        ]
    }
    
    filler = PDFFormFiller()
    pdf_bytes = filler.fill_direct_deposit_form(data)
    
    with open("test_dd_split_two.pdf", "wb") as f:
        f.write(pdf_bytes)
    
    print("✅ Generated: test_dd_split_two.pdf")
    print("   - Bank 1: Wells Fargo (60% - Checking)")
    print("   - Bank 2: Capital One (40% - Savings)")


def test_split_three_accounts():
    """Test split deposit between three accounts"""
    print("\n" + "="*70)
    print("📋 Test 4: SPLIT DEPOSIT (50% / 30% / 20% between 3 accounts)")
    print("="*70)
    
    data = {
        "first_name": "Maria",
        "last_name": "Garcia",
        "email": "maria.g@example.com",
        "ssn": "777-77-7777",
        "deposit_type": "split",
        "direct_deposit": {
            "bank_name": "TD Bank",
            "routing_number": "031201360",
            "account_number": "3333333333",
            "account_type": "checking",
            "deposit_type": "split",
            "percentage": 50
        },
        "additional_accounts": [
            {
                "bank_name": "PNC Bank",
                "routing_number": "043000096",
                "account_number": "4444444444",
                "account_type": "savings",
                "percentage": 30
            },
            {
                "bank_name": "Ally Bank",
                "routing_number": "124003116",
                "account_number": "5555555555",
                "account_type": "checking",
                "percentage": 20
            }
        ]
    }
    
    filler = PDFFormFiller()
    pdf_bytes = filler.fill_direct_deposit_form(data)
    
    with open("test_dd_split_three.pdf", "wb") as f:
        f.write(pdf_bytes)
    
    print("✅ Generated: test_dd_split_three.pdf")
    print("   - Bank 1: TD Bank (50% - Checking)")
    print("   - Bank 2: PNC Bank (30% - Savings)")
    print("   - Bank 3: Ally Bank (20% - Checking)")


def test_split_fixed_amounts():
    """Test split deposit with fixed dollar amounts"""
    print("\n" + "="*70)
    print("📋 Test 5: SPLIT DEPOSIT (Fixed amounts: $800 / $200 / remainder)")
    print("="*70)
    
    data = {
        "first_name": "David",
        "last_name": "Wilson",
        "email": "david.w@example.com",
        "ssn": "999-99-9999",
        "deposit_type": "split",
        "direct_deposit": {
            "bank_name": "US Bank",
            "routing_number": "091000022",
            "account_number": "6666666666",
            "account_type": "checking",
            "deposit_type": "split",
            "deposit_amount": "800"
        },
        "additional_accounts": [
            {
                "bank_name": "Regions Bank",
                "routing_number": "062000019",
                "account_number": "7777777777",
                "account_type": "savings",
                "deposit_amount": "200"
            },
            {
                "bank_name": "KeyBank",
                "routing_number": "041001039",
                "account_number": "8888888888",
                "account_type": "checking",
                "deposit_amount": ""  # Gets remainder
            }
        ]
    }
    
    filler = PDFFormFiller()
    pdf_bytes = filler.fill_direct_deposit_form(data)
    
    with open("test_dd_split_fixed.pdf", "wb") as f:
        f.write(pdf_bytes)
    
    print("✅ Generated: test_dd_split_fixed.pdf")
    print("   - Bank 1: US Bank ($800 - Checking)")
    print("   - Bank 2: Regions Bank ($200 - Savings)")
    print("   - Bank 3: KeyBank (Remainder - Checking)")


def verify_pdf_fields():
    """Verify that all PDFs have correct fields filled"""
    print("\n" + "="*70)
    print("🔍 Verification Instructions")
    print("="*70)
    print("\nPlease open each generated PDF and verify:")
    print("\n1. test_dd_full_deposit.pdf:")
    print("   ✓ Bank 1 has all info filled")
    print("   ✓ 'Entire Net Amount' checkbox is marked")
    print("   ✓ Banks 2 and 3 are empty")
    
    print("\n2. test_dd_partial_deposit.pdf:")
    print("   ✓ Bank 1 has $500.00 in deposit amount")
    print("   ✓ Savings account type is checked")
    print("   ✓ Banks 2 and 3 are empty")
    
    print("\n3. test_dd_split_two.pdf:")
    print("   ✓ Bank 1 shows 60%")
    print("   ✓ Bank 2 shows 40%")
    print("   ✓ Both account types are correct")
    print("   ✓ Bank 3 is empty")
    
    print("\n4. test_dd_split_three.pdf:")
    print("   ✓ All 3 banks have info")
    print("   ✓ Percentages: 50%, 30%, 20%")
    print("   ✓ Account types match")
    
    print("\n5. test_dd_split_fixed.pdf:")
    print("   ✓ Bank 1: $800")
    print("   ✓ Bank 2: $200")
    print("   ✓ Bank 3: Should indicate remainder")


if __name__ == "__main__":
    print("\n🚀 Testing Direct Deposit PDF Generation - Multiple Accounts")
    print("This will generate 5 test PDFs covering all scenarios\n")
    
    # Run all tests
    test_full_deposit()
    test_partial_deposit()
    test_split_two_accounts()
    test_split_three_accounts()
    test_split_fixed_amounts()
    
    # Verification instructions
    verify_pdf_fields()
    
    print("\n✅ All test PDFs generated successfully!")
    print("Please review each PDF to ensure correct field mapping.")