export type NativeFile = {
	uri: string;
	name: string;
	type: string;
};

export type UploadableFile = File | NativeFile;
