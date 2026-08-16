/** The shape the server returns and the web app renders. Change it once. */
export interface Health {
	ok: boolean;
	service: string;
	uptime: number;
}

export function describeHealth(h: Health): string {
	return h.ok ? `${h.service} is up (${Math.round(h.uptime)}s)` : `${h.service} is down`;
}
