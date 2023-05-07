const nodemailer = require("nodemailer");

function nodeMailer(to, subject, html) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "winson91100@gmail.com", // generated ethereal user
      pass: "nuqzdiaruytwwsil", // generated ethereal password
    },
    tls:{
        rejectUnauthorized:false
    }
  });

  const options = {
    from: "PackerTeam <Packerteam@gmail.com>", // sender address
    // to: data, // list of receivers
    to,
    subject, // Subject line
    // html: html,
    html
  };

  transporter.sendMail(options, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log("Succes send email");
      console.log("Message sent: %s", info.messageId);
    }
  });
}

module.exports ={
    nodeMailer
}