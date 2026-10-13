GLYDE TagLine : Commute,Simplified
The name ‘Glyde’ is a stylized respelling of ‘glide,’ reflecting smooth, frictionless movement—aligned with our goal of making commuting effortless and predictable. It captures captures the essence of stress-free commuting from home to work and back. What we’re essentially saying is we are eliminating the uncertainty, stress, and inconvenience often associated with public transport (Trotro). Glyde isn’t just a ride; it’s your commute, simplified.

🔑 Core Principles
	•	Predictability Structured routes and strict timing ensure employees always know when they leave and when they arrive.
	•	Comfort A calm, clean, and controlled commuting environment that removes daily stress.
	•	Reliability Consistent, dependable service that professionals and companies can count on every day.
We’re not just moving people—we’re delivering a consistent, work-ready experience every day.
1. Introduction
This document presents Glyde, a company focused on delivering a frictionless and premium commuting experience for working professionals. As its first offering, Glyde introduces a structured shuttle service designed for employees within institutions, agencies, and corporate organizations. The service aims to improve daily commuting by introducing predictability, visibility, and reliability into staff transportation. It is built as an integrated system combining a mobile application, trackable buses, prepaid booking, QR code ticket validation, real-time notifications, and controlled seat allocation.
Through this approach, Glyde enables professionals to commute to and from work with greater certainty, reduced stress, and improved time efficiency—transforming transportation into a consistent and dependable part of the workday.
2. Problem Statement
Despite the structured nature of corporate work environments, daily commuting remains largely unpredictable and inefficient for many professionals. This disconnect creates a consistent source of stress and uncertainty in an otherwise organized workday.
Common challenges include:
	•	uncertainty around the availability of transport;
	•	limited visibility into bus arrival and departure times;
	•	extended and unproductive waiting periods at pickup points;
	•	inconsistent and unpredictable commuting conditions.
For employees in corporate institutions, these issues directly impact punctuality, productivity, and overall wellbeing. The lack of a reliable and structured transport system undermines both individual performance and organizational efficiency.
Glyde addresses this gap by introducing a digitally managed, structured shuttle system that brings predictability, visibility, and reliability to the daily commute.
3. Service Overview
Glyde delivers its shuttle service through a mobile application integrated with a network of buses operating on defined routes. The platform enables users to plan and manage their daily commute in a structured and intuitive manner.
Through the application, users can:
	•	access available buses across predefined routes;
	•	select convenient pickup and drop-off points;
	•	complete prepaid bookings;
	•	generate QR code tickets for seamless boarding;
	•	track bus location in real time.
On the operational side, the system includes a driver-facing dashboard to support route execution and service coordination, as well as onboard security cameras to enhance passenger safety.
Overall, the service is designed to provide a predictable and well-organized commuting experience that aligns with the needs and expectations of working professionals.
4. Service Operation
The service begins with user registration on the mobile application. Once registered, the user can view available buses on the appropriate route and begin booking rides.
The process works as follows:
	•	User opens the app and sees live buses moving on the map.
	•	User selects a pickup point and a drop-off point.
	•	The system allows the booking only if the bus is available for that route and has not passed the selected pickup point.
	•	User confirms the trip details.
	•	User makes payment in advance.
	•	The system generates a QR code ticket linked to the trip details.
When the bus arrives, the user boards and scans the QR code for verification.. The system then confirms ticket validity, payment status, booking match, and whether the ticket has already been used. If validation is successful, boarding is approved and the ride is confirmed. If validation fails, entry is rejected.
5. Missed Booking and Validation Rules - (Courtesy aits)
The service follows prepaid rules, which means a booking is only treated as completed when the user boards and the QR code is successfully scanned. This helps the system manage attendance properly and prevents reserved seats from going unused.
The process flow is as follows:
	•	the user books and pays for a seat in advance;
	•	the bus arrives at the selected pickup point;
	•	the system checks whether the QR code is scanned within the allowed pickup time;
	•	if the QR code is scanned successfully, the trip is confirmed and the seat remains assigned to that user; and
	•	if the QR code is not scanned within the allowed waiting period, the system marks the user as absent, cancels the booking, and releases the seat.
Once released, the seat may be reassigned to another user boarding later on the route. The service may also allow a limited number of missed-trip deferments (maximum of two). However, once the allowed number of missed bookings is exceeded, the prepaid amount is not refunded. In addition, if no valid boarding takes place by the end of the working day after deferment, the unused ticket becomes invalid and the fare is not refunded.
6. QR Code Ticketing Method
The service uses a QR code ticketing method instead of a physical card-based validation system. Once a booking is made and payment is confirmed, the system generates a QR code tied to the user and the specific trip.
Each QR code is linked to:
	•	the user account;
	•	the selected route;
	•	the pickup point;
	•	the drop-off point;
	•	the assigned bus; and
	•	payment confirmation.
At the point of boarding, the QR code is scanned using the bus-mounted scanner. The system checks whether the ticket is genuine, paid for, correctly assigned, and still unused. If all checks are passed, boarding is approved and the ticket is marked as used immediately. This prevents duplicate use and strengthens boarding control.
7. Driver Dashboard
Drivers are supported by a dashboard that provides the information needed to manage each trip properly.
The dashboard allows drivers to:
	•	see whether QR ticket scans have been accepted or rejected; and
	•	receive route-related alerts (drop off/ Pick up).
	•	countdown for waiting time at every pick up point.
The system also supports passenger drop-off coordination. As the bus approaches a passenger’s destination, the onboard speaker announces that the stop is near. A further announcement is made when the bus reaches the stop. This helps maintain orderly boarding and alighting.
8. Real-Time Tracking and User Alerts
A key part of the service is real-time tracking. Users can see the movement of the bus before it reaches their pickup point, which reduces uncertainty and helps them prepare in advance.
Users receive:
	•	visibility of bus movement in real time;
	•	alerts when the bus is approaching the pickup point; and
	•	notification where a bus is the last available bus on that route.
This improves time planning and reduces the stress of waiting without clear information.
9. Smart Seat Allocation Logic
The seat allocation method is designed to make efficient use of limited bus capacity while ensuring that two passengers are never assigned the same seat at the same time. The system determines seat usage based on the pickup and drop-off locations selected during booking.
The allocation process works step‑by‑step as follows:
Step 1 – Passenger selects route details
During booking, the passenger selects a pickup point and a drop‑off point. The system therefore knows the exact section of the route the passenger will occupy a seat.
Step 2 – System calculates seat usage for that route section
The system marks the seat as occupied only between the selected pickup point and drop‑off point. The seat is not blocked for the entire route.
Step 3 – System checks future booking requests
When another passenger attempts to book a seat on the same bus, the system compares the requested pickup and drop‑off points with existing bookings.
	•	If the new passenger's journey does not overlap with an existing passenger's seat usage, the system allows the booking.
	•	If the journeys overlap, meaning both passengers would require the same seat at the same time, the system rejects the newer booking.
Step 4 – Example of non‑overlapping usage
Route: Accra → Shiashie → Madina → Dodowa
	•	Passenger A: Pickup Accra → Drop‑off Shiashie
	•	Passenger B: Pickup Shiashie → Drop‑off Madina
Passenger A occupies the seat only from Accra to Shiashie. Because Passenger B boards after Shiashie, the same seat can be assigned to Passenger B without conflict.
Step 5 – Key Rule: Booking allowed even if bus appears full
Route: Dodowa → Adenta → Madina → Accra
This rule represents a core feature of the system. Even if the bus appears "full" because earlier passengers have already reserved seats, the system still checks whether those reservations actually overlap with the new booking request.
	•	Passenger A: Pickup Madina → Drop‑off Accra (books first but has not yet boarded)
	•	Passenger B: Pickup Adenta → Drop‑off Madina
In this situation, the bus may appear fully booked because Passenger A already reserved a seat. However, the system examines the route segments and identifies that Passenger B's journey (Adenta → Madina) finishes before Passenger A's journey begins (Madina → Accra).
Because the two journeys do not overlap, Passenger B is allowed to book and use a seat, even though Passenger A booked earlier and the bus initially appeared full.
Passenger B therefore occupies the seat from Adenta to Madina. Once Passenger B exits at Madina, Passenger A can then use that same seat from Madina to Accra.
This dynamic allocation ensures that seats are not wasted simply because an earlier passenger booked first.
Step 6 – Final seat confirmation during boarding
A seat is initially reserved when the booking is made. However, the booking becomes fully confirmed only when the passenger boards the bus and the QR code is successfully scanned.
Step 7 – Automatic seat release if passenger does not board
If the QR code is not scanned within the allowed pickup time window, the system cancels the booking and automatically releases the seat. The seat can then be reassigned to another passenger boarding later along the route.
10. Security and Monitoring
To support safety and accountability, each bus is fitted with security cameras.
These cameras support:
	•	passenger safety;
	•	incident monitoring; and
	•	operational accountability.
Their presence also strengthens user confidence in the service and supports a more disciplined transport environment.
11. Value Proposition
The Corporate Smart Shuttle Service offers a more reliable and organized way for professionals to commute. It reduces uncertainty, improves access to structured transport, and supports advance planning.
The service delivers:
	•	predictable commuting;
	•	reduced stress;
	•	structured boarding;
	•	digital ticket validation;
	•	prepaid fare management; and
	•	clearer operational control.
Together, these features create a transport experience that is more dependable and better suited to structured organizations and their staff.
12. Conclusion
The Corporate Smart Shuttle Service is a digitally managed commuting solution built to meet the needs of professionals who require dependable transportation to and from work. By combining advance booking, QR-based ticket validation, real-time bus tracking, and practical seat allocation logic, the service introduces structure into a part of daily life that is often disorderly and stressful.
Its design is focused on simplicity for the user, operational clarity for service providers, and reliability for institutions that want a better transport experience for their staff. As a product, it offers a practical and scalable approach to organized corporate commuting.
Operational Strategy
. Demand-Based Bus Allocation
**Bus allocation will be prioritized based on demand insights derived from real-time and historical order heatmaps.**Service deployment and route capacity will be dynamically adjusted using order heatmap data, ensuring that high-demand areas receive priority allocation of buses for optimal efficiency and coverage.

2. Onboarding Fallback Mechanism
**An alternative onboarding code will be provided as a fallback in cases where QR code functionality fails.**To ensure uninterrupted onboarding, users will have access to a manual onboarding code as a backup option in the event of QR code malfunction or scanning issues.”
Phase 2 Corporate Reserved Service
Overview
Under this model, Glyde partners with established corporate institutions (e.g., banks, technology firms, and other structured organizations).
The objective is to onboard company staff onto the platform while providing additional structured benefits tailored to the organization.
How the Partnership Model Works
	•	Corporate Onboarding
	•	The company enters into a formal partnership agreement with Glyde.
	•	HR exposes staff list to Glyde for staff members to self onboard.
	•	Staff accounts are tagged under the partner company within the system.
Employees will continue to use the same mobile application and booking interface as regular users.
	•	Reserved Buses for Partner Companies
	•	Dedicated buses are allocated to serve the partner institutions.
	•	For departure trips (end-of-day return), buses will enter the company premises to pick up staff directly.
	•	Morning pickups may follow existing route structures, depending on agreement terms.
This provides added convenience and structured departure for employees.
	•	Booking Process for Staff
	•	Staff members still book rides through the platform.
	•	They select pickup and drop-off as usual.
	•	QR tickets are generated as normal.
However:
	•	Staff do not make individual payments at the point of booking.
	•	The system records the ride under the company’s corporate account.
	•	Settlement & Payment Structure
At the end of an agreed billing cycle (based on the company’s salary payment structure, allowance cycle, or tenure agreement):
	•	The platform generates a settlement report.
	•	The report contains:
	•	Staff names
	•	Ride frequency
	•	Route usage
	•	Total cost per employee
	•	Aggregate total payable
The partner company then makes a consolidated payment to the platform.
This eliminates the need for individual fare payments while maintaining usage accountability.
NB: Subject to the terms of the agreement, this arrangement may be structured on a prepaid basis. In the event of any surplus(excess funds after payment obligations), the excess shall either be reimbursed to the company or applied to the subsequent billing cycle.
Benefits to Partner Companies
	•	Structured and reliable staff commute
	•	Reduced lateness risk
	•	Centralized transport cost management
	•	Transparent ride reporting
	•	Improved employee welfare
System Implications
Under this model, the platform must support:
	•	Corporate account tagging
	•	Employee-company mapping
	•	Corporate ride tracking
	•	Automated billing report generation
	•	Settlement cycle configuration
This partnership option expands the service from an individual commuter platform into a structured corporate mobility solution.
	•	Conclusion
This corporate shuttle service introduces structure, predictability, and verification into daily commuting.
It replaces uncertainty with:
	•	Visibility
	•	Prepaid booking
	•	Identity-linked boarding
	•	Automated seat release logic
	•	Real-time tracking
	•	Controlled fare management
The result is a transport system built specifically for corporate individuals who value punctuality, reliability, and reduced stress.

