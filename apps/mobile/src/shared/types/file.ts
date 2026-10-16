export type NativeFile = {
	uri: string;
	name: string;
	type: string;
	size?: number;
};

export type UploadableFile = File | NativeFile;
