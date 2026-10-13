/** What the QR encodes: a versioned prefix + the ticket's secret token (scanner looks it up). */
export const qrPayload = (qrToken: string) => `GLYDE1:${qrToken}`;
