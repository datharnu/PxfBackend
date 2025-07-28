import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
}

// Configuration options for different email services
const getTransporterConfig = () => {
  const emailService = process.env.EMAIL_SERVICE || "gmail";

  switch (emailService.toLowerCase()) {
    case "gmail":
      return {
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.HOST_EMAIL,
          pass: process.env.HOST_EMAIL_PASSWORD, // App Password required
        },
      };

    case "sendgrid":
      return {
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        auth: {
          user: "apikey",
          pass: process.env.SENDGRID_API_KEY,
        },
      };

    case "mailgun":
      return {
        host: "smtp.mailgun.org",
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAILGUN_SMTP_LOGIN,
          pass: process.env.MAILGUN_SMTP_PASSWORD,
        },
      };

    case "ses": // Amazon SES
      return {
        host: "email-smtp.us-east-1.amazonaws.com", // Adjust region as needed
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_SMTP_USERNAME,
          pass: process.env.AWS_SES_SMTP_PASSWORD,
        },
      };

    case "outlook":
      return {
        service: "hotmail",
        host: "smtp.live.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.HOST_EMAIL,
          pass: process.env.HOST_EMAIL_PASSWORD,
        },
      };

    default:
      throw new Error(`Unsupported email service: ${emailService}`);
  }
};

export const sendEmail = async ({
  to,
  from,
  subject,
  html,
}: EmailParams): Promise<void> => {
  try {
    // Validate environment variables
    if (!process.env.HOST_EMAIL) {
      throw new Error("HOST_EMAIL environment variable is required");
    }

    const config = getTransporterConfig();
    console.log(`Using email service: ${process.env.EMAIL_SERVICE || "gmail"}`);
    console.log(`SMTP Host: ${config.host}`);
    console.log(`From email: ${process.env.HOST_EMAIL}`);
    console.log(`To email: ${to}`);

    const transporter = nodemailer.createTransport({
      ...config,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    // Verify connection
    await transporter.verify();
    console.log("SMTP connection verified");

    const mailOptions = {
      from: `"Rentville" <${process.env.HOST_EMAIL}>`,
      to,
      subject,
      html,
      // Add text fallback
      text: html.replace(/<[^>]*>/g, ""), // Simple HTML to text conversion
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully");
    console.log("Message ID:", info.messageId);
    console.log("Accepted recipients:", info.accepted);

    if (info.rejected && info.rejected.length > 0) {
      console.warn("⚠️ Rejected recipients:", info.rejected);
    }
  } catch (error) {
    console.error("❌ Email sending failed:");

    // More specific error handling
    if ((error as any).code === "EAUTH") {
      console.error("Authentication failed - check email credentials");
    } else if ((error as any).code === "ECONNECTION") {
      console.error("Connection failed - check network/firewall settings");
    } else if ((error as any).responseCode === 550) {
      console.error("Recipient email address rejected");
    }

    throw error;
  }
};

export default sendEmail;
