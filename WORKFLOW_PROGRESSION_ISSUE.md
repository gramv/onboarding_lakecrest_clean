# Workflow Progression Issue

## 🐛 **Problem:**

After approving Company Policies (step 1), the workflow doesn't move to I-9 (step 2).

**Current Behavior:**
```
1. Approve Company Policies ✅
2. Documents status reloads
3. currentStep is still 1 (should be 2)
4. I-9 is still locked 🔒
```

**Expected Behavior:**
```
1. Approve Company Policies ✅
2. Documents status reloads
3. currentStep becomes 2
4. I-9 becomes unlocked and ready to review ✅
```

---

## 🔍 **Root Cause:**

**Backend Logic** (`manager_document_approval_router.py` lines 133-134):

```python
if approval:
    doc_status = approval.get('status', 'pending')
    if doc_status == 'approved' and current_step == workflow_step['order']:
        current_step += 1
```

**The Problem:**
- This only increments `current_step` if it matches the current workflow step order
- After approving step 1, `current_step` is 1
- When checking step 1 (company_policies), it sees it's approved and `current_step == 1`, so it increments to 2
- But then it continues the loop and doesn't persist this change correctly

**The Logic Should Be:**
- Find the first step that is NOT approved
- That becomes the current step
- All previous steps must be approved for a step to be reviewable

---

## ✅ **Fix:**

Change the logic to find the first unapproved step:

```python
# Calculate current step (first unapproved step)
current_step = 1
for workflow_step in DOCUMENT_WORKFLOW:
    doc_type = workflow_step['type']
    approval = approval_map.get(doc_type)
    
    if not approval or approval.get('status') != 'approved':
        current_step = workflow_step['order']
        break
    else:
        # This step is approved, move to next
        current_step = workflow_step['order'] + 1
```

**Better Logic:**

```python
# Calculate current step as the first step that's not approved
current_step = len(DOCUMENT_WORKFLOW) + 1  # Default to after last step if all approved

for workflow_step in DOCUMENT_WORKFLOW:
    doc_type = workflow_step['type']
    approval = approval_map.get(doc_type)
    
    # If this step is not approved, it's the current step
    if not approval or approval.get('status') != 'approved':
        current_step = workflow_step['order']
        break
```

---

## 📝 **Implementation:**

Update `backend/app/routers/manager_document_approval_router.py` around line 119-135.

---

## 🧪 **Test:**

1. Approve Company Policies
2. Reload documents status
3. Check `currentStep` should be 2
4. Check I-9 `canReview` should be true
5. I-9 should be clickable

---

Should I implement this fix?

