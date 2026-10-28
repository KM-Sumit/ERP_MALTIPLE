declare global {
	namespace App {
		interface Locals {
			userId: string | null;
			schoolId: string | null;
			isPlatformAdmin: boolean;
			roleKey: string | null;
			fullName: string | null;
			permissions: string[];
		}
	}
}

export {};
