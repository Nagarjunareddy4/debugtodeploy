
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// SMTP Config (User needs to fill these in .env)
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || true,
  auth: {
    user: process.env.SUPPORT_EMAIL_USER,
    pass: process.env.SUPPORT_EMAIL_PASS,
  },
};

const DRY_RUN = process.env.EMAIL_DRY_RUN !== 'false'; // Default to true for safety

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runCampaign() {
  console.log('🚀 Starting Surprise Campaign...');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN ENABLED. No actual emails will be sent.');
    console.log('To send for real, set EMAIL_DRY_RUN=false in your .env');
  }

  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.error('❌ Error: Missing SUPPORT_EMAIL_USER or SUPPORT_EMAIL_PASS in .env');
    if (!DRY_RUN) process.exit(1);
  }

  // 1. Fetch Users
  const { data: users, error } = await supabase
    .from('profiles')
    .select('email, full_name, username')
    .not('email', 'is', null);

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  console.log(`📡 Found ${users.length} targets for transmission.`);

  // 2. Setup Transporter
  const transporter = nodemailer.createTransport(smtpConfig);

  // 3. Email Template
  const getTemplate = (name) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #111111; border: 1px solid #333333; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .header { padding: 40px; text-align: center; border-bottom: 1px solid #222222; background: linear-gradient(180deg, #161b22 0%, #111111 100%); }
        .brand { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px; }
        .logo { width: 50px; height: 50px; border-radius: 12px; }
        .brand-name { font-size: 28px; font-weight: 900; font-style: italic; letter-spacing: -1px; color: #ffffff; }
        .brand-blue { color: #3b82f6; }
        .mystery-text { font-style: italic; color: #888888; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 15px; }
        .content { padding: 40px; line-height: 1.6; }
        .greeting { font-size: 24px; font-weight: 800; color: #3b82f6; margin-bottom: 10px; }
        .body-text { font-size: 16px; color: #cccccc; margin-bottom: 20px; font-weight: 500; }
        .questions { background: #1a1a1a; padding: 25px; border-radius: 16px; border-left: 4px solid #3b82f6; margin: 30px 0; }
        .question-item { margin-bottom: 15px; font-weight: 600; color: #ffffff; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #555555; border-top: 1px solid #222222; }
        .cta { display: inline-block; background: #3b82f6; color: #ffffff; padding: 14px 35px; border-radius: 100px; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-top: 20px; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }
        .social-links { margin-top: 15px; }
        .social-links a { color: #888888; text-decoration: none; margin: 0 10px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">
            <!-- Note: User should replace this with a permanent public URL if possible -->
            <img src="https://mwbvjmbdpanqqhorygro.supabase.co/storage/v1/object/public/avatars/logo.jpg" alt="Logo" class="logo" onerror="this.style.display='none'">
            <div class="brand-name">Debug<span class="brand-blue">To</span>Deploy</div>
          </div>
          <div class="mystery-text">Outgoing Transmission // Command Center</div>
        </div>
        <div class="content">
          <div class="greeting">Greetings, ${name || 'Explorer'}.</div>
          <div class="body-text">
            Something has been brewing in our labs at <b>DebugToDeploy</b>. We've been watching your progress across the platform, and we think you're ready for the next level.
          </div>
          <div class="body-text">
            We aren't ready to reveal the full signal yet, but we wanted to reach out to the pioneers who have been with us from the start. We are working on something that will literally <b>fit in the palm of your hand</b>.
          </div>
          
          <div class="questions">
            <div class="question-item">1. If you could carry your learning environment anywhere, what's the one feature you'd need first?</div>
            <div class="question-item">2. What are your biggest expectations for a mobile-first engineering experience?</div>
            <div class="question-item">3. How can we help you level up faster while you're on the move?</div>
          </div>

          <div class="body-text">
            Reply to this email directly with your thoughts. Your feedback will shape the final stages of this secret mission.
          </div>

          <center>
            <a href="mailto:${smtpConfig.auth.user}" class="cta">Submit Mission Brief</a>
          </center>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} DebugToDeploy. All Rights Reserved.<br>
          <div class="social-links">
            <a href="https://x.com/DebugToDeploy">Twitter</a> • 
            <a href="https://www.instagram.com/debugtodeploy">Instagram</a> • 
            <a href="https://www.facebook.com/profile.php?id=61589307951543">Facebook</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // 4. Send Loop
  for (const user of users) {
    const mailOptions = {
      from: `"Command Center" <${smtpConfig.auth.user}>`,
      to: user.email,
      subject: '[Restricted] A Signal from the Void... 📡',
      html: getTemplate(user.full_name || user.username),
      text: `Greetings ${user.full_name || 'Explorer'},\n\nSomething is brewing. We're working on something that fits in your pocket. Reply with your feedback on what you expect from a mobile learning experience.\n\n- Command Center`,
    };

    if (DRY_RUN) {
      console.log(`[Dry Run] Would send to: ${user.email}`);
    } else {
      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Transmission sent to: ${user.email}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${user.email}:`, err.message);
      }
      // Add a small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n🏁 Campaign processing complete.');
}

runCampaign();
