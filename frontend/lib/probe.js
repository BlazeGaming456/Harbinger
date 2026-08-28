export function formatProbeStatus(probe) {
    if (probe.is_timeout) {
        return { label: 'Timeout', tone: 'down' };
    }

    if (probe.status_code != null) {
        if (probe.status_code >= 500) {
            return { label: `${probe.status_code} Server error`, tone: 'down' };
        }
        if (probe.status_code >= 400) {
            return { label: `${probe.status_code} Client error`, tone: 'degraded' };
        }
        if (probe.status_code >= 200) {
            return { label: `${probe.status_code} OK`, tone: 'healthy' };
        }
        return { label: `${probe.status_code}`, tone: 'degraded' };
    }

    if (probe.error_type) {
        const labels = {
            timeout: 'Timeout',
            dns_failure: 'DNS failure',
            connection_refused: 'Connection refused',
            unknown: 'Network error',
        };
        return {
            label: labels[probe.error_type] || probe.error_type.replace(/_/g, ' '),
            tone: 'down',
        };
    }

    return { label: 'No response', tone: 'down' };
}

export function formatProbeTime(probedAt) {
    const date = new Date(probedAt);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}
