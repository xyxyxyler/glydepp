












GLYDE
Commute, Simplified

UI/UX Screen Specification Document

Product, Interaction & Functional Requirements


Version 1.0  |  For Design & Development Use




1. Document Overview
This document defines the complete functional and interaction requirements for every screen in the Glyde platform. It covers three distinct applications: the Passenger App, the Driver App, and the Bus Owner Dashboard and HQ / Admin Dashboard.
1.1 Applications Covered
	•	Passenger Mobile App — for individual commuters booking rides
	•	Driver Mobile App — for drivers managing trips and passengers
	•	Bus Owner Dashboard — for fleet owners managing buses and drivers
	•	HQ / Admin Dashboard — for Glyde's internal operations team

1.2 User Roles
Role
Application
Key Capabilities
Passenger
Passenger App
Register, book rides, make payments, track buses, manage tickets
Driver
Driver App
Manage trips, scan QR tickets, view route data, report SOS
Bus Owner
Owner Dashboard
Manage fleet, manage drivers, view analytics
HQ Admin
Admin Dashboard
System-wide oversight, demand management, incident response

2. Passenger Mobile App
The Passenger App is the primary interface for working professionals using the Glyde commute service. It allows users to register, find available buses, book and pay for seats, generate QR tickets, track their bus in real time, and manage their profile and payments.
2.1 Onboarding Flow
Screen: Splash Screen
Trigger: App is opened for the first time or after a cold launch.
	•	Display the Glyde logo with a subtle loading animation.
	•	No user interaction is required on this screen.
	•	After the animation completes, automatically navigate to the Landing Screen.
	•	Duration: brief — only as long as needed for app initialisation.

Screen: Landing Screen
Trigger: First launch after splash, before any account exists.
	•	Display a minimal, focused layout.
	•	One primary call-to-action: a 'Get Started' button.
	•	Tapping 'Get Started' navigates to the Registration & Verification Screen.
	•	No secondary actions or navigation elements on this screen.
Screen: Registration & Verification
Trigger: User taps 'Get Started' on the Landing Screen.
Signup Options (user chooses one):
	•	Phone number
	•	Email address
	•	Social login: Apple, Google, Facebook

Phone Number Flow:
	•	The user selects country code from a dropdown list.
	•	The user enters their phone number.
	•	The system sends a one-time password (OTP) via SMS.
	•	The user enters the OTP into a set of verification code input boxes.
	•	The system validates the OTP.

Email Flow:
	•	The user enters their email address.
	•	The system sends a verification code to the email.
	•	The user enters the code into verification input boxes.
	•	The system validates the code.

Social Login Flow:
	•	The user selects a provider (Apple, Google, or Facebook).
	•	System redirects to provider's authentication.
	•	On success, the system retrieves basic profile data.
	•	If phone verification is also required, prompt after social login.

States & Validations:
	•	Show inline error if OTP is incorrect or expired.
	•	Provide a 'Resend Code' option after a countdown timer expires (e.g., 60 seconds).
	•	On successful verification, automatically proceed to the Profile Setup Screen.
Screen: Basic Profile Setup
Trigger: User successfully completes verification.
Input Fields (all required):
	•	First Name
	•	Last Name
	•	Residential Area — where the user lives (free text or area picker)
	•	Work Location — where the user works (free text or area picker)
	•	Name of company

Display a helper message explaining why residential and work location data is collected. Suggested text: 'This information helps us optimize bus allocation and routing for you.' The message should be friendly and non-intrusive.

Validations:
	•	All fields are mandatory before proceeding.
	•	Tapping 'Next' with empty fields should highlight the unfilled fields with an error indicator.
	•	On successful completion, navigate to the Terms & Conditions Screen.
Screen: Terms & Conditions
Trigger: User completes profile setup and taps 'Next'.
	•	Display Glyde's full terms and conditions text in a scrollable area.
	•	User must actively accept the terms (e.g., via a checkbox or accept button) to proceed.
	•	The 'Accept' or 'Continue' action must only activate once the terms have been scrolled or acknowledged.
	•	On acceptance, proceed to the Permissions Screen.
Screen: Permissions (Notifications & Location)
Trigger: User accepts Terms & Conditions.
This screen (or modal overlay) prompts the user to grant two device permissions:
	•	Push Notifications — required for real-time alerts about bus arrival and trip updates.
	•	Location Services — required to show live bus positions and determine user proximity.

Behavior:
	•	Each permission is requested using the native OS prompt.
	•	If the user grants both, proceed directly to the Homepage.
	•	If the user skips location permission, show a persistent modal or banner on the Homepage that reads: 'Enable location services to view nearby buses and accurate routes.' The modal should include a button to open device settings.
	•	Notifications can be skipped; the app still functions without them, but with reduced alert capability.

⚑  NOTE: After onboarding is complete, the app should not show the onboarding flow again on subsequent launches. The user is taken directly to the Homepage or their active trip state.




2.2 Homepage
Screen: Homepage — Default State
Trigger: User completes onboarding or opens the app after initial setup.
Content:
	•	Full-screen live map as the primary visual element.
	•	Real-time bus markers displayed on the map, representing all available buses on active routes. Bus markers should move to reflect live GPS positions.
	•	A bottom sheet (drawer) component anchored at the bottom of the screen.

Bottom Sheet — Collapsed State:
	•	Displays a prompt: 'Where are you going?' or 'Where to?'
	•	Acts as the trigger to open the Trip Creation Flow.
	•	Users can tap the prompt or drag the sheet upward to expand it.

Bottom Sheet — Expanded State:
	•	Can be dragged to half-screen or full-screen.
	•	When half-screen: the live map remains visible in the background.
	•	When full-screen: the sheet covers the map and shows the full trip search interface.

Active Trip State (when user has a booked ride):
	•	The homepage bottom sheet transforms to show an active trip card.
	•	Displays the user's upcoming pickup and drop-off location.
	•	Shows live tracking of the assigned bus on the map.
	•	Provides a quick-access button or tappable element to open the QR ticket.
2.3 Trip Creation Flow
Screen: Trip Search / Where To
Trigger: User taps 'Where to?' or expands the bottom sheet on the Homepage.
Pickup Location Input:
	•	Default: 'Current location' (uses device GPS).
	•	Additional options: saved locations and recent history shown as a list below the input.
	•	User can type to search for a specific pickup address.

Drop-off Location Input:
	•	Displays saved destinations and recent history.
	•	User can type to search for a drop-off address.

Multi-Stop Feature:
	•	A '+' (plus) icon is displayed next to the pickup input field.
	•	Each tap of the '+' adds a new stop input field below the existing ones.
	•	Each additional stop is treated as a separate person's journey (for group or third-party bookings).
	•	The total fare shown dynamically updates based on the number of stops added and their distances.
	•	Each stop input behaves the same as the drop-off input (history, search).

Route Confirmation:
	•	As soon as a pickup and at least one drop-off are selected, the system automatically generates a route.
	•	The system immediately shows: a list of available buses for the route, estimated fare, and estimated travel time.
	•	No manual 'Search' button is required — confirmation is automatic after inputs are complete.

Validation:
	•	If the selected pickup point has already been passed by all available buses, the booking is blocked and a message is shown.
	•	If no buses are available for the selected route, display a 'No buses available' state.

Screen: Available Buses List Trigger: Pickup and drop-off locations are confirmed and buses are available.
Each bus option is displayed as a horizontal card containing:
	•	Bus icon/image on the left
	•	Estimated arrival time
	•	Passenger capacity icon with number of seats available
	•	Fare displayed on the right
 
Behaviour
	•	Tapping a bus card proceeds to the seat selection screen
	•	Selected bus card is visually highlighted with a bordered container
	•	If a bus has very limited seats remaining, display a clear indicator such as: 
	•	“Last seats available”
	•	“Almost full”
Screen: Seat Selection
Trigger: User selects a bus from the available list.
	•	Display a visual grid representing the seat layout of the selected bus.
	•	Available seats are interactive and selectable.
	•	Occupied or reserved seats (that conflict with the user's route segment) are shown as disabled/greyed out.
	•	User taps one or more available seats to select them.
	•	If the user has added multiple stops (third-party bookings), they can select more than one.
	•	Selected seat(s) are visually highlighted.
	•	A summary showing the selected seat(s) and fare is displayed.
	•	A 'Proceed to Payment' action is available once at least one seat is selected.

⚑  NOTE: Seat availability is based on route-segment logic. A seat already reserved by Passenger A from Stop 1 to Stop 3 may still appear available to Passenger B who is boarding at Stop 3. The system handles this automatically — the seat grid should reflect segment-aware availability, not just total occupancy.
2.4 Payment Flow
Screen: Payment
Trigger: User selects seat(s) and taps 'Proceed to Payment'.
Payment Methods Available:
	•	In-app Wallet — uses the user's pre-funded Glyde wallet balance.
	•	Mobile Money (MoMo) — integrates with MTN MoMo or similar.
	•	Card — debit or credit card payment.

Displayed Information:
	•	Trip summary: route, pickup, drop-off, seat number(s), Driver name, bus number.
	•	Fare breakdown per seat and total.
	•	Selected payment method.

States:
	•	Idle: user selects payment method and confirms.
	•	Processing: system is processing the payment.
	•	Success: payment confirmed — navigate to Payment Success Screen.
	•	Failure: display error message with retry option.
Screen: Payment Success / Confirmation
Trigger: Payment is successfully processed.
	•	Display a confirmation message indicating payment was successful.
	•	Show a summary of the booked trip.
	•	Provide a prominent 'View Ticket' button.
	•	Tapping 'View Ticket' navigates to the Ticket Screen.
2.5 Ticket & Active Trip
Screen: Ticket View
Trigger: User taps 'View Ticket' after payment, or opens the ticket from the Homepage active trip card.
Displayed Information:
	•	QR Code — large, scannable, positioned prominently.
	•	Ticket serial number / Ticket ID.
	•	Bus number.
	•	Seat number.
	•	Pickup location.
	•	Drop-off location.
	•	Scheduled boarding time.
Behavior:
	•	The QR code is the primary interaction element.
	•	Tapping the QR code expands it to a full-screen view for easy scanning.
	•	The ticket remains accessible from the Homepage active trip card until the bus departs the pickup point.
NB: Tickets are created based on the number of seats selected, even though payment is made as a single transaction. Each generated ticket is shareable via a link. When the link is opened, it displays the ticket details, including a scannable code and ticket features within the app.
Screen: Active Trip — Pre-Boarding State
Trigger: Booking is confirmed and the bus has not yet arrived at the pickup point.
	•	The homepage bottom sheet shows the active trip card.
	•	Displays pickup location and drop-off location.
	•	Live map shows the bus moving toward the pickup point.
	•	QR code is accessible via a tap on the active trip card.
	•	The user receives a notification when the bus is approaching the pickup point.
Screen: Active Trip — Boarding State
Trigger: User is at the pickup point and QR code is scanned.
On Successful QR Scan:
	•	The QR code is removed from the prominent display.
	•	The ticket details (serial, seat number, etc.) are cleared from the main view.
	•	The screen transitions to the In-Trip Experience State.
	•	Only pickup location, drop-off location, and the live map remain visible.

On Failed QR Scan
While boarding the bus, the passenger presents their QR code to the scanner device. The scanner may either:
	•	Be mounted on the bus as part of a turnstile system, or
	•	Be operated by a bus conductor to facilitate ticket validation.

If the QR scan fails, the scanning device displays an error state and provides an option to manually enter or validate the passenger’s Ticket ID instead.
If the Ticket ID is successfully validated, the passenger is granted entry. Otherwise, access is denied, and the scanner displays a message indicating that:

	•	The ticket does not exist, or
	•	The ticket has already been used.



Screen: In-Trip Experience
Trigger: QR code has been successfully scanned and the user is on the bus.
	•	Full-screen live map showing the bus's current position and route.
	•	No QR code or ticket details shown.
	•	Passenger can see the route progress and remaining stops.

Notifications during the trip:
	•	In-app notification sent when the bus is approaching the user's drop-off point.
	•	Second in-app notification sent when the bus arrives at the drop-off point.

Trip Completion:
	•	Once the bus arrives at the drop-off point and the passenger has alighted, the trip is automatically ended.
	•	The app reverts to its default Homepage state.
	•	The trip is recorded in the user's Activity history.
2.6 Payments Screen
Accessible via the bottom navigation tab labelled 'Payments'.
Displayed Content:
	•	In-app wallet balance, displayed prominently.
	•	Option to add funds to the in-app wallet.
	•	List of saved payment methods (MoMo numbers, cards).
	•	Options to add or remove a MoMo number.
	•	Options to add or remove a card.

Interactions:
	•	Tapping 'Add Funds' or 'Fund Wallet' opens a flow to add money via MoMo or card.
	•	Tapping 'Add Payment Method' opens a form to link a new MoMo number or card.
	•	Tapping a saved method may allow the user to set it as default or remove it.
2.7 Activity Screen
Accessible via the bottom navigation tab labelled 'Activity'.
Displayed Content:
	•	A chronological list of all trips the user has taken.

Per Trip Entry, Display:
	•	Route (e.g., Madina → Accra Central)
	•	Date and time of the trip
	•	Fare paid
	•	Trip status (Completed, Cancelled, Missed)

Interactions:
	•	Tapping a trip entry may expand it to show more detail.
2.8 Account Screen
Accessible via the bottom navigation tab labelled 'Profile'.
Displayed Content:
	•	User's name, phone number, and email address.
	•	Identity verification status.
Settings Available:
	•	Language preferences
	•	Privacy settings
	•	Notification preferences
	•	Logout
2.9 Navigation Structure (Passenger App)
Tab
Label
Content
1
Home
Live map and trip planner bottom sheet
2
Payments
Wallet balance, payment methods, fund wallet
3
Activity
Trip history with statuses
4
Account
User details, Help and Support, FAQs, Promotions,Verification, Settings, and Logout

NB :If an active promotion or ticket discount is available, it should be displayed as a ticket card/coupon card with ticket stub edges (semicircular cutouts on the sides) on the homepage.
The card should contain:
	•	Discount or offer title
	•	Expiry/validity information
	•	Promotional icon/indicator
	•	Dismiss/close action
Clicking the promotion card should navigate the user to a Promotions section/page that lists all promotions and discounts available to the user.






2.10 Edge Cases & Special Scenarios (Passenger App)
Scenario
Expected System Behaviour
User does not scan QR within the allowed pickup window
The system marks the user as absent, cancels the booking, and releases the seat for reassignment.
User has used all missed-booking deferments (max 2)
The prepaid fare is not refunded. The ticket becomes invalid at the end of day.
Ticket shared via link to a third party
A time-bound URL is generated. Recipient presents QR from link. After scanning, QR is disabled and the link updates to 'On Trip' status. After drop-off, the link is fully invalidated.
Bus appears full but user's journey is non-overlapping
The system still allows the booking based on segment-aware seat logic. The seat grid should reflect this availability.
Location permission denied by user
Persistent modal shown on Homepage prompting user to enable location in device settings. The app remains functional but map accuracy is reduced.
QR code scanner fails at boarding
A manual onboarding fallback code is available for the user to present verbally. The driver enters this code as an alternative to QR scanning.
No buses available on selected route
Display a clear 'No buses available' state with the option to try a different time or route.
Last bus alert
When the bus displayed is the last available on the route, this is flagged clearly in the bus listing.
Payment failure
Show error with descriptive message. Allow users to retry or choose a different payment method. Seat reservation is held briefly before being released.


3. Driver Mobile App
The Driver App is used by bus drivers to manage their trips, view route and boarding information, and access analytics. The app is designed for tablet-first use but must also work on mobile screens.

3.1 Driver Onboarding Flow

Screen: Splash Screen
	•	Identical in structure to the Passenger App splash screen.
	•	Displays the Glyde logo with a loading animation.
	•	Auto-proceeds to the Landing Screen.
Screen: Landing Screen
	•	Displays a minimal layout with a single 'Get Started' button.
	•	Tapping navigates to the Driver Registration & Verification Screen.
Screen: Driver Registration & Verification
Same verification options as the Passenger App:
	•	Phone number (OTP via SMS)
	•	Email (verification code)
	•	Social login: Apple, Google, Facebook
Verification logic is identical to the Passenger App.
Screen: Driver Profile Setup
Trigger: Successful verification.
Required Input Fields:
	•	First Name
	•	Last Name
	•	Date of Birth
	•	Residential Area
	•	Password
	•	Ghana Card Number
	•	Driver's License Number
	•	Invite Code (provided by their Bus Owner)
	•	Profile photo upload
After Submission:
	•	The system performs a liveness test — the driver is guided through a real-time facial verification step.
	•	The backend validates the facial image against the Ghana Card and license number.
	•	On success, the driver's status is set to 'Pending Approval' linked to the Bus Owner who issued the invite code.
	•	The driver cannot access the full dashboard until the Bus Owner approves their account.
Screen: Terms & Conditions and Permissions
	•	Identical flow to the Passenger App.
	•	The driver must accept terms before proceeding.
	•	Prompted to enable Push Notifications and Location Services.
	•	Fallback modal if location is skipped.
Screen: Login Screen
For returning drivers who already have an account.
	•	Input: email or phone number.
	•	Input: password.
	•	Standard login flow with error handling for wrong credentials.
3.2 Driver Dashboard — Overview Tab
This is the main working screen for the driver. It is structured in a card-based modular layout.
Global Header (persistent across all tabs)
	•	Left: Glyde logo.
	•	Center: Navigation tabs — Overview (default active), Analytics, SOS.
	•	Right: Notifications icon (operational alerts only), Driver profile (image, name, role).
	•	Notifications: restricted to route and operational alerts — not promotional content.
	•	Profile dropdown: Account, Settings, Logout.
SOS Tab Behaviour
	•	When the driver taps 'SOS', they are prompted to describe the issue.
	•	Driver confirms the submission.
	•	Confirming SOS automatically ends the active trip.
	•	The SOS triggers a high-priority alert to HQ.
Greeting Section
	•	Displays a time-appropriate greeting (e.g., 'Good morning,').
	•	The driver's name is shown prominently in bold.
Action Control Strip
Set Route:
	•	The driver opens a form or dropdown to configure the trip.
	•	Required inputs: Bus number, Start point address, End point address.
	•	This must be completed before the 'Start Trip' button activates.

Approval Status Indicator:
	•	Displays the driver's current approval status: Approved, Pending, or Rejected.
	•	If status is Pending or Rejected, the driver cannot start a trip.


Start Trip / End Trip (Dynamic CTA Button):
	•	'Start Trip' becomes active only after the route (start and end points) is set.
	•	Tapping 'Start Trip' initiates the active trip.
	•	'End Trip' appears once a trip is active.
	•	Trips automatically end when the bus reaches the final destination.
	•	Driver can manually tap 'End Trip' early (e.g., if all passengers have alighted before the final stop and no further pickups are needed).
	•	After manually ending a trip, the driver can view demand data, reset the route, and begin a new trip.
Card: Daily Trip Summary
Displays:
	•	Current date.
	•	Total trips completed today.
	•	Total passengers transported today.
Card: Demand Heat Area
Displays:
	•	The highest-demand pickup location in the area.
	•	A suggested route based on that demand.
	•	Estimated number of potential passengers.
Card: Vehicle & Route Status
Displays:
	•	Vehicle make, model, and plate number (e.g., Toyota Coaster – GR-1234-24).
	•	Current route (e.g., Accra → Kasoa).
	•	Bus Status indicator: Active, or Inactive.
	•	Passenger metrics: Scanned (Boarded), Expected, Pending.
	•	Updates in real time as QR codes are scanned.
Card: Current Trip Timeline
Displays a timeline of the current trip:
	•	Departure stop with time.
	•	All intermediate stops with scheduled times.
	•	Arrival stop with time.
	•	Trip duration.
	•	Next stop name, ETA(Estimated Time of Arrival), and number of stops remaining.

Behaviour:
	•	Automatically updates via GPS data.
	•	When approaching a pickup or drop-off point, a modal must appear alerting the driver, accompanied by an audio alert.
	•	System-generated voice alerts: 'Approaching [Stop Name]' and 'Arrived at stop'.
	•	Tapping the card expands it to show full stop breakdown, boarding count per stop (expected vs. scanned), and any delay indicators.

Card: Map View
	•	Displays the current route as a polyline.
	•	Current vehicle position shown as a moving marker.
	•	Next stop is highlighted.
	•	Tapping the map card expands it to a full-screen map view.
3.3 Driver Dashboard — Analytics Tab
Metrics Displayed:
	•	Total Trips Completed — a count with the most frequently driven route noted.
	•	Total Passengers Transported — a cumulative count.
	•	Driver Rating — percentage score and a badge indicator.
Driving History View
Hierarchy:
	•	Level 1: Month (e.g., January 2026) — bold, larger font, sticky header while scrolling.
	•	Level 2: Day (e.g., 1 Jan) — medium emphasis, separated by a subtle divider.
	•	Level 3: Trip row — each row is a single completed route.

Per Trip Row Displays:
	•	Route (e.g., Accra → Dodowa) — bold.
	•	Bus number.
	•	Passenger count.
	•	Status: Completed or Cancelled.
A single day may contain multiple trip rows.
3.4 Edge Cases & Scenarios (Driver App)
Scenario
Expected System Behaviour
Driver's account is Pending Approval
'Start Trip' button remains disabled. Status indicator shows 'Pending Approval'.
QR code scan fails at boarding
Failure overlay shown. The driver cannot manually add the passenger. Fallback: manual onboarding code is available for exceptional cases.
Driver manually ends trip early
The system allows drivers to view demand maps, reset routes, and begin a new trip.
SOS triggered mid-trip
The driver enters the issue description and confirms. Trip is automatically ended. HQ is alerted immediately.
Bus approaches a pickup/drop-off point
A modal appears with an audio alert: 'Approaching [Stop Name]'.
Passenger does not board within the time window
The system automatically handles the missed booking; the driver does not need to take action.
Data transfer on bus breakdown (SOS)
System supports SOS mechanism to transfer passenger data to a replacement bus (to be specified in technical documentation).
QR Scan System (Can be a hand held device/ Installed in the bus )
	•	The driver activates the scanner to scan a passenger's QR ticket.
	•	Success state: 'Passenger Verified' message displayed. Boarding count updates automatically. Audio confirmation sound. Device vibration.
	•	Failure state: 'Invalid or Already Used Ticket' message. Audio alert. Device vibration.
	•	Overlay auto-dismisses after 2–3 seconds.
	•	Drivers cannot manually override the scan result or add passengers manually.
4. Bus Owner Dashboard
The Bus Owner Dashboard is used by owners of buses registered on the Glyde platform. It allows them to register and manage their fleet, manage and approve drivers, and monitor live bus performance and revenue.
4.1 Bus Owner Onboarding
Registration Requirements:
	•	Bus owner's personal details.
	•	Registered bus number(s).
	•	Bus name or fleet identifier.
The exact onboarding steps for bus owners are to be detailed separately, but follow a similar verification pattern to the Driver App.
4.2 Global Header (Owner Dashboard)
	•	Left: Glyde logo.
	•	Center tabs: Overview, Active Buses (dashboard per bus).
	•	Right: Notifications (operational alerts only), Owner profile with dropdown (Account, Settings, Logout).
4.3 Greeting Section
	•	Time-based greeting (e.g., 'Good morning,').
	•	Owner name displayed prominently.


4.4 Driver Management
Screen: Manage Drivers
Analytics Carousel (top of screen, 4 cards):
	•	Total Drivers: all drivers linked to the owner's account.
	•	Active Drivers: fully verified and eligible for trips.
	•	Inactive Drivers: manually deactivated or suspended.
	•	Pending Approvals: drivers awaiting owner verification.
Add Driver Flow
Step 1 — Owner adds driver details:
	•	Input: First Name, Last Name, Phone Number.
	•	The owner clicks 'Generate & Send Invite Code'.
	•	The system generates a unique invite code and sends it to the driver via SMS.
	•	SMS contains: invite code, app download link, and an expiry notice (48 hours).

Step 2 — Driver onboards using the code:
	•	The driver downloads the app and enters the invite code during signup.
	•	The system validates the code (correct and not expired).

Step 3 — Driver completes verification:
	•	Driver submits profile, Ghana Card, license, and liveness check.
	•	Status becomes 'Pending Approval' in the owner's dashboard.

Step 4 — Owner reviews and approves:
	•	The owner sees the driver in the management table.
	•	The owner can Approve (driver becomes Active) or Reject.

Driver Management Table
Column
Description
Driver Name
First and last name.
Phone Number
Number used for the invitation.
Onboarding Status
Invite Sent / Pending Approval / Active / Inactive / Invite Expired.
Last Active
Date and time of last login or completed trip.
Actions
Approve (Pending only), Edit, Deactivate/Activate toggle.



Invite Expiry Logic
	•	Within 48 hours: Status is 'Invite Sent'. 'Resend Invite Code' button is active. Optional countdown timer shown.
	•	After 48 hours: Status changes to 'Invite Expired'. 'Resend Invite Code' button remains active. Clicking it invalidates the old code, generates a new one, and starts a new 48-hour timer. 'Resend' button disappears/disables once a new invite is active.
4.5 Fleet Management
Screen: Manage Fleet
Analytics Carousel (top of screen, 4 cards):
	•	Total Vehicles: all buses registered under the owner.
	•	On-Road: buses currently active on a trip.
	•	Maintenance / Inactive: buses out of service.
	•	Unassigned Fleet: buses not yet linked to a verified driver or route.
Add New Fleet Form
Input Fields:
	•	Fleet Owner / Partner: dropdown to select the registered owner.
	•	Vehicle Plate Number: unique identifier.
	•	Vehicle Model / Capacity: e.g., Toyota Coaster — 30 Seater.
	•	Assigned Route: the specific route this vehicle serves.
	•	Submit: 'Register Vehicle' button.

Fleet Management Table
Column
Description
Vehicle ID / Plate
e.g., GHA-5524
Fleet Owner
Name of the registered owner or partner.
Capacity
Number of seats (e.g., 30).
Assigned Driver
Name of the driver linked to this bus.
Status
Active, Inactive, Maintenance.
Actions
Edit, Track (opens map view), Assign Driver (if unassigned), Re-Activate (if in Maintenance).

Filtering:
	•	Filter table by driver name, vehicle status, or assigned route.


4.6 Active Bus Dashboard (Per-Bus View)
Accessed via the 'Active Buses' tab in the header. Each active bus appears as a tab labeled with its plate number and current status (e.g., Live Trip / En Route).
Bus Header & Quick Stats
	•	Vehicle plate number.
	•	Current route (e.g., Accra → Dodowa).
	•	Assigned driver name.
	•	Live status badge: current operational state and speed (e.g., 'En route · 54 km/h').

Metric Cards:
	•	Seats Filled: current occupancy count.
	•	Fill Rate: percentage of total capacity occupied.
	•	Trip Revenue: revenue from the current run.
	•	Today Total: cumulative revenue for all runs today.
Real-Time Trip Timeline
	•	Vertical progress tracker showing the bus's journey through stops.
	•	Completed stops: shown with passenger count and revenue at that stop.
	•	Current / Next stop: highlighted with a 'Next stop' badge and real-time ETA.
	•	Each stop shows passengers boarding and alighting at that point.
Analytics Panels
Seat Fill — This Trip:
	•	Visual gauge of current fill rate.
	•	Boarded vs. Alighted count.
	•	Awaiting Pickup: passengers booked at upcoming stops.
	•	Unpaid / No-show: missed bookings or payment failures.

Revenue — This Trip:
	•	Fares collected vs. fares from pending stops.
	•	Today — all runs: cumulative revenue.
	•	This week: weekly revenue total.





Daily Run Log
Column
Description
Run Number
Sequential number of the run for the day.
Departure Time
Time the run started.
Seats Filled
Number of passengers who boarded.
Fill Rate
Percentage occupancy with colour-coded badge.
Revenue
Fare revenue for that run.
Status
Completed, In Progress, Boarding.
Footer row: aggregated totals for the day (total collected, average fill rate).

5. HQ / Admin Dashboard
The HQ Dashboard is used by Glyde's internal operations team. It provides a system-wide view of fleet activity, demand, revenue, and incidents.
5.1 Global Pulse (System-Wide Metrics)
Top-row metric cards providing an at-a-glance view of the entire system:
	•	Active Fleet Utilisation: percentage of total fleet currently on a trip.
	•	Live Passenger Count: total number of passengers across all active Glyde buses.
	•	System Revenue (Today): total GHS collected across all fleet owners and routes.
	•	On-Time Performance (OTP): percentage of buses arriving within ±5 minutes of scheduled ETA.
5.2 Demand vs. Supply Heatmap
	•	A high-contrast map of the operational area (e.g., Accra).
	•	Green Zones: high supply, low demand — buses running with low occupancy.
	•	Red Zones: high demand, low supply — passengers waiting with no available buses.
	•	Real-time moving icons representing all active vehicles on the map.
5.3 Route Performance Leaderboard
	•	Ranking of routes by fill rate and revenue per km.
	•	Shows top-performing and underperforming routes.
5.4 Operational Incident Feed
	•	Real-time feed of operational exceptions requiring admin attention.
	•	Breakdown alerts: vehicle malfunction incidents with location.
	•	Driver SOS: high-priority emergency pings from drivers.
5.5 Fleet Owner & Partner Matrix
Column
Description
Partner Name
Name of the fleet owner or transport company.
Vehicles Active
Count of vehicles currently on the road out of total registered.
Revenue Share
Revenue attributed to this partner.
Status (cumulative status of vehicles under that partner)
Optimal, Warning, etc.
5.6 Revenue Command Card
Displays:
	•	Total Gross Revenue: large figure, updates in real time as payments are processed.
	•	Net Margin: platform's share after paying fleet owners.
	•	Trend Indicator: revenue velocity over the last 24 hours with percentage change vs. yesterday.

Revenue Breakdown (Fare Anatomy):
	•	Base Fare: core price for the distance and seat.
	•	Booking Fee: fixed per-seat technical fee.
	•	Platform Fee: percentage-based service fee.
	•	Total Discounts: value of promo codes or corporate subsidies applied (shown as a negative).

High-Density Micro-Metrics:
	•	Average Revenue Per Trip (ARPT).
	•	Discount Burn Rate: proportion of gross revenue lost to promotions.
	•	Pending Payouts: funds owed to fleet owners not yet settled.
5.7 Hybrid Fleet Management Table
Columns:
	•	Ownership Badge: 'Internal' (Glyde-owned) or 'Partner' (third-party owner).
	•	Status: En Route, Boarding, Maintenance, Idle.
	•	Assigned Driver.
	•	Performance rating or on-time percentage.
	•	Live Location Link: jump to the bus on the map.




5.8 Action Commands (Admin Command Bar)
	•	Broadcast Message: send a push notification to all active drivers (e.g., traffic alerts, route changes).
	•	Dynamic Pricing Toggle: adjust fare multipliers for high-demand or peak periods.
	•	Deploy Standby: order a standby bus to a specified high-demand route.
5.9 Emergency Ticker
	•	Payment failure alerts: e.g., 'High failure rate detected for MTN Mobile Money payments.'
	•	Driver SOS alerts: direct emergency pings shown as high-priority items in the feed.
6. Screen Inventory Summary
App
Screen Name
User Role
Passenger App
Splash Screen
Passenger
Passenger App
Landing Screen
Passenger
Passenger App
Registration & Verification
Passenger
Passenger App
Profile Setup
Passenger
Passenger App
Terms & Conditions
Passenger
Passenger App
Permissions
Passenger
Passenger App
Homepage (Default)
Passenger
Passenger App
Trip Search / Where To
Passenger
Passenger App
Available Buses List
Passenger
Passenger App
Seat Selection
Passenger
Passenger App
Payment
Passenger
Passenger App
Payment Success / Confirmation
Passenger
Passenger App
Ticket View
Passenger
Passenger App
Active Trip — Pre-Boarding
Passenger
Passenger App
Active Trip — Boarding (Post-Scan)
Passenger
Passenger App
In-Trip Experience
Passenger
Passenger App
Payments Tab
Passenger
Passenger App
Activity Tab
Passenger
Passenger App
Profile Tab
Passenger
App
Screen Name
User Role
Driver App
Splash Screen
Driver
Driver App
Landing Screen
Driver
Driver App
Registration & Verification
Driver
Driver App
Driver Profile Setup
Driver
Driver App
Terms & Conditions / Permissions
Driver
Driver App
Login Screen
Driver
Driver App
Dashboard — Overview Tab
Driver
Driver App
Dashboard — Analytics Tab
Driver
Driver App
QR Scan Overlay
Driver
Driver App
Full Map View
Driver
Driver App
SOS Confirmation Modal
Driver
Owner Dashboard
Manage Drivers Screen
Bus Owner
Owner Dashboard
Manage Fleet Screen
Bus Owner
Owner Dashboard
Active Bus — Per-Bus View
Bus Owner
HQ Dashboard
Global Pulse & Heatmap
HQ Admin
HQ Dashboard
Revenue Command Card
HQ Admin
HQ Dashboard
Fleet Management Table
HQ Admin
HQ Dashboard
Incident Feed & Emergency Ticker
HQ Admin














7. Corporate Reserved Service
This section covers the requirements for the corporate partnership model, where Glyde partners with institutions to provide dedicated commuting services for their staff.
7.1 Overview
Under the corporate model, a partner company's staff use the same Passenger App as regular users, but with the following differences:
	•	Staff accounts are tagged under the partner company in the system.
	•	Dedicated buses may be reserved for the partner company.
	•	For end-of-day return trips, buses may enter the company premises to pick up staff directly.
	•	Staff do not make individual payments at the point of booking — rides are billed to the corporate account.
7.2 Corporate Account Requirements
The system must support the following to enable corporate accounts:
	•	Corporate account tagging — each staff member's account is associated with their employer.
	•	Employee-company mapping — the system knows which company each employee belongs to.
	•	Corporate ride tracking — rides taken by staff are logged against the company account.
	•	Automated billing report generation — reports showing staff names, ride frequency, route usage, cost per employee, and aggregate total.
	•	Settlement cycle configuration — configurable billing cycles matching the company's payroll or allowance schedule.
7.3 Corporate Onboarding
	•	The company enters a formal partnership agreement with Glyde.
	•	HR provides a staff list, or exposes it, so employees can self-onboard.
	•	Staff register on the standard Passenger App and their account is tagged to the company.
7.4 Booking Process for Corporate Staff
	•	Staff book rides through the same app interface as regular users.
	•	They select pickup and drop-off as usual.
	•	QR tickets are generated as normal.
	•	At checkout, no individual payment is made — the ride is logged against the corporate account.
	•	The system must display a confirmation that the ride has been recorded to the corporate account, rather than prompting for payment.

7.5 Settlement & Billing
	•	At the end of each billing cycle, the platform generates a settlement report.
	•	The report includes: staff names, ride frequency, route usage, cost per employee, aggregate total payable.
	•	The partner company makes a consolidated payment.
	•	The arrangement may be prepaid. Any surplus (excess funds after obligations) is either refunded or carried forward to the next cycle.
8. Group Commute Model
The Group Commute Service is designed to remove the administrative overhead of traditional corporate transport contracts while creating a structured, recurring commute product that any group of people sharing a route can set up independently. It is a significant demand-generation feature, a meaningful retention tool, and a strategic differentiator for the platform.
 
Group Type
Who It Serves
Key Distinction
Communal Group
Any set of individuals sharing a commute corridor — neighbours, colleagues in the same area, market traders, place-of-worship groups, etc.
Self-organised. No institutional backing required. Any registered Glyde user can create a group.
 
8.1 Core Mechanics
•   	A Group Admin creates a Commute Group, defines the route endpoints and daily departure times, and invites members via a shareable invite link tied to a unique group reference code.
•   	Members join by opening the link, selecting their individual pickup stop along the route, and paying their monthly share directly from their in-app wallet.
•   	Once all seats are filled and all payments are confirmed, the system assigns a dedicated bus to the group for the billing cycle.
•   	That bus runs exclusively for the group — one morning trip and one evening return trip per day — for the entire monthly period.
•   	No manual daily booking is required from members. Daily QR tickets are auto-generated for each active member each day.
•   	The service renews monthly. Groups are notified in advance. Payment must be completed before the deadline or the service lapses.
 


8.2 Group Rules & Constraints
Rule
Detail
Seat-to-member ratio
The number of paying members must exactly match the total seat count of the assigned bus. A 30-seater requires 30 paying members. This condition is shown clearly to the admin during group setup before any invites are sent.
Admin role
One member holds the Group Admin role. Only the Admin can manage group settings, set departure times, define the route, view the full roster, manage renewal, and transfer admin rights. Admin rights are held by one person at a time only.
Payment instrument
All payments are made exclusively via the in-app wallet. Members must have sufficient wallet balance before the payment step. No other payment method is accepted at the point of joining or renewing.
Payment timing
Payment is made at the point of joining. The amount is auto-deducted from the member's wallet immediately upon confirmation. No manual payment confirmation step after wallet deduction begins.
Per-seat cost formula
Monthly package cost (total bus cost for the month) divided equally by the number of seats on the assigned bus. Every member pays the same amount.
Billing cycle
Monthly. Fixed 30-day periods.
Mid-cycle membership
No new members may join during an active billing cycle. New members can only join at the start of a new billing period when the group is open for renewal.
Opt-out & refund policy
Payment covers the seat for the full month regardless of whether the member uses the service on any given day. Unused days are not refunded.
Bus exclusivity
Once assigned, the bus serves only this group. Glyde does not fill any empty seats on the group's assigned bus with regular app users.
Daily trip schedule
One morning trip (from first stop to last stop) and one evening return trip (from last stop back to first stop) per day. The Admin sets both departure times at group creation. These times apply for the full billing cycle.
8.3 User Roles
 
Role
Who
Capabilities
Group Admin
The user who creates the group. Can transfer this role to another member at any time.
	•	Create a group. 
	•	Set route endpoints. 
	•	Set morning and evening departure times. 
	•	Invite members via link. View full roster. 
	•	Monitor payment progress. Manage renewal. 
	•	Transfer admin rights. 
	•	Request group disbandment.
Group Member
Any user who joins via the invite link and completes payment.
	•	Select personal pickup stop. 
	•	Pay monthly share from wallet. 
	•	View group details, departure times, and bus info. 
	•	Access auto-generated daily QR tickets.
Glyde System
Automated platform logic.
	•	Validate bus availability. 
	•	Assign the bus once the group fully pays. 
	•	Generate and manage the reference code. 
	•	Produce daily tickets. 
	•	Trigger renewal notifications. 
	•	Release bus on lapse. 
	•	Generate  billing reports where applicable.
 

8.4 Group Admin Flow
The following screens and interactions apply to the user who is creating and managing a Commute Group.

8.4.1 Entry Point — Groups Section
A Groups section must be added to the Passenger App and made clearly discoverable from the main interface. This may be surfaced as a dedicated bottom navigation tab, a card on the Homepage, or a section within the Profile tab. Placement is at the designer's discretion, but discoverability from the main app is required.
 
From this section, a user can:
•   	Create a new group (if they are not already an admin of an active group).
•   	View and manage their existing group (if they are an admin).
•   	View their membership in a group (if they are a member).
•   	Enter a reference code manually to find and join a group.

8.4.2 Screen: Group Creation — Step 1: Group Identity
Input Fields:
•   	Group Name — a label the admin assigns (e.g., 'East Legon Morning Crew', 'Barclays Tema Staff').
•   	Group Type — selector: Communal or Corporate.
 
Validation:
•   	Both fields are required before proceeding.
•   	Group Name must be non-empty.
•   	Selecting Corporate may optionally prompt for an employer code if the company is a pre-registered Glyde partner. This field is not mandatory at this stage.
 
Action: Tap 'Next' to proceed to Step 2.

8.4.3 Screen: Group Creation — Step 2: Route & Schedule
Input Fields:
•   	Morning Start Point — the first stop where the bus begins its morning trip (e.g., Dodowa Junction).
•   	Morning Last Stop — the final stop on the morning route (e.g., Accra Central or company premises).
•   	Morning Departure Time — the time the bus departs from the first stop each morning (e.g., 7:00 AM).
•   	Evening Departure Time — the time the bus departs from the last stop for the return journey each evening (e.g., 7:00 PM).
 
Display Logic:
•   	The evening route is automatically the reverse of the morning route. The system does not ask the admin to re-enter stops for the return trip.
•   	After both endpoints are entered, show a route preview confirming the morning direction (A to B) and evening direction (B to A).
 
Validation:
•   	All four fields are required.
•   	Departure times must be valid time values.
 
Action: Tap 'Next' to proceed to Step 3.
8.4.4 Screen: Group Creation — Step 3: Bus Availability Check
This is a critical gate. The system checks whether a bus is available to serve the defined route and schedule before the admin proceeds to invite anyone.
 
System Action (triggered automatically on entering this step):
•   	System queries available buses for the specified route and departure times.
•   	Results are displayed to the admin before any commitment is made.
 
State A — Bus Available:
•   	Confirm that a bus is available for the route.
•   	Display: bus capacity (number of seats = number of members the group must recruit).
•   	Display: total monthly package cost for that bus.
•   	Display: per-seat cost (total package cost divided by number of seats) — what each member will pay.
•   	Admin taps 'Continue with This Bus' to proceed.
 
State B — No Bus Available:
•   	Display a clear 'No bus available' message for the selected route and times.
•   	Offer options: adjust departure time, adjust route endpoints, or save as a draft and be notified when a bus becomes available.
•   	Admin cannot proceed to invite members until a bus is confirmed as available.
 
⚑  NOTE: Bus availability shown at this step is a pre-check, not a hard reservation. The bus is provisionally held but is only formally assigned once the group is fully paid up.

8.4.5 Screen: Group Creation — Step 4: Review & Confirm
Summary displayed before final commitment:
•   	Group name and type.
•   	Morning route: Start Point to Last Stop, with departure time.
•   	Evening route: Last Stop to Start Point, with departure time.
•   	Bus capacity (number of seats required = number of members to recruit).
•   	Total monthly package cost.
•   	Per-seat cost (each member's monthly payment).

Admin action: Tap 'Create Group'.
 On confirmation:
•   	The system creates the group and generates a unique Group Reference Code.
•   	A shareable invite link is generated, tied to the reference code.
•   	The admin is automatically enrolled as the first member and their in-app wallet is debited for their seat share immediately.
•   	If the admin's wallet balance is insufficient, block group creation and prompt them to fund their wallet. Resume from Step 4 after funding.
•   	On successful payment, navigate the admin to the Group Management Screen.
 
8.4.6 Screen: Group Management (Admin View)
This is the admin's primary control screen after the group has been created.
 
Displayed Information:
•   	Group name, type, and reference code.
•   	Route summary: morning and evening routes with departure times.
•   	Bus details (once assigned): bus number and capacity.
•   	Roster progress: X of Y seats filled with a visual progress indicator.
•   	Member list: each member's name, their selected pickup stop, and payment status for the current cycle.
•   	Billing cycle: current cycle start and end dates, days remaining, renewal status.
 
Bus Assignment Status Banner (persistent, updates dynamically):
•   	Pending: group has not yet reached full capacity. Show seats remaining. Prompt admin to share the invite link.
•   	Assigned: all seats filled and payments confirmed. Bus is assigned. Show bus number. Confirm service is active.
•   	At Risk: renewal deadline approaching and not all members have renewed. Show outstanding renewal count.
•   	Lapsed: payment deadline passed without full renewal. Service suspended. Show available buses and rebooking window.
 
Admin Actions:
•   	Share Invite Link — generates the shareable link and reference code for distribution.
•   	Transfer Admin Rights — select a member from the roster and assign them as the new admin. Transfer is immediate and irreversible by the current admin.
•   	Manage Renewal — view the upcoming renewal deadline. Initiate renewal process.
•   	Disband Group — only available when no active billing cycle is running. Cannot disband mid-cycle.
8.4.7 Renewal Flow (Admin Perspective)
Renewal notifications are sent at 7 days, 3 days, and 24 hours before the end of the billing cycle.
 
System behaviour at renewal:
•   	On the renewal date, the system attempts to auto-deduct each member's share from their wallet.
•   	Members with sufficient balance are auto-renewed.
•   	Members with insufficient balance receive an urgent alert and are given the payment window to fund their wallet.
•   	Admin is notified of any members who have not renewed, with names and count.
 

Full renewal:
•   	Service continues uninterrupted. Bus remains assigned.
 
Failed renewal (group defaults):
•   	Bus is released to the general pool.
•   	Admin is notified and shown a list of available buses for the route.
•   	Admin is given a defined rebooking window (e.g., 48 hours) to secure a bus for the new cycle.
•   	If the rebooking window lapses, the group remains inactive until the admin takes action.
9. Member Join Flow
9.1 Invite Link & Reference Code
The Group Admin shares a link or reference code via any messaging platform. The link is tied to the group's unique reference code. All payments made through this link are tagged to that reference code, enabling full traceability.
 
When a prospective member opens the link:
•   	App installed + logged in: opens directly to the Group Join Overview screen.
•   	App installed + not logged in: prompt login or registration first, then redirect to Group Join Overview.
•   	App not installed: open a web page with an app download prompt. After install and registration, the group context is retained and the user is taken to Group Join Overview.
 
Reference Code Alternative:
•   	From the Groups section of the app, a user can manually enter a reference code to find and join a specific group.
 9.2 Screen: Group Join — Overview
Trigger: User opens invite link or enters reference code.
 
Displayed Information:
•   	Group name and type.
•   	Morning route: Start Point to Last Stop, with departure time.
•   	Evening route: Last Stop to Start Point, with departure time.
•   	Seats remaining (e.g., '17 of 30 seats still available').
•   	Monthly cost per seat.
•   	Billing cycle start and end dates.
 



State: Group Full
•   	Display 'Group Full' message. No join action is available.
•   	Optionally surface a 'Notify me when this group opens for the next cycle' option.
 
State: Group Inactive or Lapsed
•   	Display a message that the group is currently inactive. User cannot join until the admin renews.
 
Primary Action: 'Join This Group' — proceeds to Stop Selection.
9.3 Screen: Stop Selection
Trigger: User taps 'Join This Group'.
 
Content:
•   	Display the full list of stops on the morning route between the admin-defined start point and last stop.
•   	User selects their personal morning pickup stop.
•   	Their evening drop-off stop is automatically the same stop (the return bus drops them at their morning pickup point).
•   	Show the stop on a map preview for clarity.
 
Validation: A stop must be selected before proceeding.
 
Primary Action: 'Confirm Stop & Proceed to Payment'.
9.4 Screen: Payment Confirmation (Join & Pay)
Trigger: User confirms stop selection.
 
Displayed Information:
•   	Group name and reference code.
•   	Selected morning pickup stop and corresponding evening drop-off stop.
•   	Billing period (e.g., 1 June – 30 June).
•   	Amount to be deducted: monthly package cost divided by number of seats.
•   	Current in-app wallet balance.
 
State A — Sufficient Wallet Balance:
•   	Show confirmation prompt: 'GHS [amount] will be deducted from your wallet to secure your seat.'
•   	Primary action: 'Confirm & Pay'.
•   	On confirmation: amount is auto-deducted immediately. Navigate to Join Confirmation screen.
 
State B — Insufficient Wallet Balance:
•   	Display the shortfall clearly: 'Your wallet has GHS [X]. You need GHS [Y] more to join this group.'
•   	Primary action: 'Fund Wallet'. Takes user to wallet funding flow and returns them to this screen afterwards.
•   	The join action is fully blocked until balance is sufficient.
 
⚑  NOTE: Payment is tied to the group reference code. All transactions under this code are traceable to the group for audit, reporting, and dispute resolution.
9.5 Screen: Join Confirmation / Success
Trigger: Payment successfully deducted.
 
Displayed Information:
•   	Confirmation that the user has joined the group.
•   	Group name and reference code.
•   	Morning pickup stop and evening drop-off stop.
•   	Morning and evening departure times.
•   	Billing period dates.
•   	Bus assignment status: if the group is now full, show 'Bus Assigned — [Bus Number]'. If seats remain, show 'Waiting for group to fill — [X seats remaining]'.
 
Primary Action: 'View My Group' — takes the user to the Member Group View screen.
10. Member Ongoing Experience
10.1 Screen: Member Group View
This is the member's ongoing view, accessible from the Groups section of the app.
 
Displayed Information:
•   	Group name and type.
•   	Their morning pickup stop and evening drop-off stop.
•   	Morning departure time and evening departure time.
•   	Bus details (once assigned): bus number.
•   	Billing cycle: current period dates, renewal date.
•   	Service status: Active, Pending Bus Assignment, Renewal Due, or Lapsed.
 

Behaviour:
•   	Members do not see the full roster of other members. They see only their own details and group-level service status.
•   	Members cannot edit the route, departure times, or any group-level settings.



10.2 Daily QR Ticket Access
Once the bus is assigned and the service is active, daily QR tickets are auto-generated for each member. Members do not book each trip manually.
 
Ticket Generation:
•   	The system generates a morning ticket and an evening ticket for each active member each day.
•   	Tickets are generated at a defined window before departure (e.g., from midnight of each operating day).
•   	Tickets are accessible from the Homepage active trip card and from the Member Group View.
 
Ticket Contents:
•   	QR Code — primary interaction element.
•   	Group name and reference code.
•   	Bus number.
•   	Seat number (fixed for the member for the duration of the cycle).
•   	Pickup stop (morning ticket) or drop-off stop (evening ticket).
•   	Departure time.
•   	Trip direction: Morning or Evening.
•   	Ticket ID.
 
Behaviour:
•   	Morning and evening tickets are separate items.
•   	The morning ticket becomes invalid after the morning departure window closes.
•   	Tickets follow the standard QR validation flow — driver scans, system validates, boarding is confirmed.
•   	If a member does not board on a given day, the seat is logged as unused. It is not reassigned to regular app users, as the bus is exclusively for the group.
 
⚑  NOTE: Auto-generated daily tickets are a core differentiator of the Group Commute Service vs. standard single-trip bookings. The experience for the member after setup is essentially zero-friction — open app, scan ticket, board bus.
10.3 Renewal Notifications (Member View)
Notification schedule:
•   	7 days before renewal: reminder that the subscription renews and their wallet will be debited.
•   	3 days before renewal: second reminder with exact amount and date.
•   	24 hours before renewal: final reminder. If wallet balance is insufficient, this notification carries an urgent tone.
 
On successful auto-deduction:
•   	Member receives a confirmation. Service continues.
 
On failed deduction (insufficient wallet balance):
•   	Urgent in-app notification and push alert sent.
•   	A prominent banner appears on the Member Group View: 'Your renewal payment failed. Fund your wallet by [date] to keep your seat.'
•   	If not resolved before the deadline, the member's seat is released and they exit the group for the next cycle.
11. System Logic & Rules
11.1 Reference Code & Payment Traceability
•   	Every group is issued a unique alphanumeric reference code at creation.
•   	All join payments and renewal payments are tagged with the group's reference code in the payment system.
•   	This enables Glyde's finance system to produce group-level payment reports, trace disputes, and validate payment status per member per cycle.
•   	The reference code is also the group's identifier for customer support.

11.2 Bus Assignment Logic
State
Condition
System Action
Provisionally Available
Bus availability confirmed at Step 3 of group creation.
The bus is shown to the admin. No hard reservation yet.
Pending Assignment
Group created; some but not all members have paid.
The bus is held provisionally for this group. Regular users cannot book seats on this bus.
Assigned
All seats are paid for. Full payment confirmed.
Bus formally assigned. Service activates. Auto-generated daily tickets begin.
Released — Lapsed
Renewal deadline passed without full payment.
Bus released to general pool. Admin notified. Available buses and rebooking window shown.
Released — Disbanded
Admin disbands group outside of an active cycle.
Bus released. All members are notified.
 


11.3 Seat Assignment
•   	Each member is assigned a fixed seat number for the duration of the billing cycle, determined by order of payment (first to pay = first seat assigned).
•   	The same seat is used for both the morning and evening trips throughout the cycle.
•   	Seat numbers reset at the start of each new billing cycle. Members who renew are assigned seats in order of renewal payment.
 11.4 Stop Validation for Members
•   	When a member selects their pickup stop, the system only shows stops that lie on the route between the admin-defined start point and last stop.
•   	Stops outside this corridor are not displayed.
•   	The admin's route corridor is the authoritative reference.
 11.5 Admin Transfer Logic
•   	Admin selects a current group member from the roster and nominates them as the new admin.
•   	The nominated member receives a notification confirming their new role.
•   	Transfer is immediate. The former admin reverts to a regular member.
•   	Only one admin exists per group at any time.
•   	If the admin becomes unreachable, Glyde support can reassign admin rights upon request from the group.
 
12. Notifications Summary
 
Trigger
Recipient
Content
Group created successfully
Admin
Confirmation. Reference code. Invite link. Number of seats still to fill.
A member joins and pays
Admin
'[Name] has joined your group. [X] seats remaining.'
Group reaches full capacity — bus assigned
Admin + All Members
Bus [Number] assigned. Service begins [date]. Morning: [time]. Evening: [time].
Group still has unfilled seats 48 hours after creation
Admin
Reminder: X seats still unfilled. Bus not yet assigned. Share your invite link.
Bus becomes unavailable before group fills
Admin
Alert: the provisionally available bus is no longer available. Prompt to re-check availability.
7 days before renewal deadline
Admin + All Members
Renewal reminder. Amount. Deadline date.
3 days before renewal deadline
Admin + All Members
Second renewal reminder. Amount. Deadline date.
24 hours before renewal deadline
Admin + All Members
Final renewal reminder. Urgent tone if wallet balance is insufficient.
Renewal auto-deduction success
Member
Confirmation. Seat secured for next cycle.
Renewal auto-deduction failed
Member
Urgent: payment failed. Fund wallet by [date] to keep seat.
Some members have not renewed
Admin
List of non-renewing members. Count. Deadline reiterated.
Bus released due to lapsed renewal
Admin
Service suspended. Available buses for route shown. Rebooking window stated.
Admin rights transferred
New Admin
Confirmation of new admin role.
Morning departure approaching
All active members
In-app push: 'Your bus departs from [Stop] in [X] minutes.'
Evening departure approaching
All active members
In-app push: 'Your evening bus departs from [Stop] in [X] minutes.'
 13. Edge Cases & Special Scenarios
 
Scenario
Expected System Behaviour
Member tries to join a full group
Display 'Group Full' state. No payment is taken. Option to be notified when the group opens for the next cycle.
Member has insufficient wallet balance at join
Block join action. Display shortfall amount. Redirect to wallet funding. Return to Payment Confirmation after funding.
Admin has insufficient wallet balance at group creation
Block group creation. Prompt admin to fund wallet. Resume from Step 4 once funded.
Bus becomes unavailable after group creation but before it fills
Notify admin. Admin must restart the bus availability check (Step 3) and may need to adjust the route or departure times.
Scenario
Expected System Behaviour
Group fills but bus is no longer available
Notify admin and all paying members. Offer next available bus options. Members' payments are held pending reassignment. If no bus is found within a defined window, refunds are processed.
Member does not board on a given day
Seat logged as unused. No reassignment to regular users. No refund issued. Day recorded in usage log.
Admin transfers rights mid-cycle
The new admin inherits all management capabilities immediately. Billing and bus assignments are unaffected.
Admin tries to disband group mid-cycle
Action is blocked. Message: 'You cannot disband a group with an active billing cycle. To wind down the group, opt out of renewal so the service ends at the close of the current period.'
New member tries to join mid-cycle
Message: 'This group is not currently accepting new members. You can join at the start of the next billing cycle on [date].'
Some members do not renew; count falls below bus capacity
Admin is notified with the  list of non-renewing members. The bus is released unless the shortfall can be filled within the rebooking window. Admin can re-invite or recruit new members for the next cycle.
Someone already in the group opens the invite link again
The system detects duplicates. Message: 'You are already a member of this group.' No further action required.
Bus breaks down mid-cycle (SOS triggered)
Standard SOS flow triggers. HQ notified. Replacement bus dispatched where available. Group members notified of disruption via push notification.
Shared invite link expires or is deactivated
If the group is inactive or lapsed, the link shows the group's inactive status and prevents joining.
 

 


14. Corporate Group — Differences from Communal
When an institution uses the Group Commute Service under a formal corporate partnership with Glyde, the flow is identical to the Communal model with the following exceptions:
 
Aspect
Communal Group
Corporate Group
Who creates the group
Any registered Glyde user.
A designated HR or transport manager using a corporate-linked account.
Member onboarding
Admin shares invite link. Members self-onboard and pay individually from their own wallets.
HR distributes the link company-wide. Staff self-onboard individually, OR the company may pay the full monthly package upfront on behalf of all staff.
Payment model
Each member pays their seat share from their individual in-app wallet at the point of joining.
Option A: Individual wallet deduction (same as communal). Option B: Company pays full package upfront. Individual deductions are notional and tracked for internal reporting.
Billing reports
Not generated by default.
Automated settlement report at end of each cycle: staff names, ride frequency, route usage, cost per employee, aggregate total payable.
Settlement cycle
Monthly, auto-renew.
Monthly, configurable to match the company's payroll or allowance cycle.
Bus access to premises
Not applicable.
For end-of-day return trips, the assigned bus may be authorised to enter company premises to collect staff directly, subject to formal agreement terms.
 
All other mechanics — route setup, stop selection, per-member QR ticketing, renewal notifications, and bus assignment logic — are identical between the two group types.
 

 
15. Screen Inventory — Group Commute 
 
Screen Name
Role
Description
Groups Section / Hub
All Users
Entry point for creating a group, viewing membership, or entering a reference code.
Group Creation — Step 1: Identity
Admin
Enter group name. Select group type (Communal or Corporate).
Group Creation — Step 2: Route & Schedule
Admin
Define morning start point, last stop, morning departure time, and evening departure time.
Group Creation — Step 3: Bus Availability
Admin
System displays available bus, capacity, total package cost, and per-seat cost. Admin confirms or adjusts.
Group Creation — Step 4: Review & Confirm
Admin
Full summary before group is created. Admin wallet debited for their seat on confirmation.
Group Management Screen
Admin
Ongoing admin control: roster, progress tracker, invite sharing, renewal management, admin transfer.
Group Join — Overview
Prospective Member
Group details, seat availability, cost. Accessed via invite link or reference code.
Stop Selection
Prospective Member
Member selects their morning pickup stop from the route corridor.
Payment Confirmation (Join & Pay)
Prospective Member
Wallet deduction confirmation. Handles insufficient balance state and wallet funding redirect.
Join Confirmation / Success
Prospective Member
Payment success screen. Membership confirmed. Bus assignment status shown.
Member Group View
Member
Ongoing member view: personal stop, departure times, bus details, billing cycle status.
Daily Group Ticket — Morning
Member
Auto-generated daily QR ticket for the morning trip. Accessed from homepage or member view.
Daily Group Ticket — Evening
Member
Auto-generated daily QR ticket for the evening return trip.
Renewal Prompt Screen
Admin + Members
Surfaced when renewal is due. Shows amount, deadline, and current wallet status.
Bus Released / Rebook Screen
Admin
Shown when group defaults on renewal. Lists available buses. States rebooking window.











— End of Document —
