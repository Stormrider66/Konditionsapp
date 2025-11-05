# Testing the Athlete Portal

## Quick Method: Prisma Studio

1. **Open Prisma Studio**:
```bash
npx prisma studio
```

2. **Change your role to ATHLETE**:
   - Open the `User` table
   - Find your user record
   - Change `role` from `COACH` to `ATHLETE`
   - Save

3. **Create an AthleteAccount**:
   - Open the `AthleteAccount` table
   - Click "Add record"
   - Set these fields:
     - `userId`: Your user ID (copy from User table)
     - `clientId`: Pick any client ID from the Client table (or create a client first)
   - Save

4. **Refresh your browser** - You should now have athlete access!

5. **Visit**: `http://localhost:3000/athlete/dashboard`

---

## Alternative: Create a Separate Athlete Account

1. **As a coach, create a client**:
   - Go to `/clients/new`
   - Fill in client details
   - Save

2. **Create an athlete account for that client**:
   - Go to the client's detail page
   - Click "Create Athlete Account"
   - System generates login credentials

3. **Log out and log in with the athlete credentials**

---

## Switching Back to Coach

In Prisma Studio:
1. Open `User` table
2. Change `role` back to `COACH`
3. Optionally delete the `AthleteAccount` record
4. Refresh browser

---

## Development Helper Page

Visit **`/dev/role-info`** to:
- See your current role
- View your clients
- Get step-by-step instructions
- Quick navigation to dashboards
