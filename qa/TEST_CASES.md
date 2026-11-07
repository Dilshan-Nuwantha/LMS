# Tenz Learn - Regression Test Cases

**Branch under test:** fix/payment-gateway  
**Requirements source:** SRS.md v1.0  
**Total cases:** 462 (Critical 57, High 228, Medium 152, Low 25)

## How to run

```bash
node qa/regression/run.js
```

Run `npm install` in `server/` first. The run starts its own local MongoDB and two API instances, and needs MongoDB Server installed (set `QA_MONGOD` if it is not in the default path). It does not use `server/.env` values for the database, Stripe, email or Google: all of them are replaced with local stand-ins. Stripe webhook signature checks stay real. `BLD` and `UI` cases are run by hand.

## Summary

| Module | Cases |
|---|---|
| Authentication | 44 |
| Course management | 28 |
| Lecture progress | 13 |
| Co-instructors | 16 |
| Marketplace | 15 |
| Payments | 40 |
| Coupons | 25 |
| Instructor tools | 8 |
| Admin | 24 |
| Quizzes | 29 |
| AI features | 29 |
| Broadcasts | 12 |
| Resources | 18 |
| Reviews | 17 |
| Notifications | 12 |
| Activity log | 9 |
| Security | 75 |
| Error handling | 8 |
| Build and dependencies | 7 |
| User interface | 33 |

## Authentication

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| AUTH-001 | High | Register a student with valid details | POST /auth/register with name, email, password | HTTP 201, role is student, a token is returned | PASS | - |
| AUTH-002 | High | Reject a duplicate email | Register twice with the same email | Second attempt returns HTTP 400 | PASS | - |
| AUTH-003 | Medium | Reject registration with missing fields | Register without a password | HTTP 400 | PASS | - |
| AUTH-004 | High | Store passwords as bcrypt hashes | Register, then read the stored user record | Stored value is a bcrypt hash with cost 10 or higher (NFR-SEC-02) | PASS | - |
| AUTH-005 | Critical | Log in with correct credentials | POST /auth/login | HTTP 200 with a token | PASS | - |
| AUTH-006 | High | Reject a wrong password | Log in with a wrong password | HTTP 400 "Invalid credentials" | PASS | - |
| AUTH-007 | High | Unknown email gets the same error as a wrong password | Log in with an unregistered email | HTTP 400 "Invalid credentials" | PASS | - |
| AUTH-008 | Medium | Role-specific login rejects the wrong role | Log a student in through /auth/instructor/login | HTTP 400 | PASS | - |
| AUTH-009 | High | Current user profile excludes the password | GET /auth/me | HTTP 200 and no password field | PASS | - |
| AUTH-010 | Critical | Protected route without a token | GET /auth/me with no header | HTTP 401 | PASS | - |
| AUTH-011 | Critical | Tampered token is rejected | Change one character of a valid token | HTTP 401 | PASS | - |
| AUTH-012 | High | Expired token is rejected | Use a token signed with a past expiry | HTTP 401 | PASS | - |
| AUTH-013 | High | Change password with the correct current password | PUT /auth/updatepassword, log in with old and new | Old password fails, new password works | PASS | - |
| AUTH-014 | High | Reject password change with a wrong current password | PUT /auth/updatepassword with a wrong current password | HTTP 400 | PASS | - |
| AUTH-015 | Medium | Update profile name and bio | PUT /auth/profile | HTTP 200 with the updated values | PASS | - |
| AUTH-016 | High | Enforce a minimum password length at registration | Register with the password "a" | HTTP 400 (the reset flow already requires 6 characters) | PASS | - |
| AUTH-017 | Medium | Reject an invalid email format | Register with the email "not-an-email" | HTTP 400 | PASS | - |
| AUTH-018 | High | Treat email addresses as case-insensitive | Register Foo@x and foo@x | Second registration returns HTTP 400 (FR-AUTH-01: unique emails) | PASS | - |
| AUTH-019 | Medium | Login without a password is a client error | POST /auth/login with only an email | HTTP 400, not a server error | PASS | - |
| AUTH-020 | Medium | Password login on a Google-only account | Create a Google account, then log in with a password | HTTP 400, not a server error | PASS | - |
| AUTH-021 | High | First Google login creates a student | POST /auth/google with a new identity | HTTP 200, role is student (FR-AUTH-03) | PASS | - |
| AUTH-022 | High | Repeat Google login finds the same account | Log in twice with one Google identity | Both logins return the same user id | PASS | - |
| AUTH-023 | High | Request a password reset code | POST /auth/forgot-password | Generic success message; code emailed; only a hash stored | PASS | - |
| AUTH-024 | High | Reject a wrong reset code | POST /auth/verify-otp with a wrong code | HTTP 400 | PASS | - |
| AUTH-025 | High | Correct code returns a reset token | POST /auth/verify-otp with the emailed code | HTTP 200 with a resetToken | PASS | - |
| AUTH-026 | Medium | Reject a short new password during reset | POST /auth/reset-password with 3 characters | HTTP 400 | PASS | - |
| AUTH-027 | Critical | Reset the password with a valid token | POST /auth/reset-password, then log in | Reset succeeds and the new password logs in | PASS | - |
| AUTH-028 | High | A reset token works only once | Reuse the same reset token | HTTP 400 | PASS | - |
| AUTH-029 | High | Reject an expired reset code | Move the code expiry into the past, then verify | HTTP 400 "OTP has expired" | PASS | - |
| AUTH-030 | High | Users registered with capitals can reset their password | Register Mixed.Case@x, then request a reset using the same address | A reset code is emailed | PASS | - |
| AUTH-031 | Medium | Reset request does not reveal unknown emails | POST /auth/forgot-password with an unknown email | Same HTTP 200 message as a known email | PASS | - |
| AUTH-032 | Low | Reset request does not reveal Google-only accounts | POST /auth/forgot-password for a Google-only account | Same generic HTTP 200 message | PASS | LMS-059 |
| AUTH-033 | High | Password change ends existing sessions | Change the password, then reuse the old token | HTTP 401 | PASS | LMS-011 |
| AUTH-034 | Low | Blocked user sees the block message on API calls | Block a user, then call /auth/me with their token | HTTP 403 with the block message | PASS | - |
| AUTH-035 | Medium | Token of a deleted user is rejected | Delete the user record, then call /auth/me | HTTP 401 | PASS | - |
| AUTH-036 | Medium | Unverified Google email cannot link to an existing account | Google login with email_verified=false for an existing email | Login is refused | PASS | LMS-025 |
| AUTH-037 | Low | Blank name is a validation error | PUT /auth/profile with name set to spaces | HTTP 400 | PASS | LMS-036 |
| AUTH-038 | Medium | Oversized profile data is handled cleanly | PUT /auth/profile with a 200 KB profileImage | HTTP 200 if accepted, or HTTP 413 if too large; never a 500 | PASS | LMS-035 |
| AUTH-039 | Critical | Existing accounts with capitals in the email can still log in | Create a stored account as Legacy.x@QA.test (as older versions did), then log in with that exact email | HTTP 200 | PASS | LMS-004 |
| AUTH-040 | High | Existing accounts with capitals can reset their password | Request a reset for a stored account with capitals in the email | A reset code is emailed | PASS | LMS-004 |
| AUTH-041 | Low | Login does not reveal Google-only accounts | Log in to a Google-only account with any password | Same "Invalid credentials" message as a wrong password | PASS | LMS-059 |
| AUTH-042 | High | A new account cannot duplicate an existing capitalised email | Register the lowercase form of a stored Legacy.x@QA.test account | HTTP 400 | PASS | - |
| AUTH-043 | High | Google login finds an existing capitalised account | Sign in with Google using the lowercase form of a stored Legacy.x@QA.test account | The existing account is used and no second account is created | PASS | - |
| AUTH-044 | High | A login lasts one hour | Register and read the token expiry | exp minus iat is 3600 seconds | PASS | LMS-074 |

## Course management

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| CRS-001 | Critical | Create a course | POST /courses with title and description | HTTP 201, status defaults to Draft (FR-COURSE-01) | PASS | - |
| CRS-002 | Medium | Reject a course without a description | POST /courses with only a title | HTTP 400 | PASS | - |
| CRS-003 | High | Owner updates a course | PUT /courses/:id | HTTP 200 with the new title | PASS | - |
| CRS-004 | Critical | Another user cannot update a course | PUT /courses/:id as a different instructor | HTTP 403 | PASS | - |
| CRS-005 | Critical | Another user cannot delete a course | DELETE /courses/:id as a student | HTTP 403 | PASS | - |
| CRS-006 | High | Add, rename and delete a section | POST, PUT, DELETE on /courses/:id/sections | Each call succeeds | PASS | - |
| CRS-007 | High | Add, edit and delete a lecture | POST lecture, PUT and DELETE /courses/lectures/:id | Each call succeeds | PASS | - |
| CRS-008 | Medium | Reject an invalid section importance | PUT a section with importance "Banana" | HTTP 400 | PASS | LMS-036 |
| CRS-009 | Medium | A lecture field can be cleared | PUT a lecture with description "" and resourceUrl "" | The stored values become empty | PASS | LMS-065 |
| CRS-028 | High | Editing one lecture field keeps the others | PUT only isPreview on a lecture | Description, link and due date are unchanged | PASS | - |
| CRS-010 | High | Enroll a student | POST /courses/:id/enroll | HTTP 201 | PASS | - |
| CRS-011 | Medium | Reject a duplicate enrollment | Enroll the same student again | HTTP 400 | PASS | - |
| CRS-012 | High | A student cannot enroll people | POST /courses/:id/enroll as a student | HTTP 403 | PASS | - |
| CRS-013 | High | Remove a student | DELETE /courses/:id/enroll/:studentId | HTTP 200 and the student loses access | PASS | - |
| CRS-014 | Medium | My enrolled and my created lists | GET /courses/my/enrolled and /my/created | Each list contains the course | PASS | - |
| CRS-015 | High | Enrolled student sees only visible content | GET /courses/:id as an enrolled student | Hidden sections and hidden lectures are not returned | PASS | - |
| CRS-016 | Critical | Paywall: a non-buyer cannot read lecture content | GET /courses/:id and /courses/lectures/:id as a non-enrolled user | Non-preview lecture returns 403; course view hides resource URLs | PASS | - |
| CRS-017 | High | Preview lecture is open to non-buyers | GET a preview lecture as a non-enrolled user | HTTP 200 | PASS | - |
| CRS-018 | High | Hidden lecture is blocked for enrolled students | GET a hidden lecture and a lecture in a hidden section | HTTP 403 for both | PASS | - |
| CRS-019 | High | Course search returns only my courses | GET /courses/search?q=... | Only enrolled or created courses are returned | PASS | - |
| CRS-020 | High | Course analytics for the owner only | GET /courses/:id/analytics as the owner and as a student | Owner HTTP 200, student HTTP 403 | PASS | - |
| CRS-021 | Critical | Admin-blocked course is closed to students | Block a course, then GET the course and a lecture as an enrolled student | Access is denied (FR-COURSE-02, FR-ADMIN-03) | PASS | LMS-009 |
| CRS-022 | Medium | Course delete removes related data | Create quiz and resource, delete the course, count leftovers | No orphaned quizzes, resources, coupons or broadcasts remain | PASS | LMS-042 |
| CRS-023 | Medium | Course delete keeps the audit trail | Delete a course, then search the activity log | Audit records are retained (FR-ACT-03) | PASS | LMS-042 |
| CRS-024 | Medium | Only instructors can list on the marketplace | As a student, POST /courses and POST /instructor/course | HTTP 403 for both | PASS | LMS-058 |
| CRS-025 | Medium | Reject a negative course price | PUT /courses/:id with price -100 | HTTP 400 | PASS | LMS-041 |
| CRS-026 | High | Enrolled course list has what My Learning needs | GET /courses/my/enrolled and read a course | Course id, title, category and level are returned | PASS | LMS-072 |
| CRS-027 | High | The owner can still delete a course, and it cleans up | Add a coupon, resource and co-instructor, then DELETE as the owner | HTTP 200 and the related records are gone | PASS | - |

## Lecture progress

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| PRG-001 | High | Update lecture status | PUT /courses/lectures/:id/progress with status Completed | HTTP 200 and the status is stored | PASS | - |
| PRG-002 | Medium | Save private notes | PUT progress with notes | Notes are stored | PASS | - |
| PRG-003 | Medium | Toggle revision flag | PUT toggle-revision twice | Flag turns on, then off | PASS | - |
| PRG-004 | High | A non-enrolled user cannot save progress | PUT progress as an outsider | HTTP 404 "Not enrolled" | PASS | - |
| PRG-005 | High | Progress totals exclude hidden lectures | GET /courses/my/enrolled for a course with 2 visible and 2 hidden lectures | totalLectures is 2 (FR-COURSE-06) | PASS | LMS-043 |
| PRG-006 | Medium | Student analytics exclude hidden lectures | GET /courses/:id/my-analytics | overview.totalLectures is 2 | PASS | LMS-043 |
| PRG-007 | Medium | Completing lectures builds a streak | Complete a lecture, then GET /courses/my/stats | currentStreak is 1 and dailyActivity has today | PASS | LMS-044 |
| PRG-008 | Low | Editing notes keeps the completion time | Complete a lecture, edit its notes, read completedAt | completedAt is unchanged | PASS | LMS-045 |
| PRG-009 | Medium | Status must be one of the course labels | PUT progress with status "Banana" | HTTP 400 | PASS | LMS-045 |
| PRG-010 | High | Instructor views a student progress overlay | GET /courses/:id/progress/:studentId as the owner | HTTP 200 with section breakdown (FR-COURSE-10) | PASS | - |
| PRG-011 | Medium | Peer progress is off by default | GET /courses/:id/peers | HTTP 403 | PASS | - |
| PRG-012 | Medium | A status change still updates the completion time | Move a lecture to In Progress, then Completed | completedAt changes | PASS | - |
| PRG-013 | Medium | Enrolled list includes progress | Complete one of two lectures, then GET /courses/my/enrolled | progressPercent is 50 | PASS | LMS-109 |

## Co-instructors

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| TCH-001 | High | Owner adds a co-instructor | POST /courses/:id/instructors | HTTP 201 | PASS | - |
| TCH-002 | Medium | Reject a duplicate co-instructor | Add the same user twice | HTTP 400 | PASS | - |
| TCH-003 | Low | Owner cannot add themselves | Add the owner email | HTTP 400 | PASS | - |
| TCH-004 | High | Outsider cannot add a co-instructor | POST instructors as a different instructor | HTTP 403 | PASS | - |
| TCH-005 | High | manage_content can add sections | POST a section as the co-instructor | HTTP 201 | PASS | - |
| TCH-006 | High | manage_content can edit lectures | PUT /courses/lectures/:id as the co-instructor | HTTP 200 (SRS 3.4: add, edit and delete lectures) | PASS | LMS-019 |
| TCH-007 | High | manage_content can delete lectures | DELETE a lecture as the co-instructor | HTTP 200 | PASS | LMS-019 |
| TCH-008 | High | manage_content alone cannot enroll students | POST enroll as the co-instructor | HTTP 403 | PASS | - |
| TCH-009 | Medium | Update co-instructor permissions | PUT instructors/:id adding manage_students | HTTP 200 with new permissions | PASS | - |
| TCH-010 | High | A co-instructor cannot manage other instructors | As a co-instructor with full_access, add, change and remove instructors | HTTP 403 each time | PASS | LMS-103 |
| TCH-011 | Medium | My permissions endpoint | GET /courses/:id/my-permissions for owner, instructor, outsider | Each role is reported correctly | PASS | - |
| TCH-012 | Medium | Co-instructor leaves a course | DELETE instructors/leave | HTTP 200 | PASS | - |
| TCH-013 | Medium | Owner removes a co-instructor | Add a user, then DELETE instructors/:id | HTTP 200 | PASS | - |
| TCH-014 | Medium | A co-instructor cannot delete the course | Give full_access, then DELETE the course | HTTP 403 (SRS 3.4) | PASS | LMS-046 |
| TCH-015 | High | A co-instructor without manage_content cannot edit lectures | PUT and DELETE a lecture as a co-instructor with no permissions | HTTP 403 | PASS | - |
| TCH-020 | High | The Instructor Center lists assigned courses | Add an instructor to a course, then read their dashboard | The course is listed and marked as assigned | PASS | - |

## Marketplace

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| MKT-001 | Critical | Guests can browse | GET /marketplace with no token | HTTP 200 and the published course is listed | PASS | - |
| MKT-002 | High | Draft courses are not listed | Create a draft, then browse | The draft is absent | PASS | - |
| MKT-003 | High | Filter by category, level and price | GET /marketplace with each filter | Results match the filter | PASS | - |
| MKT-004 | Medium | Filter by language | GET /marketplace?language=Sinhala | Only Sinhala courses are returned (FR-MKT-02) | PASS | LMS-047 |
| MKT-005 | Medium | Sort and paginate | GET /marketplace?sortBy=price-low&limit=1&page=2 | pagination block is correct | PASS | - |
| MKT-006 | High | Keyword search | GET /marketplace/search?q=Main | The course is found | PASS | - |
| MKT-007 | Low | Empty search is rejected | GET /marketplace/search | HTTP 400 | PASS | - |
| MKT-008 | High | Course landing page | GET /marketplace/:id as a guest | HTTP 200 with instructor and reviews | PASS | - |
| MKT-009 | Medium | Categories list | GET /marketplace/categories | Contains Testing | PASS | - |
| MKT-010 | Medium | Language is listed on course cards | GET /marketplace and read a course | language is present (FR-MKT-01) | PASS | LMS-047 |
| MKT-011 | High | The language filter finds matching courses | Publish a Sinhala course, then filter by Sinhala | Only that course is returned | PASS | - |
| MKT-012 | High | Search finds courses by instructor name | Search the marketplace for an instructor name | That instructor's course is returned | PASS | LMS-077 |
| MKT-013 | High | Every category is listed | GET /marketplace/categories | Saved categories and those used by published courses are returned | PASS | LMS-097 |
| MKT-014 | High | Admins manage categories | Add, repeat and delete a category as an admin | Added with HTTP 201, repeat refused, deleted with HTTP 200 | PASS | LMS-097 |
| MKT-015 | High | Only admins change categories | POST /categories as a student, an instructor and a guest | HTTP 403, 403 and 401 | PASS | - |

## Payments

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| PAY-001 | Critical | Checkout creates a Stripe session | POST /purchase/checkout for a paid course | Session URL returned; price, currency and metadata correct; pending purchase saved (FR-PAY-01) | PASS | - |
| PAY-002 | Critical | Payment webhook completes the purchase | Send a signed checkout.session.completed event | Purchase completed, student enrolled, enrollment count 1, invoice paid (FR-PAY-02) | PASS | - |
| PAY-003 | Critical | Replayed webhook is idempotent | Send the same event again | Enrollment count stays 1 (NFR-REL-04) | PASS | - |
| PAY-004 | Critical | Webhook rejects a bad signature | POST the webhook with a forged signature | HTTP 400 and nothing changes (NFR-SEC-05) | PASS | - |
| PAY-005 | High | Webhook rejects a missing signature | POST the webhook with no signature | HTTP 400 | PASS | - |
| PAY-006 | High | Cannot buy a course twice | Check out an owned course | HTTP 400 | PASS | - |
| PAY-007 | High | Cannot buy your own course | Check out as the owner | HTTP 400 | PASS | - |
| PAY-008 | High | Cannot buy an unpublished course | Check out a draft | HTTP 404 | PASS | - |
| PAY-009 | High | Free course enrolls directly | Check out a price 0 course | enrolled: true, invoice issued, Stripe not called | PASS | - |
| PAY-010 | High | Success page recovers a missed webhook | GET /purchase/session/:id while Stripe reports paid but no webhook arrived | Purchase becomes completed | PASS | - |
| PAY-011 | High | Another user cannot read a checkout session | GET /purchase/session/:id as someone else | HTTP 404 | PASS | - |
| PAY-012 | Medium | Expired session marks the purchase failed | Send checkout.session.expired | Status becomes failed; the user can retry | PASS | - |
| PAY-013 | Medium | Unpaid completed session grants nothing | Send checkout.session.completed with payment_status unpaid | Student is not enrolled | PASS | - |
| PAY-014 | Medium | Webhook without metadata is ignored safely | Send a completed event with no metadata | HTTP 200 and no crash | PASS | - |
| PAY-015 | High | Parallel confirmations count once | Send the webhook twice at the same moment | Enrollment count is 1 | PASS | - |
| PAY-016 | High | Parallel purchases get unique invoices | Five students enroll in a free course together | All succeed with five different invoice numbers | PASS | - |
| PAY-017 | High | USD amounts convert to cents | Check out a USD 19.99 course | unit_amount 1999, currency usd | PASS | - |
| PAY-018 | Critical | Full refund removes access | Buy a course, send charge.refunded with refunded true | Purchase refunded, access removed, count reduced | PASS | - |
| PAY-019 | High | Replay after refund does not restore access | Resend the original completed event | Student stays unenrolled | PASS | - |
| PAY-020 | High | Student can buy again after a refund | Check out and pay again | Purchase completed and access granted | PASS | - |
| PAY-021 | High | Partial refund keeps access | Send charge.refunded with refunded false | Purchase stays completed | PASS | - |
| PAY-022 | High | Purchase history and verification | GET /purchase/my-purchases and /purchase/verify/:id | The purchase is listed and hasPurchased is true | PASS | - |
| PAY-023 | Critical | Invoice visible only to buyer, instructor and admin | GET /purchase/invoice/:n as each role and as a stranger | Allowed roles get 200; a stranger gets 404; a guest gets 401 | PASS | - |
| PAY-024 | High | Invoice PDF downloads | GET /purchase/invoice/:n/pdf | A valid PDF is returned | PASS | - |
| PAY-025 | Medium | Invoice shows the product name | Read the text of the invoice PDF | It says Tenz Learn | PASS | LMS-057 |
| PAY-026 | Critical | Blocked course cannot be sold | Block a course, then check out | Checkout is refused | PASS | LMS-009 |
| PAY-027 | High | Already enrolled student is not charged | Enroll a student manually, then check out | Checkout is refused | PASS | LMS-040 |
| PAY-028 | High | A removed buyer can regain access | Buy, get removed by the instructor, then try to buy again | Checkout works, or access can otherwise be restored | PASS | LMS-016 |
| PAY-029 | Medium | Removing a student updates the enrollment count | Buy, remove the student, read enrollmentCount | Count goes back to 0 | PASS | LMS-016 |
| PAY-030 | High | A sold course cannot be deleted | Buy a course, then DELETE it as the owner | The delete is refused, so buyers keep their course | PASS | LMS-017 |
| PAY-031 | Medium | Bought course stays available after archiving | Buy a course, archive it, read /courses/my/enrolled | The buyer still sees the course | PASS | LMS-017 |
| PAY-032 | Critical | A removed buyer gets access back without paying twice | Buy, get removed, check out again | enrolled true, no new Stripe session, count back to 1 | PASS | - |
| PAY-033 | High | Refunding a removed buyer does not lower the count twice | Buy, get removed, send a full refund | enrollmentCount stays 0 | PASS | - |
| PAY-040 | Critical | A slip gives access only after approval | Send a slip, then approve it as the course owner | No access while pending; access, a paid invoice and a notification after approval | PASS | LMS-090 |
| PAY-041 | High | A rejected slip can be replaced | Reject a slip with a reason, then send a new one | The reason is shown and the new slip is accepted | PASS | LMS-090 |
| PAY-042 | High | A pending slip cannot be paid twice | Send a slip, then send another and try card checkout | HTTP 400 for both | PASS | - |
| PAY-043 | High | Only the course owner or an admin reviews a slip | Approve and reject as another instructor and as a student | HTTP 403 every time | PASS | - |
| PAY-044 | High | A slip file stays private | Read the slip as the student, the owner, a stranger, and through the public image route | HTTP 200, 200, 404 and 404 | PASS | - |
| PAY-045 | Medium | Bad slips are refused | Send HTML named as an image, no file, and a slip for a free course | HTTP 400 each time | PASS | - |
| PAY-046 | Medium | A coupon works with a slip | Send a slip with a 10 percent coupon, then approve it | The amount is discounted and the coupon is used once | PASS | - |

## Coupons

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| CPN-001 | High | Create a coupon | POST /coupons | HTTP 201 and the code is uppercased | PASS | - |
| CPN-002 | Medium | Reject a duplicate code | Create the same code again | HTTP 400 | PASS | - |
| CPN-003 | High | Non-owner cannot create a coupon | POST /coupons as another instructor | HTTP 403 | PASS | - |
| CPN-004 | High | Students cannot create coupons | POST /coupons as a student | Denied | PASS | - |
| CPN-005 | Medium | Reject a percentage above 100 | discountValue 150 | HTTP 400 | PASS | - |
| CPN-006 | Medium | Reject a fixed discount at or above the price | Fixed discount 1000 on a 1000 course | HTTP 400 | PASS | - |
| CPN-007 | High | Validate a coupon | POST /coupons/validate in lowercase | discountAmount 100, finalPrice 900 | PASS | - |
| CPN-008 | High | Unknown code is rejected | Validate a random code | HTTP 404 | PASS | - |
| CPN-009 | High | Coupon only works on its own course | Validate SAVE10 on another course | HTTP 404 | PASS | - |
| CPN-010 | High | Expired coupon is rejected | Set validUntil to the past, then validate | HTTP 400 | PASS | - |
| CPN-011 | High | Inactive coupon is rejected | Set isActive false, then validate | HTTP 400 | PASS | - |
| CPN-012 | High | Usage limit is enforced | Use a maxUses 1 coupon twice | Second use is refused (FR-MKT-05) | PASS | - |
| CPN-013 | High | Discount reaches Stripe | Check out with SAVE10 | unit_amount 90000 | PASS | - |
| CPN-014 | High | Invalid coupon stops checkout | Check out with a bad code | HTTP 400 and no charge at full price | PASS | - |
| CPN-015 | High | Usage count rises only after payment | Check out without paying, then pay | usedCount goes 0 then 1 | PASS | - |
| CPN-016 | Medium | List, update and delete | GET course coupons, PUT, DELETE | All succeed for the owner; others get 403 | PASS | - |
| CPN-017 | High | Reject a negative fixed discount | Create a fixed coupon of -500 | HTTP 400 | PASS | LMS-038 |
| CPN-018 | High | Update applies the same limits as create | PUT a coupon to discountValue 500 percent | HTTP 400 | PASS | LMS-038 |
| CPN-019 | Medium | maxUses 0 does not mean unlimited | Create a coupon with maxUses 0 | Rejected, or stored as 0 and unusable | PASS | LMS-038 |
| CPN-020 | Low | Reject a coupon that is already expired | Create with validUntil in the past | HTTP 400 | PASS | LMS-038 |
| CPN-021 | High | Usage limit holds under parallel use | Two students use a maxUses 1 free coupon together | Only one succeeds | PASS | LMS-015 |
| CPN-022 | Medium | Percentage discount keeps cents on USD courses | Validate a 1 percent coupon on a USD 19.99 course | discountAmount is 0.20, not 0 | PASS | LMS-039 |
| CPN-023 | Low | Non-text coupon code is a client error | POST /coupons/validate with code as an object | HTTP 400 | PASS | LMS-036 |
| CPN-024 | Medium | Valid coupon updates still work | PUT a coupon to 20 percent with a usage limit | HTTP 200 and the values are saved | PASS | - |
| CPN-025 | Medium | Discounted price keeps exact cents | Validate a 10 percent coupon on a USD 19.99 course | discountAmount 2, finalPrice 17.99 | PASS | - |

## Instructor tools

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| INS-001 | High | Student becomes an instructor | POST /instructor/become | Role is instructor | PASS | - |
| INS-002 | High | Instructor dashboard and earnings totals | GET /instructor/dashboard and /earnings | Revenue equals completed sales | PASS | - |
| INS-003 | High | LKR and USD earnings stay separate | Sell in USD too, then read earnings | USD total is separate and not added to LKR | PASS | - |
| INS-004 | High | Course sales are private | GET /instructor/course/:id/sales as another instructor | HTTP 403 | PASS | - |
| INS-005 | High | Save and read bank details | POST then GET /instructor/bank-details | Saved values are returned | PASS | - |
| INS-006 | Medium | Bank details need a holder name | POST without accountHolderName | HTTP 400 | PASS | - |
| INS-007 | High | Instructor routes reject students | GET /instructor/dashboard as a student | Denied | PASS | - |
| INS-008 | Medium | Instructor profile update | PUT /instructor/profile | HTTP 200 | PASS | - |

## Admin

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| ADM-001 | High | Dashboard statistics | GET /admin/dashboard | HTTP 200 with user and revenue totals | PASS | - |
| ADM-002 | Critical | Users list excludes passwords | GET /admin/users | Users are listed and no password field is present | PASS | - |
| ADM-003 | High | Warn a user | POST /admin/users/:id/warn | Warning is recorded | PASS | - |
| ADM-004 | Medium | Warning needs a reason | POST warn with no reason | HTTP 400 | PASS | - |
| ADM-005 | High | Reaching the warning limit blocks the user | Issue a second warning | isBlocked is true | PASS | - |
| ADM-006 | High | Removing a warning lifts the auto-block | DELETE warnings/0 | isBlocked is false | PASS | - |
| ADM-007 | Medium | Invalid warning index changes nothing | DELETE warnings/abc | HTTP 400 and the warning stays | PASS | LMS-050 |
| ADM-008 | Medium | Set the warning limit | POST max-warnings 5 | HTTP 200 | PASS | - |
| ADM-009 | Low | Non-numeric warning limit is rejected | POST max-warnings "abc" | HTTP 400 | PASS | LMS-036 |
| ADM-010 | Critical | Blocked user cannot log in | Block a user, then log in | HTTP 403 (FR-ADMIN-02) | PASS | - |
| ADM-011 | High | Blocking with hideCourses hides their courses | GET the marketplace landing page | HTTP 404 | PASS | - |
| ADM-012 | High | Unblock restores login and courses | POST unblock | Login works and the course is visible | PASS | - |
| ADM-013 | High | Change a user role | POST role instructor | HTTP 200 | PASS | - |
| ADM-014 | Critical | Role change cannot create an admin | POST role admin | HTTP 400 | PASS | - |
| ADM-015 | High | Block and unblock a course | POST courses/:id/block and unblock | Marketplace hides, then shows it | PASS | - |
| ADM-016 | High | Instructor list and detail | GET /admin/instructors and /instructors/:id | HTTP 200 with earnings and bank details | PASS | - |
| ADM-017 | Critical | Create a payout within the balance | POST /admin/payouts for 1000 | HTTP 201; pending falls by 1000 | PASS | - |
| ADM-018 | Critical | Payout cannot exceed the balance | POST a payout for 999999 | HTTP 400 | PASS | - |
| ADM-019 | High | Payout amount must be positive | POST a payout for -500 | HTTP 400 | PASS | LMS-014 |
| ADM-020 | Medium | Payout history | GET /admin/payouts | HTTP 200 with records | PASS | - |
| ADM-021 | High | Impersonate a user | POST /admin/impersonate with an email | The returned token acts as that user | PASS | - |
| ADM-022 | Medium | Impersonating an unknown user | POST with an unknown email | HTTP 404 | PASS | - |
| ADM-023 | Medium | Admin cannot lock themselves out | Block your own admin account | HTTP 400 | PASS | LMS-034 |
| ADM-024 | High | Role change cannot demote an admin | POST role student for an admin account | Refused | PASS | LMS-034 |

## Quizzes

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| QZ-001 | High | Instructor creates a quiz | POST /quizzes | HTTP 201 with three questions | PASS | - |
| QZ-002 | Critical | Students cannot create quizzes | POST /quizzes as a student | HTTP 403 | PASS | - |
| QZ-003 | Critical | Quiz list and detail hide answers from students | GET the course list and the quiz as a student | No correctAnswer field; the owner can see answers | PASS | - |
| QZ-004 | High | A non-enrolled user cannot start a quiz | POST start as an outsider | HTTP 403 | PASS | - |
| QZ-005 | Critical | Starting a quiz hides answers | POST start | HTTP 201 with questions and no correctAnswer | PASS | - |
| QZ-006 | Medium | Restarting resumes the same attempt | POST start again | The same attempt id is returned | PASS | - |
| QZ-007 | High | Cannot submit someone else's attempt | Submit the attempt as another student | HTTP 403 | PASS | - |
| QZ-008 | Critical | Correct answers score 100 percent | Submit MCQ, true/false (false) and short answer (case and spaces differ) | percentage 100, passed true | PASS | - |
| QZ-009 | High | An attempt can be submitted only once | Submit again | HTTP 400 | PASS | - |
| QZ-010 | High | Wrong answers fail | Submit all wrong | percentage 0, passed false | PASS | - |
| QZ-011 | High | Attempt limit is enforced | Use a quiz with attemptsAllowed 1 twice | Second start returns HTTP 400 | PASS | - |
| QZ-012 | High | Time limit is enforced | Move startedAt 20 minutes back on a 5 minute quiz, then submit | HTTP 400 and status timed-out | PASS | - |
| QZ-013 | Medium | Inactive quiz is unavailable | Set isActive false | Hidden from students; start returns HTTP 400 | PASS | - |
| QZ-014 | High | Quiz analytics are for instructors | GET analytics as the owner and as a student | Owner HTTP 200; student HTTP 403 | PASS | - |
| QZ-015 | Medium | Own attempts list | GET /quizzes/:id/my-attempts | The attempt is listed | PASS | - |
| QZ-016 | High | Students cannot read each other's attempts | GET /quizzes/attempts/:id as another student | HTTP 403 | PASS | - |
| QZ-017 | Medium | Delete a quiz and its attempts | DELETE /quizzes/:id | Quiz and attempts are gone | PASS | - |
| QZ-018 | Critical | Repeating one answer cannot inflate a score | Submit the same correct questionIndex three times | That question scores once: percentage 33, passed false | PASS | LMS-006 |
| QZ-019 | Critical | Answers are hidden while an attempt is in progress | Start a quiz, then GET /quizzes/attempts/:id | No correctAnswer in the response | PASS | LMS-005 |
| QZ-020 | High | Answer key stays hidden while retries remain | Submit one attempt on an unlimited-retry quiz | The response has no correct answers | PASS | LMS-022 |
| QZ-021 | Medium | Submit without answers is a client error | POST submit with no answers field | HTTP 400 | PASS | LMS-037 |
| QZ-022 | Medium | Numeric reply to a short-answer question | Answer the short question with 123 | Marked wrong, HTTP 200 | PASS | LMS-037 |
| QZ-023 | Low | Passing score of 0 is kept | Create with passingScore 0 | passingScore is 0 | PASS | LMS-066 |
| QZ-024 | High | AI-generated true/false questions can be answered | Save a question as the AI returns it (correctAnswer 0 = True), answer true as the UI does | The answer is marked correct | PASS | LMS-018 |
| QZ-025 | Low | Reject a negative time limit | Create with timeLimit -5 | HTTP 400 | PASS | LMS-066 |
| QZ-026 | High | A quiz in a blocked course cannot be started | Block a course, then start its quiz as an enrolled student | HTTP 403 | PASS | - |
| QZ-027 | High | A finished attempt hides answers while retries remain | Submit on a two-attempt quiz, then GET /quizzes/attempts/:id as the student | No correctAnswer; the student still sees which answers were wrong | PASS | - |
| QZ-028 | High | Answers are shown once no attempts remain | Use the only attempt on a one-attempt quiz | Correct answers are returned for review | PASS | - |
| QZ-029 | Medium | The instructor can always see answers on an attempt | GET an attempt as the owner while the student can still retake | correctAnswer is returned | PASS | - |

## AI features

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| AI-001 | Critical | Instructor AI key is encrypted at rest | POST /ai/config, read the stored record | Key stored as AES-GCM ciphertext; response masked (NFR-SEC-03) | PASS | - |
| AI-002 | High | Config read returns a masked key | GET /ai/config | apiKeyMasked only | PASS | - |
| AI-003 | Medium | Reject an invalid provider | POST provider "acme" | HTTP 400 | PASS | - |
| AI-004 | Medium | Test connection | POST /ai/test for each provider | success true for OpenAI, Gemini and Anthropic | PASS | - |
| AI-005 | High | Instructor AI routes reject students | GET /ai/config as a student | Denied | PASS | - |
| AI-006 | High | Generate a quiz | POST /ai/generate-quiz | Questions returned | PASS | - |
| AI-007 | High | Generate notes | POST /ai/generate-notes | Notes returned | PASS | - |
| AI-008 | Medium | Generating without a key is a client error | POST /ai/generate-notes with no saved key | HTTP 400 | PASS | LMS-035 |
| AI-009 | High | Cannot generate for another course | POST /ai/generate-notes on a stranger course | HTTP 403 | PASS | LMS-035 |
| AI-010 | High | Student chats with their own key | Save a student key, create a conversation, send a message | Reply returned; the student key is used; title generated | PASS | - |
| AI-011 | Medium | Rename a conversation | PUT conversations/:id/title | HTTP 200 | PASS | - |
| AI-012 | High | Conversations are private | GET, message and DELETE as another student | HTTP 404 each time | PASS | - |
| AI-013 | Medium | Delete an own-key conversation | DELETE conversations/:id | HTTP 200 | PASS | - |
| AI-014 | High | Instructor key is off by default | Chat with useInstructorKey before sharing is enabled | HTTP 400 (not a 500) | PASS | LMS-035 |
| AI-015 | High | Only the owner toggles AI sharing | PUT toggle-student-ai as the owner and as another instructor | Owner enabled; other instructor HTTP 403 | PASS | - |
| AI-016 | High | Student uses the shared instructor key | Create a conversation with useInstructorKey and send a message | source is instructor and the instructor key is used | PASS | - |
| AI-017 | High | Instructor-key conversations cannot be deleted | DELETE as the student | HTTP 403 (FR-AI-03) | PASS | - |
| AI-018 | High | Instructor sees conversations on their key | GET /ai/course/:id/student-conversations | Owner HTTP 200; other instructor HTTP 403 | PASS | - |
| AI-019 | High | Conversation list reports the key source | GET /student-ai/conversations | useInstructorKey is true for that conversation | PASS | LMS-054 |
| AI-020 | High | A blocked student cannot use the key | PUT ai-block, then chat | HTTP 403 (not a 500) | PASS | LMS-035 |
| AI-021 | Medium | AI status endpoint | GET /student-ai/course/:id/ai-status | Reports sharing and instructor key | PASS | - |
| AI-022 | Critical | Only enrolled students can spend the instructor key | As a non-enrolled user, open a conversation on the course and send a message | Refused; the instructor key is not used | PASS | LMS-008 |
| AI-023 | High | No silent fallback to the instructor key | As an enrolled student with no key, chat with useInstructorKey false | Refused, or the conversation is flagged as instructor-key and cannot be deleted | PASS | LMS-023 |
| AI-024 | Medium | PDF attachment is read | Send a generated PDF as a chat attachment | HTTP 200 with PDF text in the message | PASS | - |
| AI-025 | Medium | Image attachment is sent | Send a PNG attachment | HTTP 200 | PASS | - |
| AI-026 | Low | Unsupported attachment is explained | Send a .exe attachment with no message | HTTP 400 | PASS | - |
| AI-027 | Medium | Delete AI config | DELETE /student-ai/config twice | HTTP 200, then HTTP 404 | PASS | - |
| AI-028 | High | AI true/false answers are saved as true or false | POST /ai/generate-quiz and read the answer type | correctAnswer is a boolean | PASS | - |
| AI-029 | High | A plain chat never spends the instructor key | As an enrolled student with no key, send a message in a normal course chat | Refused, and no AI call is made | PASS | - |

## Broadcasts

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| BRD-001 | High | Owner posts a broadcast | POST /broadcasts/course/:id | HTTP 201 | PASS | - |
| BRD-002 | Medium | Broadcast needs a message | POST with a title only | HTTP 400 | PASS | - |
| BRD-003 | High | Enrolled student reads broadcasts | GET active list | The broadcast is listed | PASS | - |
| BRD-004 | High | Unread count and mark as read | GET unread-count, POST mark-read, GET again | Count above 0, then 0 (FR-BROAD-03) | PASS | - |
| BRD-005 | High | Students cannot post by default | POST as an enrolled student | HTTP 403 | PASS | - |
| BRD-006 | High | Student broadcasts can be enabled | PUT settings, then POST as a student | HTTP 201; outsider still HTTP 403 | PASS | - |
| BRD-007 | Medium | Creator edits and deletes | PUT and DELETE own broadcast | HTTP 200 each | PASS | - |
| BRD-008 | High | Cannot edit someone else's broadcast | PUT as another student | HTTP 403 | PASS | - |
| BRD-009 | Low | Invalid priority is a client error | POST priority "mega" | HTTP 400 | PASS | LMS-036 |
| BRD-010 | Medium | New lecture creates a broadcast | Add a lecture, then read the broadcast list | A broadcast with a link to the lecture exists (FR-COURSE-03, FR-BROAD-02) | PASS | LMS-048 |
| BRD-011 | High | Hidden and draft content is not announced | Add a hidden lecture, a hidden section, and content to a draft course | No broadcast is created | PASS | - |
| BRD-012 | High | A custom announcement replaces the automatic one | Add a lecture with broadcastMessage and priority urgent | Exactly one broadcast, with that message, that priority and a direct link | PASS | - |

## Resources

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| RES-001 | High | Instructor uploads a PDF | POST /resources/:id with a PDF | HTTP 201 and no fileData in the response | PASS | - |
| RES-002 | High | Instructor adds a link | POST with a url | HTTP 201 and fileType link | PASS | - |
| RES-003 | High | Enrolled student lists resources | GET /resources/:id | Listed without file data | PASS | - |
| RES-004 | High | Download and inline view | GET .../download and .../view | Attachment and inline dispositions; identical bytes (FR-RES-02) | PASS | - |
| RES-005 | Critical | Paywall: outsiders cannot read resources | List, download and view as a non-enrolled user | HTTP 403 for each | PASS | - |
| RES-006 | High | Student uploads are off by default | Upload as a student | HTTP 403 | PASS | - |
| RES-007 | High | Student uploads can be enabled | Toggle, then upload | HTTP 201 with uploaderRole student | PASS | - |
| RES-008 | High | Students cannot delete others' files | DELETE as another student | HTTP 403 | PASS | - |
| RES-009 | Medium | Uploader edits and owner deletes | PUT as the uploader, DELETE as the owner | HTTP 200 each | PASS | - |
| RES-010 | High | Blocked file type is refused | Upload a .exe | HTTP 400 | PASS | - |
| RES-011 | Medium | Oversized file gets a clear error | Upload 11 MB | HTTP 413 with a clear message | PASS | LMS-035 |
| RES-012 | Medium | Lecture-linked resources and counts | Upload linked to a lecture, read the lecture list and counts | Listed; count is 1 | PASS | - |
| RES-013 | Medium | Sinhala and Tamil file names are preserved | Upload පාඩම.pdf | fileName is unchanged | PASS | LMS-051 |
| RES-014 | Medium | Admin can open course resources | GET /resources/:id as an admin | HTTP 200 (moderation needs this) | PASS | LMS-067 |
| RES-016 | High | Common CSV and Excel types still upload | Upload a file as text/csv, application/vnd.ms-excel and the xlsx type | HTTP 201 for each | PASS | - |
| RES-015 | High | Sinhala file names download correctly | Upload පාඩම.pdf, then download and view it | HTTP 200 with the real name in the header | PASS | - |
| RES-020 | High | Images can be uploaded and shown | Upload a PNG, then open its URL as a guest | HTTP 201, then the image with an image type | PASS | LMS-091, LMS-096 |
| RES-021 | High | Only real images are accepted | Upload HTML and a PDF named as images, then a file over 2 MB, then as a guest | HTTP 400, 400, 413 and 401 | PASS | - |

## Reviews

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| REV-001 | High | Buyer posts a review | POST /reviews after purchase | HTTP 201 | PASS | - |
| REV-002 | High | Non-buyer cannot review | POST /reviews without a purchase | HTTP 403 | PASS | - |
| REV-003 | High | One review per student | POST again | HTTP 400 | PASS | - |
| REV-004 | High | Owner cannot review their own course | POST as the owner | HTTP 400 | PASS | - |
| REV-005 | Medium | Rating must be 1 to 5 | POST rating 0 and 6 | HTTP 400 each | PASS | - |
| REV-006 | High | Course average updates | A 5 and a 3 star review, then read the course | average 4, count 2 (FR-REV-04) | PASS | - |
| REV-007 | Medium | Update your review | PUT /reviews/:id | HTTP 200 and the average updates | PASS | - |
| REV-008 | High | Cannot change someone else's review | PUT and DELETE as another user | HTTP 403 | PASS | - |
| REV-009 | Medium | Delete updates the average | DELETE a review | count falls | PASS | - |
| REV-010 | Medium | Guests can read reviews | GET /reviews/course/:id | HTTP 200 with distribution | PASS | - |
| REV-011 | Low | Helpful vote counts | POST /reviews/:id/helpful | helpful is 1 | PASS | - |
| REV-012 | Medium | A user can vote helpful only once | POST helpful twice more as the same user | Count stays 1 | PASS | LMS-053 |
| REV-013 | Medium | Private courses need enrollment to review | POST a review on a non-marketplace course as a stranger | HTTP 403 | PASS | LMS-052 |
| REV-014 | Low | Non-numeric rating is a client error | POST rating "abc" | HTTP 400 | PASS | LMS-036 |
| REV-015 | Medium | Admin removes a review | DELETE as an admin | HTTP 200 | PASS | - |
| REV-016 | Medium | Enrolled students can review private courses | Enroll in a private course, then POST a review | HTTP 201 | PASS | - |
| REV-017 | Low | Voter lists stay private | Read reviews as a guest after a helpful vote | helpfulBy is not returned | PASS | - |

## Notifications

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| NTF-001 | High | New content notifies students | Enable newContent, add a lecture | Enrolled student has a notification (FR-NOTIF-01) | PASS | - |
| NTF-002 | Medium | Unread count and mark read | GET unread-count, PUT :id/read | Count falls by one | PASS | - |
| NTF-003 | High | Other users' notifications are protected | PUT and DELETE as another student | HTTP 404 | PASS | - |
| NTF-004 | Medium | Mark all read and delete | PUT mark-all-read, DELETE :id | Unread is 0 and the delete succeeds | PASS | - |
| NTF-005 | Medium | Owner sends a custom notification | POST /notifications/course/:id/send | Enrolled students receive it | PASS | - |
| NTF-006 | Medium | Due date reminder runs once | Lecture due in 12 hours, run the cron twice | One notification per student | PASS | - |
| NTF-007 | Medium | AI access change notifies students | Enable aiAccessChange, toggle AI | A notification is created | PASS | - |
| NTF-008 | Medium | Progress milestone notification | Enable progressMilestone, complete every lecture | A milestone notification is created (FR-NOTIF-01) | PASS | LMS-049 |
| NTF-009 | Low | Invalid page number | GET /notifications?page=0 | HTTP 200 or 400, never a 500 | PASS | LMS-032 |
| NTF-010 | Medium | A co-instructor with manage_students can notify the course | POST /notifications/course/:id/send as that co-instructor | HTTP 200 | PASS | - |
| NTF-011 | Medium | A milestone is sent once | Complete a lecture, set it back, complete it again on a course with two visible lectures and one hidden | One 50 percent notification in total, so re-ticking repeats nothing and hidden lectures do not count | PASS | - |
| NTF-012 | Medium | A comment notifies the course owner | Comment as an enrolled student, then as the owner | One notification for the student comment, none for the owner's own | PASS | LMS-089 |

## Activity log

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| ACT-001 | High | User reads their own activity | GET /activities/me | Only their entries, with pagination | PASS | - |
| ACT-002 | High | Admin reads the global log | GET /activities with filters | HTTP 200; a student gets denied | PASS | - |
| ACT-003 | Medium | Search by user | GET /activities?user=<email> | Entries for that user | PASS | - |
| ACT-004 | Medium | Non-GET actions are logged | Run an action, read the log | The action is recorded (FR-ACT-01) | PASS | - |
| ACT-005 | Medium | Enrollment appears in the student log | Enroll a student, then read their log | An Enrolled entry exists | PASS | LMS-055 |
| ACT-006 | Medium | Refused actions are not logged as done | Attempt a forbidden course update, read the log | No "Course Updated" entry for that user | PASS | LMS-056 |
| ACT-007 | Low | Removing a warning is labelled correctly | DELETE a warning, read the admin log | Entry is not labelled "User Warned" | PASS | LMS-056 |
| ACT-008 | Low | Client IP is recorded | Read a log entry | ip is set (the model has the field) | PASS | LMS-056 |
| ACT-009 | Medium | Refused actions are recorded as failed | Attempt a forbidden course update, read the log | An entry marked Failed exists | PASS | - |

## Security

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| SEC-001 | Critical | Public admin registration is closed | POST /auth/admin/register with no credentials | Refused; SRS 10.2 says there is no admin self-registration | PASS | LMS-001 |
| SEC-002 | Critical | Self-registered admin has no admin access | Call GET /admin/users with the token from SEC-001 | Denied | PASS | LMS-001 |
| SEC-003 | Critical | Role in the register body is ignored | POST /auth/register with role admin | Created as student | PASS | LMS-001 |
| SEC-004 | Critical | Google sign-in cannot create an admin | POST /auth/admin/google with a new identity | Refused | PASS | LMS-001 |
| SEC-005 | High | Login rejects database operators | POST /auth/login with email {"$regex":"^student1"} and a valid password | HTTP 400 | PASS | - |
| SEC-006 | Critical | Passwords never reach the activity log | Change a password, read the log entry | No password value stored | PASS | LMS-002 |
| SEC-007 | Critical | AI keys never reach the activity log | Save an AI key, read the log entry | No key value stored | PASS | LMS-002 |
| SEC-008 | High | Bank details never reach the activity log | Save bank details, read the log entry | No account number stored | PASS | LMS-002 |
| SEC-009 | High | A reset token is not a login token | Use a resetToken as a Bearer token | HTTP 401 | PASS | LMS-024 |
| SEC-010 | Medium | OTP hash is not exposed | Request a reset, then GET /auth/me | No otpHash field | PASS | LMS-026 |
| SEC-011 | High | Reset code locks after repeated failures | Send 12 wrong codes from different IPs, then the right code | The code is locked or invalidated | PASS | LMS-010 |
| SEC-012 | High | Login is rate limited | Production mode: 6 wrong logins from one IP | Sixth request returns HTTP 429 (NFR-SEC-06) | PASS | - |
| SEC-013 | High | Registration is rate limited | Production mode: 4 registrations from one IP | Fourth request returns HTTP 429 | PASS | - |
| SEC-014 | Medium | Reset code checks are rate limited | Production mode: 6 verify-otp calls from one IP | Sixth returns HTTP 429 | PASS | - |
| SEC-015 | Medium | General API limit | Production mode: 301 requests from one IP | HTTP 429 at the limit | PASS | - |
| SEC-016 | Medium | Rate limit cannot be dodged with a header | Production mode: 8 logins, changing X-Forwarded-For each time | Still limited (only valid if the app sits directly on the internet; see the bug note) | PASS | LMS-060 |
| SEC-070 | High | Successful logins never trip the account limit | Production mode: 7 correct logins to one account from different addresses | All HTTP 200 | PASS | - |
| SEC-071 | High | A blocked user with the right password sees the reason | Log in to a blocked account with the correct password | HTTP 403 with the block reason | PASS | - |
| SEC-072 | High | Only instructors can be added to a course | As a course owner, add a student account by email with manage_content | HTTP 400, and the student gets no course access | PASS | LMS-111 |
| SEC-017 | Medium | Marketplace course creation is rate limited | Production mode: 11 calls to POST /instructor/course | HTTP 429 at the limit (NFR-SEC-06 covers course creation) | PASS | LMS-060 |
| SEC-018 | High | Production errors hide stack traces | Production mode: trigger an error | stack is null | PASS | - |
| SEC-019 | Low | Production errors hide internals | Production mode: GET /marketplace/not-an-id | No database details in the message | PASS | LMS-061 |
| SEC-020 | Medium | Security headers are set | Read the headers on an API response | nosniff, HSTS and frame protection present; X-Powered-By absent | PASS | LMS-031 |
| SEC-021 | High | CORS allows only the client origin | Send a request with Origin https://evil.test | That origin is not reflected | PASS | - |
| SEC-022 | Critical | Unsigned and wrongly signed tokens are rejected | Use an alg:none token and one signed with another secret | HTTP 401 each | PASS | - |
| SEC-023 | Critical | Non-admins are refused on admin routes | Call each admin route as a student and an instructor | Denied every time | PASS | - |
| SEC-024 | Low | Wrong role gets 403, not 401 | GET /admin/dashboard as a student | HTTP 403; 401 means "not logged in", and the client shows "session expired" | PASS | - |
| SEC-025 | Critical | Guests are refused on protected routes | Call a sample of protected routes with no token | HTTP 401 each | PASS | - |
| SEC-026 | High | Cron endpoint needs its secret in production | Production mode: GET /cron/due-reminders with and without the secret | HTTP 401 without, HTTP 200 with | PASS | - |
| SEC-027 | High | Instructors cannot message another instructor's students | POST /notifications/course/:id/send as an unrelated instructor | HTTP 403 | PASS | LMS-007 |
| SEC-028 | High | Notifications cannot target arbitrary users | Send with studentIds of a user outside the course | Refused | PASS | LMS-007 |
| SEC-029 | High | Instructors cannot change another course's settings | PUT /notifications/course/:id/settings as an unrelated instructor | HTTP 403 | PASS | LMS-007 |
| SEC-030 | Medium | Course list shows only what the user may see | GET /courses as a student | No drafts, private or blocked courses of other users | PASS | LMS-028 |
| SEC-031 | Medium | Broadcasts are for course members | GET active broadcasts as a non-enrolled user | HTTP 403 | PASS | LMS-012 |
| SEC-032 | Medium | Only members can read or post comments | POST and GET comments as a non-enrolled user | HTTP 403 | PASS | LMS-012 |
| SEC-033 | High | Paywall: quiz questions are for members | GET /quizzes/:id and /quizzes/course/:id as a non-enrolled user | HTTP 403 | PASS | LMS-012 |
| SEC-034 | Critical | Script links are rejected | Add a resource link and a lecture URL using javascript: | HTTP 400 each | PASS | LMS-003 |
| SEC-035 | Medium | Upload filter cannot be bypassed | Upload HTML declared as "text/html; csv" | HTTP 400 | PASS | LMS-062 |
| SEC-036 | Medium | Audit log cannot be evaded | Send a logged action with courseId "x" in the body | The action is still logged | PASS | LMS-033 |
| SEC-037 | Medium | Impersonation sessions are short | Read the expiry of an impersonation token | One hour or less (SRS: temporary token) | PASS | LMS-011 |
| SEC-038 | Medium | Impersonated actions stay out of the personal log | Act through the impersonation token, read /activities/me | The action is hidden and attributed to the admin (FR-AUTH-06) | PASS | LMS-029 |
| SEC-039 | Medium | Student notes stay private from instructors | Read progress and analytics as the course owner | Personal notes are not returned (code comment: "Instructors should not see") | PASS | LMS-030 |
| SEC-040 | High | Peer progress is anonymous | Enable allowPeerProgress, GET /courses/:id/peers as a student | No names or emails (FR-COURSE-11) | PASS | LMS-013 |
| SEC-041 | Medium | Bad regex in public search is handled | GET /marketplace/search?q=( | HTTP 200 or 400, not a 500 | PASS | LMS-032 |
| SEC-042 | Medium | Page size is capped | GET /marketplace?limit=100000 | The returned limit is capped | PASS | LMS-032 |
| SEC-043 | Medium | Bad paging values are handled | GET /marketplace?page=0 and limit=-1 | HTTP 200 or 400, not a 500 | PASS | LMS-032 |
| SEC-044 | High | Draft course landing page is private | GET /marketplace/:id for a draft as a guest | HTTP 404 | PASS | LMS-027 |
| SEC-045 | Medium | Hidden lecture titles stay hidden | GET the landing page as a guest | Hidden lectures are not listed | PASS | LMS-027 |
| SEC-046 | Medium | Landing page hides internal fields | GET the landing page as a guest | No aiBlockedStudents, notificationSettings or adminBlockReason | PASS | LMS-027 |
| SEC-047 | High | Profile update cannot change role | PUT /auth/profile with role admin | Role is unchanged | PASS | - |
| SEC-048 | High | Course update cannot lift an admin block | PUT /courses/:id with isAdminBlocked false on a blocked course | The block stays | PASS | - |
| SEC-049 | Medium | Admins cannot be impersonated | POST /admin/impersonate with another admin email | Refused | PASS | LMS-029 |
| SEC-050 | Low | Login does not reveal blocked status without the password | Log in to a blocked account with a wrong password | HTTP 400 "Invalid credentials" | PASS | LMS-059 |
| SEC-051 | Critical | Role in the Google sign-in body is ignored | POST /auth/google with a new identity and role admin in the body | Refused, and no admin account is created | PASS | - |
| SEC-052 | High | Existing admins can still sign in | Log in at /auth/admin/login and with Google at /auth/admin/google | HTTP 200 for both | PASS | - |
| SEC-053 | Critical | Disguised script links are rejected | Add links using mixed case, spaces, a newline, data: and vbscript: | HTTP 400 for each | PASS | - |
| SEC-054 | High | Normal links still work | Add https, http and no-scheme links, and clear a lecture URL | All are accepted | PASS | - |
| SEC-055 | High | Google sign-in codes never reach the activity log | Sign in with Google, read the log entry | No code stored | PASS | - |
| SEC-056 | Medium | The log keeps useful non-secret fields | Create a broadcast, read the log entry | title and priority are stored | PASS | - |
| SEC-057 | High | Peer progress detail is anonymous | GET /courses/:id/peers/:studentId/progress as a classmate | No real name or email in the response | PASS | - |
| SEC-058 | High | Enrolled students can still use comments | POST and GET lecture comments as an enrolled student | HTTP 201 and HTTP 200 | PASS | - |
| SEC-059 | Medium | A new reset request clears the lock | Lock a code with wrong tries, request a new one, use it | The new code works | PASS | - |
| SEC-060 | High | The device that changes the password stays logged in | PUT /auth/updatepassword, then use the returned token | HTTP 200 | PASS | - |
| SEC-061 | Medium | Impersonation ends when the user changes password | Impersonate a user, change their password, reuse the token | HTTP 401 | PASS | - |
| SEC-062 | Medium | Reset code hash is hidden from admin lists too | Request a reset, then GET /admin/users | No otpHash, otpExpiry or otpAttempts in the response | PASS | - |
| SEC-063 | Medium | Search treats special characters as plain text | GET /marketplace/search?q=.* | HTTP 200 with no results, and normal search still works | PASS | - |
| SEC-064 | High | The landing page still shows public lectures | GET /marketplace/:id as a guest | Public and preview lectures are listed, with price and instructor | PASS | - |
| SEC-065 | Medium | The course list keeps what a user should see | GET /courses as the owner and as an enrolled student | The owner sees their own draft; the student sees their course | PASS | - |
| SEC-066 | High | Impersonated actions are recorded against the admin | Act through an impersonation token, read the global log | The entry belongs to the admin and names the impersonated user | PASS | - |
| SEC-067 | Medium | Course analytics hide private notes | Read recent activity as the course owner after a student saves a note | The note text is not returned | PASS | - |
| SEC-068 | High | Instructors still see student progress status | GET progress detail and progress list as the owner | Lecture statuses are returned | PASS | - |
| SEC-069 | Medium | Admins can still block other users | Block a student as an admin | HTTP 200 | PASS | - |
| SEC-073 | Critical | Students cannot reach instructor or admin routes | Call instructor and admin routes as a student | HTTP 403 every time | PASS | LMS-095 |
| SEC-074 | Critical | Instructors cannot reach admin routes | Call admin routes as an instructor | HTTP 403 every time | PASS | LMS-095 |
| SEC-075 | Critical | An instructor cannot change another instructor's course | Call course routes as an unrelated instructor | Refused every time | PASS | LMS-095 |

## Error handling

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| ERR-010 | High | Start Teaching works with no request body | POST /instructor/become with an empty request | HTTP 200 and the role becomes instructor | PASS | LMS-084 |
| ERR-001 | High | Health check | GET /health | HTTP 200 | PASS | - |
| ERR-002 | Medium | Invalid id is a client error | GET /courses/not-an-id | HTTP 400 or 404 | PASS | LMS-036 |
| ERR-003 | Medium | Malformed JSON is a client error | POST invalid JSON to /auth/login | HTTP 400 | PASS | LMS-035 |
| ERR-004 | Low | Unknown API route returns JSON | GET /api/nope | HTTP 404 with a JSON body (NFR-REL-03) | PASS | LMS-068 |
| ERR-009 | High | The reminder route still works | GET /api/cron/due-reminders on the development API | HTTP 200, not the new 404 | PASS | - |
| ERR-006 | High | Intended error messages reach the user | Send an invalid token in production mode | The real message is returned, not a generic one | PASS | - |
| ERR-005 | Medium | Validation failures are client errors | POST /instructor/course with level "Banana" | HTTP 400 | PASS | LMS-036 |

## Build and dependencies

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| BLD-001 | Critical | Client production build | Run npm run build in client/ | Build succeeds | PASS | - |
| BLD-002 | Medium | Client lint | Run npm run lint in client/ | No lint errors | PASS | LMS-069 |
| BLD-003 | High | Server dependency audit | Run npm audit --omit=dev in server/ | No high or critical advisories | PASS | LMS-020 |
| BLD-004 | High | Client dependency audit | Run npm audit --omit=dev in client/ | No high or critical advisories | PASS | LMS-021 |
| BLD-005 | Critical | No secrets in git history | Search all branches for .env files and live keys | Nothing found | PASS | - |
| BLD-006 | Low | Every import has a declared dependency | Compare client imports with package.json | All imports resolve to declared packages | PASS | LMS-070 |
| BLD-007 | High | Existing team test suites | Run the tests in server/tests with MONGO_URI and MONGO_TEST_URI set to a local database | All tests pass | PASS | - |

## User interface

| ID | Priority | Test case | Steps | Expected result | Result | Bug |
|---|---|---|---|---|---|---|
| UI-001 | Critical | Home and marketplace load for a guest | Open / and /marketplace | Pages render with no console errors | PASS | LMS-071 |
| UI-002 | Critical | Log in through the form | Sign in as a student | Lands on the student dashboard | PASS | - |
| UI-003 | High | Wrong password shows an error | Sign in with a wrong password | An error toast appears (NFR-USE-04) | PASS | - |
| UI-004 | High | Unknown route shows the 404 page | Open /this-does-not-exist | The Not Found page renders (NFR-USE-05) | PASS | - |
| UI-005 | High | Guest is redirected from a protected page | Open /my-learning logged out | Redirected to /login | PASS | - |
| UI-006 | High | Student is kept out of the admin dashboard | Open /admin/dashboard as a student | Redirected away | PASS | - |
| UI-007 | Medium | Theme toggle | Switch between light and dark | Theme changes and survives a reload (NFR-USE-01) | PASS | - |
| UI-008 | Medium | Mobile layout at 375px | Open home and marketplace at 375px | No horizontal page scroll (NFR-USE-02) | PASS | - |
| UI-009 | High | Course landing page | Open a marketplace course | Title, price and curriculum render | PASS | - |
| UI-010 | Critical | Stored script link does not run | A javascript: resource link is clicked by a student in the course | The script does not run and the login token cannot be read | PASS | LMS-003 |
| UI-011 | High | Lecture script link does not run | A lecture has a javascript: resource URL; open it as a student | The link is inert | PASS | - |
| UI-012 | Critical | Admin register page is not public | Open /admin/register as a guest | The page is not available | PASS | LMS-001 |
| UI-013 | Medium | Page title uses the product name | Read the browser tab title | Title says Tenz Learn | PASS | LMS-057 |
| UI-014 | Critical | My Learning lists enrolled courses | Log in as an enrolled student, open /my-learning, search, then click View Course Lectures | The course is listed with its category and level, search filters it, and the link opens the course | PASS | LMS-072 |
| UI-015 | High | Marketplace language filter | Open Advanced Filters, choose Sinhala, apply | Only Sinhala courses are listed | PASS | - |
| UI-016 | High | New lecture is announced once | As an instructor on a published course, save one lecture normally and one with a custom announcement | One broadcast each, with a direct link, and the chosen priority is kept | PASS | - |
| UI-017 | High | Category list shows every category | Open the marketplace category filter | All saved categories show | PASS | - |
| UI-018 | High | Admin pages load cleanly | As an admin, open every dashboard tab and the activity log | All render with no console errors | PASS | LMS-073 |
| INT-001 | Critical | Full user journey | Register, log in, browse, enroll, open a lecture, complete it, then take a quiz | The whole journey works with no console or API errors | PASS | - |
| UI-019 | High | Menu on narrow screens | Open the site at 375px and open the menu | All links for the role show, with no horizontal scroll | PASS | LMS-094 |
| UI-020 | Medium | Footer has no dead links | Read the footer and click its links | Current year, X logo, and every link goes to a real place | PASS | LMS-075, LMS-078, LMS-082 |
| UI-021 | High | Legal pages load | Open /terms and /privacy | Both pages show | PASS | - |
| UI-022 | High | My Learning shows only enrolled courses | Open My Learning as a student and an instructor | Enrolled courses with progress and status, and no create or created courses | PASS | LMS-087, LMS-099, LMS-102, LMS-109 |
| UI-023 | Medium | Enrolled courses are marked | Open the marketplace as an enrolled student and click a card | Enrolled badge and Go to Course, and the whole card is clickable | PASS | LMS-088, LMS-110 |
| UI-024 | Medium | AI chat is removed | Look for the AI button, tabs and links, then open /ai-chat | None remain, and /ai-chat shows 404 | PASS | LMS-086, LMS-092 |
| UI-025 | Medium | Instructor is the only name for the role | Read the login, register and course pages, then open /teacher/login | No Teacher wording, and the old link redirects | PASS | LMS-093 |
| UI-026 | High | Bank slip payment | Send a slip as a student, then approve it as the instructor | The slip waits for approval, then the student gets access | PASS | LMS-090 |
| UI-027 | Medium | Image uploads | Upload a profile picture and a course thumbnail | Both show, with no URL field | PASS | LMS-091, LMS-096 |
| UI-028 | Medium | Categories come from the backend | Add a category as an admin and open the course form | The new category is offered, and the navbar has no Category menu | PASS | LMS-076, LMS-097, LMS-107 |
| UI-029 | Medium | Coupon date can be changed | Edit a coupon in dark mode | The calendar icon shows and the date can be changed | PASS | LMS-098, LMS-108 |
| UI-030 | High | Instructor Center links and prices | Click Edit on a course and read the prices | The course opens, and prices show Rs. | PASS | LMS-100, LMS-101 |
| UI-031 | Medium | Course sections and filters | Use the status and importance filters on a course | Each filter works alone, sections show both labels, and Critical is not used | PASS | LMS-085, LMS-105, LMS-106 |
| UI-032 | Medium | Discussion when not enrolled | Open a preview lecture discussion without enrolling | A message explains why, instead of the comment box | PASS | LMS-089 |
