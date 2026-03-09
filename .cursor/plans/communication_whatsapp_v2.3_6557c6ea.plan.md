---
name: Communication WhatsApp V2.3
overview: Implement communication features using WhatsApp Business API for attendance alerts, fee reminders, and notifications. Add in-app messaging for teacher-parent communication and an announcement board for school-wide updates.
todos:
  - id: notification-schema
    content: Add NotificationLog, Message, MessageThread, Announcement models to Prisma schema
    status: completed
  - id: whatsapp-service
    content: Create WhatsApp Business API integration service with template messaging
    status: completed
  - id: notification-queue
    content: Set up Bull queue with Redis for async notification processing
    status: completed
  - id: webhook-handler
    content: Create webhook controller for WhatsApp delivery status updates
    status: completed
  - id: messaging-module
    content: Create messaging module with thread management and message CRUD
    status: completed
  - id: messaging-ui
    content: Create /messages page with thread list and conversation view
    status: completed
  - id: announcements-module
    content: Create announcements module with scope-based filtering
    status: completed
  - id: announcements-ui
    content: Create /announcements page with list, filters, and admin create form
    status: completed
  - id: attendance-trigger
    content: Add WhatsApp notification trigger when marking absences/late
    status: completed
  - id: fee-reminder-cron
    content: Create scheduled job for weekly fee reminder notifications
    status: completed
isProject: false
---

