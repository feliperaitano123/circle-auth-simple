import { Resend } from 'resend';

const resend = new Resend('re_SL7tNHk8_ND8qjh3gmh7mCgwy9SfYWAjy');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'felipe.raitano@gmail.com',
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
});