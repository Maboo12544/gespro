export type AccessRole='owner'|'supervisor'|'seller';
export type AccessContext={userId:string;username:string;displayName:string;isPlatformAdmin:boolean;
 banks:{id:string;name:string;active:boolean}[];
 memberships:{bank_id:string;user_id:string;role:AccessRole;active:boolean}[];
 points:{id:string;bank_id:string;name:string;active:boolean}[];
 assignments:{bank_id:string;pos_id:string;user_id:string}[];
 profiles:{user_id:string;username:string;display_name:string;active:boolean}[]};
