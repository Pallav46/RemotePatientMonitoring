const { v4: uuidv4 } = require('uuid');
const transporter = require('../config/email');
const Notification = require('../models/Notification');

/**
 * Get user email from userId (in production, fetch from user service)
 */
const getUserEmail = async (userId) => {
  // In production, you would fetch this from user service or database
  // For now, return a default or environment variable
  return process.env.DEFAULT_NOTIFICATION_EMAIL || 'admin@hospital.com';
};

/**
 * Send error notification email
 */
const sendErrorNotification = async (errorData) => {
  try {
    const { service, dataId, userId, userEmail, error, message, timestamp, correlationId } = errorData;

    // Use userEmail from the message
    const recipientEmail = userEmail || process.env.DEFAULT_NOTIFICATION_EMAIL || 'admin@hospital.com';

    // Create notification record
    const notification = new Notification({
      notificationId: uuidv4(),
      type: 'error',
      severity: 'high',
      userId,
      dataId,
      service,
      subject: `Error in ${service || 'System'}`,
      message: message || error,
      emailTo: recipientEmail,
      metadata: errorData,
      correlationId
    });

    // Email content
    const emailSubject = `🚨 Error Alert: ${service || 'System'}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Error Notification</h2>
        <p><strong>Service:</strong> ${service || 'Unknown'}</p>
        <p><strong>Data ID:</strong> ${dataId || 'N/A'}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Error Message:</strong> ${message || error}</p>
        <p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
        ${correlationId ? `<p><strong>Correlation ID:</strong> ${correlationId}</p>` : ''}
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated notification from the Patient Monitoring System.
        </p>
      </div>
    `;

    // Send email
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Patient Monitoring System" <noreply@hospital.com>',
        to: recipientEmail,
        subject: emailSubject,
        html: emailBody
      });

      notification.emailSent = true;
      notification.emailSentAt = new Date();
      console.log(`Error notification email sent to: ${recipientEmail}`);
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError);
      notification.emailError = emailError.message;
    }

    await notification.save();
    return notification;

  } catch (error) {
    console.error('Error in sendErrorNotification:', error);
    throw error;
  }
};

/**
 * Send alert notification email
 */
const sendAlertNotification = async (alertData) => {
  try {
    const { dataId, userId, userEmail, userName, status, alerts, vitals, message, timestamp, correlationId } = alertData;

    // Use userEmail from the message
    const recipientEmail = userEmail || process.env.DEFAULT_NOTIFICATION_EMAIL || 'admin@hospital.com';

    // Determine severity
    const severity = status === 'critical' ? 'critical' : 'high';

    // Create notification record
    const notification = new Notification({
      notificationId: uuidv4(),
      type: 'alert',
      severity,
      userId,
      dataId,
      subject: `Health Alert: ${status.toUpperCase()}`,
      message,
      emailTo: recipientEmail,
      metadata: alertData,
      correlationId
    });

    // Build alerts HTML
    let alertsHtml = '';
    if (alerts && alerts.length > 0) {
      alertsHtml = '<h3>Alerts:</h3><ul>';
      alerts.forEach(alert => {
        const severityColor = {
          critical: '#d32f2f',
          high: '#f57c00',
          medium: '#fbc02d',
          low: '#388e3c'
        }[alert.severity] || '#666';
        
        alertsHtml += `<li style="color: ${severityColor}; margin: 8px 0;">
          <strong>${alert.type}:</strong> ${alert.message}
        </li>`;
      });
      alertsHtml += '</ul>';
    }

    // Build vitals HTML
    let vitalsHtml = '';
    if (vitals) {
      vitalsHtml = '<h3>Current Vitals:</h3><ul>';
      if (vitals.heartRate) vitalsHtml += `<li>Heart Rate: ${vitals.heartRate} bpm</li>`;
      if (vitals.bloodPressure) vitalsHtml += `<li>Blood Pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg</li>`;
      if (vitals.oxygenSaturation) vitalsHtml += `<li>Oxygen Saturation: ${vitals.oxygenSaturation}%</li>`;
      if (vitals.temperature) vitalsHtml += `<li>Temperature: ${vitals.temperature}°</li>`;
      if (vitals.respiratoryRate) vitalsHtml += `<li>Respiratory Rate: ${vitals.respiratoryRate}/min</li>`;
      vitalsHtml += '</ul>';
    }

    // Email content
    const statusColor = status === 'critical' ? '#d32f2f' : '#f57c00';
    const emailSubject = `🚨 ${status.toUpperCase()} Health Alert - ${userName || 'Patient'}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${statusColor};">Health Monitoring Alert</h2>
        <div style="background-color: ${statusColor}; color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin: 0; color: white;">Status: ${status.toUpperCase()}</h3>
        </div>
        <p><strong>Patient:</strong> ${userName || 'Unknown'}</p>
        <p><strong>Data ID:</strong> ${dataId}</p>
        <p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
        
        ${vitalsHtml}
        ${alertsHtml}
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0;">
          <strong>⚠️ Action Required:</strong> Please review your health status immediately.
        </div>
        
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated notification from the Patient Monitoring System.
          ${correlationId ? `<br>Correlation ID: ${correlationId}` : ''}
        </p>
      </div>
    `;

    // Send email
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Patient Monitoring System" <noreply@hospital.com>',
        to: recipientEmail,
        subject: emailSubject,
        html: emailBody,
        priority: severity === 'critical' ? 'high' : 'normal'
      });

      notification.emailSent = true;
      notification.emailSentAt = new Date();
      console.log(`Alert notification email sent to: ${recipientEmail}`);
    } catch (emailError) {
      console.error('Failed to send alert notification email:', emailError);
      notification.emailError = emailError.message;
    }

    await notification.save();
    return notification;

  } catch (error) {
    console.error('Error in sendAlertNotification:', error);
    throw error;
  }
};

/**
 * Retry failed notifications
 */
const retryFailedNotifications = async () => {
  try {
    const failedNotifications = await Notification.find({
      emailSent: false,
      emailError: { $exists: true }
    }).limit(10);

    console.log(`Retrying ${failedNotifications.length} failed notifications`);

    for (const notification of failedNotifications) {
      try {
        if (notification.type === 'error') {
          await sendErrorNotification(notification.metadata);
        } else if (notification.type === 'alert') {
          await sendAlertNotification(notification.metadata);
        }
      } catch (error) {
        console.error(`Failed to retry notification ${notification.notificationId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error retrying failed notifications:', error);
  }
};

module.exports = {
  sendErrorNotification,
  sendAlertNotification,
  retryFailedNotifications
};
