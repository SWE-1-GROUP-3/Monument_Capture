# Monument Capture — Finalized MVP Rules and Decisions

Decision date: November 17, 2026  
Project: SWE Class, Group 3  
Repository: https://github.com/SWE-1-GROUP-3/Monument_Capture

Status: Agreed requirements for implementation. This document records decisions; it does not claim the repository already implements them.

## Subsequent step 3 confirmation

- Database/photo hosting and authentication provider/session mechanism remain pending team selection.
- Preserve the location eligibility accepted at submission after monument coordinate/radius edits. Approval still checks current active status and current holds, without another player GPS reading or a new freshness check.
- The [backend, schema, and API contract](backend-schema-api-contract.md) defines the implementation proposal, including accepted location snapshots, naming conventions, future GPS timestamp handling, upload cleanup, retries, and migration order. Technical defaults are distinct from the agreed gameplay requirements and remain subject to team review.
- The backend currently has only a health endpoint; the documented gameplay APIs are not implemented yet.

## Latest confirmations — November 17, 2026

| Area | Decision |
| --- | --- |
| Backend | Keep Spring Boot with Java; the existing scaffold uses Java 17. |
| Database | Keep PostgreSQL with PostGIS. |
| Database/photo hosting | Supabase is proposed for both, pending team confirmation. RDS/S3 was the original plan; no hosting switch is confirmed yet. |
| Authentication | Pre-created player/moderator accounts with email/password login. Public sign-up and password reset are outside MVP; auth provider/session mechanism still to choose. |
| Monument management | Add, edit, activate, and deactivate stay in MVP. Seed the prototype’s existing monuments. |
| Player history | Keep submitted captures with monument, submission time, status, and rejection reason. Unsubmitted drafts stay separate. |
| Inactive monuments | Hidden from player map/discovery. Existing captures remain in history; pending captures stay pending. Moderators may reject with a reason, but cannot approve until reactivation. |
| Capture radius | Configurable per monument; default 100 meters. Check before the photo flow and at submission. |
| GPS accuracy | 50 meters or better; otherwise ask the player to retry. Distance is checked separately. |
| Location freshness | At submission, reading must be no more than 30 seconds old on backend receipt. |
| Photos | Camera/gallery; JPEG, PNG, or WebP; up to 10 MB each. Validate before upload and on the backend. |
| Reports | New York time (America/New_York), grouped/filtered by submission date; count only approved captures, including repeats. |
| Refresh | Every 15 seconds while active, after relevant actions, and on page return. Countdown updates locally every second; backend always checks current state. |
| Upcoming sprint | Local frontend/backend execution with shared database/storage connections is sufficient. Public deployment is deferred for this sprint. |

Detailed references: [Current MVP Requirements](https://docs.google.com/document/d/1H2VGk9Opk9Qfs1-GMGAfWHScByrwF-YYS534Mgal1w0/edit) · [Current MVP Design](https://docs.google.com/document/d/1Fl15HPBlyXUN6gXmj8ybehIFlhytORZeH_qnRWcB1TI/edit).

Remaining implementation details: authentication provider/session mechanism, final schema/API names and migrations, future-timestamp handling, abandoned-upload cleanup, and later deployment hosting. Supabase requires team confirmation. This record is based on Sprint 1, Sprint 2, and the current discussion; the later revised-stories draft is excluded.

## 1. Scope and roles

- Two roles: player and moderator.
- Former coordinator responsibilities are merged into moderator. No separate coordinator role or monument assignments are needed.
- Moderators can view all monuments, manage the catalog, review submissions, and view visit counts.
- Challenges, challenge targets, and their photo deadlines are stretch features.
- Camera capture and gallery uploads are both allowed.

## 2. Visit counts

- A monument visit is counted only when a capture is approved.
- Repeat approved captures by the same player each count as another visit.
- Pending and rejected captures do not count.
- Hold expiry does not remove a historical visit.

## 3. Drafts and capture submission

- Before submission, an attempt is a temporary frontend draft.
- A player cannot have two in-progress drafts for the same monument simultaneously within the frontend.
- Opening the same monument again resumes its existing draft.
- Cross-device enforcement of drafts is outside MVP scope.
- Do not create a database capture record merely because a player starts the flow.
- Create a pending capture only after successful photo submission and backend validation.
- No initial monument-photo submission deadline is required.
- The database must prevent more than one pending capture for the same player and monument.
- A rejected attempt is final; a later attempt creates a new capture.

Persisted lifecycle: pending → approved OR pending → rejected.

No persisted in_progress or expired capture status is required for MVP. Hold expiry is separate from capture status.

## 4. Location and availability

- Check location before entering the capture flow for immediate feedback.
- Obtain a fresh device location when the player submits.
- The player must still be within the monument's capture radius at submission.
- The backend validates submitted coordinates, GPS accuracy, location timestamp, and current monument availability.
- Refuse submission if the monument is held or inactive at submission time, even if it was available when the draft began.
- Capture radius is configurable, default 100 meters. Require GPS accuracy of 50 meters or better; at submission require a reading no more than 30 seconds old when received by the backend.
- Gallery uploads remain allowed; location eligibility concerns the player at submission and does not establish when a gallery image was taken.

## 5. Approval and competing captures

- The moderator queue displays oldest submissions first.
- The first successful approval wins, rather than necessarily the earliest submission.
- Approval starts a one-hour hold using server time.
- In the same transaction, automatically reject every other pending capture for that monument.
- Record those automatic rejections as system decisions, with a reason visible to affected players.
- Do not attribute an automatic rejection to a moderator who unsuccessfully attempted approval.
- Suggested system reason: "Another capture was approved for this monument before yours was reviewed."
- Manual rejection requires a reason; an approval reason is optional.
- Other players may make new attempts after the hold expires, subject to current eligibility checks.

## 6. Concurrent approval

Use a database transaction and SELECT ... FOR UPDATE on the corresponding Monument row.

Expected sequence:

1. Authenticate the moderator and identify the monument.
2. Acquire its row lock.
3. Re-read the capture's current status and monument availability.
4. If valid, approve the selected pending capture, record its review and one-hour hold, and automatically reject other pending captures for that monument.
5. Commit all changes together and release the row lock.

If a second moderator tries approving a competing capture concurrently, their operation waits for the monument lock. After the first transaction commits, it sees the competing capture is already rejected and refuses the stale approval.

The losing submission remains rejected; it does not return to pending.

Suggested warning: "Approval unsuccessful: another capture was approved first. This submission was automatically rejected."

Implementation note: submission and other availability-changing writes must coordinate with the same monument locking protocol, so a submission cannot slip into pending during the approval transaction's automatic rejections.

## 7. Hold expiry

- A hold lasts one hour from successful approval.
- Server timestamps are authoritative; the frontend displays the countdown.
- After expiry, the monument becomes available again if active; inactive monuments remain hidden and unavailable.
- The original capture remains approved, preserving history and visit counts.
- No expired capture status is needed to represent an expired hold.

## 8. Data implications

The reviewed prototype uses local TypeScript objects, not an implemented shared database schema. These are requirements for the upcoming schema:

| Area | Required support |
| --- | --- |
| Users | Player/moderator role and real authenticated identity |
| Monuments | Location, capture radius, active status; no coordinator assignment |
| Captures | Player, monument, shared photo reference, submitted location metadata, server submission time, pending/approved/rejected status |
| Reviews/decisions | Manual versus system decision, reason, decision time, moderator identity only where applicable |
| Ownership | Approved capture associated with a one-hour hold; history remains after expiry |
| Constraints | At most one pending capture per player/monument; valid relationships and location values |

The exact ownership representation and final SQL schema are implementation choices, not finalized by this decision record.

## 9. Acceptance checklist

- [ ] Moderator can see approved-capture visit totals for every monument; repeat approvals count.
- [ ] Reopening the same monument resumes the frontend draft without creating another database capture.
- [ ] Failed or abandoned photo submission creates no capture record.
- [ ] Duplicate pending submissions by the same player/monument are prevented, including concurrent requests.
- [ ] Out-of-range, stale/inaccurate location, held, and inactive submissions are refused.
- [ ] Camera and gallery submission paths work.
- [ ] Approval creates exactly one one-hour hold and automatically rejects competing pending captures.
- [ ] Automatic rejections are labeled as system decisions with a visible reason.
- [ ] Two simultaneous moderators cannot approve competing captures for the same monument.
- [ ] The losing moderator sees an unsuccessful-approval warning and current rejected status.
- [ ] Expiry restores availability without changing the approved capture or historical visit count.

## 10. Changes from earlier design

| Earlier design | Final MVP decision |
| --- | --- |
| Separate coordinator role | Responsibilities merged into moderator |
| ChallengeTarget workflow | Stretch |
| Persisted in-progress attempts and photo expiry | Frontend drafts; no photo submission deadline |
| Unique in-progress attempt in database | Frontend draft restriction plus database uniqueness for pending submissions |
| Conflicting captures remain pending after another approval | System rejects all competing pending captures atomically |

