import nodemailer from 'nodemailer';
export const sendEmail = async (text, time) => {
  try {
    let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: 'javier.molinasanz@vonage.com', // generated ethereal user
        pass: process.env.emailPassword, // generated ethereal password
      },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Elastic Search watcher " <javier.molinasanz@vonage.com>', // sender address
      to: 'test-es-javi-aaaairxqctgyckih3ubplk5vvq@vonage.org.slack.com', // list of receivers
      subject: `EMEA CSM Managed Suspicious 2FA/Verify traffic - Prefix Alert ${time}`, // Subject line
      text: 'Please see alerts below',
      html: text, // html body
    });

    console.log('Message sent: %s', info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  } catch (e) {
    console.log(e);
    throw e;
  }
};
