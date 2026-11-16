export type TaskStatus =
	'pending' | 'in_progress' | 'in_review' | 'completed' | 'rejected';

export type TaskPerson = {
	id: string;
	name: string | null;
	email: string;
};

export type TaskAttachment = {
	id: string;
	filename: string;
	content_type: string;
	size_bytes: number;
	uploaded_by_id: string | null;
	created_at: string;
};

export type Task = {
	id: string;
	description: string;
	due_date: string | null;
	status: TaskStatus;
	requester_id: string;
	assignee_id: string;
	requester: TaskPerson;
	assignee: TaskPerson;
	execution_description: string | null;
	rejection_reason: string | null;
	reviewed_at: string | null;
	attachments: TaskAttachment[];
	created_at: string;
	updated_at: string;
};

export type TaskFile = {
	url: string;
	expires_in: number;
};
