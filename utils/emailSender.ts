interface EmailParams {
  sender: string;
  recipient: string;
  user: string;
}

interface PasswordResetParams extends EmailParams {
  verificationCode: string;
}

interface AdminWelcomeParams extends EmailParams {
  email: string;
  password: string;
}

interface ActivationParams extends EmailParams {
  activatedAt: string;
}

// utils/mailService.ts - This is your actual email sender
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import sendEmail from "./sendEmail";

dotenv.config();

interface EmailOptions {
  to: string;
  from?: string;
  subject: string;
  html: string;
}

// services/emailService.ts - This is the one for rentville
// export const sendWelcomeMessage = ({
//   sender,
//   recipient,
//   user,
// }: EmailParams) => {
//   return sendEmail({
//     from: sender,
//     to: recipient,
//     subject:
//       "🏡 Welcome to Rentville + RConnect - Your Complete Housing Solution",
//     html: `<!DOCTYPE html>
//   <html lang="en">
//   <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Welcome to Rentville</title>
//     <style type="text/css">
//       /* Client-specific resets */
//       body, p, h1, h2, h3 {
//         margin: 0;
//         padding: 0;
//       }

//       /* Base styles */
//       body {
//         font-family: 'Inter', Arial, sans-serif;
//         background-color: #F5F5F5;
//         color: #333333;
//         line-height: 1.4;
//       }

//       /* Email container */
//       .email-container {
//         max-width: 600px;
//         margin: 0 auto;
//         background: #ffffff;
//         border-radius: 0 !important; /* Gmail ignores border-radius */
//       }

//       /* Header */
//       .header {
//         background: #134F2C;
//         padding: 30px 20px;
//         text-align: center;
//       }

//       .logo-container {
//         margin-bottom: 15px;
//       }

//       .logo {
//         height: 40px;
//         width: auto;
//         max-width: 180px;
//       }

//       /* Platform tabs */
//       .platform-tabs {
//         display: inline-block;
//         margin-top: 15px;
//         background: rgba(255,255,255,0.2);
//         border-radius: 20px;
//         padding: 4px;
//         space-between: 4px;
//         gap: 5px;
//       }

//       .platform-tab {
//         display: inline-block;
//         padding: 6px 16px;
//         border-radius: 16px;
//         font-weight: 600;
//         font-size: 13px;
//         line-height: 1.3;
//       }

//       .rentville-tab {
//         background: white;
//         color: #134F2C;
//       }

//       .rconnect-tab {
//         background: #D6DF24;
//         color: #333333;
//       }

//       /* Content */
//       .content {
//         padding: 30px 20px;
//       }

//       .welcome-text {
//         font-size: 16px;
//         text-align: center;
//         margin-bottom: 25px;
//         line-height: 1.5;
//       }

//       /* Platform cards */
//       .platform-cards {
//         display: block;
//         width: 100%;
//         margin: 25px 0;
//       }

//       .platform-card {
//         width: 100% !important;
//         margin-bottom: 15px;
//         border-radius: 8px;
//         padding: 20px;
//         box-sizing: border-box;
//       }

//       .rentville-card {
//         background: rgba(19, 79, 44, 0.05);
//         border: 1px solid rgba(19, 79, 44, 0.15);
//       }

//       .rconnect-card {
//         background: rgba(214, 223, 36, 0.1);
//         border: 1px solid rgba(214, 223, 36, 0.2);
//       }

//       .platform-icon {
//         font-size: 32px;
//         margin-bottom: 12px;
//         text-align: center;
//       }

//       .platform-title {
//         font-size: 17px;
//         font-weight: 700;
//         margin-bottom: 8px;
//         text-align: center;
//       }

//       .rentville-title {
//         color: #134F2C;
//       }

//       .rconnect-title {
//         color: #333333;
//       }

//       .platform-description {
//         font-size: 14px;
//         margin-bottom: 16px;
//         text-align: center;
//         line-height: 1.5;
//       }

//       .platform-cta-container {
//         text-align: center;
//       }

//       .platform-cta {
//         display: inline-block;
//         padding: 10px 20px;
//         border-radius: 4px;
//         font-weight: 600;
//         font-size: 14px;
//         text-decoration: none;
//         text-align: center;
//       }

//       .rentville-cta {
//         background: #134F2C;
//         color: white;
//       }

//       .rconnect-cta {
//         background: #D6DF24;
//         color: #333333;
//       }

//       /* Main CTA */
//       .main-cta-container {
//         text-align: center;
//         margin: 30px 0;
//       }

//       .main-cta {
//         display: inline-block;
//         background: #134F2C;
//         color: white !important;
//         text-decoration: none;
//         padding: 14px 28px;
//         border-radius: 4px;
//         font-weight: 600;
//         font-size: 16px;
//       }

//       /* Footer */
//       .footer {
//         text-align: center;
//         padding: 20px;
//         font-size: 14px;
//         color: #718096;
//       }

//       /* Media queries for desktop */
//       @media screen and (min-width: 480px) {
//         .platform-cards {
//           display: flex;
//           gap: 15px;
//         }

//         .platform-card {
//           width: 50% !important;
//           margin-bottom: 0;
//         }

//         .header {
//           padding: 40px 20px;
//         }

//         .logo {
//           height: 50px;
//           max-width: 200px;
//         }
//       }

//       /* Outlook-specific fixes */
//       .ExternalClass, .ExternalClass p, .ExternalClass span,
//       .ExternalClass font, .ExternalClass td, .ExternalClass div {
//         line-height: 100%;
//       }
//     </style>
//   </head>
//   <body style="margin: 0; padding: 0;">
//     <!--[if mso]>
//     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
//     <tr>
//     <td style="padding: 20px;">
//     <![endif]-->

//     <div class="email-container">
//       <div class="header">
//         // <div class="logo-container">
//         //   <img src="https://res.cloudinary.com/dryotb3zj/image/upload/v1749375993/v1ydcvsx126betr6piha.svg" alt="Rentville Logo" class="logo" style="height: 40px; max-width: 180px;">
//         // </div>

//         <div class="platform-tabs">
//           <span class="platform-tab rentville-tab">PXF</span>
//           // <span class="platform-tab rconnect-tab">RConnect</span>
//         </div>
//       </div>

//       <div class="content">
//         <p class="welcome-text" style="font-size: 16px; text-align: center; margin-bottom: 25px; line-height: 1.5;">
//           Welcome to our complete housing ecosystem, ${user}! Whether you need a property or roommate, we've got you covered.
//         </p>

//         <div class="platform-cards" style="display: block; width: 100%; margin: 25px 0;">
//           <!--[if mso]>
//           <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
//           <tr>
//           <td width="50%" valign="top" style="padding: 0 7.5px 15px 0;">
//           <![endif]-->
//           <div class="platform-card rentville-card" style="width: 100% !important; margin-bottom: 15px; border-radius: 8px; padding: 20px; box-sizing: border-box; background: rgba(19, 79, 44, 0.05); border: 1px solid rgba(19, 79, 44, 0.15);">
//             <div class="platform-icon" style="font-size: 32px; margin-bottom: 12px; text-align: center;">🏠</div>
//             <h3 class="platform-title rentville-title" style="font-size: 17px; font-weight: 700; margin-bottom: 8px; text-align: center; color: #134F2C;">Rentville Properties</h3>
//             <p class="platform-description" style="font-size: 14px; margin-bottom: 16px; text-align: center; line-height: 1.5;">
//               Discover verified rental listings from trusted landlords across Nigeria. No scams, no hidden fees - just quality homes.
//             </p>
//             <div class="platform-cta-container" style="text-align: center;">
//               <a href="https://www.rentville.ng/properties" class="platform-cta rentville-cta" style="display: inline-block; padding: 10px 20px; border-radius: 4px; font-weight: 600; font-size: 14px; text-decoration: none; text-align: center; background: #134F2C; color: white;">Browse Listings</a>
//             </div>
//           </div>
//           <!--[if mso]>
//           </td>
//           <td width="50%" valign="top" style="padding: 0 0 15px 7.5px;">
//           <![endif]-->
//           <div class="platform-card rconnect-card" style="width: 100% !important; margin-bottom: 15px; border-radius: 8px; padding: 20px; box-sizing: border-box; background: rgba(214, 223, 36, 0.1); border: 1px solid rgba(214, 223, 36, 0.2);">
//             <div class="platform-icon" style="font-size: 32px; margin-bottom: 12px; text-align: center;">👥</div>
//             <h3 class="platform-title rconnect-title" style="font-size: 17px; font-weight: 700; margin-bottom: 8px; text-align: center; color: #333333;">RConnect Matching</h3>
//             <p class="platform-description" style="font-size: 14px; margin-bottom: 16px; text-align: center; line-height: 1.5;">
//               Find compatible roommates or fill vacant rooms without agent fees. Perfect for students and young professionals.
//             </p>
//             <div class="platform-cta-container" style="text-align: center;">
//               <a href="https://rconnect.rentville.ng/roommates" class="platform-cta rconnect-cta" style="display: inline-block; padding: 10px 20px; border-radius: 4px; font-weight: 600; font-size: 14px; text-decoration: none; text-align: center; background: #D6DF24; color: #333333;">Match Now</a>
//             </div>
//           </div>
//           <!--[if mso]>
//           </td>
//           </tr>
//           </table>
//           <![endif]-->
//         </div>

//         <div class="main-cta-container" style="text-align: center; margin: 30px 0;">
//           <a href="${
//             process.env.DOMAIN_URL || "https://rconnect.rentville.ng"
//           }/dashboard" class="main-cta" style="display: inline-block; background: #134F2C; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: 600; font-size: 16px;">Get Started Now</a>
//         </div>

//         <p style="text-align: center; font-size: 14px; color: #718096; margin-top: 30px;">
//           Need help? Contact us at <a href="mailto:${
//             process.env.SUPPORT_EMAIL || "rentvilleinfo@gmail.com"
//           }" style="color: #134F2C; text-decoration: none;">${
//       process.env.SUPPORT_EMAIL || "rentvilleinfo@gmail.com"
//     }</a>
//         </p>
//       </div>
//     </div>

//     <!--[if mso]>
//     </td>
//     </tr>
//     </table>
//     <![endif]-->
//   </body>
//   </html>`,
//   });
// };

export const sendWelcomeMessage = ({
  sender,
  recipient,
  user,
}: EmailParams) => {
  return sendEmail({
    from: sender,
    to: recipient,
    subject: "🎉 Welcome to MEMORIA – Capture Every Moment Effortlessly",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to MEMORIA</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f9fafb;
      font-family: 'Inter', Arial, sans-serif;
      color: #111827;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0f172a, #2563eb);
      padding: 30px 20px;
      text-align: center;
      color: #fff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .hero {
      text-align: center;
      padding: 30px 20px;
    }
    .hero h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #111827;
    }
    .hero p {
      font-size: 15px;
      color: #374151;
      line-height: 1.6;
      margin-bottom: 25px;
    }
    .cta-btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 6px;
      text-decoration: none;
    }
    .features {
      padding: 25px 20px;
    }
    .feature {
      text-align: center;
      margin-bottom: 20px;
    }
    .feature h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #2563eb;
    }
    .feature p {
      font-size: 14px;
      color: #4b5563;
      margin: 0;
    }
    .footer {
      text-align: center;
      font-size: 13px;
      color: #6b7280;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Welcome to MEMORIA 🎉</h1>
      <p style="margin-top: 8px; font-size:14px;">Hi ${user}, let’s capture every moment together</p>
    </div>
    
    <!-- Hero section -->
    <div class="hero">
      <h2>Collect & Share Your Event Memories</h2>
      <p>
        With <b>MEMORIA</b>, you can easily collect, upload, and share photos and videos 
        from your events in one beautiful digital album. Setup is a breeze — 
        and sharing with your guests is even easier.
      </p>
      <a href="${
        process.env.DOMAIN_URL || "https://pxf.com"
      }/dashboard" class="cta-btn">Get Started</a>
    </div>

    <!-- Features -->
    <div class="features">
      <div class="feature">
        <h3>📸 Upload & Collect</h3>
        <p>Guests and hosts can upload unlimited event photos & videos.</p>
      </div>
      <div class="feature">
        <h3>💾 Easy Downloads</h3>
        <p>Save your favorite memories instantly, anytime.</p>
      </div>
      <div class="feature">
        <h3>🎉 Share Effortlessly</h3>
        <p>One link is all it takes to share with your guests.</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Need help? Contact us at 
      <a href="mailto:${
        process.env.SUPPORT_EMAIL || "memoriapxfhelp@gmail.com"
      }" style="color:#2563eb; text-decoration:none;">
        ${process.env.SUPPORT_EMAIL || "memoriapxfhelp@gmail.com"}
      </a>
      <br/><br/>
      © ${new Date().getFullYear()} MEMORIA. All rights reserved.
    </div>
  </div>
</body>
</html>`,
  });
};

export const sendPasswordResetCode = ({
  sender,
  recipient,
  verificationCode,
  user,
}: PasswordResetParams) => {
  return sendEmail({
    from: sender,
    to: recipient,
    subject: "Your Password Reset Code",
    html: `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
              color: #333;
          }
          .container {
              width: 100%;
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border: 1px solid #ddd;
              border-radius: 8px;
              overflow: hidden;
          }
          .header {
              background-color: #2c3e50;
              color: #ffffff;
              padding: 20px;
              text-align: center;
          }
          .content {
              padding: 20px;
          }
          .code {
              font-size: 20px;
              font-weight: bold;
              color: #d35400;
              margin: 20px 0;
              text-align: center;
          }
          .footer {
              background-color: #f4f4f4;
              padding: 10px 20px;
              text-align: center;
              font-size: 12px;
              color: #777;
          }
          .button {
              display: inline-block;
              padding: 10px 20px;
              margin: 20px 0;
              background-color: #27ae60;
              color: #ffffff;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
          }
          a {
              color: #27ae60;
              text-decoration: none;
          }
      </style>
  </head>
  <body>
  
  <div class="container">
      <div class="header">
          <h1>Password Reset Request</h1>
      </div>
      <div class="content">
          <p>Dear ${user},</p>
  
          <p>We received a request to reset your password for your account with <strong>MEMORIA</strong>. To complete this process, please use the following code:</p>
  
          <div class="code">
              Your Password Reset Code: ${verificationCode}
          </div>
  
          <p>Enter this code on the password reset page to create a new password. This code will expire in 10 minutes for security reasons.</p>
  
          <p>If you didn't request a password reset, please ignore this email or contact our support team immediately if you have concerns about your account security.</p>
  
          <p>Need help? Contact our support team at <a href="mailto:memoriapxfhelp@gmail.com">memoriapxfhelp@gmail.com</a>.</p>
  
          <p>Best regards,</p>
          <p><strong>The Memoria Team</strong></p>
      </div>
      <div class="footer">
          <p>&copy; 2025 Memoria. All rights reserved.</p>
      </div>
  </div>
  
  </body>
  </html>
  `,
  });
};

export const sendAgentVerifiedMail = ({
  sender,
  recipient,
  user,
}: EmailParams) => {
  return sendEmail({
    from: sender,
    to: recipient,
    subject: "Welcome to MEMORIA - Your Account is Approved!",
    html: `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MEMORIA Account Approval</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
        color: #333;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 10px 0;
        border-bottom: 2px solid #f7941e;
      }
      .header h1 {
        margin: 0;
        color: #f7941e;
      }
      .content {
        padding: 20px 0;
        line-height: 1.6;
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: #f7941e;
        color: #ffffff;
        text-decoration: none;
        border-radius: 5px;
        margin: 10px 0;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: #777;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to PXF!</h1>
      </div>
      <div class="content">
        <p>Dear ${user},</p>
        <p>We're excited to inform you that your PXF account has been approved! Our team has carefully reviewed your information, and you're now ready to start using our platform.</p>
        <p>Here's what you can do next:</p>
        <ol>
          <li>Log in to your account at <a href="https://rconnect.rentville.ng/sign-in" target="_blank">www.rentville.ng/sign-in</a></li>
          <li>Complete your profile</li>
          <li>Start connecting with [Homeowners/Renters/Housemates] on Rentville</li>
        </ol>
        <p>We're here to support you every step of the way. If you have any questions or need assistance, our dedicated support team is just a message or call away:</p>
        <p>Email: <a href="mailto:rentvilleinfo@gmail.com">rentvilleinfo@gmail.com</a><br>
           Phone/WhatsApp: <a href="tel:+2349070004086">09070004086</a></p>
        <p>Welcome aboard!</p>
        <p>Best regards,<br>The Rentville Team</p>
      </div>
      <div class="footer">
        <p>&copy; 2024 Rentville. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `,
  });
};

export const sendAgentNotVerifiedMail = ({
  sender,
  recipient,
  user,
}: EmailParams) => {
  return sendEmail({
    from: sender,
    to: recipient,
    subject: " Important Update on Your Rentville Account Application",
    html: `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Review - Rentville</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
        color: #333;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 10px 0;
        border-bottom: 2px solid #f7941e;
      }
      .header h1 {
        margin: 0;
        color: #f7941e;
      }
      .content {
        padding: 20px 0;
        line-height: 1.6;
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: #f7941e;
        color: #ffffff;
        text-decoration: none;
        border-radius: 5px;
        margin: 10px 0;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: #777;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Application Review</h1>
      </div>
      <div class="content">
        <p>Dear ${user},</p>
        <p>Thank you for your interest in joining the Rentville community. We've carefully reviewed your application and appreciate the time you've taken to apply. Unfortunately, we're unable to approve your account at this time due to some discrepancies in your submitted information.</p>
        <p>We encourage you to reapply after addressing the following points:</p>
        <ol>
          <li>Ensure that the photo on your ID matches your face in the picture you've provided.</li>
          <li>Please submit a valid, government-issued ID.</li>
        </ol>
        <p>To resubmit your application:</p>
        <ol>
        <li>Ensure you are logged in to your account</li>
          <li>Visit <a href="https://rconnect.rentville.ng/reverify-user" target="_blank">https://rconnect.rentville.ng/reverify-user</a></li>
          <li>Follow the application process, paying special attention to the points mentioned above.</li>
        </ol>
        <p>We're here to help! If you have any questions about the requirements or need assistance with the reapplication process, please don't hesitate to reach out to our support team:</p>
        <ul>
          <li>Email: <a href="mailto:rentvilleinfo@gmail.com">rentvilleinfo@gmail.com</a></li>
          <li>Phone/WhatsApp: <a href="tel:+2349070004086">09070004086</a></li>
        </ul>
        <p>We look forward to reviewing your updated application and potentially welcoming you to the Rentville platform.</p>
        <p>Best regards,<br>The Rentville Team</p>
      </div>
      <div class="footer">
        <p>&copy; 2024 Rentville. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `,
  });
};

export const sendActivationMail = ({
  sender,
  recipient,
  user,
  activatedAt,
}: ActivationParams) => {
  return sendEmail({
    from: sender,
    to: recipient,
    subject: " Important Update on Your Rentville Account Application",
    html: `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Reactivation Notice</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
        color: #333;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 10px 0;
        border-bottom: 3px solid #28a745;
      }
      .header h1 {
        margin: 0;
        color: #28a745;
      }
      .content {
        padding: 20px 0;
        line-height: 1.6;
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: #28a745;
        color: #ffffff;
        text-decoration: none;
        border-radius: 5px;
        margin: 10px 0;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: #777;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Account Reactivated</h1>
      </div>
      <div class="content">
        <p>Dear ${user},</p>
        <p>We're pleased to inform you that your account on Rentville has been successfully reactivated. We appreciate your prompt attention to the concerns we raised and your commitment to adhering to our platform's rules and guidelines.</p>
        
        <h3>Account Status: Active</h3>
        <p><strong>Reactivation Date:</strong> ${activatedAt}</p>
        
        <h3>What This Means:</h3>
        <ul>
          <li>You now have full access to all features of Rentville.</li>
          <li>You can resume listing properties, interacting with potential housemates or renters.</li>
          <li>All previous listings and account history have been preserved.</li>
        </ul>
        
        <h3>Moving Forward:</h3>
        <ol>
          <li>We encourage you to review our <a href="https://rconnect.rentville.ng/legal" target="_blank">terms of service</a> to ensure continued compliance.</li>
          <li>If you have any questions about best practices or how to maximize your success on Rentville, our support team is always here to help.</li>
        </ol>
        
        <p>We value your participation in our community and are committed to providing a secure and efficient platform for all users. Your cooperation helps us maintain a trustworthy environment for property owners and renters alike.</p>
        
        <p>If you experience any issues with your account or have any questions, please don't hesitate to reach out:</p>
        <ul>
          <li>Email: <a href="mailto:rentvilleinfo@gmail.com">rentvilleinfo@gmail.com</a></li>
          <li>Phone: <a href="tel:+2349070004086">09070004086</a></li>
        </ul>
  
        <p>Thank you for your understanding and cooperation throughout this process. We look forward to your continued success on Rentville.</p>
        
        <p>Best regards,<br>The Rentville Support Team</p>
      </div>
      <div class="footer">
        <p>&copy; 2025 Rentville. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `,
  });
};

export const sendDeActivationMail = ({
  sender,
  recipient,
  user,
}: EmailParams) => {
  return sendEmail({
    from: sender,
    to: recipient,
    subject: " Important: Rule Violation Notice - Action Required",
    html: `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rule Violation Notice - Action Required</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
        color: #333;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 10px 0;
        border-bottom: 3px solid #d9534f;
      }
      .header h1 {
        margin: 0;
        color: #d9534f;
      }
      .content {
        padding: 20px 0;
        line-height: 1.6;
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: #d9534f;
        color: #ffffff;
        text-decoration: none;
        border-radius: 5px;
        margin: 10px 0;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: #777;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Rule Violation Notice</h1>
      </div>
      <div class="content">
        <p>Dear ${user},</p>
        <p>We hope this message finds you well. We're reaching out regarding your account on Rentville due to a recent violation of our platform rules.</p>
        <p>It has come to our attention that:</p>
        <ol>
          <li>You may have violated our terms of service and could result in account restrictions.</li>
          <li>We've received reports raising concerns about your account activity.</li>
        </ol>
        <p>As a result of these violations, your account is at risk of being restricted or suspended. We take these matters seriously to maintain the integrity of our platform for all users.</p>
        <h3>Next Steps:</h3>
        <ul>
          <li>Review our <a href="https://www.rentville.ng/terms-of-service" target="_blank">terms of service</a> to ensure full compliance going forward.</li>
          <li>If you believe this notice has been sent in error or you need further clarification, please contact our support team:</li>
        </ul>
        <ul>
          <li>Email: <a href="mailto:rentvilleinfo@gmail.com">rentvilleinfo@gmail.com</a></li>
          <li>Phone: <a href="tel:+2349070004086">09070004086</a></li>
        </ul>
        <p>Our support team is ready to discuss this matter, address any concerns, and help you understand how to use our platform correctly.</p>
        <p>We value your participation on Rentville and hope to resolve this issue promptly. Your cooperation in adhering to our platform rules is crucial for maintaining a trustworthy and efficient marketplace for all.</p>
        <p>Thank you for your immediate attention to this matter.</p>
        <p>Best regards,<br>The Rentville Team</p>
      </div>
      <div class="footer">
        <p>&copy; 2025 Rentville. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `,
  });
};

export const sendAdminWelcomeMessage = ({
  sender,
  recipient,
  user,
  email,
  password,
}: AdminWelcomeParams) => {
  return sendEmail({
    from: sender,
    to: recipient,
    subject: "Welcome to RentVille!",
    html: `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Rentville Admin Portal</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              color: #333;
              margin: 0;
              padding: 20px;
          }
          .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 8px;
          }
          h2 {
              color: #4CAF50;
          }
          .content {
              margin-bottom: 20px;
          }
          .credentials {
              background-color: #f9f9f9;
              padding: 15px;
              border-radius: 5px;
              margin: 10px 0;
          }
          .button {
              display: inline-block;
              padding: 10px 20px;
              margin-top: 10px;
              font-size: 16px;
              color: #ffffff;
              background-color: #4CAF50;
              text-decoration: none;
              border-radius: 5px;
          }
          .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #777;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <h2>Welcome to Rentville Admin Portal</h2>
          <p>Dear ${user},</p>
          <p>Welcome to the Rentville Admin Portal! We're excited to have you on board as a new administrator. Below, you'll find your login credentials and some important information to get you started.</p>
          
          <div class="credentials">
              <strong>Your Login Details:</strong>
              <ul>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Temporary Password:</strong> ${password}</li>
                  <li><strong>Login URL:</strong> <a href="https://www.rentville.ng/Admin/sign-in" target="_blank">www.rentville.ng/Admin/sign-in</a></li>
              </ul>
          </div>
  
          <p><strong>Important Notes:</strong></p>
          <ul>
              <li>Keep your login information confidential.</li>
              <li>If you experience any issues, please contact our IT support at <a href="mailto:rentvilleinfo@gmail.com">rentvilleinfo@gmail.com</a>.</li>
          </ul>
  
          <p>If you have any questions or need assistance, please don't hesitate to reach out to Odunayo at +2349065434849.</p>
  
          <p>Welcome aboard, and we look forward to working with you!</p>
  
          <p>Best regards,<br>The Rentville Team</p>
  
          <div class="footer">
              <p>© 2024 Rentville. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
  `,
  });
};

export const sendVerificationRevokedMail = ({
  sender,
  recipient,
  user,
}: EmailParams) => {
  return sendEmail({
    from: sender,
    to: recipient,
    subject: "Important: Your Rentville Verification Has Been Revoked",
    html: `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Revoked - Rentville</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
        color: #333;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 10px 0;
        border-bottom: 2px solid #dc3545;
      }
      .header h1 {
        margin: 0;
        color: #dc3545;
      }
      .content {
        padding: 20px 0;
        line-height: 1.6;
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: #f7941e;
        color: #ffffff;
        text-decoration: none;
        border-radius: 5px;
        margin: 10px 0;
      }
      .footer {
        text-align: center;
        font-size: 12px;
        color: #777;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Verification Revoked</h1>
      </div>
      <div class="content">
        <p>Dear ${user},</p>
        <p>We hope this message finds you well. We're writing to inform you that your verification status on Rentville has been revoked. This action was taken because your verification details have expired or no longer meet our current verification standards.</p>
        
        <h3>What This Means:</h3>
        <ul>
          <li>Your account remains active, but your verification status has been reset.</li>
          <li>You'll need to complete the verification process again to access certain features.</li>
          <li>This is a standard security measure to ensure all users maintain current and valid verification.</li>
        </ul>
        
        <h3>Next Steps:</h3>
        <ol>
          <li>Log in to your Rentville account at <a href="https://rconnect.rentville.ng/sign-in" target="_blank">https://rconnect.rentville.ng/sign-in</a></li>
          <li>Navigate to your Verify page</li>
          <li>Complete the verification process with current, valid identification</li>
          <li>Ensure your identification documents are clear, valid, and up-to-date</li>
        </ol>
        
        <h3>Verification Requirements:</h3>
        <ul>
          <li>Valid government-issued ID (Driver's License, Passport, or NIN)</li>
          <li>Clear, recent photo that matches your ID</li>
          <li>All information must be current and accurate</li>
        </ul>
        
        <p>We're here to help! If you have any questions about the verification process or need assistance, please don't hesitate to reach out to our support team:</p>
        <ul>
          <li>Email: <a href="mailto:rentvilleinfo@gmail.com">rentvilleinfo@gmail.com</a></li>
          <li>Phone/WhatsApp: <a href="tel:+2349070004086">09070004086</a></li>
        </ul>
        
        <p>We appreciate your understanding and look forward to having you fully verified again soon.</p>
        
        <p>Best regards,<br>The Rentville Team</p>
      </div>
      <div class="footer">
        <p>&copy; 2024 Rentville. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `,
  });
};
