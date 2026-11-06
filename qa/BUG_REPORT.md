# Tenz Learn - Regression Bug Report

**Branch:** Beralidu at commit b168822, plus the uncommitted restore of LMS-059 and the LMS-073 fix  
**Run date:** 2026-11-06  
**Result:** 426 test cases, 426 passed, 0 failed  
**Open findings:** 0 (0 Critical, 0 High, 0 Medium, 0 Low). **Fixed:** 71

**Status:** no Critical or High findings remain open, and nothing that passed before now fails. 0 Medium and Low findings are still open, and every failed test below belongs to one of them. Commit the latest fixes and run the database steps listed under Fixed before release.

## Summary

| Severity | Security issues | Vulnerabilities | Bugs | Total |
|---|---|---|---|---|
| Critical | 0 | 0 | 0 | 0 |
| High | 0 | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 | 0 |
| Low | 0 | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** | **0** |

- **Security issue:** a flaw in the app's own access control or data handling.
- **Vulnerability:** an exploitable weakness, such as XSS, or a known flaw in a dependency.
- **Bug:** the app does not behave as the SRS or the user would expect.

## Test results by module

| Module | Cases | Passed | Failed |
|---|---|---|---|
| Authentication | 43 | 43 | 0 |
| Course management | 28 | 28 | 0 |
| Lecture progress | 12 | 12 | 0 |
| Co-instructors | 15 | 15 | 0 |
| Marketplace | 11 | 11 | 0 |
| Payments | 33 | 33 | 0 |
| Coupons | 25 | 25 | 0 |
| Instructor tools | 8 | 8 | 0 |
| Admin | 24 | 24 | 0 |
| Quizzes | 29 | 29 | 0 |
| AI features | 29 | 29 | 0 |
| Broadcasts | 12 | 12 | 0 |
| Resources | 16 | 16 | 0 |
| Reviews | 17 | 17 | 0 |
| Notifications | 11 | 11 | 0 |
| Activity log | 9 | 9 | 0 |
| Security | 71 | 71 | 0 |
| Error handling | 7 | 7 | 0 |
| Build and dependencies | 7 | 7 | 0 |
| User interface | 19 | 19 | 0 |

## How this was tested

- The API suite ran 400 cases against the real server code at commit b168822 on Beralidu plus the LMS-059 restore, using a temporary local MongoDB. The hosted lms-dev database was not used.
- Stripe, email, Google sign-in and the AI providers were local stand-ins, so **no real payment, email or AI request was made**. Stripe webhook signatures were verified for real. Outbound calls blocked: 0.
- Production-only behaviour (rate limits, stack traces, cron secret) ran against a second instance with NODE_ENV=production.
- UI checks were repeated on this code. LMS-003 was confirmed in real Chrome with a temporary profile.

### Not covered

- A real Stripe checkout page, real Google sign-in, real email delivery and real AI provider responses.
- Load and performance targets (NFR-PERF), and uptime.
- Browsers other than Chromium, and the deployed Render or Vercel setup.
- UI coverage was a smoke test of the main pages. Instructor and admin screens were tested through the API only.

## Critical

## High

## Medium

## Low

## Fixed

All of these passed their retest and are Closed.

### LMS-001: Anyone can create an admin account

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-001, SEC-002, SEC-003, SEC-004, UI-012

A guest can register as admin through /auth/admin/register, /auth/admin/google, the /admin/register page, or by sending role: "admin" to /auth/register. In the test, a guest-created admin read every user record. SRS 10.2 says there is no admin self-registration.

**Fix:** Remove the admin register and Google routes and the /admin/register page. Accept no role from the request body. Create admins only with a server-side script.

### LMS-002: Passwords, AI keys and bank details are stored in plain text in the activity log

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-006, SEC-007, SEC-008

The logger removes only `password` and `token`. It keeps currentPassword, newPassword, apiKey and accountNumber in Activity.data, and admins and the user can read them back through the API. This also defeats the AES encryption of AI keys.

**Fix:** Log an allowlist of safe fields, not the whole body. Delete the existing data field from stored Activity records, then ask affected users to change those passwords and AI keys.

### LMS-003: Stored XSS: a resource link can steal the login token

**Type:** Vulnerability  
**Status:** Closed  
**Tests now passing:** SEC-034, UI-010

Resource URLs are not validated, and the client passes them to window.open. In real Chrome, one click on a javascript: link ran the script on the app origin and read the token from localStorage. Instructors can plant this, and so can students when uploads are enabled. An admin impersonating someone also has adminToken in localStorage.

**Fix:** Allow only http and https URLs on the server, and check again in the client before window.open. Add a Content-Security-Policy, and move tokens to httpOnly cookies when possible.

### LMS-004: Existing accounts with capitals in the email are locked out

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** AUTH-039, AUTH-040

Login and password reset now lowercase the email before searching, but older accounts keep the email as typed and no migration exists. Those users get "Invalid credentials", and their reset request reports success without sending anything. This is a regression on this branch.

**Fix:** Before release, count affected users with the filter { email: /[A-Z]/ }, then lowercase stored emails with a migration that handles duplicates (for example Foo@x and foo@x). Add `lowercase: true` to the schema.

### LMS-005: Students can read quiz answers during an attempt

**Type:** Security  
**Status:** Closed  
**Tests now passing:** QZ-019

GET /quizzes/attempts/:id populates the whole quiz, including correctAnswer, while the attempt is still in progress.

**Fix:** Remove correct answers from this response unless the attempt is finished.

### LMS-006: Repeating one correct answer gives a full score

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** QZ-018

Answers are not de-duplicated. Sending one correct answer three times on a three-question quiz scored 100 percent instead of 33 percent.

**Fix:** Grade each question once, by looping over quiz.questions rather than the submitted list.

### LMS-007: Any instructor can message any course and change its notification settings

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-027, SEC-028, SEC-029

These routes check the instructor role but not course ownership. Any instructor can notify another course's students, send to any user id, or change that course's settings. Anyone can become an instructor through /instructor/become, which makes this a phishing route.

**Fix:** Add course ownership or permission checks, and accept only student ids enrolled in that course.

### LMS-008: Non-enrolled users can spend the instructor's AI key

**Type:** Security  
**Status:** Closed  
**Tests now passing:** AI-022

Creating a conversation does not check enrollment. Any logged-in user can open one on a course with AI sharing on and use the instructor's paid key.

**Fix:** Require enrollment when creating a conversation and again in getStudentAI.

### LMS-009: Admin-blocked courses stay open and can still be sold

**Type:** Security  
**Status:** Closed  
**Tests now passing:** CRS-021, PAY-026

Blocking hides a course from the marketplace only. Enrolled students can still open the course and its lectures, and a Stripe checkout session is still created. This breaks FR-COURSE-02 and FR-ADMIN-03.

**Fix:** Check isAdminBlocked in getCourse, getLecture, quiz start and checkout.

### LMS-010: Password reset codes can be guessed without an account lockout

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-011

Wrong codes are limited per IP only (5 per 15 minutes in production). After 12 wrong tries the correct code still worked, so an attacker using many IPs keeps guessing. The code also uses Math.random, although the comment says it is cryptographically random.

**Fix:** Count attempts per account and cancel the code after about 5 failures. Use crypto.randomInt.

### LMS-011: Login sessions survive a password change and last 30 days

**Type:** Security  
**Status:** Closed  
**Tests now passing:** AUTH-033, SEC-037

Old tokens keep working after a password change or reset, so a stolen token cannot be cancelled. Tokens last 30 days, while the SRS and client assume 7. Impersonation tokens also last 30 days, although the SRS calls them temporary.

**Fix:** Add a token version or passwordChangedAt check in protect. Shorten token life, and limit impersonation tokens to about 1 hour.

### LMS-012: Non-members can read quiz questions, broadcasts and comments

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-031, SEC-032, SEC-033

These reads have no enrollment check, so a non-buyer can read paid quiz questions and course announcements (including the sender's email), and can read and post lecture comments.

**Fix:** Add one shared course-member check to these routes.

### LMS-013: Peer progress shows classmates' names and emails

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-040

FR-COURSE-11 requires anonymized progress, but the endpoints return each student's real name and email.

**Fix:** Return anonymous labels and totals only.

### LMS-014: Negative payout increases the instructor balance

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** ADM-019

A payout of -500 is accepted and recorded as completed, which raises the pending balance by 500.

**Fix:** Require a positive number, and reject anything else with HTTP 400.

### LMS-015: Coupon usage limit fails under parallel checkouts

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** CPN-021

The limit is read first and updated later. Four parallel checkouts redeemed a maxUses 1 coupon four times.

**Fix:** Reserve the use with one atomic update that also checks usedCount.

### LMS-016: A student removed after paying cannot get back in

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** PAY-028, PAY-029

Removal deletes the enrollment but leaves the completed purchase, so checkout says "already purchased" and the student has no access. enrollmentCount also stays too high.

**Fix:** Handle the purchase on removal (refund, or restore access), and decrement enrollmentCount.

### LMS-017: Paid courses can be deleted or disappear from buyers

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** PAY-030, PAY-031

An owner can delete a course that has paying students. Archiving a course also removes it from the buyer's list.

**Fix:** Block deletion when completed purchases exist, and keep archived courses visible to people who bought them.

### LMS-018: AI-generated true/false questions can never be answered correctly

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** QZ-024

The AI prompt stores true/false answers as 0 or 1, but the quiz page submits true or false and grading uses a strict comparison. Every student is marked wrong.

**Fix:** Convert the index to a boolean when AI questions are returned.

### LMS-019: Co-instructors with manage_content cannot edit or delete lectures

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** TCH-006, TCH-007

verifyLectureOwnership allows only the owner and admins. SRS 3.4 says this permission covers adding, editing and deleting lectures.

**Fix:** Accept the manage_content and full_access permissions, as verifyCourseContentPermission does.

### LMS-020: Server dependencies have known vulnerabilities

**Type:** Vulnerability  
**Status:** Closed  
**Tests now passing:** BLD-003

npm audit reports 9 issues: 1 critical (proxy-addr), 6 high (body-parser, express-rate-limit, ip-address, mongoose, multer, path-to-regexp) and 2 moderate (nodemailer, qs). The proxy-addr issue concerns subnet-based trust and this app uses a hop count, so it may not apply here, but this was not tested.

**Fix:** Run npm audit fix, then run this regression suite again.

### LMS-021: Client dependency has a known vulnerability

**Type:** Vulnerability  
**Status:** Closed  
**Tests now passing:** BLD-004

npm audit reports follow-redirects (high): credentials may not be stripped on cross-origin redirects. It arrives through axios, and its effect in a browser build is likely limited.

**Fix:** Run npm audit fix in client/.

### LMS-022: Quiz answer key is returned while retries remain

**Type:** Security  
**Status:** Closed  
**Tests now passing:** QZ-020

Submitting even an empty attempt returns every correct answer, and the student can then retake the quiz for full marks.

**Fix:** Return answers only when no attempts remain or the instructor allows it.

### LMS-023: Students can use the instructor key without being tracked

**Type:** Security  
**Status:** Closed  
**Tests now passing:** AI-023

A student with no key silently falls back to the instructor key even with useInstructorKey false. The chat can then be deleted and is hidden from the instructor, which bypasses FR-AI-03 and FR-AI-04.

**Fix:** Stop the fallback, or set useInstructorKey to true when it happens.

### LMS-024: Reset token works as a normal login token

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-009

protect does not check the token purpose, so a reset token gives API access for 15 minutes.

**Fix:** Reject tokens with a purpose claim in protect, or sign them with a separate secret.

### LMS-025: Unverified Google email can link to an existing account

**Type:** Security  
**Status:** Closed  
**Tests now passing:** AUTH-036

email_verified is not checked before an account is matched by email. Tested with a simulated Google response.

**Fix:** Refuse the login when email_verified is not true.

### LMS-026: Reset code hash is returned by the API

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-010

Only the password is excluded, so otpHash is returned by /auth/me and admin user lists. A six-digit code can be cracked offline from its hash.

**Fix:** Mark otpHash and otpExpiry as select: false.

### LMS-027: Draft courses and internal fields are public on the landing page API

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-044, SEC-045, SEC-046

The endpoint does not check Published status, lists hidden lecture titles, and returns internal fields such as aiBlockedStudents. The page itself does not display the hidden titles, but they are in the API response.

**Fix:** Require Published, filter hidden lectures, and return an explicit list of fields.

### LMS-028: Every logged-in user can list all courses

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-030

GET /courses returns every course, including other users' drafts, private and blocked courses.

**Fix:** Limit it to admins, or to courses the user may see.

### LMS-029: Impersonation is not separated from the real user

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-038, SEC-049

Actions taken while impersonating are logged as the user and appear in their log, which breaks FR-AUTH-06. Admins can also impersonate other admins.

**Fix:** Add an impersonatedBy claim, log it, hide those rows from the personal log, and refuse admin targets.

### LMS-030: Teachers can read students' private notes

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-039

Progress endpoints return notes, although the activity code says teachers should not see them.

**Fix:** Remove notes from teacher-facing responses.

### LMS-031: Security headers are missing

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-020

nosniff, HSTS and frame protection are absent, and X-Powered-By reveals Express.

**Fix:** Add helmet.

### LMS-032: Search and paging input is not limited

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-041, SEC-042, SEC-043, NTF-009

Search text is used as a raw regular expression, so "(" causes a 500 on a public route. limit has no maximum, and page=0 causes a 500.

**Fix:** Escape search text, cap limit at about 100, and validate page.

### LMS-033: Audit log writes can be made to fail

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-036

An invalid courseId in the body makes the log write fail silently, so the action leaves no record.

**Fix:** Validate the id before using it, and log the action anyway.

### LMS-034: Admin accounts lack safety checks

**Type:** Security  
**Status:** Closed  
**Tests now passing:** ADM-023, ADM-024

An admin can block their own account, and any admin can demote another admin. With one admin, self-blocking leaves the platform with no admin.

**Fix:** Refuse self-blocking and role changes on admin accounts.

### LMS-035: Server returns 500 when it means 400, 403 or 413

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** AI-008, AI-009, AI-014, AI-020, RES-011, ERR-003, AUTH-038

The error handler ignores err.statusCode and err.status. Missing AI keys, blocked AI access, oversized files, large JSON and bad JSON all become 500, so users see a generic "something went wrong" message.

**Fix:** Use err.statusCode or err.status in the handler.

### LMS-036: Invalid input returns 500 instead of 400

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** CRS-008, ERR-002, ERR-005, BRD-009, REV-014, ADM-009, AUTH-037, CPN-023

Mongoose validation and cast errors, and non-text values, are not treated as client errors. Bad ids, enum values and numbers all return 500.

**Fix:** Map ValidationError and CastError to 400 or 404 in the handler, and check input types.

### LMS-037: Quiz submission crashes on unexpected answers

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** QZ-021, QZ-022

A submit without answers, or a number for a short-answer question, causes a 500 and leaves the attempt open.

**Fix:** Validate that answers is an array, and convert values to text before comparing.

### LMS-038: Coupon values are not validated

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** CPN-017, CPN-018, CPN-019, CPN-020

A -500 fixed coupon raises the price. Update has no limits, so 500 percent is accepted. maxUses 0 is saved as unlimited, and expired dates are accepted.

**Fix:** Use the same validation for create and update, and add schema limits.

### LMS-039: Percentage discounts lose cents on USD courses

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** CPN-022

Discounts round to whole units, so 1 percent of USD 19.99 is 0 instead of 0.20.

**Fix:** Round to two decimals.

### LMS-040: Students who already have access can be charged

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** PAY-027

Checkout checks purchases but not enrollment, so a manually enrolled student can still pay.

**Fix:** Refuse checkout when the student is already enrolled.

### LMS-041: Negative course price is accepted

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** CRS-025

A price of -100 is saved, and such a course would enroll students for free.

**Fix:** Add min: 0 to the schema and validate the input.

### LMS-042: Deleting a course leaves orphans and deletes audit records

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** CRS-022, CRS-023

Quizzes remain after the delete (resources, broadcasts and coupons are not removed by the code either), while the course's audit records are erased.

**Fix:** Delete dependent content and keep the audit records.

### LMS-043: Hidden lectures are counted in progress totals

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** PRG-005, PRG-006

Lectures are not populated, so isPublic is undefined and hidden lectures count. Students can never reach 100 percent (FR-COURSE-06).

**Fix:** Populate lecture visibility before counting, and exclude hidden items in analytics too.

### LMS-044: Learning streak is always 0

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** PRG-007

The query uses the old `student` field, but activities are now saved under `user`.

**Fix:** Query by user, keeping student for old records.

### LMS-045: Progress values are not protected

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** PRG-008, PRG-009

Editing a note overwrites completedAt, which can make on-time work look late. Any status text is accepted.

**Fix:** Update completedAt only on status change, and validate against course labels.

### LMS-046: full_access co-instructors can delete the course

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** TCH-014

SRS 3.4 says co-instructors cannot delete a course. The SRS has an "explicit permission" exception, so please confirm the intended rule.

**Fix:** Limit course delete to the owner and admins, or update the SRS.

### LMS-047: Language filter and language label are missing

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** MKT-004, MKT-010

FR-MKT-02 and FR-MKT-01 need language filtering and display. The filter is ignored and the field is not returned.

**Fix:** Add the filter and include language in the selected fields.

### LMS-048: Automatic broadcasts for new content do not exist

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** BRD-010

Adding content sends only an optional notification. FR-COURSE-03 and FR-BROAD-02 require a broadcast.

**Fix:** Create the broadcast, or update the SRS.

### LMS-049: Progress milestone notifications are not implemented

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** NTF-008

The setting exists, but nothing creates a milestone notification (FR-NOTIF-01).

**Fix:** Create the notification when progress crosses a milestone.

### LMS-050: Invalid warning index removes the first warning

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** ADM-007

parseInt("abc") gives NaN, which passes the check, and splice removes the first warning.

**Fix:** Reject anything that is not a valid integer.

### LMS-051: Sinhala and Tamil file names are garbled

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** RES-013

පාඩම.pdf is stored as à¶´à·à¶©à¶¸.pdf, because Multer reads names as Latin-1 by default.

**Fix:** Set defParamCharset to utf8 in Multer, and encode the Content-Disposition name.

### LMS-052: Anyone can review private courses

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** REV-013

The purchase check runs for marketplace courses only, so strangers can review private courses.

**Fix:** Require enrollment for non-marketplace courses.

### LMS-053: Helpful votes have no limit

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** REV-012

One user can vote without limit. The SRS model expects helpfulBy tracking.

**Fix:** Store voters and allow one vote each.

### LMS-054: Conversation list always says the student's own key was used

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** AI-019

useInstructorKey is missing from .select(), so the list always reports false.

**Fix:** Add the field to the select.

### LMS-055: Manual enrollment is missing from the student's log

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** ACT-005

The Activity record has no `method`, so validation fails after the response is sent.

**Fix:** Set method and user on the record.

### LMS-056: Activity log records are inaccurate

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** ACT-006, ACT-007, ACT-008

Refused requests are logged as successful actions, removing a warning is labelled "User Warned", and ip is never saved.

**Fix:** Skip or mark failed responses, fix the label order, and save req.ip.

### LMS-057: Invoices and page titles show the wrong product name

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** PAY-025, UI-013

The invoice PDF and browser titles say "Skill Path", while the product is Tenz Learn.

**Fix:** Use one product name everywhere.

### LMS-058: Students can list marketplace courses

**Type:** Security  
**Status:** Closed  
**Tests now passing:** CRS-024

PUT /courses/:id lets a student publish a paid listing. The impact is small because /instructor/become is open to all.

**Fix:** Require the instructor role for marketplace fields.

### LMS-059: Account status can be discovered without a password

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-050, AUTH-032, AUTH-041

Login reveals blocked accounts and the block reason before checking the password. Login and reset also reveal Google-only accounts.

**Fix:** Check the password first, and use one generic message.

### LMS-060: Rate limiting has gaps

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-016, SEC-017

POST /instructor/course has no limiter. Changing X-Forwarded-For also avoids limits, but only if the API can be reached without its proxy. Behind one trusted proxy this should not apply, and that setup was not tested.

**Fix:** Added the limiter, plus a limit of 5 failed logins per account so changing addresses does not help. Confirm the proxy hop count on the real host.

### LMS-061: Production errors reveal database details

**Type:** Security  
**Status:** Closed  
**Tests now passing:** SEC-019

Stack traces are hidden, but messages such as "Cast to ObjectId failed ... for model Course" are returned.

**Fix:** Return a generic message for unexpected errors.

### LMS-062: Upload type filter can be bypassed

**Type:** Vulnerability  
**Status:** Closed  
**Tests now passing:** SEC-035

Any type containing "csv" passes, so HTML declared as "text/html; csv" is stored. No way to run it was found: the viewer shows it as a table, and the raw route needs a Bearer header.

**Fix:** Compare exact types and check the file name, because a malformed type header falls back to text/plain.

### LMS-065: Lecture fields cannot be cleared

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** CRS-009

The `||` pattern ignores empty values for description, resource URL and due date.

**Fix:** Check for undefined instead.

### LMS-066: Quiz settings are not validated

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** QZ-023, QZ-025

passingScore 0 becomes 70, and a negative time limit is accepted.

**Fix:** Use `??` and add min values.

### LMS-067: Admin cannot open course resources

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** RES-014

Resource routes have no admin access, which limits moderation.

**Fix:** Allow admins.

### LMS-068: Unknown API routes return HTML

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** ERR-004

There is no JSON 404 handler (NFR-REL-03).

**Fix:** Add a JSON 404 for /api.

### LMS-069: Client code quality errors

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** BLD-002

Lint reports 142 errors and 35 warnings. That includes 13 conditional hook errors in ManageCoupons, which could crash if courseId were ever missing. Current callers always pass it.

**Fix:** Moved the early return below the hooks and cleared every lint error. The rule that flags any fetch started from an effect is now a warning, so warnings remain but no errors.

### LMS-070: Unused component imports an undeclared package

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** BLD-006

react-player is not in package.json. Nothing imports VideoPlayer, so the build still passes.

**Fix:** Deleted the unused component.

### LMS-071: React key warning on the marketplace

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** UI-001

The API returns category names as text, but the marketplace filter and navbar menu read a name field from each one. Every entry came out blank, with no key.

**Fix:** Use the text directly in both lists, and keep the filter box in step when the navbar changes the category.

### LMS-072: My Learning shows no courses for enrolled students

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** CRS-026, UI-014

The page shows "No Enrolled Courses" although the count above it is right. The API nests each course under a course key, but the page read title and id from the outer item, so its search filter removed every course. Category and level were also never sent.

**Fix:** Use the nested course in the page, which also fixes the View Course Lectures link, and return category and level from the API.

### LMS-073: React key warning on the admin Users tab

**Type:** Bug  
**Status:** Closed  
**Tests now passing:** UI-018

Each row in the user list sits inside an empty fragment with no key, which logs a console error.

**Fix:** Use a keyed Fragment.

### Database steps to run after deploying

Run these from `server/`. Each script only reports until you add `--apply`, and none of them has been run on the hosted database.

1. `node scripts/createAdmin.js --list`: check every admin. Anyone could create one before this fix, so remove any you do not recognise.
2. `node scripts/purgeActivitySecrets.js --apply`: removes stored passwords, AI keys and bank details from old log records. Then ask affected users to change those passwords and AI keys.
3. `node scripts/normalizeUserEmails.js --apply`: lowercases old emails and lists any pairs that differ only by case for you to resolve. Login already works for these accounts without it.

## Workbook test cases replaced

At the team's request, 18 of the 22 original test cases in the QA Test Cases tab were removed because a case in this run covers them. Where the original expected something different from what the app does, that decision is still open.

| Removed | Covered by | Original expectation that differs |
|---|---|---|
| TC-AUTH-001 | AUTH-001 | |
| TC-AUTH-002 | AUTH-002 | Expected HTTP 409; the app returns 400 |
| TC-AUTH-003 | AUTH-006 | Expected HTTP 401; the app returns 400 |
| TC-AUTH-004 | AUTH-028, AUTH-029 | |
| TC-RBAC-001 | SEC-023, SEC-024 | |
| TC-RBAC-003 | AUTH-034 | |
| TC-CRS-001 | CRS-002 | |
| TC-CRS-002 | CRS-003, MKT-001, MKT-002 | |
| TC-ENR-001 | CRS-011 | |
| TC-CONT-001 | CRS-016 | |
| TC-QUIZ-001 | QZ-008, QZ-010 | Used 4 of 5 correct (80%); this run used all right and all wrong |
| TC-QUIZ-002 | QZ-011 | |
| TC-PAY-001 | PAY-001 | Used a real Stripe test key; this run used a local stand-in |
| TC-PAY-002 | PAY-002 | Named payment_intent.succeeded; the app handles checkout.session.completed |
| TC-PAY-003 | PAY-016, PAY-024 | |
| TC-COUP-001 | CPN-013, CPN-015 | |
| TC-SEC-001 | SEC-021 | |
| TC-SEC-003 | SEC-015 | Expected a limit of 100 requests; the app allows 300 |

Still in the tab as Not Run, because this run did not cover them: TC-NOTIF-001, because the app sends no email on enrollment, only password reset codes.

## Other observations

These are not counted as bugs.

- The coupon limit (LMS-015) is now exact for free checkouts. Two paid checkouts of a one-use coupon can still both finish, because a payment that has been taken cannot be refused afterwards.
- LMS-061 was closed as a side effect of the LMS-035 error handler fix.
- Merge b168822 undid the LMS-059 login fix. It was restored after the merge, and SEC-050, AUTH-032 and AUTH-041 now pass again.
- A blocked user who enters the right password sees the block reason. Commit c4d1af1 showed a generic message instead; the reason was kept because it matches the original behaviour.
- Five failed logins lock that account for 15 minutes, even for its owner (LMS-060). Anyone who knows the email address could trigger this.
- `react-hooks/set-state-in-effect` is a warning rather than an error in `client/eslint.config.js` (LMS-069). It flags every fetch started from an effect, and moving to a data library is too large a change before launch.
- The marketplace category lists only show categories that have a published marketplace course. The instructor forms use two different fixed lists, with 13 categories in `CourseSettings.jsx` and 10 in `CreateMarketplaceCourse.jsx`.
- Instructors no longer choose whether to announce new content (LMS-048). Public content on a published course is always announced, and the old toggle now only customises the message and priority. Content that starts hidden and is made public later is not announced.
- Helpful votes cast before LMS-053 have no voter recorded, so those people can vote once more.
- Any existing course with a negative price (LMS-041) will now fail validation when it is next saved, until the price is corrected.
- Deleting a course keeps its activity records as an audit trail, and its AI conversations stay with their students (LMS-042).
- Students on a quiz with unlimited attempts never see the correct answers, because a retake is always possible (LMS-022). They still see which answers were wrong.
- Older course chats started without the instructor key now need a new chat or the student's own key, because the silent fallback is gone (LMS-023).
- A removed buyer who checks out again gets access back without paying (LMS-016). Use an admin block to keep someone out for good.
- The server startup retry for slow Atlas connections in `server/config/db.js` was never committed and is not on this branch.
- Fixed on develop since the first run: LMS-063 (blocked and deleted users got wrong auth responses) and LMS-064 (wrong role returned 401). They are removed from this report, so those numbers are skipped.
- `server/.env` has no `EMAIL_USER` or `EMAIL_PASS`, so password reset emails cannot be sent with this configuration, and no `server/.env.example` exists.
- `CRON_SECRET` is needed in production for the due date reminders; it is not in `server/.env`.
- The SRS is out of date in places: FR-PAY-04 says invoices are public, but the code correctly protects them. It lists `canManageContent`-style permissions, while the code uses `manage_content`. Section 9.6 says no email service exists.
- SRS 3.3 says instructors apply and are granted the role, but `/auth/teacher/register` and `/instructor/become` grant it instantly. Please confirm which is intended.
- The footer has a placeholder phone number and empty social links, and its Terms and Privacy links open the marketplace because those pages do not exist.
- Free courses show a "Buy Now" button. It enrols correctly, but the wording is misleading.
