function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Sheet1');

    // Debug mode - return all row keys for Oct 24
    if (e.parameter.debug === 'true') {
      const data = sheet.getDataRange().getValues();
      const debugInfo = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowDate = formatDate(row[0]);
        const rowDay = normalizeDay(row[1]);
        const rowTime = formatTime(row[2]);
        const rowLocation = normalizeLocation(row[6]);
        const rowKey = `${rowDate}|${rowDay}|${normalizeTime(rowTime)}|${rowLocation}`;

        if (rowDate === 'Oct 24') {
          debugInfo.push({
            row: i + 1,
            date: rowDate,
            day: rowDay,
            time: rowTime,
            location: rowLocation,
            key: rowKey,
            status: row[5] || 'Available'
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify(debugInfo, null, 2))
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Normal booking flow
    const slotKey = e.parameter.slotKey;
    const name = e.parameter.name;
    const email = e.parameter.email;

    if (!slotKey || !name || !email) {
      return ContentService.createTextOutput('Missing required parameters')
        .setMimeType(ContentService.MimeType.TEXT);
    }

    const data = sheet.getDataRange().getValues();

    // Find matching slot
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = formatDate(row[0]);
      const rowDay = normalizeDay(row[1]);
      const rowTime = formatTime(row[2]);
      const rowLocation = normalizeLocation(row[6]);
      const rowKey = `${rowDate}|${rowDay}|${normalizeTime(rowTime)}|${rowLocation}`;
      const status = row[5];

      if (rowKey === slotKey) {
        // Check if already booked
        if (status && status.toLowerCase() === 'booked') {
          return ContentService.createTextOutput('Slot not available')
            .setMimeType(ContentService.MimeType.TEXT);
        }

        // Book the slot
        sheet.getRange(i + 1, 4).setValue(name);    // Column D: Name
        sheet.getRange(i + 1, 5).setValue(email);   // Column E: Email
        sheet.getRange(i + 1, 6).setValue('Booked'); // Column F: Status

        // Log to Form Responses 1
        const formSheet = ss.getSheetByName('Form Responses 1');
        if (formSheet) {
          const timestamp = new Date();
          const dayCapitalized = rowDay.charAt(0).toUpperCase() + rowDay.slice(1);
          const formattedTimeSlot = `${dayCapitalized} ${rowTime}`;
          formSheet.appendRow([timestamp, email, formattedTimeSlot, name, email, '', rowLocation]);
        }

        // Create Google Calendar link
        const calendarLink = createGoogleCalendarLink(row[0], rowTime, rowLocation, name);

        // Prepare email content
        const locationInfo = rowLocation.toLowerCase().includes('zoom')
          ? 'via Zoom'
          : `in my office (${rowLocation})`;

        const htmlBody = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #667eea;">Office Hours Confirmed</h2>
              <p>Hi ${name},</p>
              <p>Your office hours appointment has been confirmed!</p>
              
              <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${rowDate}</p>
                <p style="margin: 5px 0;"><strong>🕒 Time:</strong> ${rowTime}</p>
                <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${locationInfo}</p>
                ${rowLocation.toLowerCase().includes('zoom') ?
            '<p style="margin: 5px 0;"><strong>🔗 Zoom Link:</strong> <a href="https://binghamton.zoom.us/j/4236509899">https://binghamton.zoom.us/j/4236509899</a></p>'
            : ''}
              </div>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${calendarLink}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  📅 Add to Google Calendar
                </a>
              </p>
              
              <p>If you need to cancel or reschedule, please email me directly.</p>
              <p>Looking forward to meeting with you!</p>
              <p>Dr. Skopyk</p>
            </body>
          </html>
        `;

        MailApp.sendEmail({
          to: email,
          subject: 'Office Hours Confirmed - Dr. Skopyk',
          htmlBody: htmlBody
        });

        // Send notification to admin
        MailApp.sendEmail({
          to: 'bskopyk@binghamton.edu',
          subject: '📅 New Office Hours Booking',
          htmlBody: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea;">New Booking Notification</h2>
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Student:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${rowDay}, ${rowDate}</p>
        <p><strong>Time:</strong> ${rowTime}</p>
        <p><strong>Location:</strong> ${rowLocation}</p>
      </div>
    </div>
  `
        });

        return ContentService.createTextOutput('Success')
          .setMimeType(ContentService.MimeType.TEXT);
      }
    }

    return ContentService.createTextOutput('Slot not found')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    return ContentService.createTextOutput('Error: ' + error.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// Create Google Calendar link
function createGoogleCalendarLink(dateValue, timeStr, location, studentName) {
  try {
    // Parse the date and time
    const date = new Date(dateValue);
    const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

    if (!timeParts) return '';

    let hours = parseInt(timeParts[1]);
    const minutes = parseInt(timeParts[2]);
    const period = timeParts[3].toUpperCase();

    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    // Set the start time
    date.setHours(hours, minutes, 0, 0);

    // Set end time (30 minutes later)
    const endDate = new Date(date.getTime());
    endDate.setMinutes(endDate.getMinutes() + 30);

    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
    const startDateTime = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyyMMdd'T'HHmmss");
    const endDateTime = Utilities.formatDate(endDate, Session.getScriptTimeZone(), "yyyyMMdd'T'HHmmss");

    // Build the URL
    const eventTitle = encodeURIComponent('Office Hours with Dr. Skopyk');
    const eventDetails = encodeURIComponent(`Office hours meeting with Dr. Skopyk\nStudent: ${studentName}`);
    const eventLocation = encodeURIComponent(location.toLowerCase().includes('zoom')
      ? 'Zoom: https://binghamton.zoom.us/j/4236509899'
      : location);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startDateTime}/${endDateTime}&details=${eventDetails}&location=${eventLocation}`;
  } catch (error) {
    Logger.log('Error creating calendar link: ' + error.message);
    return '';
  }
}

// Helper functions
function formatDate(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

function formatTime(timeValue) {
  if (!timeValue) return '';
  const date = new Date(timeValue);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

function normalizeDay(day) {
  if (!day) return '';
  const dayStr = String(day).trim().toLowerCase();
  const dayMap = {
    'mon': 'monday',
    'tue': 'tuesday',
    'tues': 'tuesday',
    'wed': 'wednesday',
    'thu': 'thursday',
    'thur': 'thursday',
    'thurs': 'thursday',
    'fri': 'friday',
    'sat': 'saturday',
    'sun': 'sunday'
  };
  return dayMap[dayStr] || dayStr;
}

function normalizeTime(time) {
  if (!time) return '';
  const timeStr = String(time).trim().toUpperCase();
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeStr.toLowerCase();

  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  // IMPORTANT: Pad hours to 2 digits
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

function normalizeLocation(location) {
  if (!location) return '';
  return String(location).trim().toLowerCase();
}