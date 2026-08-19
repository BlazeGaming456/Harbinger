import { describe, it, expect } from 'vitest';
import { shouldSendAlert } from './shouldSendAlert.js';

describe('alert idempotency', () => {
    it('Sends when alert has not been sent', () => {
        expect(
            shouldSendAlert({ alert_sent: false })
        ).toBe(true);
    })

    it('Does not send when alert was already sent', () => {
        expect(
            shouldSendAlert({ alert_sent: true })
        ).toBe(false);
    });
});