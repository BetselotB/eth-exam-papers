# ExamPapers Setup Instructions

## Supabase Configuration

This project uses Supabase for authentication and storage. You'll need to set up a Supabase project and configure the environment variables.

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to be set up

### 2. Get Your Project Credentials

1. Go to your project dashboard
2. Navigate to Settings > API
3. Copy the following values:
   - Project URL
   - Anon/public key
   - Service role key (keep this secret!)

### 3. Set Up Environment Variables

Create a `.env.local` file in your project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Configure Supabase Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Set your site URL to `http://localhost:3000` (for development)
3. Add `http://localhost:3000/auth/callback` to your redirect URLs

### 4.1. Set Up Google OAuth (Optional but Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client IDs
5. Choose "Web application" as the application type
6. Add these authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)
7. Copy the Client ID and Client Secret
8. In your Supabase dashboard, go to Authentication > Providers
9. Enable Google provider
10. Enter your Google Client ID and Client Secret
11. Save the configuration

### 5. Database Schema Setup

**Important:** You must set up the database schema for the user profile system to work properly.

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `database/schema.sql` into the SQL Editor
4. Click "Run" to execute the schema

**What the Database Schema Includes:**

- **user_profiles table**: Stores user profile information, usage statistics, and subscription status
- **Automatic profile creation**: When a user signs up, their profile is automatically created
- **Row Level Security**: Users can only access their own profile data
- **Usage tracking**: Tracks documents viewed, downloaded, and uploaded
- **Free limit enforcement**: Built-in logic for the 20-document free limit
- **Automatic timestamps**: Created and updated timestamps are automatically managed

### 6. Run the Project

```bash
npm run dev
```

## Features Implemented

- ✅ User authentication (signup/login)
- ✅ Google OAuth integration
- ✅ Protected routes (middleware)
- ✅ Landing page
- ✅ Dashboard with user info and real-time statistics
- ✅ User profile management system
- ✅ Database schema for user profiles and usage tracking
- ✅ 20-document limit tracking with real-time updates
- ✅ Upload wall concept (UI ready)
- ✅ Profile editing and management

## Next Steps

1. Set up your Supabase project
2. Configure environment variables
3. Set up Google OAuth (optional but recommended)
4. Test authentication flow (both email/password and Google OAuth)
5. Implement document upload functionality
6. Add document viewing/downloading
7. Implement the paywall logic after 20 documents

## Authentication Flow

1. Users land on the welcome page
2. They must sign up/login to access content (via email/password or Google OAuth)
3. After authentication, they're redirected to `/dashboard`
4. The dashboard shows their remaining free document views
5. After 20 views, they'll be prompted to upload papers

## Authentication Methods

- **Email/Password**: Traditional signup and login
- **Google OAuth**: One-click sign-in with Google account
- Both methods create user profiles automatically
- Users can switch between methods for the same account

## Security Notes

- All routes except `/`, `/login`, and `/signup` require authentication
- Middleware protects routes at the server level
- Session tokens are stored securely in cookies
- Service role key should never be exposed to the client
