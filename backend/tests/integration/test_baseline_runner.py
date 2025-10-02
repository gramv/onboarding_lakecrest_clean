#!/usr/bin/env python3
"""
Baseline test runner to catalog functional tests
"""
import os
import subprocess
import json
from pathlib import Path

def run_test_file(test_file):
    """Run a single test file and capture results"""
    try:
        result = subprocess.run(
            ['python3', test_file],
            capture_output=True,
            text=True,
            timeout=10  # 10 second timeout per test
        )
        return {
            'file': test_file,
            'status': 'passed' if result.returncode == 0 else 'failed',
            'return_code': result.returncode,
            'has_output': len(result.stdout) > 0,
            'has_errors': len(result.stderr) > 0,
            'error_snippet': result.stderr[:200] if result.stderr else None
        }
    except subprocess.TimeoutExpired:
        return {
            'file': test_file,
            'status': 'timeout',
            'return_code': -1,
            'has_output': False,
            'has_errors': True,
            'error_snippet': 'Test timed out after 10 seconds'
        }
    except Exception as e:
        return {
            'file': test_file,
            'status': 'error',
            'return_code': -1,
            'has_output': False,
            'has_errors': True,
            'error_snippet': str(e)
        }

def main():
    # Find all test files
    test_files = sorted([f for f in os.listdir('.') if f.startswith('test_') and f.endswith('.py')])
    
    print(f"Found {len(test_files)} test files")
    print("=" * 60)
    
    results = []
    categories = {
        'passed': [],
        'failed': [],
        'timeout': [],
        'error': []
    }
    
    for i, test_file in enumerate(test_files, 1):
        print(f"[{i}/{len(test_files)}] Testing {test_file}...", end=' ')
        result = run_test_file(test_file)
        results.append(result)
        categories[result['status']].append(test_file)
        print(result['status'].upper())
    
    # Summary
    print("\n" + "=" * 60)
    print("BASELINE TEST SUMMARY")
    print("=" * 60)
    print(f"Total test files: {len(test_files)}")
    print(f"Passed: {len(categories['passed'])}")
    print(f"Failed: {len(categories['failed'])}")
    print(f"Timeout: {len(categories['timeout'])}")
    print(f"Error: {len(categories['error'])}")
    
    # Save results
    with open('baseline_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total': len(test_files),
                'passed': len(categories['passed']),
                'failed': len(categories['failed']),
                'timeout': len(categories['timeout']),
                'error': len(categories['error'])
            },
            'categories': categories,
            'details': results
        }, f, indent=2)
    
    print("\nResults saved to baseline_test_results.json")
    
    # Show functional tests
    if categories['passed']:
        print(f"\n✅ FUNCTIONAL TESTS ({len(categories['passed'])})")
        for test in categories['passed'][:10]:  # Show first 10
            print(f"  - {test}")
        if len(categories['passed']) > 10:
            print(f"  ... and {len(categories['passed']) - 10} more")

if __name__ == '__main__':
    main()