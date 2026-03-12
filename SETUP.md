# Project Setup Guide (Beginner Friendly)

This guide will walk you through setting up and running the HeckTeck SMS project step-by-step. No prior coding experience needed!

---

## Table of Contents

1. [What You'll Need](#what-youll-need)
2. [Step 1: Install Node.js](#step-1-install-nodejs)
3. [Step 2: Install PostgreSQL Database](#step-2-install-postgresql-database)
4. [Step 3: Open the Project Folder](#step-3-open-the-project-folder)
5. [Step 4: Create Environment File](#step-4-create-environment-file)
6. [Step 5: Install Project Dependencies](#step-5-install-project-dependencies)
7. [Step 6: Setup the Database](#step-6-setup-the-database)
8. [Step 7: Start the Backend Server](#step-7-start-the-backend-server)
9. [Step 8: Start the Frontend](#step-8-start-the-frontend)
10. [Step 9: Open in Browser](#step-9-open-in-browser)
11. [Troubleshooting](#troubleshooting)
12. [Stopping the Project](#stopping-the-project)

---

## What You'll Need

Before we start, make sure you have:
- A Windows computer
- Internet connection
- About 30 minutes of time

---

## Step 1: Install Node.js

Node.js is what runs the project code. Think of it like installing Microsoft Office to open Word documents.

1. Open your web browser and go to: **https://nodejs.org**
2. Click the big green button that says **"LTS"** (Long Term Support)
3. A file will download (something like `node-v20.x.x-x64.msi`)
4. Double-click the downloaded file to open it
5. Click **Next** on every screen (keep all default options)
6. Click **Install** when prompted
7. Click **Finish** when done

### Verify Installation

1. Press `Windows Key + R` on your keyboard
2. Type `cmd` and press Enter (this opens Command Prompt)
3. Type the following and press Enter:
   ```
   node --version
   ```
4. You should see something like `v20.10.0` (the numbers may be different)
5. If you see an error, restart your computer and try again

---

## Step 2: Install PostgreSQL Database

PostgreSQL is where all the data (students, teachers, attendance) is stored.

1. Go to: **https://www.postgresql.org/download/windows/**
2. Click **"Download the installer"**
3. Click the download link for the latest version (Windows x86-64)
4. Run the downloaded installer
5. Click **Next** through the installation wizard
6. **IMPORTANT:** When asked for a password, enter: `postgres123`
   - Write this down! You'll need it later
   - This is for local development only. Use a strong, unique password for production databases.
7. Keep the default port as `5432`
8. Click **Next** until installation completes
9. Uncheck "Launch Stack Builder" at the end and click **Finish**

---

## Step 3: Open the Project Folder

1. Open **File Explorer** (the folder icon on your taskbar)
2. Navigate to where this project folder is located
3. Click in the address bar at the top (where it shows the folder path)
4. Type `cmd` and press **Enter**
   - This opens Command Prompt in the project folder

You should see something like:
```
C:\Users\YourName\project-lanita>
```

---

## Step 4: Create Environment File

The environment file tells the project how to connect to the database.

1. In the Command Prompt window, type:
   ```
   cd server
   ```
   Press **Enter**

2. Copy the example environment file:
   ```
   copy ..\.env.example .env
   ```
   Press **Enter**

3. Open the file in Notepad to customize it:
   ```
   notepad .env
   ```
   Press **Enter**

4. In the `.env` file, find `DATABASE_URL` and replace `CHANGE_ME` with the password you chose in Step 2.

5. Press `Ctrl + S` to save
6. Close Notepad

> **Security:** Never use values from this guide or `.env.example` in production. Generate strong random secrets (e.g. `openssl rand -base64 32`) and use a unique database password.

### What do these settings mean?
- `DATABASE_URL`: Tells the app where the database is and how to connect
- `JWT_ACCESS_SECRET`: A secret code used to keep user logins secure
- `JWT_REFRESH_SECRET`: Another secret code for security
- For production deployment, see `.env.production.example` and use cryptographically random secrets.

---

## Step 5: Install Project Dependencies

Dependencies are like ingredients needed to cook a recipe. We need to download them.

### Install Backend Dependencies

1. Make sure you're in the `server` folder (your Command Prompt should show `...\project-lanita\server>`)

2. Type this command and press **Enter**:
   ```
   npm install
   ```

3. Wait for it to finish (this may take 2-5 minutes)
   - You'll see a lot of text scrolling
   - It's done when you see the blinking cursor again

### Install Frontend Dependencies

1. Type this command to go to the client folder:
   ```
   cd ../client
   ```
   Press **Enter**

2. Type this command and press **Enter**:
   ```
   npm install
   ```

3. Wait for it to finish (another 2-5 minutes)

---

## Step 6: Setup the Database

Now we need to create the database and tables where data will be stored.

1. Go back to the server folder:
   ```
   cd ../server
   ```
   Press **Enter**

2. Create the database by running:
   ```
   npx prisma migrate dev --name init
   ```
   Press **Enter**
   
   - If asked "Do you want to continue?", type `y` and press **Enter**
   - Wait for it to complete (1-2 minutes)

3. Add sample data (students, teachers, etc.):
   ```
   npx prisma db seed
   ```
   Press **Enter**
   
   - Wait for "Seeding complete" message

---

## Step 7: Start the Backend Server

The backend server handles all the data operations.

1. Make sure you're in the `server` folder

2. Type this command:
   ```
   npm run start:dev
   ```
   Press **Enter**

3. Wait until you see a message like:
   ```
   [Nest] LOG [NestApplication] Nest application successfully started
   ```

4. **KEEP THIS WINDOW OPEN!** Don't close it.

---

## Step 8: Start the Frontend

Now we need to start the part you'll see in the browser.

1. **Open a NEW Command Prompt window**:
   - Press `Windows Key + R`
   - Type `cmd` and press **Enter**

2. Navigate to the client folder:
   ```
   cd C:\Users\YourName\project-lanita\client
   ```
   (Replace `YourName` with your actual Windows username)
   
   Press **Enter**

3. Start the frontend:
   ```
   npm run dev
   ```
   Press **Enter**

4. Wait until you see:
   ```
   ✓ Ready in X.Xs
   ○ Local: http://localhost:3000
   ```

5. **KEEP THIS WINDOW OPEN TOO!**

---

## Step 9: Open in Browser

Almost there!

1. Open your web browser (Chrome, Edge, Firefox, etc.)

2. In the address bar, type:
   ```
   http://localhost:3000
   ```
   Press **Enter**

3. You should see the **Login Page**!

### Default Login Credentials

Try logging in with these sample accounts (created by the seed command in Step 6):

**Admin Account:**
- Email: `admin@heckteck.com`
- Password: `Admin@123`

**Teacher Accounts** (5 teachers available):
- Email: `teacher1@heckteck.com` (or teacher2, teacher3, teacher4, teacher5)
- Password: `Teacher@123`

**Student Accounts** (50 students available):
- Email: `student1@heckteck.com` (or student2 through student50)
- Password: `Student@123`

> **Tip:** Login as `teacher1@heckteck.com` to see the Teacher Portal with "My Classes" and test the attendance feature!

---

## Troubleshooting

### "npm is not recognized"
- Node.js wasn't installed correctly
- Restart your computer and try again
- If still not working, reinstall Node.js from Step 1

### "Connection refused" or database errors
- PostgreSQL isn't running
- Search for "Services" in Windows Start menu
- Find "postgresql" in the list
- Right-click and select "Start"

### "Port 3000 already in use"
- Another program is using port 3000
- Close any other development servers you might have running
- Or restart your computer

### "Cannot find module" errors
- Run `npm install` again in both `server` and `client` folders

### Page won't load / blank screen
- Make sure BOTH Command Prompt windows are still open and running
- Check for error messages in either window

### Login doesn't work
- Make sure you ran `npx prisma db seed` in Step 6
- Check the password is exactly as shown (passwords are case-sensitive)

---

## Stopping the Project

When you're done and want to stop everything:

1. Go to each Command Prompt window
2. Press `Ctrl + C` on your keyboard
3. If asked "Terminate batch job?", type `Y` and press **Enter**
4. Close the Command Prompt windows

---

## Quick Start (After First Setup)

Once you've done the full setup, here's the quick way to start the project next time:

1. Open Command Prompt in the `server` folder and run:
   ```
   npm run start:dev
   ```

2. Open another Command Prompt in the `client` folder and run:
   ```
   npm run dev
   ```

3. Open browser to `http://localhost:3000`

---

## Need Help?

If you're stuck, try:
1. Restarting your computer
2. Running through the steps again
3. Checking the Troubleshooting section above

Good luck! 🎉

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d

# Reset database (removes volumes)
docker-compose down -v
docker-compose up -d

# Option 1: With .env file (recommended)
# Replace placeholders with strong random values. Never use example values in production.
echo "POSTGRES_PASSWORD=your-secure-password" > .env
echo "JWT_ACCESS_SECRET=your-jwt-secret" >> .env
echo "JWT_REFRESH_SECRET=your-refresh-secret" >> .env
docker-compose -f docker-compose.yml up -d --build

# Option 2: Direct (uses default placeholders)
docker-compose -f docker-compose.yml up -d --build