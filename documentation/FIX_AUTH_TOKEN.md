# 🔐 Fix: Organization Not Found - Authentication Issue

## ❌ Problem
Frontend shows "Organization Not Found" because there's no authentication token set.

## ✅ Solution

The organization **DOES exist** in Django, but the frontend API calls are failing because you're not authenticated.

### Quick Fix: Set Authentication Token

1. **Open your browser** to `http://localhost:3000`

2. **Open Browser Console** (F12 or Right-click → Inspect → Console)

3. **Run this command** in the console:
```javascript
localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYwNTA0MjY1LCJpYXQiOjE3NjA0NjEwNjUsImp0aSI6ImMzNTAzYzY5N2VjNTRmOGI5YTA3ODFkOTM4OTZkOWViIiwic3ViIjoiMSJ9.UunHTt8XEC4HjwWWnT4nYnstREnOeIVUsHOBgEcTUbA')
```

4. **Refresh the page** (F5 or Cmd+R)

5. **Navigate to**: `http://localhost:3000/layout-1/organizations/2ddd0d72-e192-451a-aff0-3b532edb6e12`

✅ **The organization page should now load!**

## 📊 What Was Verified

### Organization Exists ✅
```
Name: Test Company
ID: 2ddd0d72-e192-451a-aff0-3b532edb6e12
Slug: test-company
Members: 2 (admin, eseza.muwanga)
```

### API Works ✅
Test with curl:
```bash
curl -H 'Authorization: Bearer YOUR_TOKEN' \
  http://localhost:8000/api/v1/erp/organizations/2ddd0d72-e192-451a-aff0-3b532edb6e12/
```

### Admin User Has Access ✅
- Admin is a member of "Test Company"
- Role: admin
- Can view organization details

## 🔄 Long-Term Solution: Add Login Page

You need to create a proper login flow. Here's what you need:

### 1. Login API Endpoint (Django)
Already exists at: `POST /api/auth/login/`

### 2. Login Page (Frontend)
Create `/app/auth/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthToken } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (data.access) {
        setAuthToken(data.access);
        router.push('/layout-1/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input 
        type="text" 
        value={username} 
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### 3. Protected Routes
Add authentication check to layouts:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/api';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login');
    }
  }, [router]);
  
  return <>{children}</>;
}
```

## 🎯 For Now: Use the Token

The token I generated is valid for 12 hours. Just paste it in the browser console and you're good to go!

**Token valid until**: ~12 hours from generation (JWT default)

## 📝 Test Credentials

If you want to login properly:
```
Username: admin
Password: (check your Django admin password)
```

Or create a test user:
```bash
python manage.py createsuperuser
```

## ✅ Verification Steps

After setting the token:

1. ✅ Go to: `http://localhost:3000/layout-1/organizations/2ddd0d72-e192-451a-aff0-3b532edb6e12`
2. ✅ Should see: "Test Company" organization details
3. ✅ Should see: Members, stats, and tabs
4. ✅ Go to: `http://localhost:3000/layout-1/dashboard`
5. ✅ Should see: Xero bills (20,000 USD Expense Claims)

---

**Quick Command to Set Token:**
```javascript
localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYwNTA0MjY1LCJpYXQiOjE3NjA0NjEwNjUsImp0aSI6ImMzNTAzYzY5N2VjNTRmOGI5YTA3ODFkOTM4OTZkOWViIiwic3ViIjoiMSJ9.UunHTt8XEC4HjwWWnT4nYnstREnOeIVUsHOBgEcTUbA')
```

Then refresh! 🚀
