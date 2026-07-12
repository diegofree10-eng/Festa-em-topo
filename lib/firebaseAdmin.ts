import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const apps = getApps();
const app = apps.length > 0 ? getApp() : initializeApp({
  credential: cert({
    projectId: "gestao-12166", // Valor fixo do seu JSON
    clientEmail: "firebase-adminsdk-fbsvc@gestao-12166.iam.gserviceaccount.com", // Valor fixo do seu JSON
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDtC0eIAa/Sf/7h\nB1bEa+TBI3wnhMKj9toGnymwVVSHfU4UXb2xndavs6T7gm0PWFoBe4v0izyuXxGi\nsf7pxAKs0ErJgbeNnJP5rZCspAt3W1QHXC6BEItKhjehufkk3rXzXisUehmR1h4Q\nGNzHkwhA0+y9JupZpurYjVfY/BQ2WcfWfVSVZ687+t9p3GefMOL9FMt5eGWR/MoI\npm3vCfDP5z+llq8rtbRD6JMnJi+3nxcZiaPN6YOtj0dQ6k2eGRmpjPNEU98I4Cbi\nMe2/d7tLI5oWPHjJoAc0G25l4gBRPY5awVZlwX1eZcb3uP7+iSptaXApsKOkTlb3\nW3OB752tAgMBAAECggEAAhjj80rvMcxqcQuTaR3P7STcZS3Hr74FiXfLXXaGeW5n\n4ZvqC5IVw1cyYfvyQrz+4DLQzFiWWwVB+YUGotiA8jjOOJXaYw6GwUzs/Jdfoe41\nF52UAcCnjYC+KZhPdn6L8JEdjiBTF+xjjAk+8XsWYHB05ercDvAASusxOEe+rAkU\nn05UDZdGYl3dnzbcGwiIaEoWU7SE45drJK2UxWij1G0kRGt/GxhZn6joB3C5TTcp\neJl5gx2ivL/aNCdf4rrvR8QBqYnL7HxqPxnBmi4ZrhcDsaNlGLTenL2Q8v8KSffT\nihwepmHScZmRp1kB3IFgztewsTGMN4QMP/3Vdh7sQQKBgQD6puekNWa49r5dFPvd\n0X2ACwNJC+FsInB5Gyy7Q8zrNLzSLH6c1Cpf6Vp3z7fr5Vfr9bI4pzBStK6+XhA4\ngjY3RNFBog1/ra39gRPNG1yQEynfiQoYql8HW9v3O8r6qLd5lbRD/YE2kmvmEJbl\nGtbge12c1iWVnVifKWS6tV204QKBgQDyGgvapelHXxnt8z0dBPmcttXa0iyHoCAL\nIIR2s71lFt+nbikhwRVsodhX+BnUlrDTrg6OueaCs5g44tl58mPyWK+VlBdebAta\nht2BI2QnFmikaKjjyxafCF3rU5igG7S6849GbjlKEaele8awzi16VxQNNwihGCKi\nX8VeFvD2TQKBgQDsDLkDrQLTWBQIpxVXXc2aA0URyq19X6Wad9wVc5GNRDo6mIqY\neTp63tFDGgy0jGTTo6w2rETW7q/OOdl+zinuvNFwxQN/ZXoAzklulMEEMffyOyWV\n+wTJclniKJ5Mlw1K5JBCo3/He/c/UAo7Mp6AA84yQH5euzLVmW7yYpEgIQKBgAWi\nL4Zt9+iuQNc1osVrGTfZVU6bN2gMhNJddlegxRZ2Gsw1lwVvDcWSWotpfYhh3Ul/\nsl0F3GRMM42XUcIxrruz7poHcSfEUdtQahUYMrtqHRM+UDfEwQkAU9cnAdUv79ut\n0TatV+3uTT1fjPcORSakohXQowXEnwGyQtB2rjK9AoGBAJ7xCJYzy6Q1m/4CIV7x\nGYbFPJUqxK7JM2AwfhYQGtZAgSJWsy1Ip2ab+PRaKNSwt0pKCTfDlzUUcBpRNWAN\nTP1b4DZP4lWg4O6oeD871rQ5TMitkYFx/4AqsB1cXVmavK8l6AAMmfUiolLYMBu5\n18WEYssGCDeJiJJd6NOm/9ex\n-----END PRIVATE KEY-----"
  }),
});

export const db = getFirestore(app);