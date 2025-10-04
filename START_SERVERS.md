# 🚀 Start Servers - Quick Guide

**You need to start BOTH backend and frontend servers!**

---

## ⚠️ **IMPORTANT**

The errors you're seeing are because:
1. ❌ Backend server is NOT running
2. ✅ Frontend server IS running

**Solution:** Start the backend server!

---

## 🔧 **How to Start**

### **Option 1: Two Terminals (Recommended)**

**Terminal 1 - Backend:**
```bash
cd /Users/gouthamvemula/onbfinaldev_clean/backend
uvicorn app.main_enhanced:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd /Users/gouthamvemula/onbfinaldev_clean/frontend/hotel-onboarding-frontend
npm run dev
```

### **Option 2: Background Process**

**Start backend in background:**
```bash
cd /Users/gouthamvemula/onbfinaldev_clean/backend
nohup uvicorn app.main_enhanced:app --reload --port 8000 > backend.log 2>&1 &
```

**Start frontend normally:**
```bash
cd /Users/gouthamvemula/onbfinaldev_clean/frontend/hotel-onboarding-frontend
npm run dev
```

---

## ✅ **Verify Servers Are Running**

### **Check Backend:**
```bash
curl http://localhost:8000/
```

**Expected:** Some response (not connection refused)

**Or open in browser:**
```
http://localhost:8000/docs
```

**Expected:** Swagger UI with API documentation

### **Check Frontend:**
```
http://localhost:3000
```

**Expected:** Hotel onboarding app loads

---

## 🐛 **Current Error Explained**

**Error you're seeing:**
```
POST http://localhost:8000/api/manager/document-access/request-otp 405 (Method Not Allowed)
GET http://localhost:8000/api/manager/review/employees/... 404 (Not Found)
```

**Why:**
- Frontend is trying to call `localhost:8000` (backend)
- But backend server is NOT running
- So requests fail

**Fix:**
- Start the backend server!

---

## 📋 **Step-by-Step**

### **1. Open Terminal 1**

```bash
# Navigate to backend
cd /Users/gouthamvemula/onbfinaldev_clean/backend

# Start backend server
uvicorn app.main_enhanced:app --reload --port 8000
```

**You should see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
✅ Auth router loaded successfully
✅ Manager document access router loaded successfully
✅ Manager review data router loaded successfully
✅ Employer profile router loaded successfully
✅ Edit tracking router loaded successfully
```

### **2. Keep Terminal 1 Open**

**Don't close this terminal!** The backend needs to keep running.

### **3. Open Terminal 2**

```bash
# Navigate to frontend
cd /Users/gouthamvemula/onbfinaldev_clean/frontend/hotel-onboarding-frontend

# Start frontend (if not already running)
npm run dev
```

**You should see:**
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### **4. Test in Browser**

1. Open: `http://localhost:3000`
2. Login as manager
3. Click "Review & Complete I-9"
4. Should see OTP verification modal
5. No more 404/405 errors!

---

## 🎯 **What You Should See**

### **Backend Terminal:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
✅ Manager document access router loaded successfully
✅ Manager review data router loaded successfully
✅ Employer profile router loaded successfully
✅ Edit tracking router loaded successfully

# When you click "Review":
INFO:     127.0.0.1:xxxxx - "POST /api/manager/document-access/request-otp HTTP/1.1" 200 OK
```

### **Frontend Terminal:**
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose

# No errors in browser console!
```

### **Browser Console:**
```
✅ No 404 errors
✅ No 405 errors
✅ API calls succeed
```

---

## 🔍 **Troubleshooting**

### **Backend won't start:**

**Error:** `Address already in use`
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Try again
uvicorn app.main_enhanced:app --reload --port 8000
```

**Error:** `Module not found`
```bash
# Install dependencies
cd backend
pip install -r requirements.txt
```

### **Frontend won't start:**

**Error:** `Port 3000 already in use`
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Try again
npm run dev
```

**Error:** `Command not found: npm`
```bash
# Install Node.js first
brew install node
```

---

## 📊 **Quick Status Check**

**Run this to check if servers are running:**

```bash
# Check backend
curl -s http://localhost:8000/ > /dev/null && echo "✅ Backend running" || echo "❌ Backend NOT running"

# Check frontend
curl -s http://localhost:3000/ > /dev/null && echo "✅ Frontend running" || echo "❌ Frontend NOT running"
```

---

## 🎉 **Once Both Are Running**

1. ✅ Backend on `http://localhost:8000`
2. ✅ Frontend on `http://localhost:3000`
3. ✅ No 404/405 errors
4. ✅ OTP flow works
5. ✅ Manager review works

---

## 💡 **Pro Tips**

1. **Keep both terminals visible** - Use split screen or tabs
2. **Watch backend logs** - See API calls in real-time
3. **Check browser console** - See frontend errors
4. **Use Swagger UI** - Test APIs at `http://localhost:8000/docs`

---

## 🚀 **Ready to Test!**

**After starting both servers:**

1. Refresh browser (`Cmd+Shift+R`)
2. Login as manager
3. Click "Review & Complete I-9"
4. OTP modal should open
5. Email should be sent
6. No errors in console!

---

**Start the backend server now and try again!** 🎯✅

