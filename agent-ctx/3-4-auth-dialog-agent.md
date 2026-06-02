# Task 3-4: Auth Dialog Agent

## Task: Update auth dialog with separate create account flows, mandatory 2FA, sample data

### Changes Made

**File Modified:** `/home/z/my-project/src/components/auth-dialog.tsx`

#### 1. Separate Create Account Flows
- Removed generic dropdown role selector from register form
- Registration forms are now fully role-specific based on `selectedLoginRole`:
  - **Customer**: Email, Full Name, Password, Confirm Password, optional 2FA checkbox, social registration buttons
  - **Corporate**: Email, Full Name, Password, Confirm Password, Company Name, Contact Person, Phone, Industry, Website, GST Number, approval notice
  - **Team/Agent**: Email, Full Name, Password, Confirm Password, Employee/Agent ID, Department, approval notice
- Added role badges at top of both login and register forms showing selected role + 2FA status
- Social login/registration only shown for customer role
- Corporate/team register buttons say "Submit for Approval"

#### 2. 2FA Mandatory for Corporate and Team
- In `handleLogin`, after successful login without server-required 2FA, forces 2FA step for corporate and team roles
- Updated 2FA dialog description to reflect mandatory nature
- Customer registration has optional 2FA checkbox
- Corporate/Team always have 2FA enabled

#### 3. Sample/Demo Data in Placeholders
- Customer login: email="customer@3boxes.com", password="Enter your password"
- Corporate login: email="corporate@3boxes.com"
- Team login: email="team@3boxes.com"
- Customer register: email="priya.sharma@email.com", name="Priya Sharma"
- Corporate register: email="rajesh@techcorp.in", name="Rajesh Kumar", company="TechCorp India Pvt. Ltd.", contact="Rajesh Kumar", phone="+91-9876543210", industry="Technology", website="https://techcorp.in", gst="29AABCT1234F1ZH"
- Team register: email="agent@3boxes.in", name="Amit Singh", employeeId="3B-2024-0142", department="Customer Success"

#### 4. Login/Logout Notifications
- 2FA verification: `showToast('success', 'Verification successful! Welcome back.')`
- Registration success: `showToast('success', 'Account created successfully! Welcome to 3 Boxes Luxury.')`
- Corporate/team pending approval: `showToast('info', 'Registration submitted. Awaiting admin approval.')`
- Logout already handled in header.tsx

### Verification
- ESLint: No errors
- Dev server: Running normally
