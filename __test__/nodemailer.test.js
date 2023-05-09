/**
 * Jest Test
 * ./__tests__/nodemailer.js
 **/
const { describe, it } = require('@jest/globals');
const { mock } = require('nodemailer');
const { nodeMailer } = require('../helpers/nodemailer');

// The test email
const from = 'PackerTeam <Packerteam@gmail.com>'; // This is hardcoded in helpers/nodemailer
const to = 'm1@m.com';
const subject = 'Test Email Subject';
const html = 'Test Email Body';

describe('Function Test: helpers/nodemailer', () => {
  it('Should send an email to the given recipient with the given subject and email body (as HTML)', async () => {
    await nodeMailer(to, subject, html);
    // check the mock for our sent emails
    const sentEmails = mock.getSentMail();
    // there should be one
    expect(sentEmails.length).toBe(1);
    // and it should match the from and to address, subject, and HTML body as above.
    expect(sentEmails[0].from).toBe(from);
    expect(sentEmails[0].to).toBe(to);
    expect(sentEmails[0].subject).toBe(subject);
    expect(sentEmails[0].html).toBe(html);
  });
});