import os
from supabase import create_client

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

supabase = create_client(supabase_url, supabase_key)

bucket_name = 'onboarding-documents'
base_path = 'm6/ethan_thomas'

print("BUCKET STRUCTURE:", bucket_name + "/" + base_path)
print("=" * 80)

def list_folder(path, indent=0):
    try:
        items = supabase.storage.from_(bucket_name).list(path)
        
        for item in items:
            name = item.get('name')
            item_id = item.get('id')
            is_folder = item_id is None
            
            prefix = "  " * indent
            icon = "[DIR]" if is_folder else "[FILE]"
            
            print(prefix + icon + " " + name)
            
            if is_folder and name != '.emptyFolderPlaceholder':
                sub_path = path + "/" + name
                list_folder(sub_path, indent + 1)
    except Exception as e:
        print(prefix + "  Error: " + str(e))

list_folder(base_path)

print("\n" + "=" * 80)
print("DOCUMENT DETAILS")
print("=" * 80)

doc_types = ['company_policies', 'i9', 'w4', 'direct_deposit', 'health_insurance']

for doc_type in doc_types:
    path = base_path + "/forms/" + doc_type
    print("\n" + doc_type.upper())
    print("-" * 40)
    
    try:
        items = supabase.storage.from_(bucket_name).list(path)
        
        for item in items:
            name = item.get('name')
            if name and name != '.emptyFolderPlaceholder':
                print("  - " + name)
    except Exception as e:
        print("  Error: " + str(e))

