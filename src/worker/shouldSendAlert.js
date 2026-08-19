export function shouldSendAlert(incident) {
    return !incident.alert_sent;
}