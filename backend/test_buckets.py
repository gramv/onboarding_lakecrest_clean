#!/usr/bin/env python3
"""Test bucket listing to see the actual structure"""

from supabase import create_client
import json

SUPABASE_URL = 'https://kzommszdhapvqpekpvnt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2NDExNywiZXhwIjoyMDcwMzQwMTE3fQ.58eZkTEw3l2Y9QxP1_ceVm7HPFmow-47aGmbyelpaZk'

client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    buckets = client.storage.list_buckets()
    print(f"Type of buckets: {type(buckets)}")
    print(f"Buckets: {buckets}")
    
    if hasattr(buckets, '__iter__'):
        for i, bucket in enumerate(buckets):
            print(f"\nBucket {i}:")
            print(f"  Type: {type(bucket)}")
            print(f"  Dir: {dir(bucket)}")
            if hasattr(bucket, 'id'):
                print(f"  ID: {bucket.id}")
            if hasattr(bucket, 'name'):
                print(f"  Name: {bucket.name}")
            print(f"  Repr: {repr(bucket)}")
            
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()