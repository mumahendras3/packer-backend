const nodemailer = require("nodemailer");

function nodeMailer(to, subject, html) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.NODEMAILER_USER, // generated ethereal user
      pass: process.env.NODEMAILER_PASSWORD, // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const options = {
    from: "PackerTeam <Packerteam@gmail.com>", // sender address
    to, // list of receivers
    subject, // Subject line
    html
  };

  transporter.sendMail(options, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log("Email successfully sent");
      console.log("Message sent: %s", info.messageId);
    }
  });
}

module.exports = {
  nodeMailer
}