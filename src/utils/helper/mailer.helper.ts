import { EmailParams } from '../interface';
import { environment as env } from '../config/environment';
import {
  Configuration,
  EmailsApi,
  EmailTransactionalMessageData,
  ContactsApi,
} from '@elasticemail/elasticemail-client-ts-axios';

const config = new Configuration({
  apiKey: env.elastic.apiKey,
});
export class Mailer {
  static async sendEmail(mailParams: EmailParams) {
    const emailsApi = new EmailsApi(config);
    const emailParams: EmailTransactionalMessageData = {
      Recipients: {
        To: [mailParams.To],
      },
      Content: {
        Subject: mailParams.Subject,
        Body: [
          {
            ContentType: 'HTML',
            Charset: 'utf-8',
            Content: mailParams.Body,
          },
        ],
        From: env.elastic.verifiedMail,
      },
    };
    await emailsApi.emailsTransactionalPost(emailParams);
  }
}
