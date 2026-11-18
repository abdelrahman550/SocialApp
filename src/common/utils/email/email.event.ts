import { EventEmitter } from "node:events";
import { EmailSubjectEnum } from "../../enum";
import { sendEmail } from "./send.email";
import { sentEmailTemplate } from "./email.template";

export const emailEvent = new EventEmitter();

emailEvent.on(
  "sendEmail",
  async ({
    recipients,
    subject,
    data,
  }: {
    recipients: { to?: string[]; cc?: string[]; bcc?: string[] };
    subject: EmailSubjectEnum;
    data: any;
  }) => {
    try {
      await sendEmail({
        ...recipients,
        subject,
        html: sentEmailTemplate({
          code: data.code,
          subject,
          title: data.title ?? subject,
        }),
      });
    } catch (error) {
      console.log(error);
    }
  },
);
