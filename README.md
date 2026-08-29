# Tenz Learn — Online Learning Platform

A full-stack online learning and course marketplace platform. Supports multiple user roles (Student, Instructor, Admin) with course creation, AI-powered tools, Stripe payments, progress tracking, quizzes, broadcasts, and comprehensive admin controls.

**Live Demo**: [study-portal-frontend.onrender.com](https://study-portal-frontend.onrender.com)

---

## What's New (since initial release)

### AI — Instructor Key Sharing with Students
- Per-course toggle for instructors to share their AI key with enrolled students
- Students can choose between their own key or the instructor's key via a source selector UI
- Amber warning banner shown when a student is using the instructor's key
- Students cannot delete conversations that used the instructor's key
- Instructors can block individual students from using their key per course
- Conversation auto-titled from the first message; title is inline-editable

### AI — Instructor View of Student Conversations
- Instructors can open a read-only drawer per student showing all AI conversations that used the instructor's key
- Full message history visible with user/assistant bubbles
- Only accessible when the per-course student AI toggle is enabled

### Course Progress Fix
- Hidden sections and lectures are now excluded from progress percentage calculations

### Personal Activity Log
- All users now have a personal activity log on their profile showing their own actions
- Admin impersonation actions are hidden from personal logs
- Activity log filter bar made sticky with multi-select chip UI

### Profile Page Redesign
- Avatar system with initials and color generation
- Bio templates and a tabbed layout (Overview, Activity, Settings)

### Google OAuth
- Google login via authorization code flow (secure server-side exchange)
- Admin impersonation — admins can log in as any user for support

### Auth Pages Redesign
- Split-panel layout for Login and Register with feature highlights

### Resource Manager
- Upload and link resources (PDFs, links) to courses
- Inline resource viewer within the course page

### Course View Improvements
- Tabbed layout (Video, Notes, Comments) with collapsible sidebar
- Lecture importance badges (Critical / Important / Standard)
- Section numbers and sort by lecture number
- Collapsed sections by default with state preserved on re-fetch

### Student Progress Overlay
- Instructors can view any student's lecture-by-lecture progress directly on the Curriculum tab
- Importance inheritance from section to lectures

### Peer Progress Visibility
- Students can see anonymized peer progress within the same course

### Vertical Sidebar Layout
- Course management pages now support a switchable vertical sidebar or horizontal tabs
- Mobile-friendly bottom navigation

### Student Analytics
- Per-student analytics panel with completion stats and learning trends
- Glass sidebar UI for admin with hover animations

### Mark for Revision
- Students can flag lectures for revision; tracked in activity log with dedicated icons and filters

### Auto-Broadcast on Content Changes
- Adding a section or lecture auto-sends a course broadcast with section name and lecture link
- URLs in broadcasts are rendered as clickable links

### Activity Log Improvements
- Multi-select action filter with dismissible chips
- Descriptive resource names instead of generic IDs
- Icons and badge colors for all action types including AI settings actions

---

## Tech Stack

**Frontend**
- React 19, Vite 7, React Router DOM 7
- Tailwind CSS 3, React Hot Toast, React Icons
- Axios (HTTP client)

**Backend**
- Node.js, Express 5
- MongoDB + Mongoose 9
- JWT (jsonwebtoken), bcryptjs

**Services**
- Stripe — Payments, Webhooks, PDF Invoices
- OpenAI / Google Gemini / Anthropic — AI features
- Google OAuth 2.0 — Social login
- Multer — File uploads (PDF, images)
- PDFKit — Invoice PDF generation
- express-rate-limit — Rate limiting

---

## Project Structure

```
skill-path/
│
├── client/
│   └── src/
│       ├── api/
│       │   └── axios.js                        # Axios instance with base URL + interceptors
│       │
│       ├── context/
│       │   ├── AuthContext.jsx                 # Auth state, JWT caching, login/logout
│       │   └── ThemeContext.jsx                # Dark/light mode toggle
│       │
│       ├── components/
│       │   ├── broadcast/
│       │   │   └── BroadcastList.jsx           # Course announcement list
│       │   ├── chat/
│       │   │   └── AIChatPanel.jsx             # AI chat panel with source selector, inline title edit
│       │   ├── course/
│       │   │   ├── AINotesGenerator.jsx        # AI notes generation UI
│       │   │   ├── LectureSidebarItem.jsx      # Sidebar lecture item
│       │   │   ├── ResourceManager.jsx         # Upload and link course resources
│       │   │   ├── TeacherManagement.jsx       # Add/manage co-teachers
│       │   │   └── VideoPlayer.jsx             # Embedded video player
│       │   ├── layout/
│       │   │   ├── Navbar.jsx                  # Top navigation bar
│       │   │   └── Footer.jsx                  # Site footer
│       │   ├── review/
│       │   │   ├── InstructorProfileCard.jsx   # Instructor profile display
│       │   │   └── ReviewCard.jsx              # Individual review display
│       │   └── ui/
│       │       ├── CourseCard.jsx              # Marketplace course card
│       │       ├── FloatingAIChatButton.jsx    # Floating AI chat button
│       │       ├── Modal.jsx                   # Reusable modal
│       │       ├── Pagination.jsx              # Reusable pagination
│       │       ├── PriceDisplay.jsx            # Price formatting (INR/USD)
│       │       ├── StarRating.jsx              # Star rating input
│       │       └── StatusSelector.jsx          # Lecture status dropdown
│       │
│       ├── pages/
│       │   ├── admin/
│       │   │   ├── AdminDashboard.jsx          # Users, instructors, payouts tabs + impersonation
│       │   │   └── GlobalActivity.jsx          # Platform audit logs with multi-select filters
│       │   ├── auth/
│       │   │   ├── Login.jsx                   # Split-panel login with Google OAuth
│       │   │   └── Register.jsx                # Split-panel register
│       │   ├── course/
│       │   │   ├── CourseManage.jsx            # Sections, lectures, students, AI access controls
│       │   │   ├── CourseSettings.jsx          # Metadata, status, statuses config
│       │   │   ├── CourseAnalytics.jsx         # Per-course analytics
│       │   │   ├── CourseView.jsx              # Lecture viewer (video + notes + comments)
│       │   │   ├── ManageCoupons.jsx           # Coupon management per course
│       │   │   └── StudentCourseDetails.jsx    # Student view: content, quizzes, announcements
│       │   ├── instructor/
│       │   │   ├── BecomeInstructor.jsx        # Instructor onboarding
│       │   │   ├── InstructorDashboard.jsx     # Earnings, courses, stats
│       │   │   ├── CreateMarketplaceCourse.jsx # Create marketplace listing
│       │   │   ├── InstructorCoupons.jsx       # Manage all coupons
│       │   │   ├── InstructorPaymentSettings.jsx # Bank/UPI/PayPal setup
│       │   │   └── AISettings.jsx              # AI provider configuration
│       │   ├── marketplace/
│       │   │   ├── Marketplace.jsx             # Browse & filter courses
│       │   │   ├── CourseLanding.jsx           # Course detail + purchase page
│       │   │   ├── CheckoutSuccess.jsx         # Post-payment confirmation
│       │   │   ├── MyPurchases.jsx             # Purchase history
│       │   │   └── InvoicePage.jsx             # View & download invoice
│       │   ├── quiz/
│       │   │   ├── QuizManage.jsx              # Create/edit quizzes
│       │   │   ├── QuizTake.jsx                # Student takes quiz
│       │   │   └── QuizAnalytics.jsx           # Quiz performance stats
│       │   ├── student/
│       │   │   ├── StudentDashboard.jsx        # My Learning + My Courses tabs
│       │   │   ├── StudentDetail.jsx           # Instructor view of a student
│       │   │   ├── StudentProgressDetail.jsx   # Detailed student progress
│       │   │   ├── AIChatPage.jsx              # Full AI chat page with instructor key support
│       │   │   └── StudentAISettings.jsx       # Student AI provider config
│       │   ├── Profile.jsx                     # User profile + avatar + bio + personal activity log
│       │   └── NotFound.jsx                    # 404 page
│       │
│       ├── utils/
│       │   └── activityUtils.jsx               # Action icons, badge colors, resource labels
│       ├── config/
│       │   └── redirect.js                     # Route redirect helpers
│       ├── App.jsx                             # Route definitions
│       └── main.jsx                            # Entry point
│
├── server/
│   ├── config/
│   │   ├── db.js                               # MongoDB connection
│   │   └── stripe.js                           # Stripe client init
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js                   # JWT protect, admin, instructorOnly guards
│   │   ├── ownershipMiddleware.js              # Course/lecture/broadcast ownership checks
│   │   ├── rateLimiter.js                      # Auth + course creation rate limits
│   │   ├── activityLogger.js                   # Auto-log non-GET actions
│   │   └── errorMiddleware.js                  # Global error handler
│   │
│   ├── models/
│   │   ├── User.js                             # Roles, warnings, block status
│   │   ├── Course.js                           # Sections, lectures, allowStudentAI, aiBlockedStudents
│   │   ├── Section.js                          # Section grouping
│   │   ├── Lecture.js                          # Resource URL, due date, preview flag
│   │   ├── Progress.js                         # Per-lecture status, notes, timestamps
│   │   ├── Quiz.js                             # Questions, scoring, attempt limits
│   │   ├── QuizAttempt.js                      # Submission records, scores
│   │   ├── Purchase.js                         # Stripe transactions, invoices
│   │   ├── Coupon.js                           # Discount codes, usage limits, expiry
│   │   ├── Review.js                           # Ratings, comments, helpful count
│   │   ├── Broadcast.js                        # Announcements with priority levels
│   │   ├── BroadcastView.js                    # Read tracking per user
│   │   ├── Conversation.js                     # AI chat history, useInstructorKey, titleEdited
│   │   ├── CourseTeacher.js                    # Co-teacher roles + permissions
│   │   ├── BankDetail.js                       # Instructor payment info
│   │   ├── Payout.js                           # Instructor payout records
│   │   ├── TeacherAIConfig.js                  # Encrypted AI provider keys per instructor
│   │   └── Activity.js                         # Platform audit log
│   │
│   ├── controllers/                            # Route handlers (14 files)
│   ├── routes/                                 # API route definitions (13 files)
│   ├── services/
│   │   ├── aiService.js                        # AI provider abstraction (OpenAI/Gemini/Anthropic)
│   │   └── invoiceService.js                   # PDF invoice generation
│   ├── utils/
│   │   └── encryption.js                       # AES encryption for API keys
│   ├── scripts/
│   │   └── deleteRecentActivity.js             # Utility: delete N most recent activity log entries
│   └── index.js                                # Express server entry point
│
└── README.md
```

---

## API Endpoints

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public (rate limited) | Register new user |
| POST | `/login` | Public (rate limited) | Login and get JWT |
| GET | `/me` | Protected | Get current user profile |
| PUT | `/updatepassword` | Protected | Change password |
| GET | `/google` | Public | Initiate Google OAuth flow |
| GET | `/google/callback` | Public | Google OAuth callback |

---

### Courses — `/api/courses`

#### Course CRUD
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Protected | List all courses for the user |
| GET | `/search` | Protected | Search courses by keyword |
| POST | `/` | Protected (rate limited) | Create a new course |
| GET | `/:id` | Protected | Get single course details |
| PUT | `/:id` | Owner only | Update course |
| DELETE | `/:id` | Owner only | Delete course |

#### My Courses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/my/enrolled` | Protected | Get enrolled courses with progress |
| GET | `/my/created` | Protected | Get created/teaching courses |
| GET | `/my/stats` | Protected | Get user learning stats |

#### Sections
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/:id/sections` | Content permission | Add section to course |
| PUT | `/:id/sections/:sectionId` | Content permission | Update section |
| DELETE | `/:id/sections/:sectionId` | Content permission | Delete section |

#### Lectures
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/:id/sections/:sectionId/lectures` | Content permission | Add lecture to section |
| GET | `/lectures/:id` | Protected | Get lecture details |
| PUT | `/lectures/:id` | Lecture owner | Update lecture |
| DELETE | `/lectures/:id` | Lecture owner | Delete lecture |
| PUT | `/lectures/:id/progress` | Protected | Update student lecture progress/notes |
| POST | `/lectures/:id/comments` | Protected | Add comment to lecture |
| GET | `/lectures/:id/comments` | Protected | Get lecture comments |

#### Students
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/:id/enroll` | Student management permission | Enroll a student |
| DELETE | `/:id/enroll/:studentId` | Student management permission | Remove a student |
| GET | `/:id/progresses` | Student management permission | All students' progress |
| GET | `/:id/progress/:studentId` | Student management permission | Single student progress detail |
| GET | `/:id/activity/:studentId` | Student management permission | Student activity log |
| GET | `/:id/my-progress` | Protected | Current user's progress for course |

#### Student AI Access (per course)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | `/:id/toggle-student-ai` | Owner only | Toggle whether students can use instructor's AI key |
| PUT | `/:id/ai-block/:studentId` | Owner only | Block or unblock a student from using instructor's AI key |

#### Teachers (Co-instructors)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:courseId/teachers` | Course access | List co-teachers |
| POST | `/:courseId/teachers` | Teacher management permission | Add co-teacher |
| PUT | `/:courseId/teachers/:teacherId` | Teacher management permission | Update teacher permissions |
| DELETE | `/:courseId/teachers/:teacherId` | Teacher management permission | Remove co-teacher |
| DELETE | `/:courseId/teachers/leave` | Protected | Teacher leaves course |
| GET | `/:courseId/my-permissions` | Protected | Get current user's permissions |

#### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:id/analytics` | Course access | Course performance analytics |

---

### Quizzes — `/api/quizzes`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Protected | Create quiz |
| GET | `/course/:courseId` | Protected | Get all quizzes for a course |
| GET | `/:id` | Protected | Get quiz details |
| PUT | `/:id` | Protected | Update quiz |
| DELETE | `/:id` | Protected | Delete quiz |
| POST | `/:id/start` | Protected | Start a quiz attempt |
| POST | `/:id/submit` | Protected | Submit quiz answers |
| GET | `/:id/my-attempts` | Protected | Get user's quiz attempts |
| GET | `/attempts/:attemptId` | Protected | Get attempt result |
| GET | `/:id/analytics` | Protected | Quiz analytics |

---

### Marketplace — `/api/marketplace`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Public | Browse marketplace courses |
| GET | `/search` | Public | Search courses |
| GET | `/categories` | Public | Get all categories |
| GET | `/:id` | Public | Get course landing page details |

---

### Purchases & Payments — `/api/purchase`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/webhook` | Stripe signature | Handle Stripe webhook events |
| POST | `/checkout` | Protected | Create Stripe checkout session |
| GET | `/my-purchases` | Protected | Get user's purchase history |
| GET | `/verify/:courseId` | Protected | Verify course purchase status |
| GET | `/session/:sessionId` | Protected | Get checkout session status |
| GET | `/invoice/:invoiceNumber` | Public | View invoice |
| GET | `/invoice/:invoiceNumber/pdf` | Public | Download invoice as PDF |

---

### Coupons — `/api/coupons`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/validate` | Protected | Validate a coupon code |
| POST | `/` | Instructor only | Create coupon |
| GET | `/course/:courseId` | Instructor only | Get course's coupons |
| PUT | `/:id` | Instructor only | Update coupon |
| DELETE | `/:id` | Instructor only | Delete coupon |

---

### Reviews — `/api/reviews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/course/:courseId` | Public | Get all reviews for a course |
| POST | `/` | Protected | Create a review |
| GET | `/my/:courseId` | Protected | Get your review for a course |
| PUT | `/:id` | Protected | Update your review |
| DELETE | `/:id` | Protected | Delete your review |
| POST | `/:id/helpful` | Protected | Mark review as helpful |

---

### Broadcasts (Announcements) — `/api/broadcasts`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/course/:courseId/active` | Protected | Get active announcements |
| GET | `/course/:courseId/can-broadcast` | Protected | Check if user can post |
| GET | `/course/:courseId/unread-count` | Protected | Get unread count |
| POST | `/course/:courseId/mark-read` | Protected | Mark all as read |
| PUT | `/course/:courseId/settings` | Owner only | Toggle student broadcast permission |
| POST | `/course/:courseId` | Broadcast permission | Create announcement |
| GET | `/course/:courseId` | Broadcast permission | Get all announcements |
| PUT | `/:id` | Broadcast owner | Update announcement |
| DELETE | `/:id` | Broadcast owner | Delete announcement |

---

### Instructor — `/api/instructor`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/become` | Protected | Upgrade account to instructor |
| GET | `/dashboard` | Instructor only | Dashboard stats & overview |
| GET | `/courses` | Instructor only | List instructor's marketplace courses |
| POST | `/course` | Instructor only | Create marketplace course listing |
| PUT | `/course/:id` | Instructor only | Update marketplace course |
| GET | `/course/:id/sales` | Instructor only | Course sales data |
| GET | `/profile` | Instructor only | Get instructor profile |
| PUT | `/profile` | Instructor only | Update instructor profile & bio |
| GET | `/bank-details` | Instructor only | Get payment details |
| POST | `/bank-details` | Instructor only | Save bank / UPI / PayPal details |
| GET | `/earnings` | Instructor only | Earnings summary |

---

### AI — Instructor (`/api/ai`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/config` | Instructor only | Get AI provider config |
| POST | `/config` | Instructor only | Save AI provider + API key |
| DELETE | `/config` | Instructor only | Remove AI config |
| POST | `/test` | Instructor only | Test AI connection |
| POST | `/generate-quiz` | Instructor only | Auto-generate quiz from course content |
| POST | `/generate-notes` | Instructor only | Auto-generate study notes |
| GET | `/course/:courseId/student-conversations` | Instructor only | View student AI conversations using instructor key (read-only) |

---

### AI — Student (`/api/student-ai`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/config` | Protected | Get student AI config |
| POST | `/config` | Protected | Save AI provider + API key |
| DELETE | `/config` | Protected | Remove AI config |
| POST | `/test` | Protected | Test AI connection |
| GET | `/conversations` | Protected | List all conversations |
| POST | `/conversations` | Protected | Create new conversation (accepts `useInstructorKey`) |
| GET | `/conversations/:id` | Protected | Get conversation with messages |
| DELETE | `/conversations/:id` | Protected | Delete conversation (blocked if using instructor key) |
| POST | `/conversations/:id/messages` | Protected | Send message (supports PDF/image upload) |
| PUT | `/conversations/:id/title` | Protected | Rename a conversation |
| GET | `/course/:courseId/ai-status` | Protected | Course AI status (own key, instructor key availability, block status) |

---

### Admin — `/api/admin`

#### Dashboard & Instructors
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | Admin only | Platform-wide stats |
| GET | `/instructors` | Admin only | List all instructors |
| GET | `/instructors/:id` | Admin only | Instructor detail + courses |
| POST | `/payouts` | Admin only | Create instructor payout |
| GET | `/payouts` | Admin only | List all payouts |
| POST | `/impersonate/:userId` | Admin only | Log in as another user |

#### User Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | Admin only | List all users |
| POST | `/users/:id/warn` | Admin only | Issue warning to user |
| DELETE | `/users/:id/warnings/:index` | Admin only | Remove specific warning |
| POST | `/users/:id/max-warnings` | Admin only | Set max warning limit |
| POST | `/users/:id/block` | Admin only | Block user account |
| POST | `/users/:id/unblock` | Admin only | Unblock user account |
| POST | `/users/:id/role` | Admin only | Change user role |

#### Course Moderation
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/courses/:id/block` | Admin only | Block a course |
| POST | `/courses/:id/unblock` | Admin only | Unblock a course |

---

### Activity Logs — `/api/activities`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Admin only | Get global platform activity logs (multi-select filter, sticky bar) |
| GET | `/my` | Protected | Get personal activity log for current user |

---

## Database Models

| Model | Purpose |
|-------|---------|
| `User` | Accounts with roles (admin/instructor/student), warnings, block status |
| `Course` | Course metadata, sections, lecture statuses, marketplace fields, `allowStudentAI`, `aiBlockedStudents[]` |
| `Section` | Groups lectures within a course, importance level |
| `Lecture` | Resource URL, description, due date, section number, public/preview flags |
| `Progress` | Per-lecture status, notes, revision flag, completion timestamp per student |
| `Quiz` | Questions, passing score, time limit, attempt limit |
| `QuizAttempt` | Student submission with answers and score |
| `Purchase` | Stripe checkout, coupon applied, invoice number |
| `Coupon` | Discount codes with type (% or fixed), usage limit, expiry |
| `Review` | Star rating, comment, helpful count |
| `Broadcast` | Course announcement with Normal / Important / Urgent priority |
| `BroadcastView` | Tracks which broadcasts each user has read |
| `Conversation` | AI chat session with message history, `useInstructorKey`, `titleEdited` |
| `CourseTeacher` | Co-teacher assignment with granular permissions |
| `BankDetail` | Instructor payment info (bank account, UPI, PayPal) |
| `Payout` | Instructor payout records with status |
| `TeacherAIConfig` | Encrypted AI provider API keys per instructor |
| `Activity` | Audit log of all non-GET actions on the platform |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Stripe account
- Google OAuth credentials (optional, for Google login)

### 1. Clone

```bash
git clone https://github.com/tenze/study-portal.git
cd study-portal
```

### 2. Server setup

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
AI_ENCRYPTION_KEY=your_32_char_encryption_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Client setup

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SESSION_EXPIRY_DAYS=7
```

### 4. Run

```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

App runs at `http://localhost:5173`

---

## Deployment (Render)

- **Backend** — Deploy `server/` as a Web Service. Set all env variables.
- **Frontend** — Deploy `client/` as a Static Site. Build command: `npm run build`. Publish dir: `dist`.
- **Stripe Webhook** — Set webhook endpoint to `https://your-backend.onrender.com/api/purchase/webhook` in Stripe dashboard. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

---

## License

Educational project. All rights reserved.

---

Built by **the team** · [GitHub](https://github.com/tenze)
