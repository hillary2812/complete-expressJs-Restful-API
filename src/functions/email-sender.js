import sgMail from "@sendgrid/mail";
import { SENGRID_API, HOST_EMAIL } from "../constants";

sgMail.setApiKey(SENGRID_API);

const sendMail = async (email, subject, text, html) => {
  try {
    const msg = {
      to: email, // Change to your recipient
      from: HOST_EMAIL, // Change to your verified sender
      subject,
      text,
      html,
    };
    console.log(msg);
    await sgMail.send(msg);
    console.log("MAIL_SENT");
  } catch (err) {
    console.log(err);
    console.log("ERROR_MAILING", err.message);
  } finally {
    return;
  }
};

export default sendMail;
