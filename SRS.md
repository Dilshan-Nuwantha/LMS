# Software Requirements Specification (SRS)
## Tenz Learn — Online Learning Management System

**Version:** 1.0  
**Date:** 2026-08-28  
**Status:** Final Draft  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [User Roles & Characteristics](#3-user-roles--characteristics)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture](#6-system-architecture)
7. [Database Models](#7-database-models)
8. [API Specification Summary](#8-api-specification-summary)
9. [External Interfaces & Integrations](#9-external-interfaces--integrations)
10. [Constraints & Assumptions](#10-constraints--assumptions)
11. [Glossary](#11-glossary)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) describes the functional and non-functional requirements of **Tenz Learn**, a full-stack online learning and course marketplace platform. This document is intended for developers, testers, project stakeholders, and academic evaluators.

### 1.2 Scope

Tenz Learn is a web-based Learning Management System (LMS) that enables:

- **Students** to discover, purchase, and consume courses with progress tracking, quizzes, and AI-powered learning assistance.
- **Instructors** to create, manage, and monetize courses with advanced content tools, analytics, and AI configuration.
- **Admins** to oversee the entire platform, manage users, moderate content, handle payouts, and audit activity.

The system is deployed as a client-server application with a React frontend and a Node.js/Express backend backed by MongoDB.

### 1.3 Product Overview

| Attribute | Value |
|-----------|-------|
| **Product Name** | Tenz Learn |
| **Type** | Web Application (SPA + REST API) |
| **Live Demo** | https://study-portal-frontend.onrender.com |
| **Frontend** | React 19 + Vite 7 (SPA) |
| **Backend** | Node.js + Express 5 (REST API) |
| **Database** | MongoDB (via Mongoose 9) |
| **Payment Gateway** | Stripe |
| **AI Providers** | OpenAI, Google Gemini, Anthropic Claude |
| **Auth** | JWT + Google OAuth 2.0 |

### 1.4 Definitions, Acronyms, and Abbreviations

See [Section 11 — Glossary](#11-glossary).

### 1.5 References

- README.md — Project overview and setup guide
- Stripe API Documentation: https://stripe.com/docs
- OpenAI API Documentation: https://platform.openai.com/docs
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2

---

## 2. Overall Description

### 2.1 Product Perspective

Tenz Learn is a standalone web platform. It consists of two independently deployable units:

- **Client** (`/client`) — A single-page React application that communicates with the backend via a RESTful HTTP API using Axios.
- **Server** (`/server`) — A Node.js/Express REST API that handles business logic, authentication, file storage, payment processing, and AI integration.

```
┌─────────────────────────────────────┐
│          Browser (React SPA)        │
│         client/ (Vite + React 19)   │
└────────────────┬────────────────────┘
                 │ HTTPS / REST API
                 ▼
┌─────────────────────────────────────┐
│       Express 5 REST API Server     │
│            server/ (Node.js)        │
│  ┌───────────┐  ┌──────────────┐    │
│  │ Auth (JWT)│  │  Middleware  │    │
│  └───────────┘  └──────────────┘    │
│  ┌───────────────────────────────┐  │
│  │       Controllers / Routes    │  │
│  └───────────────────────────────┘  │
└────────────┬──────────────┬─────────┘
             │              │
     ┌───────▼──────┐ ┌─────▼──────────┐
     │   MongoDB    │ │ External APIs  │
     │  (Mongoose)  │ │ Stripe / AI /  │
     └──────────────┘ │ Google OAuth   │
                      └────────────────┘
```

### 2.2 Product Functions (High-Level)

1. User registration and authentication (email/password + Google OAuth)
2. Course creation and management (sections, lectures, resources)
3. Course marketplace (browse, filter, purchase, review)
4. Student progress tracking (per-lecture status, notes, revision flags)
5. Assessment system (quizzes with scoring and analytics)
6. AI-powered learning assistance (chat, notes generation, quiz generation)
7. Instructor monetization (Stripe payments, coupons, payouts)
8. Broadcast/announcement system per course
9. Co-instructor (CourseTeacher) collaboration with granular permissions
10. Admin panel (user management, moderation, audit logs, impersonation)

### 2.3 User Classes and Interactions

| User Class | Primary Interactions |
|------------|----------------------|
| Guest (unauthenticated) | Browse marketplace, view course landing pages |
| Student | Enroll, watch lectures, take quizzes, AI chat, review courses |
| Instructor | Create courses, manage content, view analytics, configure AI, receive payouts |
| Co-Instructor | Collaborate on courses with role-specific permissions |
| Admin | Manage all users, moderate courses, view audit logs, process payouts |

### 2.4 Operating Environment

- **Client**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Server**: Node.js 18+ runtime
- **Database**: MongoDB Atlas (cloud) or self-hosted MongoDB 6+
- **Deployment**: Render (Web Service for server, Static Site for client)

### 2.5 Design and Implementation Constraints

- The frontend is a single-page application — all routing is handled client-side via React Router DOM 7.
- The backend exposes a stateless REST API; all session state is managed via JWT tokens stored on the client.
- File uploads (images, PDFs) are handled in-memory via Multer and are stored as Base64 or external URLs.
- Payment processing is handled exclusively via Stripe; no raw card data is ever stored.
- AI provider API keys are encrypted at rest using AES-256 encryption before database storage.

---

## 3. User Roles & Characteristics

### 3.1 Guest

- **Description**: An unauthenticated visitor.
- **Capabilities**: Browse the public marketplace, view course landing pages, view public reviews.
- **Limitations**: Cannot enroll in courses, access course content, or use any authenticated feature.

### 3.2 Student (Default Role)

- **Description**: A registered user with the `student` role.
- **Capabilities**:
  - Register and log in (email/password or Google OAuth).
  - Browse and purchase marketplace courses.
  - Access enrolled course content (videos, resources).
  - Track lecture-by-lecture progress with status labels and personal notes.
  - Flag lectures for revision.
  - Take and retake quizzes (subject to attempt limits).
  - Post comments on lectures.
  - Rate and review completed courses.
  - Chat with an AI assistant (using own or instructor-shared API key).
  - Receive course announcements (broadcasts).
  - View own activity log and profile.
  - Download invoices for purchases.

### 3.3 Instructor

- **Description**: A registered user who has applied and been granted the `instructor` role.
- **Capabilities** (all Student capabilities, plus):
  - Create and manage private and marketplace courses.
  - Organize course content into sections and lectures with importance badges.
  - Upload course thumbnails and resources (PDFs, external links).
  - Configure lecture statuses (custom labels and colors).
  - Manage co-instructors (CourseTeachers) with granular permissions.
  - Create and manage quizzes (with AI auto-generation).
  - Generate AI study notes for course content.
  - Post course broadcasts/announcements (auto-broadcast on new content).
  - Configure AI provider settings (OpenAI / Gemini / Anthropic).
  - Share AI key access with enrolled students on a per-course basis.
  - Block individual students from using the instructor's AI key.
  - View read-only AI conversation history of students using the instructor's key.
  - Create and manage discount coupons.
  - Configure payment details (bank account, UPI, PayPal).
  - View course analytics, enrollment stats, and sales data.
  - View per-student progress overlay.
  - Set up course marketplace listings with pricing, thumbnails, and metadata.

### 3.4 Co-Instructor (CourseTeacher)

- **Description**: An existing user (student or instructor) added to a course by the course owner.
- **Capabilities** (granular, set per assignment):
  - `canManageContent` — Add/edit/delete sections and lectures.
  - `canManageStudents` — Enroll/remove students, view progress.
  - `canManageBroadcasts` — Create/edit announcements.
  - `canManageTeachers` — Add/remove other co-instructors.
- **Limitations**: Cannot delete the course, modify marketplace settings, or access earnings unless the owner grants explicit permissions.

### 3.5 Admin

- **Description**: A superuser with the `admin` role.
- **Capabilities**:
  - Access the global admin dashboard (platform-wide statistics).
  - View, warn, block, and unblock any user.
  - Set warning thresholds per user.
  - Change user roles.
  - Block and unblock courses (content moderation).
  - View all instructors, their courses, and earnings.
  - Create instructor payout records.
  - Impersonate any user for support/debugging.
  - View the full global activity audit log with advanced multi-select filters.

---

## 4. Functional Requirements

### 4.1 Authentication & User Management

#### FR-AUTH-01: User Registration
- The system shall allow new users to register with a full name, email address, and password.
- Passwords shall be hashed using bcrypt (salt rounds: 10) before storage.
- Email addresses shall be unique across the system.
- Registration shall be rate-limited to prevent abuse.

#### FR-AUTH-02: User Login
- The system shall allow registered users to log in with email and password.
- On successful login, the server shall return a signed JWT token.
- Login shall be rate-limited.

#### FR-AUTH-03: Google OAuth Login
- The system shall support Google OAuth 2.0 login via an authorization code flow (server-side token exchange).
- On first Google login, a new account shall be created automatically with the `student` role.
- On subsequent logins, the existing account shall be retrieved by `googleId`.

#### FR-AUTH-04: JWT Authentication
- Protected API routes shall require a valid JWT in the `Authorization: Bearer <token>` header.
- Tokens shall carry the user's `id` and `role` as claims.
- The frontend shall cache decoded JWT data and apply a configurable session expiry (default: 7 days, via `VITE_SESSION_EXPIRY_DAYS`).

#### FR-AUTH-05: Password Change
- Authenticated users shall be able to change their password by providing the new password.

#### FR-AUTH-06: Admin Impersonation
- Admins shall be able to generate a temporary JWT for any other user account.
- Impersonation actions shall be hidden from the impersonated user's personal activity log.

#### FR-AUTH-07: User Profile
- Users shall be able to view and edit their profile (name, bio, profile image).
- Profiles shall display an avatar system using initials and generated colors when no image is set.
- Profile page shall use a tabbed layout: Overview, Activity, Settings.

---

### 4.2 Course Management

#### FR-COURSE-01: Course Creation
- Authenticated users shall be able to create a new course with a title and description.
- Course creation shall be rate-limited.
- New courses shall default to `Draft` status.

#### FR-COURSE-02: Course Status Lifecycle
- Courses shall support three statuses: `Draft`, `Published`, `Archived`.
- Only `Published` courses (that are also marketplace-listed) are visible in the public marketplace.
- Admin-blocked courses (`isAdminBlocked: true`) shall not be accessible to students.

#### FR-COURSE-03: Sections & Lectures
- Instructors shall be able to organize course content into **Sections**, each containing ordered **Lectures**.
- Sections shall have configurable importance levels: `Optional`, `Normal`, `Important`, `Very Important`.
- Lectures shall support:
  - Title, description, video URL.
  - Resource URL (linked external resource or uploaded file).
  - Due date.
  - Public/preview flag (for unenrolled viewers).
  - Section number for ordered display.
  - Importance badge (inherited from section or set independently).
- Adding a section or lecture shall automatically trigger a course broadcast notification.

#### FR-COURSE-04: Course Settings
- Instructors shall be able to configure the following per-course toggles:
  - `allowStudentBroadcasts` — Allow students to post announcements.
  - `allowPeerProgress` — Show anonymized peer progress to students.
  - `allowStudentUploads` — Allow students to upload resources.
  - `allowStudentAI` — Allow students to use the instructor's AI key.
- Instructors shall be able to customize lecture status labels and colors.

#### FR-COURSE-05: Student Enrollment
- Instructors (or co-instructors with `canManageStudents`) shall be able to manually enroll students.
- Students shall be removed from a course by the instructor.
- Marketplace course enrollment is triggered automatically upon successful payment.

#### FR-COURSE-06: Lecture Progress Tracking
- The system shall track each student's progress on a per-lecture basis.
- Progress record shall store:
  - Current status (mapped to a configurable status label).
  - Personal notes (text).
  - Revision flag (`markedForRevision`).
  - Completion timestamp.
- Progress percentage shall exclude hidden sections and lectures.

#### FR-COURSE-07: Co-Instructor Management (CourseTeacher)
- Course owners shall be able to add other users as co-instructors.
- Each co-instructor assignment shall carry granular boolean permissions:
  - `canManageContent`, `canManageStudents`, `canManageBroadcasts`, `canManageTeachers`.
- Co-instructors shall be able to leave a course voluntarily.

#### FR-COURSE-08: Course Analytics
- Instructors shall be able to view per-course analytics including:
  - Enrollment count and trends.
  - Completion rates.
  - Quiz performance.
  - Student engagement metrics.

#### FR-COURSE-09: Lecture Comments
- Students and instructors shall be able to post text comments on individual lectures.
- Comments shall be retrievable per lecture.

#### FR-COURSE-10: Student Progress Overlay
- Instructors shall be able to view any enrolled student's lecture-by-lecture progress directly from the Curriculum tab.

#### FR-COURSE-11: Peer Progress Visibility
- When `allowPeerProgress` is enabled, students shall see anonymized average progress of peers in the same course.

#### FR-COURSE-12: Mark for Revision
- Students shall be able to flag individual lectures for revision.
- These flags shall appear in the student's personal activity log with dedicated icons.

---

### 4.3 Marketplace

#### FR-MKT-01: Public Course Listings
- Marketplace courses shall be publicly browsable without authentication.
- Each listing shall display: title, description, instructor name, rating, price, thumbnail, category, level, and language.

#### FR-MKT-02: Search & Filter
- The marketplace shall support keyword search across course titles and descriptions.
- Filtering shall be available by: category, level, price range, language, and rating.

#### FR-MKT-03: Course Landing Page
- Each marketplace course shall have a landing page showing:
  - Full description, curriculum preview (public/preview lectures), requirements, learning outcomes, instructor profile, and reviews.

#### FR-MKT-04: Course Pricing
- Instructors shall set a price (and optional original/strike-through price) in INR or USD.
- Courses may be listed as free (price = 0).

#### FR-MKT-05: Coupon Codes
- Instructors shall be able to create discount coupons with:
  - A unique code.
  - Discount type: percentage (`%`) or fixed amount.
  - Usage limit (max number of redemptions).
  - Expiry date.
- Students shall be able to apply a coupon code at checkout for validation.

---

### 4.4 Payments & Purchases

#### FR-PAY-01: Stripe Checkout
- The system shall create a Stripe Checkout Session when a student initiates a purchase.
- The checkout session shall include course price, currency, applied coupon discount, and metadata.

#### FR-PAY-02: Webhook Handling
- The server shall expose a Stripe webhook endpoint to receive payment events.
- On `checkout.session.completed`, the system shall:
  - Create a `Purchase` record.
  - Enroll the student in the course.
  - Generate an invoice number and PDF invoice.

#### FR-PAY-03: Purchase History
- Students shall be able to view all past purchases with status and amount.

#### FR-PAY-04: Invoice
- Each successful purchase shall generate a unique invoice.
- Invoices shall be viewable in the browser and downloadable as PDF files.
- Invoices shall be accessible via a public URL (no authentication required for download).

#### FR-PAY-05: Instructor Earnings
- Instructors shall be able to view their total earnings and per-course sales data.
- Admins shall be able to create payout records for instructors.
- Instructors shall be able to configure payment details (bank account, UPI, PayPal).

---

### 4.5 Quizzes

#### FR-QUIZ-01: Quiz Creation
- Instructors shall be able to create quizzes linked to a course.
- Each quiz shall support:
  - Title and description.
  - Multiple-choice questions with correct answer and optional explanation.
  - Passing score (percentage threshold).
  - Time limit (in minutes).
  - Maximum number of attempts.

#### FR-QUIZ-02: AI Quiz Generation
- Instructors shall be able to auto-generate quiz questions from course content using the configured AI provider.

#### FR-QUIZ-03: Taking a Quiz
- Students shall be able to start a timed quiz attempt.
- Answers shall be submitted at the end, and the system shall compute a score.
- Attempt records shall track submitted answers, score, and pass/fail status.

#### FR-QUIZ-04: Quiz Analytics
- Instructors shall be able to view quiz performance statistics across all student attempts.

---

### 4.6 AI Features

#### FR-AI-01: Instructor AI Configuration
- Instructors shall be able to configure an AI provider (OpenAI, Google Gemini, or Anthropic Claude) with an API key.
- API keys shall be encrypted using AES-256 before being stored in the database.
- Instructors shall be able to test their AI connection before saving.
- Instructors shall be able to delete their AI configuration.

#### FR-AI-02: Student AI Configuration
- Students shall be able to configure their own AI provider independently.
- The same encryption and test mechanisms apply.

#### FR-AI-03: AI Chat (Student)
- Students shall be able to open AI chat conversations from any course page.
- Each conversation shall have:
  - A message history with `user` and `assistant` roles.
  - An auto-generated title from the first message (inline editable).
  - A source selector: use own key or instructor's shared key (if available).
- Conversations using the instructor's key shall display an amber warning banner.
- Students shall not be able to delete conversations that used the instructor's key.

#### FR-AI-04: Instructor AI Key Sharing
- Instructors shall be able to toggle `allowStudentAI` per course to share their AI key with enrolled students.
- Instructors shall be able to block individual students from using their shared key per course.
- Instructors shall be able to view all AI conversations that used their key (read-only drawer per student).

#### FR-AI-05: AI Notes Generation
- Instructors shall be able to generate AI study notes for a course/lecture using their configured AI provider.

#### FR-AI-06: Course AI Status Check
- Students shall be able to query the AI status for a course: whether their own key is configured, whether the instructor's key is available, and whether they are blocked.

---

### 4.7 Broadcast / Announcements

#### FR-BROAD-01: Create Broadcast
- Instructors (and permitted co-instructors or students if `allowStudentBroadcasts` is enabled) shall be able to post course announcements.
- Each broadcast shall have a priority level: `Normal`, `Important`, or `Urgent`.
- URLs in broadcast content shall be rendered as clickable hyperlinks.

#### FR-BROAD-02: Auto-Broadcast on Content Changes
- Adding a new section or lecture shall automatically generate a course broadcast containing the section name and a direct link to the new lecture.

#### FR-BROAD-03: Read Tracking
- The system shall track which broadcasts each user has read (`BroadcastView`).
- An unread count badge shall be displayed to students.
- Students shall be able to mark all broadcasts as read.

#### FR-BROAD-04: Broadcast Management
- Broadcast owners shall be able to edit and delete their announcements.

---

### 4.8 Resources

#### FR-RES-01: Resource Upload
- Instructors shall be able to upload PDF files as resources attached to a course or lecture.
- Instructors shall also be able to link external URLs as resources.
- Students with upload permission (`allowStudentUploads`) may also attach resources.

#### FR-RES-02: Inline Resource Viewer
- Uploaded PDFs shall be viewable inline within the course page without needing to download.

---

### 4.9 Reviews

#### FR-REV-01: Course Reviews
- Students who have purchased a course shall be able to submit a star rating (1–5) and a text review.
- Each student may have at most one review per course.

#### FR-REV-02: Review Management
- Students shall be able to update or delete their own reviews.

#### FR-REV-03: Helpful Votes
- Other users shall be able to mark a review as helpful; the count shall be displayed.

#### FR-REV-04: Average Rating
- The system shall automatically compute and store the course's average rating and total review count.

---

### 4.10 Notifications

#### FR-NOTIF-01: In-App Notifications
- The system shall generate notifications for configurable course events:
  - New content added.
  - New broadcast posted.
  - New quiz published.
  - Approaching due date.
  - AI access changes.
  - Progress milestone reached.

#### FR-NOTIF-02: Notifications Page
- Users shall be able to view all their notifications on a dedicated Notifications page.

---

### 4.11 Activity Logs

#### FR-ACT-01: Automatic Activity Logging
- All non-GET API actions shall be automatically logged to an `Activity` collection via middleware.
- Each log entry shall capture: user, action type, resource type, resource ID, resource name, metadata, and timestamp.

#### FR-ACT-02: Personal Activity Log
- Each user shall be able to view their own activity log on their profile page.
- Admin impersonation actions shall be hidden from personal logs.
- The log shall support multi-select action-type filtering with dismissible chips.

#### FR-ACT-03: Global Activity Log (Admin)
- Admins shall be able to view the platform-wide audit log with advanced filtering.

---

### 4.12 Admin Panel

#### FR-ADMIN-01: Dashboard
- Admins shall see platform-wide statistics (total users, courses, revenue, etc.).

#### FR-ADMIN-02: User Management
- Admins shall be able to:
  - List and search all users.
  - Issue warnings to users (with reason).
  - Remove specific warnings.
  - Set a maximum warning limit per user.
  - Block a user (with reason) — blocked users cannot log in.
  - Unblock a user.
  - Change a user's role.

#### FR-ADMIN-03: Course Moderation
- Admins shall be able to block or unblock any course on the platform.
- Blocked courses shall be inaccessible to students.

#### FR-ADMIN-04: Instructor Management
- Admins shall be able to view instructor details including their courses and earnings.
- Admins shall be able to create payout records for instructors.

#### FR-ADMIN-05: Impersonation
- Admins shall be able to generate a login token for any user account to facilitate support debugging.

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-PERF-01 | API responses for standard read operations (course listing, lecture detail) shall complete within 500ms under normal load. |
| NFR-PERF-02 | The frontend SPA shall achieve an initial load time of under 3 seconds on a broadband connection. |
| NFR-PERF-03 | The system shall support at least 100 concurrent authenticated users without degradation. |

### 5.2 Security

| ID | Requirement |
|----|-------------|
| NFR-SEC-01 | All API routes shall use HTTPS in production. |
| NFR-SEC-02 | User passwords shall be hashed using bcrypt (minimum 10 salt rounds). |
| NFR-SEC-03 | AI provider API keys shall be encrypted with AES-256 before storage. |
| NFR-SEC-04 | All protected routes shall validate JWT tokens on every request. |
| NFR-SEC-05 | Stripe webhook payloads shall be verified using the Stripe webhook signing secret. |
| NFR-SEC-06 | Authentication and course creation endpoints shall be rate-limited using `express-rate-limit`. |
| NFR-SEC-07 | Role-based access control (RBAC) shall be enforced at the middleware layer for all sensitive operations. |
| NFR-SEC-08 | No raw payment card data shall be stored or processed by the application server. |
| NFR-SEC-09 | Course and broadcast ownership shall be verified via dedicated ownership middleware before modification. |

### 5.3 Reliability & Availability

| ID | Requirement |
|----|-------------|
| NFR-REL-01 | The system shall have a target uptime of 99.5% (excluding scheduled maintenance). |
| NFR-REL-02 | Database connections shall be managed via Mongoose connection pooling. |
| NFR-REL-03 | All unhandled errors shall be caught by the global error handler middleware and return a structured JSON error response. |
| NFR-REL-04 | Stripe payment events shall be handled idempotently to prevent duplicate enrollments. |

### 5.4 Usability

| ID | Requirement |
|----|-------------|
| NFR-USE-01 | The UI shall support both light and dark modes (via `ThemeContext`). |
| NFR-USE-02 | The application shall be responsive and usable on screen widths from 375px (mobile) to 2560px (desktop). |
| NFR-USE-03 | The course management page shall support a switchable vertical sidebar or horizontal tab layout. |
| NFR-USE-04 | All user-facing errors shall be displayed via toast notifications (React Hot Toast). |
| NFR-USE-05 | The application shall provide a dedicated 404 Not Found page for unrecognized routes. |

### 5.5 Maintainability

| ID | Requirement |
|----|-------------|
| NFR-MAINT-01 | The frontend and backend shall be maintained as separate packages in a monorepo structure. |
| NFR-MAINT-02 | Business logic shall be encapsulated in controller files; routes shall only define paths and middleware chains. |
| NFR-MAINT-03 | Environment-specific configuration shall be managed via `.env` files (never committed to version control). |
| NFR-MAINT-04 | The AI service layer shall be abstracted so that switching AI providers requires no changes to controllers. |

### 5.6 Scalability

| ID | Requirement |
|----|-------------|
| NFR-SCALE-01 | The stateless JWT-based API design shall allow horizontal scaling of the backend with no session affinity requirements. |
| NFR-SCALE-02 | MongoDB Atlas shall serve as the managed database, providing automatic scaling and replication. |

---

## 6. System Architecture

### 6.1 Frontend Architecture

```
client/src/
├── api/
│   └── axios.js              # Axios instance with base URL and JWT interceptors
├── context/
│   ├── AuthContext.jsx        # Global auth state, JWT caching, login/logout
│   └── ThemeContext.jsx       # Dark/light mode toggle
├── components/               # Reusable UI and feature components
│   ├── broadcast/
│   ├── chat/
│   ├── course/
│   ├── layout/ (Navbar, Footer)
│   ├── review/
│   └── ui/ (CourseCard, Modal, Pagination, etc.)
├── pages/                    # Route-level page components
│   ├── admin/
│   ├── auth/
│   ├── course/
│   ├── instructor/
│   ├── marketplace/
│   ├── quiz/
│   └── student/
├── utils/
│   └── activityUtils.jsx      # Action icons, badge colors, resource labels
├── config/
│   └── redirect.js            # Route redirect helpers
├── App.jsx                    # React Router route definitions
└── main.jsx                   # Application entry point
```

### 6.2 Backend Architecture

```
server/
├── config/
│   ├── db.js                  # MongoDB connection setup
│   └── stripe.js              # Stripe client initialization
├── middleware/
│   ├── authMiddleware.js       # JWT guard, admin guard, instructorOnly guard
│   ├── ownershipMiddleware.js  # Course/lecture/broadcast ownership verification
│   ├── rateLimiter.js          # Auth and course creation rate limiters
│   ├── activityLogger.js       # Auto-log all non-GET requests
│   └── errorMiddleware.js      # Global error handler
├── models/                    # Mongoose schema definitions (19 models)
├── controllers/               # Business logic handlers (16 controllers)
├── routes/                    # Express route definitions (15 route files)
├── services/
│   ├── aiService.js            # AI provider abstraction layer
│   └── invoiceService.js       # PDF invoice generation
├── utils/
│   └── encryption.js           # AES-256 encryption for AI keys
└── index.js                    # Express server entry point
```

### 6.3 Data Flow — Course Purchase

```
Student → Checkout Request → Server: Create Stripe Session
    → Redirect to Stripe Hosted Checkout Page
    → Student completes payment
    → Stripe sends webhook POST to /api/purchase/webhook
    → Server verifies signature → Creates Purchase + Enrolls Student + Generates Invoice
    → Student redirected to /checkout-success
```

---

## 7. Database Models

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| `User` | `name`, `email`, `password`, `googleId`, `role`, `isBlocked`, `warnings[]`, `maxWarnings` | User accounts with roles, block/warning state |
| `Course` | `title`, `description`, `status`, `user` (owner), `sections[]`, `allowStudentAI`, `aiBlockedStudents[]`, `isMarketplace`, `price`, `currency`, `rating`, `isAdminBlocked` | Core course entity with content structure and marketplace fields |
| `Lecture` | `title`, `description`, `videoUrl`, `resourceUrl`, `dueDate`, `isPublic`, `sectionNumber` | Individual lesson units |
| `Progress` | `user`, `course`, `lecture`, `status`, `notes`, `markedForRevision`, `completedAt` | Per-student, per-lecture learning state |
| `Quiz` | `course`, `title`, `questions[]`, `passingScore`, `timeLimit`, `maxAttempts` | Assessment definitions |
| `QuizAttempt` | `quiz`, `user`, `answers[]`, `score`, `passed`, `submittedAt` | Student quiz submission records |
| `Purchase` | `user`, `course`, `amount`, `currency`, `stripeSessionId`, `couponApplied`, `invoiceNumber` | Payment and enrollment records |
| `Coupon` | `code`, `courseId`, `discountType`, `discountValue`, `maxUses`, `usedCount`, `expiresAt` | Discount code definitions |
| `Review` | `user`, `course`, `rating`, `comment`, `helpfulCount`, `helpfulBy[]` | Student course ratings and comments |
| `Broadcast` | `course`, `user`, `title`, `content`, `priority`, `isActive` | Course announcements |
| `BroadcastView` | `user`, `broadcast` | Per-user read tracking for announcements |
| `Conversation` | `user`, `course`, `title`, `messages[]`, `useInstructorKey`, `titleEdited` | AI chat session history |
| `CourseTeacher` | `course`, `user`, `permissions{}` | Co-instructor assignments and permissions |
| `BankDetail` | `instructor`, `bankAccount`, `upiId`, `paypalEmail` | Instructor payment information |
| `Payout` | `instructor`, `amount`, `status`, `processedAt` | Instructor payout records |
| `TeacherAIConfig` | `user`, `provider`, `encryptedApiKey` | Encrypted AI provider keys per user |
| `Activity` | `user`, `action`, `resourceType`, `resourceId`, `resourceName`, `metadata`, `createdAt` | Platform-wide audit log |
| `Notification` | `user`, `type`, `message`, `read`, `courseId` | In-app notification records |
| `Resource` | `course`, `lecture`, `uploader`, `type`, `url`, `filename` | Course/lecture resource attachments |

---

## 8. API Specification Summary

All API routes are prefixed with `/api`. Authentication is provided via `Authorization: Bearer <JWT>` unless marked Public.

### 8.1 Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public (rate limited) | Register a new user |
| POST | `/login` | Public (rate limited) | Login and receive JWT |
| GET | `/me` | Protected | Get current user's profile |
| PUT | `/updatepassword` | Protected | Change user password |
| GET | `/google` | Public | Initiate Google OAuth flow |
| GET | `/google/callback` | Public | Google OAuth callback handler |

### 8.2 Courses — `/api/courses`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Protected | List all courses for the authenticated user |
| POST | `/` | Protected (rate limited) | Create a new course |
| GET | `/:id` | Protected | Get single course details |
| PUT | `/:id` | Owner only | Update course metadata |
| DELETE | `/:id` | Owner only | Delete a course |
| GET | `/my/enrolled` | Protected | Get enrolled courses with progress |
| GET | `/my/created` | Protected | Get courses created/taught by user |
| POST | `/:id/sections` | Content permission | Add a section |
| PUT | `/:id/sections/:sectionId` | Content permission | Update a section |
| DELETE | `/:id/sections/:sectionId` | Content permission | Delete a section |
| POST | `/:id/sections/:sectionId/lectures` | Content permission | Add a lecture |
| PUT | `/lectures/:id` | Lecture owner | Update lecture |
| DELETE | `/lectures/:id` | Lecture owner | Delete lecture |
| PUT | `/lectures/:id/progress` | Protected | Update student progress/notes |
| POST | `/lectures/:id/comments` | Protected | Add a lecture comment |
| GET | `/lectures/:id/comments` | Protected | Get lecture comments |
| POST | `/:id/enroll` | Student management permission | Enroll a student |
| DELETE | `/:id/enroll/:studentId` | Student management permission | Remove a student |
| PUT | `/:id/toggle-student-ai` | Owner only | Toggle student AI access |
| PUT | `/:id/ai-block/:studentId` | Owner only | Block/unblock student AI access |
| GET | `/:courseId/teachers` | Course access | List co-teachers |
| POST | `/:courseId/teachers` | Teacher management permission | Add a co-teacher |
| PUT | `/:courseId/teachers/:teacherId` | Teacher management permission | Update co-teacher permissions |
| DELETE | `/:courseId/teachers/:teacherId` | Teacher management permission | Remove a co-teacher |
| GET | `/:id/analytics` | Course access | View course analytics |

### 8.3 Marketplace — `/api/marketplace`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Browse marketplace courses |
| GET | `/search` | Public | Search courses |
| GET | `/categories` | Public | List all categories |
| GET | `/:id` | Public | Course landing page details |

### 8.4 Purchases — `/api/purchase`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/checkout` | Protected | Create Stripe checkout session |
| POST | `/webhook` | Stripe signature | Handle Stripe events |
| GET | `/my-purchases` | Protected | Get purchase history |
| GET | `/verify/:courseId` | Protected | Verify course purchase status |
| GET | `/invoice/:invoiceNumber` | Public | View invoice |
| GET | `/invoice/:invoiceNumber/pdf` | Public | Download invoice PDF |

### 8.5 Quizzes — `/api/quizzes`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Protected | Create a quiz |
| GET | `/course/:courseId` | Protected | Get all quizzes for a course |
| GET | `/:id` | Protected | Get quiz details |
| PUT | `/:id` | Protected | Update a quiz |
| DELETE | `/:id` | Protected | Delete a quiz |
| POST | `/:id/start` | Protected | Start a quiz attempt |
| POST | `/:id/submit` | Protected | Submit quiz answers |
| GET | `/:id/my-attempts` | Protected | View own quiz attempts |
| GET | `/:id/analytics` | Protected | Quiz analytics |

### 8.6 AI — Instructor `/api/ai` and Student `/api/student-ai`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/config` | Instructor/Student | Get AI config |
| POST | `/config` | Instructor/Student | Save AI provider and API key |
| DELETE | `/config` | Instructor/Student | Remove AI config |
| POST | `/test` | Instructor/Student | Test AI connection |
| POST | `/generate-quiz` | Instructor only | Auto-generate quiz questions |
| POST | `/generate-notes` | Instructor only | Auto-generate study notes |
| GET | `/conversations` | Student | List all AI conversations |
| POST | `/conversations` | Student | Start a new conversation |
| POST | `/conversations/:id/messages` | Student | Send a message |
| PUT | `/conversations/:id/title` | Student | Rename a conversation |
| DELETE | `/conversations/:id` | Student | Delete a conversation |
| GET | `/course/:courseId/ai-status` | Student | Check course AI status |
| GET | `/course/:courseId/student-conversations` | Instructor | View student AI conversations |

### 8.7 Admin — `/api/admin`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/dashboard` | Admin | Platform-wide statistics |
| GET | `/users` | Admin | List all users |
| POST | `/users/:id/warn` | Admin | Issue a warning |
| POST | `/users/:id/block` | Admin | Block a user |
| POST | `/users/:id/unblock` | Admin | Unblock a user |
| POST | `/users/:id/role` | Admin | Change user role |
| POST | `/courses/:id/block` | Admin | Block a course |
| POST | `/courses/:id/unblock` | Admin | Unblock a course |
| GET | `/instructors` | Admin | List all instructors |
| POST | `/payouts` | Admin | Create a payout |
| POST | `/impersonate/:userId` | Admin | Log in as a user |

### 8.8 Reviews — `/api/reviews`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/course/:courseId` | Public | Get all reviews for a course |
| POST | `/` | Protected | Create a review |
| GET | `/my/:courseId` | Protected | Get your review for a course |
| PUT | `/:id` | Protected | Update your review |
| DELETE | `/:id` | Protected | Delete your review |
| POST | `/:id/helpful` | Protected | Mark review as helpful |

### 8.9 Broadcasts — `/api/broadcasts`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/course/:courseId/active` | Protected | Get active announcements |
| GET | `/course/:courseId/unread-count` | Protected | Get unread count |
| POST | `/course/:courseId/mark-read` | Protected | Mark all as read |
| POST | `/course/:courseId` | Broadcast permission | Create announcement |
| PUT | `/:id` | Broadcast owner | Update announcement |
| DELETE | `/:id` | Broadcast owner | Delete announcement |

---

## 9. External Interfaces & Integrations

### 9.1 Stripe (Payments)

- **Purpose**: Checkout sessions, payment processing, webhook events, invoice data.
- **Integration**: `stripe` npm package; webhook signature verified with `STRIPE_WEBHOOK_SECRET`.
- **Key Events**: `checkout.session.completed`.
- **Configuration**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

### 9.2 Google OAuth 2.0

- **Purpose**: Social login via Google accounts.
- **Flow**: Server-side authorization code exchange (not implicit flow).
- **Library**: `google-auth-library`.
- **Configuration**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### 9.3 AI Providers

| Provider | Configuration |
|----------|---------------|
| OpenAI | API key (encrypted at rest) |
| Google Gemini | API key (encrypted at rest) |
| Anthropic Claude | API key (encrypted at rest) |

- The `aiService.js` abstracts provider differences so controllers call a unified interface.
- Keys are encrypted with AES-256 (`AI_ENCRYPTION_KEY`) before storage.

### 9.4 File Upload (Multer)

- **Purpose**: Handling PDF and image uploads for resources and course thumbnails.
- **Library**: `multer`.
- **Storage**: In-memory (files processed as buffers, then stored as URLs or Base64).

### 9.5 PDF Generation (PDFKit)

- **Purpose**: Generating downloadable PDF invoices after course purchase.
- **Library**: `pdfkit`.

### 9.6 Email (Future Integration)

- No email service is currently integrated. Notification delivery is in-app only.

---

## 10. Constraints & Assumptions

### 10.1 Constraints

1. **Payment Currency**: The system supports INR and USD only.
2. **AI Provider**: At least one of OpenAI, Gemini, or Anthropic must be configured by the instructor for AI features to work.
3. **Video Hosting**: The system does not host video files. Lecture videos must be hosted externally (e.g., YouTube, Vimeo) and referenced by URL.
4. **File Uploads**: Uploaded files (PDFs, thumbnails) are subject to Multer memory limits; very large files are not supported.
5. **Google OAuth**: Requires a Google Cloud project with OAuth credentials and the client URL whitelisted as an authorized redirect URI.
6. **Stripe**: A Stripe account and active webhook configuration is required for marketplace purchases to function.

### 10.2 Assumptions

1. All users have reliable internet access to use the web application.
2. Instructors are responsible for the accuracy and legality of course content they publish.
3. The MongoDB Atlas cluster is sized appropriately for the expected data volume.
4. Render deployment is used as the primary hosting platform; environment variables are managed there.
5. Only one admin account is assumed to be pre-created (role: `admin`); there is no admin self-registration flow.

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **SPA** | Single-Page Application — a web app that dynamically rewrites the current page rather than loading new pages from the server. |
| **JWT** | JSON Web Token — a compact, URL-safe means of representing claims between two parties, used for authentication. |
| **LMS** | Learning Management System — software for the administration, documentation, tracking, reporting, and delivery of educational courses. |
| **Broadcast** | A course-level announcement or notification posted by an instructor or permitted student. |
| **CourseTeacher** | A co-instructor assigned to a course by the course owner, with configurable granular permissions. |
| **Lecture Status** | A customizable label (e.g., "Not Started", "In Progress", "Completed") assigned to a student's progress on a specific lecture. |
| **Marketplace Course** | A course listed publicly for sale on the platform, as opposed to a private course accessible only via direct enrollment. |
| **Impersonation** | An admin action that generates a temporary authentication token for another user account, allowing the admin to view the platform as that user. |
| **Payout** | A record of an earnings transfer from the platform to an instructor's configured payment method. |
| **AES-256** | Advanced Encryption Standard with a 256-bit key — used to encrypt sensitive data (AI API keys) at rest. |
| **RBAC** | Role-Based Access Control — a security approach restricting system access based on user roles. |
| **Webhook** | An HTTP callback triggered by an external service (Stripe) to notify the application of an event (payment completed). |
| **Rate Limiting** | A technique to limit the number of API requests a client can make in a given time window, preventing abuse. |
| **bcrypt** | A password hashing function designed to be computationally expensive to resist brute-force attacks. |
| **Mongoose** | An Object Data Modeling (ODM) library for MongoDB and Node.js. |
| **Vite** | A fast frontend build tool and development server for modern JavaScript frameworks. |
| **Co-Instructor** | See CourseTeacher. |
| **AI Key Sharing** | A per-course feature allowing an instructor to share their AI provider API key with enrolled students. |

---

*Document prepared for the Tenz Learn — Online Learning Management System project.*  
*This SRS covers version 1.0 of the platform as of 2026-08-28.*
