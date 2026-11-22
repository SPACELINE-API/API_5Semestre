export type Notification = {
	id: string;
	event_type: string;
	title: string;
	message: string;
	related_type: string | null;
	related_id: string | null;
	created_at: string;
	read_at: string | null;
};

export type NotificationListResponse = {
	items: Notification[];
	total: number;
	page: number;
	page_size: number;
};

export type UnreadCountResponse = { count: number };
